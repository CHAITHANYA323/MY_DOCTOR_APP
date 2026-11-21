import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  FaChartPie,
  FaUserFriends,
  FaUserMd,
  FaStethoscope,
  FaCalendarCheck,
  FaChartBar,
  FaAmbulance,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaHospitalSymbol,
  FaArrowLeft,
  FaBuilding,
  FaQuestionCircle,
  FaUserTie,
  FaExchangeAlt,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { FirstTimeGuideModal } from '../../components/common/FirstTimeGuideModal';
import { ecosystemService } from '../../services/ecosystemService';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

export const SuperAdminLayout = () => {
  const { user, hospitalName, hospitalId, logout } = useAuth();
  const { t, isTelugu } = useLanguage();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { isCollapsed, toggleCollapse, sidebarWidth } = useSidebarCollapse();

  // Multi-hospital assignment state
  const [assignedHospitals, setAssignedHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [loadingHospitals, setLoadingHospitals] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loadAssignedHospitals = useCallback(async () => {
    setLoadingHospitals(true);
    try {
      const res = await ecosystemService.getSuperadminAssignedHospitals();
      if (res.success && Array.isArray(res.hospitals)) {
        setAssignedHospitals(res.hospitals);
      }
    } catch (err) {
      console.warn('Failed to load assigned hospitals for SuperAdmin:', err);
    } finally {
      setLoadingHospitals(false);
    }
  }, []);

  useEffect(() => {
    loadAssignedHospitals();
  }, [loadAssignedHospitals]);

  // Check first-time tour on initial mount
  useEffect(() => {
    try {
      const seen = localStorage.getItem('mediconnect_superadmin_tour_seen');
      if (!seen) {
        setGuideOpen(true);
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  // Close mobile sidebar on Escape key
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

  const navItems = useMemo(() => [
    { label: t('superAdminPortal.nav.dashboard'), to: '/superadmin', icon: <FaChartPie aria-hidden="true" />, end: true },
    { label: t('superAdminPortal.nav.hospitalAdmins') || (isTelugu ? 'ఆసుపత్రి నిర్వాహకులు' : 'Hospital Admins'), to: '/superadmin/hospital-admins', icon: <FaUserTie aria-hidden="true" /> },
    { label: t('superAdminPortal.nav.staff'), to: '/superadmin/staff', icon: <FaUserFriends aria-hidden="true" /> },
    { label: t('superAdminPortal.nav.doctors'), to: '/superadmin/doctors', icon: <FaUserMd aria-hidden="true" /> },
    { label: t('superAdminPortal.nav.departments'), to: '/superadmin/departments', icon: <FaStethoscope aria-hidden="true" /> },
    { label: t('superAdminPortal.nav.appointments'), to: '/superadmin/appointments', icon: <FaCalendarCheck aria-hidden="true" /> },
    { label: t('superAdminPortal.nav.reports'), to: '/superadmin/reports', icon: <FaChartBar aria-hidden="true" /> },
    { label: t('superAdminPortal.nav.ambulances'), to: '/superadmin/ambulances', icon: <FaAmbulance aria-hidden="true" /> },
    { label: t('superAdminPortal.nav.settings'), to: '/superadmin/settings', icon: <FaCog aria-hidden="true" /> },
  ], [t, isTelugu]);

  const guideSteps = useMemo(() => [
    {
      title: t('superAdminPortal.guideTour.step1Title'),
      description: t('superAdminPortal.guideTour.step1Desc'),
      icon: <FaChartPie />,
      colorBg: '#e0f2fe',
      colorFg: '#0284c7',
      tip: 'The dashboard updates automatically with live consultation volume and staffing figures across all assigned hospitals.'
    },
    {
      title: isTelugu ? 'ఆసుపత్రి నిర్వాహకుల నిర్వహణ' : 'Hospital Administrators Governance',
      description: isTelugu ? 'ప్రతి ఆసుపత్రికి ప్రధాన అడ్మిన్‌ను నియమించండి మరియు వారి కార్యకలాపాలను సమీక్షించండి.' : 'Designate and replace Primary Hospital Administrators for each assigned institution with full institutional audit trails.',
      icon: <FaUserTie />,
      colorBg: '#fef3c7',
      colorFg: '#b45309',
      tip: 'Ensure each hospital branch has an active Primary Administrator assigned.'
    },
    {
      title: t('superAdminPortal.guideTour.step2Title'),
      description: t('superAdminPortal.guideTour.step2Desc'),
      icon: <FaCog />,
      colorBg: '#fef3c7',
      colorFg: '#b45309',
      tip: 'Make sure your hospital phone number and 24/7 operating hours are verified so patients can reach emergency desks.'
    },
    {
      title: t('superAdminPortal.guideTour.step3Title'),
      description: t('superAdminPortal.guideTour.step3Desc'),
      icon: <FaUserMd />,
      colorBg: '#dcfce7',
      colorFg: '#15803d',
      tip: 'All staff accounts created or invited here are strictly bound to your assigned hospital branch.'
    },
    {
      title: t('superAdminPortal.guideTour.step5Title'),
      description: t('superAdminPortal.guideTour.step5Desc'),
      icon: <FaCalendarCheck />,
      colorBg: '#ccfbf1',
      colorFg: '#0f766e',
      tip: 'Filter appointments by status: Pending, Confirmed, Checked In, or Completed.'
    },
    {
      title: t('superAdminPortal.guideTour.step6Title'),
      description: t('superAdminPortal.guideTour.step6Desc'),
      icon: <FaChartBar />,
      colorBg: '#fee2e2',
      colorFg: '#b91c1c',
      tip: 'Print and archive monthly operational reports directly from the Hospital Reports tab.'
    }
  ], [t, isTelugu]);

  // Active hospital label computation
  const activeHospitalDisplay = useMemo(() => {
    if (selectedHospitalId) {
      const match = assignedHospitals.find(h => String(h.id) === String(selectedHospitalId));
      if (match) return match.name;
    }
    if (assignedHospitals.length > 0) {
      return isTelugu
        ? `అన్ని కేటాయించబడిన ఆసుపత్రులు (${assignedHospitals.length})`
        : `All Assigned Hospitals (${assignedHospitals.length})`;
    }
    return hospitalName || user?.hospital_name || (hospitalId ? `Hospital Branch #${hospitalId}` : 'Assigned Hospitals');
  }, [selectedHospitalId, assignedHospitals, hospitalName, user?.hospital_name, hospitalId, isTelugu]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--slate-50)' }}>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          role="presentation"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 998,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* Sidebar: Deep Teal / Slate styling (240px Expanded <-> 70px Collapsed) */}
      <aside
        style={{
          width: sidebarWidth,
          backgroundColor: '#0f2937', // Deep teal-slate
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 999,
          transform: sidebarOpen ? 'translateX(0)' : undefined,
          transition: 'width 0.22s ease, transform 0.25s ease',
          boxShadow: 'var(--shadow-xl)',
          overflowY: 'auto',
          overflowX: isCollapsed ? 'visible' : 'hidden'
        }}
        className={`portal-desktop-sidebar superadmin-sidebar ${isCollapsed ? 'portal-sidebar-is-collapsed' : ''}`}
      >
        {/* Brand Header */}
        <div style={{
          padding: isCollapsed ? '1rem 0.5rem' : '1.15rem 1.15rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          minHeight: '66px'
        }}>
          <Link to="/superadmin" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none', color: 'white', overflow: 'hidden' }} title="Hospital SuperAdmin Portal">
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '9px',
              backgroundColor: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0
            }}>
              <FaHospitalSymbol size={18} />
            </div>
            {!isCollapsed && (
              <div>
                <span style={{ fontWeight: 800, fontSize: '1.02rem', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.15 }}>
                  MEDICONNECT
                </span>
                <span style={{ fontSize: '0.66rem', color: '#7dd3fc', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {t('superAdminPortal.nav.badge')}
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
                type="button"
                onClick={() => setSidebarOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--slate-400)',
                  cursor: 'pointer',
                  padding: '0.35rem'
                }}
                className="mobile-close-btn"
                aria-label="Close navigation sidebar"
              >
                <FaTimes size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Collapsed Expand Trigger in Header */}
        {isCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.45rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
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

        {/* Assigned Hospital Badge / Quick Switcher in Sidebar */}
        {!isCollapsed ? (
          <div style={{
            margin: '0.85rem 1rem 0.35rem',
            padding: '0.65rem 0.85rem',
            backgroundColor: 'rgba(2, 132, 199, 0.15)',
            border: '1px solid rgba(2, 132, 199, 0.3)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FaBuilding color="#38bdf8" size={14} style={{ flexShrink: 0 }} />
            <div style={{ overflow: 'hidden', width: '100%' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                {t('superAdminPortal.nav.assignedHospital')}:
              </span>
              <span style={{ fontSize: '0.8rem', color: '#e0f2fe', fontWeight: 700, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeHospitalDisplay}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div
              title={activeHospitalDisplay}
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                backgroundColor: 'rgba(2, 132, 199, 0.15)',
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

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: isCollapsed ? '0.75rem 0.4rem' : '0.75rem 0.65rem', overflowY: 'auto', overflowX: isCollapsed ? 'visible' : 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
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
                  padding: isCollapsed ? '0.7rem 0' : '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 700 : 500,
                  textDecoration: 'none',
                  color: isActive ? 'white' : 'var(--slate-300)',
                  backgroundColor: isActive ? '#0284c7' : 'transparent',
                  transition: 'all 0.15s ease'
                })}
              >
                <span style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="portal-nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}

                {/* Floating Tooltip in Collapsed Mode */}
                <span className="portal-nav-tooltip">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div style={{
          padding: isCollapsed ? '0.75rem 0.4rem' : '1.15rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'transparent'
        }}>
          {!isCollapsed ? (
            <>
              {/* Guide Quick Access */}
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: '0.85rem',
                  transition: 'background 0.15s ease'
                }}
              >
                <FaQuestionCircle size={13} /> {t('superAdminPortal.nav.helpGuide')}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <img
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'SuperAdmin')}&background=0284c7&color=fff`}
                  alt={user?.name || 'Super Admin'}
                  style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0284c7', flexShrink: 0 }}
                />
                <div style={{ overflow: 'hidden' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.84rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.name || 'Super Admin'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--slate-400)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.email}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <Link
                  to="/"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--slate-300)',
                    textDecoration: 'none',
                    fontSize: '0.76rem',
                    fontWeight: 600
                  }}
                >
                  <FaArrowLeft size={10} /> {t('superAdminPortal.nav.publicPortal')}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: 'none',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <FaSignOutAlt size={11} /> {t('superAdminPortal.nav.signOut')}
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                title={t('superAdminPortal.nav.helpGuide')}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <FaQuestionCircle size={14} />
              </button>
              <img
                src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'SuperAdmin')}&background=0284c7&color=fff`}
                alt={user?.name || 'Super Admin'}
                title={user?.name || 'Super Admin'}
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0284c7' }}
              />
              <button
                type="button"
                onClick={handleLogout}
                title={t('superAdminPortal.nav.signOut')}
                style={{
                  width: '100%',
                  padding: '0.45rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <FaSignOutAlt size={13} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          marginLeft: sidebarWidth,
          transition: 'margin-left 0.22s ease'
        }}
        className="portal-main-content-wrap superadmin-main-wrap"
      >
        {/* Top Header with Interactive Hospital Switcher */}
        <header style={{
          height: '64px',
          backgroundColor: 'white',
          borderBottom: '1px solid var(--slate-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                color: 'var(--slate-700)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              className="mobile-menu-trigger superadmin-mobile-trigger"
              aria-label="Open navigation menu"
            >
              <FaBars />
            </button>

            {/* Hospital Switcher Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaBuilding color="#0284c7" size={15} />
              {assignedHospitals.length > 1 ? (
                <select
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer'
                  }}
                  aria-label="Filter by assigned hospital"
                >
                  <option value="">
                    {isTelugu ? 'అన్ని కేటాయించబడిన ఆసుపత్రులు' : 'All Assigned Hospitals'} ({assignedHospitals.length})
                  </option>
                  {assignedHospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city})
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                  {activeHospitalDisplay}
                </span>
              )}
              <span style={{
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '12px'
              }}>
                {t('superAdminPortal.nav.badge')}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: 'var(--slate-700)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <FaQuestionCircle color="#0284c7" />
              <span>{t('superAdminPortal.nav.helpGuide')}</span>
            </button>
            <LanguageToggle size="sm" showIcon={false} />
          </div>
        </header>

        {/* Content Outlet with Context Sharing */}
        <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          <Outlet context={{
            selectedHospitalId,
            setSelectedHospitalId,
            assignedHospitals,
            refreshAssignedHospitals: loadAssignedHospitals
          }} />
        </main>
      </div>

      {/* Guided Walkthrough Modal */}
      <FirstTimeGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        title={t('superAdminPortal.guideTour.guideTitle')}
        subtitle={t('superAdminPortal.guideTour.guideSubtitle')}
        steps={guideSteps}
        storageKey="mediconnect_superadmin_tour_seen"
        btnNextText={t('superAdminPortal.guideTour.btnNext')}
        btnPrevText={t('superAdminPortal.guideTour.btnPrev')}
        btnFinishText={t('superAdminPortal.guideTour.btnFinish')}
        btnSkipText={t('superAdminPortal.guideTour.btnSkip')}
      />

      <style>{`
        @media (max-width: 900px) {
          .superadmin-sidebar {
            transform: translateX(-100%);
            width: 240px !important;
          }
          .superadmin-main-wrap {
            margin-left: 0 !important;
          }
          .mobile-close-btn, .mobile-menu-trigger {
            display: flex !important;
          }
        }
        @media (min-width: 901px) {
          .superadmin-sidebar {
            transform: translateX(0) !important;
          }
          .mobile-close-btn, .mobile-menu-trigger {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SuperAdminLayout;
