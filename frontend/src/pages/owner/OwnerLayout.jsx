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
  FaArrowLeft,
  FaQuestionCircle,
  FaBuilding
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { FirstTimeGuideModal } from '../../components/common/FirstTimeGuideModal';

export const OwnerLayout = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

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
    { label: t('ownerPortal.nav.hospitals'), to: '/owner/hospitals', icon: <FaHospital aria-hidden="true" /> },
    { label: t('ownerPortal.nav.invitations'), to: '/owner/invitations', icon: <FaEnvelopeOpenText aria-hidden="true" /> },
    { label: t('ownerPortal.nav.auditLogs'), to: '/owner/audit-logs', icon: <FaHistory aria-hidden="true" /> },
  ], [t]);

  // Derive current page title dynamically from route
  const currentPageTitle = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/owner/hospitals')) return t('ownerPortal.nav.hospitals');
    if (path.startsWith('/owner/invitations')) return t('ownerPortal.nav.invitations');
    if (path.startsWith('/owner/audit-logs')) return t('ownerPortal.nav.auditLogs');
    return t('ownerPortal.nav.dashboard');
  }, [location.pathname, t]);

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
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 40,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* Sidebar: Deep Slate / Navy styling distinguishing Platform Owner master level */}
      <aside
        style={{
          width: '270px',
          backgroundColor: '#0f172a',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
        className="admin-sidebar"
      >
        {/* Brand Header */}
        <div style={{
          padding: '1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Link to="/owner" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'white' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              backgroundColor: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <FaShieldAlt size={20} />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.2 }}>
                MEDICONNECT
              </span>
              <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {t('ownerPortal.nav.badge')}
              </span>
            </div>
          </Link>
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
            className="mobile-close-btn"
            aria-label="Close navigation sidebar"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Global Scope Indicator Badge - Plain Language */}
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
          <span style={{ fontSize: '0.78rem', color: '#e0f2fe', fontWeight: 700 }}>
            {t('ownerPortal.nav.scope')}
          </span>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '0.75rem 0.65rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.7rem 0.95rem',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 700 : 500,
                  textDecoration: 'none',
                  color: isActive ? 'white' : '#cbd5e1',
                  backgroundColor: isActive ? '#0284c7' : 'transparent',
                  transition: 'all 0.15s ease'
                })}
              >
                <span style={{ fontSize: '1rem', width: '20px', display: 'flex', justifyContent: 'center' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: '#090d16'
        }}>
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
              padding: '0.55rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: '1rem',
              transition: 'background 0.15s ease'
            }}
          >
            <FaQuestionCircle size={13} /> {t('ownerPortal.nav.helpGuide')}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Owner')}&background=0284c7&color=fff`}
              alt={user?.name || 'Platform Owner'}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0284c7' }}
            />
            <div style={{ overflow: 'hidden' }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Platform Owner'}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                fontSize: '0.78rem',
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
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <FaSignOutAlt size={11} /> {t('ownerPortal.nav.signOut')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }} className="admin-main-wrap">
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
              className="mobile-menu-trigger"
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
        @media (min-width: 1024px) {
          .admin-sidebar {
            transform: translateX(0) !important;
          }
          .admin-main-wrap {
            margin-left: 270px;
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
