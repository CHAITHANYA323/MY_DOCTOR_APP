import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FaUserPlus,
  FaUser,
  FaEnvelope,
  FaPhoneAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCalendarPlus,
  FaHospital,
  FaArrowLeft,
  FaSearch,
  FaVenusMars,
  FaBirthdayCake,
  FaKey,
  FaCopy
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { receptionService } from '../../services/receptionService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';

export const RegisterPatient = () => {
  const { hospitalName } = useAuth();
  const { t, isTelugu } = useLanguage();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'Male',
    dob: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredPatient, setRegisteredPatient] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    const trimmedPhone = form.phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      setError(isTelugu
        ? 'దయచేసి రోగి పూర్తి పేరు, ఈమెయిల్ మరియు ఫోన్ నంబర్ నమోదు చేయండి.'
        : 'Please provide the patient’s full name, email address, and contact number.');
      return;
    }

    // Phone validation
    const phoneDigits = trimmedPhone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setError(isTelugu
        ? 'దయచేసి సరైన ఫోన్ నంబర్ నమోదు చేయండి (7-15 అంకెలు).'
        : 'Please enter a valid phone number (7-15 digits).');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone
      };

      const res = await receptionService.registerPatient(payload);
      if (res && res.success) {
        notify.success(t('receptionPortal.patientRegisteredSuccess'));
        setRegisteredPatient(res.patient);
      } else {
        setError(res.message || (isTelugu ? 'నమోదు విఫలమైంది.' : 'Patient registration failed.'));
      }
    } catch (err) {
      console.error('Registration failed:', err);
      const msg = getApiErrorMessage(err, isTelugu ? 'రోగి నమోదు విఫలమైంది.' : 'Failed to register patient. Please verify details.');
      if (err?.response?.status === 409) {
        setError(t('receptionPortal.duplicateEmailError'));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      name: '',
      email: '',
      phone: '',
      gender: 'Male',
      dob: ''
    });
    setRegisteredPatient(null);
    setError('');
    setCopied(false);
  };

  const handleBookAppointment = () => {
    if (registeredPatient) {
      navigate('/admin/appointments', {
        state: {
          preselectedPatient: registeredPatient
        }
      });
    }
  };

  const handleCopyPassword = () => {
    if (registeredPatient?.temporary_password) {
      navigator.clipboard.writeText(registeredPatient.temporary_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      notify.success(isTelugu ? 'పాస్‌వర్డ్ కాపీ చేయబడింది!' : 'Password copied to clipboard!');
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header with Breadcrumb and Facility Badge */}
      <div style={{
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {t('receptionPortal.registerPageTitle')}
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#ccfbf1',
              color: '#0f766e'
            }}>
              <FaHospital size={11} /> {hospitalName || (isTelugu ? 'విశ్వసనీయ ఆసుపత్రి' : 'Hospital Reception')}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            {t('receptionPortal.registerPageSubtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin')}
          style={{
            padding: '0.5rem 0.9rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#475569',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <FaArrowLeft size={11} /> {isTelugu ? 'డ్యాష్‌బోర్డ్‌కు వెళ్ళు' : 'Back to Dashboard'}
        </button>
      </div>

      {/* 2. Top "Search First" Duplicate Prevention Notice */}
      {!registeredPatient && (
        <div style={{
          background: '#f0fdfa',
          border: '1px solid #99f6e4',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#ccfbf1',
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FaSearch size={14} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#134e4a' }}>
                {t('receptionPortal.searchFirstHint')}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#0f766e' }}>
                {isTelugu ? 'రోగి ఇంతకుముందు సందర్శించినట్లయితే మళ్లీ నమోదు చేయవలసిన అవసరం లేదు.' : 'Avoid creating duplicate records if this patient visited before.'}
              </div>
            </div>
          </div>
          <Link
            to="/admin/patients"
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              background: '#0f766e',
              color: '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <FaSearch size={12} /> {t('receptionPortal.searchBeforeRegister')}
          </Link>
        </div>
      )}

      {/* 3. Error Banner */}
      {error && (
        <div style={{
          padding: '0.9rem 1.25rem',
          borderRadius: '8px',
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#991b1b',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <FaExclamationTriangle style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Success State Banner with Auto-Generated Credentials */}
      {registeredPatient && (
        <div style={{
          background: '#f0fdf4',
          border: '2px solid #86efac',
          borderRadius: '16px',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: '0 4px 12px rgba(22, 101, 52, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: '#dcfce7',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              flexShrink: 0
            }}>
              <FaCheckCircle />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#166534' }}>
                {t('receptionPortal.patientRegisteredSuccess')}
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#15803d' }}>
                {isTelugu ? `రోగి ఖాతా #${registeredPatient.id} విజయవంతంగా సృష్టించబడింది.` : `Account #${registeredPatient.id} has been registered.`}
              </p>
            </div>
          </div>

          {/* Patient Details Summary */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid #bbf7d0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            fontSize: '0.875rem'
          }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                {t('receptionPortal.fullNameLabel')}
              </span>
              <strong style={{ color: '#0f172a', fontSize: '1rem' }}>{registeredPatient.name}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                {t('receptionPortal.emailLabel')}
              </span>
              <span style={{ color: '#0f172a' }}>{registeredPatient.email}</span>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                {t('receptionPortal.phoneLabel')}
              </span>
              <span style={{ color: '#0f172a' }}>{registeredPatient.phone}</span>
            </div>

            {/* Temporary Auto-Generated Password Card */}
            {registeredPatient.temporary_password && (
              <div style={{
                gridColumn: '1 / -1',
                marginTop: '0.35rem',
                padding: '1rem 1.25rem',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#92400e', fontSize: '0.775rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  <FaKey size={12} />
                  <span>{t('receptionPortal.tempPasswordLabel')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                  <code style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#9a3412',
                    background: '#fffbeb',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #fcd34d',
                    letterSpacing: '0.05em'
                  }}>
                    {registeredPatient.temporary_password}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #d97706',
                      background: '#ffffff',
                      color: '#92400e',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <FaCopy size={12} />
                    {copied ? (isTelugu ? 'కాపీ అయ్యింది' : 'Copied!') : (isTelugu ? 'కాపీ చేయండి' : 'Copy Password')}
                  </button>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#78350f', marginTop: '0.45rem' }}>
                  {t('receptionPortal.savePasswordNotice')}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={handleBookAppointment}
              style={{
                padding: '0.75rem 1.35rem',
                borderRadius: '8px',
                border: 'none',
                background: '#0f766e',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <FaCalendarPlus size={14} /> {t('receptionPortal.btnBookAfterRegister')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {t('receptionPortal.btnRegisterAnother')}
            </button>
          </div>
        </div>
      )}

      {/* 5. Clean Beginner-Friendly Registration Form */}
      {!registeredPatient && (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '2rem'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
            {/* Required notice */}
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {t('receptionPortal.requiredFieldsNotice')}
            </div>

            {/* Field: Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                {t('receptionPortal.fullNameLabel')} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <FaUser style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder={t('receptionPortal.fullNamePlaceholder')}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.15s ease'
                  }}
                />
              </div>
            </div>

            {/* Field: Email & Phone Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  {t('receptionPortal.emailLabel')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <FaEnvelope style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder={t('receptionPortal.emailPlaceholder')}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  {t('receptionPortal.phoneLabel')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <FaPhoneAlt style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    placeholder={t('receptionPortal.phonePlaceholder')}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Field: Gender & Date of Birth (Optional) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  {t('receptionPortal.genderLabel')}
                </label>
                <div style={{ position: 'relative' }}>
                  <FaVenusMars style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  >
                    <option value="Male">{t('receptionPortal.genderMale')}</option>
                    <option value="Female">{t('receptionPortal.genderFemale')}</option>
                    <option value="Other">{t('receptionPortal.genderOther')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  {t('receptionPortal.dobLabel')}
                </label>
                <div style={{ position: 'relative' }}>
                  <FaBirthdayCake style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="date"
                    name="dob"
                    value={form.dob}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Helpful Note about Password Security */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              border: '1px dashed #cbd5e1',
              fontSize: '0.8rem',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaKey style={{ color: '#0f766e', flexShrink: 0 }} />
              <span>{t('receptionPortal.passwordNote')}</span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#0f766e',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <FaUserPlus size={14} />
                {loading ? t('receptionPortal.registeringPatient') : t('receptionPortal.btnRegisterSubmit')}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                {isTelugu ? 'ఫారం రీసెట్' : 'Clear Form'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default RegisterPatient;
