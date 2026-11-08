import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaUserMd,
  FaUserTie,
  FaUsers,
  FaCalendarCheck,
  FaClock,
  FaCalendarDay,
  FaUserPlus,
  FaHospital,
  FaExclamationTriangle,
  FaStethoscope,
  FaArrowRight
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import { authService } from '../../services/authService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

export const SuperAdminDashboard = () => {
  const { user, hospitalName } = useAuth();
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
        setError(statsRes.message || 'Unable to retrieve hospital analytics.');
      }

      if (usersRes.success && Array.isArray(usersRes.users)) {
        setStaffUsers(usersRes.users);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch hospital metrics from the backend.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '42px', width: '320px', borderRadius: '8px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton" style={{ height: '110px', borderRadius: '12px' }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: '300px', borderRadius: '12px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#fca5a5' }}>
        <FaExclamationTriangle size={36} color="var(--emergency)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
          Hospital Metrics Unavailable
        </h2>
        <p style={{ color: 'var(--slate-600)', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
          {error}
        </p>
        <Button variant="primary" onClick={fetchDashboardData}>
          Retry Query
        </Button>
      </div>
    );
  }

  const metrics = stats?.metrics || {};
  const recentAppointments = stats?.recent_appointments || [];
  const specializationStats = stats?.specialization_stats || [];

  // Calculate reception staff count from hospital user roster
  const receptionStaffCount = staffUsers.filter((u) => u.role === 'RECEPTIONIST').length;

  // Calculate today's appointments from recent appointments
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = recentAppointments.filter((a) => a.appointment_date === todayStr);

  const statCards = [
    {
      title: 'Active Doctors',
      value: metrics.total_doctors ?? 0,
      subtitle: 'Specialists Assigned to Branch',
      icon: <FaUserMd />,
      bg: '#e0f2fe',
      fg: '#0284c7'
    },
    {
      title: 'Reception Staff',
      value: receptionStaffCount,
      subtitle: 'Active Front Desk Team',
      icon: <FaUserTie />,
      bg: '#f3e8ff',
      fg: '#7e22ce'
    },
    {
      title: 'Hospital Patients',
      value: metrics.total_users ?? 0,
      subtitle: 'Unique Patients Treated',
      icon: <FaUsers />,
      bg: '#dcfce7',
      fg: '#15803d'
    },
    {
      title: 'Total Appointments',
      value: metrics.total_appointments ?? 0,
      subtitle: 'All-time Booking History',
      icon: <FaCalendarCheck />,
      bg: '#fef3c7',
      fg: '#b45309'
    },
    {
      title: 'Pending Appointments',
      value: metrics.pending_appointments ?? 0,
      subtitle: 'Awaiting Consultation',
      icon: <FaClock />,
      bg: '#fee2e2',
      fg: '#b91c1c'
    },
    {
      title: "Today's Consultations",
      value: todayAppointments.length,
      subtitle: `Scheduled for ${todayStr}`,
      icon: <FaCalendarDay />,
      bg: '#ccfbf1',
      fg: '#0f766e'
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        borderBottom: '1px solid var(--slate-200)',
        paddingBottom: '1.25rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
            {hospitalName || user?.hospital_name || 'Hospital Dashboard'}
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.25rem', marginBottom: 0 }}>
            Branch Operational Dashboard &bull; Hospital ID: #{user?.hospital_id || 'N/A'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/superadmin/doctors')}
            icon={<FaUserMd aria-hidden="true" />}
          >
            Manage Doctors
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate('/superadmin/staff')}
            icon={<FaUserPlus aria-hidden="true" />}
          >
            Invite Staff
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1.25rem'
      }}>
        {statCards.map((card, idx) => (
          <div key={idx} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>{card.title}</span>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                backgroundColor: card.bg,
                color: card.fg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem'
              }}>
                {card.icon}
              </div>
            </div>
            <div>
              <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 0.25rem' }}>
                {card.value}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 500 }}>
                {card.subtitle}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout: Hospital Departments & Recent Hospital Activity */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Hospital Departments */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
              Hospital Departments
            </h2>
            <Link to="/superadmin/departments" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
              View All &rarr;
            </Link>
          </div>

          {specializationStats.length === 0 ? (
            <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem' }}>No doctors currently assigned to departments.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {specializationStats.slice(0, 6).map((spec, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--slate-50)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--slate-200)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FaStethoscope color="var(--primary)" />
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--slate-800)' }}>
                      {spec.name}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    backgroundColor: 'var(--primary-ultralight)',
                    color: 'var(--primary-dark)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '12px'
                  }}>
                    {spec.count} {spec.count === 1 ? 'Doctor' : 'Doctors'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Hospital Appointments */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
              Recent Hospital Appointments
            </h2>
            <Link to="/superadmin/appointments" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
              Full Schedule &rarr;
            </Link>
          </div>

          {recentAppointments.length === 0 ? (
            <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem' }}>No appointments booked at this hospital yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentAppointments.map((appt) => (
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
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--slate-800)', display: 'block' }}>
                      {appt.user_name || `Patient #${appt.user_id}`} &bull; {appt.doctor_name || `Dr. #${appt.doctor_id}`}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                      📅 {appt.appointment_date} at {appt.appointment_time}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '12px',
                    backgroundColor: appt.status === 'Completed' ? 'var(--primary-light)' : appt.status === 'Confirmed' ? '#dbeafe' : '#fef3c7',
                    color: appt.status === 'Completed' ? 'var(--primary-dark)' : appt.status === 'Confirmed' ? '#1e40af' : '#b45309'
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
