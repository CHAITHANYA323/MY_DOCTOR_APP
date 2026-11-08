import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCalendarCheck,
  FaUserCheck,
  FaHourglassHalf,
  FaCheckCircle,
  FaUserInjured,
  FaStar,
  FaNotesMedical,
  FaArrowRight,
  FaSync,
  FaClock,
  FaFileMedical,
  FaTimes,
  FaPhoneAlt,
  FaEnvelope
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { doctorService } from '../../services/doctorService';

export const DoctorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await doctorService.getDoctorStats();
      if (res.success) {
        setStats(res);
      } else {
        toast.error(res.message || 'Failed to fetch doctor dashboard data.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error loading clinical metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenConsultation = (appt) => {
    setSelectedAppt(appt);
    setConsultationNotes(appt.notes || '');
  };

  const handleCompleteConsultation = async () => {
    if (!selectedAppt) return;
    try {
      setCompleting(true);
      const res = await doctorService.updateDoctorAppointment(selectedAppt.id, {
        status: 'Completed',
        notes: consultationNotes
      });
      if (res.success) {
        toast.success(`Consultation with ${selectedAppt.patient_name || 'patient'} marked as Completed.`);
        setSelectedAppt(null);
        setConsultationNotes('');
        loadData();
      } else {
        toast.error(res.message || 'Failed to update consultation.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error completing consultation.');
    } finally {
      setCompleting(false);
    }
  };

  const handleQuickStatus = async (apptId, newStatus) => {
    try {
      const res = await doctorService.updateDoctorAppointment(apptId, { status: newStatus });
      if (res.success) {
        toast.success(`Consultation status updated to ${newStatus}.`);
        loadData();
      } else {
        toast.error(res.message || 'Failed to update status.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error updating appointment status.');
    }
  };

  const todayDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%' }} />
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Loading clinical practice metrics...</p>
      </div>
    );
  }

  const metrics = stats?.metrics || {};
  const doctor = stats?.doctor || {};
  const todaySchedule = stats?.today_schedule || [];

  return (
    <div>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        color: '#ffffff',
        marginBottom: '2rem',
        boxShadow: '0 4px 15px rgba(15, 23, 42, 0.1)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{
              background: '#0284c7',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.65rem',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Clinical Practice
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              {todayDateFormatted}
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
            Welcome, {doctor.name || 'Doctor'}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: '#cbd5e1', fontSize: '0.9rem' }}>
            <span><strong>Specialization:</strong> {doctor.specialization || 'General Physician'}</span>
            <span>•</span>
            <span><strong>Facility:</strong> {doctor.hospital || 'Hospital'}</span>
            <span>•</span>
            <span><strong>Fee:</strong> ₹{doctor.consultation_fee || 500}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
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
            to="/doctor/appointments"
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
            <FaCalendarCheck size={14} />
            All Consultations
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
        {/* Today's Appointments */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Today Scheduled</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaCalendarCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{metrics.today_appointments || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Active consultations for today</div>
        </div>

        {/* Ready / Confirmed */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>In Waiting / Confirmed</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaUserCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>{metrics.today_confirmed || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Checked in & awaiting consultation</div>
        </div>

        {/* Pending Check-in */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Pending Check-In</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaHourglassHalf size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>{metrics.today_pending || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Yet to arrive at hospital desk</div>
        </div>

        {/* Completed Today */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Completed Today</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaCheckCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6366f1' }}>{metrics.today_completed || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Finished consultations</div>
        </div>

        {/* Total Treated Patients */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Patients Treated</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaUserInjured size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{metrics.total_patients || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Unique patient records</div>
        </div>

        {/* Rating Snapshot */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Practice Rating</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaStar size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>{metrics.rating || 4.9}</div>
            <span style={{ color: '#eab308', fontSize: '1rem' }}>★</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{metrics.total_reviews || 0} patient reviews</div>
        </div>
      </div>

      {/* Today's Consultation Queue */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
              Today's Consultation Queue
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
              Patients scheduled for consultation today ({todaySchedule.length} total)
            </p>
          </div>
          <Link
            to="/doctor/appointments"
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#0284c7',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            Full Consultation Agenda <FaArrowRight size={12} />
          </Link>
        </div>

        {todaySchedule.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
            <FaClock size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>No Consultations Scheduled For Today</h3>
            <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
              You have no active patient appointments on today's clinical agenda. Check the full schedule to view upcoming bookings.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Time</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Patient Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Consultation Reason</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {todaySchedule.map((appt) => {
                  const statusColors = {
                    Pending: { bg: '#fef3c7', text: '#b45309' },
                    Confirmed: { bg: '#e0f2fe', text: '#0369a1' },
                    Completed: { bg: '#dcfce7', text: '#15803d' },
                    Cancelled: { bg: '#fee2e2', text: '#b91c1c' }
                  }[appt.status] || { bg: '#f1f5f9', text: '#475569' };

                  return (
                    <tr key={appt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FaClock size={12} style={{ color: '#0284c7' }} />
                          {appt.appointment_time}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {appt.patient_name || (appt.user && appt.user.name) || 'Patient'}
                        </div>
                        {appt.user && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                            {appt.user.phone || appt.user.email}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: '#475569', fontSize: '0.875rem', maxWidth: '280px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {appt.reason}
                        </div>
                        {appt.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.2rem', fontStyle: 'italic' }}>
                            Notes recorded
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: statusColors.bg,
                          color: statusColors.text,
                          display: 'inline-block'
                        }}>
                          {appt.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                            <button
                              onClick={() => handleOpenConsultation(appt)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.45rem 0.85rem',
                                background: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <FaNotesMedical size={12} />
                              Consult
                            </button>
                          )}

                          {appt.status === 'Pending' && (
                            <button
                              onClick={() => handleQuickStatus(appt.id, 'Confirmed')}
                              style={{
                                padding: '0.45rem 0.75rem',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Check In
                            </button>
                          )}

                          {appt.status === 'Completed' && (
                            <button
                              onClick={() => handleOpenConsultation(appt)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.45rem 0.85rem',
                                background: '#f8fafc',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <FaFileMedical size={12} />
                              View Notes
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Access Modules */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem'
      }}>
        <Link
          to="/doctor/appointments"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaCalendarCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Consultation Agenda</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>Filter by date, status & clinical notes</div>
            </div>
          </div>
          <FaArrowRight size={14} style={{ color: '#94a3b8' }} />
        </Link>

        <Link
          to="/doctor/patients"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaUserInjured size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Patient History</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>Review treated patients & visit logs</div>
            </div>
          </div>
          <FaArrowRight size={14} style={{ color: '#94a3b8' }} />
        </Link>

        <Link
          to="/doctor/schedule"
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FaClock size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Practice Availability</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>Update consultation hours & fee</div>
            </div>
          </div>
          <FaArrowRight size={14} style={{ color: '#94a3b8' }} />
        </Link>
      </div>

      {/* Consultation Modal */}
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
            maxWidth: '620px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaNotesMedical size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Consultation Record
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                    Slot: {selectedAppt.appointment_time} on {selectedAppt.appointment_date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppt(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Patient Info Card */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginBottom: '0.5rem' }}>
                {selectedAppt.patient_name || (selectedAppt.user && selectedAppt.user.name) || 'Patient'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                {selectedAppt.user?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaPhoneAlt size={10} style={{ color: '#0284c7' }} /> {selectedAppt.user.phone}
                  </div>
                )}
                {selectedAppt.user?.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaEnvelope size={10} style={{ color: '#0284c7' }} /> {selectedAppt.user.email}
                  </div>
                )}
                {selectedAppt.user?.gender && (
                  <div>Gender: <strong>{selectedAppt.user.gender}</strong></div>
                )}
                {selectedAppt.user?.age && (
                  <div>Age: <strong>{selectedAppt.user.age} yrs</strong></div>
                )}
              </div>
              <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: '#334155' }}>Chief Complaint:</span> {selectedAppt.reason}
              </div>
            </div>

            {/* Clinical Consultation Notes */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
                Clinical Notes / Diagnosis & Prescription:
              </label>
              <textarea
                rows={5}
                value={consultationNotes}
                onChange={(e) => setConsultationNotes(e.target.value)}
                placeholder="Enter clinical assessment, prescribed medications, recommended tests, and follow-up guidance..."
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>

              {selectedAppt.status !== 'Completed' && (
                <button
                  type="button"
                  disabled={completing}
                  onClick={handleCompleteConsultation}
                  style={{
                    padding: '0.65rem 1.5rem',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: completing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FaCheckCircle size={14} />
                  {completing ? 'Completing...' : 'Mark as Completed'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
