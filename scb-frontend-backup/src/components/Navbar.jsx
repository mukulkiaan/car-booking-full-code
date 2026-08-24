import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FaCarSide, FaUserCircle, FaSignOutAlt, FaThLarge,
  FaClipboardList, FaUsers, FaCar, FaHistory, FaHeadset,
  FaWallet, FaTimes, FaBars, FaGlobe, FaMapMarkedAlt
} from 'react-icons/fa';
import AuthModal from './AuthModal';
import logo from '../../images/logo.png'

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const languages = [
    { code: 'en', label: 'English', flag: '🌐' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'nimadi', label: 'निमाड़ी', flag: '🌾' }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-dark/5 hover:bg-dark/10 border border-border px-3 py-2 rounded-xl transition-all text-sm font-bold text-dark"
      >
        <span className="text-primary text-base"><FaGlobe /></span>
        <span className="hidden sm:inline text-muted">{currentLang.label}</span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="text-[10px] text-muted">▼</motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-40 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden z-[60] backdrop-blur-xl"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  if (i18n.language !== lang.code) {
                    i18n.changeLanguage(lang.code);
                  }
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-all ${i18n.language === lang.code ? 'bg-primary text-dark' : 'text-muted hover:bg-dark/5'
                  }`}
              >
                <span>{lang.label}</span>
                {i18n.language === lang.code && <span className="text-[10px]">●</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Navbar = ({ user, logout, login, setAdminTab, setDriverTab, setCustomerTab, isAuthOpen, setIsAuthOpen }) => {
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const navigate = useNavigate();

  const menuItems = {
    superadmin: [
      { id: 'Manage Admins', label: 'Manage Admins', path: '/superadmin', icon: <FaThLarge /> },
    ],
    admin: [
      { id: 'Dashboard', label: t('nav.dashboard'), path: '/admin', icon: <FaThLarge /> },
      { id: 'Live Fleet', label: 'Live Tracking', path: '/admin', icon: <FaMapMarkedAlt /> },
      { id: 'Bookings', label: t('nav.bookings'), path: '/admin', icon: <FaClipboardList /> },
      { id: 'Customers', label: t('nav.customers'), path: '/admin', icon: <FaUsers /> },
      { id: 'Drivers', label: t('nav.drivers'), path: '/admin', icon: <FaUserCircle /> },
      { id: 'Cars', label: t('nav.cars'), path: '/admin', icon: <FaCar /> },
      { id: 'Payments', label: t('nav.payments'), path: '/admin', icon: <FaWallet /> },
      { id: 'Reports', label: t('nav.reports'), path: '/admin', icon: <FaClipboardList /> },
    ],
    customer: [
      { id: 'Dashboard', label: t('nav.dashboard'), path: '/book', icon: <FaThLarge /> },
      { id: 'Book Ride', label: t('nav.book_ride'), path: '/book', icon: <FaCarSide /> },
      { id: 'My Rides', label: t('nav.my_rides'), path: '/book', icon: <FaHistory /> },
      { id: 'Support', label: t('nav.support'), path: '/book', icon: <FaHeadset /> },
    ],
    driver: [
      { id: 'Dashboard', label: t('nav.dashboard'), path: '/driver', icon: <FaThLarge /> },
      { id: 'My Jobs', label: t('nav.my_jobs'), path: '/driver', icon: <FaClipboardList /> },
      { id: 'History', label: t('nav.history'), path: '/driver', icon: <FaHistory /> },
    ],
    guest: [
      { label: t('nav.home'), path: '/', icon: null },
      { label: t('nav.about'), path: '/about', icon: null },
      { label: t('nav.contact'), path: '/contact', icon: null },
    ]
  };

  const activeRole = user ? user.role : 'guest';
  const currentMenu = menuItems[activeRole];

  const handleNavClick = (item) => {
    if (user?.role === 'admin') setAdminTab(item.id);
    if (user?.role === 'driver') setDriverTab(item.id);
    if (user?.role === 'customer') setCustomerTab(item.id);
    navigate(item.path);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="max-w-[1480px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setIsMobileMenuOpen(false)}>
            <img className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20 object-contain p-0.5" src={logo} alt="logo" />
            <span className="text-lg font-black tracking-tighter uppercase text-dark">
              Safar<span className="text-primary">Setu</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2 xl:gap-3 text-xs xl:text-sm font-bold flex-nowrap shrink-0 overflow-x-auto custom-scrollbar">
            {currentMenu.map((item, index) => (
              <button
                key={index}
                onClick={() => handleNavClick(item)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-dark/5 hover:text-primary transition-all text-muted whitespace-nowrap shrink-0"
              >
                {item.icon && <span className="text-primary text-xs shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}

            <div className="flex items-center gap-2 ml-1 xl:ml-3 shrink-0">
              <LanguageSwitcher />

              {user ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={logout}
                  className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white border border-red-500/20 px-3.5 py-2 rounded-xl transition-all font-black text-xs shrink-0 whitespace-nowrap"
                >
                  <FaSignOutAlt />
                  <span>{t('nav.logout')}</span>
                </motion.button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }}
                    className="flex items-center gap-1.5 bg-primary text-dark px-4 py-2 rounded-xl transition-all font-black shadow-md shadow-primary/20 text-xs shrink-0 whitespace-nowrap"
                  >
                    <FaUserCircle className="text-sm" />
                    <span>{t('nav.login')}</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setAuthMode('signup'); setIsAuthOpen(true); }}
                    className="flex items-center gap-2 bg-dark text-white px-5 py-2.5 rounded-xl transition-all font-bold shadow-lg text-sm"
                  >
                    {t('nav.signup')}
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: hamburger */}
          <div className="flex md:hidden items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            {!user && (
              <button
                onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }}
                className="w-9 h-9 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-center text-primary"
              >
                <FaUserCircle className="text-lg" />
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-9 h-9 bg-dark/5 border border-border rounded-xl flex items-center justify-center text-dark"
            >
              {isMobileMenuOpen ? <FaTimes className="text-lg" /> : <FaBars className="text-lg" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed top-0 right-0 h-full w-72 bg-surface border-l border-border z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <FaCarSide className="text-dark text-sm" />
                  </div>
                  <span className="font-bold tracking-tighter uppercase text-sm text-dark">
                    Safar<span className="text-primary">Setu</span>
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 bg-dark/5 rounded-lg flex items-center justify-center text-muted hover:text-dark"
                >
                  <FaTimes />
                </button>
              </div>

              {/* User badge */}
              {user && (
                <div className="mx-4 mt-4 p-3 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                    <FaUserCircle className="text-lg" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-dark uppercase tracking-widest">{t(`nav.${user.role}`)}</p>
                    <p className="text-[10px] text-muted font-medium">{user.phone}</p>
                  </div>
                </div>
              )}

              {/* Nav Links */}
              <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {currentMenu.map((item, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleNavClick(item)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-muted hover:text-primary hover:bg-primary/5 transition-all text-left font-medium text-sm"
                  >
                    {item.icon && <span className="text-primary text-sm shrink-0">{item.icon}</span>}
                    {item.label}
                  </motion.button>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-border space-y-3">
                {user ? (
                  <button
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-4 py-3 rounded-xl transition-all font-bold text-sm"
                  >
                    <FaSignOutAlt />
                    {t('nav.logout')}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAuthMode('login'); setIsAuthOpen(true); setIsMobileMenuOpen(false); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary text-dark px-4 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 text-sm"
                    >
                      <FaUserCircle />
                      {t('nav.login')}
                    </button>
                    <button
                      onClick={() => { setAuthMode('signup'); setIsAuthOpen(true); setIsMobileMenuOpen(false); }}
                      className="flex-1 flex items-center justify-center gap-2 bg-dark text-white px-4 py-3 rounded-xl font-bold shadow-lg text-sm"
                    >
                      {t('nav.signup')}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={login}
        initialMode={authMode}
      />
    </>
  );
};

export default Navbar;
