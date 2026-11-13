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
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { COLORS } from '../../theme/colors';

const FLEET_CATEGORIES = ['Van', 'Echo', 'Mini', 'Sedan', 'SUV'];

export default function SignupScreen({ navigation }) {
  const { t, locale, changeLanguage } = useLanguage();
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const LANGUAGES = [
    { code: 'en', label: 'English', sub: 'English', icon: '🌐' },
    { code: 'hi', label: 'हिन्दी', sub: 'Hindi', icon: '🇮🇳' },
    { code: 'nimadi', label: 'निमाड़ी', sub: 'Nimadi', icon: '🌾' },
  ];

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Barwani, Madhya Pradesh');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Driver fields (matching web app)
  const [carType, setCarType] = useState('Echo');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState('');
  const [licensePhoto, setLicensePhoto] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useContext(AuthContext);

  // Pick image from gallery/camera (matching web file upload)
  const pickImage = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          locale === 'nimadi' ? 'अनुमति चावे' : locale === 'hi' ? 'अनुमति आवश्यक' : 'Permission Needed',
          locale === 'nimadi' ? 'गैलरी की अनुमति देवो।' : locale === 'hi' ? 'कृपया गैलरी एक्सेस की अनुमति दें।' : 'Please allow gallery access to select vehicle or license photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.4,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        if (type === 'vehicle') {
          setVehiclePhoto(dataUri);
        } else {
          setLicensePhoto(dataUri);
        }
      }
    } catch (e) {
      console.warn('Image picker error:', e.message);
      Alert.alert('Upload Error', 'Could not pick image.');
    }
  };

  const handleSignup = async () => {
    setError('');
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setError(
        locale === 'nimadi'
          ? 'नाम, फोन नंबर और पासवर्ड डालना जरूरी छे।'
          : locale === 'hi'
          ? 'कृपया नाम, मोबाइल नंबर और पासवर्ड दर्ज करें।'
          : 'Please fill in your name, phone number, and password.'
      );
      return;
    }

    if (!vehicleNumber.trim()) {
      setError(
        locale === 'nimadi'
          ? 'गाड़ी को नंबर प्लेट डालो (उदा. MP 09 AB 1234)।'
          : locale === 'hi'
          ? 'कृपया अपनी गाड़ी की नंबर प्लेट दर्ज करें (उदा. MP 09 AB 1234)।'
          : 'Please enter your vehicle plate number (e.g. MP 09 AB 1234).'
      );
      return;
    }

    // Clean phone number (strip spaces/symbols)
    const cleanDigits = phone.replace(/\D/g, '');
    const cleanPhone = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

    if (cleanPhone.length < 10) {
      setError(
        locale === 'nimadi'
          ? '10 अंकों को सही मोबाइल नंबर डालो।'
          : locale === 'hi'
          ? 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    setLoading(true);
    const signUpData = {
      name: name.trim(),
      phone: cleanPhone,
      password: password.trim(),
      location: location.trim() || 'Barwani, Madhya Pradesh',
      role: 'DRIVER',
      carType: vehicleName.trim() || carType,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      vehiclePhotoUrl: vehiclePhoto.trim() || null,
      licensePhotoUrl: licensePhoto.trim() || null,
    };

    const result = await register(signUpData);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        locale === 'nimadi' ? 'आवेदन जमा हो गयो! 🎉' : locale === 'hi' ? 'आवेदन सफलतापूर्वक जमा हो गया! 🎉' : 'Application Submitted! 🎉',
        result.message || (locale === 'nimadi' ? 'ड्राइवर खातो बन गयो। एडमिन जांच करके चालू करेगा।' : locale === 'hi' ? 'आपका ड्राइवर पार्टनर आवेदन प्राप्त हो गया है। एडमिन द्वारा सत्यापन के बाद सक्रिय हो जाएगा।' : 'Your driver partner application has been registered successfully. SafarSetu admin will review and approve your vehicle details shortly.'),
        [{ text: locale === 'nimadi' ? 'लॉगिन करो' : locale === 'hi' ? 'लॉगिन पर जाएं' : 'PROCEED TO LOGIN', onPress: () => navigation.navigate('Login') }]
      );
    } else {
      setError(result.error || (locale === 'nimadi' ? 'आवेदन जमा नी हो पायो। विवरण जांचो।' : locale === 'hi' ? 'आवेदन जमा नहीं हो सका। कृपया विवरण जांचें।' : 'Failed to submit application. Please check your details.'));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
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

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>SAFARSETU</Text>
          <Text style={styles.subtitle}>
            {locale === 'nimadi' ? 'ड्राइवर पार्टनर खाता' : locale === 'hi' ? 'ड्राइवर पार्टनर पंजीकरण' : 'Driver Partner Registration'}
          </Text>
        </View>

        <View style={styles.formCard}>
          {/* Form Header Badge */}
          <View style={styles.badgeBanner}>
            <Text style={styles.badgeBannerText}>
              🚖 {locale === 'nimadi' ? 'ड्राइवर साथी आवेदन' : locale === 'hi' ? 'ड्राइवर पार्टनर आवेदन' : 'DRIVER PARTNER APPLICATION'}
            </Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Personal Info */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {locale === 'nimadi' ? 'पूरो नाम' : locale === 'hi' ? 'पूरा नाम' : 'FULL NAME'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (error) setError('');
              }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {locale === 'nimadi' ? 'मोबाइल नंबर' : locale === 'hi' ? 'मोबाइल नंबर' : 'PHONE NUMBER'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="98765 43210"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              autoCapitalize="none"
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                if (error) setError('');
              }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {locale === 'nimadi' ? 'शहर / गाँव' : locale === 'hi' ? 'शहर / स्थान' : 'CITY / LOCATION'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Barwani, MP"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
              value={location}
              onChangeText={setLocation}
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
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError('');
                }}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Vehicle & Documents Section (Web Style) */}
          <View style={styles.driverSection}>
            <Text style={styles.sectionTitle}>
              {locale === 'nimadi' ? 'गाड़ी और कागज़ात विवरण' : locale === 'hi' ? 'वाहन और दस्तावेज़ विवरण' : 'DRIVER DOCUMENTS & VEHICLE INFO'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {locale === 'nimadi' ? 'गाड़ी श्रेणी' : locale === 'hi' ? 'वाहन श्रेणी' : 'CAR CATEGORY'}
              </Text>
              <View style={styles.carTypeTabs}>
                {FLEET_CATEGORIES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.carTypeTab, carType === type && styles.activeCarTypeTab]}
                    onPress={() => setCarType(type)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.carTypeTabText,
                        carType === type && styles.activeCarTypeTabText,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {locale === 'nimadi' ? 'गाड़ी को नाम / मॉडल' : locale === 'hi' ? 'गाड़ी का नाम / मॉडल' : 'VEHICLE MODEL / NAME'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Maruti Dzire, Ertiga"
                placeholderTextColor={COLORS.textMuted}
                value={vehicleName}
                onChangeText={setVehicleName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {locale === 'nimadi' ? 'गाड़ी नंबर (प्लेट)' : locale === 'hi' ? 'वाहन नंबर (प्लेट)' : 'VEHICLE NUMBER (PLATE)'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MP 09 AB 1234"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                value={vehicleNumber}
                onChangeText={(t) => {
                  setVehicleNumber(t);
                  if (error) setError('');
                }}
              />
            </View>

            {/* ── PHOTO UPLOAD CARDS (MATCHING WEB APP) ── */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {locale === 'nimadi' ? 'गाड़ी और लाइसेंस फोटो' : locale === 'hi' ? 'वाहन और ड्राइविंग लाइसेंस फ़ोटो' : 'VEHICLE PHOTO & LICENSE UPLOAD'}
              </Text>
              <View style={styles.uploadRow}>
                {/* Vehicle Photo Box */}
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => pickImage('vehicle')}
                  activeOpacity={0.8}
                >
                  {vehiclePhoto ? (
                    <Image source={{ uri: vehiclePhoto }} style={styles.uploadPreview} resizeMode="cover" />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Text style={styles.uploadIcon}>📷</Text>
                      <Text style={styles.uploadBoxTitle}>
                        {locale === 'nimadi' ? 'गाड़ी फोटो' : locale === 'hi' ? 'वाहन फ़ोटो' : 'VEHICLE PHOTO'}
                      </Text>
                      <Text style={styles.uploadBoxSub}>
                        {locale === 'nimadi' ? 'चुनने के लिए दबाओ' : locale === 'hi' ? 'चुनने के लिए टैप करें' : 'Tap to Select'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Driver License Photo Box */}
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => pickImage('license')}
                  activeOpacity={0.8}
                >
                  {licensePhoto ? (
                    <Image source={{ uri: licensePhoto }} style={styles.uploadPreview} resizeMode="cover" />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Text style={styles.uploadIcon}>🪪</Text>
                      <Text style={styles.uploadBoxTitle}>
                        {locale === 'nimadi' ? 'लाइसेंस फोटो' : locale === 'hi' ? 'लाइसेंस फ़ोटो' : 'LICENSE PHOTO'}
                      </Text>
                      <Text style={styles.uploadBoxSub}>
                        {locale === 'nimadi' ? 'चुनने के लिए दबाओ' : locale === 'hi' ? 'चुनने के लिए टैप करें' : 'Tap to Select'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.signupButtonText}>
                {locale === 'nimadi' ? 'ड्राइवर बनो - आवेदन करो' : locale === 'hi' ? 'ड्राइवर के रूप में आवेदन करें' : 'APPLY AS DRIVER'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Footer Back to Login */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              {locale === 'nimadi' ? 'पैले से खाता छे? ' : locale === 'hi' ? 'पहले से खाता है? ' : 'Already registered as a driver? '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>
                {locale === 'nimadi' ? 'लॉगिन करो' : locale === 'hi' ? 'लॉगिन करें' : 'Login Here'}
              </Text>
            </TouchableOpacity>
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
    paddingTop: Platform.OS === 'ios' ? 40 : 24,
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
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  badgeBanner: {
    backgroundColor: 'rgba(232, 179, 75, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232, 179, 75, 0.35)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 18,
  },
  badgeBannerText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.8,
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
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
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
  driverSection: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.8,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  carTypeTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  carTypeTab: {
    flex: 1,
    minWidth: 55,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  activeCarTypeTab: {
    borderColor: COLORS.primaryDark,
    backgroundColor: 'rgba(232, 179, 75, 0.15)',
  },
  carTypeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  activeCarTypeTabText: {
    color: COLORS.primaryDark,
    fontWeight: '900',
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  uploadBox: {
    flex: 1,
    height: 96,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(232, 179, 75, 0.45)',
    backgroundColor: 'rgba(232, 179, 75, 0.05)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPreview: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  uploadIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  uploadBoxTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  uploadBoxSub: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  signupButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signupButtonText: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  loginText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '900',
  },
});
