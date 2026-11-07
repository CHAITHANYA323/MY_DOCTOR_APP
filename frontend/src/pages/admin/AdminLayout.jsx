import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  FaChartPie, 
  FaUserMd, 
  FaUserPlus, 
  FaHospital, 
  FaCalendarCheck, 
  FaAmbulance, 
  FaUsers, 
  FaStethoscope, 
  FaSignOutAlt, 
  FaBars, 
  FaTimes, 
  FaHospitalSymbol,
  FaHome
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

/**
 * Universal responsive Administrative Layout Shell.
 * Provides accessible desktop sidebar, mobile off-canvas drawer,
 * sticky top header with quick action triggers, and brand alignment.
 */
export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
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
    { label: 'Dashboard', to: '/admin', icon: <FaChartPie aria-hidden="true" />, end: true },
    { label: 'Manage Doctors', to: '/admin/doctors', icon: <FaUserMd aria-hidden="true" /> },
    { label: 'Add New Doctor', to: '/admin/doctors/add', icon: <FaUserPlus aria-hidden="true" /> },
    { label: 'Hospitals', to: '/admin/hospitals', icon: <FaHospital aria-hidden="true" /> },
    { label: 'Appointments', to: '/admin/appointments', icon: <FaCalendarCheck aria-hidden="true" /> },
    { label: 'Ambulances', to: '/admin/ambulances', icon: <FaAmbulance aria-hidden="true" /> },
    { label: 'Specializations', to: '/admin/specializations', icon: <FaStethoscope aria-hidden="true" /> },
    { label: 'Registered Users', to: '/admin/users', icon: <FaUsers aria-hidden="true" /> },
  ];

  return (
    <div className="admin-layout">
      {/* Mobile Drawer Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          className="admin-sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true" 
        />
      )}

      {/* Admin Sidebar Navigation */}
      <aside 
        className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="Administrative Navigation"
      >
        {/* Brand Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px'
        }}>
          <Link 
            to="/" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}
            aria-label="MediConnect Public Home"
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary, #0284c7), var(--primary-hover, #0369a1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0
            }}>
              <FaHospitalSymbol size={18} aria-hidden="true" />
            </div>
            <div>
              <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
                Medi<span style={{ color: '#38bdf8' }}>Connect</span>
              </span>
              <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Admin Portal
              </span>
            </div>
          </Link>

          <button 
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="sidebar-close-btn"
            aria-label="Close admin navigation menu"
            style={{ 
              display: 'none', 
              background: 'none', 
              border: 'none', 
              color: 'white', 
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <FaTimes size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Items List */}
        <nav 
          style={{ 
            padding: '1rem 0.75rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.35rem', 
            flexGrow: 1, 
            overflowY: 'auto' 
          }}
          aria-label="Admin Sections"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <span style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Profile Card & Actions */}
        <div style={{
          padding: '1.1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(0, 0, 0, 0.25)'
        }}>
          <div className="flex items-center gap-3" style={{ marginBottom: '0.85rem' }}>
            <img 
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=0284c7&color=fff`} 
              alt={user?.name || 'Admin'}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} 
            />
            <div style={{ lineHeight: 1.25, overflow: 'hidden', flex: 1 }}>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'white', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {user?.name || 'Administrator'}
              </span>
              <div style={{ marginTop: '0.2rem' }}>
                <Badge variant="info" size="sm" style={{ padding: '0.15rem 0.45rem', fontSize: '0.68rem' }}>
                  Super Admin
                </Badge>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/')}
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                color: 'white', 
                borderColor: 'transparent',
                fontSize: '0.78rem',
                minHeight: '34px',
                padding: '0.35rem 0.6rem'
              }}
              icon={<FaHome size={11} aria-hidden="true" />}
            >
              Site
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleLogout}
              style={{ 
                backgroundColor: 'rgba(220, 38, 38, 0.25)', 
                color: '#fca5a5', 
                borderColor: 'rgba(220, 38, 38, 0.35)',
                fontSize: '0.78rem',
                minHeight: '34px',
                padding: '0.35rem 0.6rem'
              }}
              icon={<FaSignOutAlt size={11} aria-hidden="true" />}
            >
              Exit
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Administrative Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Sticky Header */}
        <header className="admin-header">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="sidebar-toggle-btn"
              aria-label="Open sidebar menu"
              aria-expanded={sidebarOpen}
              style={{ 
                display: 'none', 
                background: 'none', 
                border: 'none', 
                color: 'var(--slate-800)', 
                cursor: 'pointer',
                padding: '0.35rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <FaBars size={18} aria-hidden="true" />
            </button>
            <span style={{ fontSize: '0.92rem', color: 'var(--slate-600)', fontWeight: 600 }}>
              MediConnect Management Console &bull; <strong style={{ color: 'var(--slate-900)' }}>v1.0.0</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/doctors', '_blank')}
            >
              Live Patient View
            </Button>
          </div>
        </header>

        {/* Dynamic Nested Content */}
        <main className="admin-main" style={{ flexGrow: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
