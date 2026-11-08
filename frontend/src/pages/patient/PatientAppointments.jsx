import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCalendarCheck,
  FaSearch,
  FaFilter,
  FaUserMd,
  FaHospital,
  FaClock,
  FaTimes,
  FaExclamationTriangle,
  FaSync,
  FaPlus
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { patientService } from '../../services/patientService';

export const PatientAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getAppointments();
      if (res.success) {
        setAppointments(res.appointments || []);
      } else {
        toast.error(res.message || 'Failed to load your appointments.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error loading appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCancelAppointment = async () => {
    if (!cancelTarget) return;
    try {
      setCancelling(true);
      const res = await patientService.cancelAppointment(cancelTarget.id);
      if (res.success) {
        toast.success('Appointment cancelled successfully.');
        setCancelTarget(null);
        fetchAppointments();
      } else {
        toast.error(res.message || 'Failed to cancel appointment.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error cancelling appointment.');
    } finally {
      setCancelling(false);
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // Status filter
      if (statusFilter === 'upcoming') {
        if (!['Pending', 'Confirmed'].includes(appt.status) || appt.appointment_date < todayStr) {
          return false;
        }
      } else if (statusFilter !== 'all') {
        if (appt.status.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const doc = (appt.doctor_name || '').toLowerCase();
        const hosp = (appt.hospital_name || '').toLowerCase();
        const reason = (appt.reason || '').toLowerCase();
        if (!doc.includes(q) && !hosp.includes(q) && !reason.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, statusFilter, searchQuery, todayStr]);

  return (
    <div>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>
            My Consultations
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Track and manage your appointments across all healthcare facilities ({appointments.length} total)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchAppointments}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <FaSync size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link
            to="/patient/doctors"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#0284c7',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            <FaPlus size={12} />
            Book New Visit
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        marginBottom: '1.75rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <FaSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by doctor, hospital, or consultation reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaFilter size={13} style={{ color: '#64748b' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                flex: 1,
                padding: '0.65rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.875rem',
                background: '#ffffff',
                color: '#334155'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="upcoming">Upcoming (Active)</option>
              <option value="pending">Pending Check-in</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Counts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
          {[
            { label: 'All', val: 'all', count: appointments.length },
            { label: 'Upcoming', val: 'upcoming', count: appointments.filter(a => ['Pending', 'Confirmed'].includes(a.status) && a.appointment_date >= todayStr).length },
            { label: 'Completed', val: 'completed', count: appointments.filter(a => a.status === 'Completed').length },
            { label: 'Cancelled', val: 'cancelled', count: appointments.filter(a => a.status === 'Cancelled').length }
          ].map(pill => (
            <button
              key={pill.val}
              onClick={() => setStatusFilter(pill.val)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: statusFilter === pill.val ? '1px solid #0284c7' : '1px solid #e2e8f0',
                background: statusFilter === pill.val ? '#e0f2fe' : '#ffffff',
                color: statusFilter === pill.val ? '#0369a1' : '#64748b',
                cursor: 'pointer'
              }}
            >
              {pill.label} ({pill.count})
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
            <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', margin: '0 auto 1rem auto' }} />
            <p>Loading your consultations...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
            <FaCalendarCheck size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>No Consultations Found</h3>
            <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
              No appointments match your selected status and search criteria.
            </p>
            <Link
              to="/patient/doctors"
              style={{
                display: 'inline-block',
                background: '#0284c7',
                color: '#ffffff',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none'
              }}
            >
              Find a Doctor
            </Link>
          </div>
        ) : (
          filteredAppointments.map((appt) => {
            const statusColors = {
              Pending: { bg: '#fef3c7', text: '#b45309' },
              Confirmed: { bg: '#e0f2fe', text: '#0369a1' },
              Completed: { bg: '#dcfce7', text: '#15803d' },
              Cancelled: { bg: '#fee2e2', text: '#b91c1c' }
            }[appt.status] || { bg: '#f1f5f9', text: '#475569' };

            const isUpcoming = ['Pending', 'Confirmed'].includes(appt.status) && appt.appointment_date >= todayStr;

            return (
              <div
                key={appt.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {appt.doctor_image ? (
                        <img src={appt.doctor_image} alt={appt.doctor_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <FaUserMd size={22} />
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.2rem 0' }}>
                        {appt.doctor_name}
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 600 }}>
                        {appt.specialization}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FaHospital size={12} /> {appt.hospital_name} ({appt.hospital_location})
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                    <span style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: statusColors.bg,
                      color: statusColors.text
                    }}>
                      {appt.status}
                    </span>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                      ₹{appt.consultation_fee}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.85rem', color: '#475569', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FaClock size={13} style={{ color: '#0284c7' }} />
                    <span><strong>Date & Time:</strong> {appt.appointment_date} at {appt.appointment_time}</span>
                  </div>
                  <div>
                    <strong>Reason:</strong> {appt.reason}
                  </div>
                </div>

                {appt.notes && (
                  <div style={{ background: '#f0fdf4', borderLeft: '3px solid #10b981', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', color: '#166534' }}>
                    <strong>Doctor Clinical Assessment & Prescription:</strong>
                    <div style={{ whiteSpace: 'pre-line', marginTop: '0.25rem' }}>
                      {appt.notes}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <button
                    onClick={() => setSelectedAppt(appt)}
                    style={{
                      padding: '0.45rem 1rem',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#475569',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    View Details
                  </button>

                  {isUpcoming && (
                    <button
                      onClick={() => setCancelTarget(appt)}
                      style={{
                        padding: '0.45rem 1rem',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        color: '#b91c1c',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Appointment Details Modal */}
      {selectedAppt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Consultation Details
              </h3>
              <button
                onClick={() => setSelectedAppt(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
              >
                <FaTimes size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: '#334155', marginBottom: '1.5rem' }}>
              <div><strong>Doctor:</strong> {selectedAppt.doctor_name} ({selectedAppt.specialization})</div>
              <div><strong>Hospital:</strong> {selectedAppt.hospital_name} - {selectedAppt.hospital_location}</div>
              <div><strong>Appointment Slot:</strong> {selectedAppt.appointment_date} at {selectedAppt.appointment_time}</div>
              <div><strong>Status:</strong> {selectedAppt.status}</div>
              <div><strong>Consultation Fee:</strong> ₹{selectedAppt.consultation_fee}</div>
              <div><strong>Reason:</strong> {selectedAppt.reason}</div>
              {selectedAppt.notes && (
                <div style={{ marginTop: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', borderLeft: '3px solid #0284c7' }}>
                  <strong>Doctor's Notes:</strong>
                  <div style={{ whiteSpace: 'pre-line', marginTop: '0.25rem' }}>
                    {selectedAppt.notes}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedAppt(null)}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: '#0284c7',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelTarget && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#dc2626' }}>
              <FaExclamationTriangle size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Cancel Consultation?
              </h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to cancel your consultation with <strong>{cancelTarget.doctor_name}</strong> on <strong>{cancelTarget.appointment_date}</strong> at <strong>{cancelTarget.appointment_time}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Keep Appointment
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelAppointment}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: cancelling ? 'not-allowed' : 'pointer'
                }}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
