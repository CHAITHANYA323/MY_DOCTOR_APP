import React, { useState, useEffect, useCallback } from 'react';
import {
  FaUserCheck,
  FaClock,
  FaCheckCircle,
  FaSearch,
  FaUserMd,
  FaHospital,
  FaTimes,
  FaTimesCircle,
  FaRedo,
  FaStethoscope,
  FaUser
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { receptionService } from '../../services/receptionService';
import { appointmentService } from '../../services/appointmentService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';

export const PatientCheckIn = () => {
  const { hospitalName } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [search, setSearch] = useState('');
  const [activeQueue, setActiveQueue] = useState('PENDING'); // 'PENDING' | 'WAITING' | 'ALL'

  // Check-In Action Modal
  const [checkInTarget, setCheckInTarget] = useState(null);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Cancellation Modal
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchTodayQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await receptionService.getStats();
      if (data && data.success) {
        setTodayAppointments(data.today_schedule || []);
      }
    } catch (err) {
      console.error('Failed to load check-in terminal queue:', err);
      setError(getApiErrorMessage(err, 'Unable to load today’s patient queue.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayQueue();
  }, [fetchTodayQueue]);

  const handleOpenCheckInModal = (appt) => {
    setCheckInTarget(appt);
    setCheckInNotes(`Patient arrived and verified at reception desk.`);
  };

  const handleConfirmCheckIn = async (e) => {
    e.preventDefault();
    if (!checkInTarget) return;

    try {
      setActionLoading(true);
      await receptionService.checkInPatient(checkInTarget.id, checkInNotes);
      notify.success(`Appointment #${checkInTarget.id} successfully checked in! Patient marked as waiting.`);
      setCheckInTarget(null);
      fetchTodayQueue();
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Failed to complete patient check-in.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancellation = async (e) => {
    e.preventDefault();
    if (!cancelTarget) return;

    try {
      setActionLoading(true);
      await receptionService.cancelAppointment(cancelTarget.id, cancelReason || 'Cancelled at front desk by receptionist.');
      notify.success(`Appointment #${cancelTarget.id} marked as Cancelled.`);
      setCancelTarget(null);
      fetchTodayQueue();
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Failed to cancel appointment.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Filter queue by active tab and search query
  const filteredAppointments = todayAppointments.filter((appt) => {
    const term = search.toLowerCase();
    const matchesSearch =
      String(appt.id).includes(term) ||
      (appt.patient_name || '').toLowerCase().includes(term) ||
      (appt.patient_phone || appt.user_phone || '').includes(term) ||
      (appt.doctor_name || '').toLowerCase().includes(term);

    let matchesTab = true;
    if (activeQueue === 'PENDING') {
      matchesTab = appt.status === 'Pending';
    } else if (activeQueue === 'WAITING') {
      matchesTab = appt.status === 'Confirmed';
    }

    return matchesSearch && matchesTab;
  });

  const pendingCount = todayAppointments.filter(a => a.status === 'Pending').length;
  const waitingCount = todayAppointments.filter(a => a.status === 'Confirmed').length;
  const completedCount = todayAppointments.filter(a => a.status === 'Completed').length;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Patient Arrival & Check-In Terminal
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
              <FaHospital size={11} /> {hospitalName || 'Your Hospital'}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Front desk triage terminal: confirm patient arrivals, manage waiting room queues, and notify clinical staff.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTodayQueue}
          style={{
            padding: '0.55rem 0.95rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#475569',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <FaRedo size={12} /> Refresh Live Queue
        </button>
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

      {/* Queue Counters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem'
      }}>
        <div
          onClick={() => setActiveQueue('PENDING')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '1.15rem',
            border: activeQueue === 'PENDING' ? '2px solid #b45309' : '1px solid #fef3c7',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b45309' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Awaiting Arrival</span>
            <FaClock />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#b45309', marginTop: '0.25rem' }}>
            {pendingCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.15rem' }}>
            Patients scheduled to arrive
          </div>
        </div>

        <div
          onClick={() => setActiveQueue('WAITING')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '1.15rem',
            border: activeQueue === 'WAITING' ? '2px solid #0f766e' : '1px solid #ccfbf1',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#0f766e' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Waiting in Reception</span>
            <FaUserCheck />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f766e', marginTop: '0.25rem' }}>
            {waitingCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0f766e', marginTop: '0.15rem' }}>
            Checked in & ready for doctor
          </div>
        </div>

        <div
          onClick={() => setActiveQueue('ALL')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '1.15rem',
            border: activeQueue === 'ALL' ? '2px solid #0f172a' : '1px solid #e2e8f0',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Schedule</span>
            <FaCheckCircle />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {todayAppointments.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
            {completedCount} already consulted
          </div>
        </div>
      </div>

      {/* Terminal Filter Bar */}
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
        {/* Rapid Search input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
          <FaSearch style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8'
          }} />
          <input
            type="text"
            placeholder="Scan or Search by Appt #, Patient Name, Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem 0.6rem 2.4rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Queue Selector Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={() => setActiveQueue('PENDING')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeQueue === 'PENDING' ? '#b45309' : '#f1f5f9',
              color: activeQueue === 'PENDING' ? '#ffffff' : '#475569'
            }}
          >
            Awaiting Arrival ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveQueue('WAITING')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeQueue === 'WAITING' ? '#0f766e' : '#f1f5f9',
              color: activeQueue === 'WAITING' ? '#ffffff' : '#475569'
            }}
          >
            In Waiting Area ({waitingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveQueue('ALL')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeQueue === 'ALL' ? '#0f172a' : '#f1f5f9',
              color: activeQueue === 'ALL' ? '#ffffff' : '#475569'
            }}
          >
            All Today ({todayAppointments.length})
          </button>
        </div>
      </div>

      {/* Queue Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <FaClock size={28} style={{ animation: 'spin 1s linear infinite', color: '#0f766e', marginBottom: '0.5rem' }} />
            <div>Loading live queue...</div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <FaCheckCircle size={36} style={{ color: '#cbd5e1', marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 600, color: '#334155' }}>
              No appointments in this queue
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              All scheduled patients for this filter have either checked in or been attended to.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Appt #</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Scheduled Time</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Patient Name & Contact</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Consulting Doctor</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Terminal Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appt) => (
                  <tr
                    key={appt.id}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: '#0f766e' }}>
                      #{appt.id}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FaClock size={11} style={{ color: '#0f766e' }} />
                        {appt.appointment_time}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                        {appt.appointment_date}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {appt.patient_name || 'Walk-in Patient'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                        {appt.patient_phone || appt.user_phone || 'No phone'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FaUserMd size={12} style={{ color: '#0f766e' }} />
                        {appt.doctor_name || 'Assigned Doctor'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                        {appt.specialization_name || 'General'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      {appt.status === 'Pending' ? (
                        <span style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: '#fef3c7',
                          color: '#b45309'
                        }}>
                          Pending Arrival
                        </span>
                      ) : appt.status === 'Confirmed' ? (
                        <span style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: '#ccfbf1',
                          color: '#0f766e'
                        }}>
                          Waiting in Reception
                        </span>
                      ) : (
                        <span style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: '#dcfce7',
                          color: '#15803d'
                        }}>
                          {appt.status}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        {appt.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenCheckInModal(appt)}
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
                              <FaUserCheck size={12} /> Confirm Arrival
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancelTarget(appt)}
                              style={{
                                padding: '0.45rem 0.65rem',
                                borderRadius: '6px',
                                border: '1px solid #fca5a5',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {appt.status === 'Confirmed' && (
                          <button
                            type="button"
                            onClick={() => setCancelTarget(appt)}
                            style={{
                              padding: '0.45rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#64748b',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Mark Cancellation
                          </button>
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

      {/* Check-In Confirmation Modal */}
      {checkInTarget && (
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
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <form onSubmit={handleConfirmCheckIn}>
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaUserCheck size={18} style={{ color: '#0f766e' }} />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Confirm Patient Arrival
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckInTarget(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.2rem' }}
                >
                  <FaTimes />
                </button>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '10px',
                  padding: '1rem',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      Patient Details
                    </span>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                      {checkInTarget.patient_name || 'Patient'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      Appt #{checkInTarget.id} • Scheduled for {checkInTarget.appointment_time}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      Consulting Specialist
                    </span>
                    <div style={{ fontWeight: 700, color: '#0f766e' }}>
                      Dr. {checkInTarget.doctor_name || 'Doctor'} ({checkInTarget.specialization_name || 'General'})
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Arrival & Triage Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={checkInNotes}
                    onChange={(e) => setCheckInNotes(e.target.value)}
                    placeholder="e.g. Vitals checked, BP: 120/80. Seated in waiting room."
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                background: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={() => setCheckInTarget(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0f766e',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: actionLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Mark Checked In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelTarget && (
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
            maxWidth: '460px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <form onSubmit={handleConfirmCancellation}>
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fff1f2'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaTimesCircle size={18} style={{ color: '#e11d48' }} />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#9f1239' }}>
                    Cancel Appointment #{cancelTarget.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.2rem' }}
                >
                  <FaTimes />
                </button>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569' }}>
                  Are you sure you want to cancel the appointment for <strong>{cancelTarget.patient_name}</strong>?
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Reason for Cancellation
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Patient called to reschedule, no-show"
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                background: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    cursor: 'pointer'
                  }}
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#e11d48',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: actionLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientCheckIn;
