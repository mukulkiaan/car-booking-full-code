import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../../services/api';
import { COLORS } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

// Popular Indian cities & local hubs with coordinates (Nimar / MP focus + major cities)
const POPULAR_CITIES = [
  { name: 'Bodhwada', state: 'MP', lat: 22.1842, lng: 74.9654 },
  { name: 'Borlay', state: 'MP', lat: 22.0360, lng: 75.0049 },
  { name: 'Manawar', state: 'MP', lat: 22.2333, lng: 75.0833 },
  { name: 'Barwani', state: 'MP', lat: 22.0248, lng: 74.8964 },
  { name: 'Kukshi', state: 'MP', lat: 22.2024, lng: 74.7533 },
  { name: 'Rau', state: 'MP', lat: 22.6288, lng: 75.8087 },
  { name: 'Indore', state: 'MP', lat: 22.7196, lng: 75.8577 },
  { name: 'Sendhwa', state: 'MP', lat: 21.6877, lng: 75.0935 },
  { name: 'Dhar', state: 'MP', lat: 22.6025, lng: 75.2997 },
  { name: 'Khargone', state: 'MP', lat: 21.8234, lng: 75.6117 },
  { name: 'Dhamnod', state: 'MP', lat: 22.2198, lng: 75.4674 },
  { name: 'Bhopal', state: 'MP', lat: 23.2599, lng: 77.4126 },
  { name: 'Ujjain', state: 'MP', lat: 23.1765, lng: 75.7885 },
  { name: 'Jaipur', state: 'RJ', lat: 26.9154, lng: 75.8189 },
  { name: 'Khandwa', state: 'MP', lat: 21.8291, lng: 76.3513 },
  { name: 'Burhanpur', state: 'MP', lat: 21.3109, lng: 76.2289 },
  { name: 'Ratlam', state: 'MP', lat: 23.3315, lng: 75.0367 },
  { name: 'Mandsaur', state: 'MP', lat: 24.0741, lng: 75.0677 },
  { name: 'Sendhwa', state: 'MP', lat: 21.6877, lng: 75.0935 },
  { name: 'Mumbai', state: 'MH', lat: 19.0760, lng: 72.8777 },
  { name: 'Pune', state: 'MH', lat: 18.5204, lng: 73.8567 },
  { name: 'Surat', state: 'GJ', lat: 21.1702, lng: 72.8311 },
  { name: 'Ahmedabad', state: 'GJ', lat: 23.0225, lng: 72.5714 },
  { name: 'Delhi', state: 'DL', lat: 28.6139, lng: 77.2090 },
];

