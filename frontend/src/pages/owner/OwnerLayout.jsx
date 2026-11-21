import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  FaChartPie,
  FaHospital,
  FaEnvelopeOpenText,
  FaHistory,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaShieldAlt,
  FaUserShield,
  FaUserTie,
  FaArrowLeft,
  FaQuestionCircle,
  FaBuilding,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { FirstTimeGuideModal } from '../../components/common/FirstTimeGuideModal';
import { MediConnectBrand } from '../../components/common/MediConnectBrand';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

export const OwnerLayout = () => {
  const { user, logout } = useAuth();
  const { t, isTelugu } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { isCollapsed, toggleCollapse, sidebarWidth } = useSidebarCollapse();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check first-time tour on initial mount
  useEffect(() => {
    try {
      const seen = localStorage.getItem('mediconnect_owner_tour_seen');
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
    { label: t('ownerPortal.nav.dashboard'), to: '/owner', icon: <FaChartPie aria-hidden="true" />, end: true },
    { label: t('ownerPortal.nav.superadmins') || (isTelugu ? 'సూపర్ అడ్మిన్లు' : 'SuperAdmins'), to: '/owner/superadmins', icon: <FaUserShield aria-hidden="true" /> },
    { label: t('ownerPortal.nav.hospitalAdmins') || (isTelugu ? 'ఆసుపత్రి నిర్వాహకులు' : 'Hospital Admins'), to: '/owner/hospital-admins', icon: <FaUserTie aria-hidden="true" /> },
    { label: t('ownerPortal.nav.hospitals'), to: '/owner/hospitals', icon: <FaHospital aria-hidden="true" /> },
    { label: t('ownerPortal.nav.invitations'), to: '/owner/invitations', icon: <FaEnvelopeOpenText aria-hidden="true" /> },
    { label: t('ownerPortal.nav.auditLogs'), to: '/owner/audit-logs', icon: <FaHistory aria-hidden="true" /> },
  ], [t, isTelugu]);

  // Derive current page title dynamically from route
  const currentPageTitle = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/owner/superadmins')) return t('ownerPortal.nav.superadmins') || (isTelugu ? 'సూపర్ అడ్మిన్లు' : 'SuperAdmins');
    if (path.startsWith('/owner/hospital-admins')) return t('ownerPortal.nav.hospitalAdmins') || (isTelugu ? 'ఆసుపత్రి నిర్వాహకులు' : 'Hospital Admins');
    if (path.startsWith('/owner/hospitals')) return t('ownerPortal.nav.hospitals');
    if (path.startsWith('/owner/invitations')) return t('ownerPortal.nav.invitations');
    if (path.startsWith('/owner/audit-logs')) return t('ownerPortal.nav.auditLogs');
    return t('ownerPortal.nav.dashboard');
  }, [location.pathname, t, isTelugu]);

  const guideSteps = useMemo(() => [
    {
      title: t('ownerPortal.guideTour.step1Title'),
      description: t('ownerPortal.guideTour.step1Desc'),
      icon: <FaChartPie />,
      colorBg: '#e0f2fe',
      colorFg: '#0284c7',
      tip: 'The platform dashboard tracks real-time healthcare activity across all 24 verified hospital institutions in AP & Telangana.'
    },
    {
      title: t('ownerPortal.guideTour.step2Title'),
      description: t('ownerPortal.guideTour.step2Desc'),
      icon: <FaHospital />,
      colorBg: '#fef3c7',
      colorFg: '#b45309',
      tip: 'New hospital onboarding requests require your explicit verification and review before joining the network.'
    },
    {
      title: t('ownerPortal.guideTour.step3Title'),
      description: t('ownerPortal.guideTour.step3Desc'),
      icon: <FaBuilding />,
      colorBg: '#dcfce7',
      colorFg: '#15803d',
      tip: 'Hospitals are grouped geographically by state (Andhra Pradesh & Telangana) and city.'
    },
    {
      title: t('ownerPortal.guideTour.step4Title'),
      description: t('ownerPortal.guideTour.step4Desc'),
      icon: <FaEnvelopeOpenText />,
      colorBg: '#f3e8ff',
      colorFg: '#7e22ce',
      tip: 'Generated invitations are cryptographically secure single-use links that expire once claimed by a hospital leader.'
    },
    {
      title: t('ownerPortal.guideTour.step5Title'),
      description: t('ownerPortal.guideTour.step5Desc'),
      icon: <FaHistory />,
      colorBg: '#fee2e2',
      colorFg: '#b91c1c',
      tip: 'Audit logs provide an immutable timeline of system events, logins, and administrative actions without exposing secrets.'
    }
  ], [t]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
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

      {/* Sidebar: Deep Slate / Navy styling (240px Expanded <-> 70px Collapsed) */}
      <aside
        style={{
          width: sidebarWidth,
          backgroundColor: '#0f172a',
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
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          overflowY: 'auto',
          overflowX: isCollapsed ? 'visible' : 'hidden'
        }}
        className={`portal-desktop-sidebar owner-sidebar ${isCollapsed ? 'portal-sidebar-is-collapsed' : ''}`}
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
          <MediConnectBrand
            to="/owner"
            theme="dark"
            size="sm"
            variant="sidebar"
            isCollapsed={isCollapsed}
            subtitle={t('ownerPortal.nav.badge') || 'Platform Owner'}
            badgeIcon={<FaShieldAlt size={18} />}
          />

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
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '0.35rem'
                }}
                className="mobile-close-btn owner-mobile-close-btn"
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

        {/* Global Scope Indicator Badge */}
        {!isCollapsed ? (
          <div style={{
            margin: '0.85rem 1rem 0.35rem',
            padding: '0.65rem 0.85rem',
            backgroundColor: 'rgba(2, 132, 199, 0.15)',
            border: '1px solid rgba(2, 132, 199, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#38bdf8', flexShrink: 0 }} />
            <span style={{ fontSize: '0.76rem', color: '#e0f2fe', fontWeight: 700 }}>
              {t('ownerPortal.nav.scope')}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div
              title={t('ownerPortal.nav.scope')}
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
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#38bdf8' }} />
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
                  borderRadius: '8px',
                  fontSize: '0.86rem',
                  fontWeight: isActive ? 700 : 500,
                  textDecoration: 'none',
                  color: isActive ? 'white' : '#cbd5e1',
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
              {/* Guide Quick Access Button */}
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
                  borderRadius: '8px',
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
                <FaQuestionCircle size={13} /> {t('ownerPortal.nav.helpGuide')}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <img
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Owner')}&background=0284c7&color=fff`}
                  alt={user?.name || 'Platform Owner'}
                  style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0284c7', flexShrink: 0 }}
                />
                <div style={{ overflow: 'hidden' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.86rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.name || 'Platform Owner'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    textDecoration: 'none',
                    fontSize: '0.76rem',
                    fontWeight: 600
                  }}
                >
                  <FaArrowLeft size={10} /> {t('ownerPortal.nav.publicPortal')}
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
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: 'none',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <FaSignOutAlt size={11} /> {t('ownerPortal.nav.signOut')}
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                title={t('ownerPortal.nav.helpGuide')}
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
                src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Owner')}&background=0284c7&color=fff`}
                alt={user?.name || 'Platform Owner'}
                title={user?.name || 'Platform Owner'}
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0284c7' }}
              />
              <button
                type="button"
                onClick={handleLogout}
                title={t('ownerPortal.nav.signOut')}
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
        className="portal-main-content-wrap owner-main-wrap"
      >
        {/* Top Header */}
        <header style={{
          height: '64px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
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
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              className="mobile-menu-trigger owner-mobile-trigger"
              aria-label="Open navigation menu"
            >
              <FaBars />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                {currentPageTitle}
              </h2>
              <span style={{
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                color: '#0369a1',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.2rem 0.55rem',
                borderRadius: '12px',
                border: '1px solid rgba(2, 132, 199, 0.25)'
              }}>
                {t('ownerPortal.nav.badge')}
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
                color: '#334155',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <FaQuestionCircle color="#0284c7" />
              <span>{t('ownerPortal.nav.helpGuide')}</span>
            </button>
            <LanguageToggle size="sm" showIcon={false} />
            <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'none' }} className="owner-welcome">
              {t('ownerPortal.nav.welcomeUser', { name: user?.name || 'Owner' })}
            </span>
          </div>
        </header>

        {/* Content Outlet */}
        <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      {/* Guided Walkthrough Modal */}
      <FirstTimeGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        title={t('ownerPortal.guideTour.guideTitle')}
        subtitle={t('ownerPortal.guideTour.guideSubtitle')}
        steps={guideSteps}
        storageKey="mediconnect_owner_tour_seen"
        btnNextText={t('ownerPortal.guideTour.btnNext')}
        btnPrevText={t('ownerPortal.guideTour.btnPrev')}
        btnFinishText={t('ownerPortal.guideTour.btnFinish')}
        btnSkipText={t('ownerPortal.guideTour.btnSkip')}
      />

      <style>{`
        @media (max-width: 900px) {
          .owner-sidebar {
            transform: translateX(-100%);
            width: 240px !important;
          }
          .owner-main-wrap {
            margin-left: 0 !important;
          }
          .mobile-menu-trigger, .mobile-close-btn {
            display: flex !important;
          }
        }
        @media (min-width: 901px) {
          .owner-sidebar {
            transform: translateX(0) !important;
          }
          .mobile-close-btn, .mobile-menu-trigger {
            display: none !important;
          }
          .owner-welcome {
            display: inline-block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default OwnerLayout;
