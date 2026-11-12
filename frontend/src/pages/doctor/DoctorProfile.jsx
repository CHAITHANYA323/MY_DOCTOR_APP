import React, { useState, useEffect, useCallback } from 'react';
import {
  FaUserMd,
  FaHospital,
  FaPhoneAlt,
  FaEnvelope,
  FaLanguage,
  FaSave,
  FaInfoCircle,
  FaShieldAlt,
  FaAward,
  FaStethoscope
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';
import { doctorService } from '../../services/doctorService';
import { formatDoctorDisplayName, getDoctorInitials } from '../../utils/doctorNameUtils';

export const DoctorProfile = () => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState(null);

  // Editable fields
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [languages, setLanguages] = useState('');
  const [about, setAbout] = useState('');

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
          setPhone(doc.phone || '');
          setEmail(doc.email || doc.account_email || '');
          setLanguages(doc.languages || 'English, Telugu, Hindi');
          setAbout(doc.about || '');
        } else {
          toast.error(res?.message || 'Failed to fetch doctor profile.');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching doctor profile:', err);
        toast.error(err.response?.data?.message || 'Error loading doctor profile.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => { isMounted = false; };
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await doctorService.updateDoctorProfile({
        phone: phone.trim(),
        email: email.trim(),
        languages: languages.trim(),
        about: about.trim()
      });

      if (res.success) {
        toast.success(getLabel('doctorPortal.profileSaveSuccess', 'Clinical profile updated successfully!'));
        setDoctor(res.doctor);
      } else {
        toast.error(res.message || 'Profile update failed.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid #E2E8F0', borderTopColor: '#0D9488', borderRadius: '50%' }} />
        <p style={{ color: '#0F766E', fontSize: '0.95rem', fontWeight: 600 }}>
          {getLabel('doctorPortal.profileSubtitle', 'Loading doctor profile & credentials...')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header */}
      <div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0C2328', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>
          {getLabel('doctorPortal.profileTitle', 'Doctor Profile & Credentials')}
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.88rem', margin: 0 }}>
          {getLabel('doctorPortal.profileSubtitle', 'Manage your verified professional credentials, clinic contact, and biography')}
        </p>
      </div>

      {/* Hero Doctor Identity Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0C2328 0%, #134E4A 100%)',
        borderRadius: '16px',
        padding: '2rem',
        color: '#FFFFFF',
        boxShadow: '0 8px 24px rgba(12, 35, 40, 0.15)',
        border: '1px solid rgba(45, 212, 191, 0.2)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        <div style={{
          width: '76px',
          height: '76px',
          borderRadius: '16px',
          backgroundColor: '#134E4A',
          border: '3px solid #2DD4BF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontSize: '1.65rem',
          fontWeight: 800,
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {doctor?.image ? (
            <img src={doctor.image} alt={doctor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            getDoctorInitials(doctor?.name)
          )}
        </div>

        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{
              background: 'rgba(45, 212, 191, 0.2)',
              color: '#2DD4BF',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.2rem 0.65rem',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: '1px solid rgba(45, 212, 191, 0.35)'
            }}>
              <FaShieldAlt size={10} />
              {getLabel('doctorPortal.licenseVerified', 'Medical Council Certified')}
            </span>
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 0.35rem 0' }}>
            {formatDoctorDisplayName(doctor?.name, language, 'Physician')}
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', color: '#CCFBF1', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <FaStethoscope size={12} style={{ color: '#2DD4BF' }} />
              {doctor?.specialization_name || doctor?.specialization || 'Cardiology'}
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <FaHospital size={12} style={{ color: '#2DD4BF' }} />
              {doctor?.hospital_name || doctor?.hospital || 'Hospital'}
            </span>
            {doctor?.experience_years && (
              <>
                <span>•</span>
                <span>{doctor.experience_years} Years Experience</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Section 1: Verified Credentials (Admin Managed) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '1.75rem',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
            <FaAward size={16} style={{ color: '#0D9488' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0C2328', margin: 0 }}>
              {getLabel('doctorPortal.professionalCredentials', 'Professional Credentials')}
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                {getLabel('doctorPortal.doctorFullName', 'Full Name')}
              </label>
              <div style={{ padding: '0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontWeight: 700, color: '#0C2328', fontSize: '0.88rem' }}>
                {doctor?.name || 'Dr. Rajesh Kumar'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                {getLabel('doctorPortal.specialtyLabel', 'Medical Specialty')}
              </label>
              <div style={{ padding: '0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontWeight: 700, color: '#0C2328', fontSize: '0.88rem' }}>
                {doctor?.specialization_name || doctor?.specialization || 'Cardiology'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                {getLabel('doctorPortal.hospitalAffiliation', 'Hospital Affiliation')}
              </label>
              <div style={{ padding: '0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontWeight: 700, color: '#0C2328', fontSize: '0.88rem' }}>
                {doctor?.hospital_name || doctor?.hospital || 'Reliability General Hospital'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                {getLabel('doctorPortal.medicalRegistrationNumber', 'Medical Council Reg No.')}
              </label>
              <div style={{ padding: '0.75rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontWeight: 700, color: '#0C2328', fontSize: '0.88rem' }}>
                {doctor?.registration_number || 'MCI-AP-2015-88492'}
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            fontSize: '0.78rem',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FaInfoCircle size={13} style={{ color: '#0D9488', flexShrink: 0 }} />
            <span>{getLabel('doctorPortal.administrativeNotice', 'Note: Legal credential name, hospital affiliation, and core medical specialty are managed by Hospital Administration.')}</span>
          </div>
        </div>

        {/* Section 2: Editable Personal & Contact Info */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '1.75rem',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
            <FaUserMd size={16} style={{ color: '#0D9488' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0C2328', margin: 0 }}>
              {getLabel('doctorPortal.personalAndContact', 'Personal & Contact Information')}
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800, color: '#0C2328', marginBottom: '0.5rem' }}>
                <FaPhoneAlt size={12} style={{ color: '#0D9488' }} />
                {getLabel('doctorPortal.primaryPhone', 'Contact Phone')}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
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
                <FaEnvelope size={12} style={{ color: '#0D9488' }} />
                {getLabel('doctorPortal.primaryEmail', 'Email Address')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@example.com"
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

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800, color: '#0C2328', marginBottom: '0.5rem' }}>
                <FaLanguage size={14} style={{ color: '#0D9488' }} />
                {getLabel('doctorPortal.spokenLanguages', 'Spoken Languages')}
              </label>
              <input
                type="text"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder={getLabel('doctorPortal.languagesPlaceholder', 'e.g., English, Telugu, Hindi')}
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

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0C2328', marginBottom: '0.5rem' }}>
                {getLabel('doctorPortal.aboutPractice', 'About Doctor & Practice')}
              </label>
              <textarea
                rows={4}
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder={getLabel('doctorPortal.aboutPlaceholder', 'Write a brief professional summary of your clinical expertise and background...')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
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
                ? getLabel('doctorPortal.savingProfile', 'Saving Profile...')
                : getLabel('doctorPortal.saveProfileBtn', 'Save Profile Information')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
