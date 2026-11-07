import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './common/Button';
import { 
  FaHospitalSymbol, 
  FaPhoneAlt, 
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);
  const navigate = useNavigate();

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
    <header className="navbar-header">
      {/* 24/7 Emergency Hotline Strip (Available for both Guests & Patients) */}
      <div className="navbar-emergency-strip">
        <div className="container flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="flex items-center gap-2 flex-wrap" style={{ flexWrap: 'wrap' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} aria-hidden="true" />
            <span>24/7 Medical Emergency Hotline:</span>
            <a 
              href="tel:108" 
              style={{ color: '#ffffff', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'underline' }}
              aria-label="Dial 108 Emergency Ambulance Hotline"
            >
              <FaPhoneAlt size={10} aria-hidden="true" /> Dial 108 Free
            </a>
          </div>
          <div>
            <Link 
              to="/ambulance" 
              style={{ color: '#fef08a', textDecoration: 'underline', fontWeight: 700 }}
              onClick={closeMobile}
            >
              Request Ambulance Online &rarr;
            </Link>
          </div>
        </div>
      </div>

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
          <div style={{
            width: 42,
            height: 42,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary, #0284c7), var(--primary-hover, #0369a1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
            flexShrink: 0
          }}>
            <FaHospitalSymbol size={22} aria-hidden="true" />
          </div>
          <div>
            <span style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--slate-900)' }}>
              Medi<span style={{ color: 'var(--primary, #0284c7)' }}>Connect</span>
            </span>
            <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--slate-500)', marginTop: '-4px' }}>
              Healthcare Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav" style={{ gap: '1.25rem', alignItems: 'center' }}>
          {isAuthenticated ? (
            /* Authenticated Patient / Admin Navigation */
            <>
              <NavLink 
                to="/doctors" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                Find a Doctor
              </NavLink>

              <NavLink 
                to="/hospitals" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                Hospitals
              </NavLink>

              <NavLink 
                to="/specializations" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                Specialties
              </NavLink>

              <NavLink 
                to="/appointments" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                Appointments
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
                  More <FaChevronDown size={10} color="var(--slate-400)" aria-hidden="true" />
                </button>

                {moreMenuOpen && (
                  <div className="navbar-dropdown-menu" role="menu">
                    <Link 
                      to="/about" 
                      onClick={() => setMoreMenuOpen(false)}
                      className="navbar-dropdown-item"
                      role="menuitem"
                    >
                      <FaInfoCircle color="var(--primary)" aria-hidden="true" /> About Us
                    </Link>
                    <Link 
                      to="/contact" 
                      onClick={() => setMoreMenuOpen(false)}
                      className="navbar-dropdown-item"
                      role="menuitem"
                    >
                      <FaEnvelope color="var(--primary)" aria-hidden="true" /> Contact Us
                    </Link>
                    <Link 
                      to="/ambulance" 
                      onClick={() => setMoreMenuOpen(false)}
                      className="navbar-dropdown-item"
                      style={{ color: 'var(--emergency)', fontWeight: 700 }}
                      role="menuitem"
                    >
                      <FaAmbulance color="var(--emergency)" aria-hidden="true" /> Ambulance 108
                    </Link>
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        onClick={() => setMoreMenuOpen(false)}
                        className="navbar-dropdown-item"
                        style={{ color: 'var(--primary-dark)', fontWeight: 700, borderTop: '1px solid var(--slate-100)' }}
                        role="menuitem"
                      >
                        <FaShieldAlt color="var(--primary)" aria-hidden="true" /> Admin Portal
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
                Find Doctors
              </NavLink>
              <NavLink 
                to="/hospitals" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                Hospitals
              </NavLink>
              <NavLink 
                to="/specializations" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                Specialties
              </NavLink>
              <NavLink 
                to="/about" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                About Us
              </NavLink>
              <NavLink 
                to="/contact" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                Contact
              </NavLink>
              <NavLink 
                to="/ambulance" 
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
                style={{ color: 'var(--emergency)' }}
              >
                Ambulance (108)
              </NavLink>
            </>
          )}
        </nav>

        {/* Right Section: Actions / Auth / Profile */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            /* Logged in User Pill & Logout */
            <div className="navbar-user-actions flex items-center gap-2">
              <Link 
                to="/profile"
                className="flex items-center gap-2"
                onClick={closeMobile}
                style={{
                  textDecoration: 'none',
                  padding: '0.35rem 0.75rem',
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
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} 
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--slate-800)' }}>
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
                  gap: '0.35rem'
                }}
                title="Log out of your account"
                icon={<FaSignOutAlt aria-hidden="true" />}
              >
                Logout
              </Button>
            </div>
          ) : (
            /* Guest Login / Register CTA Buttons */
            <div className="navbar-guest-actions flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => navigate('/register')}
              >
                Register
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
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-200)',
              backgroundColor: 'var(--white)',
              color: 'var(--slate-800)',
              cursor: 'pointer'
            }}
          >
            {mobileOpen ? <FaTimes size={18} aria-hidden="true" /> : <FaBars size={18} aria-hidden="true" />}
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
                <FaUserMd color="var(--primary)" aria-hidden="true" /> Find a Doctor
              </NavLink>
              <NavLink to="/hospitals" onClick={closeMobile} className="navbar-mobile-link">
                <FaHospital color="var(--primary)" aria-hidden="true" /> Hospitals
              </NavLink>
              <NavLink to="/specializations" onClick={closeMobile} className="navbar-mobile-link">
                <FaStethoscope color="var(--primary)" aria-hidden="true" /> Specialties
              </NavLink>
              <NavLink to="/appointments" onClick={closeMobile} className="navbar-mobile-link">
                <FaCalendarCheck color="var(--primary)" aria-hidden="true" /> Appointments
              </NavLink>
              <NavLink to="/about" onClick={closeMobile} className="navbar-mobile-link">
                <FaInfoCircle color="var(--slate-500)" aria-hidden="true" /> About Us
              </NavLink>
              <NavLink to="/contact" onClick={closeMobile} className="navbar-mobile-link">
                <FaEnvelope color="var(--slate-500)" aria-hidden="true" /> Contact Us
              </NavLink>
              <NavLink to="/ambulance" onClick={closeMobile} className="navbar-mobile-link" style={{ color: 'var(--emergency)' }}>
                <FaAmbulance color="var(--emergency)" aria-hidden="true" /> Ambulance (108)
              </NavLink>
              <NavLink to="/profile" onClick={closeMobile} className="navbar-mobile-link" style={{ color: 'var(--primary-dark)' }}>
                <FaUser color="var(--primary)" aria-hidden="true" /> My Profile ({user?.name})
              </NavLink>

              {isAdmin && (
                <NavLink to="/admin" onClick={closeMobile} className="navbar-mobile-link" style={{ color: 'var(--primary-dark)', fontWeight: 800 }}>
                  <FaShieldAlt color="var(--primary)" aria-hidden="true" /> Admin Portal
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
                  Logout
                </Button>
              </div>
            </>
          ) : (
            /* Guest Mobile Navigation Links */
            <>
              <NavLink to="/doctors" onClick={closeMobile} className="navbar-mobile-link">
                <FaUserMd color="var(--primary)" aria-hidden="true" /> Find Doctors
              </NavLink>
              <NavLink to="/hospitals" onClick={closeMobile} className="navbar-mobile-link">
                <FaHospital color="var(--primary)" aria-hidden="true" /> Hospitals
              </NavLink>
              <NavLink to="/specializations" onClick={closeMobile} className="navbar-mobile-link">
                <FaStethoscope color="var(--primary)" aria-hidden="true" /> Specialties
              </NavLink>
              <NavLink to="/about" onClick={closeMobile} className="navbar-mobile-link">
                <FaInfoCircle color="var(--slate-500)" aria-hidden="true" /> About Us
              </NavLink>
              <NavLink to="/contact" onClick={closeMobile} className="navbar-mobile-link">
                <FaEnvelope color="var(--slate-500)" aria-hidden="true" /> Contact Us
              </NavLink>
              <NavLink to="/ambulance" onClick={closeMobile} className="navbar-mobile-link" style={{ color: 'var(--emergency)' }}>
                <FaAmbulance color="var(--emergency)" aria-hidden="true" /> Ambulance Dispatch (108)
              </NavLink>

              <div style={{ borderTop: '1px solid var(--slate-200)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <Button 
                  variant="secondary" 
                  fullWidth 
                  onClick={() => { closeMobile(); navigate('/login'); }}
                >
                  Login
                </Button>
                <Button 
                  variant="primary" 
                  fullWidth 
                  onClick={() => { closeMobile(); navigate('/register'); }}
                >
                  Register
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
