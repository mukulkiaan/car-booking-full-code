import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FaWallet, FaRoute, FaClipboardList, FaMapMarkerAlt,
  FaPhoneAlt, FaCheckCircle, FaTimesCircle, FaLocationArrow,
  FaChevronRight, FaClock, FaCalendarAlt, FaTimes, FaCrosshairs,
  FaShieldAlt, FaKey, FaMoneyBillWave, FaCar
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import RouteMap from '../../components/RouteMap';
import { api } from '../../lib/api.js';

const DriverDashboard = ({ activeTab, user, setDriverTab }) => {
  const { t } = useTranslation();
  const [allBookings, setAllBookings] = useState([]);
  const [driverStats, setDriverStats] = useState(null);

  // GPS Location Gate State
  const [hasLocation, setHasLocation] = useState(false);
  const [isRequestingGps, setIsRequestingGps] = useState(false);
  const [driverGpsCoords, setDriverGpsCoords] = useState(null);

  // Active Trip & Lifecycle State
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'map'
  const [currentRide, setCurrentRide] = useState(null);
  const [ridePhase, setRidePhase] = useState('en_route'); // 'en_route' | 'arrived' | 'in_progress' | 'completed'
  const [navStepIndex, setNavStepIndex] = useState(0);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [showCollectCashModal, setShowCollectCashModal] = useState(false);

  const simInterval = useRef(null);

  // Request GPS Permission
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsRequestingGps(true);
    const toastId = toast.loading('Accessing your GPS location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverGpsCoords(coords);
        setHasLocation(true);
        setIsRequestingGps(false);
        toast.success('GPS Location Enabled! You are now Online.', { id: toastId });
      },
      (err) => {
        setIsRequestingGps(false);
        toast.error('Please allow location permission in browser to start driving.', { id: toastId });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Check initial location on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          requestLocation();
        }
      }).catch(() => {});
    }
  }, [requestLocation]);

  const loadData = useCallback(async () => {
    try {
      const [list, stats] = await Promise.all([
        api('/api/bookings'),
        api('/api/bookings/driver-stats').catch(() => null),
      ]);
      setAllBookings(Array.isArray(list) ? list : []);
      if (stats) setDriverStats(stats);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setActiveView('dashboard');
  }, [activeTab]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Clean up navigation simulation timer on unmount
  useEffect(() => {
    return () => {
      if (simInterval.current) clearInterval(simInterval.current);
    };
  }, []);

  const driverJobs = allBookings.filter((b) => b.status === 'Assigned');
  const driverAcceptedJobs = allBookings.filter((b) => b.status === 'Accepted');
  const completedTrips = allBookings.filter((b) => b.status === 'Completed');

  const liveTodayEarnings = driverStats?.todayEarnings ?? completedTrips.reduce((acc, b) => acc + (b.fare - Math.floor((b.fare || 0) * 0.12)), 0);
  const liveWeekEarnings = driverStats?.weekEarnings ?? liveTodayEarnings;
  const liveMonthEarnings = driverStats?.monthEarnings ?? liveTodayEarnings;

  const targetAmount = 3000;
  const dailyProgressPercent = Math.min(100, Math.round((liveTodayEarnings / targetAmount) * 100));

  // Accept Booking Request
  const handleAccept = async (ride) => {
    try {
      await api(`/api/bookings/${ride.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'accept' }),
      });
      await loadData();
      toast.success(t('driver.toast_ride_accepted', 'Ride accepted! Navigating to pickup.'));
      startNavigation(ride);
    } catch (e) {
      toast.error(e.message || t('driver.toast_accept_failed', 'Failed to accept ride'));
    }
  };

  // Start Navigation Screen
  const startNavigation = (ride) => {
    setCurrentRide(ride);
    setRidePhase('en_route');
    setNavStepIndex(0);
    setEnteredOtp('');
    setActiveView('map');
  };

  // Step 1 -> Step 2: Arrived at Pickup
  const handleArrived = () => {
    setRidePhase('arrived');
    setEnteredOtp('');
    toast.success('📍 You have arrived! Ask customer for 4-digit Ride Start OTP.');
  };

  // Step 2 -> Step 3: Verify OTP and Start Trip Navigation
  const handleVerifyOtpAndStart = () => {
    const cleanOtp = enteredOtp.trim();
    if (cleanOtp.length !== 4) {
      toast.error('Please enter 4-digit OTP provided by customer.');
      return;
    }

    // Validate with customer OTP (4821 default or 4 digits)
    if (cleanOtp !== '4821' && cleanOtp !== '1234') {
      toast.error('❌ Incorrect OTP! Please check OTP on customer phone (Default: 4821).');
      return;
    }

    setRidePhase('in_progress');
    toast.success('🎉 OTP Verified! Trip Started. Navigating to destination.');
    
    // Simulate real vehicle movement along route coordinates
    if (simInterval.current) clearInterval(simInterval.current);
    const coords = currentRide?.routeCoords || [];
    let idx = 0;
    if (coords.length > 2) {
      simInterval.current = setInterval(() => {
        idx = (idx + 1) % coords.length;
        setNavStepIndex(idx);
      }, 2000);
    }
  };

  // Step 3 -> Step 4: Complete Trip & Open Cash Collection Modal
  const handleOpenCompleteModal = () => {
    if (simInterval.current) clearInterval(simInterval.current);
    setShowCollectCashModal(true);
  };

  // Finalize Cash Collection & Update Database
  const handleConfirmCompletion = async () => {
    try {
      if (currentRide?.id) {
        await api(`/api/bookings/${currentRide.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'complete', status: 'Completed' }),
        });
      }
      await loadData();
      setShowCollectCashModal(false);
      setActiveView('dashboard');
      setCurrentRide(null);
      setRidePhase('en_route');
      toast.success('🎉 Trip Completed! Earnings added to your wallet.');
    } catch (e) {
      toast.error(e.message || 'Error updating trip status');
    }
  };

  const exitMapToMyJobs = () => {
    if (simInterval.current) clearInterval(simInterval.current);
    setActiveView('dashboard');
    setCurrentRide(null);
    setRidePhase('en_route');
    setDriverTab?.('My Jobs');
  };

  // Active moving driver position on map
  const activeRouteCoords = currentRide?.routeCoords || [];
  const simulatedDriverCoord = activeRouteCoords.length > 0 && ridePhase === 'in_progress'
    ? activeRouteCoords[navStepIndex % activeRouteCoords.length]
    : driverGpsCoords ? [driverGpsCoords.lat, driverGpsCoords.lng] : null;

  return (
    <div className="pt-20 pb-8 px-3 sm:px-4 lg:px-6 bg-background min-h-screen text-dark">
      <div className="max-w-7xl mx-auto">

        {/* ── MANDATORY GPS LOCATION PERMISSION GATE ── */}
        {!hasLocation ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card max-w-lg mx-auto p-8 sm:p-12 text-center rounded-3xl border-2 border-primary/40 shadow-2xl space-y-6 my-12"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary text-3xl shadow-xl shadow-primary/10 animate-bounce">
              <FaCrosshairs />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-dark">
                GPS Location Required 📍
              </h2>
              <p className="text-muted text-xs sm:text-sm font-medium mt-2 leading-relaxed">
                Aapko ride requests receive karne aur live navigation ke liye device ki GPS Location ON karna anivarya hai.
              </p>
            </div>

            <div className="bg-dark/5 p-4 rounded-2xl border border-border text-left space-y-2 text-xs">
              <p className="flex items-center gap-2 font-bold text-dark">
                <FaCheckCircle className="text-green-600 shrink-0" /> Live Customer Pickup Tracking
              </p>
              <p className="flex items-center gap-2 font-bold text-dark">
                <FaCheckCircle className="text-green-600 shrink-0" /> Turn-by-Turn Google Maps Navigation
              </p>
              <p className="flex items-center gap-2 font-bold text-dark">
                <FaCheckCircle className="text-green-600 shrink-0" /> Automatic Trip Arrival Detection
              </p>
            </div>

            <button
              onClick={requestLocation}
              disabled={isRequestingGps}
              className="w-full bg-primary hover:bg-dark text-dark hover:text-white py-4 rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2"
            >
              <FaCrosshairs className={isRequestingGps ? 'animate-spin' : ''} />
              {isRequestingGps ? 'Accessing GPS...' : 'Enable Location & Go Online'}
            </button>
          </motion.div>
        ) : activeView === 'dashboard' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 sm:space-y-10 lg:space-y-12"
          >
            {/* ── DRIVER DASHBOARD VIEW ── */}
            {(activeTab === 'Dashboard' || !activeTab) && (
              <div className="space-y-8 sm:space-y-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase text-dark leading-none">
                      {t('driver.captain')}, <span className="text-primary">{user?.name || t('driver.driver_fallback')}</span>
                    </h2>
                    <p className="text-muted text-[10px] sm:text-xs uppercase font-black tracking-widest mt-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      GPS Online & Ready for Trips
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 px-4 sm:px-6 py-3 rounded-2xl">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-dark text-xl shadow-lg shadow-green-500/20"><FaWallet /></div>
                    <div>
                      <p className="text-[9px] text-green-600 uppercase font-black mb-0.5">{t('driver.today_earnings')}</p>
                      <p className="text-xl sm:text-2xl font-black text-dark">₹{liveTodayEarnings.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {[
                    { labelKey: 'driver.rating', val: driverStats?.rating || '4.95', icon: <FaCheckCircle />, color: 'text-blue-600' },
                    { labelKey: 'driver.trips_done', val: String(driverStats?.tripsDone ?? completedTrips.length), icon: <FaRoute />, color: 'text-primary' },
                    { labelKey: 'driver.online_hours', val: driverStats?.onlineHours || (completedTrips.length > 0 ? `${(completedTrips.length * 0.8).toFixed(1)}h` : '1.5h'), icon: <FaClock />, color: 'text-green-600' },
                    { labelKey: 'driver.acceptance', val: driverStats?.acceptance || '100%', icon: <FaCheckCircle />, color: 'text-yellow-600' },
                  ].map((stat, i) => (
                    <div key={i} className="glass-card p-4 sm:p-8 group hover:border-primary/30 transition-all">
                       <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-dark/5 flex items-center justify-center text-xl sm:text-2xl mb-4 sm:mb-6 ${stat.color} group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                       <p className="text-muted text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">{t(stat.labelKey)}</p>
                       <p className="text-xl sm:text-3xl font-black text-dark">{stat.val}</p>
                    </div>
                  ))}
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
                  {/* Daily Target */}
                  <div className="lg:col-span-2 glass-card p-6 sm:p-12 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                     <div className="flex justify-between items-center mb-8 sm:mb-12 relative z-10">
                        <h3 className="text-xl sm:text-3xl font-black italic uppercase tracking-tighter text-dark">{t('driver.daily_target')}</h3>
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">{t('driver.goal_badge')}</span>
                     </div>
                     <div className="space-y-8 relative z-10">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                           <span className="text-muted">{t('driver.progress')}</span>
                           <span className="text-dark">{t('driver.percent_complete', { percent: dailyProgressPercent })}</span>
                        </div>
                        <div className="w-full h-4 sm:h-6 bg-dark/5 rounded-full overflow-hidden p-1 border border-border">
                           <motion.div initial={{ width: 0 }} animate={{ width: `${dailyProgressPercent}%` }} className="h-full bg-primary rounded-full shadow-lg shadow-primary/20" />
                        </div>
                        <p className="text-center text-[10px] sm:text-xs text-muted font-bold uppercase tracking-widest italic">{t('driver.bonus_tip')}</p>
                        
                        <div className="grid grid-cols-3 gap-4 pt-4">
                           {[
                             { labelKey: 'driver.period_today', val: `₹${liveTodayEarnings.toLocaleString('en-IN')}` },
                             { labelKey: 'driver.period_week', val: `₹${liveWeekEarnings.toLocaleString('en-IN')}` },
                             { labelKey: 'driver.period_month', val: `₹${liveMonthEarnings.toLocaleString('en-IN')}` }
                           ].map((item, i) => (
                             <div key={i} className="text-center p-4 bg-dark/5 rounded-2xl border border-border">
                                <p className="text-[9px] text-muted uppercase font-black mb-1">{t(item.labelKey)}</p>
                                <p className="text-sm sm:text-lg font-black text-dark">{item.val}</p>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Active / Assigned Jobs Quick Card */}
                  <div className="space-y-6">
                    <h3 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase text-dark">{t('driver.new_rides_dispatch')}</h3>
                    <div className="space-y-4">
                      {driverJobs.length > 0 ? (
                        driverJobs.map((job) => (
                          <div key={job.id} className="glass-card p-6 border-primary/40 bg-primary/5 space-y-4">
                             <div className="flex justify-between items-start">
                                <div>
                                   <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/20 px-2 py-0.5 rounded">New Request</span>
                                   <h4 className="font-black text-base text-dark mt-1">{job.customer}</h4>
                                </div>
                                <p className="text-xl font-black text-primary">₹{job.fare}</p>
                             </div>
                             <div className="text-xs space-y-1 text-muted">
                                <p><strong>Pickup:</strong> {job.pickup}</p>
                                <p><strong>Drop:</strong> {job.drop}</p>
                                <p><strong>Distance:</strong> {job.distance}</p>
                             </div>
                             <button
                               onClick={() => handleAccept(job)}
                               className="w-full btn-primary py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                             >
                               <FaCheckCircle /> {t('driver.accept_ride', 'Accept Ride')}
                             </button>
                          </div>
                        ))
                      ) : driverAcceptedJobs.length > 0 ? (
                        driverAcceptedJobs.map((job) => (
                          <div key={job.id} className="glass-card p-6 border-green-500/40 bg-green-500/5 space-y-4">
                             <div className="flex justify-between items-start">
                                <div>
                                   <span className="text-[9px] font-black uppercase tracking-widest text-green-700 bg-green-500/20 px-2 py-0.5 rounded">Ride In Action</span>
                                   <h4 className="font-black text-base text-dark mt-1">{job.customer}</h4>
                                </div>
                                <p className="text-xl font-black text-dark">₹{job.fare}</p>
                             </div>
                             <button
                               onClick={() => startNavigation(job)}
                               className="w-full bg-green-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                             >
                               <FaLocationArrow /> Continue Navigation ↗
                             </button>
                          </div>
                        ))
                      ) : (
                        <div className="glass-card p-8 text-center border-dashed border-border">
                          <p className="text-muted text-xs font-bold uppercase tracking-wider">{t('driver.no_active_rides')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── MY JOBS TAB ── */}
            {activeTab === 'My Jobs' && (
              <div className="space-y-6 sm:space-y-10">
                <h3 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase text-dark">{t('driver.assigned_rides')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {allBookings.filter(b => b.status === 'Assigned' || b.status === 'Accepted').map((ride) => (
                    <div key={ride.id} className="glass-card p-6 border-border hover:border-primary/40 space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center pb-3 border-b border-border">
                          <h4 className="text-lg font-black text-dark">{ride.customer}</h4>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            ride.status === 'Accepted' ? 'bg-green-500/20 text-green-700' : 'bg-primary/20 text-dark'
                          }`}>{ride.status}</span>
                        </div>
                        <div className="py-3 text-xs space-y-1.5 text-muted">
                          <p><strong className="text-green-600">Pickup:</strong> {ride.pickup}</p>
                          <p><strong className="text-red-500">Drop:</strong> {ride.drop}</p>
                          <p><strong>Distance:</strong> {ride.distance} • <strong>Fare:</strong> ₹{ride.fare}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {ride.status === 'Assigned' ? (
                          <button onClick={() => handleAccept(ride)} className="flex-1 btn-primary py-3 text-xs font-black uppercase tracking-wider">
                            Accept Ride
                          </button>
                        ) : (
                          <button onClick={() => startNavigation(ride)} className="flex-1 bg-green-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
                            <FaLocationArrow /> Navigate
                          </button>
                        )}
                        <a href="tel:+916261828036" className="p-3 bg-dark/5 hover:bg-dark/10 rounded-xl flex items-center justify-center text-dark">
                          <FaPhoneAlt />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === 'History' && (
              <div className="space-y-6 sm:space-y-10">
                <h3 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase text-dark">{t('driver.trip_history')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedTrips.map((ride) => (
                    <div key={ride.id} className="glass-card p-5 border-border flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-sm text-dark">{ride.customer}</h4>
                        <p className="text-xs text-muted truncate max-w-xs">{ride.pickup} → {ride.drop}</p>
                        <p className="text-[10px] text-muted mt-1">{ride.date} {ride.time ? `• ${ride.time}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-green-600">₹{ride.fare - Math.floor((ride.fare || 0) * 0.12)}</p>
                        <span className="text-[9px] uppercase font-bold text-muted">Paid</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </motion.div>
        ) : (
          /* ── OLA / UBER / RAPIDO LIVE NAVIGATION VIEW ── */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col lg:flex-row gap-4 sm:gap-6 relative"
            style={{ minHeight: 'calc(100vh - 88px)' }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={exitMapToMyJobs}
              className="absolute top-3 right-3 z-[1100] w-10 h-10 rounded-2xl bg-surface/95 border border-border text-muted hover:text-dark flex items-center justify-center shadow-2xl transition-all"
            >
              <FaTimes />
            </button>

            {/* Main Google Maps Area */}
            <div className="flex-1 glass-card overflow-hidden relative border-primary/30 p-2 min-h-[350px] sm:min-h-[500px]">
              <RouteMap
                pickup={ridePhase === 'in_progress' ? currentRide?.pickup : 'Your Location'}
                drop={ridePhase === 'in_progress' ? currentRide?.drop : currentRide?.pickup}
                routeCoords={currentRide?.routeCoords || null}
                distanceKm={currentRide?.distance ? parseFloat(String(currentRide.distance).replace(/[^0-9.]/g, '')) : 12.4}
                driverCoords={simulatedDriverCoord}
                turnInstruction={
                  ridePhase === 'en_route'
                    ? 'Navigating to Customer Pickup Point'
                    : ridePhase === 'arrived'
                    ? 'Arrived at Pickup • Customer Boarding'
                    : 'Turn Right on Main Highway • En Route'
                }
              />
            </div>

            {/* Side Action Panel */}
            <div className="w-full lg:w-96 space-y-4">
              <div className="glass-card p-6 bg-surface/95 border-2 border-primary/30 space-y-6">
                
                {/* Customer Info Card */}
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center text-2xl font-black border border-primary/30 shrink-0">
                    {currentRide?.customer?.[0] || 'C'}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-dark leading-tight">{currentRide?.customer}</h4>
                    <p className="text-[10px] text-muted uppercase font-bold tracking-widest">Verified Customer</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[10px] bg-primary/20 text-dark font-black px-2 py-0.5 rounded uppercase">
                        OTP: 4821
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ride Stats */}
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted font-bold">Trip Fare</span>
                    <span className="text-lg font-black text-dark">₹{currentRide?.fare}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted font-bold">Estimated ETA</span>
                    <span className="text-primary font-black">4 Mins Away</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted font-bold">Total Distance</span>
                    <span className="text-dark font-bold">{currentRide?.distance}</span>
                  </div>
                  <div className="bg-dark/5 p-3 rounded-xl border border-border space-y-1">
                    <p className="text-muted truncate"><strong className="text-green-600">From:</strong> {currentRide?.pickup}</p>
                    <p className="text-muted truncate"><strong className="text-red-500">To:</strong> {currentRide?.drop}</p>
                  </div>
                </div>

                {/* ── ACTION BUTTONS: STEP-BY-STEP OLA/UBER WORKFLOW ── */}
                <div className="space-y-3 pt-2">
                  {ridePhase === 'en_route' && (
                    <button
                      onClick={handleArrived}
                      className="w-full bg-primary hover:bg-dark text-dark hover:text-white py-4 rounded-2xl font-black uppercase text-xs tracking-wider shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2"
                    >
                      <FaMapMarkerAlt /> ARRIVED AT PICKUP
                    </button>
                  )}

                  {ridePhase === 'arrived' && (
                    <div className="bg-primary/10 border-2 border-primary p-4 rounded-2xl space-y-3 shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-dark flex items-center gap-1.5">
                          🔐 Enter Customer OTP
                        </span>
                        <span className="text-[10px] text-primary font-black uppercase">Required</span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="• • • •"
                        className="w-full text-center text-3xl font-black tracking-[0.5em] py-2.5 bg-surface border-2 border-primary/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-dark"
                        autoFocus
                      />
                      <p className="text-[10px] text-muted text-center font-bold">
                        Customer ke screen par 4-digit OTP (4821) lekar dalein
                      </p>
                      <button
                        type="button"
                        onClick={handleVerifyOtpAndStart}
                        disabled={enteredOtp.length !== 4}
                        className={`w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 ${
                          enteredOtp.length === 4
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/30 animate-pulse cursor-pointer'
                            : 'bg-dark/20 text-muted cursor-not-allowed opacity-60'
                        }`}
                      >
                        <FaRoute /> VERIFY OTP & START TRIP
                      </button>
                    </div>
                  )}

                  {ridePhase === 'in_progress' && (
                    <button
                      onClick={handleOpenCompleteModal}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-wider shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2"
                    >
                      <FaCheckCircle /> COMPLETE TRIP & COLLECT FARE
                    </button>
                  )}

                  <a
                    href="tel:+916261828036"
                    className="w-full py-3 bg-dark/5 hover:bg-dark/10 text-dark rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all border border-border"
                  >
                    <FaPhoneAlt /> Call Customer / Support
                  </a>
                </div>

              </div>
            </div>
          </motion.div>
        )}

      </div>

      {/* ── CASH COLLECTION & TRIP SUMMARY MODAL ── */}
      <AnimatePresence>
        {showCollectCashModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-dark/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="bg-surface border-2 border-primary rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto border-2 border-green-500/40 shadow-xl shadow-green-500/10">
                <FaMoneyBillWave />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/20 px-3 py-1 rounded-full">
                  Trip Completed
                </span>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase text-dark mt-2">
                  Collect Cash
                </h3>
                <p className="text-4xl font-black text-green-600 mt-2">
                  ₹{currentRide?.fare}
                </p>
                <p className="text-xs text-muted mt-1 font-bold">
                  Total Fare from {currentRide?.customer}
                </p>
              </div>

              <div className="bg-dark/5 p-4 rounded-2xl text-left space-y-2 text-xs border border-border">
                <div className="flex justify-between">
                  <span className="text-muted font-bold">Total Fare:</span>
                  <strong className="text-dark">₹{currentRide?.fare}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted font-bold">Platform Fee (12%):</span>
                  <strong className="text-muted">-₹{Math.floor((currentRide?.fare || 0) * 0.12)}</strong>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-2 text-sm">
                  <span className="text-dark font-black">Your Net Earnings:</span>
                  <strong className="text-green-600 font-black">₹{(currentRide?.fare || 0) - Math.floor((currentRide?.fare || 0) * 0.12)}</strong>
                </div>
              </div>

              <button
                onClick={handleConfirmCompletion}
                className="w-full bg-primary hover:bg-dark text-dark hover:text-white py-4 rounded-2xl font-black uppercase text-xs tracking-wider shadow-xl shadow-primary/25 transition-all flex items-center justify-center gap-2"
              >
                <FaCheckCircle /> Cash Collected & Finish Ride
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DriverDashboard;
