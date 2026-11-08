import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  FaHospital,
  FaUserCheck,
  FaCalendarAlt,
  FaUserPlus,
  FaUsers,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaBell,
  FaIdCard,
  FaClipboardList,
  FaHeartbeat
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

export const ReceptionLayout = () => {
  const { user, hospitalName, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/admin',
      label: 'Reception Desk',
      icon: <FaClipboardList size={16} />,
      end: true
    },
    {
      to: '/admin/check-in',
      label: 'Patient Check-In',
      icon: <FaUserCheck size={16} />
    },
    {
      to: '/admin/appointments',
      label: 'Appointments',
      icon: <FaCalendarAlt size={16} />
    },
    {
      to: '/admin/register-patient',
      label: 'Register Patient',
      icon: <FaUserPlus size={16} />
    },
    {
      to: '/admin/patients',
      label: 'Patient Directory',
      icon: <FaUsers size={16} />
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar for Desktop */}
      <aside style={{
        width: '260px',
        background: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxShadow: '4px 0 10px rgba(0, 0, 0, 0.05)',
        zIndex: 40
      }} className="hidden md:flex">
        {/* Brand Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 6px -1px rgba(13, 148, 136, 0.3)'
          }}>
            <FaHeartbeat size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              MEDICONNECT
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#14b8a6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Hospital Front Desk
            </div>
          </div>
        </div>

        {/* Hospital Badge */}
        <div style={{
          margin: '1rem 1.25rem 0.5rem',
          padding: '0.85rem 1rem',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Assigned Facility
          </div>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#ffffff',
            marginTop: '0.2rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }} title={hospitalName || 'Your Hospital'}>
            <FaHospital size={13} style={{ color: '#14b8a6', flexShrink: 0 }} />
            {hospitalName || 'Hospital Unit'}
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '0.75rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', padding: '0.5rem 0.75rem 0.25rem', letterSpacing: '0.05em' }}>
            Daily Operations
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.7rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? '#0d9488' : 'transparent',
                transition: 'all 0.15s ease',
                textDecoration: 'none'
              })}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer / User Profile & Logout */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e2e8f0',
                fontSize: '0.85rem',
                fontWeight: 700,
                flexShrink: 0
              }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name || 'Reception Staff'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#14b8a6', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <FaIdCard size={10} /> Receptionist
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              <FaSignOutAlt size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{
          height: '64px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          {/* Mobile menu toggle & brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#334155',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center'
              }}
              className="md:hidden"
              aria-label="Open navigation menu"
            >
              <FaBars size={20} />
            </button>

            <div className="flex md:hidden items-center gap-2">
              <FaHeartbeat size={20} style={{ color: '#0d9488' }} />
              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>MEDICONNECT</span>
            </div>

            {/* Desktop breadcrumb / hospital indicator */}
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
              <span style={{ fontWeight: 600, color: '#0f172a' }}>Front Desk Operations</span>
              <span>•</span>
              <span style={{ color: '#0d9488', fontWeight: 600 }}>{hospitalName || 'Assigned Hospital'}</span>
            </div>
          </div>

          {/* Quick status badge & User avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#ccfbf1',
              color: '#0f766e'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0d9488' }}></span>
              Reception Desk Active
            </span>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              paddingLeft: '0.75rem',
              borderLeft: '1px solid #e2e8f0'
            }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#0d9488',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
              </div>
              <div className="hidden sm:block">
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                  {user?.name || 'Staff Member'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Receptionist
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 50,
            backdropFilter: 'blur(2px)'
          }}>
            <div style={{
              width: '280px',
              height: '100%',
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 15px rgba(0,0,0,0.2)'
            }}>
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FaHeartbeat size={20} style={{ color: '#14b8a6' }} />
                  <span style={{ fontWeight: 800 }}>MEDICONNECT</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  <FaTimes />
                </button>
              </div>

              <nav style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#ffffff' : '#94a3b8',
                      background: isActive ? '#0d9488' : 'transparent',
                      textDecoration: 'none'
                    })}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FaSignOutAlt /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content Viewport */}
        <main style={{ flex: 1, padding: '1.75rem', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ReceptionLayout;
