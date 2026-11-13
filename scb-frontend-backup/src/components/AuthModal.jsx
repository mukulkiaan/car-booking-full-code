import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaLock, FaUser, FaPhone, FaMapMarkerAlt, FaCar, FaIdCard, FaCamera, FaEye, FaEyeSlash, FaCheckCircle, FaRedo } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

const AuthModal = ({ isOpen, onClose, onLogin, initialMode = 'login' }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');

  useEffect(() => {
    if (isOpen) {
      setIsLogin(initialMode === 'login');
      setOtpStep(1);
      setOtp('');
      setFormData((f) => ({ ...f, phone: '', password: '' }));
      // Clean up any rogue reCAPTCHA badges that may have been injected
      const badges = document.querySelectorAll('.grecaptcha-badge, iframe[src*="recaptcha"]');
      badges.forEach((el) => {
        const badgeParent = el.closest('.grecaptcha-badge') || el;
        badgeParent.style.display = 'none';
        badgeParent.remove();
      });
    }
  }, [isOpen, initialMode]);

  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('customer'); // Default to customer
  const [signupTab, setSignupTab] = useState('driver'); // Drivers sign up with vehicles

  // Customer OTP Flow States
  const [otpStep, setOtpStep] = useState(1); // 1 = Phone, 2 = OTP
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [otpChannel, setOtpChannel] = useState('');

  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    name: '',
    location: '',
    vehicleName: '',
    vehicleNumber: '',
    whatsapp: '',
    vehiclePhoto: null,
    licensePhoto: null,
  });

  const navigate = useNavigate();

  // Cooldown timer for OTP resend
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (isLogin) {
      setFormData((f) => ({ ...f, phone: '', password: '' }));
      if (role === 'customer') {
        setOtpStep(1);
        setOtp('');
      }
    }
  }, [role, isLogin]);

  if (!isOpen) return null;

  const handleFileUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // ── SEND CUSTOMER OTP (DIRECT WHATSAPP ENGINE & INSTANT DELIVERY) ──
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanPhone = formData.phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsOtpLoading(true);

    try {
      const res = await api('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanPhone }),
      });
      setOtpChannel(res.channel || '');
      setDemoOtp(res.otp || '');
      setConfirmationResult(null);
      setOtpStep(2);
      setResendTimer(30);

      if (res.channel === 'WHATSAPP') {
        toast.success('💬 WhatsApp par OTP bhej diya gaya hai! Apna WhatsApp check karein.', { duration: 6000 });
      } else {
        toast.success(res.message || `OTP code: ${res.otp}`, { duration: 6000 });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setIsOtpLoading(false);
    }
  };

  // ── VERIFY CUSTOMER OTP & AUTO-LOGIN ──
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp || otp.trim().length < 4) {
      toast.error('Please enter valid verification code');
      return;
    }

    setIsOtpLoading(true);
    const cleanPhone = formData.phone.replace(/\D/g, '').slice(-10);

    // 1. If Firebase Confirmation is active, confirm via Firebase
    if (confirmationResult) {
      try {
        await confirmationResult.confirm(otp.trim());
        const data = await api('/api/auth/firebase-login', {
          method: 'POST',
          body: JSON.stringify({ phone: cleanPhone }),
        });
        onLogin({ ...data.user, token: data.token });
        toast.success(`SMS Verified! Welcome, ${data.user.name}!`);
        onClose();
        navigate('/book');
        setIsOtpLoading(false);
        return;
      } catch (fbConfirmErr) {
        console.warn('Firebase code verification error, checking server code:', fbConfirmErr.message);
      }
    }

    // 2. Verify with Backend Strict OTP engine
    try {
      const data = await api('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: cleanPhone, otp: otp.trim() }),
      });

      onLogin({ ...data.user, token: data.token });
      toast.success(`Welcome back, ${data.user.name}!`);
      onClose();
      navigate('/book');
    } catch (err) {
      toast.error(err.message || 'Invalid verification code');
    } finally {
      setIsOtpLoading(false);
    }
  };

  // ── STANDARD ADMIN / DRIVER LOGIN & REGISTER ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (role === 'customer' && isLogin) {
      if (otpStep === 1) return handleSendOtp(e);
      else return handleVerifyOtp(e);
    }

    if (isLogin) {
      try {
        const data = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            phone: formData.phone.trim(),
            password: formData.password,
          }),
        });
        const loggedInRole = data.user?.role ? String(data.user.role).toLowerCase() : '';
        onLogin({ ...data.user, role: loggedInRole, token: data.token });
        toast.success(`Login Successful!`);
        onClose();

        if (loggedInRole === 'superadmin') navigate('/superadmin');
        else if (loggedInRole === 'admin') navigate('/admin');
        else if (loggedInRole === 'driver') navigate('/driver');
        else navigate('/book');
      } catch (err) {
        toast.error(err.message || 'Login failed');
      }
    } else {
      try {
        const res = await api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            phone: formData.phone,
            password: formData.password,
            name: formData.name,
            location: formData.location,
            role: signupTab,
            carType: formData.vehicleName,
            vehicleNumber: formData.vehicleNumber,
            vehiclePhotoUrl: formData.vehiclePhoto,
            licensePhotoUrl: formData.licensePhoto,
          }),
        });

        toast.success(`Registration submitted! Admin will verify soon.`);
        setIsLogin(true);
        setRole('driver');
      } catch (err) {
        toast.error(err.message || 'Registration failed');
      }
    }
  };

  const isCustomerLogin = isLogin && role === 'customer';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/95 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.97 }}
          className="glass-card w-full sm:max-w-lg p-5 sm:p-8 relative z-10 border-primary/20 shadow-xl rounded-t-[2rem] sm:rounded-[2rem] max-h-[95vh] overflow-y-auto custom-scrollbar"
        >
          <div className="w-10 h-1 bg-dark/20 rounded-full mx-auto mb-4 sm:hidden" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-muted hover:text-dark transition-colors p-2 bg-dark/5 rounded-xl border border-border"
          >
            <FaTimes />
          </button>


          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter mb-2 uppercase italic text-dark">
              {isCustomerLogin ? "Rider Login" : isLogin ? t('auth.login_title') : "Driver Registration"}
            </h2>
            <p className="text-muted text-sm font-bold">
              {isCustomerLogin
                ? (otpStep === 1 ? "Enter your mobile number to get instant OTP" : "Enter verification code sent to your phone")
                : isLogin
                ? t('auth.login_desc')
                : "Partner with SafarSetu & start earning daily"}
            </p>
          </div>

          {/* Role Pills (Login Mode) */}
          {isLogin ? (
            <div className="flex gap-2 mb-6 sm:mb-8 bg-dark/5 p-1.5 rounded-2xl border border-border overflow-x-auto custom-scrollbar">
              {['customer', 'driver'].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    setOtpStep(1);
                  }}
                  className={`flex-1 min-w-[75px] py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all ${
                    role === r
                      ? 'bg-primary text-dark shadow-lg shadow-primary/20'
                      : 'text-muted hover:text-dark'
                  }`}
                >
                  {r === 'customer' ? 'RIDER' : r}
                </button>
              ))}
            </div>
          ) : (
            <div className="mb-6 p-3 bg-primary/10 border border-primary/20 rounded-2xl text-center">
              <span className="text-xs font-black uppercase tracking-wider text-dark">Driver Partner Application</span>
            </div>
          )}

          {/* ── CUSTOMER OTP LOGIN FORM ── */}
          {isCustomerLogin ? (
            <div className="space-y-4">
              {otpStep === 1 ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark font-black text-sm">🇮🇳 +91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="Enter 10-digit mobile number"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                      className="input-field pl-20 text-base font-bold tracking-wider"
                      required
                      autoFocus
                      autoComplete="off"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isOtpLoading || formData.phone.length < 10}
                    className="w-full btn-primary py-4 uppercase font-black tracking-[0.15em] text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isOtpLoading ? "Sending OTP..." : "GET OTP 📲"}
                  </button>

                  <div className="p-3 bg-dark/5 border border-border rounded-xl text-center">
                    <p className="text-[11px] text-muted font-bold flex items-center justify-center gap-1.5">
                      <FaCheckCircle className="text-green-500 text-xs" /> No password needed. Instant login for verified rides.
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-muted">Mobile: <strong className="text-dark">+91 {formData.phone}</strong></span>
                    <button
                      type="button"
                      onClick={() => setOtpStep(1)}
                      className="text-[11px] font-black text-primary hover:underline uppercase"
                    >
                      Change Number
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="• • • •"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="input-field text-center text-3xl font-black tracking-[0.5em] py-3.5 bg-primary/5 border-primary/30 text-dark"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs px-1">
                    {otpChannel === 'WHATSAPP' ? (
                      <span className="text-green-600 font-black flex items-center gap-1">💬 OTP sent to your WhatsApp</span>
                    ) : demoOtp ? (
                      <span className="text-muted font-bold">Security OTP: <strong className="text-primary font-black tracking-widest text-sm">{demoOtp}</strong></span>
                    ) : (
                      <span className="text-muted font-bold">Enter 4-digit code</span>
                    )}
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={resendTimer > 0 || isOtpLoading}
                      className="text-primary font-black uppercase tracking-wider text-[11px] disabled:text-muted flex items-center gap-1"
                    >
                      <FaRedo className="text-[10px]" />
                      {resendTimer > 0 ? `Resend (${resendTimer}s)` : "Resend Code"}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isOtpLoading || otp.length < 4}
                    className="w-full btn-primary py-4 uppercase font-black tracking-[0.15em] text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isOtpLoading ? "Verifying..." : "VERIFY & LOGIN 🚀"}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* ── ADMIN / DRIVER FORM ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="relative">
                  <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field pl-12 text-sm"
                    required
                  />
                </div>
              )}

              <div className="relative">
                <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm" />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field pl-12 text-sm"
                  required
                  autoComplete="off"
                />
              </div>

              {!isLogin && (
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm" />
                  <input
                    type="text"
                    placeholder="City / Location (e.g. Barwani)"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input-field pl-12 text-sm"
                    required
                  />
                </div>
              )}

              {!isLogin && signupTab === 'driver' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <FaCar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm" />
                      <input
                        type="text"
                        placeholder="Vehicle Name (e.g. Swift)"
                        value={formData.vehicleName || ''}
                        onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
                        className="input-field pl-10 text-sm"
                        required
                      />
                    </div>
                    <div className="relative">
                      <FaCar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm" />
                      <input
                        type="text"
                        placeholder="Vehicle Number"
                        value={formData.vehicleNumber || ''}
                        onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                        className="input-field pl-10 text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="cursor-pointer group">
                      <div className="bg-dark/5 border border-dashed border-border rounded-2xl p-3 flex flex-col items-center justify-center gap-2 group-hover:border-primary/50 transition-all overflow-hidden relative h-20">
                        {formData.vehiclePhoto ? (
                          <img src={formData.vehiclePhoto} alt="Vehicle" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <>
                            <FaCamera className="text-muted group-hover:text-primary text-sm" />
                            <span className="text-[9px] text-muted font-bold uppercase text-center">Vehicle Photo</span>
                          </>
                        )}
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'vehiclePhoto')} />
                    </label>
                    <label className="cursor-pointer group">
                      <div className="bg-dark/5 border border-dashed border-border rounded-2xl p-3 flex flex-col items-center justify-center gap-2 group-hover:border-primary/50 transition-all overflow-hidden relative h-20">
                        {formData.licensePhoto ? (
                          <img src={formData.licensePhoto} alt="License" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <>
                            <FaIdCard className="text-muted group-hover:text-primary text-sm" />
                            <span className="text-[9px] text-muted font-bold uppercase text-center">License Photo</span>
                          </>
                        )}
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'licensePhoto')} />
                    </label>
                  </div>
                </>
              )}

              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field pl-12 pr-12 text-sm"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-dark focus:outline-none"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <button
                type="submit"
                className="w-full btn-primary py-4 mt-2 uppercase font-black tracking-[0.15em] text-sm shadow-lg shadow-primary/20"
              >
                {isLogin ? `LOGIN AS ${role.toUpperCase()}` : "SUBMIT DRIVER REGISTRATION"}
              </button>
            </form>
          )}

          {/* Footer toggle for Driver partner */}
          <div className="mt-6 text-center border-t border-border pt-5">
            {isLogin ? (
              role === 'driver' && (
                <p className="text-muted text-sm font-medium">
                  Want to register as Driver?
                  <button
                    onClick={() => {
                      setIsLogin(false);
                      setSignupTab('driver');
                    }}
                    className="text-primary font-black hover:underline ml-1 uppercase text-xs tracking-widest"
                  >
                    Register Here
                  </button>
                </p>
              )
            ) : (
              <p className="text-muted text-sm font-medium">
                Already registered?
                <button
                  onClick={() => setIsLogin(true)}
                  className="text-primary font-black hover:underline ml-1 uppercase text-xs tracking-widest"
                >
                  Back to Login
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;

