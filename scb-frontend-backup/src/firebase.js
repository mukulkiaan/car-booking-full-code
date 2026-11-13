import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// SafarSetu Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCguobt0m_moeLGOTM3YUVDc05ONGg30aI",
  authDomain: "safar-setu-ad76a.firebaseapp.com",
  projectId: "safar-setu-ad76a",
  storageBucket: "safar-setu-ad76a.firebasestorage.app",
  messagingSenderId: "270793148038",
  appId: "1:270793148038:web:0287c1b93ab2c44e57f307",
  measurementId: "G-B5R50C9DLB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
