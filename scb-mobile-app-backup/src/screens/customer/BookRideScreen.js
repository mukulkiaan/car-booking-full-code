import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Image,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import api from '../../services/api';
import { COLORS } from '../../theme/colors';
import LocationPickerModal from '../shared/LocationPickerModal';
import LeafletMapView from '../../components/LeafletMapView';
import { useLanguage } from '../../context/LanguageContext';

const { width, height } = Dimensions.get('window');

// 6 Core Fleet Categories (matching Web)
const DEFAULT_CARS = [
  { id: 1, name: 'Van', type: 'Van', pricePerKm: 10, seats: 4, eta: '5 mins', emoji: '🚐' },
  { id: 2, name: 'Echo', type: 'Micro', pricePerKm: 12, seats: 6, eta: '4 mins', emoji: '🚐' },
  { id: 3, name: 'Mini', type: 'Hatchback', pricePerKm: 13, seats: 4, eta: '3 mins', emoji: '🚗' },
  { id: 4, name: 'Sedan', type: 'Comfort', pricePerKm: 15, seats: 4, eta: '5 mins', emoji: '🚘' },
  { id: 5, name: 'SUV', type: 'Large', pricePerKm: 18, seats: 7, eta: '8 mins', emoji: '🚙' },
  { id: 6, name: 'Luxury', type: 'Premium', pricePerKm: 25, seats: 4, eta: '12 mins', emoji: '🏎️' },
];

function getCarEmoji(name = '') {
  const n = String(name).toLowerCase();
  if (n.includes('van') || n.includes('echo')) return '🚐';
  if (n.includes('mini')) return '🚗';
  if (n.includes('sedan') || n.includes('swift')) return '🚘';
  if (n.includes('suv')) return '🚙';
  if (n.includes('lux')) return '🏎️';
  return '🚖';
}

function getCarImageSource(image) {
  if (!image || typeof image !== 'string') return null;
  if (image.startsWith('data:image/') || image.startsWith('http://') || image.startsWith('https://')) {
    return { uri: image };
  }
  if (image.startsWith('/')) {
    return { uri: `https://safarsetubackend-18-10-26.onrender.com${image}` };
  }
  return { uri: image };
}

