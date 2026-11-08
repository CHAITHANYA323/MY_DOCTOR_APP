import React, { useState, useEffect, useCallback } from 'react';
import {
  FaChartBar,
  FaHospital,
  FaUserMd,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaMoneyBillWave,
  FaPrint
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import { appointmentService } from '../../services/appointmentService';
import { doctorService } from '../../services/doctorService';
import { getApiErrorMessage } from '../../services/api';

export const SuperAdminReports = () => {
  const { hospitalName } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [statsRes, docRes, apptRes] = await Promise.all([
        dashboardService.getAdminStats().catch(() => ({ success: false })),
        doctorService.getDoctors().catch(() => ({ success: false, doctors: [] })),
        appointmentService.getAppointments().catch(() => ({ success: false, appointments: [] }))
      ]);

      if (statsRes && statsRes.success) {
        setStats(statsRes);
      }
      if (docRes && docRes.success) {
        setDoctors(docRes.doctors || []);
      }
      if (apptRes && apptRes.success) {
        setAppointments(apptRes.appointments || []);
      }
    } catch (err) {
      console.error('Failed to load operational report data:', err);
      setError(getApiErrorMessage(err, 'Unable to load report data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Derived Metrics
  const metrics = stats?.metrics || {};
  const totalAppointments = appointments.length || metrics.total_appointments || 0;
  const completedCount = appointments.filter(a => a.status === 'Completed').length || metrics.completed_appointments || 0;
  const _pendingCount = appointments.filter(a => a.status === 'Pending').length || metrics.pending_appointments || 0;
  const _confirmedCount = appointments.filter(a => a.status === 'Confirmed').length || metrics.confirmed_appointments || 0;
  const cancelledCount = appointments.filter(a => a.status === 'Cancelled').length || metrics.cancelled_appointments || 0;

  const completionRate = totalAppointments > 0
    ? Math.round((completedCount / totalAppointments) * 100)
    : 0;

  const cancellationRate = totalAppointments > 0
    ? Math.round((cancelledCount / totalAppointments) * 100)
    : 0;

  // Estimated gross revenue from completed appointments
  const totalRevenue = appointments
    .filter(a => a.status === 'Completed')
    .reduce((sum, a) => sum + (Number(a.consultation_fee) || 0), 0);

  // Department distribution
  const specializationStats = stats?.specialization_stats || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Hospital Operations Report
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#ccfbf1',
              color: '#0f766e'
            }}>
              <FaHospital size={11} />
              {hospitalName || 'Your Hospital'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Operational throughput, appointment fulfillment rates, and clinical capacity analytics.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: '0.6rem 1.1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <FaPrint size={14} /> Print Report
          </button>
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

      {loading ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '3.5rem',
          textAlign: 'center',
          color: '#64748b',
          border: '1px solid #e2e8f0'
        }}>
          <FaClock size={32} style={{ animation: 'spin 1s linear infinite', color: '#0f766e', marginBottom: '0.75rem' }} />
          <div>Compiling hospital reports...</div>
        </div>
      ) : (
        <>
          {/* Top Performance Indicators */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Fulfillment Rate</span>
                <FaCheckCircle style={{ color: '#15803d' }} />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>
                {completionRate}%
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                {completedCount} of {totalAppointments} completed
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Cancellation Rate</span>
                <FaTimesCircle style={{ color: '#ef4444' }} />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ef4444', marginTop: '0.35rem' }}>
                {cancellationRate}%
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                {cancelledCount} cancelled bookings
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Consultation Gross</span>
                <FaMoneyBillWave style={{ color: '#0f766e' }} />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f766e', marginTop: '0.35rem' }}>
                ₹{totalRevenue.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                From completed visits
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Active Doctors</span>
                <FaUserMd style={{ color: '#0f766e' }} />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.35rem' }}>
                {doctors.length || metrics.total_doctors || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                Across {specializationStats.length} departments
              </div>
            </div>
          </div>

          {/* Section: Department Capacity Breakdown */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <FaChartBar size={18} style={{ color: '#0f766e' }} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Clinical Department Distribution
              </h3>
            </div>

            {specializationStats.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                No department metrics recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {specializationStats.map((spec) => {
                  const maxCount = Math.max(...specializationStats.map(s => s.count), 1);
                  const pct = Math.round((spec.count / maxCount) * 100);

                  return (
                    <div key={spec.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{spec.name}</span>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>{spec.count} Specialist{spec.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{
                        height: '8px',
                        background: '#f1f5f9',
                        borderRadius: '9999px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #0f766e, #14b8a6)',
                          borderRadius: '9999px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Active Doctors Roster */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaUserMd size={18} style={{ color: '#0f766e' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Medical Staff & Consultation Tariff
                </h3>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {doctors.length} Doctors Listed
              </span>
            </div>

            {doctors.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                No doctors registered under this hospital.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Doctor</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Specialization</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Experience</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Consultation Fee</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Account Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doc) => (
                      <tr
                        key={doc.id}
                        style={{ borderBottom: '1px solid #f1f5f9' }}
                      >
                        <td style={{ padding: '0.9rem 1.25rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{doc.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{doc.qualification || 'MBBS'}</div>
                        </td>
                        <td style={{ padding: '0.9rem 1.25rem', color: '#334155', fontWeight: 600 }}>
                          {doc.specialization_name || 'General Medicine'}
                        </td>
                        <td style={{ padding: '0.9rem 1.25rem', color: '#64748b' }}>
                          {doc.experience || 0} Years
                        </td>
                        <td style={{ padding: '0.9rem 1.25rem', fontWeight: 700, color: '#0f766e' }}>
                          ₹{doc.consultation_fee || doc.fee || 500}
                        </td>
                        <td style={{ padding: '0.9rem 1.25rem' }}>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: doc.user_id ? '#dcfce7' : '#fef3c7',
                            color: doc.user_id ? '#15803d' : '#b45309'
                          }}>
                            {doc.user_id ? 'Linked User' : 'Profile Only'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
