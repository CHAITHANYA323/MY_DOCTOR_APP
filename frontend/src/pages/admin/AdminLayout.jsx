import React, { useState } from 'react';
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
  FaArrowLeft,
  FaHome
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard', to: '/admin', icon: <FaChartPie />, end: true },
    { label: 'Manage Doctors', to: '/admin/doctors', icon: <FaUserMd /> },
    { label: 'Add New Doctor', to: '/admin/doctors/add', icon: <FaUserPlus /> },
    { label: 'Hospitals', to: '/admin/hospitals', icon: <FaHospital /> },
    { label: 'Appointments', to: '/admin/appointments', icon: <FaCalendarCheck /> },
    { label: 'Ambulances', to: '/admin/ambulances', icon: <FaAmbulance /> },
    { label: 'Specializations', to: '/admin/specializations', icon: <FaStethoscope /> },
    { label: 'Registered Users', to: '/admin/users', icon: <FaUsers /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Admin Sidebar */}
      <aside 
        className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{
          width: '260px',
          backgroundColor: 'var(--slate-900)',
          color: 'var(--slate-300)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 950,
          borderRight: '1px solid rgba(255,255,255,0.08)',
          transition: 'var(--transition)'
        }}
      >
        {/* Brand Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <FaHospitalSymbol size={18} />
            </div>
            <div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white' }}>
                MediCare<span style={{ color: '#38bdf8' }}>+</span>
              </span>
              <span style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                Admin Portal
              </span>
            </div>
          </Link>

          <button 
            onClick={() => setSidebarOpen(false)}
            className="sidebar-close-btn"
            style={{ display: 'none', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flexGrow: 1, overflowY: 'auto' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'white' : 'var(--slate-400)',
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                transition: 'var(--transition)',
                textDecoration: 'none'
              })}
            >
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom Profile & Exit */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(0,0,0,0.2)'
        }}>
          <div className="flex items-center gap-3" style={{ marginBottom: '0.85rem' }}>
            <img 
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'Admin'}&background=0284c7&color=fff`} 
              alt={user?.name}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} 
            />
            <div style={{ lineHeight: 1.2, overflow: 'hidden' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'white', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>Super Admin</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <Link 
              to="/" 
              className="btn btn-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '0.78rem' }}
            >
              <FaHome size={11} /> Site
            </Link>
            <button 
              onClick={handleLogout}
              className="btn btn-sm"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.78rem' }}
            >
              <FaSignOutAlt size={11} /> Exit
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
          zIndex: 900
        }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="sidebar-toggle-btn"
              style={{ display: 'none', background: 'none', border: 'none', color: 'var(--slate-800)', cursor: 'pointer' }}
            >
              <FaBars size={18} />
            </button>
            <span style={{ fontSize: '0.92rem', color: 'var(--slate-500)', fontWeight: 600 }}>
              MediCare Management Console &bull; <strong style={{ color: 'var(--slate-800)' }}>v1.0.0</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/doctors" target="_blank" className="btn btn-outline btn-sm">
              Live Patient View
            </Link>
          </div>
        </header>

        {/* Dynamic Nested Content */}
        <main style={{ padding: '2rem 1.5rem', flexGrow: 1 }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .admin-sidebar {
            position: fixed !important;
            left: -260px;
            top: 0;
            bottom: 0;
            transition: left 0.25s ease-in-out;
          }
          .admin-sidebar.open {
            left: 0 !important;
          }
          .sidebar-close-btn { display: block !important; }
          .sidebar-toggle-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
};
