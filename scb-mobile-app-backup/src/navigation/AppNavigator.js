import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme/colors';

// Auth Screens
import LandingScreen from '../screens/auth/LandingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Customer Screens
import CustomerDashboard from '../screens/customer/CustomerDashboard';
import BookRideScreen from '../screens/customer/BookRideScreen';
import MyRidesScreen from '../screens/customer/MyRidesScreen';
import SupportScreen from '../screens/customer/SupportScreen';
import LiveTrackingScreen from '../screens/customer/LiveTrackingScreen';
import AdminMapScreen from '../screens/admin/AdminMapScreen';

// Driver Screens
import DriverDashboard from '../screens/driver/DriverDashboard';
import DriverJobsScreen from '../screens/driver/DriverJobsScreen';
import DriverEarningsScreen from '../screens/driver/DriverEarningsScreen';
import DriverHistoryScreen from '../screens/driver/DriverHistoryScreen';

// Admin Screens
import AdminDashboard from '../screens/admin/AdminDashboard';

// Shared Screens
import ProfileScreen from '../screens/shared/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Icon Helper
const TabBarIcon = ({ text, focused }) => (
  <View style={styles.tabIconContainer}>
    <Text style={[styles.tabIcon, { color: focused ? COLORS.primaryDark : COLORS.textMuted }]}>
      {text}
    </Text>
  </View>
);

