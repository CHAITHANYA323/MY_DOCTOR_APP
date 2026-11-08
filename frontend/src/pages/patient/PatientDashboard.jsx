import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCalendarCheck,
  FaClock,
  FaUserMd,
  FaNotesMedical,
  FaAmbulance,
  FaCheckCircle,
  FaArrowRight,
  FaSync,
  FaPhoneAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { patientService } from '../../services/patientService';

export const PatientDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await patientService.getDashboardStats();
      if (res.success) {
        setStats(res);
      } else {
        toast.error(res.message || 'Failed to load patient health dashboard.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error loading dashboard statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      setCancelling(true);
      const res = await patientService.cancelAppointment(cancelTarget.id);
      if (res.success) {
        toast.success('Your appointment has been cancelled.');
        setCancelTarget(null);
        fetchDashboardData();
      } else {
        toast.error(res.message || 'Cancellation failed.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error cancelling appointment.');
    } finally {
      setCancelling(false);
    }
  };

  const metrics = stats?.metrics || {};
  const upcomingAppointments = stats?.upcoming_appointments || [];
  const recentConsultations = stats?.recent_consultations || [];

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        borderRadius: '16px',
        padding: '2rem 2.25rem',
        color: '#ffffff',
        marginBottom: '2rem',
        boxShadow: '0 4px 15px rgba(2, 132, 199, 0.15)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'inline-block', background: 'rgba(255, 255, 255, 0.2)', padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            MediConnect Healthcare
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
            Welcome, {user?.name}!
          </h1>
          <p style={{ color: '#e0f2fe', fontSize: '0.95rem', margin: 0, maxWidth: '600px' }}>
            Manage your personal healthcare appointments, doctor consultations, prescriptions, and emergency ambulance services all in one place.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={fetchDashboardData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
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
              background: '#ffffff',
              color: '#0284c7',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            <FaUserMd size={14} />
            Find Doctors
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Total Appointments */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Bookings</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaCalendarCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{metrics.total_appointments || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>All-time consultations</div>
        </div>

        {/* Upcoming Consultations */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Upcoming Visits</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaClock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>{metrics.upcoming_count || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Pending & confirmed visits</div>
        </div>

        {/* Completed Consultations */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Completed Visits</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaCheckCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6366f1' }}>{metrics.completed_count || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>With medical records & notes</div>
        </div>

        {/* Emergency Ambulance Requests */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Ambulance Dispatches</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaAmbulance size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>{metrics.total_ambulance_requests || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Emergency dispatch requests</div>
        </div>
      </div>

      {/* Main Content Columns: Upcoming Appointments & Recent Medical History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem', marginBottom: '2rem' }}>
        {/* Upcoming Appointments */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                Upcoming Consultations
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                Scheduled visits awaiting consultation ({upcomingAppointments.length})
              </p>
            </div>
            <Link
              to="/patient/appointments"
              style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0284c7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              View All <FaArrowRight size={11} />
            </Link>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
              <FaCalendarCheck size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>No Upcoming Consultations</h4>
              <p style={{ fontSize: '0.85rem', maxWidth: '300px', margin: '0 auto 1.25rem auto' }}>
                You have no scheduled appointments. Book a consultation with a top specialist.
              </p>
              <Link
                to="/patient/doctors"
                style={{
                  display: 'inline-block',
                  background: '#0284c7',
                  color: '#ffffff',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textDecoration: 'none'
                }}
              >
                Book Appointment
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {upcomingAppointments.map((appt) => (
                <div
                  key={appt.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                        {appt.doctor_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600 }}>
                        {appt.specialization} • {appt.hospital_name}
                      </div>
                    </div>
                    <span style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: appt.status === 'Confirmed' ? '#e0f2fe' : '#fef3c7',
                      color: appt.status === 'Confirmed' ? '#0369a1' : '#b45309'
                    }}>
                      {appt.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FaClock size={12} style={{ color: '#0284c7' }} />
                      <strong>{appt.appointment_date}</strong> at {appt.appointment_time}
                    </div>
                    <div>
                      Fee: <strong>₹{appt.consultation_fee}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    <strong>Reason:</strong> {appt.reason}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      onClick={() => setCancelTarget(appt)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        color: '#b91c1c',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel Appointment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Medical Records / Consultation History */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                Recent Medical Consultations
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                Completed visits with doctor clinical notes ({recentConsultations.length})
              </p>
            </div>
            <Link
              to="/patient/records"
              style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0284c7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              All Records <FaArrowRight size={11} />
            </Link>
          </div>

          {recentConsultations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
              <FaNotesMedical size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>No Completed Consultations</h4>
              <p style={{ fontSize: '0.85rem', maxWidth: '300px', margin: '0 auto' }}>
                Completed medical visits with clinical notes and prescriptions will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentConsultations.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                      {c.doctor_name}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {c.appointment_date}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#0284c7', marginBottom: '0.5rem' }}>
                    {c.specialization} • {c.hospital_name}
                  </div>

                  {c.notes ? (
                    <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', borderLeft: '3px solid #10b981', fontSize: '0.8rem', color: '#1e293b' }}>
                      <strong>Doctor's Clinical Notes:</strong>
                      <div style={{ whiteSpace: 'pre-line', marginTop: '0.2rem' }}>
                        {c.notes}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Consultation completed. Clinical summary pending doctor entry.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Emergency Services Quick Access */}
      <div style={{
        background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
        border: '1px solid #fecaca',
        borderRadius: '16px',
        padding: '1.5rem 2rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ef4444', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FaAmbulance size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#991b1b', margin: '0 0 0.25rem 0' }}>
              Medical Emergency & Ambulance Services
            </h3>
            <p style={{ color: '#b91c1c', fontSize: '0.85rem', margin: 0 }}>
              Immediate GPS dispatch, hospital triage, and national emergency helpline access
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            href="tel:108"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#991b1b',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            <FaPhoneAlt size={12} />
            Call 108 Hotline
          </a>
          <Link
            to="/ambulance"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#ffffff',
              border: '1px solid #fca5a5',
              color: '#b91c1c',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none'
            }}
          >
            Book Ambulance
          </Link>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
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
                onClick={handleConfirmCancel}
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
