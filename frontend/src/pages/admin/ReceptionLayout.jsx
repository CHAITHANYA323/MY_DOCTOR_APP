import React, { useState, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  FaHospital,
  FaUserCheck,
  FaCalendarAlt,
  FaUserPlus,
  FaUsers,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaIdCard,
  FaClipboardList,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';

export const ReceptionLayout = () => {
  const { user, hospitalName, logout } = useAuth();
  const { t, isTelugu } = useLanguage();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isCollapsed, toggleCollapse, sidebarWidth } = useSidebarCollapse();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = useMemo(() => [
    {
      to: '/admin',
      label: t('receptionPortal.navDashboard') || (isTelugu ? 'డ్యాష్‌బోర్డ్' : 'Dashboard'),
      icon: <FaClipboardList size={16} />,
      end: true
    },
    {
      to: '/admin/check-in',
      label: t('receptionPortal.navCheckIn') || (isTelugu ? 'రోగి చెక్-ఇన్' : 'Patient Check-In'),
      icon: <FaUserCheck size={16} />
    },
    {
      to: '/admin/appointments',
      label: t('receptionPortal.navAppointments') || (isTelugu ? 'అపాయింట్‌మెంట్‌లు' : 'Appointments'),
      icon: <FaCalendarAlt size={16} />
    },
    {
      to: '/admin/register-patient',
      label: t('receptionPortal.navRegisterPatient') || (isTelugu ? 'కొత్త రోగి నమోదు' : 'New Patient Registration'),
      icon: <FaUserPlus size={16} />
    },
    {
      to: '/admin/patients',
      label: t('receptionPortal.navPatientList') || (isTelugu ? 'రోగుల జాబితా' : 'Patient List'),
      icon: <FaUsers size={16} />
    },
  ], [t, isTelugu]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar for Desktop (240px Expanded <-> 70px Collapsed) */}
      <aside style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxShadow: '4px 0 10px rgba(0, 0, 0, 0.05)',
        zIndex: 40,
        transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)'
      }} className={`portal-desktop-sidebar hidden md:flex ${isCollapsed ? 'portal-sidebar-is-collapsed' : ''}`}>
        {/* Brand Header */}
        <div style={{
          padding: isCollapsed ? '1rem 0.5rem' : '1.15rem 1.15rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          minHeight: '66px'
        }}>
          <Link
            to="/admin"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
              overflow: 'hidden'
            }}
            title="Hospital Front Desk Portal"
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.3)',
              flexShrink: 0
            }}>
              <FaClipboardList size={18} />
            </div>
            {!isCollapsed && (
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  MEDICONNECT
                </div>
                <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#a78bfa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {t('receptionPortal.hospitalFrontDesk') || (isTelugu ? 'ఆసుపత్రి రిసెప్షన్ డెస్క్' : 'Hospital Front Desk')}
                </div>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="sidebar-edge-toggle-btn"
              title="Collapse Sidebar"
              aria-label="Collapse Sidebar"
            >
              <FaChevronLeft size={11} />
            </button>
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

        {/* Hospital Facility Badge */}
        {!isCollapsed ? (
          <div style={{
            margin: '0.85rem 1rem 0.4rem',
            padding: '0.75rem 0.85rem',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('receptionPortal.assignedFacility') || (isTelugu ? 'కేటాయించిన ఆసుపత్రి' : 'Assigned Facility')}
            </div>
            <div style={{
              fontSize: '0.84rem',
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
              <FaHospital size={12} style={{ color: '#14b8a6', flexShrink: 0 }} />
              {hospitalName || (isTelugu ? 'ఆసుపత్రి విభాగం' : 'Hospital Unit')}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.6rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div
              title={hospitalName || 'Assigned Hospital'}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#14b8a6'
              }}
            >
              <FaHospital size={14} />
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav style={{ padding: isCollapsed ? '0.75rem 0.4rem' : '0.75rem 0.65rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem', overflowY: 'auto', overflowX: isCollapsed ? 'visible' : 'hidden' }}>
          {!isCollapsed && (
            <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', padding: '0.35rem 0.65rem 0.2rem', letterSpacing: '0.05em' }}>
              {t('receptionPortal.dailyOperations') || (isTelugu ? 'రోజువారీ కార్యకలాపాలు' : 'Daily Operations')}
            </div>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? '#7c3aed' : 'transparent',
                transition: 'all 0.15s ease',
                textDecoration: 'none'
              })}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              {!isCollapsed && <span className="portal-nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}

              {/* Floating Tooltip in Collapsed Mode */}
              <span className="portal-nav-tooltip">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer / User Profile & Logout */}
        <div style={{
          padding: isCollapsed ? '0.75rem 0.4rem' : '0.85rem 1.15rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'transparent'
        }}>
          {!isCollapsed ? (
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
                    {user?.name || (isTelugu ? 'రిసెప్షన్ సిబ్బంది' : 'Reception Staff')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <FaIdCard size={10} /> {isTelugu ? 'రిసెప్షనిస్ట్' : 'Receptionist'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title={t('receptionPortal.signOut') || (isTelugu ? 'లాగౌట్' : 'Sign Out')}
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
                aria-label={t('receptionPortal.signOut') || (isTelugu ? 'లాగౌట్' : 'Sign Out')}
              >
                <FaSignOutAlt size={15} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div
                title={`${user?.name || 'Reception Staff'}`}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#e2e8f0',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title={t('receptionPortal.signOut') || (isTelugu ? 'లాగౌట్' : 'Sign Out')}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  padding: '0.45rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%'
                }}
                aria-label={t('receptionPortal.signOut') || (isTelugu ? 'లాగౌట్' : 'Sign Out')}
              >
                <FaSignOutAlt size={13} />
              </button>
            </div>
          )}
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
              <FaClipboardList size={20} style={{ color: '#7c3aed' }} />
              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>MEDICONNECT</span>
            </div>

            {/* Desktop breadcrumb / hospital indicator */}
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{t('receptionPortal.hospitalFrontDesk') || (isTelugu ? 'ఆసుపత్రి రిసెప్షన్ డెస్క్' : 'Hospital Front Desk')}</span>
              <span>•</span>
              <span style={{ color: '#7c3aed', fontWeight: 600 }}>{hospitalName || (isTelugu ? 'ఆసుపత్రి విభాగం' : 'Assigned Hospital')}</span>
            </div>
          </div>

          {/* Quick status badge & User avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LanguageToggle size="sm" showIcon={false} />
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#f3e8ff',
              color: '#6d28d9'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7c3aed' }}></span>
              {isTelugu ? 'రిసెప్షన్ యాక్టివ్' : 'Reception Desk Active'}
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
                background: '#7c3aed',
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
                  {user?.name || (isTelugu ? 'రిసెప్షన్ సిబ్బంది' : 'Staff Member')}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {isTelugu ? 'రిసెప్షనిస్ట్' : 'Receptionist'}
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
                  <FaClipboardList size={20} style={{ color: '#a78bfa' }} />
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
                      background: isActive ? '#7c3aed' : 'transparent',
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
                  <FaSignOutAlt /> {t('portalNav.signOut')}
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
