import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { COLORS } from '../../theme/colors';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useContext(AuthContext);
  const { locale, changeLanguage, t } = useLanguage();

  const [name, setName] = useState(user?.name || '');
  const [location, setLocation] = useState(user?.location || '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Synchronize when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setLocation(user.location || '');
      setWhatsapp(user.whatsapp || '');
    }
  }, [user]);

  const handleSave = async () => {
    setError('');
    setMessage('');

    if (!name.trim()) {
      setError('Please provide a valid name.');
      return;
    }

    setLoading(true);
    const res = await updateProfile({
      name: name.trim(),
      location: location.trim(),
      whatsapp: whatsapp.trim() || null,
    });
    setLoading(false);

    if (res.success) {
      setMessage('Profile saved successfully! ✨');
      setTimeout(() => setMessage(''), 4000);
    } else {
      setError(res.error || 'Failed to update profile.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── PROFILE HEADER CARD ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'SafarSetu Member'}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{(user?.role || 'CUSTOMER').toUpperCase()}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓ VERIFIED</Text>
            </View>
          </View>
        </View>

        {/* ── ACCOUNT IDENTITY CARD ── */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Registered Phone</Text>
            <Text style={styles.detailValue}>{user?.phone}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Account Status</Text>
            <Text style={[styles.detailValue, { color: COLORS.success }]}>Active & Protected</Text>
          </View>
        </View>

        {/* ── EDIT PROFILE CARD ── */}
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Edit Profile Info</Text>
            <Text style={styles.cardSubtitle}>
              Update your name and location for personalized ride booking
            </Text>
          </View>

          {message ? (
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>{message}</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={(txt) => {
                setName(txt);
                if (error) setError('');
              }}
            />
          </View>

          {/* Location / City */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Default City / Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Barwani, MP"
              placeholderTextColor={COLORS.textMuted}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* WhatsApp (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp Number (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={whatsapp}
              onChangeText={setWhatsapp}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveButtonText}>SAVE PROFILE CHANGES 💾</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── APP LANGUAGE SELECTOR ── */}
        <View style={styles.langCard}>
          <Text style={styles.langTitle}>🌐 APP LANGUAGE / भाषा / भासा</Text>
          <Text style={styles.langSubTitle}>Choose your preferred application language</Text>
          <View style={styles.langRow}>
            {[
              { code: 'en', label: 'English', icon: '🌐' },
              { code: 'hi', label: 'हिन्दी', icon: '🇮🇳' },
              { code: 'nimadi', label: 'निमाड़ी', icon: '🌾' },
            ].map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langChip, locale === l.code && styles.langChipActive]}
                onPress={() => changeLanguage(l.code)}
                activeOpacity={0.8}
              >
                <Text style={[styles.langChipText, locale === l.code && styles.langChipTextActive]}>
                  {l.icon} {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── LOGOUT TRIGGER ── */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>LOGOUT FROM ACCOUNT 🚪</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarText: {
    fontSize: 36,
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  roleBadge: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedBadgeText: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  detailsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '900',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
  },
  cardSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  successBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  successBadgeText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  langCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  langTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.8,
  },
  langSubTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 12,
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  langChipTextActive: {
    color: COLORS.white,
  },
  logoutButton: {
    backgroundColor: COLORS.danger + '12',
    borderWidth: 1,
    borderColor: COLORS.danger + '40',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
