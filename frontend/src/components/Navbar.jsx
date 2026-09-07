import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaHospitalSymbol, 
  FaUserMd, 
  FaHospital,
  FaNotesMedical,
  FaAmbulance, 
  FaCalendarCheck, 
  FaPhoneAlt, 
  FaBars, 
  FaTimes, 
  FaSignOutAlt, 
  FaUserCircle, 
  FaShieldAlt,
  FaChevronDown,
  FaInfoCircle,
  FaEnvelope
} from 'react-icons/fa';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
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

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 900,
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--slate-200)',
      boxShadow: 'var(--shadow-xs)'
    }}>
      {/* Top Emergency Strip (Only visible when logged in) */}
      {isAuthenticated && (
        <div style={{
          backgroundColor: '#991b1b',
          color: '#fee2e2',
          fontSize: '0.8rem',
          padding: '0.35rem 0',
          fontWeight: 600
        }}>
          <div className="container flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="flex items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
              <span>24/7 Medical Emergency Hotline:</span>
              <a href="tel:108" style={{ color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'underline' }}>
                <FaPhoneAlt size={10} /> Dial 108 Free
              </a>
            </div>
            <div>
              <Link to="/ambulance" style={{ color: '#fef08a', textDecoration: 'underline' }}>
                Request Ambulance Online &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <div className="container flex items-center justify-between" style={{ height: '74px' }}>
        {/* Logo: links to /doctors if logged in, / if not logged in */}
        <Link to={isAuthenticated ? "/doctors" : "/"} className="flex items-center gap-2" onClick={closeMobile} style={{ textDecoration: 'none' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
          }}>
            <FaHospitalSymbol size={24} />
          </div>
          <div>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--slate-900)' }}>
              Medi<span style={{ color: 'var(--primary)' }}>Connect</span>
            </span>
            <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--slate-500)', marginTop: '-4px' }}>
              Healthcare Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links (No Home section after authentication) */}
        <nav style={{ display: 'none', gap: '1.25rem', alignItems: 'center' }} className="desktop-nav">
          {/* PROTECTED NAVIGATION: ONLY VISIBLE AFTER LOGIN */}
          {isAuthenticated && (
            <>
              <NavLink 
                to="/doctors" 
                style={({ isActive }) => ({
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: isActive ? 'var(--primary)' : 'var(--slate-700)',
                  padding: '0.4rem 0.2rem',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent'
                })}
              >
                Find a Doctor
              </NavLink>

              <NavLink 
                to="/hospitals" 
                style={({ isActive }) => ({
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: isActive ? 'var(--primary)' : 'var(--slate-700)',
                  padding: '0.4rem 0.2rem',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent'
                })}
              >
                Hospitals
              </NavLink>

              <NavLink 
                to="/specializations" 
                style={({ isActive }) => ({
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: isActive ? 'var(--primary)' : 'var(--slate-700)',
                  padding: '0.4rem 0.2rem',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent'
                })}
              >
                Specialties
              </NavLink>

              <NavLink 
                to="/appointments" 
                style={({ isActive }) => ({
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: isActive ? 'var(--primary)' : 'var(--slate-700)',
                  padding: '0.4rem 0.2rem',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent'
                })}
              >
                Appointments
              </NavLink>

              {/* More Dropdown (Only after login) */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: 'var(--slate-700)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.2rem'
                  }}
                >
                  More <FaChevronDown size={11} color="var(--slate-400)" />
                </button>

                {moreMenuOpen && (
                  <div 
                    onMouseLeave={() => setMoreMenuOpen(false)}
                    style={{
                      position: 'absolute',
                      top: '110%',
                      left: 0,
                      width: '180px',
                      backgroundColor: 'white',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      border: '1px solid var(--slate-200)',
                      padding: '0.5rem 0',
                      zIndex: 950
                    }}
                  >
                    <Link 
                      to="/about" 
                      onClick={() => setMoreMenuOpen(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.9rem', color: 'var(--slate-700)', fontWeight: 600 }}
                    >
                      <FaInfoCircle color="var(--primary)" /> About Us
                    </Link>
                    <Link 
                      to="/contact" 
                      onClick={() => setMoreMenuOpen(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.9rem', color: 'var(--slate-700)', fontWeight: 600 }}
                    >
                      <FaEnvelope color="var(--primary)" /> Contact Us
                    </Link>
                    <Link 
                      to="/ambulance" 
                      onClick={() => setMoreMenuOpen(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.9rem', color: 'var(--emergency)', fontWeight: 700 }}
                    >
                      <FaAmbulance color="var(--emergency)" /> Ambulance 108
                    </Link>
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        onClick={() => setMoreMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.9rem', color: 'var(--primary-dark)', fontWeight: 700, borderTop: '1px solid var(--slate-100)' }}
                      >
                        <FaShieldAlt color="var(--primary)" /> Admin Portal
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Right Section: User Profile & Logout (When Logged In) */}
        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <div className="flex items-center gap-3">
              {/* User Name / Profile Link */}
              <Link 
                to="/profile"
                className="flex items-center gap-2"
                style={{
                  textDecoration: 'none',
                  padding: '0.4rem 0.85rem',
                  backgroundColor: 'var(--slate-100)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'all 0.2s ease'
                }}
              >
                <img 
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=0284c7&color=fff`} 
                  alt={user?.name}
                  style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} 
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                  Hi, {user?.name?.split(' ')[0] || 'User'}
                </span>
              </Link>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                style={{
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--emergency)',
                  borderColor: 'var(--slate-200)',
                  cursor: 'pointer'
                }}
                title="Log out of your account"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Mobile Toggle Button (Visible when authenticated) */}
          {isAuthenticated && (
            <button 
              onClick={() => setMobileOpen(!mobileOpen)}
              className="mobile-toggle-btn"
              aria-label="Open Navigation Menu"
              style={{
                display: 'flex',
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
              {mobileOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu (Authenticated) */}
      {mobileOpen && isAuthenticated && (
        <div style={{
          backgroundColor: 'var(--white)',
          borderBottom: '2px solid var(--slate-200)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: 'var(--shadow-xl)'
        }}>
          <NavLink to="/doctors" onClick={closeMobile} style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--slate-900)', fontSize: '1.05rem' }}>
            👨‍⚕️ Find a Doctor
          </NavLink>
          <NavLink to="/hospitals" onClick={closeMobile} style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--slate-900)', fontSize: '1.05rem' }}>
            🏥 Hospitals
          </NavLink>
          <NavLink to="/specializations" onClick={closeMobile} style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--slate-900)', fontSize: '1.05rem' }}>
            🩺 Specialties
          </NavLink>
          <NavLink to="/appointments" onClick={closeMobile} style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--slate-900)', fontSize: '1.05rem' }}>
            📅 Appointments
          </NavLink>
          <NavLink to="/about" onClick={closeMobile} style={{ padding: '0.6rem', fontWeight: 600, color: 'var(--slate-700)' }}>
            ℹ️ About Us
          </NavLink>
          <NavLink to="/contact" onClick={closeMobile} style={{ padding: '0.6rem', fontWeight: 600, color: 'var(--slate-700)' }}>
            ✉️ Contact Us
          </NavLink>
          <NavLink to="/ambulance" onClick={closeMobile} style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--emergency)' }}>
            🚑 Ambulance (108)
          </NavLink>
          <NavLink to="/profile" onClick={closeMobile} style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--primary)' }}>
            👤 My Profile ({user?.name})
          </NavLink>

          <div style={{ borderTop: '1px solid var(--slate-200)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <button 
              onClick={handleLogout} 
              className="btn btn-outline" 
              style={{ width: '100%', color: 'var(--emergency)', borderColor: 'var(--emergency)', justifyContent: 'center' }}
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 900px) {
          .desktop-nav { display: flex !important; }
          .mobile-toggle-btn { display: none !important; }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