export default function BookRideScreen({ navigation }) {
  const mapRef = useRef(null);
  const { t } = useLanguage();

  // Location states — default to Bodhwada & Borlay (matching user's screenshot)
  const [pickup, setPickup] = useState('Bodhwada, Madhya Pradesh');
  const [pickupCoords, setPickupCoords] = useState({ latitude: 22.1842, longitude: 74.9654 });
  const [drop, setDrop] = useState('Borlay, Madhya Pradesh');
  const [dropCoords, setDropCoords] = useState({ latitude: 22.0360, longitude: 75.0049 });

  // Modal visibility
  const [pickupModalVisible, setPickupModalVisible] = useState(false);
  const [dropModalVisible, setDropModalVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Date & Time states
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');

  // Fleet categories & selection
  const [cars, setCars] = useState(DEFAULT_CARS);
  const [selectedCar, setSelectedCar] = useState(DEFAULT_CARS[1]); // Default to Echo

  // Search status overlay
  const [status, setStatus] = useState('idle'); // 'idle' | 'searching'
  const [currentBookingId, setCurrentBookingId] = useState(null);

  // Route details
  const [routeInfo, setRouteInfo] = useState(null);

  // App Settings (Dynamic Admin QR Code & Helpline numbers)
  const [appSettings, setAppSettings] = useState({
    qrCodeUrl: null,
    upiId: '9755339783@upi',
    advanceAmount: 200,
    helpline1: '6261828036',
    helpline2: '9755339783',
  });
  const [advanceModalVisible, setAdvanceModalVisible] = useState(false);
  const [enteredUtr, setEnteredUtr] = useState('');

  // Fetch cars on mount
  useEffect(() => {
    const fetchCars = async () => {
      try {
        const res = await api.get('/api/catalog/cars');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const merged = res.data.map((c) => ({
            ...c,
            emoji: getCarEmoji(c.name),
          }));
          setCars(merged);
          // Preserve selection or default to Echo/Sedan
          setSelectedCar((prev) => prev || merged[0]);
        }
      } catch (err) {
        console.warn('Could not load online fleet categories, using defaults:', err.message);
      }
    };

    fetchCars();

    // Fetch dynamic Admin QR and helpline settings
    const fetchSettings = async () => {
      try {
        const res = await api.get('/api/catalog/settings');
        if (res.data) setAppSettings(res.data);
      } catch (err) {
        console.warn('Could not load app settings:', err.message);
      }
    };
    fetchSettings();

    // Default booking date & time
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toTimeString().split(' ')[0].substring(0, 5);
    setBookingDate(dateStr);
    setBookingTime(timeStr);
  }, []);

  // Calculate route — uses coordinates if available, else text
  const calculateRoute = async (pOverride, dOverride, pCoordOverride, dCoordOverride) => {
    const p = pOverride !== undefined ? pOverride : pickup;
    const d = dOverride !== undefined ? dOverride : drop;
    const pCoords = pCoordOverride !== undefined ? pCoordOverride : pickupCoords;
    const dCoords = dCoordOverride !== undefined ? dCoordOverride : dropCoords;

    if (!p?.trim() || !d?.trim()) {
      Alert.alert('Incomplete Fields', 'Please select both pickup and drop locations.');
      return;
    }

    setCalculating(true);

    try {
      const payload = {
        pickup: p.trim(),
        drop: d.trim(),
      };

      if (pCoords) {
        payload.pickupCoords = { lat: pCoords.latitude, lng: pCoords.longitude };
        payload.pickupLat = pCoords.latitude;
        payload.pickupLng = pCoords.longitude;
      }
      if (dCoords) {
        payload.dropCoords = { lat: dCoords.latitude, lng: dCoords.longitude };
        payload.dropLat = dCoords.latitude;
        payload.dropLng = dCoords.longitude;
      }

      // 8-second timeout guard to avoid hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 8000)
      );

      const res = await Promise.race([
        api.post('/api/maps/route', payload),
        timeoutPromise,
      ]);

      const { pickup: pRes, drop: dRes, coordinates, distanceKm, durationMin } = res.data;
      const parsedCoords = Array.isArray(coordinates)
        ? coordinates.map((c) => ({ latitude: c[0], longitude: c[1] }))
        : [];

      const newRoute = {
        pickupCoords: { latitude: pRes.lat, longitude: pRes.lng },
        dropCoords: { latitude: dRes.lat, longitude: dRes.lng },
        coordinates: parsedCoords,
        distance: distanceKm || 1,
        durationMin: durationMin || Math.round(distanceKm * 1.5),
      };

      setRouteInfo(newRoute);
      if (!pCoords && pRes) {
        setPickupCoords({ latitude: pRes.lat, longitude: pRes.lng });
      }
      if (!dCoords && dRes) {
        setDropCoords({ latitude: dRes.lat, longitude: dRes.lng });
      }
    } catch (err) {
      console.warn('Backend route calculation fallback:', err.message);

      // Smart fallback: Calculate approximate distance with road factor
      let pLat = pCoords?.latitude;
      let pLng = pCoords?.longitude;
      let dLat = dCoords?.latitude;
      let dLng = dCoords?.longitude;

      if (!pLat || !dLat) {
        pLat = p.toLowerCase().includes('manawar') ? 22.2333 : 22.7196;
        pLng = p.toLowerCase().includes('manawar') ? 75.0833 : 75.8577;
        dLat = d.toLowerCase().includes('barwani') ? 22.0366 : 22.9676;
        dLng = d.toLowerCase().includes('barwani') ? 74.9031 : 76.0534;
      }

      const dlat = pLat - dLat;
      const dlng = pLng - dLng;
      const straightLineKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
      const estimatedKm = Math.max(5, Math.round(straightLineKm * 1.35 * 10) / 10);
      const estDuration = Math.max(10, Math.round(estimatedKm * 1.4));

      setRouteInfo({
        pickupCoords: { latitude: pLat, longitude: pLng },
        dropCoords: { latitude: dLat, longitude: dLng },
        coordinates: [
          { latitude: pLat, longitude: pLng },
          { latitude: (pLat + dLat) / 2 + 0.02, longitude: (pLng + dLng) / 2 - 0.02 },
          { latitude: dLat, longitude: dLng },
        ],
        distance: estimatedKm,
        durationMin: estDuration,
      });
    } finally {
      setCalculating(false);
    }
  };

  // Initial automatic route calculation when screen opens with default pickup and drop
  useEffect(() => {
    if (pickup && drop && !routeInfo) {
      calculateRoute(pickup, drop, pickupCoords, dropCoords);
    }
  }, []);

  // Auto-fit map to route bounds
  useEffect(() => {
    if (mapRef.current) {
      if (routeInfo?.coordinates?.length >= 2) {
        mapRef.current.fitToCoordinates(routeInfo.coordinates, {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        });
      } else if (pickupCoords && dropCoords) {
        mapRef.current.fitToCoordinates([pickupCoords, dropCoords], {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        });
      }
    }
  }, [routeInfo, pickupCoords, dropCoords]);

  // Helpline contact handlers
  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = (phoneNumber) => {
    const dist = routeInfo ? `${routeInfo.distance.toFixed(1)} KM` : '';
    const car = selectedCar?.name || 'Cab';
    const msg = encodeURIComponent(
      `Namaste SafarSetu! Mujhe ${pickup || 'Pickup'} se ${drop || 'Drop'} ke liye ${car} book karni hai (${dist}). Kripya final bhada aur best discount batayein.`
    );
    Linking.openURL(`https://wa.me/91${phoneNumber}?text=${msg}`);
  };

  const handlePayViaUpiApp = () => {
    const upi = appSettings.upiId || '9755339783@upi';
    const amt = appSettings.advanceAmount || 200;
    const upiUrl = `upi://pay?pa=${upi}&pn=SafarSetu%20Cabs&am=${amt}&cu=INR&tn=Advance%20Booking%20Token`;
    Linking.openURL(upiUrl).catch(() => {
      Alert.alert('UPI App', `Please pay ₹${amt} via PhonePe/GPay/Paytm to UPI ID: ${upi}`);
    });
  };

  const handleBooking = async () => {
    if (!pickup?.trim() || !drop?.trim()) {
      Alert.alert('Incomplete Fields', 'Please select both pickup and drop locations.');
      return;
    }
    if (!routeInfo) {
      await calculateRoute();
    }
    if (!bookingDate.trim() || !bookingTime.trim()) {
      Alert.alert('Date & Time Required', 'Please specify scheduling date and time.');
      return;
    }
    if (!selectedCar) {
      Alert.alert('Vehicle Required', 'Please choose your preferred ride category.');
      return;
    }

    // Open Advance Booking Modal with Admin's QR Code
    setAdvanceModalVisible(true);
  };

  const handleConfirmBookingWithAdvance = async () => {
    setLoading(true);
    try {
      const fare = Math.round((routeInfo?.distance || 10) * (selectedCar.pricePerKm || selectedCar.baseRate || 12)) || 1000;

      const bookingPayload = {
        pickup,
        drop,
        bookingDate,
        bookingTime,
        carName: selectedCar.name,
        fare,
        pickupLat: routeInfo?.pickupCoords?.latitude || 22.0248,
        pickupLng: routeInfo?.pickupCoords?.longitude || 74.8964,
        dropLat: routeInfo?.dropCoords?.latitude || 22.7196,
        dropLng: routeInfo?.dropCoords?.longitude || 75.8577,
        routeCoords: routeInfo?.coordinates?.map((c) => [c.latitude, c.longitude]) || [],
        distanceKm: routeInfo?.distance || 1,
        advancePaid: appSettings.advanceAmount || 200,
        advanceUtr: enteredUtr.trim() || 'ADVANCE_SUBMITTED_ONLINE',
      };

      const res = await api.post('/api/bookings', bookingPayload);
      const bookingData = res.data;
      setCurrentBookingId(bookingData.id);
      setAdvanceModalVisible(false);
      setLoading(false);
      setStatus('searching');
    } catch (e) {
      setLoading(false);
      const msg = e.response?.data?.message || 'Failed to create booking.';
      Alert.alert('Booking Error', msg);
    }
  };

  const handleCancelRequest = async () => {
    if (!currentBookingId) {
      setStatus('idle');
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/api/bookings/${currentBookingId}`, { status: 'Cancelled' });
      setStatus('idle');
      Alert.alert('Cancelled', 'Your booking request has been successfully cancelled.');
    } catch {
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const setPresetTime = (offsetHours) => {
    const d = new Date();
    if (offsetHours > 0) d.setHours(d.getHours() + offsetHours);
    if (offsetHours === 24) d.setDate(d.getDate() + 1);
    setBookingDate(d.toISOString().split('T')[0]);
    setBookingTime(d.toTimeString().split(' ')[0].substring(0, 5));
  };

  // Default region: Central MP / Barwani
  const mapRegion = routeInfo
    ? {
        latitude: (routeInfo.pickupCoords.latitude + routeInfo.dropCoords.latitude) / 2,
        longitude: (routeInfo.pickupCoords.longitude + routeInfo.dropCoords.longitude) / 2,
        latitudeDelta: Math.max(0.12, Math.abs(routeInfo.pickupCoords.latitude - routeInfo.dropCoords.latitude) * 1.5),
        longitudeDelta: Math.max(0.12, Math.abs(routeInfo.pickupCoords.longitude - routeInfo.dropCoords.longitude) * 1.5),
      }
    : {
        latitude: pickupCoords ? pickupCoords.latitude : 22.0366,
        longitude: pickupCoords ? pickupCoords.longitude : 74.9031,
        latitudeDelta: 0.6,
        longitudeDelta: 0.6,
      };

  const currentFare = routeInfo && selectedCar
    ? Math.round(routeInfo.distance * (selectedCar.pricePerKm || 12))
    : null;

  return (
    <View style={styles.container}>
      {/* ── INTERACTIVE GOOGLE MAP ── */}
      <View style={styles.mapContainer}>
        <LeafletMapView
          pickupCoords={routeInfo?.pickupCoords || pickupCoords}
          dropCoords={routeInfo?.dropCoords || dropCoords}
          pickupLabel={pickup}
          dropLabel={drop}
          routeCoords={routeInfo?.coordinates || []}
          style={styles.map}
        />

        {/* Route Info Badge Overlay on Map */}
        {routeInfo && (
          <View style={styles.mapBadgeOverlay}>
            <Text style={styles.mapBadgeText}>
              🛣️ {routeInfo.distance.toFixed(1)} km • ⏱️ ~{routeInfo.durationMin || Math.round(routeInfo.distance * 1.4)}m
            </Text>
          </View>
        )}
      </View>

      {/* ── BOOKING CONTROL PANEL ── */}
      <View style={styles.controlPanel}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Pickup / Drop Location Selector */}
          <View style={styles.inputsCard}>
            {/* PICKUP */}
            <TouchableOpacity
              style={styles.locationRow}
              onPress={() => setPickupModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.locationDot}>🟢</Text>
              <View style={styles.locationTextWrap}>
                <Text style={styles.locationLabel}>PICKUP LOCATION</Text>
                <Text
                  style={[styles.locationValue, !pickup && styles.locationPlaceholder]}
                  numberOfLines={1}
                >
                  {pickup || 'Tap to select pickup location'}
                </Text>
              </View>
              <Text style={styles.locationArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.separator} />

            {/* DROP */}
            <TouchableOpacity
              style={styles.locationRow}
              onPress={() => setDropModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.locationDot}>🔴</Text>
              <View style={styles.locationTextWrap}>
                <Text style={styles.locationLabel}>DROP DESTINATION</Text>
                <Text
                  style={[styles.locationValue, !drop && styles.locationPlaceholder]}
                  numberOfLines={1}
                >
                  {drop || 'Tap to select drop location'}
                </Text>
              </View>
              <Text style={styles.locationArrow}>›</Text>
            </TouchableOpacity>

            {/* Estimate Route & Fare Action Button */}
            <TouchableOpacity
              style={[
                styles.calculateBtn,
                (!pickup || !drop) && styles.calculateBtnDisabled,
                routeInfo && styles.calculateBtnSuccess,
              ]}
              onPress={() => calculateRoute()}
              disabled={calculating || !pickup || !drop}
              activeOpacity={0.8}
            >
              {calculating ? (
                <View style={styles.calculatingRow}>
                  <ActivityIndicator color={COLORS.white} size="small" />
                  <Text style={styles.calculateBtnText}>Calculating best road route...</Text>
                </View>
              ) : routeInfo ? (
                <Text style={styles.calculateBtnText}>
                  ✓ ROUTE ESTIMATED ({routeInfo.distance.toFixed(1)} KM) • RECALCULATE ⚡
                </Text>
              ) : (
                <Text style={styles.calculateBtnText}>⚡ ESTIMATE ROUTE & FARE</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── FLEET SELECTION & LIVE PAYMENT (WEB STYLE) ── */}
          <View style={styles.fleetSection}>
            <View style={styles.fleetHeaderRow}>
              <Text style={styles.sectionHeader}>Choose Vehicle & View Payment</Text>
              {routeInfo && (
                <View style={styles.distanceBadgePill}>
                  <Text style={styles.distanceBadgePillText}>
                    {routeInfo.distance.toFixed(1)} km
                  </Text>
                </View>
              )}
            </View>

            {/* Horizontal Fleet Cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carsScroll}
            >
              {cars.map((car) => {
                const isSelected = selectedCar && (selectedCar.id === car.id || selectedCar.name === car.name);
                const rate = Number(car.pricePerKm || car.baseRate || 12);
                const estimatedFare = routeInfo ? Math.round(routeInfo.distance * rate) : null;
                const emoji = car.emoji || getCarEmoji(car.name);

                return (
                  <TouchableOpacity
                    key={car.id || car.name}
                    style={[styles.carCard, isSelected && styles.activeCarCard]}
                    onPress={() => setSelectedCar(car)}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <View style={styles.selectedPill}>
                        <Text style={styles.selectedPillText}>✓ SELECTED</Text>
                      </View>
                    )}
                    {car.image ? (
                      <Image
                        source={getCarImageSource(car.image)}
                        style={styles.carRealImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.carEmoji}>{emoji}</Text>
                    )}
                    <Text style={styles.carName}>{car.name}</Text>
                    <Text style={styles.carSeats}>{car.seats || 4} Seats • {car.eta || 'Fast'}</Text>
                    
                    {/* Pure KM Rate Badge - No total rupee confusion */}
                    <View style={styles.carFareContainer}>
                      <View style={styles.kmRateBadge}>
                        <Text style={styles.kmRateBadgeText}>₹{rate}/km</Text>
                      </View>
                      <Text style={styles.carRateSub}>Standard Rate</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── TRIP SUMMARY & KM CALCULATION CARD (NO TOTAL RUPEES) ── */}
          {selectedCar && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {selectedCar.image ? (
                      <Image
                        source={getCarImageSource(selectedCar.image)}
                        style={{ width: 36, height: 22 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={{ fontSize: 16 }}>{selectedCar.emoji || getCarEmoji(selectedCar.name)}</Text>
                    )}
                    <Text style={styles.summaryTitle}>
                      {selectedCar.name} ({selectedCar.seats || 4} Seats)
                    </Text>
                  </View>
                  <Text style={styles.summarySub}>
                    Rate: ₹{selectedCar.pricePerKm || 12}/km • Round Trip / One Way Deals
                  </Text>
                </View>
                <View style={styles.summaryPriceWrap}>
                  <Text style={styles.summaryPriceLabel}>Total Distance</Text>
                  <Text style={styles.summaryPriceValue}>
                    {routeInfo ? `${routeInfo.distance.toFixed(1)} KM` : 'Calculating...'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── 24x7 FINAL BHADA & DISCOUNT HELPLINE CARD ── */}
          <View style={styles.helplineCard}>
            <View style={styles.helplineHeaderRow}>
              <Text style={styles.helplineTitle}>📞 FINAL BHADA & DISCOUNT HELPLINE</Text>
              <View style={styles.liveTag}><Text style={styles.liveTagText}>DIRECT CALL</Text></View>
            </View>
            <Text style={styles.helplineSub}>
              Apne route ka sabse kifayati bhada aur discount janne ke liye turant call ya WhatsApp karein:
            </Text>

            <View style={styles.helplineBtnRow}>
              <TouchableOpacity
                style={styles.callBtnPrimary}
                onPress={() => handleCall(appSettings.helpline1 || '6261828036')}
                activeOpacity={0.8}
              >
                <Text style={styles.callBtnIcon}>📞</Text>
                <View>
                  <Text style={styles.callBtnLabel}>Helpline 1</Text>
                  <Text style={styles.callBtnNumber}>{appSettings.helpline1 || '6261828036'}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.callBtnSecondary}
                onPress={() => handleCall(appSettings.helpline2 || '9755339783')}
                activeOpacity={0.8}
              >
                <Text style={styles.callBtnIcon}>📞</Text>
                <View>
                  <Text style={styles.callBtnLabel}>Helpline 2</Text>
                  <Text style={styles.callBtnNumber}>{appSettings.helpline2 || '9755339783'}</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.whatsAppActionBtn}
              onPress={() => handleWhatsApp(appSettings.helpline1 || '6261828036')}
              activeOpacity={0.85}
            >
              <Text style={styles.whatsAppIcon}>💬</Text>
              <Text style={styles.whatsAppActionText}>Chat on WhatsApp for Best Bhada Deal</Text>
            </TouchableOpacity>
          </View>

          {/* Schedule Ride */}
          <Text style={styles.sectionHeader}>Schedule Ride</Text>
          <View style={styles.dateTimeGrid}>
            <View style={styles.dateTimeField}>
              <Text style={styles.dateTimeLabel}>DATE (YYYY-MM-DD)</Text>
              <TouchableOpacity style={styles.dateTimeInput} onPress={() => {}}>
                <Text style={styles.dateTimeValue}>{bookingDate}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateTimeField}>
              <Text style={styles.dateTimeLabel}>TIME (HH:MM)</Text>
              <TouchableOpacity style={styles.dateTimeInput} onPress={() => {}}>
                <Text style={styles.dateTimeValue}>{bookingTime}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Preset time CTAs */}
          <View style={styles.presetsRow}>
            <TouchableOpacity style={styles.presetChip} onPress={() => setPresetTime(0)}>
              <Text style={styles.presetChipText}>🔥 Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetChip} onPress={() => setPresetTime(1)}>
              <Text style={styles.presetChipText}>⏱️ +1 Hr</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.presetChip} onPress={() => setPresetTime(24)}>
              <Text style={styles.presetChipText}>📅 Tomorrow</Text>
            </TouchableOpacity>
          </View>

          {/* ── PRIMARY BOOKING ACTION BUTTON (ADVANCE PAYMENT FLOW) ── */}
          <TouchableOpacity
            style={[styles.bookButton, (!pickup || !drop) && styles.bookButtonDisabled]}
            onPress={handleBooking}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.bookButtonText}>
                BOOK RIDE & PAY ADVANCE TOKEN 🚖
              </Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </View>

      {/* ── SEARCHING FOR DRIVER OVERLAY ── */}
      {status === 'searching' && (
        <View style={styles.searchOverlay}>
          <View style={styles.searchCard}>
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.searchSpinner} />
            <Text style={styles.searchTitle}>FINDING YOUR DRIVER</Text>
            <Text style={styles.searchSubtitle}>
              Connecting with premium fleet pilots near you. An elite driver will accept shortly.
            </Text>
            <View style={styles.searchProgress}>
              <Text style={styles.progressText}>🚀 Allocating luxury concierge pilot...</Text>
            </View>
            <TouchableOpacity
              style={styles.cancelRequestBtn}
              onPress={handleCancelRequest}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.danger} />
              ) : (
                <Text style={styles.cancelRequestText}>CANCEL RIDE REQUEST</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── ADVANCE PAYMENT & ADMIN QR CODE MODAL ── */}
      <Modal
        visible={advanceModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAdvanceModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.advanceModalCard}>
            <View style={styles.advanceModalHeader}>
              <View>
                <Text style={styles.advanceModalTitle}>Advance Booking Token 💳</Text>
                <Text style={styles.advanceModalSubtitle}>
                  Ride confirm karne ke liye ₹{appSettings.advanceAmount || 200} ka token pay karein
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAdvanceModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* QR Code Container */}
            <View style={styles.qrCodeContainer}>
              <Image
                source={{
                  uri:
                    appSettings.qrCodeUrl ||
                    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${appSettings.upiId || '9755339783@upi'}&pn=SafarSetu%20Cabs&am=${appSettings.advanceAmount || 200}&cu=INR`,
                }}
                style={styles.qrImage}
                resizeMode="contain"
              />
              <Text style={styles.qrScanText}>Scan with any UPI App (GPay / PhonePe / Paytm)</Text>
              <View style={styles.upiPill}>
                <Text style={styles.upiPillLabel}>UPI ID:</Text>
                <Text style={styles.upiPillValue}>{appSettings.upiId || '9755339783@upi'}</Text>
              </View>
            </View>

            {/* Pay via UPI App Direct Button */}
            <TouchableOpacity style={styles.payUpiAppBtn} onPress={handlePayViaUpiApp} activeOpacity={0.8}>
              <Text style={styles.payUpiAppText}>⚡ Open in UPI App (Pay ₹{appSettings.advanceAmount || 200})</Text>
            </TouchableOpacity>

            {/* Optional UTR / Transaction Input */}
            <View style={styles.utrInputWrap}>
              <Text style={styles.utrLabel}>UTR / Transaction ID (Optional):</Text>
              <TextInput
                style={styles.utrInput}
                placeholder="Ex: 429381928312 or PhonePe Ref"
                placeholderTextColor={COLORS.textMuted}
                value={enteredUtr}
                onChangeText={setEnteredUtr}
              />
            </View>

            {/* Confirm & Book Ride CTA */}
            <TouchableOpacity
              style={styles.confirmAdvanceBtn}
              onPress={handleConfirmBookingWithAdvance}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.confirmAdvanceBtnText}>
                  I HAVE PAID ₹{appSettings.advanceAmount || 200} • CONFIRM BOOKING 🚖
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── LOCATION PICKER MODALS ── */}
      <LocationPickerModal
        visible={pickupModalVisible}
        onClose={() => setPickupModalVisible(false)}
        title="Select Pickup Location"
        onSelect={(name, lat, lng) => {
          setPickup(name);
          const coords = { latitude: lat, longitude: lng };
          setPickupCoords(coords);
          setRouteInfo(null);
          if (drop) {
            calculateRoute(name, drop, coords, dropCoords);
          }
        }}
      />
      <LocationPickerModal
        visible={dropModalVisible}
        onClose={() => setDropModalVisible(false)}
        title="Select Drop Location"
        onSelect={(name, lat, lng) => {
          setDrop(name);
          const coords = { latitude: lat, longitude: lng };
          setDropCoords(coords);
          setRouteInfo(null);
          if (pickup) {
            calculateRoute(pickup, name, pickupCoords, coords);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mapContainer: {
    height: height * 0.36,
    width: width,
    backgroundColor: '#EAE5DB',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapBadgeOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(25, 25, 25, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 75, 0.4)',
  },
  mapBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F5C767',
  },
  controlPanel: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -22,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 12,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  inputsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    gap: 10,
  },
  locationDot: {
    fontSize: 14,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  locationPlaceholder: {
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  locationArrow: {
    fontSize: 20,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 14,
  },
  calculateBtn: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    margin: 10,
    marginTop: 12,
  },
  calculateBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  calculateBtnSuccess: {
    backgroundColor: '#1E6F3D',
  },
  calculatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calculateBtnText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  fleetSection: {
    marginBottom: 16,
  },
  fleetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  distanceBadgePill: {
    backgroundColor: 'rgba(232, 179, 75, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 75, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  distanceBadgePillText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  carsScroll: {
    paddingVertical: 4,
    gap: 10,
  },
  carCard: {
    width: 116,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    position: 'relative',
  },
  activeCarCard: {
    borderColor: COLORS.primaryDark,
    backgroundColor: 'rgba(232, 179, 75, 0.1)',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedPill: {
    position: 'absolute',
    top: -8,
    backgroundColor: COLORS.primaryDark,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  selectedPillText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  carRealImage: {
    width: 68,
    height: 38,
    marginTop: 4,
    marginBottom: 4,
  },
  carEmoji: {
    fontSize: 28,
    marginTop: 4,
    marginBottom: 4,
  },
  carName: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },
  carSeats: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 1,
    textAlign: 'center',
  },
  carFareContainer: {
    marginTop: 8,
    alignItems: 'center',
    width: '100%',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  carTotalFare: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  carRateSub: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  carRateAlone: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },
  perKmText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  estPendingText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  summaryCard: {
    backgroundColor: 'rgba(232, 179, 75, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 75, 0.25)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },
  summarySub: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  summaryPriceWrap: {
    alignItems: 'flex-end',
  },
  summaryPriceLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  summaryPriceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  dateTimeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    marginTop: 8,
  },
  dateTimeField: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 4,
  },
  dateTimeInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dateTimeValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  presetChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.text,
  },
  bookButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  bookButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  bookButtonText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30,30,30,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 999,
  },
  searchCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(232,179,75,0.3)',
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  searchSpinner: { marginBottom: 20 },
  searchTitle: {
    fontSize: 18,
    fontWeight: '950',
    color: COLORS.text,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  searchSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  searchProgress: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  cancelRequestBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  cancelRequestText: {
    color: COLORS.danger,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  // KM Rate Badge
  kmRateBadge: {
    backgroundColor: 'rgba(217, 154, 54, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 154, 54, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  kmRateBadgeText: {
    fontSize: 13,
    fontWeight: '950',
    color: COLORS.primaryDark,
  },
  // Helpline Card
  helplineCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8B34B',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  helplineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  helplineTitle: {
    fontSize: 12,
    fontWeight: '950',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  liveTag: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.success,
  },
  helplineSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  helplineBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  callBtnPrimary: {
    flex: 1,
    backgroundColor: '#1E6F3D',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callBtnSecondary: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callBtnIcon: {
    fontSize: 18,
  },
  callBtnLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E0E7FF',
    textTransform: 'uppercase',
  },
  callBtnNumber: {
    fontSize: 12,
    fontWeight: '950',
    color: '#FFFFFF',
  },
  whatsAppActionBtn: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  whatsAppIcon: {
    fontSize: 18,
  },
  whatsAppActionText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // Advance Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  advanceModalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 179, 75, 0.4)',
    elevation: 8,
  },
  advanceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  advanceModalTitle: {
    fontSize: 16,
    fontWeight: '950',
    color: COLORS.text,
  },
  advanceModalSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textMuted,
  },
  qrCodeContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrImage: {
    width: 170,
    height: 170,
    marginBottom: 8,
  },
  qrScanText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  upiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F1EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  upiPillLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.textMuted,
  },
  upiPillValue: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  payUpiAppBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  payUpiAppText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  utrInputWrap: {
    marginBottom: 14,
  },
  utrLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  utrInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: COLORS.text,
  },
  confirmAdvanceBtn: {
    backgroundColor: '#1E6F3D',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmAdvanceBtnText: {
    color: '#FFFFFF',
    fontWeight: '950',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
