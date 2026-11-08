import React, { useState, useEffect } from 'react';
import {
  FaClock,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaVideo,
  FaSave,
  FaHospital
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { doctorService } from '../../services/doctorService';

export const DoctorSchedule = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState(null);

  const [availableDays, setAvailableDays] = useState('Monday - Saturday');
  const [availableTime, setAvailableTime] = useState('09:00 AM - 05:00 PM');
  const [consultationType, setConsultationType] = useState('In-Person & Video');
  const [consultationFee, setConsultationFee] = useState(500);
  const [status, setStatus] = useState('Active');

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await doctorService.getDoctorProfile();
        if (res.success && isMounted) {
          const doc = res.doctor;
          setDoctor(doc);
          setAvailableDays(doc.available_days || 'Monday - Saturday');
          setAvailableTime(doc.available_time || '09:00 AM - 05:00 PM');
          setConsultationType(doc.consultation_type || 'In-Person & Video');
          setConsultationFee(doc.consultation_fee || 500);
          setStatus(doc.status || 'Active');
        } else {
          toast.error(res.message || 'Failed to fetch doctor schedule.');
        }
      } catch (err) {
        console.error(err);
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
        available_days: availableDays,
        available_time: availableTime,
        consultation_type: consultationType,
        consultation_fee: feeNum,
        status: status
      });

      if (res.success) {
        toast.success('Practice hours and availability updated successfully!');
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
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%' }} />
        <p style={{ color: '#64748b' }}>Loading practice hours & availability...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>
          Hours & Availability
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
          Manage your consultation working days, daily clinic hours, consultation types, and fees
        </p>
      </div>

      {/* Facility Notice */}
      <div style={{
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <FaHospital size={18} style={{ color: '#0284c7', marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: '#0369a1', lineHeight: 1.5 }}>
          <strong>Hospital Facility:</strong> You are currently affiliated with <strong>{doctor?.hospital_name || 'Hospital'}</strong> in <strong>{doctor?.location || 'General Wing'}</strong>.
          Patients booking appointments through reception or the online portal will be scheduled according to the hours defined below.
        </div>
      </div>

      {/* Settings Form Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '2rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <form onSubmit={handleSaveSchedule}>
          {/* Active Status Toggle */}
          <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Practice Availability Status
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                <input
                  type="radio"
                  name="practice_status"
                  value="Active"
                  checked={status === 'Active'}
                  onChange={() => setStatus('Active')}
                />
                <span style={{ fontWeight: 600, color: '#16a34a' }}>Active & Accepting Appointments</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                <input
                  type="radio"
                  name="practice_status"
                  value="Inactive"
                  checked={status === 'Inactive'}
                  onChange={() => setStatus('Inactive')}
                />
                <span style={{ fontWeight: 600, color: '#dc2626' }}>Temporarily On Leave / Inactive</span>
              </label>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
              When set to Inactive, new appointment bookings will be paused for your profile across all channels.
            </p>
          </div>

          {/* Working Days */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              <FaCalendarAlt size={14} style={{ color: '#0284c7' }} />
              Available Working Days
            </label>
            <input
              type="text"
              value={availableDays}
              onChange={(e) => setAvailableDays(e.target.value)}
              placeholder="e.g. Monday - Saturday, Mon/Wed/Fri"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
              required
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              {['Monday - Saturday', 'Monday - Friday', 'Mon, Wed, Fri', 'Tue, Thu, Sat'].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setAvailableDays(preset)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Available Working Hours */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              <FaClock size={14} style={{ color: '#0284c7' }} />
              Consultation Working Hours
            </label>
            <input
              type="text"
              value={availableTime}
              onChange={(e) => setAvailableTime(e.target.value)}
              placeholder="e.g. 09:00 AM - 05:00 PM, 10:00 AM - 02:00 PM"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
              required
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              {['09:00 AM - 05:00 PM', '10:00 AM - 02:00 PM', '02:00 PM - 08:00 PM', '08:00 AM - 04:00 PM'].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setAvailableTime(preset)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Consultation Type */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              <FaVideo size={14} style={{ color: '#0284c7' }} />
              Consultation Modes Offered
            </label>
            <select
              value={consultationType}
              onChange={(e) => setConsultationType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.9rem',
                background: '#ffffff',
                boxSizing: 'border-box'
              }}
            >
              <option value="In-Person & Video">In-Person & Video Consultation</option>
              <option value="In-Person Only">In-Person Consultation Only</option>
              <option value="Video Only">Telehealth / Video Consultation Only</option>
            </select>
          </div>

          {/* Consultation Fee */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              <FaMoneyBillWave size={14} style={{ color: '#0284c7' }} />
              Consultation Fee (₹ INR)
            </label>
            <input
              type="number"
              min="0"
              step="50"
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
              placeholder="e.g. 500"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
              required
            />
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
              This fee is presented to patients at the time of booking and receipt generation.
            </p>
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 2rem',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              <FaSave size={14} />
              {saving ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
