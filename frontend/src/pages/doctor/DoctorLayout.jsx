import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  FaUserMd,
  FaCalendarCheck,
  FaUsers,
  FaClock,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaHospital,
  FaStethoscope,
  FaCircle
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { doctorService } from '../../services/doctorService';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { formatDoctorDisplayName, getDoctorInitials } from '../../utils/doctorNameUtils';

export const DoctorLayout = () => {
  const { user, hospitalName, logout } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState(null);

  const getLabel = useCallback((key, fallback) => {
    const val = t(key);
    if (!val || val === key) return fallback;
    return val;
  }, [t]);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const res = await doctorService.getDoctorProfile();
        if (res.success && isMounted) {
          setDoctorProfile(res.doctor);
        }
      } catch (err) {
        console.error('Failed to load doctor profile summary:', err);
      }
    };
    fetchProfile();
    return () => { isMounted = false; };
  }, []);

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const clinicalNavGroups = useMemo(() => [
    {
      groupTitle: getLabel('doctorPortal.clinicalOperations', 'CLINICAL OPERATIONS'),
      items: [
        {
          to: '/doctor',
          label: getLabel('portalNav.clinicalDashboard', 'Clinical Dashboard'),
          icon: <FaStethoscope size={16} />,
          end: true
        },
        {
          to: '/doctor/appointments',
          label: getLabel('portalNav.consultations', 'Appointments & Queue'),
          icon: <FaCalendarCheck size={16} />
        },
        {
          to: '/doctor/patients',
          label: getLabel('portalNav.myPatients', 'Patient Directory'),
          icon: <FaUsers size={16} />
        }
      ]
    },
    {
      groupTitle: getLabel('doctorPortal.practiceManagement', 'PRACTICE MANAGEMENT'),
      items: [
        {
          to: '/doctor/schedule',
          label: getLabel('portalNav.hoursAvailability', 'Hours & Availability'),
          icon: <FaClock size={16} />
        },
        {
          to: '/doctor/profile',
          label: getLabel('portalNav.doctorProfile', 'Doctor Profile'),
          icon: <FaUserMd size={16} />
        }
      ]
    }
  ], [getLabel]);

  // Formatted doctor name for header navbar and sidebar (ensuring "Dr." / "డాక్టర్" prefix without duplication)
  const formattedDoctorName = useMemo(() => {
    return formatDoctorDisplayName(doctorProfile?.name || user?.name, language, getLabel('doctorPortal.activePhysician', 'Doctor'));
  }, [doctorProfile?.name, user?.name, language, getLabel]);

  const doctorInitials = useMemo(() => {
    return getDoctorInitials(doctorProfile?.name || user?.name);
  }, [doctorProfile?.name, user?.name]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#1E293B' }}>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          role="presentation"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(12, 35, 40, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 45
          }}
          className="md:hidden"
        />
      )}

      {/* Desktop Dedicated Clinical Navigation Sidebar */}
      <aside
        style={{
          width: '275px',
          minWidth: '275px',
          backgroundColor: '#0C2328',
          color: '#E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)'
        }}
        className="hidden md:flex"
      >
        {/* Brand Header */}
        <div style={{
          padding: '1.25rem 1.4rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)',
            flexShrink: 0
          }}>
            <FaStethoscope size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              MEDICONNECT
            </div>
            <div style={{
              fontSize: '0.64rem',
              fontWeight: 800,
              color: '#34D399',
              letterSpacing: '0.09em',
              textTransform: 'uppercase'
            }}>
              Clinical Workstation
            </div>
          </div>
        </div>

        {/* Doctor Identity & Hospital Affiliation Banner */}
        <div style={{
          padding: '1rem 1.25rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#134E4A',
              border: '2px solid #2DD4BF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.95rem',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {doctorProfile?.image ? (
                <img
                  src={doctorProfile.image}
                  alt={doctorProfile.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                doctorInitials
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: '0.92rem',
                fontWeight: 800,
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {formattedDoctorName}
              </div>
              <div style={{
                fontSize: '0.74rem',
                color: '#2DD4BF',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <FaCircle size={6} style={{ color: '#10B981' }} />
                <span>{doctorProfile?.specialization_name || doctorProfile?.specialization || 'Specialist'}</span>
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '0.75rem',
            color: '#94A3B8',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            padding: '0.4rem 0.65rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            <FaHospital size={11} style={{ color: '#2DD4BF', flexShrink: 0 }} />
            <span style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#CBD5E1',
              fontWeight: 600
            }}>
              {doctorProfile?.hospital_name || doctorProfile?.hospital || hospitalName || 'Medical Center'}
            </span>
          </div>
        </div>

        {/* Grouped Clinical Navigation */}
        <div style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {clinicalNavGroups.map((group, gIdx) => (
            <div key={gIdx}>
              <div style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#64748B',
                textTransform: 'uppercase',
                padding: '0 0.75rem 0.4rem 0.75rem'
              }}>
                {group.groupTitle}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.86rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#FFFFFF' : '#94A3B8',
                      backgroundColor: isActive ? 'rgba(13, 148, 136, 0.22)' : 'transparent',
                      borderLeft: isActive ? '3px solid #2DD4BF' : '3px solid transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease'
                    })}
                  >
                    <span style={{ color: location.pathname === item.to || (item.end && location.pathname === item.to) ? '#2DD4BF' : '#64748B' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer with Sign Out */}
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(0, 0, 0, 0.25)'
        }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#FCA5A5',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            <FaSignOutAlt size={14} />
            <span>{getLabel('portalNav.signOut', 'Sign Out')}</span>
          </button>
        </div>
      </aside>

      {/* Main Clinical Workstation Column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Crisp Clinical Header */}
        <header style={{
          height: '66px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
        }}>
          {/* Left: Mobile Toggle & Authenticated Doctor Name Navbar Display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden"
              style={{
                background: 'none',
                border: 'none',
                color: '#0C2328',
                padding: '0.4rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0
              }}
              aria-label="Toggle Navigation Drawer"
            >
              {mobileOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>

            {/* Authenticated Doctor Name Display */}
            <div
              style={{
                fontSize: '1.08rem',
                fontWeight: 800,
                color: '#0C2328',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 'clamp(150px, 36vw, 380px)'
              }}
              title={formattedDoctorName}
            >
              {formattedDoctorName}
            </div>
          </div>

          {/* Center/Right: Facility Chip, In-Clinic Status, Language Toggle, Doctor Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Live Practice Status Pill */}
            <div
              className="hidden lg:flex items-center gap-1.5"
              style={{
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#065F46'
              }}
            >
              <FaCircle size={7} style={{ color: '#10B981' }} />
              <span>{getLabel('doctorPortal.inClinic', 'In Clinic / Available')}</span>
            </div>

            {/* Assigned Hospital Tag */}
            <div
              className="hidden sm:flex items-center gap-1.5"
              style={{
                backgroundColor: '#F1F5F9',
                border: '1px solid #E2E8F0',
                padding: '0.3rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#334155'
              }}
            >
              <FaHospital style={{ color: '#0D9488' }} size={12} />
              <span style={{ maxWidth: '170px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {doctorProfile?.hospital || hospitalName || 'Facility Center'}
              </span>
            </div>

            {/* Language Switcher */}
            <LanguageToggle size="sm" showIcon={false} />

            {/* Doctor Avatar Header Chip */}
            <Link
              to="/doctor/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '8px',
                textDecoration: 'none',
                backgroundColor: 'transparent',
                transition: 'background-color 0.15s ease'
              }}
              className="hover:bg-slate-100"
            >
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#0D9488',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.82rem',
                overflow: 'hidden'
              }}>
                {doctorProfile?.image ? (
                  <img
                    src={doctorProfile.image}
                    alt={doctorProfile.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  doctorInitials
                )}
              </div>
              <div className="hidden xl:block text-left">
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0C2328', lineHeight: 1.1 }}>
                  {doctorProfile?.name || user?.name || 'Dr. Physician'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>
                  {doctorProfile?.specialization || 'Cardiology'}
                </div>
              </div>
            </Link>
          </div>
        </header>

        {/* Mobile Slide-in Drawer */}
        {mobileOpen && (
          <div
            style={{
              position: 'fixed',
              top: '66px',
              left: 0,
              bottom: 0,
              width: '280px',
              backgroundColor: '#0C2328',
              color: '#FFFFFF',
              zIndex: 50,
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '4px 0 20px rgba(0,0,0,0.25)'
            }}
            className="md:hidden"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#134E4A',
                color: '#2DD4BF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800
              }}>
                {doctorInitials}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FFFFFF' }}>
                  {doctorProfile?.name || user?.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#34D399' }}>
                  {doctorProfile?.specialization || 'Physician'}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {clinicalNavGroups.map((group, gIdx) => (
                <div key={gIdx}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    {group.groupTitle}
                  </div>
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileOpen(false)}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#FFFFFF' : '#94A3B8',
                        backgroundColor: isActive ? 'rgba(13, 148, 136, 0.25)' : 'transparent',
                        textDecoration: 'none'
                      })}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#F87171',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <FaSignOutAlt size={14} />
              <span>{getLabel('portalNav.signOut', 'Sign Out')}</span>
            </button>
          </div>
        )}

        {/* Clinical Page Main Outlet */}
        <main style={{ flex: 1, padding: '1.75rem', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
