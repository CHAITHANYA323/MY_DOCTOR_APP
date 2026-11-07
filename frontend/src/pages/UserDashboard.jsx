import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaCalendarAlt, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaAmbulance, 
  FaUserMd, 
  FaHospital, 
  FaClock, 
  FaArrowRight, 
  FaShieldAlt,
  FaHeart,
  FaPhoneAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { ambulanceService } from '../services/ambulanceService';
import { AppointmentCard } from '../components/AppointmentCard';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const UserDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ambulance Cancellation State
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchUserStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getUserStats();
      if (res.success) {
        setStats(res);
      }
    } catch (err) {
      console.error('Error fetching user stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  const handleCancelAmbulance = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      const res = await ambulanceService.cancelAmbulanceRequest(cancelTarget.id);
      if (res.success) {
        toast.success('Ambulance request cancelled successfully.');
        setCancelTarget(null);
        await fetchUserStats();
      } else {
        toast.error(res.message || 'Could not cancel request.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel ambulance request.');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        {/* Welcome Banner Card */}
        <div className="card" style={{
          padding: '2rem 2.5rem',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: 'white',
          marginBottom: '2.5rem',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <span style={{
                display: 'inline-block',
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                fontWeight: 700,
                marginBottom: '0.75rem'
              }}>
                Patient Portal
              </span>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'white', marginBottom: '0.35rem' }}>
                Hello, {user?.name}!
              </h1>
              <p style={{ color: '#e0f2fe', fontSize: '1rem' }}>
                Manage your appointments, health consultations, and emergency services in one place.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/doctors" className="btn btn-lg" style={{ backgroundColor: 'white', color: 'var(--primary)', fontWeight: 700 }}>
                <FaUserMd /> Book Appointment
              </Link>
              <Link to="/emergency" className="btn btn-emergency btn-lg">
                <FaAmbulance /> Emergency
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Dashboard Metric Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          {/* Metric 1 */}
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontWeight: 600 }}>Upcoming Visits</span>
              <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaCalendarAlt />
              </div>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              {stats?.metrics?.upcoming_count || 0}
            </h2>
            <Link to="/appointments" style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem' }}>
              View Schedule <FaArrowRight size={10} />
            </Link>
          </div>

          {/* Metric 2 */}
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontWeight: 600 }}>Completed</span>
              <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaCheckCircle />
              </div>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              {stats?.metrics?.completed_count || 0}
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--slate-400)' }}>Consultations attended</span>
          </div>

          {/* Metric 3 */}
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontWeight: 600 }}>Total Bookings</span>
              <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaClock />
              </div>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              {stats?.metrics?.total_appointments || 0}
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--slate-400)' }}>Lifetime appointments</span>
          </div>

          {/* Metric 4 */}
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontWeight: 600 }}>Ambulance Requests</span>
              <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: 'var(--emergency-light)', color: 'var(--emergency)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaAmbulance />
              </div>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              {stats?.metrics?.total_ambulance_requests || 0}
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--slate-400)' }}>Emergency dispatches</span>
          </div>
        </div>

        {/* Two Column Layout: Upcoming Visits & Ambulance Requests */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: '2.5rem',
          alignItems: 'flex-start'
        }} className="user-dash-grid">

          {/* Left: Upcoming Appointments */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                Upcoming Doctor Visits
              </h3>
              <Link to="/appointments" className="btn btn-outline btn-sm">
                View All Appointments
              </Link>
            </div>

            {loading ? (
              <p>Loading schedule...</p>
            ) : (!stats?.upcoming_appointments || stats.upcoming_appointments.length === 0) ? (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <FaCalendarAlt size={36} color="var(--slate-300)" style={{ marginBottom: '0.75rem' }} />
                <h4 style={{ fontSize: '1.1rem', color: 'var(--slate-700)', marginBottom: '0.35rem' }}>No Upcoming Appointments</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>You have no scheduled clinical visits at this time.</p>
                <Link to="/doctors" className="btn btn-primary btn-sm">Find Doctor</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {stats.upcoming_appointments.map((appt) => (
                  <AppointmentCard key={appt.id} appointment={appt} />
                ))}
              </div>
            )}
          </div>

          {/* Right: Recent Ambulance Requests Tracker */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                Ambulance Requests
              </h3>
              <Link to="/emergency" className="btn btn-emergency btn-sm">
                New Request
              </Link>
            </div>

            {loading ? (
              <p>Loading ambulance requests...</p>
            ) : (!stats?.recent_ambulance_requests || stats.recent_ambulance_requests.length === 0) ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <FaAmbulance size={36} color="var(--slate-300)" style={{ marginBottom: '0.75rem' }} />
                <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)' }}>No emergency ambulance requests logged.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {stats.recent_ambulance_requests.map((req) => (
                  <div key={req.id} className="card" style={{ padding: '1.25rem' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)', fontWeight: 600 }}>
                        Emergency #{req.id}
                      </span>
                      <span className={`badge ${
                        req.status === 'Dispatched' ? 'badge-on-duty' :
                        req.status === 'Arrived' ? 'badge-arrived' :
                        req.status === 'Completed' ? 'badge-completed' :
                        req.status === 'Cancelled' ? 'badge-cancelled' : 'badge-pending'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.25rem' }}>
                      {req.emergency_type} - {req.patient_name}
                    </h4>

                    <p style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginBottom: '0.35rem' }}>
                      <strong>Pickup:</strong> {req.pickup_location}
                    </p>

                    <div style={{ fontSize: '0.82rem', color: 'var(--slate-600)', marginBottom: '0.5rem' }}>
                      <strong>Destination:</strong> {req.destination_hospital}
                    </div>

                    {req.assigned_ambulance && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.6rem 0.75rem',
                        backgroundColor: 'var(--slate-50)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--slate-200)',
                        fontSize: '0.8rem'
                      }}>
                        <div style={{ fontWeight: 700, color: 'var(--slate-800)' }}>
                          Vehicle: {req.assigned_ambulance.vehicle_number} ({req.assigned_ambulance.ambulance_type})
                        </div>
                        <div style={{ marginTop: '0.2rem', color: 'var(--slate-600)' }}>
                          Driver: {req.assigned_ambulance.driver_name} &bull;{' '}
                          <a 
                            href={`tel:${req.assigned_ambulance.driver_phone}`} 
                            style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline' }}
                          >
                            <FaPhoneAlt size={10} style={{ marginRight: '3px' }} /> Call ({req.assigned_ambulance.driver_phone})
                          </a>
                        </div>
                      </div>
                    )}

                    {(req.status === 'Pending' || req.status === 'Dispatched') && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setCancelTarget(req)}
                          className="btn btn-sm"
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fca5a5',
                            fontSize: '0.78rem',
                            padding: '0.3rem 0.75rem'
                          }}
                        >
                          <FaTimesCircle size={11} style={{ marginRight: '4px' }} /> Cancel Request
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ambulance Cancellation Confirmation Modal */}
      <ConfirmationModal 
        isOpen={!!cancelTarget}
        title="Cancel Emergency Ambulance Request"
        message={`Are you sure you want to cancel emergency ambulance request #${cancelTarget?.id}? Our dispatch operations team will be notified immediately.`}
        confirmText="Yes, Cancel Request"
        cancelText="Keep Active"
        isDanger={true}
        loading={cancelLoading}
        onConfirm={handleCancelAmbulance}
        onCancel={() => setCancelTarget(null)}
      />

      <style>{`
        @media (max-width: 860px) {
          .user-dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};
