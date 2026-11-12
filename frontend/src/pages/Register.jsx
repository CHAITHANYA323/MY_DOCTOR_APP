import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaHospitalSymbol,
  FaUser,
  FaUserMd,
  FaClipboardList,
  FaEnvelope,
  FaPhoneAlt,
  FaLock,
  FaIdCard,
  FaGraduationCap,
  FaHospital,
  FaCheckCircle,
  FaInfoCircle,
  FaUserTie
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { hospitalService } from '../services/hospitalService';
import { doctorService } from '../services/doctorService';
import { approvalService } from '../services/approvalService';
import { getApiErrorMessage } from '../services/api';
import { Button } from '../components/common/Button';

export const Register = () => {
  const { register } = useAuth();
  const { t, isTelugu } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole = (searchParams.get('role') || 'PATIENT').toUpperCase();
  const [selectedRole, setSelectedRole] = useState(
    ['PATIENT', 'DOCTOR', 'ADMIN', 'RECEPTIONIST', 'HOSPITAL_SUPER_ADMIN'].includes(initialRole)
      ? initialRole
      : 'PATIENT'
  );

  // Common Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Doctor Specific Fields
  const [hospitalId, setHospitalId] = useState('');
  const [specializationId, setSpecializationId] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('5');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [councilName, setCouncilName] = useState('National Medical Commission');
  const [gender, setGender] = useState('Male');

  // Receptionist Specific Fields
  const [department, setDepartment] = useState('Front Desk / Patient Intake');

  // Super Admin / Hospital Specific Fields
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalCity, setHospitalCity] = useState('');
  const [hospitalState, setHospitalState] = useState('Telangana');
  const [emergencyNumber, setEmergencyNumber] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // Dropdown Data
  const [hospitals, setHospitals] = useState([]);
  const [specializations, setSpecializations] = useState([]);

  // Status & Messaging
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load Hospitals & Specializations for dropdowns
  useEffect(() => {
    let isMounted = true;
    const loadDropdownData = async () => {
      try {
        const [hospRes, specRes] = await Promise.all([
          hospitalService.getHospitals({ limit: 100 }).catch(() => ({ hospitals: [] })),
          doctorService.getSpecializations().catch(() => ({ specializations: [] }))
        ]);
        if (isMounted) {
          const hospList = hospRes.hospitals || hospRes.data || [];
          setHospitals(hospList);
          if (hospList.length > 0 && !hospitalId) {
            setHospitalId(String(hospList[0].id));
          }

          const specList = specRes.specializations || specRes.data || [];
          setSpecializations(specList);
          if (specList.length > 0 && !specializationId) {
            setSpecializationId(String(specList[0].id));
          }
        }
      } catch (err) {
        console.warn('Could not load registration dropdowns:', err);
      }
    };
    loadDropdownData();
    return () => { isMounted = false; };
  }, []);

  const handleRoleTabChange = (role) => {
    setSelectedRole(role);
    setError('');
    setSuccess('');
    setRequestSubmitted(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError(t('auth.fillRequiredFields'));
      return;
    }

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError(isTelugu ? 'దయచేసి సరైన ఈమెయిల్ చిరునామాను నమోదు చేయండి.' : 'Please enter a valid email address.');
      return;
    }

    if (trimmedPhone) {
      const phoneDigits = trimmedPhone.replace(/\D/g, '');
      const validPhoneFormat = /^\+?[0-9\s\-()]+$/.test(trimmedPhone);
      if (phoneDigits.length < 7 || phoneDigits.length > 15 || !validPhoneFormat) {
        setError(isTelugu ? 'దయచేసి సరైన ఫోన్ నంబర్‌ను నమోదు చేయండి.' : 'Please enter a valid phone number.');
        return;
      }
    }

    if (password !== confirmPassword) {
      setError(isTelugu ? 'పాస్‌వర్డ్‌లు సరిపోలడం లేదు.' : 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError(isTelugu ? 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి.' : 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // 1. DIRECT PATIENT REGISTRATION
      if (selectedRole === 'PATIENT') {
        const res = await register({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          password,
          confirm_password: confirmPassword,
          role: 'USER'
        });

        if (res && (res.status === 201 || res.success)) {
          const successMsg = res.message || (isTelugu ? 'రోగి ఖాతా విజయవంతంగా సృష్టించబడింది!' : 'Patient account created successfully!');
          setSuccess(successMsg);
          setName('');
          setEmail('');
          setPhone('');
          setPassword('');
          setConfirmPassword('');
          setTimeout(() => {
            navigate('/login', { state: { message: successMsg, suggestedRole: 'PATIENT' } });
          }, 1500);
        } else {
          setError(res?.message || (isTelugu ? 'ఖాతా తెరవడం సాధ్యం కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.' : 'Unable to create account. Please try again.'));
        }
        return;
      }

      // 2. DOCTOR REGISTRATION REQUEST
      if (selectedRole === 'DOCTOR') {
        if (!registrationNumber.trim()) {
          setError(isTelugu ? 'మెడికల్ కౌన్సిల్ రిజిస్ట్రేషన్ సంఖ్య తప్పనిసరి.' : 'Medical Council Registration Number is required.');
          return;
        }

        const payload = {
          role: 'DOCTOR',
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          password,
          confirm_password: confirmPassword,
          hospital_id: parseInt(hospitalId, 10),
          specialization_id: specializationId ? parseInt(specializationId, 10) : null,
          qualification: qualification.trim(),
          experience_years: parseInt(experience, 10) || 0,
          medical_reg_no: registrationNumber.trim(),
          council_name: councilName.trim(),
          gender
        };

        const res = await approvalService.submitRegistrationRequest(payload);
        if (res && res.success) {
          setRequestSubmitted(true);
          setSubmittedData({
            role: isTelugu ? 'డాక్టర్' : 'Doctor',
            name: trimmedName,
            email: trimmedEmail,
            hospital: hospitals.find(h => String(h.id) === String(hospitalId))?.name || (isTelugu ? 'ఎంచుకున్న ఆసుపత్రి' : 'Selected Hospital'),
            regNo: registrationNumber.trim()
          });
        } else {
          setError(res?.message || (isTelugu ? 'డాక్టర్ నమోదు అభ్యర్థన విఫలమైంది.' : 'Failed to submit doctor registration request.'));
        }
        return;
      }

      // 3. ADMIN REGISTRATION REQUEST
      if (selectedRole === 'ADMIN') {
        const payload = {
          role: 'ADMIN',
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          password,
          confirm_password: confirmPassword,
          hospital_id: parseInt(hospitalId, 10),
          department: department.trim()
        };

        const res = await approvalService.submitRegistrationRequest(payload);
        if (res && res.success) {
          setRequestSubmitted(true);
          setSubmittedData({
            role: isTelugu ? 'హాస్పిటల్ అడ్మిన్' : 'Hospital Admin',
            name: trimmedName,
            email: trimmedEmail,
            hospital: hospitals.find(h => String(h.id) === String(hospitalId))?.name || (isTelugu ? 'ఎంచుకున్న ఆసుపత్రి' : 'Selected Hospital')
          });
        } else {
          setError(res?.message || (isTelugu ? 'హాస్పిటల్ అడ్మిన్ నమోదు అభ్యర్థన విఫలమైంది.' : 'Failed to submit hospital admin registration request.'));
        }
        return;
      }

      // 4. RECEPTIONIST REGISTRATION REQUEST
      if (selectedRole === 'RECEPTIONIST') {
        const payload = {
          role: 'RECEPTIONIST',
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          password,
          confirm_password: confirmPassword,
          hospital_id: parseInt(hospitalId, 10),
          department: department.trim()
        };

        const res = await approvalService.submitRegistrationRequest(payload);
        if (res && res.success) {
          setRequestSubmitted(true);
          setSubmittedData({
            role: isTelugu ? 'రిసెప్షనిస్ట్' : 'Receptionist',
            name: trimmedName,
            email: trimmedEmail,
            hospital: hospitals.find(h => String(h.id) === String(hospitalId))?.name || (isTelugu ? 'ఎంచుకున్న ఆసుపత్రి' : 'Selected Hospital')
          });
        } else {
          setError(res?.message || (isTelugu ? 'నమోదు అభ్యర్థన సమర్పణ విఫలమైంది.' : 'Failed to submit registration request.'));
        }
        return;
      }

      // 5. HOSPITAL SUPER ADMIN REGISTRATION REQUEST
      if (selectedRole === 'HOSPITAL_SUPER_ADMIN') {
        if (!hospitalName.trim() || !hospitalCity.trim() || !emergencyNumber.trim()) {
          setError(isTelugu ? 'ఆసుపత్రి పేరు, నగరం మరియు 24/7 అత్యవసర నంబర్ తప్పనిసరి.' : 'Hospital Name, City, and 24/7 Emergency Hotline are required.');
          return;
        }

        const payload = {
          role: 'HOSPITAL_SUPER_ADMIN',
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          password,
          confirm_password: confirmPassword,
          hospital_name: hospitalName.trim(),
          hospital_city: hospitalCity.trim(),
          hospital_state: hospitalState.trim(),
          emergency_number: emergencyNumber.trim(),
          hospital_address: hospitalAddress.trim(),
          license_number: licenseNumber.trim()
        };

        const res = await approvalService.submitRegistrationRequest(payload);
        if (res && res.success) {
          setRequestSubmitted(true);
          setSubmittedData({
            role: isTelugu ? 'హాస్పిటల్ సూపర్ అడ్మిన్' : 'Hospital Super Admin',
            name: trimmedName,
            email: trimmedEmail,
            hospital: hospitalName.trim(),
            city: hospitalCity.trim()
          });
        } else {
          setError(res?.message || (isTelugu ? 'ఆసుపత్రి ఆన్‌బోర్డింగ్ అభ్యర్థన సమర్పణ విఫలమైంది.' : 'Failed to submit hospital onboarding request.'));
        }
        return;
      }
    } catch (err) {
      setError(getApiErrorMessage(err, isTelugu ? 'నమోదు విఫలమైంది. దయచేసి వివరాలను సరిచూసి మళ్ళీ ప్రయత్నించండి.' : 'Registration failed. Please check details and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const getPortalMeta = () => {
    switch (selectedRole) {
      case 'DOCTOR':
        return {
          title: t('register.roles.doctor.title'),
          subtitle: t('register.roles.doctor.subtitle'),
          badgeBg: '#f0fdfa',
          badgeColor: '#0f766e',
          buttonLabel: t('register.roles.doctor.buttonLabel'),
          icon: <FaUserMd size={26} />,
          gradient: 'linear-gradient(135deg, #0d9488, #0f766e)'
        };
      case 'ADMIN':
        return {
          title: t('register.roles.admin.title'),
          subtitle: t('register.roles.admin.subtitle'),
          badgeBg: '#fef3c7',
          badgeColor: '#b45309',
          buttonLabel: t('register.roles.admin.buttonLabel'),
          icon: <FaUserTie size={26} />,
          gradient: 'linear-gradient(135deg, #d97706, #b45309)'
        };
      case 'RECEPTIONIST':
        return {
          title: t('register.roles.receptionist.title'),
          subtitle: t('register.roles.receptionist.subtitle'),
          badgeBg: '#f5f3ff',
          badgeColor: '#6d28d9',
          buttonLabel: t('register.roles.receptionist.buttonLabel'),
          icon: <FaClipboardList size={26} />,
          gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)'
        };
      case 'HOSPITAL_SUPER_ADMIN':
        return {
          title: t('register.roles.superAdmin.title'),
          subtitle: t('register.roles.superAdmin.subtitle'),
          badgeBg: '#fff7ed',
          badgeColor: '#c2410c',
          buttonLabel: t('register.roles.superAdmin.buttonLabel'),
          icon: <FaHospitalSymbol size={26} />,
          gradient: 'linear-gradient(135deg, #ea580c, #c2410c)'
        };
      case 'PATIENT':
      default:
        return {
          title: t('register.roles.patient.title'),
          subtitle: t('register.roles.patient.subtitle'),
          badgeBg: '#f0f9ff',
          badgeColor: '#0369a1',
          buttonLabel: t('register.roles.patient.buttonLabel'),
          icon: <FaUser size={26} />,
          gradient: 'linear-gradient(135deg, #0284c7, #0369a1)'
        };
    }
  };

  const meta = getPortalMeta();

  const registrationTabs = useMemo(() => [
    { id: 'PATIENT', label: t('auth.roles.patient.tabLabel'), icon: <FaUser size={12} /> },
    { id: 'DOCTOR', label: t('auth.roles.doctor.tabLabel'), icon: <FaUserMd size={12} /> },
    { id: 'ADMIN', label: t('auth.roles.admin.tabLabel'), icon: <FaUserTie size={12} /> },
    { id: 'RECEPTIONIST', label: t('auth.roles.receptionist.tabLabel'), icon: <FaClipboardList size={12} /> },
    { id: 'HOSPITAL_SUPER_ADMIN', label: t('auth.roles.superAdmin.tabLabel'), icon: <FaHospitalSymbol size={12} /> }
  ], [t]);

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem 1rem'
    }}>
      <div className="card" style={{
        maxWidth: selectedRole === 'PATIENT' ? '540px' : '660px',
        width: '100%',
        padding: 'clamp(1.75rem, 4.5vw, 2.75rem) clamp(1rem, 3.5vw, 2rem)',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--slate-200)',
        transition: 'all 0.25s ease'
      }}>
        {/* Role Selection Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))',
          gap: '0.35rem',
          backgroundColor: '#f1f5f9',
          padding: '0.35rem',
          borderRadius: '12px',
          marginBottom: '1.75rem'
        }}>
          {registrationTabs.map((tab) => {
            const active = selectedRole === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleRoleTabChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.55rem 0.35rem',
                  borderRadius: '9px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: active ? 700 : 600,
                  backgroundColor: active ? '#ffffff' : 'transparent',
                  color: active ? '#0f172a' : '#64748b',
                  boxShadow: active ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '14px',
            background: meta.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            margin: '0 auto 0.75rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            {meta.icon}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {meta.title}
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--slate-500)', marginTop: '0.25rem', lineHeight: 1.4 }}>
            {meta.subtitle}
          </p>
        </div>

        {/* Confirmation Screen on Inbound Request Submission */}
        {requestSubmitted && submittedData ? (
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '14px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '1.8rem'
            }}>
              <FaCheckCircle />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              {t('register.successTitle')}
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              {t('register.successSubtitle')}
            </p>

            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
              textAlign: 'left',
              fontSize: '0.85rem',
              color: '#334155',
              marginBottom: '1.5rem'
            }}>
              <div style={{ marginBottom: '0.4rem' }}><strong>{t('register.submittedRole')}:</strong> {submittedData.role}</div>
              <div style={{ marginBottom: '0.4rem' }}><strong>{t('register.applicantName')}:</strong> {submittedData.name}</div>
              <div style={{ marginBottom: '0.4rem' }}><strong>{t('register.officialEmail')}:</strong> {submittedData.email}</div>
              {submittedData.hospital && (
                <div style={{ marginBottom: '0.4rem' }}><strong>{t('register.assignedHospital')}:</strong> {submittedData.hospital}</div>
              )}
              {submittedData.regNo && (
                <div style={{ marginBottom: '0.4rem' }}><strong>{t('register.regNumber')}:</strong> {submittedData.regNo}</div>
              )}
              <div><strong>{t('register.statusPending')}:</strong> <span style={{ color: '#d97706', fontWeight: 700 }}>PENDING APPROVAL</span></div>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              {t('register.reviewNotice')}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onClick={() => navigate('/login', { state: { suggestedRole: selectedRole } })}
              >
                {t('register.returnToLogin')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setRequestSubmitted(false); }}
              >
                {t('register.submitAnother')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {success && (
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--success-light)',
                color: '#065f46',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
                fontWeight: 700,
                marginBottom: '1.25rem',
                border: '1px solid #10b981'
              }}>
                {success}
              </div>
            )}

            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--emergency-light)',
                color: 'var(--emergency)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1.25rem'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Applicant Name */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  {t('register.fullName')} *
                </label>
                <div style={{ position: 'relative' }}>
                  <FaUser style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                  <input
                    type="text"
                    placeholder={t('register.fullNamePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              {/* Email & Phone Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>{t('register.email')} *</label>
                  <div style={{ position: 'relative' }}>
                    <FaEnvelope style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                    <input
                      type="email"
                      placeholder={t('register.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>{t('register.phone')}</label>
                  <div style={{ position: 'relative' }}>
                    <FaPhoneAlt style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                    <input
                      type="tel"
                      placeholder={t('register.phonePlaceholder')}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* DOCTOR SPECIFIC FIELDS */}
              {selectedRole === 'DOCTOR' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>{t('register.selectHospital')} *</label>
                      <select
                        value={hospitalId}
                        onChange={(e) => setHospitalId(e.target.value)}
                        className="form-input"
                        required
                      >
                        {hospitals.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name} ({h.city})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>{t('register.selectSpecialization')}</label>
                      <select
                        value={specializationId}
                        onChange={(e) => setSpecializationId(e.target.value)}
                        className="form-input"
                      >
                        {specializations.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>{t('register.qualification')} *</label>
                      <div style={{ position: 'relative' }}>
                        <FaGraduationCap style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                        <input
                          type="text"
                          placeholder={t('register.qualificationPlaceholder')}
                          value={qualification}
                          onChange={(e) => setQualification(e.target.value)}
                          required
                          className="form-input"
                          style={{ paddingLeft: '2.5rem' }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>{t('register.experienceYears')}</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>{t('register.regNumber')} *</label>
                      <div style={{ position: 'relative' }}>
                        <FaIdCard style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                        <input
                          type="text"
                          placeholder={t('register.regNumberPlaceholder')}
                          value={registrationNumber}
                          onChange={(e) => setRegistrationNumber(e.target.value)}
                          required
                          className="form-input"
                          style={{ paddingLeft: '2.5rem' }}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>{t('register.medicalCouncil')}</label>
                      <input
                        type="text"
                        placeholder="e.g. State Medical Council / NMC"
                        value={councilName}
                        onChange={(e) => setCouncilName(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ADMIN & RECEPTIONIST SPECIFIC FIELDS */}
              {(selectedRole === 'ADMIN' || selectedRole === 'RECEPTIONIST') && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>{t('register.selectHospital')} *</label>
                    <select
                      value={hospitalId}
                      onChange={(e) => setHospitalId(e.target.value)}
                      className="form-input"
                      required
                    >
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>{t('register.department')}</label>
                    <input
                      type="text"
                      placeholder={t('register.departmentPlaceholder')}
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              {/* HOSPITAL SUPER ADMIN SPECIFIC FIELDS */}
              {selectedRole === 'HOSPITAL_SUPER_ADMIN' && (
                <>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>{t('register.hospitalName')} *</label>
                    <div style={{ position: 'relative' }}>
                      <FaHospital style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                      <input
                        type="text"
                        placeholder={t('register.hospitalNamePlaceholder')}
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        required
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>{t('register.city')} *</label>
                      <input
                        type="text"
                        placeholder={t('register.cityPlaceholder')}
                        value={hospitalCity}
                        onChange={(e) => setHospitalCity(e.target.value)}
                        required
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>{t('register.state')}</label>
                      <input
                        type="text"
                        placeholder="Telangana"
                        value={hospitalState}
                        onChange={(e) => setHospitalState(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>{t('register.emergencyNumber')} *</label>
                      <input
                        type="text"
                        placeholder={t('register.emergencyNumberPlaceholder')}
                        value={emergencyNumber}
                        onChange={(e) => setEmergencyNumber(e.target.value)}
                        required
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>{t('register.hospitalAddress')}</label>
                    <input
                      type="text"
                      placeholder={t('register.hospitalAddressPlaceholder')}
                      value={hospitalAddress}
                      onChange={(e) => setHospitalAddress(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </>
              )}

              {/* Password & Confirm Password */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>{t('register.password')} *</label>
                  <div style={{ position: 'relative' }}>
                    <FaLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                    <input
                      type="password"
                      placeholder={t('register.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>{t('register.confirmPassword')} *</label>
                  <div style={{ position: 'relative' }}>
                    <FaLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                    <input
                      type="password"
                      placeholder={t('register.confirmPasswordPlaceholder')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>
              </div>

              {selectedRole !== 'PATIENT' && (
                <div style={{
                  backgroundColor: meta.badgeBg,
                  color: meta.badgeColor,
                  border: `1px solid ${meta.badgeColor}30`,
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.25rem'
                }}>
                  <FaInfoCircle size={15} style={{ flexShrink: 0 }} />
                  <span>
                    {isTelugu
                      ? 'ప్రొఫెషనల్ ఖాతాలకు ఆసుపత్రి లేదా ప్లాట్‌ఫారమ్ ధృవీకరణ అవసరం. సంబంధిత అధికారి మీ దరఖాస్తును పరిశీలించి ఆమోదించే వరకు యాక్సెస్ నియంత్రించబడుతుంది.'
                      : 'Professional accounts require institutional verification. Access will remain restricted until an authorized administrator verifies your application.'}
                  </span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                style={{ marginTop: '0.5rem', background: meta.gradient, border: 'none' }}
              >
                {loading ? t('common.loading') : meta.buttonLabel}
              </Button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '1.75rem' }}>
              {t('register.alreadyHaveAccount')}{' '}
              <Link to="/login" state={{ suggestedRole: selectedRole }} style={{ color: 'var(--primary)', fontWeight: 700 }}>
                {t('register.loginHere')}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
