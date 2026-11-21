import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  FaChartPie,
  FaBuilding,
  FaUserMd,
  FaClipboardList,
  FaCalendarCheck,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaHospitalSymbol,
  FaCheckCircle,
  FaPhoneAlt,
  FaAmbulance,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { ecosystemService } from '../../services/ecosystemService';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

export const HospitalAdminLayout = () => {
  const { user, logout } = useAuth();
  const { t, isTelugu } = useLanguage();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isCollapsed, toggleCollapse, sidebarWidth } = useSidebarCollapse();
  const [hospitalData, setHospitalData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchHospitalInfo = async () => {
      try {
        const res = await ecosystemService.getHospitalAdminDashboard();
        if (isMounted && res.success && res.hospital) {
          setHospitalData(res.hospital);
        }
      } catch (err) {
        console.warn('Could not load hospital banner info:', err);
      }
    };
    fetchHospitalInfo();
    return () => { isMounted = false; };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    if (sidebarOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Plain English navigation items for non-technical hospital administrators
  const navItems = useMemo(() => [
    {
      label: isTelugu ? 'హాస్పిటల్ అవలోకనం' : 'Hospital Overview',
      to: '/hospital-admin',
      icon: <FaChartPie aria-hidden="true" />,
      end: true
    },
    {
      label: isTelugu ? 'హాస్పిటల్ వివరాలు' : 'Hospital Details',
      to: '/hospital-admin/hospital',
      icon: <FaBuilding aria-hidden="true" />
    },
    {
      label: isTelugu ? 'వైద్యుల నిర్వహణ' : 'Manage Doctors',
      to: '/hospital-admin/doctors',
      icon: <FaUserMd aria-hidden="true" />
    },
    {
      label: isTelugu ? 'రిసెప్షన్ సిబ్బంది' : 'Manage Reception Staff',
      to: '/hospital-admin/receptionists',
      icon: <FaClipboardList aria-hidden="true" />
    },
    {
      label: isTelugu ? 'అపాయింట్‌మెంట్ల నిర్వహణ' : 'Manage Appointments',
      to: '/hospital-admin/appointments',
      icon: <FaCalendarCheck aria-hidden="true" />
    },
    {
      label: isTelugu ? 'హాస్పిటల్ నివేదికలు' : 'Hospital Reports',
      to: '/hospital-admin/reports',
      icon: <FaChartBar aria-hidden="true" />
    },
    {
      label: isTelugu ? 'నా ఖాతా & భద్రత' : 'My Account & Security',
      to: '/hospital-admin/profile',
      icon: <FaCog aria-hidden="true" />
    },
  ], [isTelugu]);

  const hospitalDisplayName = hospitalData?.name || user?.hospital_name || (isTelugu ? 'ఆసుపత్రి పరిపాలన' : 'Hospital Administration');
  const hospitalCity = hospitalData?.city || '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
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

      {/* Hospital Admin Sidebar (240px width with desktop collapse support) */}
      <aside
        style={{
          width: sidebarWidth,
          backgroundColor: '#0f172a', // Deep Slate/Navy
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 999,
          transform: sidebarOpen ? 'translateX(0)' : undefined,
          transition: 'width 0.22s ease, transform 0.25s ease',
          boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
          overflowY: 'auto',
          overflowX: isCollapsed ? 'visible' : 'hidden'
        }}
        className={`portal-desktop-sidebar hospital-admin-sidebar ${isCollapsed ? 'is-collapsed portal-sidebar-is-collapsed' : ''}`}
      >
        {/* Brand Header */}
        <div style={{
          padding: isCollapsed ? '1rem 0.5rem' : '1.1rem 1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          minHeight: '66px'
        }}>
          <Link
            to="/hospital-admin"
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}
            title="Hospital Admin Overview"
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #1d4ed8, #0d9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 3px 10px rgba(29, 78, 216, 0.35)',
              flexShrink: 0
            }}>
              <FaHospitalSymbol size={18} />
            </div>
            {!isCollapsed && (
              <div>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.15 }}>
                  Medi<span style={{ color: '#38bdf8' }}>Connect</span>
                </span>
                <span style={{ fontSize: '0.65rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  {isTelugu ? 'హాస్పిటల్ అడ్మిన్' : 'HOSPITAL ADMIN'}
                </span>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={toggleCollapse}
                className="sidebar-edge-toggle-btn"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <FaChevronLeft size={11} />
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md-hidden hospital-admin-mobile-close-btn"
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
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.45rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
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

        {/* Dynamic Hospital Badge in Sidebar (Hidden when collapsed) */}
        {!isCollapsed ? (
          <div style={{
            margin: '0.85rem 1rem',
            padding: '0.75rem 0.85rem',
            backgroundColor: 'rgba(30, 58, 138, 0.45)',
            border: '1px solid rgba(96, 165, 250, 0.25)',
            borderRadius: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
              <FaBuilding color="#38bdf8" size={12} />
              <span style={{ fontSize: '0.7rem', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {isTelugu ? 'కేటాయించిన ఆసుపత్రి' : 'Assigned Hospital'}
              </span>
            </div>
            <strong style={{ fontSize: '0.84rem', color: 'white', display: 'block', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hospitalDisplayName}
            </strong>
            {hospitalCity && (
              <span style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'block', marginTop: '0.15rem' }}>
                📍 {hospitalCity}
              </span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div
              title={hospitalDisplayName}
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'rgba(30, 58, 138, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <FaBuilding size={14} />
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav style={{ padding: isCollapsed ? '0.5rem 0.35rem' : '0.5rem 0.65rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem', overflowY: 'auto', overflowX: isCollapsed ? 'visible' : 'hidden' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              title={isCollapsed ? item.label : undefined}
              className="portal-sidebar-nav-item"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: '0.75rem',
                padding: isCollapsed ? '0.75rem 0' : '0.65rem 0.85rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.86rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'white' : '#cbd5e1',
                backgroundColor: isActive ? '#1d4ed8' : 'transparent',
                boxShadow: isActive ? '0 3px 10px rgba(29, 78, 216, 0.35)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              })}
            >
              <span style={{ fontSize: '1rem', display: 'flex', flexShrink: 0 }}>{item.icon}</span>
              {!isCollapsed && <span className="portal-nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}

              {/* Floating Tooltip in Collapsed Mode */}
              <span className="portal-nav-tooltip">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer / User Profile & Logout */}
        <div style={{
          padding: isCollapsed ? '0.75rem 0.35rem' : '0.9rem 1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'transparent'
        }}>
          {!isCollapsed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  backgroundColor: '#1d4ed8',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  flexShrink: 0
                }}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name || 'Hospital Admin'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <FaSignOutAlt />
                <span>{isTelugu ? 'లాగౌట్' : 'Sign Out'}</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.6rem 0',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              title="Sign Out"
            >
              <FaSignOutAlt size={14} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          marginLeft: sidebarWidth,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          transition: 'margin-left 0.22s ease'
        }}
        className="hospital-admin-main"
      >
        {/* Sticky Top Header with Prominent Hospital Identity */}
        <header style={{
          height: 64,
          backgroundColor: 'white',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(1rem, 2.5vw, 1.75rem)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="md-hidden hospital-admin-mobile-trigger"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.2rem',
                color: '#334155',
                cursor: 'pointer',
                padding: '6px'
              }}
              aria-label="Open navigation menu"
            >
              <FaBars />
            </button>

            {/* Prominent Hospital Name in Header */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{
                  fontSize: 'clamp(0.95rem, 1.8vw, 1.15rem)',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: 0,
                  letterSpacing: '-0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <span>{hospitalDisplayName}</span>
                  <span style={{ color: '#0d9488', fontSize: '0.85rem', fontWeight: 600 }}>– {isTelugu ? 'హాస్పిటల్ పోర్టల్' : 'Hospital Portal'}</span>
                </h1>
                <span style={{
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.12rem 0.45rem',
                  borderRadius: '100px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <FaCheckCircle size={9} /> {isTelugu ? 'ధృవీకరించబడింది' : 'Verified'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                {hospitalCity ? `📍 ${hospitalCity} | ` : ''}
                {isTelugu ? 'హాస్పిటల్ నిర్వాహకుల ప్యానెల్' : 'Hospital Management & Operations Panel'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {hospitalData?.emergency_number && (
              <div style={{
                display: 'none',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.28rem 0.65rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '0.78rem',
                fontWeight: 700
              }} className="lg-flex">
                <FaAmbulance size={12} /> <span>Emergency: {hospitalData.emergency_number}</span>
              </div>
            )}
            <LanguageToggle size="sm" />
          </div>
        </header>

        {/* Outlet for Nested Pages */}
        <main style={{ padding: 'clamp(1rem, 2vw, 1.75rem)', flex: 1 }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hospital-admin-sidebar {
            transform: translateX(-100%);
            width: 240px !important;
          }
          .hospital-admin-main {
            margin-left: 0 !important;
          }
          .md-hidden {
            display: flex !important;
          }
          .desktop-collapse-control {
            display: none !important;
          }
        }
        @media (min-width: 901px) {
          .hospital-admin-sidebar {
            transform: translateX(0) !important;
          }
          .md-hidden {
            display: none !important;
          }
          .desktop-collapse-control {
            display: block !important;
          }
        }
        @media (min-width: 1024px) {
          .lg-flex {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HospitalAdminLayout;
