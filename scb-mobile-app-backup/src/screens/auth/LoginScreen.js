import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { COLORS } from '../../theme/colors';

export default function LoginScreen({ navigation }) {
  const { locale, changeLanguage, t } = useLanguage();
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const LANGUAGES = [
    { code: 'en', label: 'English', sub: 'English', icon: '🌐' },
    { code: 'hi', label: 'हिन्दी', sub: 'Hindi', icon: '🇮🇳' },
    { code: 'nimadi', label: 'निमाड़ी', sub: 'Nimadi', icon: '🌾' },
  ];

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  // Tabs: 'rider' (Customer OTP) vs 'partner' (Driver/Admin Password)
  const [userType, setUserType] = useState('rider');

  // Customer OTP flow state
  const [riderPhone, setRiderPhone] = useState('');
  const [otpStep, setOtpStep] = useState('phone'); // 'phone' | 'otp'
  const [otp, setOtp] = useState('');
  const [sentOtpCode, setSentOtpCode] = useState('');
  const [otpChannel, setOtpChannel] = useState('');

  // Partner / Driver Password flow state
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerPassword, setPartnerPassword] = useState('');
  const [showPartnerPassword, setShowPartnerPassword] = useState(false);

  // Common status
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, sendOtp, verifyOtp } = useContext(AuthContext);

  // ── RIDER: Send OTP ──
  const handleSendOtp = async () => {
    setError('');
    const cleanDigits = riderPhone.replace(/\D/g, '').slice(-10);
    if (cleanDigits.length < 10) {
      setError(
        locale === 'nimadi'
          ? '10 अंकों को सही मोबाइल नंबर डालो।'
          : locale === 'hi'
          ? 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    const fullPhone = `+91${cleanDigits}`;
    setLoading(true);
    const res = await sendOtp(fullPhone);
    setLoading(false);

    if (res.success) {
      setSentOtpCode(res.otp || '');
      setOtpChannel(res.channel || '');
      if (res.channel === 'SCREEN_FALLBACK' && res.otp) {
        setOtp(res.otp);
      } else {
        setOtp('');
      }
      setOtpStep('otp');
    } else {
      setError(res.error || 'Failed to send OTP. Please try again.');
    }
  };

  // ── RIDER: Verify OTP & Auto-Login ──
  const handleVerifyOtp = async () => {
    setError('');
    if (!otp || otp.trim().length < 4) {
      setError(
        locale === 'nimadi'
          ? '4 अंकों को OTP कोड डालो।'
          : locale === 'hi'
          ? 'कृपया 4 अंकों का सत्यापन कोड दर्ज करें।'
          : 'Please enter the 4-digit verification code.'
      );
      return;
    }

    const cleanDigits = riderPhone.replace(/\D/g, '').slice(-10);
    const fullPhone = `+91${cleanDigits}`;
    setLoading(true);
    const res = await verifyOtp(fullPhone, otp.trim());
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Invalid OTP code. Please retry.');
    }
  };

  // ── DRIVER / ADMIN / SUPERADMIN: Password Login ──
  const handlePartnerLogin = async () => {
    setError('');
    if (!partnerPhone.trim() || !partnerPassword.trim()) {
      setError(
        locale === 'nimadi'
          ? 'फोन नंबर या आईडी और पासवर्ड दोनू डालो।'
          : locale === 'hi'
          ? 'कृपया मोबाइल नंबर और पासवर्ड दोनों दर्ज करें।'
          : 'Please enter both your registered ID/phone and password.'
      );
      return;
    }

    setLoading(true);
    const res = await login(partnerPhone.trim(), partnerPassword.trim());
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Invalid credentials. Please verify your ID and password.');
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
        {/* ── TOP RIGHT CIRCULAR LANGUAGE BUTTON ── */}
        <View style={styles.topBarRow}>
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
                {LANGUAGES.map((item) => {
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
                      <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                      <View style={{ flex: 1, marginLeft: 10 }}>
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

        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>SAFARSETU</Text>
          <Text style={styles.subtitle}>{t('hero.title') || 'Safe Rides from Villages to Cities'}</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Role Mode Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, userType === 'rider' && styles.activeTabButton]}
              onPress={() => {
                setUserType('rider');
                setError('');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, userType === 'rider' && styles.activeTabText]}>
                {locale === 'nimadi' ? '👤 ग्राहक (OTP)' : locale === 'hi' ? '👤 ग्राहक (OTP)' : '👤 RIDER (OTP)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, userType === 'partner' && styles.activeTabButton]}
              onPress={() => {
                setUserType('partner');
                setError('');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, userType === 'partner' && styles.activeTabText]}>
                {locale === 'nimadi' ? '🚖 ड्राइवर' : locale === 'hi' ? '🚖 ड्राइवर' : '🚖 DRIVER'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* ──────────────────────────────────────────────────────── */}
          {/* 1. RIDER OTP FLOW (DEFAULT - INSTANT LOGIN & AUTO-SIGNUP) */}
          {/* ──────────────────────────────────────────────────────── */}
          {userType === 'rider' && (
            <>
              {otpStep === 'phone' ? (
                <View>
                  <Text style={styles.formTitle}>
                    {locale === 'nimadi' ? 'सीधा ग्राहक लॉगिन' : locale === 'hi' ? 'तुरंत ग्राहक लॉगिन' : 'Instant Rider Login'}
                  </Text>
                  <Text style={styles.formSubtitle}>
                    {locale === 'nimadi'
                      ? 'आपणो फोन नंबर डालो, व्हाट्सएप्प पर कोड आवगो। पासवर्ड की जरूरत नी!'
                      : locale === 'hi'
                      ? 'अपना मोबाइल नंबर दर्ज करें, सुरक्षित WhatsApp OTP प्राप्त करें। किसी पासवर्ड की आवश्यकता नहीं!'
                      : 'Enter your phone number to receive a secure WhatsApp OTP. No password needed!'}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {locale === 'nimadi' ? 'मोबाइल नंबर' : locale === 'hi' ? 'मोबाइल नंबर' : 'MOBILE NUMBER'}
                    </Text>
                    <View style={styles.phoneInputRow}>
                      <View style={styles.countryCodeBadge}>
                        <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                      </View>
                      <TextInput
                        style={[styles.input, styles.phoneInput]}
                        placeholder="98765 43210"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={riderPhone}
                        onChangeText={(txt) => {
                          setRiderPhone(txt);
                          if (error) setError('');
                        }}
                      />
                    </View>
                  </View>

                  <View style={styles.infoBadge}>
                    <Text style={styles.infoBadgeText}>
                      {locale === 'nimadi'
                        ? '⚡ नया ग्राहक को खातो अपने आप बन जावेगो।'
                        : locale === 'hi'
                        ? '⚡ नए ग्राहकों का खाता सत्यापन के बाद स्वतः बन जाता है।'
                        : '⚡ New riders are registered automatically upon verification.'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleSendOtp}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.actionButtonText}>
                        {locale === 'nimadi' ? 'OTP मंगवाओ 📲' : locale === 'hi' ? 'OTP प्राप्त करें 📲' : 'GET OTP 📲'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.formTitle}>
                    {locale === 'nimadi' ? 'सत्यापन कोड डालो' : locale === 'hi' ? 'सत्यापन कोड दर्ज करें' : 'Enter Verification Code'}
                  </Text>
                  <Text style={styles.formSubtitle}>
                    {locale === 'nimadi'
                      ? `+91 ${riderPhone.replace(/\D/g, '').slice(-10)} पर 4 अंकों को OTP भेजो गयो छे`
                      : locale === 'hi'
                      ? `+91 ${riderPhone.replace(/\D/g, '').slice(-10)} पर 4 अंकों का OTP भेजा गया है`
                      : `4-digit OTP sent to +91 ${riderPhone.replace(/\D/g, '').slice(-10)}`}
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {locale === 'nimadi' ? '4 अंकों को OTP कोड' : locale === 'hi' ? '4 अंकों का OTP कोड' : '4-Digit OTP Code'}
                    </Text>
                    <TextInput
                      style={[styles.input, styles.otpInput]}
                      placeholder="• • • •"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="number-pad"
                      maxLength={4}
                      value={otp}
                      onChangeText={(txt) => {
                        setOtp(txt);
                        if (error) setError('');
                      }}
                      autoFocus
                    />
                  </View>

                  {/* Verification Notice */}
                  <View style={styles.demoBanner}>
                    <Text style={styles.demoBannerTitle}>
                      {otpChannel === 'WHATSAPP'
                        ? (locale === 'nimadi' ? '💬 व्हाट्सएप्प जांच' : locale === 'hi' ? '💬 व्हाट्सएप सत्यापन' : '💬 WHATSAPP VERIFICATION')
                        : (locale === 'nimadi' ? '🛡️ सुरक्षा कोड' : locale === 'hi' ? '🛡️ सुरक्षा सत्यापन कोड' : '🛡️ INSTANT VERIFICATION')}
                    </Text>
                    <Text style={[styles.demoBannerCode, { color: otpChannel === 'WHATSAPP' ? '#059669' : COLORS.primary, fontSize: 13 }]}>
                      {otpChannel === 'WHATSAPP'
                        ? (locale === 'nimadi'
                            ? `+91 ${riderPhone.replace(/\D/g, '').slice(-10)} पर व्हाट्सएप्प मैसेज देखो!`
                            : locale === 'hi'
                            ? `+91 ${riderPhone.replace(/\D/g, '').slice(-10)} पर अपना व्हाट्सएप संदेश देखें!`
                            : `OTP sent to your WhatsApp on +91 ${riderPhone.replace(/\D/g, '').slice(-10)}!`)
                        : (locale === 'nimadi'
                            ? `सत्यापन कोड: ${sentOtpCode}`
                            : locale === 'hi'
                            ? `सत्यापन कोड: ${sentOtpCode}`
                            : `Verification Code: ${sentOtpCode}`)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleVerifyOtp}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.actionButtonText}>
                        {locale === 'nimadi' ? 'जांच करो और आगे बढ़ो 🚀' : locale === 'hi' ? 'सत्यापित करें और आगे बढ़ें 🚀' : 'VERIFY & PROCEED 🚀'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.changePhoneRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setOtpStep('phone');
                        setOtp('');
                        setError('');
                      }}
                    >
                      <Text style={styles.changePhoneText}>
                        {locale === 'nimadi' ? '← नंबर बदलो' : locale === 'hi' ? '← नंबर बदलें' : '← Change Phone Number'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                      <Text style={styles.resendOtpText}>
                        {locale === 'nimadi' ? 'फिर से भेजो' : locale === 'hi' ? 'पुनः भेजें' : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}

          {/* ──────────────────────────────────────────────────────── */}
          {/* 2. DRIVER & ADMIN CREDENTIAL LOGIN                      */}
          {/* ──────────────────────────────────────────────────────── */}
          {userType === 'partner' && (
            <View>
              <Text style={styles.formTitle}>
                {locale === 'nimadi' ? 'ड्राइवर एवं एडमिन पोर्टल' : locale === 'hi' ? 'ड्राइवर एवं एडमिन पोर्टल' : 'Driver & Fleet Portal'}
              </Text>
              <Text style={styles.formSubtitle}>
                {locale === 'nimadi'
                  ? 'ड्राइवर साथी और एडमिन क्रेडेंशियल लॉगिन'
                  : locale === 'hi'
                  ? 'ड्राइवर पार्टनर एवं एडमिन क्रेडेंशियल लॉगिन'
                  : 'Driver Partner & Fleet Credential Login'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {locale === 'nimadi' ? 'रजिस्टर्ड फोन या आईडी' : locale === 'hi' ? 'पंजीकृत मोबाइल नंबर या आईडी' : 'REGISTERED PHONE OR ID'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="98765 43210"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  value={partnerPhone}
                  onChangeText={(t) => {
                    setPartnerPhone(t);
                    if (error) setError('');
                  }}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {locale === 'nimadi' ? 'पासवर्ड' : locale === 'hi' ? 'पासवर्ड' : 'PASSWORD'}
                </Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showPartnerPassword}
                    autoCapitalize="none"
                    value={partnerPassword}
                    onChangeText={(t) => {
                      setPartnerPassword(t);
                      if (error) setError('');
                    }}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPartnerPassword(!showPartnerPassword)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPartnerPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handlePartnerLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.actionButtonText}>
                    {locale === 'nimadi' ? 'लॉगिन करो' : locale === 'hi' ? 'लॉगिन करें' : 'SIGN IN / LOGIN'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>
                  {locale === 'nimadi' ? 'गाड़ी चलानी छे? ' : locale === 'hi' ? 'हमारे साथ गाड़ी चलाना चाहते हैं? ' : 'Want to drive with us? '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                  <Text style={styles.signupText}>
                    {locale === 'nimadi' ? 'ड्राइवर बनो' : locale === 'hi' ? 'ड्राइवर बनें' : 'Apply as Driver'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── ABOUT SAFARSETU & HOW IT WORKS SECTION ── */}
        <View style={styles.aboutContainer}>
          <View style={styles.aboutHeaderBadge}>
            <Text style={styles.aboutHeaderBadgeText}>🚖 {t('explainer.badge') || 'APNA SAFARSETU'}</Text>
          </View>
          <Text style={styles.aboutSectionTitle}>{t('explainer.title') || 'How SafarSetu Works'}</Text>
          <Text style={styles.aboutSectionSub}>
            {t('explainer.subtitle') || 'Affordable, reliable, and comfortable cab rides connecting villages and cities'}
          </Text>

          <View style={styles.featureGrid}>
            <View style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>📍</Text>
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>{t('explainer.step1_title') || '1. Select Location'}</Text>
                <Text style={styles.featureDesc}>
                  {t('explainer.step1_desc') || 'Choose your village, town, or city pickup and set your drop destination.'}
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>🚗</Text>
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>{t('explainer.step2_title') || '2. Choose Your Vehicle'}</Text>
                <Text style={styles.featureDesc}>
                  {t('explainer.step2_desc') || 'Van, Echo, Mini, Sedan, or SUV — view clear upfront pricing per kilometer.'}
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>⚡</Text>
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>{t('explainer.step3_title') || '3. Instant WhatsApp OTP'}</Text>
                <Text style={styles.featureDesc}>
                  {t('explainer.step3_desc') || 'No passwords needed! Simply enter your mobile number and verify via WhatsApp in seconds.'}
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>🛡️</Text>
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>{t('explainer.step4_title') || '4. Verified Local Drivers'}</Text>
                <Text style={styles.featureDesc}>
                  {t('explainer.step4_desc') || 'Admin-verified local drivers with live GPS route tracking for complete safety.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Value Badges */}
          <View style={styles.trustBadgesRow}>
            <View style={styles.trustBadge}>
              <Text style={styles.trustBadgeIcon}>⏱️</Text>
              <Text style={styles.trustBadgeText}>{t('explainer.badge_pickup') || '5-Min Pickup'}</Text>
            </View>
            <View style={styles.trustBadge}>
              <Text style={styles.trustBadgeIcon}>💰</Text>
              <Text style={styles.trustBadgeText}>{t('explainer.badge_fixed') || 'Fixed Rates'}</Text>
            </View>
            <View style={styles.trustBadge}>
              <Text style={styles.trustBadgeIcon}>💳</Text>
              <Text style={styles.trustBadgeText}>{t('explainer.badge_pay') || 'Cash or UPI'}</Text>
            </View>
            <View style={styles.trustBadge}>
              <Text style={styles.trustBadgeIcon}>📞</Text>
              <Text style={styles.trustBadgeText}>{t('explainer.badge_help') || '24x7 Help'}</Text>
            </View>
          </View>
        </View>
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
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
    paddingBottom: 40,
  },
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 100,
  },
  langCircleContainer: {
    position: 'relative',
    alignItems: 'flex-end',
    zIndex: 100,
  },
  langCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    top: 54,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 6,
    minWidth: 180,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
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
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoWrapper: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  logoImage: {
    width: 66,
    height: 66,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: COLORS.primaryDark,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: COLORS.white,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countryCodeBadge: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  passwordInputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 45,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 20,
    fontWeight: '900',
  },
  infoBadge: {
    backgroundColor: 'rgba(232, 179, 75, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 75, 0.25)',
  },
  infoBadgeText: {
    fontSize: 11,
    color: COLORS.primaryDark,
    textAlign: 'center',
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  demoBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  demoBannerTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  demoBannerCode: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  demoBannerSubText: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },
  changePhoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  changePhoneText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  resendOtpText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '900',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  signupText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '900',
  },

  // ── ABOUT SECTION STYLES ──
  aboutContainer: {
    marginTop: 26,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aboutHeaderBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(232, 179, 75, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 75, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 10,
  },
  aboutHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.8,
  },
  aboutSectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  aboutSectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 18,
  },
  featureGrid: {
    gap: 12,
    marginBottom: 18,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(232, 179, 75, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 20,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
    fontWeight: '600',
  },
  trustBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 5,
  },
  trustBadgeIcon: {
    fontSize: 12,
  },
  trustBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.text,
  },
});
