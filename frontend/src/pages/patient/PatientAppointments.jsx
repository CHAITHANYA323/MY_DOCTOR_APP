import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCalendarCheck,
  FaSearch,
  FaUserMd,
  FaHospital,
  FaClock,
  FaTimes,
  FaExclamationTriangle,
  FaSync,
  FaPlus,
  FaFilter,
  FaInfoCircle,
  FaNotesMedical,
  FaMapMarkerAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';
import { patientService } from '../../services/patientService';

export const PatientAppointments = () => {
  const { t } = useLanguage();
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
      console.error('Error fetching appointments:', err);
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
        toast.success(t('patientPortal.cancelSuccess') || 'Appointment cancelled successfully.');
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

  const counts = useMemo(() => {
    const total = appointments.length;
    const upcoming = appointments.filter(a => ['Pending', 'Confirmed'].includes(a.status) && a.appointment_date >= todayStr).length;
    const completed = appointments.filter(a => a.status === 'Completed').length;
    const cancelled = appointments.filter(a => a.status === 'Cancelled').length;
    return { total, upcoming, completed, cancelled };
  }, [appointments, todayStr]);

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'confirmed') {
      return { bg: '#ECFDF5', border: '#A7F3D0', text: '#16A36A', label: t('patientPortal.statusConfirmed') || 'Confirmed' };
    }
    if (s === 'completed') {
      return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1677C8', label: t('patientPortal.statusCompleted') || 'Completed' };
    }
    if (s === 'cancelled') {
      return { bg: '#FEF2F2', border: '#FECACA', text: '#DC5252', label: t('patientPortal.statusCancelled') || 'Cancelled' };
    }
    return { bg: '#FFFBEB', border: '#FDE68A', text: '#E9A23B', label: t('patientPortal.statusPending') || 'Pending' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            {t('portalNav.myAppointments') || 'My Appointments'}
          </h1>
          <p style={{ color: '#718096', fontSize: '0.88rem', margin: 0 }}>
            {t('patientPortal.scheduledVisitsSubtitle') || 'Track upcoming visits, clinical consultations, and appointment history'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchAppointments}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              padding: '0.6rem 1rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer'
            }}
          >
            <FaSync size={12} className={loading ? 'animate-spin' : ''} />
            <span>{t('patientPortal.refresh') || 'Refresh'}</span>
          </button>

          <Link
            to="/patient/doctors"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#1677C8',
              color: '#FFFFFF',
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.86rem',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(22, 119, 200, 0.25)'
            }}
          >
            <FaPlus size={11} />
            <span>{t('patientPortal.bookAppointment') || 'Book New Visit'}</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '1.25rem',
        boxShadow: '0 2px 8px rgba(16, 42, 67, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: statusFilter === 'all' ? '#102A43' : '#F1F5F9',
                color: statusFilter === 'all' ? '#FFFFFF' : '#475569',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {t('patientPortal.allAppointments') || 'All'} ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('upcoming')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: statusFilter === 'upcoming' ? '#1677C8' : '#F1F5F9',
                color: statusFilter === 'upcoming' ? '#FFFFFF' : '#475569',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {t('patientPortal.upcoming') || 'Upcoming'} ({counts.upcoming})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: statusFilter === 'completed' ? '#16A36A' : '#F1F5F9',
                color: statusFilter === 'completed' ? '#FFFFFF' : '#475569',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {t('patientPortal.completed') || 'Completed'} ({counts.completed})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('cancelled')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: statusFilter === 'cancelled' ? '#DC5252' : '#F1F5F9',
                color: statusFilter === 'cancelled' ? '#FFFFFF' : '#475569',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {t('patientPortal.cancelled') || 'Cancelled'} ({counts.cancelled})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 280px', maxWidth: '450px' }}>
            <FaSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('patientPortal.filterByDoctorOrHospital') || 'Search doctor, hospital, or reason...'}
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.4rem',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '0.84rem',
                outline: 'none',
                backgroundColor: '#F8FAFC'
              }}
            />
          </div>
        </div>
      </div>

      {/* Appointments List / Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: '170px', borderRadius: '16px', backgroundColor: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3.5rem 1.5rem',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(16, 42, 67, 0.03)'
        }}>
          <FaCalendarCheck size={44} style={{ color: '#9FB3C8', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#102A43', marginBottom: '0.4rem' }}>
            {t('patientPortal.noUpcoming') || 'No Appointments Found'}
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#718096', maxWidth: '360px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
            {searchQuery.trim()
              ? 'No appointments matched your search query. Try clearing the filter.'
              : (t('patientPortal.noUpcomingSub') || 'You have no recorded appointments in this category.')}
          </p>
          <Link
            to="/patient/doctors"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#1677C8',
              color: '#FFFFFF',
              padding: '0.65rem 1.4rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.86rem',
              textDecoration: 'none'
            }}
          >
            <FaPlus size={11} />
            <span>{t('patientPortal.bookAppointment') || 'Book Consultation'}</span>
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredAppointments.map((appt) => {
            const badge = getStatusBadge(appt.status);
            const isCompleted = appt.status === 'Completed';
            const isCancelled = appt.status === 'Cancelled';

            return (
              <div
                key={appt.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '1.4rem',
                  boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'box-shadow 0.2s ease'
                }}
              >
                <div>
                  {/* Doctor & Status Top Row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(22, 119, 200, 0.1)',
                        color: '#1677C8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        <FaUserMd />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.15rem 0' }}>
                          {appt.doctor_name || 'Medical Specialist'}
                        </h4>
                        <div style={{ fontSize: '0.76rem', color: '#13B8A6', fontWeight: 700 }}>
                          {appt.specialization_name || 'Physician'}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      backgroundColor: badge.bg,
                      color: badge.text,
                      border: `1px solid ${badge.border}`,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      flexShrink: 0
                    }}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Hospital & Location */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    padding: '0.75rem',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.82rem',
                    color: '#475569',
                    marginBottom: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <FaHospital size={13} style={{ color: '#1677C8', flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, color: '#102A43' }}>
                        {appt.hospital_name || 'Network Hospital Facility'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <FaClock size={13} style={{ color: '#13B8A6', flexShrink: 0 }} />
                      <span>
                        <strong style={{ color: '#102A43' }}>{appt.appointment_date}</strong> &bull; {appt.appointment_time || 'Morning Slot'}
                      </span>
                    </div>
                  </div>

                  {/* Reason for Visit */}
                  {appt.reason && (
                    <div style={{ fontSize: '0.8rem', color: '#718096', lineHeight: 1.45 }}>
                      <strong style={{ color: '#243447' }}>Reason:</strong> {appt.reason}
                    </div>
                  )}
                </div>

                {/* Card Actions Bottom */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid #F0F4F8'
                }}>
                  <button
                    type="button"
                    onClick={() => setSelectedAppt(appt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#1677C8',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <FaInfoCircle size={12} />
                    <span>{t('patientPortal.viewDetails') || 'View Details'}</span>
                  </button>

                  {!isCompleted && !isCancelled && (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(appt)}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '6px',
                        border: '1px solid #FECACA',
                        backgroundColor: '#FEF2F2',
                        color: '#DC5252',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {t('patientPortal.cancelAppointment') || 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(16, 42, 67, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <FaCalendarCheck size={18} style={{ color: '#1677C8' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#102A43', margin: 0 }}>
                  {t('patientPortal.appointmentDetails') || 'Consultation Details'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                style={{ background: 'none', border: 'none', color: '#718096', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Doctor</span>
                <strong style={{ color: '#102A43' }}>{selectedAppt.doctor_name || 'Medical Specialist'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Hospital</span>
                <span style={{ color: '#102A43', fontWeight: 600 }}>{selectedAppt.hospital_name || 'Network Hospital'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Date & Slot</span>
                <strong style={{ color: '#1677C8' }}>{selectedAppt.appointment_date} at {selectedAppt.appointment_time || 'Morning Slot'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Status</span>
                <span style={{ fontWeight: 800, color: getStatusBadge(selectedAppt.status).text }}>
                  {selectedAppt.status}
                </span>
              </div>
              {selectedAppt.reason && (
                <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#718096', marginBottom: '0.2rem' }}>CONSULTATION REASON</div>
                  <div style={{ color: '#243447' }}>{selectedAppt.reason}</div>
                </div>
              )}
              {selectedAppt.notes && (
                <div style={{ padding: '0.75rem', backgroundColor: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1677C8', marginBottom: '0.2rem' }}>CLINICAL NOTES & ADVICE</div>
                  <div style={{ color: '#1E3A8A' }}>{selectedAppt.notes}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(16, 42, 67, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '440px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#DC5252' }}>
              <FaExclamationTriangle size={24} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#102A43' }}>
                {t('patientPortal.cancelConfirmTitle') || 'Cancel Appointment?'}
              </h3>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#718096', lineHeight: 1.5, margin: 0 }}>
              {t('patientPortal.cancelConfirmText') || 'Are you sure you want to cancel this consultation? This action cannot be undone.'}
            </p>
            <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.82rem' }}>
              <div><strong style={{ color: '#102A43' }}>Doctor:</strong> {cancelTarget.doctor_name}</div>
              <div><strong style={{ color: '#102A43' }}>Date:</strong> {cancelTarget.appointment_date}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                style={{
                  padding: '0.6rem 1.15rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                {t('patientPortal.keepAppointment') || 'Keep Appointment'}
              </button>
              <button
                type="button"
                onClick={handleCancelAppointment}
                disabled={cancelling}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#DC5252',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                {cancelling && <FaSync size={11} className="animate-spin" />}
                <span>{t('patientPortal.confirmCancelAction') || 'Yes, Cancel'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
