import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  FaThLarge, FaCar, FaUsers, FaMoneyBillWave, FaClock, 
  FaCheckCircle, FaTimesCircle, FaMapMarkedAlt, FaChevronRight,
  FaPhoneAlt, FaUserTie, FaWallet, FaChartBar, FaUserCircle, FaCreditCard, 
  FaArrowUp, FaArrowDown, FaEye, FaEdit, FaTrash, FaPlus, FaMapMarkerAlt, FaLock, FaImage, FaIdCard, FaCamera, FaCalendarAlt, FaRoute,
  FaPercentage, FaSlidersH
} from 'react-icons/fa';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import RouteMap from '../../components/RouteMap';
import AdminListToolbar from '../../components/admin/AdminListToolbar';
import { api } from '../../lib/api.js';

function matchQuery(query, ...fields) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => String(f ?? '').toLowerCase().includes(q));
}

const CUSTOMER_FILTER_OPTIONS = [
  { value: 'all', labelKey: 'admin.filter_all' },
  { value: 'has_rides', labelKey: 'admin.filter_has_rides' },
  { value: 'no_rides', labelKey: 'admin.filter_no_rides' },
  { value: 'high_spent', labelKey: 'admin.filter_high_spent' },
];

const DRIVER_FILTER_OPTIONS = [
  { value: 'all', labelKey: 'admin.filter_all' },
  { value: 'available', labelKey: 'admin.filter_available' },
  { value: 'busy', labelKey: 'admin.filter_busy' },
  { value: 'pending', labelKey: 'admin.filter_pending_approval' },
  { value: 'approved', labelKey: 'admin.filter_approved' },
  { value: 'rejected', labelKey: 'admin.filter_rejected' },
];

const CAR_FILTER_OPTIONS = [
  { value: 'all', labelKey: 'admin.filter_all' },
  { value: 'rate_low', labelKey: 'admin.filter_rate_low' },
  { value: 'rate_high', labelKey: 'admin.filter_rate_high' },
  { value: 'seats_4', labelKey: 'admin.filter_seats_4' },
  { value: 'seats_6_plus', labelKey: 'admin.filter_seats_6_plus' },
];

function parseKm(distanceStr) {
  if (!distanceStr) return null;
  return parseFloat(String(distanceStr).replace(/[^0-9.]/g, '')) || null;
}

