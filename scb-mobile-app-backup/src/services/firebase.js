import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: "AIzaSyCguobt0m_moeLGOTM3YUVDc05ONGg30aI",
  authDomain: "safar-setu-ad76a.firebaseapp.com",
  projectId: "safar-setu-ad76a",
  storageBucket: "safar-setu-ad76a.firebasestorage.app",
  messagingSenderId: "270793148038",
  appId: "1:270793148038:web:0287c1b93ab2c44e57f307",
  measurementId: "G-B5R50C9DLB"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  auth = getApp().auth ? getApp().auth() : null;
}

export { app, auth };
export default app;
