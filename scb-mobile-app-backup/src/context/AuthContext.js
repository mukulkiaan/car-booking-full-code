import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { registerForPushNotificationsAsync } from '../services/notificationClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (token) {
      registerForPushNotificationsAsync();
    }
  }, [token]);

  const loadStoredAuth = async () => {
    try {
      const stored = await AsyncStorage.getItem('authUser');
      if (stored) {
        const { user: storedUser, token: storedToken } = JSON.parse(stored);
        setUser(storedUser);
        setToken(storedToken);
      }
    } catch (e) {
      console.error('AuthContext: Failed to load auth user', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phone, password) => {
    try {
      const res = await api.post('/api/auth/login', { phone, password });
      const { user: loggedUser, token: loggedToken } = res.data;
      
      setUser(loggedUser);
      setToken(loggedToken);
      
      await AsyncStorage.setItem('authUser', JSON.stringify({ user: loggedUser, token: loggedToken }));
      return { success: true, user: loggedUser };
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please check credentials.';
      return { success: false, error: msg };
    }
  };

  const register = async (signUpData) => {
    try {
      const res = await api.post('/api/auth/register', signUpData);
      
      if (signUpData.role.toUpperCase() === 'CUSTOMER') {
        const { user: registeredUser, token: registeredToken } = res.data;
        setUser(registeredUser);
        setToken(registeredToken);
        await AsyncStorage.setItem('authUser', JSON.stringify({ user: registeredUser, token: registeredToken }));
        return { success: true, user: registeredUser };
      } else {
        // Driver registration responds with PENDING approval message
        return { 
          success: true, 
          pending: true, 
          message: res.data.message || 'Driver registered successfully. Pending approval.' 
        };
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed. Please check details.';
      return { success: false, error: msg };
    }
  };

  const sendOtp = async (phone) => {
    try {
      const res = await api.post('/api/auth/send-otp', { phone });
      return {
        success: true,
        message: res.data.message,
        otp: res.data.otp,
        channel: res.data.channel,
        isNewUser: res.data.isNewUser,
      };
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to send OTP. Please try again.';
      return { success: false, error: msg };
    }
  };

  const verifyOtp = async (phone, otp) => {
    try {
      const res = await api.post('/api/auth/verify-otp', { phone, otp });
      const { user: loggedUser, token: loggedToken, isNewUser } = res.data;

      setUser(loggedUser);
      setToken(loggedToken);

      await AsyncStorage.setItem('authUser', JSON.stringify({ user: loggedUser, token: loggedToken }));
      return { success: true, user: loggedUser, isNewUser };
    } catch (error) {
      const msg = error.response?.data?.message || 'Invalid OTP code.';
      return { success: false, error: msg };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await api.patch('/api/auth/profile', profileData);
      const updatedUser = res.data.user;

      setUser(updatedUser);
      const stored = await AsyncStorage.getItem('authUser');
      const currentToken = stored ? JSON.parse(stored).token : token;
      await AsyncStorage.setItem('authUser', JSON.stringify({ user: updatedUser, token: currentToken }));

      return { success: true, user: updatedUser, message: res.data.message };
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update profile.';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem('authUser');
    } catch (e) {
      console.error('AuthContext: Failed to clear auth user', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        sendOtp,
        verifyOtp,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
