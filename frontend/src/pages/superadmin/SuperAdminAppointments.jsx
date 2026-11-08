import React, { useState, useEffect, useCallback } from 'react';
import {
  FaCalendarCheck,
  FaSearch,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaCheck,
  FaTimes,
  FaUserMd,
  FaCalendarAlt,
  FaEye,
  FaHospital
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../services/appointmentService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';

export const SuperAdminAppointments = () => {
  const { hospitalName } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = statusFilter === 'All' ? {} : { status: statusFilter };
      const res = await appointmentService.getAppointments(params);
      if (res && res.success) {
        setAppointments(res.appointments || []);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error('Failed to fetch hospital appointments:', err);
      setError(getApiErrorMessage(err, 'Unable to load appointments for your hospital.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      setUpdatingId(id);
      await appointmentService.updateAppointmentStatus(id, newStatus);
      notify.success(`Appointment #${id} updated to ${newStatus}.`);
      fetchAppointments();
      if (selectedAppointment && selectedAppointment.id === id) {
        setSelectedAppointment(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      notify.error(getApiErrorMessage(err, `Failed to update appointment #${id}`));
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = appointments.filter((a) => {
    const term = search.toLowerCase();
    const idStr = String(a.id);
    const patName = (a.patient_name || '').toLowerCase();
    const docName = (a.doctor_name || '').toLowerCase();
    const specName = (a.specialization_name || '').toLowerCase();
    return (
      idStr.includes(term) ||
      patName.includes(term) ||
      docName.includes(term) ||
      specName.includes(term)
    );
  });

  // KPI counters
  const totalCount = appointments.length;
  const pendingCount = appointments.filter(a => a.status === 'Pending').length;
  const confirmedCount = appointments.filter(a => a.status === 'Confirmed').length;
  const completedCount = appointments.filter(a => a.status === 'Completed').length;
  const cancelledCount = appointments.filter(a => a.status === 'Cancelled').length;

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
            <FaClock size={11} /> Pending
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
            <FaCheckCircle size={11} /> Confirmed
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
            <FaCheck size={11} /> Completed
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
            <FaTimesCircle size={11} /> Cancelled
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
              Hospital Appointments
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
            Comprehensive schedule of all patient consultations, confirmations, and attendance status.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Total
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {totalCount}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid #fef3c7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
            Pending Action
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', marginTop: '0.25rem' }}>
            {pendingCount}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid #ccfbf1',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>
            Confirmed
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f766e', marginTop: '0.25rem' }}>
            {confirmedCount}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid #dcfce7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
            Completed
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', marginTop: '0.25rem' }}>
            {completedCount}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '1rem',
          border: '1px solid #fee2e2',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>
            Cancelled
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c', marginTop: '0.25rem' }}>
            {cancelledCount}
          </div>
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

      {/* Filter and Search Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <FaSearch style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8'
          }} />
          <input
            type="text"
            placeholder="Search by Patient, Doctor, Specialization, or Appt #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem 0.65rem 2.4rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: active ? '#0f766e' : '#f1f5f9',
                  color: active ? '#ffffff' : '#475569'
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <FaClock size={32} style={{ animation: 'spin 1s linear infinite', color: '#0f766e', marginBottom: '0.75rem' }} />
            <div>Loading hospital appointments...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <FaCalendarCheck size={40} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#334155' }}>
              No appointments found
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Try adjusting your status filter or search query.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.9rem 1.25rem' }}>ID</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Patient</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Doctor</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Schedule</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Fee</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((appt) => (
                  <tr
                    key={appt.id}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0f766e' }}>
                      #{appt.id}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {appt.patient_name || 'Anonymous Patient'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                        <span>{appt.patient_phone || appt.user_phone || 'No phone'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FaUserMd size={13} style={{ color: '#0f766e' }} />
                        {appt.doctor_name || 'Assigned Doctor'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {appt.specialization_name || 'General'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1e293b', fontWeight: 600 }}>
                        <FaCalendarAlt size={12} style={{ color: '#64748b' }} />
                        {appt.appointment_date}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                        <FaClock size={11} />
                        {appt.appointment_time}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      ₹{appt.consultation_fee || 0}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      {getStatusBadge(appt.status)}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedAppointment(appt)}
                          title="View Details"
                          style={{
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#475569',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <FaEye size={12} />
                        </button>

                        {appt.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              disabled={updatingId === appt.id}
                              onClick={() => handleStatusChange(appt.id, 'Confirmed')}
                              style={{
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#0f766e',
                                color: '#ffffff',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <FaCheck size={11} /> Confirm
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === appt.id}
                              onClick={() => handleStatusChange(appt.id, 'Cancelled')}
                              style={{
                                padding: '0.4rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #fca5a5',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {appt.status === 'Confirmed' && (
                          <>
                            <button
                              type="button"
                              disabled={updatingId === appt.id}
                              onClick={() => handleStatusChange(appt.id, 'Completed')}
                              style={{
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#15803d',
                                color: '#ffffff',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <FaCheck size={11} /> Complete
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === appt.id}
                              onClick={() => handleStatusChange(appt.id, 'Cancelled')}
                              style={{
                                padding: '0.4rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #fca5a5',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaCalendarCheck size={18} style={{ color: '#0f766e' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Appointment #{selectedAppointment.id} Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.25rem'
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Current Status:</div>
                <div>{getStatusBadge(selectedAppointment.status)}</div>
              </div>

              <div style={{
                background: '#f8fafc',
                borderRadius: '10px',
                padding: '1rem',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Patient
                  </div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                    {selectedAppointment.patient_name || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.1rem' }}>
                    {selectedAppointment.patient_phone || selectedAppointment.user_phone || 'No phone'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Consulting Doctor
                  </div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                    {selectedAppointment.doctor_name || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.1rem' }}>
                    {selectedAppointment.specialization_name || 'General'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Date & Time
                  </div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                    {selectedAppointment.appointment_date}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.1rem' }}>
                    {selectedAppointment.appointment_time}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Consultation Fee
                  </div>
                  <div style={{ fontWeight: 800, color: '#0f766e', fontSize: '1.1rem', marginTop: '0.2rem' }}>
                    ₹{selectedAppointment.consultation_fee || 0}
                  </div>
                </div>
              </div>

              {/* Consultation Reason / Notes */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Reason for Consultation / Symptoms
                </div>
                <div style={{
                  padding: '0.85rem',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  color: '#334155',
                  fontSize: '0.875rem',
                  lineHeight: 1.5
                }}>
                  {selectedAppointment.reason || selectedAppointment.notes || 'No symptoms or special notes provided by patient.'}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedAppointment.status === 'Pending' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedAppointment.id, 'Confirmed')}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#0f766e',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.8125rem'
                    }}
                  >
                    Confirm Appointment
                  </button>
                )}
                {selectedAppointment.status === 'Confirmed' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedAppointment.id, 'Completed')}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#15803d',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.8125rem'
                    }}
                  >
                    Mark Completed
                  </button>
                )}
                {selectedAppointment.status !== 'Cancelled' && selectedAppointment.status !== 'Completed' && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(selectedAppointment.id, 'Cancelled')}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #fca5a5',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.8125rem'
                    }}
                  >
                    Cancel Appointment
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8125rem'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
