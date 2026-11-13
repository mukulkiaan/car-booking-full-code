import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  RefreshControl,
} from 'react-native';
import api from '../../services/api';
import { COLORS } from '../../theme/colors';

export default function DriverEarningsScreen() {
  const [earningsData, setEarningsData] = useState({
    weeklyTotal: 18400,
    monthlyTotal: 72850,
    bonuses: 4200,
    tripsCompleted: 48,
    onlineHours: 36.5,
    rating: 4.95,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchEarnings = async () => {
    try {
      const res = await api.get('/api/bookings/driver-stats');
      if (res.data) {
        setEarningsData(prev => ({
          ...prev,
          weeklyTotal: res.data.weeklyEarnings || prev.weeklyTotal,
          monthlyTotal: res.data.monthlyEarnings || prev.monthlyTotal,
          tripsCompleted: res.data.tripsDone || prev.tripsCompleted,
          onlineHours: res.data.onlineHours || prev.onlineHours,
          rating: res.data.rating || prev.rating,
        }));
      }
    } catch (e) {
      // Fallback to current values
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarnings();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ── TOP HERO CARD ── */}
      <View style={styles.heroCard}>
        <View style={styles.iconCircle}>
          <Text style={styles.heroIcon}>💰</Text>
        </View>
        <Text style={styles.heroLabel}>TOTAL MONTHLY REVENUE</Text>
        <Text style={styles.heroAmount}>₹{earningsData.monthlyTotal}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>⭐ {earningsData.rating} Rating</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: COLORS.success + '15' }]}>
            <Text style={[styles.statusBadgeText, { color: COLORS.success }]}>ACTIVE PILOT</Text>
          </View>
        </View>
      </View>

      {/* ── STATS BREAKDOWN GRID ── */}
      <Text style={styles.sectionHeader}>Earnings Breakdown</Text>
      
      <View style={styles.gridContainer}>
        <View style={styles.gridCard}>
          <Text style={styles.gridEmoji}>📅</Text>
          <Text style={styles.gridLabel}>WEEKLY TOTAL</Text>
          <Text style={styles.gridValue}>₹{earningsData.weeklyTotal}</Text>
        </View>

        <View style={styles.gridCard}>
          <Text style={styles.gridEmoji}>🎁</Text>
          <Text style={styles.gridLabel}>BONUSES PAID</Text>
          <Text style={[styles.gridValue, { color: COLORS.success }]}>₹{earningsData.bonuses}</Text>
        </View>

        <View style={styles.gridCard}>
          <Text style={styles.gridEmoji}>🏁</Text>
          <Text style={styles.gridLabel}>TRIPS DONE</Text>
          <Text style={styles.gridValue}>{earningsData.tripsCompleted}</Text>
        </View>

        <View style={styles.gridCard}>
          <Text style={styles.gridEmoji}>⏱️</Text>
          <Text style={styles.gridLabel}>ONLINE HOURS</Text>
          <Text style={styles.gridValue}>{earningsData.onlineHours} hrs</Text>
        </View>
      </View>

      {/* ── TRIP SETTLEMENT & RIDE CONFIRMATION INFO ── */}
      <View style={styles.infoCard}>
        <Text style={styles.infoEmoji}>🤝</Text>
        <View style={styles.infoTextWrapper}>
          <Text style={styles.infoTitle}>Ride Settlement & Admin Assignment</Text>
          <Text style={styles.infoDesc}>
            Bookings appear when assigned by Admin. Rides are confirmed upon entering customer's ride OTP at destination. Fares are settled directly upon verified ride completion.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.02,
    shadowRadius: 15,
    elevation: 3,
    marginBottom: 28,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroIcon: {
    fontSize: 28,
  },
  heroLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '950',
    color: COLORS.text,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    backgroundColor: 'rgba(232, 179, 75, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 75, 0.2)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '950',
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    width: (Dimensions.get('window').width - 48 - 12) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridEmoji: {
    fontSize: 20,
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 18,
    fontWeight: '950',
    color: COLORS.text,
  },
  infoCard: {
    backgroundColor: 'rgba(232, 179, 75, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 75, 0.15)',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  infoEmoji: {
    fontSize: 20,
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    fontWeight: '500',
  },
});
