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
  FaHospital,
  FaExclamationTriangle,
  FaTimes,
  FaShieldAlt,
  FaHeartbeat,
  FaStethoscope,
  FaFilePrescription
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { patientService } from '../../services/patientService';

export const PatientDashboard = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);

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
      console.error('Error fetching patient dashboard data:', err);
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
        toast.success(t('patientPortal.cancelSuccess') || 'Your appointment has been cancelled.');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Welcome Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #102A43 0%, #1677C8 100%)',
        borderRadius: '16px',
        padding: '2.25rem 2.5rem',
        color: '#FFFFFF',
        boxShadow: '0 8px 25px rgba(16, 42, 67, 0.12)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          right: '-20px',
          bottom: '-30px',
          opacity: 0.08,
          pointerEvents: 'none',
          color: '#FFFFFF'
        }}>
          <FaHeartbeat size={220} />
        </div>

        <div style={{ maxWidth: '650px', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.65rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'rgba(19, 184, 166, 0.25)',
              border: '1px solid rgba(19, 184, 166, 0.5)',
              color: '#5EEAD4',
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em'
            }}>
              <FaShieldAlt size={10} />
              {t('patientPortal.activePatient') || 'Verified Patient Account'}
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8rem' }}>•</span>
            <span style={{ color: '#E0F2FE', fontSize: '0.8rem', fontWeight: 600 }}>
              ID: #MC-PAT-{(user?.id || 1).toString().padStart(4, '0')}
            </span>
          </div>

          <h1 style={{
            fontSize: '2rem',
            fontWeight: 800,
            margin: '0 0 0.5rem 0',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}>
            {language === 'te' ? `తిరిగి స్వాగతం, ${user?.name || 'రోగి'}` : `Welcome back, ${user?.name || 'Patient'}`}
          </h1>

          <p style={{
            color: '#E0F2FE',
            fontSize: '0.96rem',
            lineHeight: 1.55,
            margin: 0
          }}>
            {t('patientPortal.welcomeSubtitle') || 'Manage your personal healthcare records, appointments, and consultations in one place.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', zIndex: 1 }}>
          <button
            type="button"
            onClick={fetchDashboardData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              padding: '0.65rem 1.2rem',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'background 0.18s ease'
            }}
          >
            <FaSync size={13} className={loading ? 'animate-spin' : ''} />
            <span>{t('patientPortal.refresh') || 'Refresh'}</span>
          </button>

          <Link
            to="/patient/doctors"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              backgroundColor: '#13B8A6',
              color: '#FFFFFF',
              padding: '0.65rem 1.35rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.88rem',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(19, 184, 166, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <FaCalendarCheck size={14} />
            <span>{t('patientPortal.bookAppointment') || 'Book Appointment'}</span>
          </Link>
        </div>
      </div>

      {/* 2. Quick Action Cards (4 items) */}
      <div>
        <h2 style={{
          fontSize: '1.05rem',
          fontWeight: 800,
          color: '#102A43',
          marginBottom: '1rem',
          letterSpacing: '-0.01em'
        }}>
          {t('patientPortal.quickActions') || 'Quick Actions'}
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem'
        }}>
          {/* Action 1: Book Appointment */}
          <Link
            to="/patient/doctors"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '1.4rem',
              border: '1px solid #E2E8F0',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(22, 119, 200, 0.1)',
                color: '#1677C8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                marginBottom: '1rem'
              }}>
                <FaCalendarCheck />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.35rem 0' }}>
                {t('patientPortal.bookAppointment') || 'Book an Appointment'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#718096', margin: 0, lineHeight: 1.45 }}>
                {t('patientPortal.bookAppointmentDesc') || 'Select an in-person or video consultation slot with top doctors'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1677C8', fontSize: '0.84rem', fontWeight: 700, marginTop: '1.2rem' }}>
              <span>Proceed</span>
              <FaArrowRight size={11} />
            </div>
          </Link>

          {/* Action 2: Find a Doctor */}
          <Link
            to="/patient/doctors"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '1.4rem',
              border: '1px solid #E2E8F0',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(19, 184, 166, 0.12)',
                color: '#13B8A6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                marginBottom: '1rem'
              }}>
                <FaUserMd />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.35rem 0' }}>
                {t('patientPortal.findDoctor') || 'Find a Doctor'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#718096', margin: 0, lineHeight: 1.45 }}>
                {t('patientPortal.findDoctorDesc') || 'Browse verified medical specialists and clinical qualifications'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#13B8A6', fontSize: '0.84rem', fontWeight: 700, marginTop: '1.2rem' }}>
              <span>Search Doctors</span>
              <FaArrowRight size={11} />
            </div>
          </Link>

          {/* Action 3: View Medical Records */}
          <Link
            to="/patient/records"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '1.4rem',
              border: '1px solid #E2E8F0',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(100, 116, 139, 0.1)',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                marginBottom: '1rem'
              }}>
                <FaNotesMedical />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.35rem 0' }}>
                {t('patientPortal.viewRecords') || 'View Medical Records'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#718096', margin: 0, lineHeight: 1.45 }}>
                {t('patientPortal.viewRecordsDesc') || 'Access digitally certified prescriptions and diagnostic summaries'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.84rem', fontWeight: 700, marginTop: '1.2rem' }}>
              <span>Access Records</span>
              <FaArrowRight size={11} />
            </div>
          </Link>

          {/* Action 4: Find Nearby Hospitals */}
          <Link
            to="/patient/hospitals"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '1.4rem',
              border: '1px solid #E2E8F0',
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(233, 162, 59, 0.12)',
                color: '#E9A23B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                marginBottom: '1rem'
              }}>
                <FaHospital />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.35rem 0' }}>
                {t('patientPortal.findHospitals') || 'Find Nearby Hospitals'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#718096', margin: 0, lineHeight: 1.45 }}>
                {t('patientPortal.findHospitalsDesc') || 'Locate 24 accredited platform hospitals and trauma facilities'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#E9A23B', fontSize: '0.84rem', fontWeight: 700, marginTop: '1.2rem' }}>
              <span>View Hospitals</span>
              <FaArrowRight size={11} />
            </div>
          </Link>
        </div>
      </div>

      {/* 3. Health Summary KPI Metric Cards (Real Backend Data) */}
      <div>
        <h2 style={{
          fontSize: '1.05rem',
          fontWeight: 800,
          color: '#102A43',
          marginBottom: '1rem',
          letterSpacing: '-0.01em'
        }}>
          {t('portalNav.healthDashboard') || 'Health Summary Overview'}
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem'
        }}>
          {/* Card 1: Total Consultations */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '1.35rem',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(16, 42, 67, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#718096' }}>
                {t('patientPortal.totalConsultations') || 'Total Consultations'}
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(22, 119, 200, 0.1)', color: '#1677C8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaCalendarCheck size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#102A43' }}>
              {metrics.total_appointments || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.25rem' }}>
              {t('patientPortal.totalConsultationsSub') || 'All-time consultation records'}
            </div>
          </div>

          {/* Card 2: Upcoming Appointments */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '1.35rem',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(16, 42, 67, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#718096' }}>
                {t('patientPortal.upcomingVisits') || 'Upcoming Visits'}
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(19, 184, 166, 0.12)', color: '#13B8A6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaClock size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#13B8A6' }}>
              {metrics.upcoming_count || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.25rem' }}>
              {t('patientPortal.upcomingVisitsSub') || 'Scheduled clinic visits'}
            </div>
          </div>

          {/* Card 3: Completed Consultations */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '1.35rem',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(16, 42, 67, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#718096' }}>
                {t('patientPortal.completedVisits') || 'Completed Visits'}
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(22, 163, 106, 0.1)', color: '#16A36A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaCheckCircle size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#16A36A' }}>
              {metrics.completed_count || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.25rem' }}>
              {t('patientPortal.completedVisitsSub') || 'With clinical notes & reports'}
            </div>
          </div>

          {/* Card 4: Emergency Dispatches */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '1.35rem',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 6px rgba(16, 42, 67, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#718096' }}>
                {t('patientPortal.emergencyRequests') || 'Emergency Requests'}
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(220, 82, 82, 0.1)', color: '#DC5252', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaAmbulance size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#DC5252' }}>
              {metrics.total_ambulance_requests || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.25rem' }}>
              {t('patientPortal.emergencyRequestsSub') || 'Ambulance service dispatches'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Two Column Layout: Upcoming Appointments & Recent Consultations */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Column 1: Upcoming Appointments */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '1.6rem',
          boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            paddingBottom: '0.85rem',
            borderBottom: '1px solid #F0F4F8'
          }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.2rem 0' }}>
                {t('patientPortal.upcomingAppointments') || 'Upcoming Appointments'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#718096', margin: 0 }}>
                {t('patientPortal.scheduledVisitsSubtitle') || 'Scheduled clinic visits awaiting consultation'}
              </p>
            </div>
            <Link
              to="/patient/appointments"
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#1677C8',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>{t('patientPortal.viewAll') || 'View All'} ({upcomingAppointments.length})</span>
              <FaArrowRight size={10} />
            </Link>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1.5rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px dashed #CBD5E1',
              margin: 'auto 0'
            }}>
              <FaCalendarCheck size={36} style={{ color: '#9FB3C8', margin: '0 auto 0.75rem auto' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#243447', marginBottom: '0.35rem' }}>
                {t('patientPortal.noUpcoming') || 'No upcoming appointments scheduled'}
              </div>
              <p style={{ fontSize: '0.82rem', color: '#718096', maxWidth: '320px', margin: '0 auto 1.25rem auto', lineHeight: 1.45 }}>
                {t('patientPortal.noUpcomingSub') || 'You have no pending visits. Book a consultation with a top specialist.'}
              </p>
              <Link
                to="/patient/doctors"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#1677C8',
                  color: '#FFFFFF',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  textDecoration: 'none'
                }}
              >
                <FaStethoscope size={12} />
                <span>{t('patientPortal.bookAppointment') || 'Book Consultation'}</span>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {upcomingAppointments.map((appt) => {
                const badge = getStatusBadge(appt.status);
                return (
                  <div
                    key={appt.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(22, 119, 200, 0.12)',
                          color: '#1677C8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          flexShrink: 0
                        }}>
                          <FaUserMd />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#102A43' }}>
                            {appt.doctor_name || 'Medical Specialist'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                            {appt.hospital_name || 'Network Hospital'}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        backgroundColor: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px'
                      }}>
                        {badge.label}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      color: '#475569',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid #E2E8F0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FaClock size={11} style={{ color: '#1677C8' }} />
                        <span>{appt.appointment_date} &bull; {appt.appointment_time || 'Morning Slot'}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedAppt(appt)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#1677C8',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '0.2rem 0.4rem'
                          }}
                        >
                          {t('patientPortal.viewDetails') || 'Details'}
                        </button>
                        {appt.status !== 'Cancelled' && (
                          <button
                            type="button"
                            onClick={() => setCancelTarget(appt)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#DC5252',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: '0.2rem 0.4rem'
                            }}
                          >
                            {t('patientPortal.cancelAppointment') || 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Column 2: Recent Activity / Consultations */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '1.6rem',
          boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            paddingBottom: '0.85rem',
            borderBottom: '1px solid #F0F4F8'
          }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.2rem 0' }}>
                {t('patientPortal.recentActivity') || 'Recent Activity'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#718096', margin: 0 }}>
                {t('patientPortal.recentConsultationsSub') || 'Past clinical visits and attending physician advice'}
              </p>
            </div>
            <Link
              to="/patient/records"
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#13B8A6',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>{t('portalNav.medicalRecords') || 'Medical Records'}</span>
              <FaArrowRight size={10} />
            </Link>
          </div>

          {recentConsultations.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1.5rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px dashed #CBD5E1',
              margin: 'auto 0'
            }}>
              <FaNotesMedical size={36} style={{ color: '#9FB3C8', margin: '0 auto 0.75rem auto' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#243447', marginBottom: '0.35rem' }}>
                {t('patientPortal.noRecentActivity') || 'No recent activity recorded'}
              </div>
              <p style={{ fontSize: '0.82rem', color: '#718096', maxWidth: '320px', margin: '0 auto 1.25rem auto', lineHeight: 1.45 }}>
                {t('patientPortal.noRecentActivitySub') || 'Completed consultation history and electronic prescriptions will be stored here.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {recentConsultations.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(22, 163, 106, 0.1)',
                        color: '#16A36A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem'
                      }}>
                        <FaCheckCircle />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#102A43' }}>
                          {c.doctor_name || 'Attending Physician'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#718096' }}>
                          {c.hospital_name || 'Hospital Center'} &bull; {c.appointment_date}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      backgroundColor: '#ECFDF5',
                      color: '#16A36A',
                      border: '1px solid #A7F3D0',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px'
                    }}>
                      Completed
                    </span>
                  </div>

                  {c.reason && (
                    <div style={{ fontSize: '0.78rem', color: '#475569', backgroundColor: '#FFFFFF', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <strong style={{ color: '#102A43' }}>Visit Reason:</strong> {c.reason}
                    </div>
                  )}

                  {c.notes && (
                    <div style={{ fontSize: '0.76rem', color: '#1677C8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FaFilePrescription size={12} />
                      <span>Clinical advice & notes attached</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
            maxWidth: '500px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#102A43', margin: 0 }}>
                {t('patientPortal.appointmentDetails') || 'Consultation Details'}
              </h3>
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
                <span style={{ color: '#718096', fontWeight: 600 }}>Date & Time</span>
                <strong style={{ color: '#1677C8' }}>{selectedAppt.appointment_date} at {selectedAppt.appointment_time || 'Morning Slot'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Status</span>
                <span style={{ fontWeight: 800, color: getStatusBadge(selectedAppt.status).text }}>
                  {selectedAppt.status}
                </span>
              </div>
              {selectedAppt.reason && (
                <div style={{ padding: '0.65rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#718096', marginBottom: '0.2rem' }}>CONSULTATION REASON</div>
                  <div style={{ color: '#243447' }}>{selectedAppt.reason}</div>
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
                onClick={handleConfirmCancel}
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
