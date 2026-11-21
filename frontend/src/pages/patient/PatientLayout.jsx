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
import { MediConnectBrand } from '../../components/common/MediConnectBrand';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

export const PatientLayout = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const { isCollapsed, toggleCollapse, sidebarWidth } = useSidebarCollapse();

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
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 998,
            backdropFilter: 'blur(2px)'
          }}
          aria-hidden="true"
        />
      )}

      {/* Patient Desktop & Mobile Off-Canvas Sidebar (240px Expanded <-> 70px Collapsed) */}
      <aside
        style={{
          width: sidebarWidth,
          backgroundColor: '#102A43',
          color: '#F0F4F8',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 999,
          transform: mobileOpen ? 'translateX(0)' : undefined,
          transition: 'width 0.22s ease, transform 0.25s ease',
          boxShadow: '4px 0 20px rgba(16, 42, 67, 0.15)',
          overflowY: 'auto',
          overflowX: isCollapsed ? 'visible' : 'hidden',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)'
        }}
        className={`portal-desktop-sidebar patient-sidebar ${isCollapsed ? 'is-collapsed portal-sidebar-is-collapsed' : ''}`}
      >
        {/* Brand Header */}
        <div style={{
          padding: isCollapsed ? '1rem 0.5rem' : '1.15rem 1.15rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          minHeight: '66px'
        }}>
          <MediConnectBrand
            to="/patient"
            theme="dark"
            size="sm"
            variant="sidebar"
            isCollapsed={isCollapsed}
            subtitle={isTelugu ? 'రోగి పోర్టల్' : 'Patient Portal'}
            badgeGradient="linear-gradient(135deg, #13B8A6 0%, #1677C8 100%)"
            badgeIcon={<FaHeartbeat size={18} />}
          />

          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={toggleCollapse}
                className="sidebar-edge-toggle-btn desktop-collapse-control"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <FaChevronLeft size={11} />
              </button>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="patient-mobile-close-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex'
                }}
                aria-label="Close navigation menu"
              >
                <FaTimes size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Collapsed Expand Trigger in Header */}
        {isCollapsed && (
          <div className="desktop-collapse-control" style={{ display: 'flex', justifyContent: 'center', padding: '0.45rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <button
              type="button"
              onClick={toggleCollapse}
              className="sidebar-edge-toggle-btn"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <FaChevronRight size={11} />
            </button>
          </div>
        )}

        {/* Patient Account Section */}
        {!isCollapsed ? (
          <div style={{
            padding: '1rem 1.15rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
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
              fontSize: '0.92rem',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)'
            }}>
              {patientInitials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user?.name || 'Registered Patient'}
              </div>
              <div style={{
                fontSize: '0.7rem',
                color: '#829AB1',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: '0.2rem'
              }}>
                {user?.email || 'patient@mediconnect.com'}
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.12rem 0.45rem',
                backgroundColor: 'rgba(19, 184, 166, 0.15)',
                border: '1px solid rgba(19, 184, 166, 0.35)',
                borderRadius: '999px',
                fontSize: '0.65rem',
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
            padding: '0.75rem 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div
              title={`${user?.name || 'Patient'} (${user?.email || ''})`}
              style={{
                width: '38px',
                height: '38px',
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
          padding: isCollapsed ? '0.75rem 0.4rem' : '0.85rem 0.75rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem',
          overflowY: 'auto',
          overflowX: isCollapsed ? 'visible' : 'hidden'
        }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              title={isCollapsed ? item.label : undefined}
              className="portal-sidebar-nav-item"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                gap: '0.75rem',
                padding: isCollapsed ? '0.7rem 0' : '0.65rem 0.85rem',
                borderRadius: '9px',
                fontSize: '0.86rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#FFFFFF' : '#9FB3C8',
                backgroundColor: isActive ? 'rgba(22, 119, 200, 0.25)' : 'transparent',
                borderLeft: isActive ? '3px solid #13B8A6' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.18s ease'
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: isCollapsed ? 'center' : 'flex-start', width: isCollapsed ? '100%' : 'auto', minWidth: 0, flex: 1 }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: location.pathname === item.to || (!item.end && location.pathname.startsWith(item.to)) ? '#13B8A6' : '#829AB1',
                  flexShrink: 0
                }}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="portal-nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
              </div>

              {!isCollapsed && item.badge && (
                <span style={{
                  backgroundColor: '#DC5252',
                  color: '#FFFFFF',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.12rem 0.42rem',
                  borderRadius: '999px',
                  letterSpacing: '0.04em'
                }}>
                  {item.badge}
                </span>
              )}

              {/* Floating Tooltip in Collapsed Mode */}
              <span className="portal-nav-tooltip">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer with Single Functional Sign Out */}
        <div style={{
          padding: isCollapsed ? '0.75rem 0.4rem' : '0.85rem 1.15rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'transparent'
        }}>
          <button
            type="button"
            onClick={handleLogout}
            title={isCollapsed ? (t('portalNav.signOut') || 'Sign Out') : undefined}
            style={{
              width: '100%',
              padding: isCollapsed ? '0.6rem 0' : '0.6rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(220, 82, 82, 0.12)',
              border: '1px solid rgba(220, 82, 82, 0.28)',
              borderRadius: '8px',
              color: '#F87171',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
          >
            <FaSignOutAlt size={13} />
            {!isCollapsed && <span>{t('portalNav.signOut') || 'Sign Out'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Wrap */}
      <div
        style={{
          flex: 1,
          marginLeft: sidebarWidth,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          transition: 'margin-left 0.22s ease'
        }}
        className="portal-main-content-wrap patient-main-wrap"
      >
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
              className="patient-mobile-trigger"
              style={{
                background: 'none',
                border: 'none',
                color: '#334155',
                cursor: 'pointer',
                padding: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Open Navigation"
            >
              <FaBars size={20} />
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

        {/* Dynamic Nested Content Outlet */}
        <main style={{ flex: 1, padding: '2rem 1.75rem', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .patient-sidebar {
            transform: translateX(-100%);
            width: 240px !important;
          }
          .patient-main-wrap {
            margin-left: 0 !important;
          }
          .patient-mobile-close-btn, .patient-mobile-trigger {
            display: flex !important;
          }
          .desktop-collapse-control {
            display: none !important;
          }
        }
        @media (min-width: 901px) {
          .patient-sidebar {
            transform: translateX(0) !important;
          }
          .patient-mobile-close-btn, .patient-mobile-trigger {
            display: none !important;
          }
          .desktop-collapse-control {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};