// ── PREMIUM TOP HEADER MENU BAR ──
function TopHeaderMenuBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  const activeRoute = state.routes[state.index];
  const activeOptions = descriptors[activeRoute.key]?.options || {};
  const activeTitle = activeOptions.title || activeOptions.tabBarLabel || activeRoute.name;

  return (
    <View style={[styles.headerWrapper, { paddingTop: Math.max(insets?.top || 0, StatusBar.currentHeight || 0) + 4 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} translucent={false} />

      {/* Header Brand & Active Screen Pill */}
      <View style={styles.headerTopRow}>
        <View style={styles.brandRow}>
          <Text style={styles.brandIcon}>🚖</Text>
          <Text style={styles.brandTitle}>SafarSetu</Text>
          {user?.role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user.role === 'customer' ? 'RIDER' : user.role.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.activePill}>
          <Text style={styles.activePillText} numberOfLines={1}>
            {activeTitle}
          </Text>
        </View>
      </View>

      {/* Header Menu Buttons Bar */}
      <View style={styles.tabsRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[
                styles.tabBtn,
                isFocused && styles.tabBtnActive,
              ]}
              activeOpacity={0.7}
            >
              {options.tabBarIcon ? (
                options.tabBarIcon({ focused: isFocused })
              ) : null}
              <Text
                style={[
                  styles.tabBtnText,
                  isFocused ? styles.tabBtnTextActive : styles.tabBtnTextInactive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {label}
              </Text>
              {isFocused && <View style={styles.tabActiveBar} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── CUSTOMER FLOW ──
function CustomerTabNavigator() {
  const { t, locale } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      tabBar={(props) => <TopHeaderMenuBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: 'top',
        sceneStyle: {
          backgroundColor: COLORS.background,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={CustomerDashboard}
        options={{
          title: 'SafarSetu',
          tabBarLabel: locale === 'nimadi' ? 'होम' : locale === 'hi' ? 'होम' : 'Home',
          tabBarIcon: ({ focused }) => <TabBarIcon text="🚖" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="BookRide"
        component={BookRideScreen}
        options={{
          title: t('nav.book_ride') || 'Book Ride',
          tabBarLabel: t('nav.book_ride') || 'Book Ride',
          tabBarIcon: ({ focused }) => <TabBarIcon text="📍" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MyRides"
        component={MyRidesScreen}
        options={{
          title: t('nav.my_rides') || 'My Rides',
          tabBarLabel: t('nav.my_rides') || 'My Rides',
          tabBarIcon: ({ focused }) => <TabBarIcon text="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{
          title: t('nav.support') || 'Support',
          tabBarLabel: t('nav.support') || 'Support',
          tabBarIcon: ({ focused }) => <TabBarIcon text="🎧" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: locale === 'nimadi' ? 'प्रोफ़ाइल' : locale === 'hi' ? 'प्रोफ़ाइल' : 'Profile',
          tabBarLabel: locale === 'nimadi' ? 'प्रोफ़ाइल' : locale === 'hi' ? 'प्रोफ़ाइल' : 'Profile',
          tabBarIcon: ({ focused }) => <TabBarIcon text="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const CustomerNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.card, borderBottomColor: COLORS.border },
      headerTintColor: COLORS.text,
      headerTitleStyle: { fontWeight: '900' },
    }}
  >
    <Stack.Screen
      name="CustomerHome"
      component={CustomerTabNavigator}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="LiveTracking"
      component={LiveTrackingScreen}
      options={{ title: 'Live Route View' }}
    />
  </Stack.Navigator>
);

// ── DRIVER FLOW ──
function DriverTabNavigator() {
  const { t, locale } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      tabBar={(props) => <TopHeaderMenuBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: 'top',
        sceneStyle: {
          backgroundColor: COLORS.background,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      }}
    >
      <Tab.Screen
        name="DriverHome"
        component={DriverDashboard}
        options={{
          title: 'Safar Driver',
          tabBarLabel: locale === 'nimadi' ? 'होम' : locale === 'hi' ? 'होम' : 'Home',
          tabBarIcon: ({ focused }) => <TabBarIcon text="🚖" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="My Jobs"
        component={DriverJobsScreen}
        options={{
          title: t('nav.my_jobs') || 'My Jobs',
          tabBarLabel: t('nav.my_jobs') || 'My Jobs',
          tabBarIcon: ({ focused }) => <TabBarIcon text="💼" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={DriverEarningsScreen}
        options={{
          title: t('nav.earnings') || 'Earnings',
          tabBarLabel: t('nav.earnings') || 'Earnings',
          tabBarIcon: ({ focused }) => <TabBarIcon text="💰" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={DriverHistoryScreen}
        options={{
          title: t('nav.history') || 'History',
          tabBarLabel: t('nav.history') || 'History',
          tabBarIcon: ({ focused }) => <TabBarIcon text="🕐" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: locale === 'nimadi' ? 'प्रोफ़ाइल' : locale === 'hi' ? 'प्रोफ़ाइल' : 'Profile',
          tabBarLabel: locale === 'nimadi' ? 'प्रोफ़ाइल' : locale === 'hi' ? 'प्रोफ़ाइल' : 'Profile',
          tabBarIcon: ({ focused }) => <TabBarIcon text="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const DriverNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.card, borderBottomColor: COLORS.border },
      headerTintColor: COLORS.text,
      headerTitleStyle: { fontWeight: '900' },
    }}
  >
    <Stack.Screen
      name="DriverHomeTabs"
      component={DriverTabNavigator}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="LiveTracking"
      component={LiveTrackingScreen}
      options={{ title: 'Live Route View' }}
    />
  </Stack.Navigator>
);

// ── ADMIN FLOW ──
function AdminTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      tabBar={(props) => <TopHeaderMenuBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: 'top',
        sceneStyle: {
          backgroundColor: COLORS.background,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      }}
    >
      <Tab.Screen
        name="AdminHome"
        component={AdminDashboard}
        options={{
          title: 'Admin Fleet',
          tabBarLabel: 'Fleet',
          tabBarIcon: ({ focused }) => <TabBarIcon text="⚙️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabBarIcon text="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const AdminNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.card, borderBottomColor: COLORS.border },
      headerTintColor: COLORS.text,
      headerTitleStyle: { fontWeight: '900' },
    }}
  >
    <Stack.Screen
      name="AdminHomeTabs"
      component={AdminTabNavigator}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="AdminMap"
      component={AdminMapScreen}
      options={{ title: 'Booking Map' }}
    />
  </Stack.Navigator>
);

// ── MAIN SWITCHER NAVIGATOR ──
export default function AppNavigator() {
  const { user, token } = useContext(AuthContext);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        // Auth Stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : (
        // Role-Based Authenticated Stack
        <>
          {(user?.role || '').toLowerCase() === 'customer' && (
            <Stack.Screen name="CustomerRoot" component={CustomerNavigator} />
          )}
          {(user?.role || '').toLowerCase() === 'driver' && (
            <Stack.Screen name="DriverRoot" component={DriverNavigator} />
          )}
          {((user?.role || '').toLowerCase() === 'admin' || (user?.role || '').toLowerCase() === 'superadmin') && (
            <Stack.Screen name="AdminRoot" component={AdminNavigator} />
          )}
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
  },
  headerWrapper: {
    backgroundColor: COLORS.card,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandIcon: {
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  roleBadge: {
    backgroundColor: 'rgba(217, 154, 54, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 154, 54, 0.35)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  roleBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  activePill: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    maxWidth: 140,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.text,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
    paddingBottom: 4,
    paddingTop: 2,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(217, 154, 54, 0.12)',
  },
  tabBtnText: {
    fontSize: 10.5,
    marginTop: 2,
    textAlign: 'center',
  },
  tabBtnTextActive: {
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  tabBtnTextInactive: {
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabActiveBar: {
    height: 2.5,
    width: '60%',
    backgroundColor: COLORS.primaryDark,
    borderRadius: 2,
    marginTop: 3,
  },
});
