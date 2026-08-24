import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FaMapMarkerAlt, FaCalendarAlt, FaClock, FaCar,
  FaChevronRight, FaHeadset, FaCrosshairs, FaSearch,
  FaPhoneAlt, FaRoute, FaUserCircle, FaCreditCard,
  FaPhone, FaHistory, FaTimes, FaShieldAlt,
  FaGlobeAmericas, FaMap, FaMountain
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import RouteMap from '../../components/RouteMap';
import { api, postMapRoute, searchPlaces, reverseGeocodeCoord } from '../../lib/api.js';

// ── UBER / OLA GRADE CUSTOM MARKERS ──
const createPickupIcon = () =>
  L.divIcon({
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; cursor: grab;">
        <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(34, 197, 94, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: #22c55e; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
        </div>
      </div>
    `,
    className: 'uber-pickup-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

const createDropIcon = () =>
  L.divIcon({
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 38px; height: 44px; cursor: grab;">
        <div style="width: 26px; height: 26px; border-radius: 8px; background: #ef4444; border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.5); display: flex; align-items: center; justify-content: center;">
          <div style="width: 9px; height: 9px; background: #ffffff; border-radius: 2px;"></div>
        </div>
        <div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #ef4444; margin-top: -1px;"></div>
      </div>
    `,
    className: 'uber-drop-marker',
    iconSize: [38, 44],
    iconAnchor: [19, 42],
  });

const pickupIcon = createPickupIcon();
const dropIcon = createDropIcon();

// Auto Fit Bounds to Route & Markers
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (!positions || positions.length < 2) return;
    try {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
        animate: true,
        duration: 0.8,
      });
    } catch {
      /* ignore */
    }
  }, [map, positions]);
  return null;
}

