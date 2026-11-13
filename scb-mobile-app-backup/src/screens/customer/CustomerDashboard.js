import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import { COLORS } from '../../theme/colors';

const { width } = Dimensions.get('window');

export default function CustomerDashboard({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalRides: 0, totalSpent: 0, rating: '4.9/5', savedPlaces: 4 });
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const { user } = useContext(AuthContext);
  const { locale, changeLanguage, t } = useLanguage();

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get('/api/bookings');
      const data = res.data || [];
      const sorted = [...data].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (tb !== ta) return tb - ta;
        return String(b.id || '').localeCompare(String(a.id || ''));
      });
      setBookings(sorted);
      
      // Calculate dashboard stats dynamically
      const completed = data.filter((b) => b.status === 'Completed');
      const spent = completed.reduce((acc, curr) => acc + (curr.fare || 0), 0);
      setStats({
        totalRides: data.length,
        totalSpent: spent,
        rating: '4.9/5',
        savedPlaces: 4,
      });
    } catch (e) {
      console.error('CustomerDashboard: Failed to load bookings', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return COLORS.success;
      case 'Pending': return COLORS.warning;
      case 'Assigned':
      case 'Accepted': return COLORS.primaryDark;
      case 'Cancelled': return COLORS.danger;
      default: return COLORS.textMuted;
    }
  };

  const renderRecentItem = (ride) => (
    <TouchableOpacity
      key={ride.id}
      style={styles.recentCard}
      onPress={() => navigation.navigate('MyRides')}
    >
      <View style={styles.recentLeft}>
        <View style={styles.recentIconBox}>
          <Text style={styles.recentIcon}>🕒</Text>
        </View>
        <View style={styles.recentLocationWrapper}>
          <Text style={styles.recentLocation} numberOfLines={1}>
            {ride.drop}
          </Text>
          <Text style={styles.recentDate}>{ride.date || ride.bookingDate}</Text>
        </View>
      </View>
      <View style={styles.recentRight}>
        <Text style={styles.recentFare}>₹{ride.fare}</Text>
        <Text style={[styles.recentStatus, { color: getStatusColor(ride.status) }]}>
          {ride.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
      }
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ── TOP HEADER / BRAND & TOP-RIGHT CIRCULAR LANGUAGE BUTTON ── */}
      <View style={styles.topBarRow}>
        <View style={styles.brandRow}>
          <View style={styles.logoWrapperSmall}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImageSmall}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.brandTitleText}>SAFAR<Text style={{ color: COLORS.primaryDark }}>SETU</Text></Text>
            <Text style={styles.brandSubtitleText}>CAB & TRAVEL SERVICE</Text>
          </View>
        </View>

        {/* Top-Right Circular Language Button */}
        <View style={styles.langCircleContainer}>
          <TouchableOpacity
            style={styles.langCircleBtn}
            onPress={() => setShowLangDropdown(!showLangDropdown)}
            activeOpacity={0.8}
          >
            <Text style={styles.langCircleIcon}>🌐</Text>
            <Text style={styles.langCircleCode}>
              {locale === 'en' ? 'EN' : locale === 'hi' ? 'HI' : 'NIM'}
            </Text>
          </TouchableOpacity>

          {showLangDropdown && (
            <View style={styles.langCircleMenu}>
              {[
                { code: 'en', label: 'English', sub: 'English', icon: '🌐' },
                { code: 'hi', label: 'हिन्दी', sub: 'Hindi', icon: '🇮🇳' },
                { code: 'nimadi', label: 'निमाड़ी', sub: 'Nimadi', icon: '🌾' },
              ].map((item) => {
                const active = locale === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.langMenuItem, active && styles.langMenuItemActive]}
                    onPress={() => {
                      changeLanguage(item.code);
                      setShowLangDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.langMenuLabel, active && styles.langMenuLabelActive]}>
                        {item.label}
                      </Text>
                      <Text style={styles.langMenuSub}>{item.sub}</Text>
                    </View>
                    {active && <Text style={styles.langCheckmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* ── USER WELCOME / WALLET ROW ── */}
      <View style={styles.welcomeContainer}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.greetText}>
            {locale === 'nimadi' ? 'राम राम,' : locale === 'hi' ? 'नमस्ते,' : 'Welcome,'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={styles.userName}>{user?.name || 'Rider'}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.editProfileChip}
            >
              <Text style={styles.editProfileChipText}>✏️ {t('nav.settings') || 'Edit Profile'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.brandSubtitle}>
            {user?.location ? `📍 ${user.location}` : 'SAFAR SETU • 24/7 CAB SERVICE'}
          </Text>
        </View>
        
        {/* Wallet Display */}
        <View style={styles.walletCard}>
          <View style={styles.walletIconCircle}>
            <Text style={styles.walletIcon}>💳</Text>
          </View>
          <View>
            <Text style={styles.walletLabel}>
              {locale === 'nimadi' ? 'बटुओ' : locale === 'hi' ? 'वॉलेट राशि' : 'WALLET BALANCE'}
            </Text>
            <Text style={styles.walletValue}>₹2,450</Text>
          </View>
        </View>
      </View>

      {/* ── 4 STATS ROW (GRID) ── */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🚖</Text>
          <Text style={styles.statLabel}>
            {locale === 'nimadi' ? 'पूरी राइड' : locale === 'hi' ? 'कुल राइड' : 'TOTAL RIDES'}
          </Text>
          <Text style={styles.statValue}>{stats.totalRides}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>💰</Text>
          <Text style={styles.statLabel}>
            {locale === 'nimadi' ? 'कुल खर्चा' : locale === 'hi' ? 'कुल खर्च' : 'TOTAL SPENT'}
          </Text>
          <Text style={styles.statValue}>₹{stats.totalSpent}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>⭐</Text>
          <Text style={styles.statLabel}>
            {locale === 'nimadi' ? 'रेटिंग' : locale === 'hi' ? 'रेटिंग' : 'RIDER RATING'}
          </Text>
          <Text style={styles.statValue}>{stats.rating}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>📍</Text>
          <Text style={styles.statLabel}>
            {locale === 'nimadi' ? 'जगह' : locale === 'hi' ? 'स्थान' : 'SAVED PLACES'}
          </Text>
          <Text style={styles.statValue}>{stats.savedPlaces}</Text>
        </View>
      </View>

      {/* ── QUICK ACTIONS ── */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={styles.bookCta}
          onPress={() => navigation.navigate('BookRide')}
        >
          <View style={styles.ctaIconContainer}>
            <Text style={styles.ctaIcon}>🚗</Text>
          </View>
          <Text style={styles.ctaTitle}>
            {t('nav.book_ride') ? t('nav.book_ride').toUpperCase() : 'BOOK NEW RIDE'}
          </Text>
          <Text style={styles.ctaSubtitle}>
            {locale === 'nimadi' ? 'भरोसेमंद और साफ़ गाड़ियाँ' : locale === 'hi' ? 'सत्यापित ड्राइवर और सुरक्षित सफर' : 'Verified Professional Elite Drivers'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.supportCta}
          onPress={() => navigation.navigate('Support')}
        >
          <View style={styles.ctaIconContainerSecondary}>
            <Text style={styles.ctaIcon}>🎧</Text>
          </View>
          <Text style={styles.ctaTitleSecondary}>
            {t('nav.support') ? t('nav.support').toUpperCase() : 'LIVE SUPPORT'}
          </Text>
          <Text style={styles.ctaSubtitleSecondary}>
            {locale === 'nimadi' ? '24/7 पूरी मदद' : locale === 'hi' ? '24/7 तुरंत सहायता' : '24/7 Local Assistance'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── ACTIVE RIDE / DRIVER ASSIGNED NOTIFICATION CARD ── */}
      {(() => {
        const activeRide = bookings.find(b => b.status === 'Assigned' || b.status === 'Accepted' || b.status === 'Pending');
        if (!activeRide) return null;
        const hasDriver = !!activeRide.driver;
        return (
          <View style={styles.activeRideCard}>
            <View style={styles.activeRideHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[styles.activeDotPulse, { backgroundColor: hasDriver ? COLORS.success : '#F59E0B' }]} />
                <Text style={styles.activeRideStatusTitle} numberOfLines={1}>
                  {hasDriver ? '🚖 DRIVER ASSIGNED' : '⏳ LOOKING FOR DRIVER'}
                </Text>
              </View>
              <View style={[styles.activeRideBadge, { backgroundColor: hasDriver ? '#D1FAE5' : '#FEF3C7' }]}>
                <Text style={[styles.activeRideBadgeText, { color: hasDriver ? '#059669' : '#D97706' }]}>
                  {activeRide.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {hasDriver ? (
              <View style={styles.driverInfoRow}>
                <View style={styles.driverAvatarSmall}>
                  <Text style={{ fontSize: 18 }}>👨‍✈️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeDriverName}>{activeRide.driver.name}</Text>
                  <Text style={styles.activeDriverVehicle}>
                    {activeRide.driver.vehicleName || activeRide.car} • {activeRide.driver.vehicleNumber || 'MP-CAB'}
                  </Text>
                </View>
                <View style={styles.otpBoxMini}>
                  <Text style={styles.otpBoxMiniLabel}>RIDE OTP</Text>
                  <Text style={styles.otpBoxMiniCode}>{activeRide.otp || '4821'}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.findingDriverSub}>
                Your booking is registered. Admin is assigning your cab driver...
              </Text>
            )}

            <View style={styles.activeRouteRow}>
              <Text style={styles.activeRouteText} numberOfLines={1}>
                🟢 {activeRide.pickup} ➔ 🔴 {activeRide.drop}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.trackLiveBtn}
              onPress={() => navigation.navigate('LiveTracking', { bookingId: activeRide.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.trackLiveBtnText}>🗺️ TRACK LIVE ROUTE & DRIVER</Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* ── MAP PREVIEW (LAST TRIP) ── */}
      {bookings.length > 0 && (
        <View style={styles.mapPreviewCard}>
          <View style={styles.mapHeaderRow}>
            <View>
              <Text style={styles.mapHeadingLabel}>LAST TRIP TRACK</Text>
              <Text style={styles.mapHeadingText} numberOfLines={1}>
                {bookings[0].pickup} → {bookings[0].drop}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.trackMinBtn}
              onPress={() => navigation.navigate('MyRides')}
            >
              <Text style={styles.trackMinText}>VIEW DETAILS</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>🗺️ Interactive Route Map Preview</Text>
            <Text style={styles.mapPlaceholderSubText}>Distance: {bookings[0].distance || bookings[0].distanceKm || '0'} km • Fare: ₹{bookings[0].fare}</Text>
          </View>
        </View>
      )}

      {/* ── RECENT ACTIVITY LIST ── */}
      <View style={styles.recentSection}>
        <View style={styles.recentHeaderRow}>
          <Text style={styles.recentTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyRides')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No recent rides found.</Text>
            <TouchableOpacity
              style={styles.emptyBookBtn}
              onPress={() => navigation.navigate('BookRide')}
            >
              <Text style={styles.emptyBookBtnText}>Book Your First Ride</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recentList}>
            {bookings.slice(0, 4).map(renderRecentItem)}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    zIndex: 100,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoWrapperSmall: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImageSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  brandTitleText: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
  },
  brandSubtitleText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  langCircleContainer: {
    position: 'relative',
    alignItems: 'flex-end',
    zIndex: 100,
  },
  langCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  langCircleIcon: {
    fontSize: 18,
    lineHeight: 20,
  },
  langCircleCode: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  langCircleMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 6,
    minWidth: 160,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 200,
  },
  langMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  langMenuItemActive: {
    backgroundColor: COLORS.primary + '18',
  },
  langMenuLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  langMenuLabelActive: {
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  langMenuSub: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  langCheckmark: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primaryDark,
    marginLeft: 6,
  },
  welcomeContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '800',
  },
  userName: {
    fontSize: 24,
    fontWeight: '950',
    color: COLORS.text,
    lineHeight: 30,
  },
  editProfileChip: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  editProfileChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  walletCard: {
    backgroundColor: 'rgba(232, 179, 75, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(232, 179, 75, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletIcon: {
    fontSize: 14,
  },
  walletLabel: {
    fontSize: 7,
    fontWeight: '950',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  walletValue: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 18,
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 36 - 8) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statEmoji: {
    fontSize: 20,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '950',
    color: COLORS.text,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },
  bookCta: {
    flex: 1.2,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  supportCta: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ctaIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  ctaIconContainerSecondary: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  ctaIcon: {
    fontSize: 18,
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: '950',
    color: COLORS.white,
  },
  ctaSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 2,
  },
  ctaTitleSecondary: {
    fontSize: 14,
    fontWeight: '950',
    color: COLORS.text,
  },
  ctaSubtitleSecondary: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  activeRideCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primaryDark,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  activeRideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeRideStatusTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  activeRideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeRideBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  driverAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDriverName: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },
  activeDriverVehicle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  otpBoxMini: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  otpBoxMiniLabel: {
    fontSize: 7,
    fontWeight: '950',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  otpBoxMiniCode: {
    fontSize: 14,
    fontWeight: '950',
    color: '#92400E',
    letterSpacing: 2,
  },
  findingDriverSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  activeRouteRow: {
    backgroundColor: '#F9F7F3',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  activeRouteText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  trackLiveBtn: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  trackLiveBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  mapPreviewCard: {
    marginHorizontal: 24,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 24,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapHeadingLabel: {
    fontSize: 8,
    fontWeight: '950',
    color: COLORS.primaryDark,
    letterSpacing: 1,
  },
  mapHeadingText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
    maxWidth: width * 0.5,
    marginTop: 2,
  },
  trackMinBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  trackMinText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.text,
  },
  mapPlaceholder: {
    height: 120,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mapPlaceholderText: {
    fontSize: 13,
    fontWeight: '850',
    color: COLORS.text,
  },
  mapPlaceholderSubText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  recentSection: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '950',
    color: COLORS.text,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  recentList: {
    gap: 12,
  },
  recentCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  recentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(30,30,30,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentIcon: {
    fontSize: 16,
  },
  recentLocationWrapper: {
    flex: 1,
  },
  recentLocation: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },
  recentDate: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  recentRight: {
    alignItems: 'flex-end',
  },
  recentFare: {
    fontSize: 15,
    fontWeight: '950',
    color: COLORS.text,
  },
  recentStatus: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyBookBtn: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyBookBtnText: {
    color: COLORS.primaryDark,
    fontWeight: '900',
    fontSize: 12,
  },
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  langChip: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChipActive: {
    backgroundColor: COLORS.primary + '18',
    borderColor: COLORS.primaryDark,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  langChipTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '900',
  },
});
