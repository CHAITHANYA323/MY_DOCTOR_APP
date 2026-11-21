import React, { useState, useEffect } from 'react';
import {
  FaBuilding,
  FaPhoneAlt,
  FaAmbulance,
  FaClock,
  FaGlobe,
  FaMapMarkerAlt,
  FaSave,
  FaCheckCircle,
  FaInfoCircle,
  FaShieldAlt
} from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';
import { ecosystemService } from '../../services/ecosystemService';
import { notify } from '../../utils/toast';

export const HospitalProfileManagement = () => {
  const { isTelugu } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hospital, setHospital] = useState(null);

  // Form Fields (Permitted fields for Hospital Admin)
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyNumber, setEmergencyNumber] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [facilities, setFacilities] = useState('');
  const [website, setWebsite] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await ecosystemService.getHospitalAdminProfile();
      if (res.success && res.hospital) {
        setHospital(res.hospital);
        setAddress(res.hospital.address || '');
        setPhone(res.hospital.phone || '');
        setEmergencyNumber(res.hospital.emergency_number || '');
        setWorkingHours(res.hospital.working_hours || '24 Hours / 7 Days');
        const facs = res.hospital.facilities;
        setFacilities(Array.isArray(facs) ? facs.join(', ') : (facs || ''));
        setWebsite(res.hospital.website || '');
      }
    } catch (err) {
      notify.error(isTelugu ? 'ఆసుపత్రి వివరాలను లోడ్ చేయడం సాధ్యం కాలేదు' : 'Could not load hospital details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        address,
        phone,
        emergency_number: emergencyNumber,
        working_hours: workingHours,
        facilities,
        website
      };
      const res = await ecosystemService.updateHospitalAdminProfile(payload);
      if (res.success) {
        notify.success(isTelugu ? 'ఆసుపత్రి వివరాలు విజయవంతంగా నవీకరించబడ్డాయి!' : 'Hospital profile details updated successfully!');
        setHospital(res.hospital);
      }
    } catch (err) {
      notify.error(err.response?.data?.message || (isTelugu ? 'నవీకరణ విఫలమైంది' : 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: '#1e3a8a' }}>Loading Hospital Profile...</div>;
  }

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
          {isTelugu ? 'ఆసుపత్రి వివరాలు' : 'Hospital Details'}
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>
          {isTelugu
            ? 'మీ ఆసుపత్రి సంప్రదింపు సమాచారం, అత్యవసర హాట్‌లైన్ మరియు వైద్య సదుపాయాలను ఇక్కడ నిర్వహించండి.'
            : 'Update your hospital public contact info, address, emergency phone, and medical facilities.'}
        </p>
      </div>

      {/* Governance Banner */}
      <div style={{
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        padding: '0.85rem 1.15rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <FaShieldAlt color="#1d4ed8" size={18} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
        <div>
          <strong style={{ fontSize: '0.84rem', color: '#1e3a8a', display: 'block', marginBottom: '0.15rem' }}>
            {isTelugu ? 'ఆసుపత్రి సమాచార మార్గదర్శకాలు' : 'Hospital Information Guidelines'}
          </strong>
          <span style={{ fontSize: '0.78rem', color: '#1e40af', lineHeight: 1.45, display: 'block' }}>
            {isTelugu
              ? 'ఆసుపత్రి పేరు మరియు ధృవీకరణ వివరాలు సూపర్ అడ్మిన్ ద్వారా మాత్రమే మార్చబడతాయి. రోజువారీ సంప్రదింపు వివరాలు, చిరునామా మరియు సదుపాయాలను మీరు ఇక్కడ సులభంగా నవీకరించవచ్చు.'
              : 'Hospital Name and Verification Status are approved by the SuperAdmin. You can freely update phone numbers, address, visiting hours, and facilities below.'}
          </span>
        </div>
      </div>

      {/* Profile Form */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: ' clamp(1.25rem, 3vw, 2rem)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Readonly Core Name & City */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                {isTelugu ? 'ఆసుపత్రి పేరు (లాక్ చేయబడింది)' : 'Hospital Name (Verified)'}
              </label>
              <input
                type="text"
                value={hospital?.name || ''}
                disabled
                style={{ width: '100%', padding: '0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                {isTelugu ? 'నగరం / ప్రాంతం' : 'City & Location'}
              </label>
              <input
                type="text"
                value={`${hospital?.city || ''}, ${hospital?.state || ''}`}
                disabled
                style={{ width: '100%', padding: '0.75rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Editable: Full Physical Address */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>
              📍 {isTelugu ? 'పూర్తి భౌతిక చిరునామా' : 'Physical Address'} *
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              rows={2}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical' }}
            />
          </div>

          {/* Editable: Phone & Emergency Hotline */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>
                ☎️ {isTelugu ? 'ఆసుపత్రి రిసెప్షన్ ఫోన్' : 'Reception / Help Desk Phone'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: '0.4rem' }}>
                🚑 {isTelugu ? '24/7 అత్యవసర హాట్‌లైన్ (Emergency Number)' : '24/7 Emergency Hotline'} *
              </label>
              <input
                type="text"
                value={emergencyNumber}
                onChange={(e) => setEmergencyNumber(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f87171', fontSize: '0.9rem', backgroundColor: '#fff5f5' }}
              />
            </div>
          </div>

          {/* Editable: Working Hours & Website */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>
                ⏰ {isTelugu ? 'పని వేళలు (Working Hours)' : 'Working Hours'}
              </label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                placeholder="24 Hours / 7 Days or 08:00 AM - 09:00 PM"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>
                🌐 {isTelugu ? 'అధికారిక వెబ్‌సైట్' : 'Official Website'}
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://hospital.example.com"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Editable: Facilities & Amenities */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.4rem' }}>
              🏥 {isTelugu ? 'సౌకర్యాలు & సేవల జాబితా (కామాలతో విభజించండి)' : 'Facilities & Services (Comma separated)'}
            </label>
            <input
              type="text"
              value={facilities}
              onChange={(e) => setFacilities(e.target.value)}
              placeholder="ICU, 24/7 Pharmacy, Emergency Trauma, Blood Bank, CT Scan"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.8rem 1.75rem',
                backgroundColor: '#1d4ed8',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                boxShadow: '0 4px 14px rgba(29, 78, 216, 0.3)'
              }}
            >
              <FaSave />
              <span>{saving ? (isTelugu ? 'సేవ్ చేస్తోంది...' : 'Saving Changes...') : (isTelugu ? 'వివరాలను సేవ్ చేయండి' : 'Save Hospital Profile')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
