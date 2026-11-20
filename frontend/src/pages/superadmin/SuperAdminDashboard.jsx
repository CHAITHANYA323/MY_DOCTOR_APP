import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaUserMd,
  FaUserFriends,
  FaUsers,
  FaCalendarCheck,
  FaClock,
  FaCalendarDay,
  FaUserPlus,
  FaExclamationTriangle,
  FaStethoscope,
  FaChartBar,
  FaAmbulance,
  FaCog,
  FaCheckCircle,
  FaArrowRight
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { dashboardService } from '../../services/dashboardService';
import { authService } from '../../services/authService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

export const SuperAdminDashboard = () => {
  const { user, hospitalName, hospitalId } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [statsRes, usersRes] = await Promise.all([
        dashboardService.getAdminStats(),
        authService.getUsers().catch((err) => {
          console.warn('Hospital staff fetch error:', err);
          return { success: false, users: [] };
        })
      ]);

      if (statsRes.success) {
        setStats(statsRes);
      } else {
        setError(statsRes.message || t('superAdminPortal.dashboard.metricsUnavailable'));
      }

      if (usersRes.success && Array.isArray(usersRes.users)) {
        setStaffUsers(usersRes.users);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('superAdminPortal.dashboard.metricsUnavailable')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '48px', width: '380px', borderRadius: '8px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '12px' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="skeleton" style={{ height: '115px', borderRadius: '12px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', borderColor: '#fca5a5' }}>
        <FaExclamationTriangle size={42} color="var(--emergency, #dc2626)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
          {t('superAdminPortal.dashboard.metricsUnavailable')}
        </h2>
        <p style={{ color: 'var(--slate-600)', marginBottom: '1.5rem', maxWidth: '520px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
          {error}
        </p>
        <Button variant="primary" onClick={fetchDashboardData}>
          {t('superAdminPortal.dashboard.retry')}
        </Button>
      </div>
    );
  }

  const metrics = stats?.metrics || {};
  const recentAppointments = stats?.recent_appointments || [];
  const specializationStats = stats?.specialization_stats || [];

  // Front desk receptionists count
  const receptionStaffCount = staffUsers.filter((u) => u.role === 'RECEPTIONIST').length;

  // Today's appointments count
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = recentAppointments.filter((a) => a.appointment_date === todayStr);

  // Completed appointments count
  const completedCount = metrics.completed_appointments ??
    recentAppointments.filter((a) => a.status === 'Completed').length;

  // 8 Action Cards
  const quickActions = [
    {
      title: t('superAdminPortal.dashboard.actionDoctors'),
      desc: t('superAdminPortal.dashboard.actionDoctorsDesc'),
      to: '/superadmin/doctors',
      icon: <FaUserMd />,
      bg: '#e0f2fe',
      fg: '#0284c7'
    },
    {
      title: t('superAdminPortal.dashboard.actionStaff'),
      desc: t('superAdminPortal.dashboard.actionStaffDesc'),
      to: '/superadmin/staff',
      icon: <FaUserFriends />,
      bg: '#f3e8ff',
      fg: '#7e22ce'
    },
    {
      title: t('superAdminPortal.dashboard.actionDepts'),
      desc: t('superAdminPortal.dashboard.actionDeptsDesc'),
      to: '/superadmin/departments',
      icon: <FaStethoscope />,
      bg: '#fef3c7',
      fg: '#b45309'
    },
    {
      title: t('superAdminPortal.dashboard.actionAppts'),
      desc: t('superAdminPortal.dashboard.actionApptsDesc'),
      to: '/superadmin/appointments',
      icon: <FaCalendarCheck />,
      bg: '#dcfce7',
      fg: '#15803d'
    },
    {
      title: t('superAdminPortal.dashboard.actionReports'),
      desc: t('superAdminPortal.dashboard.actionReportsDesc'),
      to: '/superadmin/reports',
      icon: <FaChartBar />,
      bg: '#fee2e2',
      fg: '#b91c1c'
    },
    {
      title: t('superAdminPortal.dashboard.actionAmbulance'),
      desc: t('superAdminPortal.dashboard.actionAmbulanceDesc'),
      to: '/superadmin/ambulances',
      icon: <FaAmbulance />,
      bg: '#ffedd5',
      fg: '#c2410c'
    },
    {
      title: t('superAdminPortal.dashboard.actionSettings'),
      desc: t('superAdminPortal.dashboard.actionSettingsDesc'),
      to: '/superadmin/settings',
      icon: <FaCog />,
      bg: '#f1f5f9',
      fg: '#475569'
    },
    {
      title: t('superAdminPortal.dashboard.actionInviteStaff'),
      desc: t('superAdminPortal.dashboard.actionInviteStaffDesc'),
      to: '/superadmin/staff',
      icon: <FaUserPlus />,
      bg: '#ccfbf1',
      fg: '#0f766e'
    }
  ];

  // 7 Metric Cards with clear, plain-language explanations
  const statCards = [
    {
      title: t('superAdminPortal.dashboard.statActiveDoctors'),
      value: metrics.total_doctors ?? 0,
      subtitle: t('superAdminPortal.dashboard.statActiveDoctorsSub'),
      icon: <FaUserMd />,
      bg: '#e0f2fe',
      fg: '#0284c7'
    },
    {
      title: t('superAdminPortal.dashboard.statReceptionStaff'),
      value: receptionStaffCount,
      subtitle: t('superAdminPortal.dashboard.statReceptionStaffSub'),
      icon: <FaUserFriends />,
      bg: '#f3e8ff',
      fg: '#7e22ce'
    },
    {
      title: t('superAdminPortal.dashboard.statHospitalPatients'),
      value: metrics.total_users ?? 0,
      subtitle: t('superAdminPortal.dashboard.statHospitalPatientsSub'),
      icon: <FaUsers />,
      bg: '#dcfce7',
      fg: '#15803d'
    },
    {
      title: t('superAdminPortal.dashboard.statTotalAppts'),
      value: metrics.total_appointments ?? 0,
      subtitle: t('superAdminPortal.dashboard.statTotalApptsSub'),
      icon: <FaCalendarCheck />,
      bg: '#fef3c7',
      fg: '#b45309'
    },
    {
      title: t('superAdminPortal.dashboard.statPendingAppts'),
      value: metrics.pending_appointments ?? 0,
      subtitle: t('superAdminPortal.dashboard.statPendingApptsSub'),
      icon: <FaClock />,
      bg: '#fee2e2',
      fg: '#b91c1c'
    },
    {
      title: t('superAdminPortal.dashboard.statTodayAppts'),
      value: todayAppointments.length,
      subtitle: t('superAdminPortal.dashboard.statTodayApptsSub'),
      icon: <FaCalendarDay />,
      bg: '#ccfbf1',
      fg: '#0f766e'
    },
    {
      title: t('superAdminPortal.dashboard.statCompletedAppts'),
      value: completedCount,
      subtitle: t('superAdminPortal.dashboard.statCompletedApptsSub'),
      icon: <FaCheckCircle />,
      bg: '#e0e7ff',
      fg: '#4338ca'
    }
  ];

  const activeHospital = hospitalName || user?.hospital_name || (hospitalId ? `Hospital Branch #${hospitalId}` : 'Assigned Hospital');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '1.75rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid var(--slate-200)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem'
      }}>
        <div style={{ maxWidth: '750px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <span style={{
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              textTransform: 'uppercase'
            }}>
              {activeHospital}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', fontWeight: 600 }}>
              {t('superAdminPortal.dashboard.scopeLabel')} #{user?.hospital_id || hospitalId || '1'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0, letterSpacing: '-0.02em' }}>
            {t('superAdminPortal.dashboard.welcomeTitle')}
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-600)', marginTop: '0.4rem', marginBottom: 0, lineHeight: 1.5 }}>
            {t('superAdminPortal.dashboard.welcomeSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/superadmin/doctors')}
            icon={<FaUserMd aria-hidden="true" />}
          >
            {t('superAdminPortal.nav.doctors')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate('/superadmin/staff')}
            icon={<FaUserPlus aria-hidden="true" />}
          >
            {t('superAdminPortal.nav.staff')}
          </Button>
        </div>
      </div>

      {/* "What can you do here?" Section with 8 Action Cards */}
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 0.25rem' }}>
            {t('superAdminPortal.dashboard.quickActionsTitle')}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', margin: 0 }}>
            {t('superAdminPortal.dashboard.quickActionsSubtitle')}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem'
        }}>
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              to={action.to}
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                padding: '1.15rem',
                backgroundColor: '#ffffff',
                border: '1px solid var(--slate-200)',
                borderRadius: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = action.fg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = 'var(--slate-200)';
              }}
            >
              <div style={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                backgroundColor: action.bg,
                color: action.fg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.15rem',
                flexShrink: 0
              }}>
                {action.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                    {action.title}
                  </span>
                  <FaArrowRight size={10} color="var(--slate-400)" />
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--slate-500)', margin: '0.2rem 0 0', lineHeight: 1.4 }}>
                  {action.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Stat Cards Grid (7 Cards with plain-language explanations) */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '1rem' }}>
          Hospital Operational Metrics
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}>
          {statCards.map((card, idx) => (
            <div
              key={idx}
              className="card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                border: '1px solid var(--slate-200)',
                borderRadius: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--slate-600)', fontWeight: 700 }}>
                  {card.title}
                </span>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  backgroundColor: card.bg,
                  color: card.fg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.05rem'
                }}>
                  {card.icon}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 0.25rem' }}>
                  {card.value}
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', fontWeight: 500, lineHeight: 1.35, display: 'block' }}>
                  {card.subtitle}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Clinical Departments & Recent Appointments */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Hospital Departments */}
        <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--slate-200)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                {t('superAdminPortal.dashboard.deptsTitle')}
              </h2>
              <span style={{ fontSize: '0.76rem', color: 'var(--slate-500)' }}>
                Doctors by Department
              </span>
            </div>
            <Link to="/superadmin/departments" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary, #0284c7)', textDecoration: 'none' }}>
              {t('superAdminPortal.dashboard.deptsViewAll')} &rarr;
            </Link>
          </div>

          {specializationStats.length === 0 ? (
            <p style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>
              {t('superAdminPortal.dashboard.noDeptsMsg')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {specializationStats.slice(0, 6).map((spec, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--slate-50)',
                    borderRadius: '8px',
                    border: '1px solid var(--slate-200)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <FaStethoscope color="var(--primary, #0284c7)" size={14} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--slate-800)' }}>
                      {spec.name}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(2, 132, 199, 0.1)',
                    color: '#0369a1',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '12px'
                  }}>
                    {spec.count} {spec.count === 1 ? t('superAdminPortal.dashboard.doctorSingular') : t('superAdminPortal.dashboard.doctorsPlural')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Hospital Appointments */}
        <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--slate-200)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                {t('superAdminPortal.dashboard.recentApptsTitle')}
              </h2>
              <span style={{ fontSize: '0.76rem', color: 'var(--slate-500)' }}>
                Latest consultation bookings
              </span>
            </div>
            <Link to="/superadmin/appointments" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary, #0284c7)', textDecoration: 'none' }}>
              {t('superAdminPortal.dashboard.recentApptsViewAll')} &rarr;
            </Link>
          </div>

          {recentAppointments.length === 0 ? (
            <p style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>
              {t('superAdminPortal.dashboard.noRecentApptsMsg')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentAppointments.slice(0, 6).map((appt) => (
                <div
                  key={appt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderBottom: '1px solid var(--slate-100)',
                    fontSize: '0.84rem'
                  }}
                >
                  <div style={{ overflow: 'hidden', paddingRight: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--slate-800)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {appt.user_name || `Patient #${appt.user_id}`} &bull; {appt.doctor_name || `Dr. #${appt.doctor_id}`}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)' }}>
                      📅 {appt.appointment_date} at {appt.appointment_time}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '12px',
                    flexShrink: 0,
                    backgroundColor:
                      appt.status === 'Completed'
                        ? '#dcfce7'
                        : appt.status === 'Confirmed'
                        ? '#dbeafe'
                        : appt.status === 'Checked In'
                        ? '#f3e8ff'
                        : '#fef3c7',
                    color:
                      appt.status === 'Completed'
                        ? '#15803d'
                        : appt.status === 'Confirmed'
                        ? '#1e40af'
                        : appt.status === 'Checked In'
                        ? '#7e22ce'
                        : '#b45309'
                  }}>
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
