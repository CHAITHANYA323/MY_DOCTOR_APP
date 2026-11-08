import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaClipboardList,
  FaUserCheck,
  FaCalendarAlt,
  FaUserPlus,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaHospital,
  FaUserMd,
  FaUser,
  FaSearch,
  FaRedo
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { receptionService } from '../../services/receptionService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';

export const ReceptionDashboard = () => {
  const { user, hospitalName } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [processingId, setProcessingId] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await receptionService.getStats();
      if (data && data.success) {
        setStats(data);
        setTodaySchedule(data.today_schedule || []);
      }
    } catch (err) {
      console.error('Failed to load reception desk statistics:', err);
      setError(getApiErrorMessage(err, 'Unable to load live reception dashboard metrics.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleQuickCheckIn = async (appointmentId) => {
    try {
      setProcessingId(appointmentId);
      await receptionService.checkInPatient(appointmentId, 'Patient confirmed and checked in at reception desk.');
      notify.success(`Appointment #${appointmentId} marked as Checked In.`);
      fetchDashboardData();
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Check-in failed. Please retry.'));
    } finally {
      setProcessingId(null);
    }
  };

  const metrics = stats?.metrics || {};

  const filteredSchedule = todaySchedule.filter((appt) => {
    const term = search.toLowerCase();
    const matchesSearch =
      String(appt.id).includes(term) ||
      (appt.patient_name || '').toLowerCase().includes(term) ||
      (appt.doctor_name || '').toLowerCase().includes(term) ||
      (appt.specialization_name || '').toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'ALL' || appt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#fef3c7',
            color: '#b45309'
          }}>
            <FaClock size={10} /> Pending Arrival
          </span>
        );
      case 'Confirmed':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#ccfbf1',
            color: '#0f766e'
          }}>
            <FaCheckCircle size={10} /> Checked In
          </span>
        );
      case 'Completed':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#dcfce7',
            color: '#15803d'
          }}>
            <FaCheckCircle size={10} /> Consulted
          </span>
        );
      case 'Cancelled':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#fee2e2',
            color: '#b91c1c'
          }}>
            <FaTimesCircle size={10} /> Cancelled
          </span>
        );
      default:
        return (
          <span style={{
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#f1f5f9',
            color: '#475569'
          }}>
            {status}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f766e, #134e4a)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        color: '#ffffff',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem',
        boxShadow: '0 4px 6px -1px rgba(15, 118, 110, 0.2)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
            <span style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <FaHospital size={11} /> {hospitalName || 'Your Hospital'}
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>
              Today: {stats?.today_date || new Date().toISOString().split('T')[0]}
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Hospital Front Desk & Reception
          </h1>
          <p style={{ margin: '0.35rem 0 0', opacity: 0.9, fontSize: '0.925rem' }}>
            Welcome, {user?.name || 'Staff'}. Monitor patient arrivals, process check-ins, and manage consultations.
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to="/admin/check-in"
            style={{
              padding: '0.65rem 1.15rem',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#0f766e',
              fontWeight: 700,
              fontSize: '0.875rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <FaUserCheck size={14} /> Rapid Check-In
          </Link>
          <Link
            to="/admin/register-patient"
            style={{
              padding: '0.65rem 1.15rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              fontWeight: 700,
              fontSize: '0.875rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <FaUserPlus size={14} /> Register Walk-In
          </Link>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '0.9rem 1.25rem',
          borderRadius: '8px',
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* Real-time KPI Counters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '1rem'
      }}>
        {/* Today's Appointments */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Today Scheduled</span>
            <FaCalendarAlt style={{ color: '#0f766e' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>
            {loading ? '-' : metrics.today_appointments ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            All consultations today
          </div>
        </div>

        {/* Pending Check-Ins */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem',
          border: '1px solid #fef3c7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b45309' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Pending Arrival</span>
            <FaClock style={{ color: '#b45309' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#b45309', marginTop: '0.35rem' }}>
            {loading ? '-' : metrics.pending_checkins ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.2rem' }}>
            Awaiting patient arrival
          </div>
        </div>

        {/* Checked-In Patients */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem',
          border: '1px solid #ccfbf1',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#0f766e' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Checked In</span>
            <FaUserCheck style={{ color: '#0f766e' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f766e', marginTop: '0.35rem' }}>
            {loading ? '-' : metrics.checked_in ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0f766e', marginTop: '0.2rem' }}>
            Ready in waiting area
          </div>
        </div>

        {/* Completed Visits */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem',
          border: '1px solid #dcfce7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#15803d' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Completed</span>
            <FaCheckCircle style={{ color: '#15803d' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#15803d', marginTop: '0.35rem' }}>
            {loading ? '-' : metrics.completed ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.2rem' }}>
            Doctor consultation done
          </div>
        </div>

        {/* Total Unique Patients */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1.15rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Facility Patients</span>
            <FaUser style={{ color: '#64748b' }} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>
            {loading ? '-' : metrics.total_patients ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Registered at this unit
          </div>
        </div>
      </div>

      {/* Today's Schedule Section */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        {/* Section Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Today's Consultation Schedule
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
              Real-time check-in and arrival monitor for today's booked patients.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={fetchDashboardData}
              title="Refresh Schedule"
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <FaRedo size={12} /> Refresh
            </button>
            <Link
              to="/admin/appointments"
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: '#0f766e',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.8125rem'
              }}
            >
              View All Appointments
            </Link>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          padding: '0.9rem 1.5rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: '220px', flex: '1', maxWidth: '340px' }}>
            <FaSearch style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8'
            }} />
            <input
              type="text"
              placeholder="Search by Patient, Doctor, or Appt #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8125rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Status Pills */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {['ALL', 'Pending', 'Confirmed', 'Completed'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: statusFilter === tab ? '#0f766e' : '#ffffff',
                  color: statusFilter === tab ? '#ffffff' : '#475569',
                  border: '1px solid ' + (statusFilter === tab ? '#0f766e' : '#cbd5e1')
                }}
              >
                {tab === 'Confirmed' ? 'Checked In' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Table */}
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <FaClock size={28} style={{ animation: 'spin 1s linear infinite', color: '#0f766e', marginBottom: '0.5rem' }} />
            <div>Loading today's schedule...</div>
          </div>
        ) : filteredSchedule.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <FaClipboardList size={36} style={{ color: '#cbd5e1', marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 600, color: '#334155' }}>
              No appointments scheduled for today matching this filter
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Patients can be registered and booked directly using the action buttons above.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>ID & Time</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Patient Name</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Doctor & Department</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Reason</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Arrival Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedule.map((appt) => (
                  <tr
                    key={appt.id}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f766e' }}>
                        #{appt.id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                        <FaClock size={10} />
                        {appt.appointment_time}
                      </div>
                    </td>
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {appt.patient_name || 'Walk-in Patient'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                        {appt.patient_phone || appt.user_phone || 'No phone'}
                      </div>
                    </td>
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FaUserMd size={13} style={{ color: '#0f766e' }} />
                        {appt.doctor_name || 'Consultant Doctor'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                        {appt.specialization_name || 'General Medicine'}
                      </div>
                    </td>
                    <td style={{ padding: '0.95rem 1.25rem', color: '#475569', fontSize: '0.8rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={appt.reason}>
                      {appt.reason || 'General Consultation'}
                    </td>
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      {getStatusBadge(appt.status)}
                    </td>
                    <td style={{ padding: '0.95rem 1.25rem', textAlign: 'right' }}>
                      {appt.status === 'Pending' ? (
                        <button
                          type="button"
                          disabled={processingId === appt.id}
                          onClick={() => handleQuickCheckIn(appt.id)}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#0f766e',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}
                        >
                          <FaUserCheck size={12} />
                          {processingId === appt.id ? 'Processing...' : 'Check In'}
                        </button>
                      ) : appt.status === 'Confirmed' ? (
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f766e' }}>
                          ✓ Patient Waiting
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          No action needed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceptionDashboard;