// High-precision reverse geocode with village/town recognition
async function reverseGeocode(lat, lng) {
  // Local coordinate match guards for key regional villages
  if (Math.abs(lat - 22.184) < 0.04 && Math.abs(lng - 74.965) < 0.04) {
    return 'Bodhwada, Madhya Pradesh';
  }
  if (Math.abs(lat - 22.036) < 0.04 && Math.abs(lng - 75.005) < 0.04) {
    return 'Borlay, Madhya Pradesh';
  }
  if (Math.abs(lat - 22.233) < 0.04 && Math.abs(lng - 75.083) < 0.04) {
    return 'Manawar, Madhya Pradesh';
  }
  if (Math.abs(lat - 22.025) < 0.04 && Math.abs(lng - 74.896) < 0.04) {
    return 'Barwani, Madhya Pradesh';
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'SafarSetuApp/1.0 (support@safarsetu.in)' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const localName =
      addr.village ||
      addr.hamlet ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.city_district ||
      addr.town ||
      addr.city ||
      addr.road ||
      addr.county ||
      '';
    const state = addr.state || '';
    if (localName) {
      return state ? `${localName}, ${state}` : localName;
    }
    return data.display_name?.split(',').slice(0, 2).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export default function LocationPickerModal({ visible, onClose, onSelect, title = 'Select Location' }) {
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchingOnline, setSearchingOnline] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [pinCoords, setPinCoords] = useState(null); // { latitude, longitude }
  const [pinLabel, setPinLabel] = useState('');
  const [mapRegion, setMapRegion] = useState({
    latitude: 22.7196,
    longitude: 75.8577,
    latitudeDelta: 4,
    longitudeDelta: 4,
  });
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'map'
  const mapRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Reset state on open
  useEffect(() => {
    if (visible) {
      setSearchText('');
      setSuggestions(POPULAR_CITIES.slice(0, 8));
      setPinCoords(null);
      setPinLabel('');
      setActiveTab('search');
    }
  }, [visible]);

  // Live autosuggest search (Local + Backend / Photon)
  useEffect(() => {
    if (!searchText.trim()) {
      setSuggestions(POPULAR_CITIES.slice(0, 8));
      setSearchingOnline(false);
      return;
    }

    const q = searchText.trim().toLowerCase();

    // 1. Immediate local filtering
    const localMatches = POPULAR_CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
    );

    // Always include a custom option for whatever user typed
    const customOption = {
      name: searchText.trim(),
      state: 'Selected Name',
      lat: pinCoords?.latitude || 22.1842,
      lng: pinCoords?.longitude || 74.9654,
      isCustom: true,
    };

    setSuggestions(localMatches.length > 0 ? [customOption, ...localMatches] : [customOption]);

    // 2. Debounced online autosuggest query
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      setSearchingOnline(true);
      try {
        // Try backend maps search first
        let remoteResults = [];
        try {
          const res = await api.get(`/api/maps/search?q=${encodeURIComponent(searchText.trim())}`);
          if (Array.isArray(res.data) && res.data.length > 0) {
            remoteResults = res.data.map((r) => {
              const parts = r.name.split(',');
              return {
                name: parts[0]?.trim() || r.name,
                state: parts.slice(1).join(',').trim() || 'India',
                lat: r.lat,
                lng: r.lng,
              };
            });
          }
        } catch (apiErr) {
          // Direct Photon fallback
          const photonRes = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(searchText.trim())}&limit=6&lang=en`
          );
          if (photonRes.ok) {
            const photonData = await photonRes.json();
            remoteResults = (photonData?.features || []).map((f) => {
              const p = f.properties || {};
              const coords = f.geometry?.coordinates || [75.8, 22.7];
              return {
                name: p.name || searchText.trim(),
                state: [p.city, p.state, p.country].filter(Boolean).join(', ') || 'India',
                lat: coords[1],
                lng: coords[0],
              };
            });
          }
        }

        // Merge results avoiding duplicate names
        const merged = [customOption];
        const seen = new Set();
        seen.add(searchText.trim().toLowerCase());

        for (const loc of [...localMatches, ...remoteResults]) {
          const key = loc.name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(loc);
          }
        }

        setSuggestions(merged);
      } catch (err) {
        console.warn('Online autosuggest fallback:', err.message);
      } finally {
        setSearchingOnline(false);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchText]);

  // Get current GPS location
  const handleCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use current location.');
        setLoadingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      setLoadingGeocode(true);
      const label = await reverseGeocode(latitude, longitude);
      setLoadingGeocode(false);

      setPinCoords({ latitude, longitude });
      setPinLabel(label);
      setMapRegion({ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
      setActiveTab('map');
    } catch (e) {
      Alert.alert('Location Error', 'Could not fetch current location. Please try again.');
    } finally {
      setLoadingLocation(false);
      setLoadingGeocode(false);
    }
  };

  // Tap on map to set pin
  const handleMapPress = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setPinCoords({ latitude, longitude });
    setPinLabel('');
    setLoadingGeocode(true);
    const label = await reverseGeocode(latitude, longitude);
    setLoadingGeocode(false);
    setPinLabel(label);
  };

  // Select a city from suggestions list
  const handleCitySelect = (city) => {
    setPinCoords({ latitude: city.lat, longitude: city.lng });
    setPinLabel(`${city.name}, ${city.state}`);
    setMapRegion({
      latitude: city.lat,
      longitude: city.lng,
      latitudeDelta: 0.3,
      longitudeDelta: 0.3,
    });
    setActiveTab('map');
  };

  // Confirm selection and pass back to parent
  const handleConfirm = () => {
    if (!pinCoords || !pinLabel) {
      Alert.alert('No Location Selected', 'Please pick a city or tap on the map to select a location.');
      return;
    }
    onSelect(pinLabel, pinCoords.latitude, pinCoords.longitude);
    onClose();
  };

  const renderCityItem = ({ item }) => (
    <TouchableOpacity style={styles.cityItem} onPress={() => handleCitySelect(item)}>
      <Text style={styles.cityItemIcon}>📍</Text>
      <View style={styles.cityItemText}>
        <Text style={styles.cityName}>{item.name}</Text>
        <Text style={styles.cityState}>{item.state}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            style={[styles.confirmBtn, (!pinCoords || !pinLabel) && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmBtnText}>✓ Done</Text>
          </TouchableOpacity>
        </View>

        {/* ── TABS ── */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'search' && styles.activeTab]}
            onPress={() => setActiveTab('search')}
          >
            <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>🔍 Search City</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'map' && styles.activeTab]}
            onPress={() => setActiveTab('map')}
          >
            <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>🗺️ Pick on Map</Text>
          </TouchableOpacity>
        </View>

        {/* ── CURRENT LOCATION BUTTON ── */}
        <TouchableOpacity
          style={styles.currentLocBtn}
          onPress={handleCurrentLocation}
          disabled={loadingLocation}
        >
          {loadingLocation ? (
            <ActivityIndicator size="small" color={COLORS.primaryDark} />
          ) : (
            <Text style={styles.currentLocIcon}>📡</Text>
          )}
          <Text style={styles.currentLocText}>
            {loadingLocation ? 'Getting Location...' : 'Use My Current Location'}
          </Text>
        </TouchableOpacity>

        {/* ── SELECTED LOCATION CHIP (EDITABLE) ── */}
        {(pinCoords || pinLabel) ? (
          <View style={styles.selectedChip}>
            <Text style={styles.selectedChipIcon}>📍</Text>
            <View style={{ flex: 1, paddingVertical: 2 }}>
              <Text style={styles.selectedChipSubLabel}>SELECTED LOCATION (TAP TO EDIT)</Text>
              <TextInput
                style={styles.selectedChipInput}
                value={pinLabel}
                onChangeText={setPinLabel}
                placeholder="Type location name (e.g. Bodhwada, Borlay)"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            {loadingGeocode && (
              <ActivityIndicator size="small" color={COLORS.primaryDark} style={{ marginLeft: 6 }} />
            )}
          </View>
        ) : null}

        {/* ── SEARCH TAB ── */}
        {activeTab === 'search' && (
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Type city or village (e.g. Jaipur, Borlay...)"
                placeholderTextColor={COLORS.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
              {searchingOnline && (
                <ActivityIndicator size="small" color={COLORS.primaryDark} style={{ marginRight: 6 }} />
              )}
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Text style={styles.clearBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.name}
              renderItem={renderCityItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.cityList}
              ListEmptyComponent={
                <View style={styles.emptyCities}>
                  <Text style={styles.emptyCitiesText}>No cities found for "{searchText}"</Text>
                  <Text style={styles.emptyCitiesHint}>Try switching to Map tab to pin the location manually</Text>
                </View>
              }
            />
          </View>
        )}

        {/* ── MAP TAB ── */}
        {activeTab === 'map' && (
          <View style={styles.mapContainer}>
            <Text style={styles.mapHint}>Tap anywhere on map to drop a pin 📍</Text>
            <MapView
              ref={mapRef}
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              region={mapRegion}
              mapType="standard"
              onPress={handleMapPress}
              onRegionChangeComplete={setMapRegion}
            >
              <UrlTile
                urlTemplate="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                maximumZ={19}
                flipY={false}
                zIndex={1}
              />
              {pinCoords && (
                <Marker
                  coordinate={pinCoords}
                  title={pinLabel || 'Selected Location'}
                  pinColor={COLORS.primaryDark}
                />
              )}
            </MapView>

            {loadingGeocode && (
              <View style={styles.geocodeOverlay}>
                <ActivityIndicator color={COLORS.primaryDark} />
                <Text style={styles.geocodeText}>Finding location name...</Text>
              </View>
            )}
          </View>
        )}

        {/* ── CONFIRM BUTTON (Bottom) ── */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.confirmBtnLarge, (!pinCoords || !pinLabel || loadingGeocode) && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!pinCoords || !pinLabel || loadingGeocode}
          >
            <Text style={styles.confirmBtnLargeText}>
              {pinLabel ? `✓ CONFIRM — ${pinLabel}` : 'SELECT A LOCATION FIRST'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textMuted,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
  },
  confirmBtn: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmBtnDisabled: {
    backgroundColor: COLORS.border,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.card,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primaryDark,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  activeTabText: {
    color: COLORS.primaryDark,
  },
  currentLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 179, 75, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 75, 0.3)',
    borderRadius: 12,
    margin: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  currentLocIcon: {
    fontSize: 18,
  },
  currentLocText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    borderRadius: 10,
    marginHorizontal: 14,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  selectedChipIcon: {
    fontSize: 14,
  },
  selectedChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.success,
  },
  selectedChipSubLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  selectedChipInput: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    padding: 0,
    margin: 0,
  },
  // ── SEARCH TAB ──
  searchContainer: {
    flex: 1,
    paddingHorizontal: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    paddingVertical: 10,
  },
  clearBtn: {
    fontSize: 14,
    color: COLORS.textMuted,
    paddingHorizontal: 4,
    fontWeight: '900',
  },
  cityList: {
    paddingBottom: 20,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  cityItemIcon: {
    fontSize: 20,
  },
  cityItemText: {
    flex: 1,
  },
  cityName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  cityState: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyCities: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCitiesText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  emptyCitiesHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // ── MAP TAB ──
  mapContainer: {
    flex: 1,
  },
  mapHint: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  map: {
    flex: 1,
  },
  geocodeOverlay: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  geocodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  // ── BOTTOM BAR ──
  bottomBar: {
    padding: 16,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  confirmBtnLarge: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnLargeText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.card,
    letterSpacing: 0.3,
  },
});
