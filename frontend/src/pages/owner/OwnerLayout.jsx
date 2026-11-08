import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  FaChartPie,
  FaHospital,
  FaEnvelopeOpenText,
  FaHistory,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaShieldAlt,
  FaArrowLeft
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';

export const OwnerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  const navItems = [
    { label: 'Overview', to: '/owner', icon: <FaChartPie aria-hidden="true" />, end: true },
    { label: 'Hospitals', to: '/owner/hospitals', icon: <FaHospital aria-hidden="true" /> },
    { label: 'Super Admin Invitations', to: '/owner/invitations', icon: <FaEnvelopeOpenText aria-hidden="true" /> },
    { label: 'Platform Audit Logs', to: '/owner/audit-logs', icon: <FaHistory aria-hidden="true" /> },
  ];

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
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 40,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* Sidebar: Navy / Dark Slate styling distinguishing Platform Owner master level */}
      <aside
        style={{
          width: '270px',
          backgroundColor: '#0f172a', // Deep slate / navy
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
          boxShadow: 'var(--shadow-xl)'
        }}
        className="admin-sidebar"
      >
        {/* Brand Header */}
        <div style={{
          padding: '1.5rem 1.25rem',
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
              backgroundColor: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <FaShieldAlt size={20} />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.2 }}>
                MEDICONNECT
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--primary-light)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Platform Owner
              </span>
            </div>
          </Link>
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

        {/* Global Scope Indicator Badge */}
        <div style={{
          margin: '1rem 1.25rem 0.5rem',
          padding: '0.65rem 0.85rem',
          backgroundColor: 'rgba(2, 132, 199, 0.15)',
          border: '1px solid rgba(2, 132, 199, 0.3)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#38bdf8' }} />
          <span style={{ fontSize: '0.78rem', color: '#e0f2fe', fontWeight: 600 }}>
            Root Platform Authority
          </span>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
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
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 700 : 500,
                  textDecoration: 'none',
                  color: isActive ? 'white' : 'var(--slate-300)',
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Owner')}&background=0284c7&color=fff`}
              alt={user?.name || 'Platform Owner'}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
            />
            <div style={{ overflow: 'hidden' }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Platform Owner'}
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--slate-400)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              <FaArrowLeft size={10} /> Public
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
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <FaSignOutAlt size={11} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }} className="admin-main-wrap">
        {/* Top Header */}
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
              className="mobile-menu-trigger"
              aria-label="Open navigation menu"
            >
              <FaBars />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                Platform Master Console
              </span>
              <span style={{
                backgroundColor: 'var(--primary-ultralight)',
                color: 'var(--primary-dark)',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.2rem 0.5rem',
                borderRadius: '12px',
                border: '1px solid var(--primary-light)'
              }}>
                Owner
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--slate-600)', display: 'none' }} className="owner-welcome">
              Logged in as <strong>{user?.name}</strong>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              icon={<FaSignOutAlt aria-hidden="true" />}
              style={{ fontSize: '0.78rem' }}
            >
              Sign Out
            </Button>
          </div>
        </header>

        {/* Content Outlet */}
        <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

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