const AdminDashboard = ({ activeTab }) => {
  const { t } = useTranslation();

  const translateStatus = (status) => {
    const map = {
      Completed: 'admin.status_completed',
      Pending: 'admin.status_pending',
      Assigned: 'admin.status_assigned',
      Accepted: 'admin.status_accepted',
      Cancelled: 'admin.status_cancelled',
      Available: 'admin.status_available',
      Busy: 'admin.status_busy',
      Approved: 'admin.status_approved',
      Rejected: 'admin.status_rejected',
    };
    return map[status] ? t(map[status]) : status;
  };

  const [dashboardStats, setDashboardStats] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showBookingEditModal, setShowBookingEditModal] = useState(false);
  const [showCreateBookingModal, setShowCreateBookingModal] = useState(false);
  const [newBookingForm, setNewBookingForm] = useState({ customer: '', phone: '', pickup: '', drop: '', car: 'Mini', date: '', time: '', fare: '' });
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [adminCars, setAdminCars] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showCarModal, setShowCarModal] = useState(false);
  const [carForm, setCarForm] = useState({ id: null, name: '', type: '', pricePerKm: '', seats: '', eta: '', image: null, commissionPercent: 12 });
  const [bulkCommissions, setBulkCommissions] = useState({});
  const [isSavingBulkComm, setIsSavingBulkComm] = useState(false);
  const [allBookings, setAllBookings] = useState([]);

  // App Settings (QR Code, UPI, Helpline)
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [upiId, setUpiId] = useState('9755339783@upi');
  const [advanceAmount, setAdvanceAmount] = useState('200');
  const [helpline1, setHelpline1] = useState('6261828036');
  const [helpline2, setHelpline2] = useState('9755339783');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const revenueData = useMemo(() => {
    if (dashboardStats?.revenueData?.length) {
      const dayMap = {
        Mon: t('admin.day_mon'),
        Tue: t('admin.day_tue'),
        Wed: t('admin.day_wed'),
        Thu: t('admin.day_thu'),
        Fri: t('admin.day_fri'),
        Sat: t('admin.day_sat'),
        Sun: t('admin.day_sun'),
      };
      return dashboardStats.revenueData.map((item) => ({
        ...item,
        name: dayMap[item.name] || item.name,
      }));
    }
    return [
      { name: t('admin.day_mon'), revenue: 0, commission: 0, driverPay: 0 },
      { name: t('admin.day_tue'), revenue: 0, commission: 0, driverPay: 0 },
      { name: t('admin.day_wed'), revenue: 0, commission: 0, driverPay: 0 },
      { name: t('admin.day_thu'), revenue: 0, commission: 0, driverPay: 0 },
      { name: t('admin.day_fri'), revenue: 0, commission: 0, driverPay: 0 },
      { name: t('admin.day_sat'), revenue: 0, commission: 0, driverPay: 0 },
      { name: t('admin.day_sun'), revenue: 0, commission: 0, driverPay: 0 },
    ];
  }, [dashboardStats, t]);

  const pieData = useMemo(() => {
    if (dashboardStats?.pieData?.length) {
      const nameMap = {
        Completed: t('admin.pie_completed'),
        Pending: t('admin.pie_pending'),
        Cancelled: t('admin.pie_cancelled'),
      };
      return dashboardStats.pieData.map((p) => ({
        ...p,
        name: nameMap[p.name] || p.name,
      }));
    }
    return [
      { name: t('admin.pie_completed'), value: 0, color: '#22c55e' },
      { name: t('admin.pie_pending'), value: 0, color: '#eab308' },
      { name: t('admin.pie_cancelled'), value: 0, color: '#ef4444' },
    ];
  }, [dashboardStats, t]);

  const operationalMetrics = useMemo(() => {
    return dashboardStats?.operationalMetrics || [
      { labelKey: 'admin.booking_success_rate', val: '100%', color: 'bg-green-500' },
      { labelKey: 'admin.driver_response_time', val: '2.5m', color: 'bg-primary' },
      { labelKey: 'admin.customer_satisfaction', val: '5.0/5', color: 'bg-blue-500' },
      { labelKey: 'admin.fleet_utilization', val: '0%', color: 'bg-red-500' },
    ];
  }, [dashboardStats]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [driverSearch, setDriverSearch] = useState('');
  const [driverFilter, setDriverFilter] = useState('all');
  const [carSearch, setCarSearch] = useState('');
  const [carFilter, setCarFilter] = useState('all');

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!matchQuery(customerSearch, c.name, c.phone, c.location)) return false;
      if (customerFilter === 'has_rides') return (c.totalRides ?? 0) > 0;
      if (customerFilter === 'no_rides') return (c.totalRides ?? 0) === 0;
      if (customerFilter === 'high_spent') return (c.spent ?? 0) >= 500;
      return true;
    });
  }, [customers, customerSearch, customerFilter]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      if (!matchQuery(driverSearch, d.name, d.phone, d.location, d.carType, d.vehicleNumber)) return false;
      if (driverFilter === 'available') return d.status === 'Available';
      if (driverFilter === 'busy') return d.status === 'Busy';
      if (driverFilter === 'pending') return d.approvalStatus === 'Pending';
      if (driverFilter === 'approved') return d.approvalStatus === 'Approved';
      if (driverFilter === 'rejected') return d.approvalStatus === 'Rejected';
      return true;
    });
  }, [drivers, driverSearch, driverFilter]);

  const filteredCars = useMemo(() => {
    return adminCars.filter((car) => {
      if (!matchQuery(carSearch, car.name, car.type)) return false;
      const rate = Number(car.pricePerKm) || 0;
      const seats = Number(car.seats) || 0;
      if (carFilter === 'rate_low') return rate > 0 && rate < 15;
      if (carFilter === 'rate_high') return rate >= 15;
      if (carFilter === 'seats_4') return seats === 4;
      if (carFilter === 'seats_6_plus') return seats >= 6;
      return true;
    });
  }, [adminCars, carSearch, carFilter]);

  const handleFileUpload = (e, field, setter = setDriverForm) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter((prev) => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const loadAll = async () => {
    try {
      const [bookings, d, c, carsData, pay, statsData] = await Promise.all([
        api('/api/bookings'),
        api('/api/admin/drivers'),
        api('/api/admin/customers'),
        api('/api/admin/cars'),
        api('/api/admin/payments'),
        api('/api/admin/dashboard-stats').catch(() => null),
      ]);
      setAllBookings(Array.isArray(bookings) ? bookings : []);
      setDrivers(Array.isArray(d) ? d : []);
      setCustomers(Array.isArray(c) ? c : []);
      setAdminCars(Array.isArray(carsData) ? carsData : []);
      if (Array.isArray(carsData)) {
        setBulkCommissions(prev => {
          const next = { ...prev };
          carsData.forEach(c => {
            if (next[c.id] === undefined) next[c.id] = c.commissionPercent ?? 12;
          });
          return next;
        });
      }
      setPayments(Array.isArray(pay) ? pay : []);
      if (statsData) setDashboardStats(statsData);
    } catch (e) {
      toast.error(e.message || 'Failed to load admin data');
    }
  };

  // Fetch settings once on mount so polling doesn't overwrite admin's inputs
  useEffect(() => {
    api('/api/admin/settings').then(s => {
      if (s) {
        setQrCodeUrl(s.qrCodeUrl || '');
        setUpiId(s.upiId || '9755339783@upi');
        setAdvanceAmount(String(s.advanceAmount ?? '200'));
        setHelpline1(s.helpline1 || '6261828036');
        setHelpline2(s.helpline2 || '9755339783');
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 15000);
    return () => clearInterval(t);
  }, []);

  const handleQrImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 600;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setQrCodeUrl(compressedDataUrl);
          toast.success('QR Code image selected and optimized!');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      const res = await api('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          qrCodeUrl: qrCodeUrl ? qrCodeUrl.trim() : null,
          upiId: upiId ? upiId.trim() : '9755339783@upi',
          advanceAmount: parseFloat(advanceAmount) || 200,
          helpline1: helpline1 ? helpline1.trim() : '6261828036',
          helpline2: helpline2 ? helpline2.trim() : '9755339783',
        }),
      });
      if (res?.settings) {
        setQrCodeUrl(res.settings.qrCodeUrl || '');
        setUpiId(res.settings.upiId || '9755339783@upi');
        setAdvanceAmount(String(res.settings.advanceAmount ?? '200'));
        setHelpline1(res.settings.helpline1 || '6261828036');
        setHelpline2(res.settings.helpline2 || '9755339783');
      }
      toast.success('Admin QR Code & Helpline settings saved successfully!');
    } catch (err) {
      toast.error('Failed to save settings: ' + (err.message || 'Error'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const [bookingForm, setBookingForm] = useState({ pickup: '', drop: '', fare: '', date: '', time: '' });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentEntity, setCurrentEntity] = useState(null);
  
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', location: '', password: '' });
  const [driverForm, setDriverForm] = useState({ 
    name: '', phone: '', location: '', vehicleName: '', vehicleNumber: '', 
    vehiclePhoto: null, licenseFront: null, licenseBack: null, password: '' 
  });

  const carCommissionMap = useMemo(() => {
    const map = {};
    adminCars.forEach((c) => {
      const rate = Number(c.commissionPercent ?? 12);
      if (c.name) map[c.name.trim().toLowerCase()] = rate;
      if (c.type) map[c.type.trim().toLowerCase()] = rate;
    });
    return map;
  }, [adminCars]);

  const getCarCommissionRate = (carName) => {
    if (!carName) return 12;
    return carCommissionMap[String(carName).trim().toLowerCase()] ?? 12;
  };

  const totalCommissionsNum = dashboardStats?.totalCommissions ?? allBookings.filter(b => b.status === 'Completed').reduce((sum, b) => {
    const rate = getCarCommissionRate(b.carName);
    return sum + Math.floor((b.fare || 0) * (rate / 100));
  }, 0);
  const walletBalanceNum = dashboardStats?.walletBalance ?? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const driverPayoutsNum = dashboardStats?.driverPayouts ?? allBookings.filter(b => b.status === 'Completed').reduce((sum, b) => {
    const rate = getCarCommissionRate(b.carName);
    const comm = Math.floor((b.fare || 0) * (rate / 100));
    return sum + ((b.fare || 0) - comm);
  }, 0);

  const stats = [
    { label: t('nav.bookings'), value: dashboardStats?.totalBookings ?? allBookings.length, icon: <FaClock />, color: "text-blue-500", trend: "+100%" },
    { label: t('admin.driver_approvals'), value: dashboardStats?.approvedDrivers ?? drivers.filter(d => d.approvalStatus === 'Approved').length, icon: <FaCar />, color: "text-yellow-500", trend: "+Live" },
    { label: t('admin.total_commissions'), value: `₹${totalCommissionsNum.toLocaleString('en-IN')}`, icon: <FaWallet />, color: "text-primary", trend: "+Live" },
    { label: t('admin.wallet_balance'), value: `₹${walletBalanceNum.toLocaleString('en-IN')}`, icon: <FaMoneyBillWave />, color: "text-green-500", trend: "+Live" },
  ];

  const handleApproveDriver = async (id) => {
    try {
      await api(`/api/admin/drivers/${id}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      await loadAll();
      toast.success('Driver Approved Successfully!');
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  const handleRejectDriver = async (id) => {
    try {
      await api(`/api/admin/drivers/${id}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      await loadAll();
      toast.error('Driver Registration Rejected');
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  const handleDeleteDriver = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await api(`/api/admin/drivers/${id}`, { method: 'DELETE' });
      await loadAll();
      toast.error(`Driver ${name} removed.`);
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  const handleDriverModal = (mode, driver = null) => {
    setModalMode(mode);
    setCurrentEntity(driver);
    if (driver) {
      setDriverForm({
        name: driver.name,
        phone: driver.phone,
        location: driver.location,
        vehicleName: driver.carType,
        vehicleNumber: driver.vehicleNumber,
        vehiclePhoto: driver.vehiclePhoto,
        licensePhoto: driver.licensePhoto,
        password: driver.password || '',
      });
    } else {
      setDriverForm({
        name: '',
        phone: '',
        location: '',
        vehicleName: '',
        vehicleNumber: '',
        vehiclePhoto: null,
        licensePhoto: null,
        password: '',
      });
    }
    setShowDriverModal(true);
  };

  const handleSaveDriver = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        await api('/api/admin/drivers', {
          method: 'POST',
          body: JSON.stringify({
            name: driverForm.name,
            phone: driverForm.phone,
            location: driverForm.location,
            vehicleName: driverForm.vehicleName,
            vehicleNumber: driverForm.vehicleNumber,
            password: driverForm.password || 'driver123',
            vehiclePhotoUrl: driverForm.vehiclePhoto,
            licensePhotoUrl: driverForm.licensePhoto,
          }),
        });
        toast.success('Driver Registered Successfully!');
      } else if (modalMode === 'edit' && currentEntity) {
        await api(`/api/admin/drivers/${currentEntity.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: driverForm.name,
            phone: driverForm.phone,
            location: driverForm.location,
            vehicleName: driverForm.vehicleName,
            vehicleNumber: driverForm.vehicleNumber,
            ...(driverForm.password ? { password: driverForm.password } : {}),
            ...(driverForm.vehiclePhoto ? { vehiclePhotoUrl: driverForm.vehiclePhoto } : {}),
            ...(driverForm.licensePhoto ? { licensePhotoUrl: driverForm.licensePhoto } : {}),
          }),
        });
        toast.success('Driver Profile Updated!');
      }
      await loadAll();
      setShowDriverModal(false);
    } catch (err) {
      toast.error(err.message || 'Save failed');
    }
  };

  const handleDeleteCustomer = async (id, name, phone) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await api(`/api/admin/customers/${id}`, { method: 'DELETE' });
      await loadAll();
      toast.error(`Customer ${name} deleted.`);
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  const handleCustomerModal = (mode, customer = null) => {
    setModalMode(mode);
    setCurrentEntity(customer);
    if (customer) { setCustomerForm({ name: customer.name, phone: customer.phone, location: customer.location, password: customer.password || '' }); }
    else { setCustomerForm({ name: '', phone: '', location: '', password: '' }); }
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        await api('/api/admin/customers', {
          method: 'POST',
          body: JSON.stringify({
            name: customerForm.name,
            phone: customerForm.phone,
            location: customerForm.location,
            password: customerForm.password || 'user123',
          }),
        });
        toast.success('Customer Added Successfully!');
      } else if (modalMode === 'edit' && currentEntity) {
        await api(`/api/admin/customers/${currentEntity.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: customerForm.name,
            phone: customerForm.phone,
            location: customerForm.location,
            ...(customerForm.password ? { password: customerForm.password } : {}),
          }),
        });
        toast.success('Customer Updated Successfully!');
      }
      await loadAll();
      setShowCustomerModal(false);
    } catch (err) {
      toast.error(err.message || 'Save failed');
    }
  };

  const handleAssignDriver = async (driver) => {
    try {
      await api(`/api/bookings/${selectedBooking.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ driverId: driver.id }),
      });
      await loadAll();
      toast.success(`Assigned ${driver.name} to ${selectedBooking.customer}`);
      setShowAssignModal(false);
    } catch (e) {
      toast.error(e.message || 'Assign failed');
    }
  };

  const handleCancelBooking = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking request?')) return;
    try {
      await api(`/api/bookings/${id}`, { method: 'DELETE' });
      await loadAll();
      toast.error('Booking Cancelled');
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  const handleEditBooking = (booking) => {
    setSelectedBooking(booking);
    setBookingForm({
      pickup: booking.pickup,
      drop: booking.drop,
      fare: booking.fare,
      date: booking.date,
      time: booking.time,
      driverId: booking.driverUserId || '',
      driverName: booking.driver?.name || '',
      vehicleName: booking.driver?.vehicleName || '',
      vehicleNumber: booking.driver?.vehicleNumber || '',
    });
    setShowBookingEditModal(true);
  };

  const handleSaveBooking = async (e) => {
    e.preventDefault();
    try {
      const body = {
        pickup: bookingForm.pickup,
        drop: bookingForm.drop,
        fare: Number(bookingForm.fare),
        date: bookingForm.date,
        time: bookingForm.time,
      };
      if (bookingForm.driverId) body.driverId = bookingForm.driverId;
      await api(`/api/bookings/${selectedBooking.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      await loadAll();
      toast.success('Booking Details Updated!');
      setShowBookingEditModal(false);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
  };

  const handleSaveCar = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...carForm,
        commissionPercent: Number(carForm.commissionPercent !== undefined ? carForm.commissionPercent : 12),
      };
      if (modalMode === 'add') {
        await api('/api/admin/cars', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Vehicle added successfully');
      } else {
        await api(`/api/admin/cars/${carForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Vehicle updated successfully');
      }
      await loadAll();
      setShowCarModal(false);
    } catch (err) {
      toast.error(err.message || 'Save failed');
    }
  };

  const handleSaveBulkCommissions = async () => {
    setIsSavingBulkComm(true);
    try {
      const list = Object.entries(bulkCommissions).map(([id, val]) => ({
        id: Number(id),
        commissionPercent: Number(val),
      }));
      await api('/api/admin/cars/commissions/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ commissions: list }),
      });
      await loadAll();
      toast.success('Fleet commission rates updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update commissions');
    } finally {
      setIsSavingBulkComm(false);
    }
  };

  const handleDeleteCar = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await api(`/api/admin/cars/${id}`, { method: 'DELETE' });
      await loadAll();
      toast.error(`Vehicle ${name} deleted.`);
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    try {
      await api('/api/bookings/admin', {
        method: 'POST',
        body: JSON.stringify({
          customer: newBookingForm.customer,
          phone: newBookingForm.phone,
          pickup: newBookingForm.pickup,
          drop: newBookingForm.drop,
          car: newBookingForm.car,
          date: newBookingForm.date,
          time: newBookingForm.time,
          fare: newBookingForm.fare ? Number(newBookingForm.fare) : undefined,
        }),
      });
      await loadAll();
      toast.success('Booking created successfully!');
      setShowCreateBookingModal(false);
      setNewBookingForm({ customer: '', phone: '', pickup: '', drop: '', car: 'Mini', date: '', time: '', fare: '' });
    } catch (err) {
      toast.error(err.message || 'Create failed');
    }
  };

  return (
    <div className="pt-20 pb-8 px-3 sm:px-4 lg:px-6 bg-background min-h-screen text-dark">
      <div className="max-w-7xl mx-auto">
        
        {activeTab === 'Dashboard' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-10 lg:space-y-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {stats.map((stat, i) => (
                <div key={i} className="glass-card p-4 sm:p-6 lg:p-8 group hover:border-primary/30 transition-all">
                  <div className="flex justify-between items-start mb-3 sm:mb-6">
                    <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-dark/5 flex items-center justify-center text-lg sm:text-2xl ${stat.color}`}>{stat.icon}</div>
                    <span className="text-[9px] sm:text-[10px] font-black text-green-600 flex items-center gap-1"><FaArrowUp /> {stat.trend}</span>
                  </div>
                  <p className="text-muted text-[9px] sm:text-xs font-bold uppercase tracking-widest mb-1 leading-tight">{stat.label}</p>
                  <p className="text-xl sm:text-3xl font-black text-dark">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              <div className="glass-card p-4 sm:p-8">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-8">
                  <h3 className="text-base sm:text-xl font-bold italic uppercase tracking-tighter">{t('admin.revenue_analysis')}</h3>
                  <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1 text-primary"><div className="w-2 h-2 bg-primary rounded-full" /> {t('admin.total')}</span>
                    <span className="flex items-center gap-1 text-green-500"><div className="w-2 h-2 bg-green-500 rounded-full" /> {t('admin.commission')}</span>
                  </div>
                </div>
                <div className="h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" debounce={100}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E8B34B" stopOpacity={0.3}/><stop offset="95%" stopColor="#E8B34B" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5DED3" vertical={false} /><XAxis dataKey="name" stroke="#5F5F5F" fontSize={10} /><YAxis stroke="#5F5F5F" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFDF9', border: '1px solid #E5DED3', borderRadius: '12px' }} itemStyle={{ fontSize: '12px' }} />
                      <Area type="monotone" dataKey="revenue" stroke="#E8B34B" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                      <Area type="monotone" dataKey="commission" stroke="#22c55e" fillOpacity={1} fill="url(#colorComm)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass-card p-4 sm:p-8">
                <h3 className="text-base sm:text-xl font-bold mb-4 sm:mb-8 italic uppercase tracking-tighter">{t('admin.ride_dist')}</h3>
                <div className="h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" debounce={100}>
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#FFFDF9', border: '1px solid #E5DED3', borderRadius: '12px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'Live Fleet' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Top Fleet Header with Stats */}
            <div className="flex flex-wrap justify-between items-center bg-dark/5 p-4 sm:p-6 rounded-3xl border border-border gap-4">
              <div>
                <h3 className="text-xl sm:text-3xl font-black italic uppercase tracking-tighter text-dark flex items-center gap-2">
                  <FaMapMarkedAlt className="text-primary" /> Live Fleet Tracking 📍
                </h3>
                <p className="text-xs text-muted font-bold mt-1">
                  Track which captain is assigned to which customer in real-time
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-green-500/10 px-3 py-2 rounded-xl border border-green-500/20 text-xs font-black text-green-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span>{drivers.filter(d => !allBookings.some(b => (b.driverUserId === d.id || b.driver?.name === d.name) && (b.status === 'Assigned' || b.status === 'Accepted'))).length} Available Free</span>
                </div>
                <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-2 rounded-xl border border-yellow-500/20 text-xs font-black text-yellow-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-ping" />
                  <span>{allBookings.filter(b => b.status === 'Assigned' || b.status === 'Accepted').length} Active Trips</span>
                </div>
              </div>
            </div>

            {/* Main Live Fleet Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: '620px' }}>
              
              {/* Left 2 Cols: Google Map + Dynamic Active Trip Banner */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* Active Trip Inspector Banner */}
                {(() => {
                  const activeBooking = selectedBooking || allBookings.find(b => b.status === 'Assigned' || b.status === 'Accepted') || allBookings[0];
                  if (!activeBooking) return null;
                  return (
                    <div className="glass-card p-4 rounded-2xl border-2 border-primary/40 bg-primary/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary text-dark flex items-center justify-center font-black text-lg shrink-0">
                          <FaCar />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-primary/20 text-dark font-black px-2 py-0.5 rounded uppercase">
                              Inspecting Trip
                            </span>
                            <span className="text-xs font-black text-dark">
                              Captain: <strong className="text-primary">{activeBooking.driver?.name || 'Unassigned'}</strong> ({activeBooking.driver?.vehicleNumber || activeBooking.car})
                            </span>
                          </div>
                          <p className="text-xs text-muted font-bold mt-0.5">
                            Customer: <strong className="text-dark">{activeBooking.customer} ({activeBooking.phone})</strong> • Fare: <strong className="text-green-600">₹{activeBooking.fare}</strong>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded bg-green-500/20 text-green-700">
                          {activeBooking.status}
                        </span>
                        <a href={`tel:+91${activeBooking.phone}`} className="p-2 bg-dark/5 hover:bg-dark/10 rounded-lg text-dark font-bold">
                          <FaPhoneAlt size={10} />
                        </a>
                      </div>
                    </div>
                  );
                })()}

                {/* Interactive Google Map */}
                <div className="glass-card p-2 rounded-3xl border-primary/30 overflow-hidden relative h-[480px]">
                  {(() => {
                    const activeBooking = selectedBooking || allBookings.find(b => b.status === 'Assigned' || b.status === 'Accepted') || allBookings[0];
                    return (
                      <RouteMap
                        pickup={activeBooking?.pickup || 'Barwani, MP'}
                        drop={activeBooking?.drop || 'Indore, MP'}
                        routeCoords={activeBooking?.routeCoords || null}
                        distanceKm={activeBooking?.distance ? parseFloat(String(activeBooking.distance).replace(/[^0-9.]/g, '')) : 145}
                        driverCoords={[22.0366, 74.9031]}
                        showLayerToggle={true}
                        turnInstruction={activeBooking?.driver ? `Captain ${activeBooking.driver.name} en route to ${activeBooking.drop?.split(',')[0]}` : 'Fastest Google Road Route'}
                      />
                    );
                  })()}
                </div>

              </div>

              {/* Right Col: Online Captains with Linked Customers */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <h4 className="font-black text-sm uppercase tracking-tight text-dark">
                    Captains & Active Assignments ({drivers.length})
                  </h4>
                  <span className="text-[10px] text-primary font-black uppercase">Live Updates</span>
                </div>

                <div className="space-y-3 max-h-[560px] overflow-y-auto custom-scrollbar pr-1">
                  {drivers.length > 0 ? (
                    drivers.map((d) => {
                      const linkedBooking = allBookings.find(
                        (b) => (b.driverUserId === d.id || b.driver?.name === d.name) && (b.status === 'Assigned' || b.status === 'Accepted' || b.status === 'In Progress')
                      );
                      const isSelected = selectedBooking && selectedBooking.id === linkedBooking?.id;

                      return (
                        <div
                          key={d.id}
                          onClick={() => {
                            if (linkedBooking) {
                              setSelectedBooking(linkedBooking);
                              toast.success(`Showing route for ${d.name} ➔ ${linkedBooking.customer}`);
                            }
                          }}
                          className={`glass-card p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                            linkedBooking
                              ? isSelected
                                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                                : 'border-yellow-500/40 bg-yellow-500/5 hover:border-primary/50'
                              : 'border-green-500/30 bg-green-500/5 hover:border-green-500/60'
                          }`}
                        >
                          {/* Driver Info Header */}
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-black shrink-0">
                                {d.name.charAt(0)}
                              </div>
                              <div>
                                <h5 className="font-black text-sm text-dark">{d.name}</h5>
                                <p className="text-[10px] text-muted font-bold">{d.carType || 'Car'} • {d.vehicleNumber || 'MP-09'}</p>
                              </div>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              linkedBooking ? 'bg-yellow-500/20 text-yellow-700 animate-pulse' : 'bg-green-500/20 text-green-700'
                            }`}>
                              {linkedBooking ? 'On Trip' : 'Free / Available'}
                            </span>
                          </div>

                          {/* Linked Customer Details or Available Status */}
                          {linkedBooking ? (
                            <div className="mt-3 pt-2.5 border-t border-border/60 space-y-1 text-xs">
                              <p className="font-bold text-dark flex items-center gap-1.5">
                                <span>👤 Customer:</span> <strong>{linkedBooking.customer}</strong>
                                <span className="text-muted">({linkedBooking.phone})</span>
                              </p>
                              <p className="text-muted text-[11px] truncate">
                                <strong>Trip:</strong> {linkedBooking.pickup?.split(',')[0]} → {linkedBooking.drop?.split(',')[0]}
                              </p>
                              <div className="flex justify-between items-center pt-1 text-[11px]">
                                <span className="font-black text-primary">Fare: ₹{linkedBooking.fare}</span>
                                <span className="text-[10px] text-primary font-black uppercase underline">
                                  {isSelected ? 'Viewing on Map ✓' : 'Click to View Route ↗'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2.5 pt-2 border-t border-border/50 flex justify-between items-center text-xs">
                              <span className="text-muted font-bold">📍 Hub: {d.location || 'Local Stand'}</span>
                              <span className="text-[10px] text-green-600 font-bold uppercase">Ready for Dispatch</span>
                            </div>
                          )}

                          {/* Quick Call Button */}
                          <div className="mt-2 pt-2 border-t border-border/40 flex justify-between items-center text-xs">
                            <span className="text-[10px] text-muted">Phone: +91 {d.phone}</span>
                            <a href={`tel:+91${d.phone}`} className="text-primary font-black flex items-center gap-1 hover:underline">
                              <FaPhoneAlt size={10} /> Call Captain
                            </a>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="glass-card p-8 text-center border-dashed border-border">
                      <p className="text-muted text-xs font-bold uppercase">No drivers online</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {activeTab === 'Bookings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center bg-dark/5 p-4 rounded-2xl border border-border">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-dark">{t('admin.manage_bookings')}</h3>
              <button onClick={() => setShowCreateBookingModal(true)} className="btn-primary px-4 py-2 flex items-center gap-2 font-black uppercase tracking-widest text-xs"><FaPlus /> {t('admin.add_dummy_booking')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {allBookings.map((booking) => (
              <div key={booking.id} className="glass-card p-6 border-border hover:border-primary/20 transition-all group flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-xl font-black flex items-center gap-2 text-dark">
                      {booking.customer}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      {booking.phone && (
                        <a href={`tel:+91${booking.phone}`} title={t('admin.call_customer')} className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all text-xs font-black tracking-widest">
                          <FaPhoneAlt size={10} /> +91 {booking.phone}
                        </a>
                      )}
                      <p className="text-[10px] text-muted uppercase font-bold tracking-widest">{t('admin.car_requested', { car: booking.car })}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${booking.status === 'Completed' ? 'bg-green-500/10 text-green-600' : booking.status === 'Assigned' ? 'bg-blue-500/10 text-blue-600' : 'bg-yellow-500/10 text-yellow-600'}`}>{translateStatus(booking.status)}</span>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3"><div className="mt-1.5 w-2 h-2 bg-green-500 rounded-full shrink-0 shadow-[0_0_10px_rgba(34,197,94,0.5)]" /><p className="text-sm text-muted font-medium">{booking.pickup}</p></div>
                  <div className="flex items-start gap-3"><div className="mt-1.5 w-2 h-2 bg-red-500 rounded-full shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.5)]" /><p className="text-sm text-muted font-medium">{booking.drop}</p></div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-dark/5 rounded-2xl border border-border">
                   <div className="flex items-center gap-3 text-xs text-muted font-bold uppercase tracking-tighter"><FaCalendarAlt className="text-primary" /> {booking.date}</div>
                   <div className="flex items-center gap-3 text-xs text-muted font-bold uppercase tracking-tighter"><FaClock className="text-primary" /> {booking.time}</div>
                   <div className="col-span-2 flex items-center gap-3 text-xs text-primary font-black uppercase tracking-widest"><FaRoute /> {t('booking.total_dist')} {booking.distance}</div>
                </div>

                {booking.driver && (
                  <div className="mb-6 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                    <p className="text-[9px] text-primary uppercase font-black mb-2 flex items-center gap-1"><FaUserTie /> {t('driver.assigned_trips')}</p>
                    <div className="flex justify-between items-center">
                       <div><p className="text-dark font-black">{booking.driver.name}</p><p className="text-[10px] text-muted uppercase font-bold tracking-widest">{booking.driver.vehicleName}</p></div>
                       <p className="text-[10px] bg-primary text-dark px-2 py-1 rounded-md font-black">{booking.driver.vehicleNumber}</p>
                    </div>
                  </div>
                )}

                {(() => {
                  const distNum = parseFloat(String(booking.distance || '').replace(/[^0-9.]/g, '')) || (booking.fare ? Math.round(booking.fare / 12) : 50);
                  const carRate = 12;
                  const oneWayBase = Math.round(distNum * carRate);
                  const doubleFare = oneWayBase * 2;
                  const roundTripKm = Math.round(distNum * 2);
                  const estToll = distNum >= 30 ? Math.round((distNum * 3.2) / 10) * 10 : 0;
                  const totalAdminQuote = doubleFare + estToll;
                  const commPercent = getCarCommissionRate(booking.carName || booking.car);
                  const adminProfit = Math.round(doubleFare * (commPercent / 100));
                  const driverPayout = totalAdminQuote - adminProfit;

                  return (
                    <div className="mt-auto pt-4 border-t border-border">
                      {/* 2X Outstation Quote & Toll Box */}
                      <div className="bg-primary/10 border-2 border-primary/40 rounded-2xl p-4 mb-4 space-y-2.5 shadow-sm">
                        <div className="flex justify-between items-center pb-2 border-b border-primary/20">
                          <span className="text-[10px] font-black uppercase text-dark flex items-center gap-1.5">
                            🚕 2X RETURN FARE & TOLL QUOTE
                          </span>
                          <span className="text-[9px] font-black uppercase bg-primary text-dark px-2 py-0.5 rounded shadow-sm">
                            TELL CUSTOMER ON CALL
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted text-[10px] uppercase font-bold block">1-Way Distance:</span>
                            <strong className="text-dark font-black">{distNum} KM</strong>
                          </div>
                          <div>
                            <span className="text-muted text-[10px] uppercase font-bold block">2-Way Billable (2X):</span>
                            <strong className="text-dark font-black">{roundTripKm} KM</strong>
                          </div>
                          <div>
                            <span className="text-muted text-[10px] uppercase font-bold block">Double Base Fare (2X):</span>
                            <strong className="text-dark font-black">₹{doubleFare.toLocaleString('en-IN')}</strong>
                          </div>
                          <div>
                            <span className="text-muted text-[10px] uppercase font-bold block">Est. Highway Toll:</span>
                            <strong className="text-blue-700 font-black">₹{estToll.toLocaleString('en-IN')}</strong>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-primary/20 flex justify-between items-center">
                          <div>
                            <span className="text-[9px] font-black uppercase text-muted block">Total Quote to Tell Customer:</span>
                            <p className="text-2xl font-black text-dark leading-none">₹{totalAdminQuote.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-black uppercase text-primary block">Your Profit ({commPercent}%):</span>
                            <p className="text-base font-black text-primary leading-none">₹{adminProfit.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs pb-3 text-muted">
                        <span>Driver Payout (Base - Comm + Toll):</span>
                        <strong className="text-green-600 font-black text-sm">₹{driverPayout.toLocaleString('en-IN')}</strong>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {booking.status === 'Pending' ? (
                          <button onClick={() => { setSelectedBooking(booking); setShowAssignModal(true); }} className="col-span-2 btn-primary py-4 text-xs uppercase font-black shadow-lg shadow-primary/20">{t('admin.assign_driver')}</button>
                        ) : (
                          <button onClick={() => handleEditBooking(booking)} className="col-span-2 bg-green-500 text-dark py-4 rounded-xl text-xs font-black uppercase hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"><FaEdit /> {t('admin.update_booking')}</button>
                        )}
                        <button onClick={() => { setSelectedBooking(booking); setShowMapModal(true); }} className="bg-dark/5 py-4 rounded-xl text-xs font-black uppercase hover:bg-dark/10 transition-all flex items-center justify-center gap-2 text-dark border border-border"><FaMapMarkedAlt /> {t('admin.map')}</button>
                        <button onClick={() => handleCancelBooking(booking.id)} className="bg-red-500/10 text-red-500 py-4 rounded-xl text-xs font-black uppercase hover:bg-red-500 hover:text-white transition-all border border-red-500/20">{t('booking.cancel_request')}</button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'Customers' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 sm:p-8">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6 sm:mb-8">
               <h3 className="text-lg sm:text-2xl font-black tracking-tighter uppercase italic">{t('admin.customer_dir')}</h3>
               <button onClick={() => handleCustomerModal('add')} className="btn-primary px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2 font-black uppercase tracking-widest text-xs"><FaPlus /> {t('admin.add_customer')}</button>
            </div>
            <AdminListToolbar
              search={customerSearch}
              onSearchChange={setCustomerSearch}
              filter={customerFilter}
              onFilterChange={setCustomerFilter}
              filterOptions={CUSTOMER_FILTER_OPTIONS}
              total={customers.length}
              shown={filteredCustomers.length}
              placeholderKey="admin.search_customers"
            />
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead><tr className="text-muted text-[10px] uppercase tracking-widest border-b border-border"><th className="pb-4">{t('nav.customers')}</th><th className="pb-4">{t('admin.location')}</th><th className="pb-4">{t('admin.joined')}</th><th className="pb-4">{t('admin.total_rides_col')}</th><th className="pb-4">{t('admin.total_spent')}</th><th className="pb-4 text-right">{t('admin.actions')}</th></tr></thead>
                  <tbody className="text-sm">
                    {filteredCustomers.length === 0 ? (
                      <tr><td colSpan={6} className="py-12 text-center text-muted text-sm font-bold uppercase tracking-widest">{t('admin.no_results')}</td></tr>
                    ) : filteredCustomers.map(c => (
                      <tr key={c.id} className="border-b border-border hover:bg-muted/10 transition-all group">
                        <td className="py-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold">{c.name.charAt(0)}</div><div><p className="font-bold text-foreground">{c.name}</p><div className="flex items-center gap-1.5 mt-0.5"><a href={`tel:+91${c.phone}`} title={t('admin.call_customer')} className="text-green-600 bg-green-500/10 p-1 rounded-md hover:bg-green-600 hover:text-white transition-all"><FaPhoneAlt size={10} /></a><p className="text-xs text-muted font-medium tracking-wide">+91 {c.phone}</p></div></div></div></td>
                        <td className="py-5 text-muted font-medium italic">{c.location}</td><td className="py-5 text-muted text-xs">{c.joined}</td><td className="py-5 font-bold text-foreground uppercase text-xs">{t('admin.rides_count', { count: c.totalRides })}</td><td className="py-5 font-black text-primary">₹{c.spent}</td>
                        <td className="py-5 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleCustomerModal('view', c)} className="p-2 bg-muted/10 rounded-lg text-muted hover:text-primary transition-all border border-border"><FaEye /></button><button onClick={() => handleCustomerModal('edit', c)} className="p-2 bg-muted/10 rounded-lg text-muted hover:text-green-600 transition-all border border-border"><FaEdit /></button><button onClick={() => handleDeleteCustomer(c.id, c.name, c.phone)} className="p-2 bg-muted/10 rounded-lg text-muted hover:text-red-500 transition-all border border-border"><FaTrash /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'Drivers' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 sm:p-8">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6 sm:mb-8">
               <h3 className="text-lg sm:text-2xl font-black tracking-tighter italic uppercase">{t('admin.driver_approvals')}</h3>
               <button onClick={() => handleDriverModal('add')} className="btn-primary px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2 font-black uppercase tracking-widest text-xs"><FaPlus /> {t('admin.add_driver')}</button>
            </div>
            <AdminListToolbar
              search={driverSearch}
              onSearchChange={setDriverSearch}
              filter={driverFilter}
              onFilterChange={setDriverFilter}
              filterOptions={DRIVER_FILTER_OPTIONS}
              total={drivers.length}
              shown={filteredDrivers.length}
              placeholderKey="admin.search_drivers"
            />
            <div className="flex flex-wrap gap-2 mb-4">
              {['pending', 'approved', 'available'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDriverFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                    driverFilter === key
                      ? 'bg-primary text-dark border-primary'
                      : 'border-border text-muted hover:border-primary/40'
                  }`}
                >
                  {key === 'pending' ? t('admin.filter_pending_approval') : key === 'approved' ? t('admin.filter_approved') : t('admin.filter_available')}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="text-muted text-[10px] uppercase tracking-widest border-b border-border"><th className="pb-4">{t('nav.drivers')}</th><th className="pb-4">{t('admin.location')}</th><th className="pb-4">{t('admin.vehicle')}</th><th className="pb-4">{t('admin.status')}</th><th className="pb-4">{t('admin.docs')}</th><th className="pb-4 text-right">{t('admin.actions')}</th></tr></thead>
                <tbody className="text-sm">
                  {filteredDrivers.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-muted text-sm font-bold uppercase tracking-widest">{t('admin.no_results')}</td></tr>
                  ) : filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="border-b border-border hover:bg-muted/10 transition-all">
                      <td className="py-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">{driver.name.charAt(0)}</div><div><p className="font-bold text-foreground">{driver.name}</p><div className="flex items-center gap-1.5 mt-0.5"><a href={`tel:+91${driver.phone}`} title={t('admin.call_driver')} className="text-green-600 bg-green-500/10 p-1 rounded-md hover:bg-green-600 hover:text-white transition-all"><FaPhoneAlt size={10} /></a><p className="text-[10px] text-muted uppercase tracking-widest">+91 {driver.phone}</p></div></div></div></td>
                      <td className="py-5 text-muted font-medium italic">{driver.location}</td>
                      <td className="py-5"><p className="font-bold text-foreground">{driver.carType}</p><p className="text-[10px] text-muted">{driver.vehicleNumber}</p></td>
                      <td className="py-5"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${driver.status === 'Available' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>{translateStatus(driver.status)}</span></td>
                      <td className="py-5">
                         <div className="flex gap-2">
                           <div className="w-10 h-10 rounded-lg bg-muted/10 border border-border p-1 cursor-zoom-in" title={t('admin.vehicle_photo')}><img src={driver.vehiclePhoto} className="w-full h-full object-cover rounded-md" alt="Vehicle" /></div>
                           <div className="w-10 h-10 rounded-lg bg-muted/10 border border-border p-1 cursor-zoom-in" title={t('admin.license_photo')}><img src={driver.licensePhoto} className="w-full h-full object-cover rounded-md" alt="License" /></div>
                         </div>
                      </td>
                      <td className="py-5 text-right">
                         <div className="flex justify-end gap-2">
                           {driver.approvalStatus === 'Pending' ? (
                             <>
                               <button onClick={() => handleApproveDriver(driver.id)} className="p-2 bg-green-500/10 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all border border-green-500/20" title={t('admin.approve')}><FaCheckCircle /></button>
                               <button onClick={() => handleRejectDriver(driver.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/20" title={t('admin.reject')}><FaTimesCircle /></button>
                             </>
                           ) : (
                             <span className={`px-2 py-1 rounded text-[8px] font-black uppercase border ${driver.approvalStatus === 'Approved' ? 'border-green-600 text-green-600' : 'border-red-500 text-red-500'}`}>{translateStatus(driver.approvalStatus)}</span>
                           )}
                           <div className="w-px h-8 bg-border mx-1"></div>
                           <button onClick={() => handleDriverModal('view', driver)} className="p-2 bg-muted/10 rounded-lg text-muted hover:text-primary transition-all border border-border"><FaEye /></button>
                           <button onClick={() => handleDriverModal('edit', driver)} className="p-2 bg-muted/10 rounded-lg text-muted hover:text-green-600 transition-all border border-border"><FaEdit /></button>
                           <button onClick={() => handleDeleteDriver(driver.id, driver.name)} className="p-2 bg-muted/10 rounded-lg text-muted hover:text-red-500 transition-all border border-border"><FaTrash /></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'Cars' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center bg-dark/5 p-4 rounded-2xl border border-border">
              <div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-dark">{t('admin.manage_vehicles')}</h3>
                <p className="text-xs text-muted font-bold">Configure rates, passenger capacity, and vehicle-specific commission rates</p>
              </div>
              <button 
                onClick={() => {
                  setModalMode('add');
                  setCarForm({ id: null, name: '', type: '', pricePerKm: '', seats: '', eta: '5 mins', image: null, commissionPercent: 12 });
                  setShowCarModal(true);
                }} 
                className="btn-primary px-4 py-2 flex items-center gap-2 font-black uppercase tracking-widest text-xs"
              >
                <FaPlus /> {t('admin.add_vehicle')}
              </button>
            </div>

            {/* ── FLEET COMMISSION CONFIGURATION PANEL ── */}
            <div className="glass-card p-5 sm:p-6 border-primary/30 bg-primary/5 rounded-3xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h4 className="text-base sm:text-lg font-black uppercase italic tracking-tighter text-dark flex items-center gap-2">
                    <FaPercentage className="text-primary" /> Vehicle-Wise Commission Settings
                  </h4>
                  <p className="text-xs text-muted font-bold">
                    Set specific commission (%) for each vehicle category. Driver payout & platform revenue update live automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveBulkCommissions}
                  disabled={isSavingBulkComm}
                  className="btn-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 self-stretch sm:self-auto justify-center"
                >
                  <FaSlidersH /> {isSavingBulkComm ? 'Saving...' : 'Save All Commissions'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {adminCars.map((car) => {
                  const currentVal = bulkCommissions[car.id] !== undefined ? bulkCommissions[car.id] : (car.commissionPercent ?? 12);
                  const driverShare = Math.max(0, 100 - Number(currentVal || 0));
                  return (
                    <div key={car.id} className="bg-surface p-3.5 rounded-2xl border border-border/80 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-10 h-8 bg-dark/5 rounded-lg flex items-center justify-center p-1 shrink-0">
                          <img src={car.image} alt={car.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-dark truncate">{car.name}</p>
                          <p className="text-[10px] text-primary font-black">₹{car.pricePerKm}/km</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 bg-dark/5 px-2 py-1.5 rounded-xl border border-border">
                          <span className="text-[10px] text-muted font-bold">Comm:</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={currentVal}
                            onChange={(e) => setBulkCommissions({ ...bulkCommissions, [car.id]: e.target.value })}
                            className="w-full bg-transparent text-right font-black text-sm text-dark focus:outline-none"
                          />
                          <span className="text-xs font-black text-primary">%</span>
                        </div>
                        <p className="text-[9px] text-muted font-bold text-center mt-1.5">
                          Driver: <span className="text-green-600 font-black">{driverShare}%</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <AdminListToolbar
              search={carSearch}
              onSearchChange={setCarSearch}
              filter={carFilter}
              onFilterChange={setCarFilter}
              filterOptions={CAR_FILTER_OPTIONS}
              total={adminCars.length}
              shown={filteredCars.length}
              placeholderKey="admin.search_cars"
            />
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
              {filteredCars.length === 0 ? (
                <p className="col-span-full py-12 text-center text-muted text-sm font-bold uppercase tracking-widest">{t('admin.no_results')}</p>
              ) : filteredCars.map((car) => (
                <div key={car.id} className="glass-card p-4 sm:p-8 group relative overflow-hidden text-center">
                  <button 
                    onClick={() => handleDeleteCar(car.id, car.name)}
                    className="absolute top-4 right-4 z-10 p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                  >
                    <FaTrash size={12} />
                  </button>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
                  <img src={car.image} alt={car.name} className="w-24 sm:w-40 h-40 object-contain mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-all duration-500" />
                  <h4 className="text-lg sm:text-2xl font-black mb-1 sm:mb-2 text-foreground">{car.name}</h4>
                  <p className="text-[9px] sm:text-[10px] text-muted uppercase font-black tracking-widest mb-3 sm:mb-6">{car.type} • {car.seats} {t('cars.seats')}</p>
                  <div className="bg-muted/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border mb-3 sm:mb-6 text-left space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] sm:text-[10px] text-muted uppercase font-bold">{t('admin.rate')}</span>
                      <span className="text-primary font-black text-sm">₹{car.pricePerKm}{t('cars.per_km')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-border/40">
                      <span className="text-[9px] sm:text-[10px] text-muted uppercase font-bold">Commission</span>
                      <span className="text-green-600 font-black text-xs bg-green-500/10 px-2 py-0.5 rounded-md">
                        {car.commissionPercent ?? 12}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-muted font-bold">
                      <span>Driver Payout</span>
                      <span className="text-dark font-black">{100 - Number(car.commissionPercent ?? 12)}%</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setModalMode('edit');
                      setCarForm({ ...car, commissionPercent: car.commissionPercent ?? 12 });
                      setShowCarModal(true);
                    }}
                    className="w-full py-3 bg-muted/10 hover:bg-primary hover:text-background rounded-xl text-xs font-black uppercase transition-all border border-border"
                  >
                    {t('admin.update')}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'Payments' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 sm:p-8">
             <div className="flex flex-wrap justify-between items-center gap-4 mb-8 sm:mb-12">
               <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-foreground">{t('admin.transaction_log')}</h3>
               <div className="bg-primary/10 border border-primary/20 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl">
                 <p className="text-[9px] text-primary uppercase font-black mb-1">{t('admin.wallet_balance')}</p>
                 <p className="text-xl sm:text-2xl font-black text-foreground">₹{walletBalanceNum.toLocaleString('en-IN')}</p>
               </div>
             </div>
             <div className="space-y-4">
                {payments.length > 0 ? (
                  payments.map(p => (
                    <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-muted/10 rounded-3xl border border-border hover:border-primary/20 transition-all group">
                      <div className="flex items-center gap-6 mb-4 md:mb-0">
                        <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-600 text-xl group-hover:bg-primary/10 group-hover:text-primary transition-all">
                          <FaCreditCard />
                        </div>
                        <div>
                          <p className="font-black text-lg text-foreground">{t('admin.trip_payment', { id: p.bookingId || p.id })}</p>
                          <p className="text-xs text-muted uppercase font-bold tracking-widest">{p.customer} • {p.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-12 text-right">
                        <div className="hidden lg:block">
                          <p className="text-[9px] text-muted uppercase font-black">{t('admin.split')}</p>
                          <p className="text-xs text-foreground font-bold">{t('admin.split_detail', { admin: Math.floor(p.amount * (getCarCommissionRate(p.carName) / 100)), driver: p.amount - Math.floor(p.amount * (getCarCommissionRate(p.carName) / 100)) })}</p>
                        </div>
                        <div>
                          <p className="text-2xl font-black text-primary">₹{p.amount}</p>
                          <p className="text-[10px] text-muted uppercase font-black">{p.method}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="glass-card p-12 text-center border-dashed border-border">
                    <p className="text-muted uppercase font-black tracking-widest text-sm">No transaction records found</p>
                  </div>
                )}
             </div>
          </motion.div>
        )}

        {activeTab === 'Reports' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
                <div className="glass-card p-5 sm:p-8 text-center">
                  <p className="text-[9px] sm:text-[10px] text-muted uppercase font-black mb-2">{t('admin.total_commissions')}</p>
                  <p className="text-2xl sm:text-4xl font-black text-primary">₹{totalCommissionsNum.toLocaleString('en-IN')}</p>
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-green-600 font-bold"><FaArrowUp /> Live Aggregated</div>
                </div>
                <div className="glass-card p-5 sm:p-8 text-center">
                  <p className="text-[9px] sm:text-[10px] text-muted uppercase font-black mb-2">{t('admin.driver_payouts')}</p>
                  <p className="text-2xl sm:text-4xl font-black text-green-600">₹{driverPayoutsNum.toLocaleString('en-IN')}</p>
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-green-600 font-bold"><FaArrowUp /> Live Aggregated</div>
                </div>
                <div className="glass-card p-5 sm:p-8 text-center">
                  <p className="text-[9px] sm:text-[10px] text-muted uppercase font-black mb-2">{t('admin.platform_growth')}</p>
                  <p className="text-2xl sm:text-4xl font-black text-blue-600">{operationalMetrics[0]?.val || '100%'}</p>
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-green-600 font-bold"><FaArrowUp /> {t('admin.consistent')}</div>
                </div>
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                <div className="glass-card p-4 sm:p-8">
                  <h3 className="text-base sm:text-xl font-black italic uppercase tracking-tighter mb-4 sm:mb-8 text-foreground">{t('admin.payout_weekly')}</h3>
                  <div className="h-[300px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" debounce={100}>
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5DED3" vertical={false} />
                        <XAxis dataKey="name" stroke="#5F5F5F" fontSize={10} />
                        <YAxis stroke="#5F5F5F" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#FFFDF9', border: '1px solid #E5DED3', borderRadius: '12px' }} />
                        <Legend />
                        <Bar dataKey="driverPay" fill="#22c55e" name={t('admin.driver_payout_chart')} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="commission" fill="#E8B34B" name={t('admin.admin_profit')} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="glass-card p-4 sm:p-8">
                  <h3 className="text-base sm:text-xl font-black italic uppercase tracking-tighter mb-4 sm:mb-8 text-foreground">{t('admin.operational_perf')}</h3>
                  <div className="space-y-6">
                    {operationalMetrics.map((m, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-muted font-bold uppercase">{t(m.labelKey)}</span>
                          <span className="text-foreground font-black">{m.val}</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted/10 rounded-full overflow-hidden border border-border">
                          <motion.div initial={{ width: 0 }} animate={{ width: m.val.includes('%') ? m.val : '80%' }} transition={{ delay: i * 0.1 }} className={`h-full ${m.color}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'Settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
            <div className="glass-card p-6 sm:p-8 border border-border">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-2xl font-black">
                  ⚙️
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-dark">
                    UPI QR Code & Advance Booking Settings
                  </h3>
                  <p className="text-xs text-muted font-bold">
                    Configure customer advance token payment QR code, UPI ID, and 24x7 helpline numbers.
                  </p>
                </div>
              </div>

              {/* QR Preview & Upload */}
              <div className="bg-dark/5 p-6 rounded-2xl border border-border flex flex-col items-center justify-center text-center mb-6">
                <div className="w-48 h-48 bg-white p-3 rounded-2xl shadow-md border border-border mb-3 flex items-center justify-center">
                  <img
                    src={qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${upiId || '9755339783@upi'}&pn=SafarSetu&am=${advanceAmount || 200}&cu=INR`)}`}
                    alt="SafarSetu UPI QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs font-bold text-dark mb-1">
                  {qrCodeUrl ? 'Custom Admin Uploaded QR Code' : 'Dynamic Auto-Generated UPI QR Code'}
                </p>
                <p className="text-[11px] text-muted">
                  Scanned by customers during booking to pay ₹{advanceAmount || 200} advance
                </p>

                <div className="mt-4 flex items-center gap-3">
                  <label className="btn-primary px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md shadow-primary/20 hover:scale-105 transition-all">
                    <span>Upload QR Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleQrImageUpload}
                    />
                  </label>
                  {qrCodeUrl && (
                    <button
                      type="button"
                      onClick={() => setQrCodeUrl('')}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-xl transition-all"
                    >
                      Reset to Default QR
                    </button>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-dark mb-1.5 tracking-wider">
                    Admin UPI ID (GPay / PhonePe / Paytm / BHIM)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. 9755339783@upi"
                    className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm font-bold text-dark focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-dark mb-1.5 tracking-wider">
                    Advance Token Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="200"
                    className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm font-bold text-dark focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-dark mb-1.5 tracking-wider">
                      Primary Helpline (Call & WhatsApp)
                    </label>
                    <input
                      type="text"
                      value={helpline1}
                      onChange={(e) => setHelpline1(e.target.value)}
                      placeholder="6261828036"
                      className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm font-bold text-dark focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-dark mb-1.5 tracking-wider">
                      Secondary Helpline (Call)
                    </label>
                    <input
                      type="text"
                      value={helpline2}
                      onChange={(e) => setHelpline2(e.target.value)}
                      placeholder="9755339783"
                      className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm font-bold text-dark focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="w-full mt-4 btn-primary py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/25 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                >
                  {isSavingSettings ? 'Saving Settings...' : 'Save QR Code & Helpline Settings'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </div>

      {/* Map Modal */}
      <AnimatePresence>
        {showMapModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMapModal(false)} className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass-card w-full max-w-4xl h-[70vh] sm:h-[80vh] relative z-10 border-primary/20 flex flex-col">
              <div className="p-6 border-b border-border flex justify-between items-center bg-muted/10">
                 <div><h3 className="text-2xl font-black text-foreground italic uppercase tracking-tighter">{t('admin.live_route')}</h3><p className="text-[10px] text-muted uppercase font-bold tracking-widest">{selectedBooking?.pickup} → {selectedBooking?.drop}</p></div>
                 <button onClick={() => setShowMapModal(false)} className="text-muted hover:text-foreground"><FaTimesCircle size={24} /></button>
              </div>
              <div className="flex-1 relative overflow-hidden bg-surface p-4">
                 <RouteMap
                   pickup={selectedBooking?.pickup}
                   drop={selectedBooking?.drop}
                   routeCoords={selectedBooking?.routeCoords || null}
                   distanceKm={parseKm(selectedBooking?.distance)}
                 />
                 
                 <div className="absolute top-12 right-12 z-[1000] p-6 glass-card border-primary/30 max-w-xs shadow-2xl">
                    <div className="flex items-center gap-4 mb-4">
                       <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-background text-xl"><FaMapMarkerAlt /></div>
                       <div><p className="text-3xl font-black text-foreground">450 <span className="text-xs uppercase text-muted font-bold tracking-widest">{t('admin.meters')}</span></p><p className="text-[10px] text-primary uppercase font-black">{t('driver.turn_left')}</p></div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Update Modal */}
      <AnimatePresence>
        {showBookingEditModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBookingEditModal(false)} className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="glass-card w-full max-w-md p-5 sm:p-8 relative z-10 border-primary/20 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-8 text-dark">{t('admin.update_booking')}</h3>
              <form onSubmit={handleSaveBooking} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative"><FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('booking.pickup')} value={bookingForm.pickup || ''} onChange={e => setBookingForm({...bookingForm, pickup: e.target.value})} className="input-field pl-12" required /></div>
                  <div className="relative"><FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('booking.drop')} value={bookingForm.drop || ''} onChange={e => setBookingForm({...bookingForm, drop: e.target.value})} className="input-field pl-12" required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative"><FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('booking.date')} value={bookingForm.date || ''} onChange={e => setBookingForm({...bookingForm, date: e.target.value})} className="input-field pl-12" required /></div>
                    <div className="relative"><FaClock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('booking.time')} value={bookingForm.time || ''} onChange={e => setBookingForm({...bookingForm, time: e.target.value})} className="input-field pl-12" required /></div>
                  </div>
                  <div className="relative"><FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="number" placeholder={t('admin.commission')} value={bookingForm.fare || ''} onChange={e => setBookingForm({...bookingForm, fare: e.target.value})} className="input-field pl-12" required /></div>
                  <div className="relative">
                    <FaUserTie className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <select
                      value={bookingForm.driverId || ''}
                      onChange={(e) => {
                        const drv = drivers.find((d) => d.id === e.target.value);
                        setBookingForm({
                          ...bookingForm,
                          driverId: e.target.value,
                          driverName: drv?.name,
                          vehicleName: drv?.carType,
                          vehicleNumber: drv?.vehicleNumber,
                        });
                      }}
                      className="input-field pl-12 appearance-none bg-surface"
                    >
                      <option value="">Select Driver</option>
                      {drivers.filter((d) => d.approvalStatus === 'Approved').map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.carType})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full btn-primary py-4 font-black uppercase tracking-widest shadow-xl shadow-primary/20">{t('admin.update_booking')}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Dummy Booking Modal */}
      <AnimatePresence>
        {showCreateBookingModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateBookingModal(false)} className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass-card w-full max-w-md p-5 sm:p-8 relative z-10 border-primary/20 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-dark">Create Dummy Booking</h3>
                <button onClick={() => setShowCreateBookingModal(false)} className="text-muted hover:text-dark"><FaTimesCircle size={20} /></button>
              </div>
              <form onSubmit={handleCreateBooking} className="space-y-4">
                <div className="relative"><FaUserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder="Customer Name" value={newBookingForm.customer} onChange={e => setNewBookingForm({...newBookingForm, customer: e.target.value})} className="input-field pl-12" required /></div>
                <div className="relative"><FaPhoneAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder="Customer Phone" value={newBookingForm.phone} onChange={e => setNewBookingForm({...newBookingForm, phone: e.target.value})} className="input-field pl-12" required /></div>
                <div className="relative"><FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder="Pickup Location" value={newBookingForm.pickup} onChange={e => setNewBookingForm({...newBookingForm, pickup: e.target.value})} className="input-field pl-12" required /></div>
                <div className="relative"><FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder="Drop Location" value={newBookingForm.drop} onChange={e => setNewBookingForm({...newBookingForm, drop: e.target.value})} className="input-field pl-12" required /></div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="relative"><FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder="Date (e.g. 24 May)" value={newBookingForm.date} onChange={e => setNewBookingForm({...newBookingForm, date: e.target.value})} className="input-field pl-12" required /></div>
                   <div className="relative"><FaClock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder="Time (e.g. 10:30 AM)" value={newBookingForm.time} onChange={e => setNewBookingForm({...newBookingForm, time: e.target.value})} className="input-field pl-12" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="relative"><FaCar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder="Car (Mini/SUV)" value={newBookingForm.car} onChange={e => setNewBookingForm({...newBookingForm, car: e.target.value})} className="input-field pl-12" required /></div>
                   <div className="relative"><FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="number" placeholder="Fare (₹)" value={newBookingForm.fare} onChange={e => setNewBookingForm({...newBookingForm, fare: e.target.value})} className="input-field pl-12" required /></div>
                </div>
                <button type="submit" className="w-full btn-primary py-4 mt-4 font-black uppercase tracking-widest shadow-xl shadow-primary/20">Add Booking</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Modal */}
      <AnimatePresence>
        {showCustomerModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCustomerModal(false)} className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass-card w-full max-w-md p-5 sm:p-8 relative z-10 border-primary/20 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-dark">
                  {modalMode === 'add' ? t('admin.add_customer') : modalMode === 'edit' ? t('admin.add_customer') : t('admin.customer_dir')}
                </h3>
                <button onClick={() => setShowCustomerModal(false)} className="text-muted hover:text-dark"><FaTimesCircle size={20} /></button>
              </div>
              <form onSubmit={handleSaveCustomer} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative"><FaUserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('auth.full_name')} value={customerForm.name || ''} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} className="input-field pl-12" readOnly={modalMode === 'view'} required /></div>
                  <div className="relative"><FaPhoneAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('auth.phone')} value={customerForm.phone || ''} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} className="input-field pl-12" readOnly={modalMode === 'view'} required /></div>
                  <div className="relative"><FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('auth.location')} value={customerForm.location || ''} onChange={e => setCustomerForm({...customerForm, location: e.target.value})} className="input-field pl-12" readOnly={modalMode === 'view'} required /></div>
                  <div className="relative"><FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('auth.password')} value={customerForm.password || ''} onChange={e => setCustomerForm({...customerForm, password: e.target.value})} className="input-field pl-12" readOnly={modalMode === 'view'} required /></div>
                </div>
                {modalMode !== 'view' && (
                  <button type="submit" className="w-full btn-primary py-4 font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                    {modalMode === 'add' ? t('auth.register_btn') : t('admin.update_customer')}
                  </button>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Driver Modal */}
      <AnimatePresence>
        {showDriverModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDriverModal(false)} className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass-card w-full max-w-lg p-5 sm:p-8 relative z-10 border-primary/20 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-dark">
                  {modalMode === 'add' ? t('admin.add_driver') : modalMode === 'edit' ? t('admin.add_driver') : t('admin.driver_approvals')}
                </h3>
                <button onClick={() => setShowDriverModal(false)} className="text-muted hover:text-dark"><FaTimesCircle size={20} /></button>
              </div>
              <form onSubmit={handleSaveDriver} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative"><FaUserTie className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('auth.full_name')} value={driverForm.name || ''} onChange={e => setDriverForm({...driverForm, name: e.target.value})} className="input-field pl-12" readOnly={modalMode === 'view'} required /></div>
                  <div className="relative"><FaPhoneAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('auth.phone')} value={driverForm.phone || ''} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} className="input-field pl-12" readOnly={modalMode === 'view'} required /></div>
                  <div className="relative col-span-2"><FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('auth.location')} value={driverForm.location || ''} onChange={e => setDriverForm({...driverForm, location: e.target.value})} className="input-field pl-12" readOnly={modalMode === 'view'} required /></div>
                  <div className="relative"><FaCar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('auth.vehicle_name')} value={driverForm.vehicleName || ''} onChange={e => setDriverForm({...driverForm, vehicleName: e.target.value})} className="input-field pl-12" readOnly={modalMode === 'view'} required /></div>
                  <div className="relative"><FaIdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('auth.vehicle_no')} value={driverForm.vehicleNumber || ''} onChange={e => setDriverForm({...driverForm, vehicleNumber: e.target.value})} className="input-field pl-12" readOnly={modalMode === 'view'} required /></div>
                  <div className="relative col-span-2"><FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder={t('auth.password')} value={driverForm.password || ''} onChange={e => setDriverForm({...driverForm, password: e.target.value})} className="input-field pl-12" readOnly={modalMode === 'view'} required /></div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] text-muted uppercase font-black tracking-widest">Document Previews</p>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="aspect-video glass-card border-border flex flex-col items-center justify-center p-2 group cursor-pointer hover:border-primary/30 transition-all overflow-hidden relative">
                      {modalMode === 'add' && !driverForm.vehiclePhoto ? <FaCamera className="text-muted mb-1" /> : (
                        driverForm.vehiclePhoto && !driverForm.vehiclePhoto.includes('placehold.co') ? (
                          <img src={driverForm.vehiclePhoto} className="w-full h-full object-cover rounded-lg" alt="Vehicle" />
                        ) : (
                          <div className="w-full h-full bg-dark/5 rounded-lg flex items-center justify-center text-[10px] text-muted uppercase font-black">No Photo</div>
                        )
                      )}
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-dark/60 px-2 py-0.5 rounded text-[8px] text-muted uppercase font-black backdrop-blur-sm">Vehicle Photo</span>
                      {modalMode !== 'view' && <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'vehiclePhoto')} />}
                    </label>
                    <label className="aspect-video glass-card border-border flex flex-col items-center justify-center p-2 group cursor-pointer hover:border-primary/30 transition-all overflow-hidden relative">
                      {modalMode === 'add' && !driverForm.licensePhoto ? <FaCamera className="text-muted mb-1" /> : (
                        driverForm.licensePhoto && !driverForm.licensePhoto.includes('placehold.co') ? (
                          <img src={driverForm.licensePhoto} className="w-full h-full object-cover rounded-lg" alt="License" />
                        ) : (
                          <div className="w-full h-full bg-dark/5 rounded-lg flex items-center justify-center text-[10px] text-muted uppercase font-black">No Photo</div>
                        )
                      )}
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-dark/60 px-2 py-0.5 rounded text-[8px] text-muted uppercase font-black backdrop-blur-sm">License Photo</span>
                      {modalMode !== 'view' && <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'licensePhoto')} />}
                    </label>
                  </div>
                </div>

                {modalMode !== 'view' && (
                  <button type="submit" className="w-full btn-primary py-4 font-black uppercase tracking-widest shadow-xl shadow-primary/20 mt-4">
                    {modalMode === 'add' ? t('auth.register_btn') : t('admin.update_driver')}
                  </button>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCarModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCarModal(false)} className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="glass-card w-full max-w-md p-5 sm:p-8 relative z-10 border-primary/20 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-8 text-dark">
                {modalMode === 'add' ? 'Add New Vehicle' : 'Update Vehicle'}
              </h3>
              <form onSubmit={handleSaveCar} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative"><FaCar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder="Vehicle Name (e.g. Echo)" value={carForm.name || ''} onChange={e => setCarForm({...carForm, name: e.target.value})} className="input-field pl-12" required /></div>
                  <div className="relative"><FaThLarge className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" placeholder="Type (e.g. Standard)" value={carForm.type || ''} onChange={e => setCarForm({...carForm, type: e.target.value})} className="input-field pl-12" required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative"><FaUsers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="number" placeholder="Seats" value={carForm.seats || ''} onChange={e => setCarForm({...carForm, seats: e.target.value})} className="input-field pl-12" required /></div>
                    <div className="relative"><FaMoneyBillWave className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" /><input type="number" placeholder="Rate /km" value={carForm.pricePerKm || ''} onChange={e => setCarForm({...carForm, pricePerKm: e.target.value})} className="input-field pl-12" required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <FaClock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input 
                        type="text" 
                        placeholder="ETA (e.g. 5 mins)" 
                        value={carForm.eta || ''} 
                        onChange={e => setCarForm({...carForm, eta: e.target.value})} 
                        className="input-field pl-12" 
                        required 
                      />
                    </div>
                    <div className="relative">
                      <FaPercentage className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" />
                      <input 
                        type="number" 
                        step="0.5" 
                        min="0" 
                        max="100" 
                        placeholder="Commission %" 
                        value={carForm.commissionPercent !== undefined ? carForm.commissionPercent : 12} 
                        onChange={e => setCarForm({...carForm, commissionPercent: e.target.value})} 
                        className="input-field pl-12 border-amber-500/30 focus:border-amber-500 font-bold" 
                        required 
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-amber-400">
                    <span className="font-bold flex items-center gap-1.5"><FaSlidersH className="text-amber-500" /> Split Ratio:</span>
                    <span>Admin: <strong className="text-amber-300">{Number(carForm.commissionPercent ?? 12)}%</strong> | Driver: <strong className="text-emerald-400">{(100 - Number(carForm.commissionPercent ?? 12)).toFixed(1)}%</strong></span>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted uppercase font-black tracking-widest">Vehicle Image</p>
                    <label className="aspect-video glass-card border-border flex flex-col items-center justify-center p-2 group cursor-pointer hover:border-primary/30 transition-all overflow-hidden relative h-32">
                      {carForm.image ? (
                        <img src={carForm.image} className="w-full h-full object-contain rounded-lg" alt="Preview" />
                      ) : (
                        <>
                          <FaCamera className="text-muted group-hover:text-primary text-sm" />
                          <span className="text-[9px] text-muted font-bold uppercase text-center">Select Photo</span>
                        </>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image', setCarForm)} />
                    </label>
                  </div>
                </div>
                <button type="submit" className="w-full btn-primary py-4 font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                  {modalMode === 'add' ? 'Create Vehicle' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Assign Driver Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssignModal(false)} className="absolute inset-0 bg-background/95 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass-card w-full max-w-md p-5 sm:p-8 relative z-10 border-primary/20 max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-6 sm:mb-8">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-dark">{t('admin.assign_driver')}</h3>
                  <p className="text-[10px] text-muted uppercase font-bold tracking-widest mt-1">Available & Verified Drivers</p>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="text-muted hover:text-dark transition-colors"><FaTimesCircle size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                {drivers.filter(d => d.approvalStatus === 'Approved' && d.status === 'Available').length > 0 ? (
                  drivers.filter(d => d.approvalStatus === 'Approved' && d.status === 'Available').map(driver => (
                    <motion.div 
                      key={driver.id}
                      whileHover={{ x: 5 }}
                      onClick={() => handleAssignDriver(driver)}
                      className="glass-card p-4 border-border hover:border-primary/40 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary text-xl group-hover:bg-primary group-hover:text-dark transition-all font-bold">
                          {driver.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-dark">{driver.name}</p>
                          <p className="text-[10px] text-muted uppercase font-bold tracking-widest">{driver.carType} • {driver.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">{driver.vehicleNumber}</p>
                        <div className="flex items-center gap-1 text-[8px] text-green-500 font-black uppercase">
                          <FaCheckCircle /> Ready
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted font-bold uppercase text-xs">No available drivers found</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Route Map Modal */}
      <AnimatePresence>
        {showMapModal && selectedBooking && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMapModal(false)}
              className="absolute inset-0 bg-dark/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="glass-card w-full max-w-4xl p-5 sm:p-8 relative z-10 border-2 border-primary/40 rounded-3xl shadow-2xl bg-surface"
            >
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-border">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-dark">
                    Live Route Overview
                  </h3>
                  <p className="text-xs text-muted font-bold">
                    {selectedBooking.pickup} → {selectedBooking.drop}
                  </p>
                </div>
                <button
                  onClick={() => setShowMapModal(false)}
                  className="w-9 h-9 rounded-full bg-dark/5 hover:bg-dark/10 flex items-center justify-center text-muted hover:text-dark transition-colors"
                >
                  <FaTimesCircle size={20} />
                </button>
              </div>

              <div className="h-[420px] rounded-2xl overflow-hidden relative">
                <RouteMap
                  pickup={selectedBooking.pickup}
                  drop={selectedBooking.drop}
                  routeCoords={selectedBooking.routeCoords}
                  distanceKm={selectedBooking.distance ? parseFloat(String(selectedBooking.distance).replace(/[^0-9.]/g, '')) : null}
                  showLayerToggle={true}
                />
              </div>

              <div className="mt-4 pt-4 border-t border-border flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="text-muted">Customer: <strong className="text-dark">{selectedBooking.customer}</strong></span>
                  <span className="text-muted">Fare: <strong className="text-primary font-black">₹{selectedBooking.fare}</strong></span>
                  <span className="text-muted">Status: <strong className="text-green-600 font-black">{selectedBooking.status}</strong></span>
                </div>
                <button
                  onClick={() => setShowMapModal(false)}
                  className="bg-primary text-dark font-black uppercase tracking-wider text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AdminDashboard;
