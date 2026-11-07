import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaCalendarCheck, 
  FaPlus, 
  FaCheckCircle, 
  FaUserMd,
  FaArrowRight
} from 'react-icons/fa';
import { appointmentService } from '../services/appointmentService';
import { AppointmentCard } from '../components/AppointmentCard';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { notify } from '../utils/toast';

export const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState('');

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = statusFilter === 'All' ? {} : { status: statusFilter };
      const res = await appointmentService.getAppointments(params);
      if (res.success) {
        setAppointments(res.appointments);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    try {
      const res = await appointmentService.cancelAppointment(cancelTarget.id);
      if (res.success) {
        notify.success(`Appointment #${cancelTarget.id} has been cancelled successfully.`);
        setCancelTarget(null);
        fetchAppointments();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to cancel appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = [
    { label: 'All Appointments', value: 'All' },
    { label: 'Pending Approval', value: 'Pending' },
    { label: 'Confirmed', value: 'Confirmed' },
    { label: 'Completed Visits', value: 'Completed' },
    { label: 'Cancelled', value: 'Cancelled' }
  ];

  return (
    <div style={{ padding: '2.5rem 0 5rem', backgroundColor: 'var(--bg-main)', minHeight: '85vh' }}>
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="section-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <FaCalendarCheck /> Patient Portal
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--slate-900)', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
              My Doctor Appointments
            </h1>
            <p style={{ color: 'var(--slate-600)', fontSize: '1rem', margin: 0 }}>
              View upcoming visits, download appointment receipts, or manage your schedule
            </p>
          </div>

          <Link 
            to="/doctors" 
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}
          >
            <FaPlus /> Book New Appointment
          </Link>
        </div>

        {/* Quick Tips / Notification banner */}
        {notification && (
          <div style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary-dark)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--primary)'
          }}>
            <div className="flex items-center gap-2">
              <FaCheckCircle />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>✕</button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.6rem',
          borderBottom: '2px solid var(--slate-200)',
          marginBottom: '2rem',
          overflowX: 'auto',
          paddingBottom: '0.75rem',
          scrollbarWidth: 'none'
        }}>
          {tabs.map((tab) => {
            const isSelected = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: isSelected ? 700 : 600,
                  color: isSelected ? 'var(--primary-dark)' : 'var(--slate-600)',
                  backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? '1px solid var(--primary-light)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Appointment Cards List */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.75rem' }}>
            {[1, 2, 3].map(n => (
              <div key={n} className="skeleton" style={{ height: '220px', borderRadius: 'var(--radius-xl)' }} />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: '1.25rem' }}>
              <FaCalendarCheck />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
              No appointments found
            </h3>
            <p style={{ color: 'var(--slate-600)', fontSize: '0.95rem', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
              {statusFilter === 'All' 
                ? "You haven't scheduled any doctor consultations yet. Find a trusted doctor and book in 5 simple steps."
                : `You don't have any appointments currently marked as "${statusFilter}".`}
            </p>
            <Link 
              to="/doctors" 
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FaUserMd /> Find a Doctor & Book <FaArrowRight size={12} />
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.75rem'
          }}>
            {appointments.map((appt) => (
              <AppointmentCard 
                key={appt.id} 
                appointment={appt} 
                onCancel={(item) => setCancelTarget(item)} 
              />
            ))}
          </div>
        )}

        {/* Confirmation Modal for Cancelling */}
        <ConfirmationModal 
          isOpen={!!cancelTarget}
          title="Cancel Appointment"
          message={`Are you sure you want to cancel your consultation with ${cancelTarget?.doctor_name} scheduled for ${cancelTarget?.appointment_date} at ${cancelTarget?.appointment_time}?`}
          confirmText="Yes, Cancel Appointment"
          cancelText="Keep Appointment"
          loading={actionLoading}
          onConfirm={handleCancelConfirm}
          onCancel={() => setCancelTarget(null)}
        />
      </div>
    </div>
  );
};

export default Appointments;
