import React, { useState, useEffect, useCallback } from 'react';
import {
  FaClock,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaVideo,
  FaSave,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';
import { doctorService } from '../../services/doctorService';

export const DoctorSchedule = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState(null);

  const [availableDays, setAvailableDays] = useState('Monday - Saturday');
  const [availableTime, setAvailableTime] = useState('09:00 AM - 05:00 PM');
  const [consultationType, setConsultationType] = useState('In-Person & Video');
  const [consultationFee, setConsultationFee] = useState(500);
  const [status, setStatus] = useState('Active');

  const getLabel = useCallback((key, fallback) => {
    const val = t(key);
    if (!val || val === key) return fallback;
    return val;
  }, [t]);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await doctorService.getDoctorProfile();
        if (!isMounted) return;
        if (res && res.success) {
          const doc = res.doctor;
          setDoctor(doc);
          setAvailableDays(doc.available_days || 'Monday - Saturday');
          setAvailableTime(doc.available_time || '09:00 AM - 05:00 PM');
          setConsultationType(doc.consultation_type || 'In-Person & Video');
          setConsultationFee(doc.consultation_fee || 500);
          setStatus(doc.status || 'Active');
        } else {
          toast.error(res?.message || 'Failed to fetch doctor schedule.');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching schedule:', err);
        toast.error(err.response?.data?.message || 'Error loading schedule.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => { isMounted = false; };
  }, []);

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const feeNum = parseFloat(consultationFee);
      if (isNaN(feeNum) || feeNum < 0) {
        toast.error('Please enter a valid non-negative consultation fee.');
        return;
      }

      const res = await doctorService.updateDoctorProfile({
        available_days: availableDays.trim(),
        available_time: availableTime.trim(),
        consultation_type: consultationType,
        consultation_fee: feeNum,
        status: status
      });

      if (res.success) {
        toast.success(getLabel('doctorPortal.scheduleSaveSuccess', 'Practice schedule and availability updated successfully!'));
        setDoctor(res.doctor);
      } else {
        toast.error(res.message || 'Failed to update schedule.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error updating schedule.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTopColor: '#0D9488', borderRadius: '50%' }} />
        <p style={{ color: '#0F766E', fontSize: '0.95rem', fontWeight: 600 }}>
          {getLabel('doctorPortal.scheduleSubtitle', 'Loading practice hours & availability...')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header */}
      <div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0C2328', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>
          {getLabel('doctorPortal.scheduleTitle', 'Practice Hours & Availability')}
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.88rem', margin: 0 }}>
          {getLabel('doctorPortal.scheduleSubtitle', 'Configure your weekly consultation schedule, working hours, and practice status')}
        </p>
      </div>

      {/* Main Schedule Form Card */}
      <form onSubmit={handleSaveSchedule} style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '2rem',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {/* Practice Status Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0C2328', marginBottom: '0.5rem' }}>
            {getLabel('doctorPortal.practiceStatus', 'Practice Availability Status')}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div
              onClick={() => setStatus('Active')}
              style={{
                padding: '1rem',
                borderRadius: '10px',
                border: '2px solid',
                borderColor: status === 'Active' ? '#0D9488' : '#E2E8F0',
                backgroundColor: status === 'Active' ? '#F0FDFA' : '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'border-color 0.15s ease'
              }}
            >
              <FaCheckCircle size={20} style={{ color: status === 'Active' ? '#0D9488' : '#94A3B8' }} />
              <div>
                <div style={{ fontWeight: 800, color: '#0C2328', fontSize: '0.9rem' }}>
                  {getLabel('doctorPortal.statusActive', 'Active (Accepting Consultations)')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>
                  Visible to patients for appointment booking
                </div>
              </div>
            </div>

            <div
              onClick={() => setStatus('Inactive')}
              style={{
                padding: '1rem',
                borderRadius: '10px',
                border: '2px solid',
                borderColor: status === 'Inactive' ? '#EF4444' : '#E2E8F0',
                backgroundColor: status === 'Inactive' ? '#FEF2F2' : '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'border-color 0.15s ease'
              }}
            >
              <FaTimesCircle size={20} style={{ color: status === 'Inactive' ? '#EF4444' : '#94A3B8' }} />
              <div>
                <div style={{ fontWeight: 800, color: '#0C2328', fontSize: '0.9rem' }}>
                  {getLabel('doctorPortal.statusInactive', 'Inactive / On Leave')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.15rem' }}>
                  Temporarily pause new appointment bookings
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Days & Hours Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800, color: '#0C2328', marginBottom: '0.5rem' }}>
              <FaCalendarAlt size={13} style={{ color: '#0D9488' }} />
              {getLabel('doctorPortal.weeklyAvailability', 'Weekly Available Days')}
            </label>
            <input
              type="text"
              value={availableDays}
              onChange={(e) => setAvailableDays(e.target.value)}
              placeholder={getLabel('doctorPortal.availableDaysPlaceholder', 'e.g., Monday - Saturday')}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800, color: '#0C2328', marginBottom: '0.5rem' }}>
              <FaClock size={13} style={{ color: '#0D9488' }} />
              {getLabel('doctorPortal.dailyWorkingHours', 'Daily Consultation Hours')}
            </label>
            <input
              type="text"
              value={availableTime}
              onChange={(e) => setAvailableTime(e.target.value)}
              placeholder={getLabel('doctorPortal.workingHoursPlaceholder', 'e.g., 09:00 AM - 05:00 PM')}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Mode & Consultation Fee Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800, color: '#0C2328', marginBottom: '0.5rem' }}>
              <FaVideo size={13} style={{ color: '#0D9488' }} />
              {getLabel('doctorPortal.consultationType', 'Consultation Modes')}
            </label>
            <select
              value={consultationType}
              onChange={(e) => setConsultationType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.88rem',
                background: '#FFFFFF',
                boxSizing: 'border-box',
                color: '#1E293B'
              }}
            >
              <option value="In-Person & Video">In-Person & Video Consultation</option>
              <option value="In-Person Only">In-Person Clinic Visit Only</option>
              <option value="Video Only">Telehealth / Video Only</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800, color: '#0C2328', marginBottom: '0.5rem' }}>
              <FaMoneyBillWave size={13} style={{ color: '#0D9488' }} />
              {getLabel('doctorPortal.consultationFeeLabel', 'Consultation Fee (INR ₹)')}
            </label>
            <input
              type="number"
              min="0"
              step="50"
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Guidelines Callout */}
        <div style={{
          backgroundColor: '#F0FDFA',
          border: '1px solid #99F6E4',
          borderRadius: '10px',
          padding: '1.1rem',
          display: 'flex',
          gap: '0.85rem',
          alignItems: 'flex-start'
        }}>
          <FaInfoCircle size={18} style={{ color: '#0D9488', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 800, color: '#0F766E', fontSize: '0.88rem', marginBottom: '0.2rem' }}>
              {getLabel('doctorPortal.scheduleNoticeTitle', 'Clinical Scheduling Guidelines')}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#134E4A', lineHeight: 1.5 }}>
              {getLabel('doctorPortal.scheduleNoticeDesc', 'Updated hours directly reflect on the patient booking portal. Set status to Inactive when on leave to prevent double-booking.')}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1.75rem',
              background: '#0D9488',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)'
            }}
          >
            <FaSave size={14} />
            {saving
              ? getLabel('doctorPortal.savingSchedule', 'Saving Changes...')
              : getLabel('doctorPortal.saveScheduleBtn', 'Save Schedule & Availability')}
          </button>
        </div>
      </form>
    </div>
  );
};
