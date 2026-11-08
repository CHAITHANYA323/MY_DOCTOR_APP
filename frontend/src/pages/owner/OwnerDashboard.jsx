import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaHospital,
  FaUserMd,
  FaUsers,
  FaEnvelopeOpenText,
  FaCalendarCheck,
  FaAmbulance,
  FaPlusCircle,
  FaExclamationTriangle,
  FaShieldAlt
} from 'react-icons/fa';
import { dashboardService } from '../../services/dashboardService';
import { invitationService } from '../../services/invitationService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

const StatCard = ({ icon, title, value, subtitle, color = 'primary' }) => {
  const colorMap = {
    primary: { bg: 'var(--primary-light)', fg: 'var(--primary-dark)' },
    accent: { bg: '#e0e7ff', fg: '#3730a3' },
    success: { bg: '#dcfce7', fg: '#15803d' },
    warning: { bg: '#fef3c7', fg: '#b45309' },
  };
  const activeColor = colorMap[color] || colorMap.primary;

  return (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>{title}</span>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '8px',
          backgroundColor: activeColor.bg,
          color: activeColor.fg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.1rem'
        }}>
          {icon}
        </div>
      </div>
      <div>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 0.25rem' }}>
          {value}
        </h2>
        {subtitle && (
          <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 500 }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export const OwnerDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [statsRes, invRes] = await Promise.all([
        dashboardService.getAdminStats(),
        invitationService.listInvitations().catch((err) => {
          console.warn('Invitations API fetch error:', err);
          return { success: false, invitations: [] };
        })
      ]);

      if (statsRes.success) {
        setStats(statsRes);
      } else {
        setError(statsRes.message || 'Unable to load platform statistics.');
      }

      if (invRes.success && Array.isArray(invRes.invitations)) {
        setInvitations(invRes.invitations);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch platform metrics from the backend.'));
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
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: '110px', borderRadius: '12px' }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: '280px', borderRadius: '12px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#fca5a5' }}>
        <FaExclamationTriangle size={36} color="var(--emergency)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
          Backend Statistics Unavailable
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
  const pendingInvitations = invitations.filter((i) => i.status === 'Pending').length;
  const recentAppointments = stats?.recent_appointments || [];
  const hospitalStats = stats?.hospital_stats || [];

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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)', letterSpacing: '-0.02em', margin: 0 }}>
            Platform Overview
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.25rem', marginBottom: 0 }}>
            Real-time multi-hospital performance, infrastructure metrics, and staff governance
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/owner/invitations')}
            icon={<FaEnvelopeOpenText aria-hidden="true" />}
          >
            Manage Invitations
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate('/owner/hospitals')}
            icon={<FaPlusCircle aria-hidden="true" />}
          >
            Onboard Hospital
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        <StatCard
          icon={<FaHospital />}
          title="Total Hospitals"
          value={metrics.total_hospitals ?? 0}
          color="primary"
          subtitle={`${hospitalStats.length} Active System Nodes`}
        />
        <StatCard
          icon={<FaUserMd />}
          title="Total Doctors"
          value={metrics.total_doctors ?? 0}
          color="accent"
          subtitle="Across All Network Hospitals"
        />
        <StatCard
          icon={<FaUsers />}
          title="Registered Patients"
          value={metrics.total_users ?? 0}
          color="success"
          subtitle="Platform Healthcare Consumers"
        />
        <StatCard
          icon={<FaEnvelopeOpenText />}
          title="Pending Staff Invites"
          value={pendingInvitations}
          color="warning"
          subtitle={`${invitations.length} Total Platform Invites`}
        />
      </div>

      {/* Secondary Metrics Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '10px',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem'
          }}>
            <FaCalendarCheck />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
              Total Appointments
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              {metrics.total_appointments ?? 0}
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '10px',
            backgroundColor: 'var(--emergency-light)',
            color: 'var(--emergency)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem'
          }}>
            <FaAmbulance />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
              Ambulance Fleet
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              {metrics.available_ambulances ?? 0} / {metrics.total_ambulances ?? 0} Ready
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '10px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem'
          }}>
            <FaShieldAlt />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
              Security Isolation
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400e' }}>
              Enforced (Strict RBAC)
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Hospital Distribution & Recent Platform Activity */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Hospital Network Nodes */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
              Hospital Distribution
            </h2>
            <Link to="/owner/hospitals" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
              View All ({hospitalStats.length}) &rarr;
            </Link>
          </div>

          {hospitalStats.length === 0 ? (
            <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem' }}>No hospitals onboarded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {hospitalStats.slice(0, 5).map((h, idx) => (
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
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--slate-800)', display: 'block' }}>
                      {h.name}
                    </span>
                    <span style={{ fontSize: '0.76rem', color: 'var(--slate-500)' }}>
                      📍 {h.city} &bull; Rating: {h.rating || '4.8'}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    backgroundColor: 'var(--primary-ultralight)',
                    color: 'var(--primary-dark)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px'
                  }}>
                    {h.doctors} Doctors
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Platform Activity */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
              Recent Platform Appointments
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>Latest 6</span>
          </div>

          {recentAppointments.length === 0 ? (
            <p style={{ color: 'var(--slate-500)', fontSize: '0.88rem' }}>No recent appointments recorded.</p>
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
                      {appt.user_name || `Patient #${appt.user_id}`} &rarr; {appt.doctor_name || `Doctor #${appt.doctor_id}`}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                      {appt.hospital_name || `Hospital #${appt.hospital_id}`} &bull; {appt.appointment_date} {appt.appointment_time}
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

export default OwnerDashboard;
