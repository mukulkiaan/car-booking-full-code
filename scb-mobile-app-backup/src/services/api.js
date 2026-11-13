import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 💡 CONNECTION OPTIONS:
// Live Production Backend (Render) - Works on ANY Wi-Fi or Mobile Data (Jio/Airtel):
const BASE_URL = 'https://safarsetubackend-18-10-26.onrender.com';

// Option 1: Physical Phone on same Wi-Fi (Use PC IP):
// const BASE_URL = 'http://192.168.1.23:4000';

// Option 2: Local Emulators
// const BASE_URL = 'http://10.0.2.2:4000';     // Android Emulator
// const BASE_URL = 'http://localhost:4000';    // iOS Simulator

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatic request interceptor to append JWT Bearer Token
api.interceptors.request.use(
  async (config) => {
    try {
      const authData = await AsyncStorage.getItem('authUser');
      if (authData) {
        const { token } = JSON.parse(authData);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('API Interceptor: Error reading token', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
