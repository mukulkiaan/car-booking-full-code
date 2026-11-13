import { Platform } from 'react-native';
import api from './api';

let Notifications = null;
try {
  Notifications = require('expo-notifications');
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (err) {
  console.warn('⚠️ Notifications native module not available in this runtime (e.g. Expo Go). Push notifications active on standalone APK.');
}

/**
 * Request notification permissions and register Expo Push Token with backend
 */
export async function registerForPushNotificationsAsync() {
  if (!Notifications || !Notifications.getPermissionsAsync) {
    console.log('Push notifications skipped: native module not available in current runtime.');
    return null;
  }

  let token = null;

  try {
    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync('safarsetu_default', {
        name: 'SafarSetu Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D99A36',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    token = tokenData.data;

    // Save token to SafarSetu backend
    if (token) {
      try {
        await api.post('/api/auth/save-push-token', { token });
        console.log('✅ SafarSetu Push Token registered with backend:', token);
      } catch (err) {
        console.warn('Could not sync push token with backend:', err.message);
      }
    }
  } catch (error) {
    console.warn('Push notification registration warning:', error.message);
  }

  return token;
}
