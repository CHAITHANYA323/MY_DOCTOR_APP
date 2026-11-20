import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FaClipboardList,
  FaUserCheck,
  FaCalendarAlt,
  FaUserPlus,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaHospital,
  FaUserMd,
  FaUser,
  FaSearch,
  FaRedo,
  FaPhoneAlt,
  FaTimes
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { receptionService } from '../../services/receptionService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';

export const ReceptionDashboard = () => {
  const { user, hospitalName } = useAuth();
  const { t, language, isTelugu } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Check-In Confirmation Modal
  const [checkInModalAppt, setCheckInModalAppt] = useState(null);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await receptionService.getStats();
      if (data && data.success) {
        setStats(data);
        setTodaySchedule(data.today_schedule || []);
      }
    } catch (err) {
      console.error('Failed to load reception desk statistics:', err);
      setError(getApiErrorMessage(err, isTelugu ? 'రిసెప్షన్ డేటాను లోడ్ చేయడం సాధ్యం కాలేదు.' : 'Unable to load live reception dashboard metrics.'));
    } finally {
      setLoading(false);
    }
  }, [isTelugu]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleOpenCheckInModal = (appt) => {
    setCheckInModalAppt(appt);
    setCheckInNotes(isTelugu ? 'రోగి ఆసుపత్రికి చేరుకున్నారు.' : 'Patient arrived and verified at reception desk.');
  };

  const handleConfirmCheckIn = async (e) => {
    if (e) e.preventDefault();
    if (!checkInModalAppt) return;

    try {
      setSubmittingCheckIn(true);
      await receptionService.checkInPatient(
        checkInModalAppt.id,
        checkInNotes || 'Patient confirmed at reception desk.'
      );
      notify.success(t('receptionPortal.checkInSuccess'));
      setCheckInModalAppt(null);
      fetchDashboardData();
    } catch (err) {
      notify.error(getApiErrorMessage(err, isTelugu ? 'చెక్-ఇన్ విఫలమైంది.' : 'Check-in failed. Please retry.'));
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  const metrics = stats?.metrics || {};

  const filteredSchedule = todaySchedule.filter((appt) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      String(appt.id).includes(term) ||
      (appt.patient_name || '').toLowerCase().includes(term) ||
      (appt.patient_phone || appt.user_phone || '').includes(term) ||
      (appt.doctor_name || '').toLowerCase().includes(term) ||
      (appt.specialization_name || '').toLowerCase().includes(term);

    let matchesStatus = true;
    if (statusFilter === 'Pending') matchesStatus = appt.status === 'Pending';
    else if (statusFilter === 'Confirmed') matchesStatus = appt.status === 'Confirmed';
    else if (statusFilter === 'Completed') matchesStatus = appt.status === 'Completed';
    else if (statusFilter === 'Cancelled') matchesStatus = appt.status === 'Cancelled';

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#fef3c7',
            color: '#b45309'
          }}>
            <FaClock size={11} /> {t('receptionPortal.statusPending')}
          </span>
        );
      case 'Confirmed':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#ccfbf1',
            color: '#0f766e'
          }}>
            <FaCheckCircle size={11} /> {t('receptionPortal.statusConfirmed')}
          </span>
        );
      case 'Completed':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#dcfce7',
            color: '#15803d'
          }}>
            <FaCheckCircle size={11} /> {t('receptionPortal.statusCompleted')}
          </span>
        );
      case 'Cancelled':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: '#fee2e2',
            color: '#b91c1c'
          }}>
            <FaTimesCircle size={11} /> {t('receptionPortal.statusCancelled')}
          </span>
        );
      default:
        return (
          <span style={{
            padding: '0.3rem 0.75rem',
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

  const todayDateFormatted = stats?.today_date || new Date().toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Welcome Header Banner with Info Chips */}
      <div style={{
        background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)'
      }}>
        {/* Info Badges Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
          {/* Hospital Name */}
          <span style={{
            background: 'rgba(255, 255, 255, 0.18)',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            backdropFilter: 'blur(4px)'
          }}>
            <FaHospital size={11} />
            <span>{t('receptionPortal.hospitalLabel')}</span>
            <strong>{hospitalName || (isTelugu ? 'విశ్వసనీయ జనరల్ ఆసుపత్రి' : 'Reliability General Hospital')}</strong>
          </span>

          {/* Today's Date */}
          <span style={{
            background: 'rgba(255, 255, 255, 0.18)',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            backdropFilter: 'blur(4px)'
          }}>
            <FaCalendarAlt size={11} />
            <span>{t('receptionPortal.todayLabel')}</span>
            <strong>{todayDateFormatted}</strong>
          </span>

          {/* Receptionist Name */}
          <span style={{
            background: 'rgba(255, 255, 255, 0.18)',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            backdropFilter: 'blur(4px)'
          }}>
            <FaUser size={11} />
            <span>{t('receptionPortal.receptionistLabel')}</span>
            <strong>{user?.name || (isTelugu ? 'రిసెప్షనిస్ట్' : 'Receptionist')}</strong>
          </span>

          {/* Current Language Selection */}
          <span style={{
            background: 'rgba(255, 255, 255, 0.18)',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginLeft: 'auto',
            backdropFilter: 'blur(4px)'
          }}>
            <span>{t('receptionPortal.languageLabel')}</span>
            <strong style={{ color: '#5eead4' }}>{isTelugu ? 'తెలుగు (TE)' : 'English (EN)'}</strong>
          </span>
        </div>

        {/* Heading & Subtitle */}
        <div>
          <h1 style={{
            fontSize: '1.95rem',
            fontWeight: 800,
            margin: 0,
            letterSpacing: '-0.02em',
            color: '#ffffff'
          }}>
            {t('receptionPortal.welcomeTitle')}
          </h1>
          <p style={{
            margin: '0.4rem 0 0',
            opacity: 0.95,
            fontSize: '0.975rem',
            maxWidth: '800px',
            lineHeight: 1.5,
            color: '#e6fffa'
          }}>
            {t('receptionPortal.welcomeSubtitle')}
          </p>
        </div>
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

      {/* 2. Top Prominent Quick Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem'
      }}>
        {/* Quick Check-In Action Card */}
        <Link
          to="/admin/check-in"
          style={{
            textDecoration: 'none',
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            border: '2px solid #0f766e',
            display: 'flex',
            alignItems: 'center',
            gap: '1.15rem',
            boxShadow: '0 4px 6px -1px rgba(15, 118, 110, 0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 16px -2px rgba(15, 118, 110, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(15, 118, 110, 0.1)';
          }}
        >
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: '#ccfbf1',
            color: '#0f766e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            flexShrink: 0
          }}>
            <FaUserCheck />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f766e', lineHeight: 1.2 }}>
              {t('receptionPortal.quickCheckIn')}
            </div>
            <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.3rem' }}>
              {t('receptionPortal.quickCheckInDesc')}
            </div>
          </div>
        </Link>

        {/* Register New Patient Action Card */}
        <Link
          to="/admin/register-patient"
          style={{
            textDecoration: 'none',
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            border: '2px solid #2563eb',
            display: 'flex',
            alignItems: 'center',
            gap: '1.15rem',
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 16px -2px rgba(37, 99, 235, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(37, 99, 235, 0.1)';
          }}
        >
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: '#dbeafe',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            flexShrink: 0
          }}>
            <FaUserPlus />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e40af', lineHeight: 1.2 }}>
              {t('receptionPortal.registerNewPatient')}
            </div>
            <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.3rem' }}>
              {t('receptionPortal.registerNewPatientDesc')}
            </div>
          </div>
        </Link>
      </div>

      {/* 3. Five Real-time Summary Cards (Live Counts) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem'
      }}>
        {/* Card 1: Today's Appointments */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('receptionPortal.cardTodayTitle')}
            </span>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#f1f5f9',
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaCalendarAlt size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0 0.2rem' }}>
            {loading ? '-' : metrics.today_appointments ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {t('receptionPortal.cardTodayDesc')}
          </div>
        </div>

        {/* Card 2: Waiting for Arrival */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem',
          border: '1px solid #fef3c7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b45309' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('receptionPortal.cardWaitingTitle')}
            </span>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#fef3c7',
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaClock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#b45309', margin: '0.5rem 0 0.2rem' }}>
            {loading ? '-' : metrics.pending_checkins ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#b45309' }}>
            {t('receptionPortal.cardWaitingDesc')}
          </div>
        </div>

        {/* Card 3: Checked-In Patients */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem',
          border: '1px solid #ccfbf1',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#0f766e' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('receptionPortal.cardCheckedInTitle')}
            </span>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#ccfbf1',
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaUserCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f766e', margin: '0.5rem 0 0.2rem' }}>
            {loading ? '-' : metrics.checked_in ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#0f766e' }}>
            {t('receptionPortal.cardCheckedInDesc')}
          </div>
        </div>

        {/* Card 4: Completed Visits */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem',
          border: '1px solid #dcfce7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#15803d' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('receptionPortal.cardCompletedTitle')}
            </span>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#dcfce7',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaCheckCircle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#15803d', margin: '0.5rem 0 0.2rem' }}>
            {loading ? '-' : metrics.completed ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#15803d' }}>
            {t('receptionPortal.cardCompletedDesc')}
          </div>
        </div>

        {/* Card 5: Registered Patients */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('receptionPortal.cardRegisteredTitle')}
            </span>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#f1f5f9',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaUser size={16} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0 0.2rem' }}>
            {loading ? '-' : metrics.total_patients ?? 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {t('receptionPortal.cardRegisteredDesc')}
          </div>
        </div>
      </div>

      {/* 4. Today's Appointment Schedule Section */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        {/* Schedule Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {t('receptionPortal.scheduleTitle')}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
              {t('receptionPortal.scheduleSubtitle')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={fetchDashboardData}
              title={t('receptionPortal.refresh')}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <FaRedo size={12} /> {t('receptionPortal.refresh')}
            </button>
            <Link
              to="/admin/appointments"
              style={{
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                border: 'none',
                background: '#0f766e',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.8125rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              {t('receptionPortal.viewAllAppointments')}
            </Link>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '380px' }}>
            <FaSearch style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8'
            }} />
            <input
              type="text"
              placeholder={t('receptionPortal.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.3rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.825rem',
                outline: 'none',
                background: '#ffffff'
              }}
            />
          </div>

          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: t('receptionPortal.filterAll') },
              { id: 'Pending', label: t('receptionPortal.filterWaiting') },
              { id: 'Confirmed', label: t('receptionPortal.filterCheckedIn') },
              { id: 'Completed', label: t('receptionPortal.filterCompleted') },
              { id: 'Cancelled', label: t('receptionPortal.filterCancelled') }
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: active ? '#0f766e' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    border: '1px solid ' + (active ? '#0f766e' : '#cbd5e1'),
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule Table / Loading / Empty States */}
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <FaClock size={28} style={{ animation: 'spin 1s linear infinite', color: '#0f766e', marginBottom: '0.5rem' }} />
            <div>{isTelugu ? 'షెడ్యూల్ లోడ్ అవుతోంది...' : "Loading today's schedule..."}</div>
          </div>
        ) : filteredSchedule.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
            <FaClipboardList size={38} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#334155' }}>
              {t('receptionPortal.noAppointmentsTitle')}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.35rem' }}>
              {t('receptionPortal.noAppointmentsDesc')}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>{t('receptionPortal.colApptId')}</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>{t('receptionPortal.colPatient')}</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>{t('receptionPortal.colDoctor')}</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>{t('receptionPortal.colTime')}</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>{t('receptionPortal.colStatus')}</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>{t('receptionPortal.colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedule.map((appt) => (
                  <tr
                    key={appt.id}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Appt ID */}
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <div style={{ fontWeight: 800, color: '#0f766e' }}>
                        #{appt.id}
                      </div>
                    </td>

                    {/* Patient Name & Phone */}
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        {appt.patient_name || (isTelugu ? 'నడచి వచ్చిన రోగి' : 'Walk-in Patient')}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                        <FaPhoneAlt size={10} style={{ color: '#94a3b8' }} />
                        {appt.patient_phone || appt.user_phone || (isTelugu ? 'ఫోన్ లేదు' : 'No phone')}
                      </div>
                    </td>

                    {/* Doctor & Specialty */}
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FaUserMd size={13} style={{ color: '#0f766e' }} />
                        {appt.doctor_name || (isTelugu ? 'కన్సల్టెంట్ డాక్టర్' : 'Consultant Doctor')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                        {appt.specialization_name || (isTelugu ? 'సాధారణ వైద్యం' : 'General Medicine')}
                      </div>
                    </td>

                    {/* Time */}
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <FaClock size={11} style={{ color: '#0f766e' }} />
                        {appt.appointment_time}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                        {todayDateFormatted}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      {getStatusBadge(appt.status)}
                    </td>

                    {/* Action Button */}
                    <td style={{ padding: '0.95rem 1.25rem', textAlign: 'right' }}>
                      {appt.status === 'Pending' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCheckInModal(appt)}
                          style={{
                            padding: '0.45rem 0.9rem',
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
                          <FaUserCheck size={12} />
                          {t('receptionPortal.btnCheckIn')}
                        </button>
                      ) : appt.status === 'Confirmed' ? (
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f766e', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FaCheckCircle size={12} />
                          {t('receptionPortal.statusConfirmed')}
                        </span>
                      ) : appt.status === 'Completed' ? (
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FaCheckCircle size={12} />
                          {t('receptionPortal.statusCompleted')}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {t('receptionPortal.statusCancelled')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. In-Page Quick Check-In Confirmation Modal */}
      {checkInModalAppt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#ccfbf1',
                  color: '#0f766e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaUserCheck size={14} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {t('receptionPortal.modalCheckInTitle')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckInModalAppt(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmCheckIn} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: '0.925rem', color: '#334155', lineHeight: 1.5 }}>
                {t('receptionPortal.modalCheckInPrompt')}
              </p>

              {/* Patient Details Summary Box */}
              <div style={{
                background: '#f1f5f9',
                borderRadius: '10px',
                padding: '1rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                fontSize: '0.825rem'
              }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.725rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    {t('receptionPortal.colApptId')}
                  </span>
                  <strong style={{ color: '#0f766e', fontSize: '0.95rem' }}>#{checkInModalAppt.id}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.725rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    {t('receptionPortal.colTime')}
                  </span>
                  <strong style={{ color: '#0f172a' }}>{checkInModalAppt.appointment_time}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.725rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    {t('receptionPortal.colPatient')}
                  </span>
                  <strong style={{ color: '#0f172a' }}>{checkInModalAppt.patient_name || 'Walk-in Patient'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.725rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    {t('receptionPortal.colDoctor')}
                  </span>
                  <strong style={{ color: '#0f172a' }}>{checkInModalAppt.doctor_name || 'Doctor'}</strong>
                </div>
              </div>

              {/* Reception Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  {t('receptionPortal.modalNotesLabel')}
                </label>
                <input
                  type="text"
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                  placeholder={t('receptionPortal.modalNotesPlaceholder')}
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

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setCheckInModalAppt(null)}
                  disabled={submittingCheckIn}
                  style={{
                    padding: '0.6rem 1.15rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer'
                  }}
                >
                  {t('receptionPortal.modalCancelBtn')}
                </button>
                <button
                  type="submit"
                  disabled={submittingCheckIn}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0f766e',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    cursor: submittingCheckIn ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <FaUserCheck size={13} />
                  {submittingCheckIn ? t('receptionPortal.checkingIn') : t('receptionPortal.modalConfirmBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionDashboard;
