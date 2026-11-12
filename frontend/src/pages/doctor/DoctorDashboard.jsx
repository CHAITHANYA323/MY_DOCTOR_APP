import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCalendarCheck,
  FaUserCheck,
  FaCheckCircle,
  FaUserInjured,
  FaStar,
  FaNotesMedical,
  FaArrowRight,
  FaSync,
  FaClock,
  FaTimes,
  FaPhoneAlt,
  FaEnvelope,
  FaStethoscope,
  FaHospital,
  FaShieldAlt,
  FaCheck,
  FaPrescriptionBottleAlt,
  FaPlus,
  FaTrash
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { doctorService } from '../../services/doctorService';
import { cleanDoctorName } from '../../utils/doctorNameUtils';
import { DigitalPrescriptionModal } from '../../components/prescriptions/DigitalPrescriptionModal';

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [completing, setCompleting] = useState(false);
  const [quickUpdatingId, setQuickUpdatingId] = useState(null);

  // Digital Prescription items within modal (legacy inline builder)
  const [prescriptions, setPrescriptions] = useState([]);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('1-0-1');
  const [medTiming, setMedTiming] = useState('After Food');

  // Digital Prescription Modal – full Rx issuance system
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [rxInitialData, setRxInitialData] = useState({});

  const getLabel = useCallback((key, fallback) => {
    const val = t(key);
    if (!val || val === key) return fallback;
    return val;
  }, [t]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await doctorService.getDoctorStats();
      if (res.success) {
        setStats(res);
      } else {
        toast.error(res.message || 'Failed to fetch clinical dashboard data.');
      }
    } catch (err) {
      console.error('Error fetching doctor stats:', err);
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
    setPrescriptions([]);
    setMedName('');
    setMedDosage('');
  };

  const handleOpenRxModal = (appt) => {
    setRxInitialData({
      patient_id: appt.user_id || appt.user?.id,
      patient_name: appt.patient_name || appt.user?.name || '',
      patient_phone: appt.user?.phone || '',
      appointment_id: appt.id,
      reason: appt.reason || ''
    });
    setRxModalOpen(true);
  };

  const handleAddMedicine = () => {
    if (!medName.trim()) {
      toast.warning('Please enter medication name.');
      return;
    }
    const item = {
      id: Date.now(),
      name: medName.trim(),
      dosage: medDosage.trim() || '1 tablet',
      frequency: medFrequency,
      timing: medTiming
    };
    setPrescriptions((prev) => [...prev, item]);
    setMedName('');
    setMedDosage('');
  };

  const handleRemoveMedicine = (id) => {
    setPrescriptions((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCompleteConsultation = async (markComplete = true) => {
    if (!selectedAppt) return;
    try {
      setCompleting(true);

      // Format prescription text if any were added
      let finalNotes = consultationNotes.trim();
      if (prescriptions.length > 0) {
        const rxText = prescriptions
          .map((p, idx) => `${idx + 1}. ${p.name} - ${p.dosage} [${p.frequency}, ${p.timing}]`)
          .join('\n');
        finalNotes = finalNotes ? `${finalNotes}\n\nPrescriptions:\n${rxText}` : `Prescriptions:\n${rxText}`;
      }

      const payload = {
        notes: finalNotes,
        ...(markComplete ? { status: 'Completed' } : {})
      };

      const res = await doctorService.updateDoctorAppointment(selectedAppt.id, payload);
      if (res.success) {
        toast.success(
          markComplete
            ? `Consultation for ${selectedAppt.patient_name || 'Patient'} completed.`
            : 'Clinical notes saved successfully.'
        );
        setSelectedAppt(null);
        setConsultationNotes('');
        setPrescriptions([]);
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
      setQuickUpdatingId(apptId);
      const res = await doctorService.updateDoctorAppointment(apptId, { status: newStatus });
      if (res.success) {
        toast.success(`Appointment status updated to ${newStatus}.`);
        loadData();
      } else {
        toast.error(res.message || 'Failed to update status.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error updating appointment status.');
    } finally {
      setQuickUpdatingId(null);
    }
  };

  const todayDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <div className="animate-spin" style={{ width: '42px', height: '42px', border: '3px solid #E2E8F0', borderTopColor: '#0D9488', borderRadius: '50%' }} />
        <p style={{ color: '#0F766E', fontSize: '0.95rem', fontWeight: 600 }}>
          {getLabel('doctorPortal.dashboardSubtitle', 'Loading clinical workstation metrics...')}
        </p>
      </div>
    );
  }

  const metrics = stats?.metrics || {};
  const doctor = stats?.doctor || {};
  const todaySchedule = stats?.today_schedule || [];
  const recentAppointments = stats?.recent_appointments || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Clinical Workstation Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0C2328 0%, #134E4A 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        color: '#FFFFFF',
        boxShadow: '0 8px 24px rgba(12, 35, 40, 0.15)',
        border: '1px solid rgba(45, 212, 191, 0.2)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        <div style={{ maxWidth: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
            <span style={{
              background: 'rgba(45, 212, 191, 0.2)',
              color: '#2DD4BF',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: '1px solid rgba(45, 212, 191, 0.35)'
            }}>
              <FaShieldAlt size={10} />
              {getLabel('doctorPortal.licenseVerified', 'Medical Council Certified')}
            </span>
            <span style={{ color: '#99F6E4', fontSize: '0.82rem', fontWeight: 600 }}>
              {todayDateFormatted}
            </span>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '0 0 0.5rem 0', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
            {getLabel('doctorPortal.welcomeDoctor', 'Welcome, Dr. {name}').replace('{name}', cleanDoctorName(doctor.name || user?.name || 'Doctor'))}
          </h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: '#CCFBF1', fontSize: '0.88rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <FaStethoscope size={13} style={{ color: '#2DD4BF' }} />
              <strong>{getLabel('doctorPortal.specialization', 'Specialization')}:</strong> {doctor.specialization || 'General Medicine'}
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <FaHospital size={13} style={{ color: '#2DD4BF' }} />
              <strong>{getLabel('doctorPortal.affiliatedHospital', 'Facility')}:</strong> {doctor.hospital || 'Hospital'}
            </span>
            <span>•</span>
            <span>
              <strong>{getLabel('doctorPortal.consultationFee', 'Consultation Fee')}:</strong> ₹{doctor.consultation_fee || 500}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={loadData}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              padding: '0.65rem 1.15rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
          >
            <FaSync size={13} className={loading ? 'animate-spin' : ''} />
            {getLabel('doctorPortal.refresh', 'Refresh')}
          </button>
          <Link
            to="/doctor/appointments"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#0D9488',
              color: '#FFFFFF',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)'
            }}
          >
            <FaCalendarCheck size={14} />
            {getLabel('doctorPortal.allConsultations', 'All Consultations')}
          </Link>
        </div>
      </div>

      {/* 4 Clinical KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Today's Appointments */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {getLabel('doctorPortal.todayAppointments', "Today's Appointments")}
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(13, 148, 136, 0.1)',
              color: '#0D9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaCalendarCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0C2328' }}>
            {metrics.today_appointments || 0}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', fontSize: '0.75rem', color: '#64748B' }}>
            <span style={{ color: '#059669', fontWeight: 700 }}>
              {metrics.today_confirmed || 0} {getLabel('doctorPortal.statusConfirmed', 'Confirmed')}
            </span>
            <span>•</span>
            <span style={{ color: '#D97706', fontWeight: 700 }}>
              {metrics.today_pending || 0} {getLabel('doctorPortal.statusPending', 'Pending')}
            </span>
            <span>•</span>
            <span style={{ color: '#0D9488', fontWeight: 700 }}>
              {metrics.today_completed || 0} {getLabel('doctorPortal.statusCompleted', 'Done')}
            </span>
          </div>
        </div>

        {/* Total Treated Patients */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {getLabel('doctorPortal.totalPatientsTreated', 'Total Patients')}
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(5, 150, 105, 0.1)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaUserInjured size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0C2328' }}>
            {metrics.total_patients || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem' }}>
            {getLabel('doctorPortal.totalPatientsCount', 'Active unique patient records').replace('{count}', metrics.total_patients || 0)}
          </div>
        </div>

        {/* All-Time Visits */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {getLabel('doctorPortal.totalAppointmentsAllTime', 'All-Time Visits')}
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(14, 165, 233, 0.1)',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaUserCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0C2328' }}>
            {metrics.total_appointments || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem' }}>
            {metrics.completed_appointments || 0} {getLabel('doctorPortal.completedConsultations', 'completed consultations')}
          </div>
        </div>

        {/* Practice Rating */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {getLabel('doctorPortal.patientSatisfactionRating', 'Patient Rating')}
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(234, 179, 8, 0.1)',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaStar size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0C2328' }}>
              {metrics.rating || 4.9}
            </div>
            <span style={{ color: '#F59E0B', fontSize: '1.15rem' }}>★</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem' }}>
            {metrics.total_reviews || 0} verified patient reviews
          </div>
        </div>
      </div>

      {/* 2-Column Clinical Operations Workspace */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* Left Column: Today's Queue & Patient Schedule */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '14px',
          border: '1px solid #E2E8F0',
          padding: '1.5rem',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.85rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0C2328', margin: '0 0 0.25rem 0' }}>
                {getLabel('doctorPortal.todayScheduleTitle', "Today's Patient Queue & Schedule")}
              </h2>
              <p style={{ color: '#64748B', fontSize: '0.82rem', margin: 0 }}>
                {getLabel('doctorPortal.todayScheduleSub', 'Patients scheduled for consultation today')}
              </p>
            </div>
            <span style={{
              background: todaySchedule.length > 0 ? '#CCFBF1' : '#F1F5F9',
              color: todaySchedule.length > 0 ? '#0F766E' : '#64748B',
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              {todaySchedule.length} Patients
            </span>
          </div>

          {todaySchedule.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2.5rem 1.5rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px dashed #CBD5E1'
            }}>
              <FaClock size={36} style={{ margin: '0 auto 0.75rem auto', color: '#94A3B8' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#334155', margin: '0 0 0.4rem 0' }}>
                {getLabel('doctorPortal.noAppointmentsToday', 'No patient consultations scheduled for today.')}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#64748B', maxWidth: '420px', margin: '0 auto 1.25rem auto' }}>
                {getLabel('doctorPortal.noAppointmentsSub', 'New appointment bookings will automatically appear in this queue.')}
              </p>
              <Link
                to="/doctor/appointments"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#0D9488',
                  textDecoration: 'none',
                  backgroundColor: '#FFFFFF',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1'
                }}
              >
                {getLabel('doctorPortal.allConsultations', 'View Full Consultation Agenda')} <FaArrowRight size={11} />
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      {getLabel('doctorPortal.timeSlot', 'Time')}
                    </th>
                    <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      {getLabel('doctorPortal.patient', 'Patient')}
                    </th>
                    <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      {getLabel('doctorPortal.reasonForVisit', 'Reason')}
                    </th>
                    <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      {getLabel('doctorPortal.status', 'Status')}
                    </th>
                    <th style={{ padding: '0.75rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      {getLabel('doctorPortal.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {todaySchedule.map((appt) => {
                    const statusStyles = {
                      Pending: { bg: '#FEF3C7', color: '#B45309' },
                      Confirmed: { bg: '#D1FAE5', color: '#047857' },
                      Completed: { bg: '#E0F2FE', color: '#0369A1' },
                      Cancelled: { bg: '#FEE2E2', color: '#B91C1C' }
                    }[appt.status] || { bg: '#F1F5F9', color: '#475569' };

                    return (
                      <tr key={appt.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 700, color: '#0C2328', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <FaClock size={11} style={{ color: '#0D9488' }} />
                            {appt.appointment_time}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <div style={{ fontWeight: 700, color: '#0C2328', fontSize: '0.88rem' }}>
                            {appt.patient_name || appt.user?.name || 'Patient'}
                          </div>
                          {appt.user?.phone && (
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              {appt.user.phone}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', fontSize: '0.82rem', color: '#334155', maxWidth: '200px' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {appt.reason || 'General Consultation'}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: statusStyles.bg,
                            color: statusStyles.color
                          }}>
                            {getLabel(`doctorPortal.status${appt.status}`, appt.status)}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleOpenConsultation(appt)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.35rem 0.75rem',
                                background: '#0D9488',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <FaNotesMedical size={11} />
                              {getLabel('doctorPortal.startConsultation', 'Consult')}
                            </button>
                            {appt.status !== 'Cancelled' && (
                              <button
                                onClick={() => handleOpenRxModal(appt)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.35rem 0.75rem',
                                  background: '#5B21B6',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                                title={getLabel('doctorPortal.issuePrescription', 'Issue Digital Clinical Prescription')}
                              >
                                <FaPrescriptionBottleAlt size={11} />
                                {getLabel('doctorPortal.issueRx', 'Issue Rx')}
                              </button>
                            )}
                            {appt.status === 'Pending' && (
                              <button
                                disabled={quickUpdatingId === appt.id}
                                onClick={() => handleQuickStatus(appt.id, 'Confirmed')}
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  background: '#D1FAE5',
                                  color: '#047857',
                                  border: '1px solid #A7F3D0',
                                  borderRadius: '6px',
                                  fontSize: '0.76rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <FaCheck size={10} /> {getLabel('doctorPortal.confirmVisit', 'Confirm')}
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

        {/* Right Column: Quick Clinical Actions & Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Actions Grid */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '1.5rem',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
          }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0C2328', margin: '0 0 1rem 0' }}>
              {getLabel('doctorPortal.quickActionsTitle', 'Quick Actions')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              <Link
                to="/doctor/appointments"
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '1rem',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  alignItems: 'center',
                  textAlign: 'center'
                }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(13, 148, 136, 0.1)', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaCalendarCheck size={18} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0C2328' }}>
                  {getLabel('doctorPortal.allConsultations', 'All Consultations')}
                </span>
              </Link>

              <Link
                to="/doctor/patients"
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '1rem',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  alignItems: 'center',
                  textAlign: 'center'
                }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaUserInjured size={18} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0C2328' }}>
                  {getLabel('doctorPortal.patientDirectory', 'Patient Directory')}
                </span>
              </Link>

              <Link
                to="/doctor/schedule"
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '1rem',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  alignItems: 'center',
                  textAlign: 'center'
                }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.1)', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaClock size={18} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0C2328' }}>
                  {getLabel('doctorPortal.manageSchedule', 'Manage Schedule')}
                </span>
              </Link>

              <Link
                to="/doctor/profile"
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '1rem',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  alignItems: 'center',
                  textAlign: 'center'
                }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FaStethoscope size={18} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0C2328' }}>
                  {getLabel('doctorPortal.editProfile', 'Edit Profile')}
                </span>
              </Link>
            </div>
          </div>

          {/* Recent Consultations Feed */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '1.5rem',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0C2328', margin: '0 0 0.15rem 0' }}>
                  {getLabel('doctorPortal.recentActivityTitle', 'Recent Consultations')}
                </h2>
                <p style={{ color: '#64748B', fontSize: '0.78rem', margin: 0 }}>
                  {getLabel('doctorPortal.recentActivitySub', 'Most recent patient visits')}
                </p>
              </div>
              <Link
                to="/doctor/appointments"
                style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0D9488', textDecoration: 'none' }}
              >
                {getLabel('doctorPortal.viewAll', 'View All')} →
              </Link>
            </div>

            {recentAppointments.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.82rem', margin: '1rem 0', textAlign: 'center' }}>
                No recent consultations recorded.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentAppointments.slice(0, 4).map((appt) => (
                  <div
                    key={appt.id}
                    onClick={() => handleOpenConsultation(appt)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '8px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0C2328' }}>
                        {appt.patient_name || appt.user?.name || 'Patient'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.15rem' }}>
                        {appt.appointment_date} • {appt.appointment_time}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        backgroundColor: appt.status === 'Completed' ? '#D1FAE5' : '#E0F2FE',
                        color: appt.status === 'Completed' ? '#047857' : '#0369A1'
                      }}>
                        {appt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Consultation & Digital Prescription Builder Modal */}
      {selectedAppt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(12, 35, 40, 0.7)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.25rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaNotesMedical size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0C2328', margin: 0 }}>
                    {getLabel('doctorPortal.consultationNotes', 'Clinical Notes & Prescription')}
                  </h3>
                  <p style={{ color: '#64748B', fontSize: '0.78rem', margin: 0 }}>
                    {selectedAppt.appointment_date} • {selectedAppt.appointment_time} (ID: #{selectedAppt.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppt(null)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.25rem' }}
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Patient Demographics Card */}
            <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, color: '#0C2328', fontSize: '1rem' }}>
                  {selectedAppt.patient_name || selectedAppt.user?.name || 'Patient'}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0D9488', backgroundColor: '#CCFBF1', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                  {selectedAppt.status}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                {selectedAppt.user?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaPhoneAlt size={10} style={{ color: '#0D9488' }} /> {selectedAppt.user.phone}
                  </div>
                )}
                {selectedAppt.user?.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FaEnvelope size={10} style={{ color: '#0D9488' }} /> {selectedAppt.user.email}
                  </div>
                )}
                {selectedAppt.user?.gender && (
                  <div>{getLabel('doctorPortal.gender', 'Gender')}: <strong>{selectedAppt.user.gender}</strong></div>
                )}
                {selectedAppt.user?.age && (
                  <div>{getLabel('doctorPortal.age', 'Age')}: <strong>{selectedAppt.user.age} yrs</strong></div>
                )}
              </div>
              <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid #E2E8F0', fontSize: '0.82rem' }}>
                <strong style={{ color: '#0C2328' }}>{getLabel('doctorPortal.reasonForVisit', 'Chief Complaint')}:</strong> {selectedAppt.reason || 'General Health Consultation'}
              </div>
            </div>

            {/* Clinical Assessment Notes */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0C2328', marginBottom: '0.4rem' }}>
                {getLabel('doctorPortal.clinicalAssessment', 'Clinical Assessment & Notes')}:
              </label>
              <textarea
                rows={4}
                value={consultationNotes}
                onChange={(e) => setConsultationNotes(e.target.value)}
                placeholder={getLabel('doctorPortal.notesPlaceholder', 'Document diagnosis, physical findings, clinical impression, and advice...')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Quick Digital Prescription Builder */}
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.5rem',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <FaPrescriptionBottleAlt size={14} style={{ color: '#0D9488' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0C2328' }}>
                  {getLabel('doctorPortal.prescriptionTitle', 'Digital Prescription')}
                </span>
              </div>

              {/* Add Medicine Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  placeholder={getLabel('doctorPortal.medicineNamePlaceholder', 'Medicine (e.g. Paracetamol 650mg)')}
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  style={{ padding: '0.5rem', fontSize: '0.8rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                />
                <input
                  type="text"
                  placeholder="Dosage (1 tab)"
                  value={medDosage}
                  onChange={(e) => setMedDosage(e.target.value)}
                  style={{ padding: '0.5rem', fontSize: '0.8rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                />
                <select
                  value={medFrequency}
                  onChange={(e) => setMedFrequency(e.target.value)}
                  style={{ padding: '0.5rem', fontSize: '0.8rem', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF' }}
                >
                  <option value="1-0-0">1-0-0 (Morning)</option>
                  <option value="1-0-1">1-0-1 (Twice)</option>
                  <option value="1-1-1">1-1-1 (Thrice)</option>
                  <option value="0-0-1">0-0-1 (Night)</option>
                  <option value="SOS">SOS (As needed)</option>
                </select>
                <select
                  value={medTiming}
                  onChange={(e) => setMedTiming(e.target.value)}
                  style={{ padding: '0.5rem', fontSize: '0.8rem', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF' }}
                >
                  <option value="After Food">After Food</option>
                  <option value="Before Food">Before Food</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddMedicine}
                  style={{
                    padding: '0.5rem 0.85rem',
                    background: '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <FaPlus size={10} /> Add
                </button>
              </div>

              {/* Added Medicines List */}
              {prescriptions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {prescriptions.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.75rem',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div>
                        <strong>{p.name}</strong> • {p.dosage} • {p.frequency} • {p.timing}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(p.id)}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.2rem' }}
                      >
                        <FaTrash size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic' }}>
                  {getLabel('doctorPortal.noMedicinesAdded', 'No medications added yet. Click Add to prescribe drugs.')}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                {getLabel('doctorPortal.closeModal', 'Close')}
              </button>

              <button
                type="button"
                disabled={completing}
                onClick={() => handleCompleteConsultation(false)}
                style={{
                  padding: '0.65rem 1.25rem',
                  background: '#FFFFFF',
                  border: '1px solid #0D9488',
                  borderRadius: '8px',
                  color: '#0D9488',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: completing ? 'not-allowed' : 'pointer'
                }}
              >
                {getLabel('doctorPortal.saveConsultationRecord', 'Save Clinical Notes')}
              </button>

              {selectedAppt.status !== 'Completed' && (
                <button
                  type="button"
                  disabled={completing}
                  onClick={() => handleCompleteConsultation(true)}
                  style={{
                    padding: '0.65rem 1.5rem',
                    background: '#0D9488',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: completing ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
                  }}
                >
                  <FaCheckCircle size={14} />
                  {completing
                    ? getLabel('doctorPortal.savingSchedule', 'Completing...')
                    : getLabel('doctorPortal.markAsCompleted', 'Mark as Completed')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Digital Prescription Modal – Issue Rx from Dashboard Queue */}
      <DigitalPrescriptionModal
        isOpen={rxModalOpen}
        onClose={() => setRxModalOpen(false)}
        initialData={rxInitialData}
        onSuccess={() => {
          setRxModalOpen(false);
          loadData();
          toast.success(getLabel('doctorPortal.pdfSuccess', 'Prescription issued successfully.'));
        }}
      />
    </div>
  );
};
