import React, { useState, useMemo, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  FaHeartbeat,
  FaCalendarCheck,
  FaNotesMedical,
  FaUserMd,
  FaHospital,
  FaAmbulance,
  FaPrescriptionBottleAlt,
  FaUserCircle,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaPhoneAlt
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from '../../components/common/LanguageToggle';

export const PatientLayout = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    if (mobileOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = useMemo(() => [
    {
      to: '/patient',
      label: t('portalNav.healthDashboard') || 'Health Dashboard',
      icon: <FaHeartbeat size={18} />,
      end: true
    },
    {
      to: '/patient/appointments',
      label: t('portalNav.myAppointments') || 'My Appointments',
      icon: <FaCalendarCheck size={18} />
    },
    {
      to: '/patient/records',
      label: t('portalNav.healthRecords') || t('portalNav.medicalRecords') || 'Health Records',
      icon: <FaNotesMedical size={18} />
    },
    {
      to: '/patient/prescriptions',
      label: t('portalNav.myPrescriptions') || 'My Prescriptions',
      icon: <FaPrescriptionBottleAlt size={18} />
    },
    {
      to: '/patient/doctors',
      label: t('portalNav.findDoctors') || 'Find Doctors',
      icon: <FaUserMd size={18} />
    },
    {
      to: '/patient/hospitals',
      label: t('portalNav.hospitalsClinics') || 'Hospitals & Clinics',
      icon: <FaHospital size={18} />
    },
    {
      to: '/patient/emergency',
      label: t('portalNav.emergencyServices') || 'Emergency Services',
      icon: <FaAmbulance size={18} />,
      badge: '24/7'
    },
    {
      to: '/patient/profile',
      label: t('portalNav.myProfile') || 'My Profile',
      icon: <FaUserCircle size={18} />
    },
  ], [t]);

  const activeNavItem = useMemo(() => {
    return navItems.find(item => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)) || navItems[0];
  }, [navItems, location.pathname]);

  const patientInitials = useMemo(() => {
    if (!user?.name) return 'P';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }, [user]);

  const sidebarWidth = collapsed ? '80px' : '270px';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F4F8FC' }}>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          role="presentation"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(16, 42, 67, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 45
          }}
          className="md:hidden"
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          backgroundColor: '#102A43',
          color: '#F0F4F8',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '4px 0 20px rgba(16, 42, 67, 0.12)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)'
        }}
        className="hidden md:flex"
      >
        {/* Brand Header */}
        <div style={{
          padding: collapsed ? '1.25rem 0.75rem' : '1.25rem 1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: '70px'
        }}>
          <Link
            to="/patient"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
              overflow: 'hidden'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #13B8A6 0%, #1677C8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(19, 184, 166, 0.35)',
              flexShrink: 0
            }}>
              <FaHeartbeat size={20} />
            </div>
            {!collapsed && (
              <div style={{ whiteSpace: 'nowrap' }}>
                <div style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF'
                }}>
                  MEDICONNECT
                </div>
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#13B8A6',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  Patient Portal
                </div>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#9FB3C8',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <FaChevronLeft size={11} />
            </button>
          )}
        </div>

        {/* Collapsed Expand Trigger */}
        {collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#13B8A6',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <FaChevronRight size={12} />
            </button>
          </div>
        )}

        {/* Patient Account Section */}
        {!collapsed ? (
          <div style={{
            padding: '1.15rem 1.25rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1677C8, #102A43)',
              border: '2px solid rgba(19, 184, 166, 0.6)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)'
            }}>
              {patientInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user?.name || 'Registered Patient'}
              </div>
              <div style={{
                fontSize: '0.72rem',
                color: '#829AB1',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: '0.25rem'
              }}>
                {user?.email || 'patient@mediconnect.com'}
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.15rem 0.5rem',
                backgroundColor: 'rgba(19, 184, 166, 0.15)',
                border: '1px solid rgba(19, 184, 166, 0.35)',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#13B8A6'
              }}>
                <FaCheckCircle size={9} />
                <span>{t('patientPortal.activePatient') || 'Verified Patient'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '0.85rem 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div
              title={`${user?.name || 'Patient'} (${user?.email || ''})`}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1677C8, #102A43)',
                border: '2px solid rgba(19, 184, 166, 0.6)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              {patientInitials}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav style={{
          padding: collapsed ? '1rem 0.5rem' : '1rem 0.75rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          overflowY: 'auto'
        }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'space-between',
                gap: '0.85rem',
                padding: collapsed ? '0.75rem 0' : '0.7rem 0.95rem',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#FFFFFF' : '#9FB3C8',
                backgroundColor: isActive ? 'rgba(22, 119, 200, 0.25)' : 'transparent',
                borderLeft: isActive ? '4px solid #13B8A6' : '4px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.18s ease'
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: location.pathname === item.to || (!item.end && location.pathname.startsWith(item.to)) ? '#13B8A6' : '#829AB1'
                }}>
                  {item.icon}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </div>

              {!collapsed && item.badge && (
                <span style={{
                  backgroundColor: '#DC5252',
                  color: '#FFFFFF',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.45rem',
                  borderRadius: '999px',
                  letterSpacing: '0.04em'
                }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer with Single Functional Sign Out */}
        <div style={{
          padding: collapsed ? '1rem 0.5rem' : '1rem 1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(10, 25, 41, 0.7)'
        }}>
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? (t('portalNav.signOut') || 'Sign Out') : undefined}
            style={{
              width: '100%',
              padding: collapsed ? '0.65rem 0' : '0.65rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              backgroundColor: 'rgba(220, 82, 82, 0.12)',
              border: '1px solid rgba(220, 82, 82, 0.28)',
              borderRadius: '10px',
              color: '#F87171',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
          >
            <FaSignOutAlt size={14} />
            {!collapsed && <span>{t('portalNav.signOut') || 'Sign Out'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Wrap */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{
          height: '68px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.75rem',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          boxShadow: '0 1px 3px rgba(16, 42, 67, 0.03)'
        }}>
          {/* Left: Mobile trigger & breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                color: '#243447',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '0.35rem'
              }}
              className="md:hidden"
              aria-label="Open Navigation Drawer"
            >
              <FaBars />
            </button>

            {/* Breadcrumbs (Desktop, Tablet, and Mobile) */}
            <nav
              aria-label="Breadcrumbs"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                overflow: 'hidden'
              }}
            >
              <Link
                to="/patient"
                style={{
                  fontSize: '0.85rem',
                  color: '#718096',
                  fontWeight: 600,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#1677C8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#718096'; }}
              >
                {t('portalNav.myHealth') || 'My Health'}
              </Link>
              <span style={{ color: '#CBD5E1', userSelect: 'none', fontSize: '0.85rem' }}>/</span>
              <span
                aria-current="page"
                style={{
                  fontSize: '0.90rem',
                  color: '#102A43',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {location.pathname === '/patient/records'
                  ? (t('portalNav.healthRecords') || 'Health Records')
                  : activeNavItem.label}
              </span>
            </nav>
          </div>

          {/* Right: Actions (LanguageToggle, Emergency Quick Action, User Badge) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Quick Emergency 108 Action */}
            <Link
              to="/patient/emergency"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.4rem 0.85rem',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '20px',
                color: '#DC5252',
                fontSize: '0.78rem',
                fontWeight: 800,
                textDecoration: 'none',
                transition: 'all 0.15s ease'
              }}
              className="hidden sm:flex"
            >
              <FaPhoneAlt size={10} />
              <span>108 Emergency</span>
            </Link>

            {/* Language Switcher */}
            <LanguageToggle size="sm" showIcon={false} />

            {/* User Avatar Chip */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              paddingLeft: '0.75rem',
              borderLeft: '1px solid #E2E8F0'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#1677C8',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem'
              }}>
                {patientInitials}
              </div>
              <div className="hidden lg:block">
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#102A43', lineHeight: 1.2 }}>
                  {user?.name || 'Patient'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#718096' }}>
                  {user?.email || 'patient@mediconnect.com'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '280px',
              backgroundColor: '#102A43',
              color: '#FFFFFF',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 25px rgba(0, 0, 0, 0.3)'
            }}
            className="md:hidden"
          >
            {/* Drawer Header */}
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #13B8A6, #1677C8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}>
                  <FaHeartbeat size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF' }}>MEDICONNECT</div>
                  <div style={{ fontSize: '0.65rem', color: '#13B8A6', fontWeight: 700 }}>Patient Portal</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9FB3C8',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
                aria-label="Close Drawer"
              >
                <FaTimes />
              </button>
            </div>

            {/* Mobile Account Details */}
            <div style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#1677C8',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800
              }}>
                {patientInitials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || 'Registered Patient'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#829AB1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Navigation links */}
            <nav style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.7rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#FFFFFF' : '#9FB3C8',
                    backgroundColor: isActive ? 'rgba(22, 119, 200, 0.25)' : 'transparent',
                    borderLeft: isActive ? '4px solid #13B8A6' : '4px solid transparent',
                    textDecoration: 'none'
                  })}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: location.pathname === item.to || (!item.end && location.pathname.startsWith(item.to)) ? '#13B8A6' : '#829AB1' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span style={{
                      backgroundColor: '#DC5252',
                      color: '#FFFFFF',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '999px'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Drawer Logout */}
            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'rgba(220, 82, 82, 0.15)',
                  border: '1px solid rgba(220, 82, 82, 0.3)',
                  borderRadius: '8px',
                  color: '#F87171',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <FaSignOutAlt size={14} />
                <span>{t('portalNav.signOut') || 'Sign Out'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Nested Content Outlet */}
        <main style={{ flex: 1, padding: '2rem 1.75rem', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
