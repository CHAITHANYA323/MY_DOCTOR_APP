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
  FaShieldAlt,
  FaInfoCircle
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { hospitalService } from '../../services/hospitalService';
import { getApiErrorMessage } from '../../services/api';
import { Button } from '../../components/common/Button';

export const HospitalSettings = () => {
  const { user, hospitalId, hospitalName } = useAuth();
  const { t } = useLanguage();

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
        setSuccessMessage(t('superAdminPortal.settings.savedSuccess'));
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '880px' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
          {t('superAdminPortal.settings.title')}
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.25rem', marginBottom: 0 }}>
          {t('superAdminPortal.settings.subtitle')} &bull; {name || hospitalName || 'Assigned Hospital'}
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
      <div className="card" style={{ padding: '2rem', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid var(--slate-200)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section 1: Basic Hospital Information */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.5rem' }}>
              <FaHospital color="var(--primary, #0284c7)" size={16} />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                {t('superAdminPortal.settings.secHospitalInfo')}
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Hospital Branch Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Street Address *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>City *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>State *</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Emergency Hotline */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.5rem' }}>
              <FaPhoneAlt color="#0284c7" size={15} />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                {t('superAdminPortal.settings.secContact')}
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>24/7 Emergency Helpline *</label>
                <input
                  type="text"
                  placeholder="108 or +91 40 12345678"
                  value={emergencyNumber}
                  onChange={(e) => setEmergencyNumber(e.target.value)}
                  required
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Front Desk Phone</label>
                <input
                  type="text"
                  placeholder="+91 40 87654321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Official Hospital Email</label>
                <input
                  type="email"
                  placeholder="contact@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Operating Hours & Facilities */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.5rem' }}>
              <FaClock color="#0284c7" size={16} />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                {t('superAdminPortal.settings.secHours')}
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Operating Schedule</label>
                <input
                  type="text"
                  placeholder="24 Hours / 7 Days or 08:00 AM - 10:00 PM"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>Hospital Facilities (Comma-separated)</label>
                <textarea
                  placeholder="ICU, Emergency, 24/7 Pharmacy, Ambulance, Radiology, Pathology"
                  value={facilities}
                  onChange={(e) => setFacilities(e.target.value)}
                  className="form-input"
                  rows="3"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Security & Isolation Controls */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.5rem' }}>
              <FaShieldAlt color="#0f766e" size={16} />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                {t('superAdminPortal.settings.secSecurity')}
              </h2>
            </div>
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <FaInfoCircle color="#0284c7" size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'block' }}>
                  Assigned Hospital Node: #{hospitalId || user?.hospital_id || 1} ({activeHospitalName(hospitalName, user)})
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>
                  Role: <strong>{user?.role || 'HOSPITAL_SUPER_ADMIN'}</strong> &bull; Authenticated Admin: {user?.email}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#0369a1', display: 'block', marginTop: '0.4rem', fontWeight: 600 }}>
                  Multi-tenant isolation active: Changes saved here affect only your assigned hospital branch records.
                </span>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              icon={<FaSave aria-hidden="true" />}
            >
              {saving ? t('superAdminPortal.settings.saving') : t('superAdminPortal.settings.btnSave')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const activeHospitalName = (hospitalName, user) => {
  return hospitalName || user?.hospital_name || 'Reliability General Hospital';
};

export default HospitalSettings;