// Interactive Map Click Handler (to place Pickup / Drop by clicking map)
function MapClickHandler({ mapPickMode, onMapClick }) {
  useMapEvents({
    click(e) {
      if (mapPickMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Draggable Marker Handler
function DraggableMarker({ position, icon, onDragEnd, popupTitle, subtitle }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onDragEnd(latLng.lat, latLng.lng);
        }
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={icon}
    >
      <Popup>
        <div className="p-1 min-w-[150px]">
          <span className="text-[10px] font-black uppercase tracking-wider block text-primary mb-0.5">{popupTitle}</span>
          <p className="text-xs font-bold text-dark leading-tight">{subtitle || 'Drag to reposition'}</p>
          <span className="text-[9px] text-muted block mt-1">📍 Drag pin or click map to move</span>
        </div>
      </Popup>
    </Marker>
  );
}

const DEFAULT_CARS = [
  { id: 1, name: 'Van', type: 'Van', pricePerKm: 10, seats: 4, eta: '5 mins', image: 'https://images.unsplash.com/photo-1559297434-fae8a1916a79?w=300&auto=format&fit=crop&q=80' },
  { id: 2, name: 'Echo', type: 'Micro', pricePerKm: 12, seats: 6, eta: '4 mins', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=300&auto=format&fit=crop&q=80' },
  { id: 3, name: 'Swift', type: 'Sedan', pricePerKm: 14, seats: 4, eta: '3 mins', image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=300&auto=format&fit=crop&q=80' },
];

// Google Maps Tile Layers
const MAP_LAYERS = {
  roadmap: {
    name: 'Default',
    icon: <FaMap />,
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps',
  },
  satellite: {
    name: 'Satellite',
    icon: <FaGlobeAmericas />,
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', // Google Hybrid (Satellite + Roads & Labels)
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps',
  },
  terrain: {
    name: 'Terrain',
    icon: <FaMountain />,
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps',
  },
  traffic: {
    name: 'Traffic',
    icon: <FaRoute />,
    url: 'https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps',
  },
};

const BookingPage = ({ activeTab, user, setCustomerTab }) => {
  const { t } = useTranslation();

  // Full Screen Live Map Modal
  const [showFullLiveTrackingModal, setShowFullLiveTrackingModal] = useState(false);

  // Locations state (Central India default coordinates: Barwani to Indore)
  const [pickup, setPickup] = useState('Barwani, Madhya Pradesh');
  const [drop, setDrop] = useState('Indore, Madhya Pradesh');
  const [pickupCoords, setPickupCoords] = useState({ lat: 22.0366, lng: 74.9031 });
  const [dropCoords, setDropCoords] = useState({ lat: 22.7196, lng: 75.8577 });
  const [routeCoords, setRouteCoords] = useState([[22.0366, 74.9031], [22.7196, 75.8577]]);
  const [distance, setDistance] = useState(145);
  const [durationMin, setDurationMin] = useState(180);

  // Map Mode & Layers (Default Google Map)
  const [mapLayer, setMapLayer] = useState('roadmap'); // 'roadmap' | 'satellite' | 'terrain' | 'traffic'
  const [mapPickMode, setMapPickMode] = useState(null); // null | 'pickup' | 'drop'

  // Suggestions state
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropDropdown, setShowDropDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Cars & filters
  const [cars, setCars] = useState(DEFAULT_CARS);
  const [selectedCar, setSelectedCar] = useState(DEFAULT_CARS[0]);
  const [modalFilter, setModalFilter] = useState('All');
  const [showAllCarsModal, setShowAllCarsModal] = useState(false);

  // Booking & UI state
  const [status, setStatus] = useState('idle');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [showMobilePanel, setShowMobilePanel] = useState(true);
  const [allBookings, setAllBookings] = useState([]);

  const routeTimer = useRef(null);
  const pickupSearchTimer = useRef(null);
  const dropSearchTimer = useRef(null);

  const displayName = user?.name || t('booking.rider_fallback', 'Rider');

  const translateStatus = (st) => {
    const map = {
      Completed: 'admin.status_completed',
      Pending: 'admin.status_pending',
      Assigned: 'admin.status_assigned',
      Accepted: 'admin.status_accepted',
      Cancelled: 'admin.status_cancelled',
    };
    return map[st] ? t(map[st]) : st;
  };

  // Load Bookings list
  const loadBookings = useCallback(async () => {
    try {
      const list = await api('/api/bookings');
      setAllBookings(Array.isArray(list) ? list : []);
    } catch {
      /* keep */
    }
  }, []);

  // Fetch cars catalog
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api('/api/catalog/cars');
        if (!cancelled && Array.isArray(list) && list.length) {
          setCars(list);
          setSelectedCar(list[0]);
        }
      } catch {
        if (!cancelled) setCars(DEFAULT_CARS);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    loadBookings();
    const interval = setInterval(loadBookings, 5000);
    return () => clearInterval(interval);
  }, [loadBookings]);

  // Recalculate Route when coords or text changes
  const calculateRoute = useCallback(async (pText, dText, pCoord, dCoord) => {
    try {
      const route = await postMapRoute(pText, dText, pCoord, dCoord);
      if (route && route.coordinates?.length) {
        setRouteCoords(route.coordinates);
        setDistance(route.distanceKm || 1);
        setDurationMin(route.durationMin || Math.max(5, Math.round(route.distanceKm * 1.8)));
        if (route.pickup) setPickupCoords({ lat: route.pickup.lat, lng: route.pickup.lng });
        if (route.drop) setDropCoords({ lat: route.drop.lat, lng: route.drop.lng });
      }
    } catch (e) {
      console.warn('Route calculation error:', e.message);
    }
  }, []);

  // Debounced Route trigger
  useEffect(() => {
    if (routeTimer.current) clearTimeout(routeTimer.current);
    routeTimer.current = setTimeout(() => {
      if (pickup && drop) {
        calculateRoute(pickup, drop, pickupCoords, dropCoords);
      }
    }, 600);
    return () => {
      if (routeTimer.current) clearTimeout(routeTimer.current);
    };
  }, [pickup, drop, calculateRoute]);

  // Pickup autocomplete search
  const handlePickupChange = (e) => {
    const val = e.target.value;
    setPickup(val);
    if (pickupSearchTimer.current) clearTimeout(pickupSearchTimer.current);
    if (val.trim().length >= 2) {
      pickupSearchTimer.current = setTimeout(async () => {
        const suggestions = await searchPlaces(val);
        setPickupSuggestions(suggestions);
        setShowPickupDropdown(true);
      }, 350);
    } else {
      setPickupSuggestions([]);
      setShowPickupDropdown(false);
    }
  };

  // Drop autocomplete search
  const handleDropChange = (e) => {
    const val = e.target.value;
    setDrop(val);
    if (dropSearchTimer.current) clearTimeout(dropSearchTimer.current);
    if (val.trim().length >= 2) {
      dropSearchTimer.current = setTimeout(async () => {
        const suggestions = await searchPlaces(val);
        setDropSuggestions(suggestions);
        setShowDropDropdown(true);
      }, 350);
    } else {
      setDropSuggestions([]);
      setShowDropDropdown(false);
    }
  };

  // Select Pickup suggestion
  const selectPickupSuggestion = (item) => {
    setPickup(item.name);
    setPickupCoords({ lat: item.lat, lng: item.lng });
    setShowPickupDropdown(false);
    calculateRoute(item.name, drop, { lat: item.lat, lng: item.lng }, dropCoords);
  };

  // Select Drop suggestion
  const selectDropSuggestion = (item) => {
    setDrop(item.name);
    setDropCoords({ lat: item.lat, lng: item.lng });
    setShowDropDropdown(false);
    calculateRoute(pickup, item.name, pickupCoords, { lat: item.lat, lng: item.lng });
  };

  // Handle Dragging Pickup Marker
  const handlePickupDrag = async (lat, lng) => {
    const newCoord = { lat, lng };
    setPickupCoords(newCoord);
    toast.loading('Locating pickup point...', { id: 'drag-geo' });
    const address = await reverseGeocodeCoord(lat, lng);
    setPickup(address);
    toast.success(`Pickup set: ${address.split(',')[0]}`, { id: 'drag-geo' });
    calculateRoute(address, drop, newCoord, dropCoords);
  };

  // Handle Dragging Drop Marker
  const handleDropDrag = async (lat, lng) => {
    const newCoord = { lat, lng };
    setDropCoords(newCoord);
    toast.loading('Locating destination...', { id: 'drag-geo-drop' });
    const address = await reverseGeocodeCoord(lat, lng);
    setDrop(address);
    toast.success(`Drop set: ${address.split(',')[0]}`, { id: 'drag-geo-drop' });
    calculateRoute(pickup, address, pickupCoords, newCoord);
  };

  // Handle Direct Map Click
  const handleMapClick = async (lat, lng) => {
    const newCoord = { lat, lng };
    if (mapPickMode === 'pickup') {
      setPickupCoords(newCoord);
      toast.loading('Setting pickup location on map...', { id: 'map-click' });
      const address = await reverseGeocodeCoord(lat, lng);
      setPickup(address);
      setMapPickMode(null);
      toast.success(`Pickup set: ${address.split(',')[0]}`, { id: 'map-click' });
      calculateRoute(address, drop, newCoord, dropCoords);
    } else if (mapPickMode === 'drop') {
      setDropCoords(newCoord);
      toast.loading('Setting drop destination on map...', { id: 'map-click' });
      const address = await reverseGeocodeCoord(lat, lng);
      setDrop(address);
      setMapPickMode(null);
      toast.success(`Drop set: ${address.split(',')[0]}`, { id: 'map-click' });
      calculateRoute(pickup, address, pickupCoords, newCoord);
    }
  };

  // Current Location GPS Button
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    const toastId = toast.loading('Detecting your GPS location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const newCoord = { lat, lng };
        setPickupCoords(newCoord);
        const address = await reverseGeocodeCoord(lat, lng);
        setPickup(address);
        setIsLocating(false);
        toast.success(`Located: ${address.split(',')[0]}`, { id: toastId });
        calculateRoute(address, drop, newCoord, dropCoords);
      },
      (err) => {
        setIsLocating(false);
        toast.error('Could not get GPS location. Please allow location access.', { id: toastId });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fare = selectedCar ? Math.round(distance * selectedCar.pricePerKm) : 0;

  // Handle Booking Submit
  const handleBooking = async () => {
    if (!selectedCar) {
      toast.error(t('booking.toast_loading_cars', 'Please select a car'));
      return;
    }
    if (!bookingDate || !bookingTime) {
      toast.error(t('booking.toast_select_datetime', 'Please select booking date and time'));
      return;
    }
    try {
      await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          pickup,
          drop,
          bookingDate,
          bookingTime,
          carName: selectedCar.name,
          fare,
          distanceKm: distance,
          routeCoords,
          pickupLat: pickupCoords.lat,
          pickupLng: pickupCoords.lng,
          dropLat: dropCoords.lat,
          dropLng: dropCoords.lng,
        }),
      });
      await loadBookings();
      setStatus('searching');
      toast.success(t('booking.toast_booking_sent', 'Booking request sent successfully!'));
    } catch (e) {
      toast.error(e.message || t('booking.toast_booking_failed', 'Booking failed'));
    }
  };

  const isBookingView = activeTab === 'Book Ride' || !activeTab;
  const isDashboardView = activeTab === 'Dashboard';

  const modalCategories = useMemo(() => {
    const list = ['All', ...new Set(cars.map(c => c.name || c.type))];
    return list.filter(Boolean);
  }, [cars]);

  const modalFilteredCars = useMemo(() => {
    if (modalFilter === 'All') return cars;
    return cars.filter(c => (c.name === modalFilter || c.type === modalFilter));
  }, [cars, modalFilter]);

  return (
    <div className="pt-16 min-h-screen bg-background text-dark">

      {/* ── CUSTOMER DASHBOARD ── */}
      {isDashboardView && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h2 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase text-dark leading-none">
                {t('booking.hello')}, <span className="text-primary">{displayName}</span>
              </h2>
              <p className="text-muted text-[10px] sm:text-xs uppercase font-black tracking-widest mt-2">{t('booking.welcome_hub')}</p>
            </div>
            <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 px-4 sm:px-6 py-3 rounded-2xl shadow-lg shadow-primary/5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-xl flex items-center justify-center text-dark text-xl sm:text-2xl shadow-inner"><FaCreditCard /></div>
              <div>
                <p className="text-[9px] sm:text-[10px] text-primary uppercase font-black tracking-tighter leading-none mb-1">{t('booking.wallet_balance')}</p>
                <p className="text-xl sm:text-2xl font-black text-dark leading-none">₹{allBookings.filter(b => b.status === 'Completed').reduce((acc, b) => acc + (b.fare || 0), 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
             {[
               { labelKey: 'booking.stat_total_rides', val: allBookings.length, icon: <FaCar />, color: 'text-blue-600' },
               { labelKey: 'booking.stat_total_spent', val: `₹${allBookings.filter(b => b.status === 'Completed').reduce((acc, b) => acc + (b.fare || 0), 0).toLocaleString('en-IN')}`, icon: <FaRoute />, color: 'text-green-600' },
               { labelKey: 'booking.stat_rating', val: allBookings.length > 0 ? '5.0/5' : 'New', icon: <FaMapMarkerAlt />, color: 'text-yellow-600' },
               { labelKey: 'booking.stat_saved_places', val: String([...new Set(allBookings.map(b => b.pickup).concat(allBookings.map(b => b.drop)).filter(Boolean))].length || (allBookings.length ? 2 : 0)), icon: <FaCalendarAlt />, color: 'text-primary' },
             ].map((stat, i) => (
               <div key={i} className="glass-card p-4 sm:p-8 group hover:border-primary/30 transition-all cursor-pointer">
                  <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-dark/5 flex items-center justify-center text-xl sm:text-2xl mb-4 sm:mb-6 ${stat.color} group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                  <p className="text-muted text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">{t(stat.labelKey)}</p>
                  <p className="text-xl sm:text-3xl font-black text-dark">{stat.val}</p>
               </div>
              ))}
          </div>

           {/* ── PROMINENT TOP LIVE TRIP TRACKING (OLA/UBER STYLE) ── */}
           {allBookings.length > 0 && (
             <div className="glass-card p-5 sm:p-8 border-2 border-primary bg-primary/5 rounded-3xl shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-primary text-dark flex items-center justify-center text-2xl shadow-lg shadow-primary/20 animate-pulse shrink-0">
                      <FaCar />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/20 px-2.5 py-0.5 rounded">
                        Live Ride Tracking 📍
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-dark tracking-tight mt-1">
                        {allBookings[0].status === 'Accepted' ? 'Captain En Route (ETA 3 Mins)' : allBookings[0].status === 'Assigned' ? 'Captain Assigned' : 'Ride in Progress'}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/20 border-2 border-primary/50 px-3.5 py-1.5 rounded-xl text-xs font-black text-dark tracking-wider flex items-center gap-1.5 shadow-sm">
                      <span>🔐 START OTP:</span>
                      <strong className="text-sm font-black text-primary tracking-widest bg-dark text-white px-2 py-0.5 rounded">
                        4821
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFullLiveTrackingModal(true)}
                      className="btn-primary px-4 py-2 text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20 flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all"
                    >
                      <FaRoute /> Full Map ↗
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Google Map Route Preview */}
                  <div className="lg:col-span-2 h-[260px] sm:h-[320px] rounded-2xl overflow-hidden relative border border-border shadow-inner">
                    <RouteMap
                      pickup={allBookings[0].pickup}
                      drop={allBookings[0].drop}
                      routeCoords={allBookings[0].routeCoords}
                      distanceKm={allBookings[0].distance ? parseFloat(String(allBookings[0].distance).replace(/[^0-9.]/g, '')) : 145}
                      driverCoords={[pickupCoords.lat, pickupCoords.lng]}
                      showLayerToggle={true}
                    />
                  </div>

                  {/* Driver & Trip Info */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      {allBookings[0].driver ? (
                        <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-primary/20 text-primary rounded-xl flex items-center justify-center text-xl font-black shrink-0">
                              <FaUserCircle />
                            </div>
                            <div>
                              <h4 className="font-black text-sm text-dark">{allBookings[0].driver.name}</h4>
                              <p className="text-[10px] text-muted font-bold">{allBookings[0].driver.vehicleName} • {allBookings[0].driver.vehicleNumber}</p>
                            </div>
                          </div>
                          <a href="tel:+916261828036" className="w-9 h-9 bg-green-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-green-500/20 hover:scale-105 transition-all">
                            <FaPhoneAlt size={12} />
                          </a>
                        </div>
                      ) : (
                        <div className="bg-dark/5 p-4 rounded-2xl border border-border text-center">
                          <p className="text-xs text-muted font-bold uppercase">Assigning nearest captain...</p>
                        </div>
                      )}

                      <div className="bg-dark/5 p-4 rounded-2xl border border-border space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-muted font-bold">Pickup:</span><strong className="text-dark truncate max-w-[150px]">{allBookings[0].pickup}</strong></div>
                        <div className="flex justify-between"><span className="text-muted font-bold">Drop:</span><strong className="text-dark truncate max-w-[150px]">{allBookings[0].drop}</strong></div>
                        <div className="flex justify-between border-t border-border/50 pt-1.5"><span className="text-muted font-bold">Fare:</span><strong className="text-primary font-black text-base">₹{allBookings[0].fare}</strong></div>
                      </div>
                    </div>

                    <a href="tel:+916261828036" className="w-full py-2.5 bg-dark/5 hover:bg-dark/10 rounded-xl text-center font-black uppercase text-[11px] text-dark border border-border flex items-center justify-center gap-2">
                      <FaHeadset /> 24/7 Helpline
                    </a>
                  </div>
                </div>
             </div>
           )}

           {/* Quick Actions & Recent Activity */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <button onClick={() => window.location.hash = 'Book Ride'} className="glass-card p-6 sm:p-10 bg-primary group hover:bg-white transition-all text-black text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 rounded-full -mr-10 -mt-10" />
                    <FaCar className="text-3xl sm:text-5xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform" />
                    <h3 className="text-xl sm:text-3xl font-black uppercase italic tracking-tighter leading-tight">{t('booking.book_new_ride_1')}<br/>{t('booking.book_new_ride_2')}</h3>
                    <p className="text-[10px] font-bold uppercase mt-4 tracking-widest opacity-60">{t('booking.verified_drivers')}</p>
                 </button>
                 <button onClick={() => window.location.hash = 'Support'} className="glass-card p-6 sm:p-10 bg-dark/5 border-border hover:border-primary transition-all text-left group">
                    <FaHeadset className="text-3xl sm:text-5xl mb-4 sm:mb-6 text-primary group-hover:scale-110 transition-transform" />
                    <h3 className="text-xl sm:text-3xl font-black uppercase italic tracking-tighter leading-tight text-dark">{t('booking.live_support_1')}<br/>{t('booking.live_support_2')}</h3>
                    <p className="text-[10px] font-bold uppercase mt-4 tracking-widest text-muted">{t('booking.local_language_assistance')}</p>
                 </button>
            </div>

            {/* Recent Activity Mini List */}
            <div className="space-y-4">
              <h3 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-dark">{t('booking.recent_activity')}</h3>
              <div className="space-y-3">
                 {allBookings.length > 0 ? (
                   allBookings.slice(0, 4).map((ride) => (
                     <div key={ride.id} className="glass-card p-4 border-border hover:bg-dark/5 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-dark/5 rounded-xl flex items-center justify-center text-muted group-hover:text-primary transition-colors"><FaHistory /></div>
                          <div>
                            <p className="text-xs font-black text-dark uppercase truncate max-w-[120px]">{ride.drop}</p>
                            <p className="text-[9px] text-muted font-bold">{ride.date}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-primary">₹{ride.fare}</p>
                     </div>
                   ))
                 ) : (
                   <div className="glass-card p-6 text-center border-dashed border-border">
                     <p className="text-muted text-xs font-bold uppercase tracking-wider">No ride history yet</p>
                   </div>
                 )}
              </div>
              <button onClick={() => window.location.hash = 'My Rides'} className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-muted hover:text-dark border border-border rounded-xl hover:bg-dark/5 transition-all">{t('booking.view_all_rides')}</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── BOOKING VIEW (OLA / UBER EXPERIENCE) ── */}
      {isBookingView && (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] relative overflow-x-hidden">

          {/* Mobile top toggle */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-background/90 backdrop-blur-xl border-b border-border z-30 sticky top-0">
            <div>
              <h1 className="text-lg font-black tracking-tighter italic text-dark uppercase">
                SAFAR<span className="text-primary">SETU</span>
              </h1>
              <p className="text-[10px] text-muted uppercase font-black tracking-widest">Premium Local Rides</p>
            </div>
            <button
              onClick={() => setShowMobilePanel(p => !p)}
              className="flex items-center gap-2 bg-primary text-dark rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
            >
              {!showMobilePanel ? <FaMapMarkerAlt className="text-[10px]" /> : <FaCar className="text-[10px]" />}
              {!showMobilePanel ? t('booking.show_map', 'View Map') : t('booking.show_form', 'Booking Form')}
            </button>
          </div>

          {/* ── SIDE BOOKING PANEL ── */}
          <div className={`w-full lg:w-[440px] transition-all duration-300 ${showMobilePanel ? 'hidden lg:block' : 'block'} lg:h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-border bg-background/80 backdrop-blur-xl z-20 lg:flex-shrink-0`}>
             <div className="p-4 sm:p-6 space-y-6">
                
                {/* Brand Desktop Header */}
                <div className="hidden lg:block">
                  <h1 className="text-4xl font-black tracking-tighter italic text-dark uppercase leading-tight">
                    Safar<span className="text-primary">Setu</span>
                  </h1>
                  <p className="text-muted text-[10px] uppercase font-black tracking-widest">Premium Local Connectivity</p>
                </div>

                {/* ── LOCATION INPUTS WITH AUTOCOMPLETE & GPS ── */}
                <div className="space-y-4">
                  
                  {/* PICKUP INPUT */}
                  <div className="relative">
                    <div className="flex justify-between items-center mb-1.5 px-1">
                      <label className="text-[10px] uppercase tracking-widest font-black text-green-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        {t('booking.pickup', 'Pickup Point')}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setMapPickMode(mapPickMode === 'pickup' ? null : 'pickup')}
                          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                            mapPickMode === 'pickup' 
                              ? 'bg-green-600 text-white shadow-md shadow-green-600/30 scale-105' 
                              : 'bg-green-500/10 text-green-700 hover:bg-green-500/20'
                          }`}
                          title="Click on map to set pickup"
                        >
                          <span>📍</span> {mapPickMode === 'pickup' ? 'Click on Map...' : 'Pick on Map'}
                        </button>
                        <button
                          type="button"
                          onClick={handleUseCurrentLocation}
                          disabled={isLocating}
                          className="text-[10px] font-black uppercase tracking-wider text-primary hover:text-dark transition-colors flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg hover:bg-primary/20"
                        >
                          <FaCrosshairs className={isLocating ? 'animate-spin' : ''} />
                          {isLocating ? 'GPS...' : 'GPS'}
                        </button>
                      </div>
                    </div>

                    <div className="relative group">
                      <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none">
                         <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                      </div>
                      <input
                        type="text"
                        value={pickup}
                        onChange={handlePickupChange}
                        onFocus={() => pickupSuggestions.length && setShowPickupDropdown(true)}
                        className={`input-field pl-12 pr-10 text-sm py-3.5 bg-dark/5 border-border hover:border-green-500/40 focus:border-green-500 rounded-2xl transition-all font-medium ${
                          mapPickMode === 'pickup' ? 'ring-2 ring-green-500 bg-green-500/5' : ''
                        }`}
                        placeholder="Enter pickup location..."
                      />
                      <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-xs pointer-events-none" />
                    </div>

                    {/* Pickup Autocomplete Suggestions List */}
                    <AnimatePresence>
                      {showPickupDropdown && pickupSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto custom-scrollbar"
                        >
                          {pickupSuggestions.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => selectPickupSuggestion(item)}
                              className="w-full text-left px-4 py-3 hover:bg-primary/10 border-b border-border/50 last:border-0 flex items-start gap-3 transition-colors group"
                            >
                              <FaMapMarkerAlt className="text-green-500 mt-1 shrink-0 group-hover:scale-110 transition-transform" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-dark truncate">{item.name.split(',')[0]}</p>
                                <p className="text-[10px] text-muted truncate">{item.name}</p>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* DROP INPUT */}
                  <div className="relative">
                    <div className="flex justify-between items-center mb-1.5 px-1">
                      <label className="text-[10px] uppercase tracking-widest font-black text-red-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm bg-red-500" />
                        {t('booking.drop', 'Drop Point')}
                      </label>
                      <button
                        type="button"
                        onClick={() => setMapPickMode(mapPickMode === 'drop' ? null : 'drop')}
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                          mapPickMode === 'drop' 
                            ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-105' 
                            : 'bg-red-500/10 text-red-700 hover:bg-red-500/20'
                        }`}
                        title="Click on map to set drop"
                      >
                        <span>📍</span> {mapPickMode === 'drop' ? 'Click on Map...' : 'Pick on Map'}
                      </button>
                    </div>

                    <div className="relative group">
                       <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none">
                          <div className="w-3 h-3 bg-red-500 rounded-sm shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                       </div>
                       <input
                         type="text"
                         value={drop}
                         onChange={handleDropChange}
                         onFocus={() => dropSuggestions.length && setShowDropDropdown(true)}
                         className={`input-field pl-12 pr-10 text-sm py-3.5 bg-dark/5 border-border hover:border-red-500/40 focus:border-red-500 rounded-2xl transition-all font-medium ${
                           mapPickMode === 'drop' ? 'ring-2 ring-red-500 bg-red-500/5' : ''
                         }`}
                         placeholder="Enter destination location..."
                       />
                       <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-xs pointer-events-none" />
                    </div>

                    {/* Drop Autocomplete Suggestions List */}
                    <AnimatePresence>
                      {showDropDropdown && dropSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto custom-scrollbar"
                        >
                          {dropSuggestions.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => selectDropSuggestion(item)}
                              className="w-full text-left px-4 py-3 hover:bg-primary/10 border-b border-border/50 last:border-0 flex items-start gap-3 transition-colors group"
                            >
                              <FaMapMarkerAlt className="text-red-500 mt-1 shrink-0 group-hover:scale-110 transition-transform" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-dark truncate">{item.name.split(',')[0]}</p>
                                <p className="text-[10px] text-muted truncate">{item.name}</p>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Date & Time Selectors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-xs pointer-events-none" />
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={e => setBookingDate(e.target.value)}
                        className="input-field pl-9 text-xs py-3 bg-dark/5 border-border rounded-xl font-bold"
                      />
                    </div>
                    <div className="relative">
                      <FaClock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary text-xs pointer-events-none" />
                      <input
                        type="time"
                        value={bookingTime}
                        onChange={e => setBookingTime(e.target.value)}
                        className="input-field pl-9 text-xs py-3 bg-dark/5 border-border rounded-xl font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* ── SINGLE SELECTED VEHICLE CARD (CLEAN VIEW) ── */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                       <span className="w-3 h-0.5 bg-primary rounded-full" /> Selected Vehicle
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAllCarsModal(true)}
                      className="text-xs font-black text-primary hover:text-dark uppercase underline transition-colors"
                    >
                      Change Vehicle ↗
                    </button>
                  </div>

                  {/* Single Selected Vehicle Display */}
                  {selectedCar ? (
                    <div
                      onClick={() => setShowAllCarsModal(true)}
                      className="cursor-pointer glass-card p-4 border-2 border-primary bg-primary/10 rounded-2xl flex items-center justify-between hover:scale-[1.01] transition-all shadow-lg shadow-primary/10"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-16 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 border border-border shadow-sm shrink-0">
                          <img src={selectedCar.image} alt={selectedCar.name} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-dark text-base leading-none">{selectedCar.name}</h4>
                            <span className="text-[9px] bg-dark/10 text-dark font-black px-1.5 py-0.5 rounded uppercase">{selectedCar.seats} Seats</span>
                          </div>
                          <p className="text-[11px] text-muted font-bold mt-1 flex items-center gap-1.5">
                            <span className="text-green-600">⚡ {selectedCar.eta || '3 mins'}</span>
                            <span>•</span>
                            <span>₹{selectedCar.pricePerKm}/km</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-dark leading-none">₹{fare}</p>
                        <span className="text-[8px] text-muted uppercase font-bold">Est. Total</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAllCarsModal(true)}
                      className="w-full p-4 border-2 border-dashed border-primary/50 rounded-2xl flex items-center justify-center gap-2 text-dark font-black text-xs uppercase hover:bg-primary/5 transition-all"
                    >
                      <FaCar className="text-primary text-base" /> Select Your Vehicle
                    </button>
                  )}

                  {/* Choose Vehicle Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setShowAllCarsModal(true)}
                    className="w-full py-2.5 bg-dark/5 hover:bg-dark/10 text-dark rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border border-border flex items-center justify-center gap-2"
                  >
                    <FaCar /> Compare Fleet & Rates ({cars.length} Available)
                  </button>
                </div>

                {/* Submit Booking Button */}
                <div className="pt-2">
                  <div className="bg-dark/5 p-3 rounded-2xl flex justify-between items-center mb-3 border border-border">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted">Estimated Ride Fare</p>
                      <p className="text-2xl font-black text-dark">₹{fare}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted">{distance} KM • {durationMin} MIN</p>
                      <p className="text-xs font-bold text-primary">{selectedCar?.name || 'Cab'}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleBooking}
                    className="w-full bg-primary hover:bg-dark text-dark hover:text-background py-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs tracking-wider shadow-xl shadow-primary/25 transition-all group"
                  >
                    <span>{t('booking.book_request_btn', 'Send Booking Request')}</span>
                    <FaChevronRight className="group-hover:translate-x-1.5 transition-transform" />
                  </button>
                </div>

             </div>
          </div>

          {/* ── MAP VIEW (GOOGLE MAPS LAYERS & INTERACTION) ── */}
          <div className={`w-full relative transition-all duration-300 ${!showMobilePanel ? 'h-[280px]' : 'h-[80vh]'} lg:flex-1 lg:h-[calc(100vh-64px)]`}>
            
            <MapContainer
              center={[pickupCoords.lat, pickupCoords.lng]}
              zoom={12}
              className={`w-full h-full z-10 ${mapPickMode ? 'cursor-crosshair' : ''}`}
              style={{ height: '100%', width: '100%', background: '#e5e7eb' }}
            >
              <TileLayer 
                key={mapLayer}
                attribution={MAP_LAYERS[mapLayer].attribution}
                url={MAP_LAYERS[mapLayer].url}
                subdomains={MAP_LAYERS[mapLayer].subdomains || ['mt0', 'mt1', 'mt2', 'mt3']}
                maxZoom={20}
              />
              
              <FitBounds positions={routeCoords} />
              <MapClickHandler mapPickMode={mapPickMode} onMapClick={handleMapClick} />

              {/* Draggable Pickup Marker */}
              <DraggableMarker
                position={[pickupCoords.lat, pickupCoords.lng]}
                icon={pickupIcon}
                onDragEnd={handlePickupDrag}
                popupTitle="🟢 Pickup Location"
                subtitle={pickup}
              />

              {/* Draggable Drop Marker */}
              <DraggableMarker
                position={[dropCoords.lat, dropCoords.lng]}
                icon={dropIcon}
                onDragEnd={handleDropDrag}
                popupTitle="🔴 Drop Destination"
                subtitle={drop}
              />

              {/* Real Road Polyline */}
              <Polyline
                positions={routeCoords}
                color="#0f172a"
                weight={8}
                opacity={0.3}
                lineCap="round"
                lineJoin="round"
              />
              <Polyline
                positions={routeCoords}
                color="#EAB308"
                weight={5}
                opacity={0.95}
                lineCap="round"
                lineJoin="round"
              />
            </MapContainer>

            {/* ── MAP PICK MODE ACTIVE BANNER ── */}
            <AnimatePresence>
              {mapPickMode && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] glass-card bg-surface/95 backdrop-blur-xl border-2 border-primary shadow-2xl rounded-2xl px-5 py-2.5 flex items-center gap-3"
                >
                  <span className="animate-ping w-2.5 h-2.5 rounded-full bg-primary" />
                  <p className="text-xs font-black text-dark uppercase tracking-wider">
                    Click anywhere on the map to set <span className="text-primary">{mapPickMode === 'pickup' ? 'Pickup 🟢' : 'Drop 🔴'}</span>
                  </p>
                  <button
                    onClick={() => setMapPickMode(null)}
                    className="ml-2 text-xs font-bold text-red-500 hover:underline uppercase"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── TOP LEFT: HUD INFO PILL ── */}
            <div className="absolute top-4 left-4 z-[990] glass-card bg-background/95 backdrop-blur-xl border border-primary/30 shadow-2xl rounded-2xl p-3 flex items-center gap-3.5 pointer-events-auto">
              <div className="w-9 h-9 rounded-xl bg-primary text-dark flex items-center justify-center text-sm shadow-md shadow-primary/20 shrink-0">
                <FaRoute />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-dark tracking-tight leading-none">
                    {distance} <span className="text-[10px] font-bold text-muted uppercase">KM</span>
                  </span>
                  <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                    • <FaClock size={10} /> {durationMin} min
                  </span>
                </div>
                <p className="text-[9px] text-green-600 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Fastest Road Route
                </p>
              </div>
            </div>

            {/* ── TOP RIGHT: GOOGLE MAPS STYLE LAYER SWITCHER (DEFAULT, SATELLITE, TERRAIN, TRAFFIC) ── */}
            <div className="absolute top-4 right-4 z-[990] flex items-center gap-1.5 bg-background/95 backdrop-blur-md p-1.5 rounded-2xl border border-border shadow-2xl">
              {Object.entries(MAP_LAYERS).map(([key, item]) => (
                <button
                  key={key}
                  onClick={() => setMapLayer(key)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    mapLayer === key
                      ? 'bg-primary text-dark shadow-md shadow-primary/30 scale-105 ring-2 ring-primary/40'
                      : 'text-muted hover:text-dark hover:bg-dark/5'
                  }`}
                  title={item.name}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </button>
              ))}
            </div>

            {/* Floating Searching Driver Modal */}
            <AnimatePresence>
              {status === 'searching' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 z-[1100] flex items-center justify-center bg-background/75 backdrop-blur-md px-4"
                >
                  <div className="text-center p-8 sm:p-12 glass-card border-primary/40 bg-surface/95 rounded-3xl shadow-2xl w-full max-w-md">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-lg shadow-primary/20" />
                    <h2 className="text-2xl font-black mb-2 tracking-tighter uppercase italic text-dark">
                      {t('booking.finding_driver', 'Connecting with Drivers...')}
                    </h2>
                    <p className="text-muted text-xs max-w-xs mx-auto mb-6">
                      {t('booking.admin_assigning', 'We are dispatching nearest available verified drivers in your local area.')}
                    </p>
                    <div className="bg-dark/5 p-4 rounded-2xl text-left text-xs space-y-1.5 mb-6 border border-border">
                      <p><span className="text-muted font-bold">Pickup:</span> <strong className="text-dark">{pickup}</strong></p>
                      <p><span className="text-muted font-bold">Drop:</span> <strong className="text-dark">{drop}</strong></p>
                      <p><span className="text-muted font-bold">Vehicle:</span> <strong className="text-primary">{selectedCar?.name} (₹{fare})</strong></p>
                    </div>
                    <button
                      onClick={() => setStatus('idle')}
                      className="px-6 py-2.5 text-xs text-red-500 font-black uppercase tracking-widest hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      {t('booking.cancel_request', 'Cancel Request')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      )}

      {/* ── ALL VEHICLES POPUP MODAL (COMPARE & SELECT) ── */}
      <AnimatePresence>
        {showAllCarsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-dark/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="bg-surface border border-border rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-dark">
                    Select Your <span className="text-primary">Ride</span>
                  </h3>
                  <p className="text-xs text-muted font-bold">Compare verified fleet vehicles & transparent distance rates</p>
                </div>
                <button
                  onClick={() => setShowAllCarsModal(false)}
                  className="w-9 h-9 rounded-full bg-dark/5 hover:bg-dark/10 flex items-center justify-center text-muted hover:text-dark transition-colors"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Modal Category Filter Pills */}
              <div className="flex gap-2 pt-4 pb-2 overflow-x-auto no-scrollbar">
                {modalCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setModalFilter(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                      modalFilter === cat 
                        ? 'bg-primary text-dark shadow-md shadow-primary/30 scale-105' 
                        : 'bg-dark/5 text-muted hover:bg-dark/10 hover:text-dark'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Modal Vehicle Grid */}
              <div className="py-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                {modalFilteredCars.map((car) => {
                  const isSelected = selectedCar && selectedCar.id === car.id;
                  const carFare = Math.round(distance * car.pricePerKm);
                  return (
                    <div
                      key={car.id}
                      onClick={() => {
                        setSelectedCar(car);
                        setShowAllCarsModal(false);
                        toast.success(`${car.name} selected!`);
                      }}
                      className={`cursor-pointer p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:scale-[1.01] ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                          : 'border-border hover:border-primary/30 bg-dark/5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-16 bg-white rounded-xl flex items-center justify-center p-2 shadow-sm border border-border shrink-0">
                          <img src={car.image} alt={car.name} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-black text-dark">{car.name}</h4>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-primary/20 text-dark">
                              {car.type || 'Standard'}
                            </span>
                          </div>
                          <p className="text-xs text-muted font-bold mt-1">
                            {car.seats} Passenger Seats • {car.eta || '3 mins'} ETA
                          </p>
                          <p className="text-[11px] text-green-600 font-bold mt-0.5 flex items-center gap-1">
                            <FaShieldAlt size={10} /> Commercial Permit & Sanitized
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-0 pt-2 sm:pt-0 border-border/50">
                        <div>
                          <p className="text-2xl font-black text-dark sm:text-right">₹{carFare}</p>
                          <p className="text-[10px] text-muted sm:text-right">₹{car.pricePerKm}/km base rate</p>
                        </div>
                        <button className={`mt-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                          isSelected ? 'bg-primary text-dark' : 'bg-dark text-white hover:bg-primary hover:text-dark'
                        }`}>
                          {isSelected ? 'Selected ✓' : 'Select'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <button
                  onClick={() => setShowAllCarsModal(false)}
                  className="bg-primary text-dark font-black uppercase tracking-wider text-xs px-6 py-3 rounded-xl shadow-lg shadow-primary/20"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MY RIDES ── */}
      {activeTab === 'My Rides' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-8 lg:p-12 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase text-dark">{t('booking.rides_history')}</h2>
            <div className="bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20">
              <span className="text-[10px] text-primary font-black uppercase tracking-widest">{t('booking.total_rides')}: {allBookings.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
            {allBookings.map((ride) => (
              <div key={ride.id} className="glass-card p-5 sm:p-8 border-border hover:border-primary/20 transition-all flex flex-col h-full">
                <div className="flex justify-between items-start mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-border">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-[9px] sm:text-[10px] text-muted uppercase font-black">{ride.date} • {ride.time}</p>
                    <h4 className="text-base sm:text-xl font-bold text-dark truncate">{ride.pickup} → {ride.drop}</h4>
                  </div>
                  <span className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                    ride.status === 'Completed' ? 'bg-green-500/10 text-green-600' :
                    ride.status === 'Assigned' ? 'bg-blue-500/10 text-blue-600' :
                    ride.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-700' :
                    'bg-yellow-500/10 text-yellow-600 animate-pulse'
                  }`}>
                    {translateStatus(ride.status)}
                  </span>
                </div>

                <div className="space-y-2.5 mb-5 sm:mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                    <p className="text-xs text-muted font-medium">{ride.pickup}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
                    <p className="text-xs text-muted font-medium">{ride.drop}</p>
                  </div>
                </div>

                {ride.driver ? (
                  <div className="mt-auto p-3 sm:p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                        <FaUserCircle />
                      </div>
                      <div>
                        <p className="text-xs font-black text-dark">{ride.driver.name}</p>
                        <p className="text-[9px] text-muted uppercase font-bold">{ride.driver.vehicleName} • {ride.driver.vehicleNumber}</p>
                      </div>
                    </div>
                    <a 
                      href="tel:+916261828036"
                      className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-dark hover:scale-110 transition-all shadow-lg shadow-primary/20"
                      title={t('booking.contact_support')}
                    >
                      <FaPhone className="text-sm" />
                    </a>
                  </div>
                ) : (
                  <div className="mt-auto p-3 sm:p-4 bg-dark/5 rounded-2xl border border-border text-center">
                    <p className="text-[9px] sm:text-[10px] text-muted uppercase font-black">{t('booking.waiting_assign')}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── SUPPORT ── */}
      {activeTab === 'Support' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-8 lg:p-12 max-w-4xl mx-auto">
          <div className="glass-card p-6 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-primary/5 rounded-full blur-[100px]" />
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 text-primary text-2xl sm:text-4xl shadow-xl shadow-primary/5">
              <FaHeadset />
            </div>
            <h2 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase mb-3 sm:mb-4">{t('booking.support_title')}</h2>
            <p className="text-muted mb-8 sm:mb-12 max-w-md mx-auto text-sm">
              {t('booking.support_desc')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <button className="p-6 sm:p-8 bg-dark/5 rounded-2xl sm:rounded-3xl border border-border hover:border-primary/30 transition-all text-left group">
                <FaRoute className="text-primary text-xl sm:text-2xl mb-3 sm:mb-4 group-hover:scale-110 transition-all" />
                <h4 className="font-bold mb-1 text-sm sm:text-base text-dark">{t('booking.ride_issues')}</h4>
                <p className="text-xs text-muted">{t('booking.ride_issues_desc')}</p>
              </button>
              <button className="p-6 sm:p-8 bg-dark/5 rounded-2xl sm:rounded-3xl border border-border hover:border-primary/30 transition-all text-left group">
                <FaCreditCard className="text-primary text-xl sm:text-2xl mb-3 sm:mb-4 group-hover:scale-110 transition-all" />
                <h4 className="font-bold mb-1 text-sm sm:text-base text-dark">{t('booking.payment_wallet')}</h4>
                <p className="text-xs text-muted">{t('booking.payment_wallet_desc')}</p>
              </button>
            </div>
            <a 
              href="tel:+916261828036"
              className="mt-8 sm:mt-12 p-4 sm:p-6 bg-primary text-dark rounded-2xl sm:rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all text-sm shadow-xl shadow-primary/20"
            >
              <FaPhoneAlt /> {t('booking.call_helpdesk')}
            </a>
          </div>
        </motion.div>
      )}

      {/* ── FULL SCREEN LIVE TRIP TRACKING MODAL ── */}
      <AnimatePresence>
        {showFullLiveTrackingModal && allBookings.length > 0 && (
          <div className="fixed inset-0 z-[2500] flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFullLiveTrackingModal(false)}
              className="absolute inset-0 bg-dark/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.93 }}
              className="glass-card w-full max-w-5xl h-[88vh] p-4 sm:p-6 relative z-10 border-2 border-primary/40 rounded-3xl shadow-2xl bg-surface flex flex-col justify-between"
            >
              <div className="flex justify-between items-center pb-3 mb-2 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-dark flex items-center justify-center text-lg font-black animate-pulse shadow-md shadow-primary/20">
                    <FaCar />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tighter text-dark">
                      Live GPS Trip Navigation
                    </h3>
                    <p className="text-xs text-muted font-bold truncate max-w-xs sm:max-w-md">
                      {allBookings[0].pickup} → {allBookings[0].drop}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 text-dark px-3 py-1 rounded-xl text-xs font-black">
                    OTP: 4821
                  </div>
                  <button
                    onClick={() => setShowFullLiveTrackingModal(false)}
                    className="w-9 h-9 rounded-full bg-dark/5 hover:bg-dark/10 flex items-center justify-center text-muted hover:text-dark transition-colors"
                  >
                    <FaTimes size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 rounded-2xl overflow-hidden relative border border-border shadow-inner my-2 min-h-[300px]">
                <RouteMap
                  pickup={allBookings[0].pickup}
                  drop={allBookings[0].drop}
                  routeCoords={allBookings[0].routeCoords}
                  distanceKm={allBookings[0].distance ? parseFloat(String(allBookings[0].distance).replace(/[^0-9.]/g, '')) : 145}
                  driverCoords={[pickupCoords.lat, pickupCoords.lng]}
                  showLayerToggle={true}
                  turnInstruction="Captain moving along Google Maps route"
                />
              </div>

              <div className="pt-3 border-t border-border flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-4 text-xs font-bold">
                  {allBookings[0].driver && (
                    <span className="text-muted">Captain: <strong className="text-dark">{allBookings[0].driver.name} ({allBookings[0].driver.vehicleNumber})</strong></span>
                  )}
                  <span className="text-muted">Fare: <strong className="text-primary font-black text-sm">₹{allBookings[0].fare}</strong></span>
                  <span className="text-muted">Status: <strong className="text-green-600 font-black">{allBookings[0].status}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="tel:+916261828036"
                    className="bg-green-500 text-white font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-green-500/20 flex items-center gap-1.5"
                  >
                    <FaPhoneAlt size={11} /> Call Captain
                  </a>
                  <button
                    onClick={() => {
                      setShowFullLiveTrackingModal(false);
                      setCustomerTab?.('Book Ride');
                    }}
                    className="bg-primary text-dark font-black uppercase tracking-wider text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20"
                  >
                    Switch to Book View
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BookingPage;
