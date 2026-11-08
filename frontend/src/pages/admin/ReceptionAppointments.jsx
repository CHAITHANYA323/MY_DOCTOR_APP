import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaSearch,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaUserCheck,
  FaHospital,
  FaUserMd,
  FaTimes,
  FaEye,
  FaCalendarPlus
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../services/appointmentService';
import { receptionService } from '../../services/receptionService';
import { doctorService } from '../../services/doctorService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';

export const ReceptionAppointments = () => {
  const { user, hospitalName } = useAuth();
  const location = useLocation();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // View Details Modal
  const [selectedAppt, setSelectedAppt] = useState(null);

  // New Booking Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [bookingForm, setBookingForm] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '10:00 AM',
    reason: 'General Consultation'
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Handle preselected patient passed via navigate state from RegisterPatient or PatientSearch
  useEffect(() => {
    if (location.state?.preselectedPatient) {
      const p = location.state.preselectedPatient;
      setBookingForm(prev => ({
        ...prev,
        patient_id: p.id
      }));
      setIsBookModalOpen(true);
    }
  }, [location.state]);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = statusFilter === 'ALL' ? {} : { status: statusFilter };
      const res = await appointmentService.getAppointments(params);
      if (res && res.success) {
        setAppointments(res.appointments || []);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError(getApiErrorMessage(err, 'Unable to load hospital appointments.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Load doctors for this hospital when book modal is opened
  const loadBookingPrerequisites = async () => {
    try {
      const [docRes, patRes] = await Promise.all([
        doctorService.getDoctors({ hospital_id: user?.hospital_id, limit: 100 }),
        receptionService.getPatients({ limit: 100 })
      ]);
      if (docRes && docRes.success) setDoctors(docRes.doctors || []);
      if (patRes && patRes.success) setPatientsList(patRes.patients || []);
    } catch (err) {
      console.error('Failed to load doctors or patients:', err);
    }
  };

  const handleOpenBookModal = () => {
    setBookingError('');
    setIsBookModalOpen(true);
    loadBookingPrerequisites();
  };

  const handleQuickCheckIn = async (id) => {
    try {
      setActionLoadingId(id);
      await receptionService.checkInPatient(id, 'Arrival confirmed at front desk.');
      notify.success(`Appointment #${id} marked as Checked In.`);
      fetchAppointments();
      if (selectedAppt && selectedAppt.id === id) {
        setSelectedAppt(prev => ({ ...prev, status: 'Confirmed' }));
      }
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Check-in failed.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuickCancel = async (id) => {
    try {
      setActionLoadingId(id);
      await receptionService.cancelAppointment(id, 'Cancelled by receptionist at desk.');
      notify.success(`Appointment #${id} marked as Cancelled.`);
      fetchAppointments();
      if (selectedAppt && selectedAppt.id === id) {
        setSelectedAppt(prev => ({ ...prev, status: 'Cancelled' }));
      }
    } catch (err) {
      notify.error(getApiErrorMessage(err, 'Cancellation failed.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setBookingError('');

    if (!bookingForm.patient_id) {
      setBookingError('Please select a registered patient.');
      return;
    }
    if (!bookingForm.doctor_id) {
      setBookingError('Please choose a consultant doctor.');
      return;
    }
    if (!bookingForm.appointment_date || !bookingForm.appointment_time || !bookingForm.reason) {
      setBookingError('Please fill in appointment date, time, and reason.');
      return;
    }

    try {
      setBookingLoading(true);
      const payload = {
        patient_id: Number(bookingForm.patient_id),
        doctor_id: Number(bookingForm.doctor_id),
        appointment_date: bookingForm.appointment_date,
        appointment_time: bookingForm.appointment_time,
        reason: bookingForm.reason.trim()
      };

      const res = await receptionService.bookAppointment(payload);
      if (res && res.success) {
        notify.success('Consultation booked successfully!');
        setIsBookModalOpen(false);
        fetchAppointments();
      } else {
        setBookingError(res.message || 'Failed to book appointment.');
      }
    } catch (err) {
      console.error('Booking failed:', err);
      setBookingError(getApiErrorMessage(err, 'Failed to book appointment.'));
    } finally {
      setBookingLoading(false);
    }
  };

  const filtered = appointments.filter((a) => {
    const term = search.toLowerCase();
    return (
      String(a.id).includes(term) ||
      (a.patient_name || '').toLowerCase().includes(term) ||
      (a.doctor_name || '').toLowerCase().includes(term) ||
      (a.specialization_name || '').toLowerCase().includes(term)
    );
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
            <FaUserCheck size={10} /> Checked In
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
            <FaCheckCircle size={10} /> Completed
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
              Hospital Consultation Schedule
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
            Manage appointments, perform arrival check-in, and book new consultations for registered facility patients.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenBookModal}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: '#0f766e',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <FaCalendarPlus size={14} /> Book New Consultation
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
            placeholder="Search by Patient Name, Doctor, or Appt #..."
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

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['ALL', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? '#0f766e' : '#f1f5f9',
                  color: active ? '#ffffff' : '#475569'
                }}
              >
                {tab === 'Confirmed' ? 'Checked In' : tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appointments Data Table */}
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
            <div>Loading consultation schedule...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <FaCalendarAlt size={36} style={{ color: '#cbd5e1', marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 600, color: '#334155' }}>
              No appointments found matching this filter
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Schedule new visits using the "Book New Consultation" button above.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>ID</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Patient Name</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Doctor & Department</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Date & Time</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Consultation Fee</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
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
                    <td style={{ padding: '0.95rem 1.25rem', fontWeight: 800, color: '#0f766e' }}>
                      #{appt.id}
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
                        <FaUserMd size={12} style={{ color: '#0f766e' }} />
                        {appt.doctor_name || 'Assigned Doctor'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                        {appt.specialization_name || 'General'}
                      </div>
                    </td>
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {appt.appointment_date}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                        <FaClock size={10} /> {appt.appointment_time}
                      </div>
                    </td>
                    <td style={{ padding: '0.95rem 1.25rem', fontWeight: 700, color: '#0f766e' }}>
                      ₹{appt.consultation_fee || 0}
                    </td>
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      {getStatusBadge(appt.status)}
                    </td>
                    <td style={{ padding: '0.95rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedAppt(appt)}
                          title="View Consultation Details"
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
                          <FaEye size={11} />
                        </button>

                        {appt.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              disabled={actionLoadingId === appt.id}
                              onClick={() => handleQuickCheckIn(appt.id)}
                              style={{
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#0f766e',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <FaUserCheck size={11} /> Check In
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === appt.id}
                              onClick={() => handleQuickCancel(appt.id)}
                              style={{
                                padding: '0.4rem 0.6rem',
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
                            disabled={actionLoadingId === appt.id}
                            onClick={() => handleQuickCancel(appt.id)}
                            style={{
                              padding: '0.4rem 0.6rem',
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
      {selectedAppt && (
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
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaCalendarAlt size={16} style={{ color: '#0f766e' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Appointment #{selectedAppt.id} Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.2rem' }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Current Status:</span>
                {getStatusBadge(selectedAppt.status)}
              </div>

              <div style={{
                background: '#f8fafc',
                borderRadius: '10px',
                padding: '1rem',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                fontSize: '0.85rem'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Patient
                  </span>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
                    {selectedAppt.patient_name || 'Patient'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {selectedAppt.patient_phone || selectedAppt.user_phone || 'No phone'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Doctor
                  </span>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
                    Dr. {selectedAppt.doctor_name || 'Doctor'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {selectedAppt.specialization_name || 'General'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Scheduled Time
                  </span>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
                    {selectedAppt.appointment_date}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {selectedAppt.appointment_time}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Consultation Fee
                  </span>
                  <div style={{ fontWeight: 800, color: '#0f766e', fontSize: '1.05rem', marginTop: '0.15rem' }}>
                    ₹{selectedAppt.consultation_fee || 0}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                  Reason for Visit / Symptoms
                </span>
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  color: '#334155',
                  fontSize: '0.85rem'
                }}>
                  {selectedAppt.reason || 'General Consultation'}
                </div>
              </div>
            </div>

            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              {selectedAppt.status === 'Pending' && (
                <button
                  type="button"
                  onClick={() => handleQuickCheckIn(selectedAppt.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0f766e',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer'
                  }}
                >
                  Check In Patient
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  marginLeft: 'auto'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book New Consultation Modal */}
      {isBookModalOpen && (
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
            overflow: 'hidden'
          }}>
            <form onSubmit={handleCreateBooking}>
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaCalendarPlus size={18} style={{ color: '#0f766e' }} />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Book Patient Consultation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.2rem' }}
                >
                  <FaTimes />
                </button>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {bookingError && (
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                    fontSize: '0.825rem'
                  }}>
                    {bookingError}
                  </div>
                )}

                {/* Patient Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Select Patient <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={bookingForm.patient_id}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, patient_id: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  >
                    <option value="">-- Choose Registered Patient --</option>
                    {patientsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id} - {p.name} ({p.phone || p.email})
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    Don't see the patient? Register them first under "Register Patient".
                  </span>
                </div>

                {/* Doctor Selector (Strictly in this hospital) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Consulting Doctor ({hospitalName || 'Your Hospital'}) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={bookingForm.doctor_id}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, doctor_id: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  >
                    <option value="">-- Choose In-Facility Doctor --</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.name} ({d.specialization_name || 'Specialist'}) - Fee: ₹{d.consultation_fee || d.fee || 500}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={bookingForm.appointment_date}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, appointment_date: e.target.value }))}
                      required
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

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Time Slot <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={bookingForm.appointment_time}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, appointment_time: e.target.value }))}
                      required
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    >
                      {['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
                        '12:00 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Consultation Reason */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Reason for Consultation <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={bookingForm.reason}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, reason: e.target.value }))}
                    required
                    placeholder="e.g. Fever, Chest Discomfort, Routine Health Check"
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
                  onClick={() => setIsBookModalOpen(false)}
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
                  disabled={bookingLoading}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0f766e',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: bookingLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {bookingLoading ? 'Scheduling...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionAppointments;
