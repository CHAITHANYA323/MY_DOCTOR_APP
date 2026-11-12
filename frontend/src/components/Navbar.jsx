import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from './common/LanguageToggle';
import { Button } from './common/Button';
import { 
  FaHospitalSymbol, 
  FaBars, 
  FaTimes, 
  FaSignOutAlt, 
  FaChevronDown,
  FaUserMd,
  FaHospital,
  FaStethoscope,
  FaCalendarCheck,
  FaInfoCircle,
  FaEnvelope,
  FaAmbulance,
  FaShieldAlt,
  FaUser
} from 'react-icons/fa';

/**
 * Universal responsive Navbar supporting guest, patient, and admin views.
 * Features an emergency 108 strip, desktop navigation, dropdown menus,
 * and an accessible mobile off-canvas drawer.
 */
export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/');
  };

  const closeMobile = () => {
    setMobileOpen(false);
    setMoreMenuOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreMenuOpen]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setMoreMenuOpen(false);
      }
    };
    if (mobileOpen || moreMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, moreMenuOpen]);

  return (
    <header className={`navbar-header ${isLoginPage ? 'navbar-login-compact' : ''}`}>
      {/* Main Navbar Bar */}
      <div className="container flex items-center justify-between navbar-main">
        {/* Logo / Brand Link */}
        <Link 
          to={isAuthenticated ? "/doctors" : "/"} 
          className="flex items-center gap-2" 
          onClick={closeMobile} 
          style={{ textDecoration: 'none' }}
          aria-label="MediConnect Healthcare Platform Home"
        >
          <div 
            className="navbar-brand-logo"
            style={{
              width: isLoginPage ? 42 : 54,
              height: isLoginPage ? 42 : 54,
              borderRadius: isLoginPage ? '12px' : '15px',
              background: 'linear-gradient(135deg, var(--primary, #0284c7), var(--primary-hover, #0369a1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: isLoginPage ? '0 4px 12px rgba(2, 132, 199, 0.3)' : '0 4px 16px rgba(2, 132, 199, 0.38)',
              flexShrink: 0
            }}
          >
            <FaHospitalSymbol size={isLoginPage ? 22 : 30} aria-hidden="true" />
          </div>
          <div>
            <span 
              className="navbar-brand-title"
              style={{ 
                fontSize: isLoginPage ? '1.35rem' : '1.6rem', 
                fontWeight: 900, 
                letterSpacing: '-0.025em', 
                color: 'var(--slate-900)', 
                lineHeight: 1.15 
              }}
            >
              Medi<span style={{ color: 'var(--primary, #0284c7)' }}>Connect</span>
            </span>
            <span 
              className="navbar-brand-sub"
              style={{ 
                display: 'block', 
                fontSize: isLoginPage ? '0.7rem' : '0.8rem', 
                fontWeight: 700, 
                color: 'var(--slate-500)', 
                marginTop: isLoginPage ? '-3px' : '-1px', 
                letterSpacing: '0.04em' 
              }}
            >
              Healthcare Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav 
          className="desktop-nav" 
          style={{ 
            gap: isLoginPage ? '1.15rem' : '1.6rem', 
            alignItems: 'center',
            flexWrap: 'nowrap'
          }}
        >
          {isAuthenticated ? (
            /* Authenticated Patient / Admin Navigation */
            <>
              <NavLink 
                to="/doctors" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                {t('nav.doctors')}
              </NavLink>

              <NavLink 
                to="/hospitals" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                {t('nav.hospitals')}
              </NavLink>

              <NavLink 
                to="/specializations" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                {t('nav.specializations')}
              </NavLink>

              <NavLink 
                to="/appointments" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                {t('nav.appointments')}
              </NavLink>

              {/* More Dropdown */}
              <div ref={moreMenuRef} style={{ position: 'relative' }}>
                <button 
                  type="button"
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  aria-expanded={moreMenuOpen}
                  aria-haspopup="true"
                  className="navbar-link"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    gap: '0.35rem'
                  }}
                >
                  {t('nav.more')} <FaChevronDown size={10} color="var(--slate-400)" aria-hidden="true" />
                </button>

                {moreMenuOpen && (
                  <div className="navbar-dropdown-menu" role="menu">
                    <Link 
                      to="/about" 
                      onClick={() => setMoreMenuOpen(false)}
                      className="navbar-dropdown-item"
                      role="menuitem"
                    >
                      <FaInfoCircle color="var(--primary)" aria-hidden="true" /> {t('nav.about')}
                    </Link>
                    <Link 
                      to="/contact" 
                      onClick={() => setMoreMenuOpen(false)}
                      className="navbar-dropdown-item"
                      role="menuitem"
                    >
                      <FaEnvelope color="var(--primary)" aria-hidden="true" /> {t('nav.contact')}
                    </Link>
                    <Link 
                      to="/ambulance" 
                      onClick={() => setMoreMenuOpen(false)}
                      className="navbar-dropdown-item"
                      style={{ color: 'var(--emergency)', fontWeight: 700 }}
                      role="menuitem"
                    >
                      <FaAmbulance color="var(--emergency)" aria-hidden="true" /> {t('nav.ambulance')}
                    </Link>
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        onClick={() => setMoreMenuOpen(false)}
                        className="navbar-dropdown-item"
                        style={{ color: 'var(--primary-dark)', fontWeight: 700, borderTop: '1px solid var(--slate-100)' }}
                        role="menuitem"
                      >
                        <FaShieldAlt color="var(--primary)" aria-hidden="true" /> {t('nav.adminPortal')}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Guest Public Navigation */
            <>
              <NavLink 
                to="/doctors" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                {t('nav.doctors')}
              </NavLink>
              <NavLink 
                to="/hospitals" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                {t('nav.hospitals')}
              </NavLink>
              <NavLink 
                to="/specializations" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                {t('nav.specializations')}
              </NavLink>
              <NavLink 
                to="/about" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                {t('nav.about')}
              </NavLink>
              <NavLink 
                to="/contact" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                {t('nav.contact')}
              </NavLink>
              <NavLink 
                to="/ambulance" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
                style={{ color: 'var(--emergency)' }}
              >
                {t('nav.ambulance')}
              </NavLink>
            </>
          )}
        </nav>

        {/* Right Section: Actions / Auth / Profile */}
        <div className={`flex items-center ${isLoginPage ? 'gap-2.5' : 'gap-3.5'}`}>
          {/* Universal Language Switcher */}
          <LanguageToggle size={isLoginPage ? "sm" : "md"} showIcon={false} />

          {isAuthenticated ? (
            /* Logged in User Pill & Logout */
            <div className="navbar-user-actions flex items-center gap-2.5">
              <Link 
                to="/profile"
                className="flex items-center gap-2"
                onClick={closeMobile}
                style={{
                  textDecoration: 'none',
                  padding: '0.45rem 0.95rem',
                  backgroundColor: 'var(--slate-100)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'var(--transition)'
                }}
                aria-label={`View profile for ${user?.name || 'User'}`}
              >
                <img 
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=0284c7&color=fff`} 
                  alt={user?.name || 'User'}
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} 
                />
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                  Hi, {user?.name?.split(' ')[0] || 'User'}
                </span>
              </Link>

              <Button 
                variant="secondary"
                size="sm"
                className="navbar-logout-btn"
                onClick={handleLogout}
                style={{
                  color: 'var(--emergency)',
                  borderColor: 'var(--slate-200)',
                  gap: '0.35rem',
                  minHeight: '44px',
                  padding: '0.45rem 0.95rem'
                }}
                title="Log out of your account"
                icon={<FaSignOutAlt aria-hidden="true" />}
              >
                {t('nav.logout')}
              </Button>
            </div>
          ) : (
            /* Guest Register CTA Button (Login removed) */
            <div className="navbar-guest-actions flex items-center">
              <Button 
                variant="primary" 
                size={isLoginPage ? "md" : "lg"} 
                onClick={() => navigate('/register')}
                style={{
                  fontWeight: 800,
                  fontSize: isLoginPage ? '0.94rem' : '1.02rem',
                  padding: isLoginPage ? '0.5rem 1.35rem' : '0.65rem 1.6rem',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: isLoginPage ? '0 4px 12px rgba(2, 132, 199, 0.3)' : '0 4px 14px rgba(2, 132, 199, 0.35)',
                  minHeight: isLoginPage ? '42px' : '48px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  whiteSpace: 'nowrap'
                }}
              >
                {t('nav.register')}
              </Button>
            </div>
          )}

          {/* Mobile Drawer Hamburger Button */}
          <button 
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="mobile-toggle-btn"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: isLoginPage ? 42 : 48,
              height: isLoginPage ? 42 : 48,
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--slate-200)',
              backgroundColor: 'var(--white)',
              color: 'var(--slate-800)',
              cursor: 'pointer'
            }}
          >
            {mobileOpen ? (
              <FaTimes size={isLoginPage ? 19 : 22} aria-hidden="true" />
            ) : (
              <FaBars size={isLoginPage ? 19 : 22} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay Backdrop */}
      {mobileOpen && (
        <div 
          className="navbar-mobile-backdrop" 
          onClick={closeMobile} 
          aria-hidden="true" 
        />
      )}

      {/* Mobile Off-Canvas Drawer */}
      {mobileOpen && (
        <div 
          className="navbar-mobile-drawer" 
          role="dialog" 
          aria-label="Mobile Navigation Menu"
        >
          {isAuthenticated ? (
            /* Authenticated Mobile Navigation Links */
            <>
              <NavLink to="/doctors" onClick={closeMobile} className="navbar-mobile-link">
                <FaUserMd color="var(--primary)" aria-hidden="true" /> {t('nav.doctors')}
              </NavLink>
              <NavLink to="/hospitals" onClick={closeMobile} className="navbar-mobile-link">
                <FaHospital color="var(--primary)" aria-hidden="true" /> {t('nav.hospitals')}
              </NavLink>
              <NavLink to="/specializations" onClick={closeMobile} className="navbar-mobile-link">
                <FaStethoscope color="var(--primary)" aria-hidden="true" /> {t('nav.specializations')}
              </NavLink>
              <NavLink to="/appointments" onClick={closeMobile} className="navbar-mobile-link">
                <FaCalendarCheck color="var(--primary)" aria-hidden="true" /> {t('nav.appointments')}
              </NavLink>
              <NavLink to="/about" onClick={closeMobile} className="navbar-mobile-link">
                <FaInfoCircle color="var(--slate-500)" aria-hidden="true" /> {t('nav.about')}
              </NavLink>
              <NavLink to="/contact" onClick={closeMobile} className="navbar-mobile-link">
                <FaEnvelope color="var(--slate-500)" aria-hidden="true" /> {t('nav.contact')}
              </NavLink>
              <NavLink to="/ambulance" onClick={closeMobile} className="navbar-mobile-link" style={{ color: 'var(--emergency)' }}>
                <FaAmbulance color="var(--emergency)" aria-hidden="true" /> {t('nav.ambulance')}
              </NavLink>
              <NavLink to="/profile" onClick={closeMobile} className="navbar-mobile-link" style={{ color: 'var(--primary-dark)' }}>
                <FaUser color="var(--primary)" aria-hidden="true" /> {t('nav.myProfile')} ({user?.name})
              </NavLink>

              {isAdmin && (
                <NavLink to="/admin" onClick={closeMobile} className="navbar-mobile-link" style={{ color: 'var(--primary-dark)', fontWeight: 800 }}>
                  <FaShieldAlt color="var(--primary)" aria-hidden="true" /> {t('nav.adminPortal')}
                </NavLink>
              )}

              <div style={{ borderTop: '1px solid var(--slate-200)', paddingTop: '0.85rem', marginTop: '0.5rem' }}>
                <Button 
                  variant="outline" 
                  fullWidth
                  onClick={handleLogout}
                  style={{ color: 'var(--emergency)', borderColor: 'var(--emergency)' }}
                  icon={<FaSignOutAlt aria-hidden="true" />}
                >
                  {t('nav.logout')}
                </Button>
              </div>
            </>
          ) : (
            /* Guest Mobile Navigation Links */
            <>
              <NavLink to="/doctors" onClick={closeMobile} className="navbar-mobile-link">
                <FaUserMd color="var(--primary)" aria-hidden="true" /> {t('nav.doctors')}
              </NavLink>
              <NavLink to="/hospitals" onClick={closeMobile} className="navbar-mobile-link">
                <FaHospital color="var(--primary)" aria-hidden="true" /> {t('nav.hospitals')}
              </NavLink>
              <NavLink to="/specializations" onClick={closeMobile} className="navbar-mobile-link">
                <FaStethoscope color="var(--primary)" aria-hidden="true" /> {t('nav.specializations')}
              </NavLink>
              <NavLink to="/about" onClick={closeMobile} className="navbar-mobile-link">
                <FaInfoCircle color="var(--slate-500)" aria-hidden="true" /> {t('nav.about')}
              </NavLink>
              <NavLink to="/contact" onClick={closeMobile} className="navbar-mobile-link">
                <FaEnvelope color="var(--slate-500)" aria-hidden="true" /> {t('nav.contact')}
              </NavLink>
              <NavLink to="/ambulance" onClick={closeMobile} className="navbar-mobile-link" style={{ color: 'var(--emergency)' }}>
                <FaAmbulance color="var(--emergency)" aria-hidden="true" /> {t('nav.ambulance')}
              </NavLink>

              <div style={{ borderTop: '1px solid var(--slate-200)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <Button 
                  variant="primary" 
                  fullWidth 
                  size="lg"
                  onClick={() => { closeMobile(); navigate('/register'); }}
                  style={{
                    minHeight: '48px',
                    fontSize: '1.02rem',
                    fontWeight: 800,
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  {t('nav.register')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
