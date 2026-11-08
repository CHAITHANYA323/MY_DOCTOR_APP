import React, { useState, useEffect, useCallback } from 'react';
import {
  FaCog,
  FaSave,
  FaHospital,
  FaPhoneAlt,
  FaClock,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaShieldAlt
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { hospitalService } from '../../services/hospitalService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

export const HospitalSettings = () => {
  const { user, hospitalId, hospitalName } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Telangana');
  const [emergencyNumber, setEmergencyNumber] = useState('108');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [workingHours, setWorkingHours] = useState('24 Hours / 7 Days');
  const [facilities, setFacilities] = useState('');

  const fetchHospitalSettings = useCallback(async () => {
    if (!hospitalId && !user?.hospital_id) {
      setError('Super Admin account is not assigned to a hospital node.');
      setLoading(false);
      return;
    }

    const targetHospId = hospitalId || user?.hospital_id;
    setLoading(true);
    setError('');

    try {
      const res = await hospitalService.getHospitalById(targetHospId);
      if (res.success && res.hospital) {
        const h = res.hospital;
        setName(h.name || '');
        setAddress(h.address || '');
        setCity(h.city || '');
        setState(h.state || 'Telangana');
        setEmergencyNumber(h.emergency_number || '108');
        setPhone(h.phone || '');
        setEmail(h.email || '');
        setWorkingHours(h.working_hours || '24 Hours / 7 Days');
        setFacilities(h.facilities || '');
      } else {
        setError(res.message || 'Unable to retrieve hospital branch settings.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch hospital settings from backend.'));
    } finally {
      setLoading(false);
    }
  }, [hospitalId, user?.hospital_id]);

  useEffect(() => {
    fetchHospitalSettings();
  }, [fetchHospitalSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const targetHospId = hospitalId || user?.hospital_id;
    if (!targetHospId) {
      setError('No hospital node assigned.');
      return;
    }

    if (!name.trim() || !address.trim() || !city.trim() || !emergencyNumber.trim()) {
      setError('Hospital name, address, city, and emergency number are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        emergency_number: emergencyNumber.trim(),
        phone: phone.trim(),
        email: email.trim(),
        working_hours: workingHours.trim(),
        facilities: facilities.trim()
      };

      const res = await hospitalService.updateHospital(targetHospId, payload);
      if (res.success) {
        setSuccessMessage('Hospital settings updated successfully!');
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setError(res.message || 'Failed to update hospital settings.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to save hospital settings.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '40px', width: '280px', borderRadius: '8px' }} />
        <div className="skeleton" style={{ height: '420px', borderRadius: '12px' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '850px' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
          Hospital Operational Settings
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.25rem', marginBottom: 0 }}>
          Manage working hours, emergency contacts, and branch details for {name || hospitalName || 'your hospital'}
        </p>
      </div>

      {successMessage && (
        <div style={{
          padding: '0.85rem 1rem',
          backgroundColor: '#dcfce7',
          color: '#15803d',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.88rem',
          fontWeight: 700,
          border: '1px solid #bbf7d0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <FaCheckCircle />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.85rem 1rem',
          backgroundColor: 'var(--emergency-light)',
          color: 'var(--emergency)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.88rem',
          fontWeight: 600,
          border: '1px solid #fecaca',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Hospital Branch Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Street Address *</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">State *</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">24/7 Emergency Helpline *</label>
              <input
                type="text"
                placeholder="108 or +91 40 12345678"
                value={emergencyNumber}
                onChange={(e) => setEmergencyNumber(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Front Desk Phone</label>
              <input
                type="text"
                placeholder="+91 40 87654321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Official Hospital Email</label>
              <input
                type="email"
                placeholder="contact@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Operating Schedule</label>
              <input
                type="text"
                placeholder="24 Hours / 7 Days or 08:00 AM - 10:00 PM"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Hospital Facilities (Comma-separated)</label>
              <textarea
                placeholder="ICU, Emergency, 24/7 Pharmacy, Ambulance, Radiology, Pathology"
                value={facilities}
                onChange={(e) => setFacilities(e.target.value)}
                className="form-input"
                rows="3"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              icon={<FaSave aria-hidden="true" />}
            >
              Save Hospital Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HospitalSettings;
