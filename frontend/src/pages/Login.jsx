import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FaHospitalSymbol,
  FaHospital,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaUserMd,
  FaClipboardList,
  FaShieldAlt,
  FaExclamationTriangle,
  FaInfoCircle,
  FaArrowRight,
  FaUserPlus,
  FaClock,
  FaBan
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getApiErrorMessage } from '../services/api';
import {
  ROLES,
  getRoleDashboardPath,
  normalizeRole
} from '../utils/roleUtils';
import { Button } from '../components/common/Button';

export const Login = () => {
  const { login } = useAuth();
  const { t, isTelugu } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Dynamic configuration for each role-based portal (reactive to language)
  // Visible Login roles: Patient, Doctor, Receptionist, Super Admin, Platform Owner
  const portalConfigs = useMemo(() => ({
    [ROLES.PATIENT]: {
      id: ROLES.PATIENT,
      tabLabel: t('auth.roles.patient.tabLabel'),
      heading: t('auth.roles.patient.heading'),
      subtitle: t('auth.roles.patient.subtitle'),
      description: t('auth.roles.patient.description'),
      buttonLabel: t('auth.roles.patient.buttonLabel'),
      themeColor: '#0284c7', // Sky Blue
      accentGradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
      badgeBg: '#f0f9ff',
      badgeText: '#0369a1',
      badgeBorder: '#bae6fd',
      icon: <FaUser />,
      emailLabel: t('auth.roles.patient.emailLabel'),
      emailPlaceholder: t('auth.roles.patient.emailPlaceholder'),
      hasPublicRegistration: true,
      registrationLink: '/register',
      registrationLabel: t('auth.roles.patient.registrationLabel'),
      navPrompt: t('auth.roles.patient.navPrompt'),
      navNotice: t('auth.roles.patient.navNotice'),
    },
    [ROLES.DOCTOR]: {
      id: ROLES.DOCTOR,
      tabLabel: t('auth.roles.doctor.tabLabel'),
      heading: t('auth.roles.doctor.heading'),
      subtitle: t('auth.roles.doctor.subtitle'),
      description: t('auth.roles.doctor.description'),
      buttonLabel: t('auth.roles.doctor.buttonLabel'),
      themeColor: '#0d9488', // Medical Teal
      accentGradient: 'linear-gradient(135deg, #0d9488, #0f766e)',
      badgeBg: '#f0fdfa',
      badgeText: '#0f766e',
      badgeBorder: '#99f6e4',
      icon: <FaUserMd />,
      emailLabel: t('auth.roles.doctor.emailLabel'),
      emailPlaceholder: t('auth.roles.doctor.emailPlaceholder'),
      hasPublicRegistration: true,
      registrationLink: '/register?role=DOCTOR',
      registrationLabel: t('auth.roles.doctor.registrationLabel'),
      navPrompt: t('auth.roles.doctor.navPrompt'),
      navNotice: t('auth.roles.doctor.navNotice'),
    },
    [ROLES.HOSPITAL_ADMIN]: {
      id: ROLES.HOSPITAL_ADMIN,
      tabLabel: t('auth.roles.admin.tabLabel'),
      heading: t('auth.roles.admin.heading'),
      subtitle: t('auth.roles.admin.subtitle'),
      description: t('auth.roles.admin.description'),
      buttonLabel: t('auth.roles.admin.buttonLabel'),
      themeColor: '#1d4ed8', // Royal / Navy Blue
      accentGradient: 'linear-gradient(135deg, #1d4ed8, #1e3a8a)',
      badgeBg: '#eff6ff',
      badgeText: '#1e3a8a',
      badgeBorder: '#bfdbfe',
      icon: <FaHospital />,
      emailLabel: t('auth.roles.admin.emailLabel'),
      emailPlaceholder: t('auth.roles.admin.emailPlaceholder'),
      hasPublicRegistration: true,
      registrationLink: '/register?role=ADMIN',
      registrationLabel: t('auth.roles.admin.registrationLabel'),
      navPrompt: t('auth.roles.admin.navPrompt'),
      navNotice: t('auth.roles.admin.navNotice'),
    },
    [ROLES.ADMIN]: {
      id: ROLES.ADMIN,
      tabLabel: t('auth.roles.admin.tabLabel'),
      heading: t('auth.roles.admin.heading'),
      subtitle: t('auth.roles.admin.subtitle'),
      description: t('auth.roles.admin.description'),
      buttonLabel: t('auth.roles.admin.buttonLabel'),
      themeColor: '#1d4ed8',
      accentGradient: 'linear-gradient(135deg, #1d4ed8, #1e3a8a)',
      badgeBg: '#eff6ff',
      badgeText: '#1e3a8a',
      badgeBorder: '#bfdbfe',
      icon: <FaHospital />,
      emailLabel: t('auth.roles.admin.emailLabel'),
      emailPlaceholder: t('auth.roles.admin.emailPlaceholder'),
      hasPublicRegistration: true,
      registrationLink: '/register?role=ADMIN',
      registrationLabel: t('auth.roles.admin.registrationLabel'),
      navPrompt: t('auth.roles.admin.navPrompt'),
      navNotice: t('auth.roles.admin.navNotice'),
    },
    [ROLES.RECEPTIONIST]: {
      id: ROLES.RECEPTIONIST,
      tabLabel: t('auth.roles.receptionist.tabLabel'),
      heading: t('auth.roles.receptionist.heading'),
      subtitle: t('auth.roles.receptionist.subtitle'),
      description: t('auth.roles.receptionist.description'),
      buttonLabel: t('auth.roles.receptionist.buttonLabel'),
      themeColor: '#7c3aed', // Front-desk Violet
      accentGradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
      badgeBg: '#f5f3ff',
      badgeText: '#6d28d9',
      badgeBorder: '#ddd6fe',
      icon: <FaClipboardList />,
      emailLabel: t('auth.roles.receptionist.emailLabel'),
      emailPlaceholder: t('auth.roles.receptionist.emailPlaceholder'),
      hasPublicRegistration: true,
      registrationLink: '/register?role=RECEPTIONIST',
      registrationLabel: t('auth.roles.receptionist.registrationLabel'),
      navPrompt: t('auth.roles.receptionist.navPrompt'),
      navNotice: t('auth.roles.receptionist.navNotice'),
    },
    [ROLES.HOSPITAL_SUPER_ADMIN]: {
      id: ROLES.HOSPITAL_SUPER_ADMIN,
      tabLabel: t('auth.roles.superAdmin.tabLabel'),
      heading: t('auth.roles.superAdmin.heading'),
      subtitle: t('auth.roles.superAdmin.subtitle'),
      description: t('auth.roles.superAdmin.description'),
      buttonLabel: t('auth.roles.superAdmin.buttonLabel'),
      themeColor: '#ea580c', // Operations Amber/Orange
      accentGradient: 'linear-gradient(135deg, #ea580c, #c2410c)',
      badgeBg: '#fff7ed',
      badgeText: '#c2410c',
      badgeBorder: '#fed7aa',
      icon: <FaHospitalSymbol />,
      emailLabel: t('auth.roles.superAdmin.emailLabel'),
      emailPlaceholder: t('auth.roles.superAdmin.emailPlaceholder'),
      hasPublicRegistration: true,
      registrationLink: '/register?role=HOSPITAL_SUPER_ADMIN',
      registrationLabel: t('auth.roles.superAdmin.registrationLabel'),
      navPrompt: t('auth.roles.superAdmin.navPrompt'),
      navNotice: t('auth.roles.superAdmin.navNotice'),
    },
    [ROLES.PLATFORM_OWNER]: {
      id: ROLES.PLATFORM_OWNER,
      tabLabel: t('auth.roles.owner.tabLabel'),
      heading: t('auth.roles.owner.heading'),
      subtitle: t('auth.roles.owner.subtitle'),
      description: t('auth.roles.owner.description'),
      buttonLabel: t('auth.roles.owner.buttonLabel'),
      themeColor: '#b91c1c', // Security Red
      accentGradient: 'linear-gradient(135deg, #b91c1c, #991b1b)',
      badgeBg: '#fef2f2',
      badgeText: '#991b1b',
      badgeBorder: '#fecaca',
      icon: <FaShieldAlt />,
      emailLabel: t('auth.roles.owner.emailLabel'),
      emailPlaceholder: t('auth.roles.owner.emailPlaceholder'),
      hasPublicRegistration: false,
      navPrompt: t('auth.roles.owner.navPrompt'),
      navNotice: t('auth.roles.owner.navNotice'),
    }
  }), [t]);

  // If redirected with a suggested role or from staff onboarding
  const initialRole = location.state?.suggestedRole
    ? normalizeRole(location.state.suggestedRole)
    : ROLES.PATIENT;

  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [approvalStatusError, setApprovalStatusError] = useState(null);
  const [mismatchRole, setMismatchRole] = useState(null);
  const [loading, setLoading] = useState(false);

  // Redirection metadata
  const from = location.state?.from?.pathname || (typeof location.state?.from === 'string' ? location.state.from : null);
  const redirectMessage = location.state?.message || '';

  // Synchronize state if navigation passes a new suggestedRole
  useEffect(() => {
    if (location.state?.suggestedRole) {
      const normalized = normalizeRole(location.state.suggestedRole);
      if (normalized && normalized !== selectedRole) {
        setSelectedRole(normalized);
        setError('');
        setApprovalStatusError(null);
        setMismatchRole(null);
      }
    }
  }, [location.state?.suggestedRole, selectedRole]);

  // Active portal configuration
  const currentPortal = portalConfigs[selectedRole] || portalConfigs[ROLES.PATIENT];

  // Role selector configuration for the portal tabs
  // Visible Login roles: Patient, Doctor, Hospital Admin, Receptionist, Super Admin, Platform Owner
  const roleTabs = useMemo(() => [
    { id: ROLES.PATIENT, label: portalConfigs[ROLES.PATIENT]?.tabLabel || 'Patient', icon: <FaUser aria-hidden="true" /> },
    { id: ROLES.DOCTOR, label: portalConfigs[ROLES.DOCTOR]?.tabLabel || 'Doctor', icon: <FaUserMd aria-hidden="true" /> },
    { id: ROLES.HOSPITAL_ADMIN, label: portalConfigs[ROLES.HOSPITAL_ADMIN]?.tabLabel || 'Hospital Admin', icon: <FaHospital aria-hidden="true" /> },
    { id: ROLES.RECEPTIONIST, label: portalConfigs[ROLES.RECEPTIONIST]?.tabLabel || 'Receptionist', icon: <FaClipboardList aria-hidden="true" /> },
    { id: ROLES.HOSPITAL_SUPER_ADMIN, label: portalConfigs[ROLES.HOSPITAL_SUPER_ADMIN]?.tabLabel || 'SuperAdmin', icon: <FaHospitalSymbol aria-hidden="true" /> },
    { id: ROLES.PLATFORM_OWNER, label: portalConfigs[ROLES.PLATFORM_OWNER]?.tabLabel || 'Platform Owner', icon: <FaShieldAlt aria-hidden="true" /> },
  ], [portalConfigs]);

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId);
    setError('');
    setApprovalStatusError(null);
    setMismatchRole(null);
  };

  const handleSwitchToCorrectRole = (targetRole) => {
    setSelectedRole(targetRole);
    setError('');
    setApprovalStatusError(null);
    setMismatchRole(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setApprovalStatusError(null);
    setMismatchRole(null);

    if (!email.trim() || !password) {
      setError(t('auth.fillRequiredFields'));
      return;
    }

    setLoading(true);
    try {
      // Pass selectedRole as a context hint. Backend remains the sole authority.
      const res = await login({ email: email.trim().toLowerCase(), password }, selectedRole);

      if (res.success && res.user) {
        // Authenticated successfully with verified matching role
        const verifiedRole = res.user.role;
        const defaultDestination = getRoleDashboardPath(verifiedRole);

        // If user was attempting to reach a specific URL, navigate there if appropriate
        if (from && from !== '/' && from !== '/login') {
          navigate(from, { replace: true });
        } else {
          navigate(defaultDestination, { replace: true });
        }
      } else if (res.roleMismatch) {
        // Explicit role mismatch caught by AuthContext
        setError(res.message);
        setMismatchRole(res.authenticatedRole);
      } else {
        setError(res.message || (isTelugu ? 'చెల్లని ఈమెయిల్ లేదా పాస్‌వర్డ్. దయచేసి మళ్ళీ ప్రయత్నించండి.' : 'Invalid email or password. Please try again.'));
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.error_code === 'ACCOUNT_PENDING_APPROVAL') {
        setApprovalStatusError({
          code: 'ACCOUNT_PENDING_APPROVAL',
          title: t('auth.approvalPendingTitle'),
          message: errData.message || t('auth.approvalPendingDesc')
        });
      } else if (errData?.error_code === 'ACCOUNT_REJECTED') {
        setApprovalStatusError({
          code: 'ACCOUNT_REJECTED',
          title: t('auth.approvalRejectedTitle'),
          message: errData.message || (isTelugu ? 'మీ ఖాతా నమోదు అభ్యర్థన తిరస్కరించబడింది.' : 'Your account registration request has been rejected.'),
          rejectionReason: errData.rejection_reason
        });
      } else {
        setError(getApiErrorMessage(err, isTelugu ? 'ధృవీకరణ విఫలమైంది. దయచేసి మీ వివరాలను సరిచూసుకోండి.' : 'Authentication failed. Please verify your credentials.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (roleKey) => {
    setError('');
    setApprovalStatusError(null);
    setMismatchRole(null);

    switch (roleKey) {
      case 'PLATFORM_OWNER':
        setSelectedRole(ROLES.PLATFORM_OWNER);
        setEmail('owner@mediconnect.com');
        setPassword('Owner@123');
        break;
      case 'HOSPITAL_SUPER_ADMIN':
        setSelectedRole(ROLES.HOSPITAL_SUPER_ADMIN);
        setEmail('admin.hosp1@medicare.com');
        setPassword('Admin@123');
        break;
      case 'HOSPITAL_ADMIN':
      case 'ADMIN':
        setSelectedRole(ROLES.HOSPITAL_ADMIN);
        setEmail('legacy.admin@medicare.com');
        setPassword('Admin@123');
        break;
      case 'RECEPTIONIST':
        setSelectedRole(ROLES.RECEPTIONIST);
        setEmail('reception.hosp1@medicare.com');
        setPassword('Reception@123');
        break;
      case 'DOCTOR':
        setSelectedRole(ROLES.DOCTOR);
        setEmail('dr.one@medicare.com');
        setPassword('Doctor@123');
        break;
      case 'PATIENT':
        setSelectedRole(ROLES.PATIENT);
        setEmail('patient.alpha@test.com');
        setPassword('Patient@123');
        break;
      default:
        break;
    }
  };

  return (
    <div style={{
      minHeight: '84vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.75rem 1rem',
      background: 'radial-gradient(ellipse at top, #f0fdfa 0%, #f8fafc 65%, #f1f5f9 100%)'
    }}>
      <div className="card login-page-card" style={{
        maxWidth: '500px',
        width: '100%',
        padding: 'clamp(1.5rem, 3.5vw, 2.25rem) clamp(1.15rem, 3.5vw, 1.85rem)',
        boxShadow: '0 16px 36px -10px rgba(15, 23, 42, 0.1), 0 6px 16px -4px rgba(15, 23, 42, 0.06)',
        border: '1px solid var(--slate-200)',
        borderRadius: '18px',
        backgroundColor: 'var(--white)',
        transition: 'all 0.25s ease',
        boxSizing: 'border-box'
      }}>
        {/* Dynamic Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.35rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '13px',
            background: currentPortal.accentGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            margin: '0 auto 0.65rem',
            boxShadow: `0 4px 14px ${currentPortal.themeColor}38`,
            transition: 'all 0.25s ease'
          }}>
            <span style={{ fontSize: '1.4rem', display: 'flex' }}>
              {currentPortal.icon}
            </span>
          </div>
          <h1 style={{
            fontSize: 'clamp(1.4rem, 2.8vw, 1.7rem)',
            fontWeight: 800,
            color: 'var(--slate-900)',
            transition: 'all 0.2s ease',
            letterSpacing: '-0.025em',
            margin: '0 0 0.3rem',
            lineHeight: 1.2
          }}>
            {currentPortal.heading}
          </h1>
          <p style={{
            fontSize: 'clamp(0.85rem, 1.6vw, 0.92rem)',
            color: 'var(--slate-600)',
            lineHeight: 1.45,
            margin: 0,
            transition: 'all 0.2s ease'
          }}>
            {currentPortal.subtitle}
          </p>
        </div>

        {/* Account Type Selector Tabs */}
        <div style={{ marginBottom: '1.15rem' }}>
          <label style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            color: 'var(--slate-700)',
            display: 'block',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            {t('auth.selectPortal')}
          </label>
          <div className="login-role-tabs-grid">
            {roleTabs.map((tab) => {
              const isSelected = selectedRole === tab.id;
              const tabConfig = portalConfigs[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleRoleChange(tab.id)}
                  className={`login-role-tab-btn ${isSelected ? 'active' : ''}`}
                  style={{
                    border: isSelected ? `2px solid ${tabConfig?.themeColor || 'var(--primary)'}` : '2px solid transparent',
                    fontWeight: isSelected ? 800 : 600,
                    backgroundColor: isSelected ? (tabConfig?.badgeBg || '#ffffff') : '#ffffff',
                    color: isSelected ? (tabConfig?.themeColor || 'var(--primary-dark)') : 'var(--slate-600)',
                    boxShadow: isSelected ? `0 3px 10px ${tabConfig?.themeColor || 'rgba(0,0,0,0.1)'}25` : '0 1px 3px rgba(0,0,0,0.04)'
                  }}
                >
                  <span style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Role Context Description Badge */}
        <div style={{
          backgroundColor: currentPortal.badgeBg,
          borderLeft: `4px solid ${currentPortal.themeColor}`,
          borderTop: `1px solid ${currentPortal.badgeBorder}`,
          borderRight: `1px solid ${currentPortal.badgeBorder}`,
          borderBottom: `1px solid ${currentPortal.badgeBorder}`,
          padding: '0.75rem 1rem',
          borderRadius: '0 10px 10px 0',
          color: 'var(--slate-800)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          transition: 'all 0.25s ease'
        }}>
          <span style={{ color: currentPortal.themeColor, flexShrink: 0, fontSize: '1.15rem', display: 'flex' }}>
            {currentPortal.icon}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{
              color: currentPortal.badgeText,
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.15rem'
            }}>
              {currentPortal.tabLabel} {t('auth.portalSuffix')}
            </strong>
            <span style={{ fontSize: '0.85rem', lineHeight: 1.4, display: 'block', color: 'var(--slate-700)' }}>
              {currentPortal.description}
            </span>
          </div>
        </div>

        {/* Redirect Message Banner */}
        {redirectMessage && (
          <div style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary-dark)',
            borderRadius: '10px',
            fontSize: '0.92rem',
            fontWeight: 600,
            marginBottom: '1.35rem',
            border: '1px solid var(--primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}>
            <FaInfoCircle style={{ fontSize: '1.1rem', flexShrink: 0 }} />
            <span>{redirectMessage}</span>
          </div>
        )}

        {/* Pending Approval / Rejection Notice Banner */}
        {approvalStatusError && (
          <div
            className="login-approval-banner"
            style={{
              padding: '1.1rem 1.25rem',
              backgroundColor: approvalStatusError.code === 'ACCOUNT_PENDING_APPROVAL' ? '#fffbeb' : '#fef2f2',
              color: approvalStatusError.code === 'ACCOUNT_PENDING_APPROVAL' ? '#92400e' : '#991b1b',
              borderRadius: '10px',
              marginBottom: '1.35rem',
              border: `1.5px solid ${approvalStatusError.code === 'ACCOUNT_PENDING_APPROVAL' ? '#fde68a' : '#fecaca'}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              {approvalStatusError.code === 'ACCOUNT_PENDING_APPROVAL' ? (
                <FaClock style={{ marginTop: '0.2rem', flexShrink: 0, fontSize: '1.25rem', color: '#d97706' }} />
              ) : (
                <FaBan style={{ marginTop: '0.2rem', flexShrink: 0, fontSize: '1.25rem', color: '#dc2626' }} />
              )}
              <div>
                <strong style={{ display: 'block', fontSize: '0.96rem', marginBottom: '0.35rem' }}>
                  {approvalStatusError.title}
                </strong>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55 }}>
                  {approvalStatusError.message}
                </p>
                {approvalStatusError.rejectionReason && (
                  <div style={{
                    marginTop: '0.65rem',
                    padding: '0.55rem 0.75rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}>
                    {t('auth.rejectionReason')} {approvalStatusError.rejectionReason}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error / Role Mismatch Banner */}
        {error && (
          <div
            className="login-error-banner"
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--emergency-light)',
              color: 'var(--emergency)',
              borderRadius: '10px',
              fontSize: '0.92rem',
              fontWeight: 600,
              marginBottom: '1.35rem',
              border: '1.5px solid #fecaca'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <FaExclamationTriangle style={{ marginTop: '0.2rem', flexShrink: 0, fontSize: '1.15rem' }} />
              <div>
                <p style={{ margin: 0, lineHeight: 1.5 }}>{error}</p>
                {mismatchRole && (
                  <button
                    type="button"
                    className="role-switch-btn"
                    onClick={() => handleSwitchToCorrectRole(mismatchRole)}
                    style={{
                      marginTop: '0.65rem',
                      background: 'var(--emergency)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {t('auth.switchToRoleTab', { role: portalConfigs[mismatchRole]?.tabLabel || mismatchRole })}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Dynamic Email Field */}
          <div className="form-group" style={{ marginBottom: '1.35rem' }}>
            <label className="form-label" style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.55rem' }}>
              {currentPortal.emailLabel} *
            </label>
            <div style={{ position: 'relative' }}>
              <FaEnvelope style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--slate-400)',
                fontSize: '1.15rem'
              }} />
              <input
                type="email"
                placeholder={currentPortal.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input login-form-input"
                style={{
                  minHeight: '52px',
                  fontSize: '1.02rem',
                  padding: '0.85rem 1.15rem',
                  paddingLeft: '3rem',
                  borderRadius: '10px'
                }}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="form-group" style={{ marginBottom: '1.35rem' }}>
            <label className="form-label" style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.55rem' }}>
              {t('auth.password')} *
            </label>
            <div style={{ position: 'relative' }}>
              <FaLock style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--slate-400)',
                fontSize: '1.15rem'
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.enterPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input login-form-input"
                style={{
                  minHeight: '52px',
                  fontSize: '1.02rem',
                  padding: '0.85rem 1.15rem',
                  paddingLeft: '3rem',
                  paddingRight: '3rem',
                  borderRadius: '10px'
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--slate-400)',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.15rem'
                }}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Dynamic Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            style={{
              marginTop: '0.65rem',
              minHeight: '48px',
              fontSize: '1.02rem',
              fontWeight: 800,
              borderRadius: '10px',
              background: currentPortal.accentGradient,
              border: 'none',
              boxShadow: `0 4px 14px ${currentPortal.themeColor}38`,
              transition: 'all 0.2s ease',
              letterSpacing: '0.01em'
            }}
          >
            {loading ? t('common.loading') : currentPortal.buttonLabel}
          </Button>
        </form>

        {/* 1-Click Quick Demo Sign-In (6 Roles) */}
        <div style={{
          marginTop: '1.25rem',
          padding: '0.85rem 1rem',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>⚡</span> {t('auth.demoAccounts') || 'Quick Demo Sign-In'}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#0369a1', backgroundColor: '#e0f2fe', padding: '0.15rem 0.5rem', borderRadius: '100px', fontWeight: 700 }}>
              1-Click Auto-Fill
            </span>
          </div>
          <p style={{ margin: '0 0 0.65rem', fontSize: '0.76rem', color: '#64748b', lineHeight: 1.4 }}>
            {isTelugu ? 'పరిశీలన కోసం డెమో ఖాతాలు. ఒకే క్లిక్‌తో క్రెడెన్షియల్స్ నింపబడతాయి మరియు పోర్టల్ ఎంపికవుతుంది.' : 'Demonstration accounts for evaluation. One click auto-fills credentials and selects portal.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
            <button
              type="button"
              onClick={() => handleDemoFill('PATIENT')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.55rem',
                borderRadius: '8px',
                border: '1px solid #bae6fd',
                backgroundColor: selectedRole === ROLES.PATIENT ? '#e0f2fe' : '#ffffff',
                color: '#0369a1',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <FaUser size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('auth.demoPatient') || 'Patient'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('DOCTOR')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.55rem',
                borderRadius: '8px',
                border: '1px solid #99f6e4',
                backgroundColor: selectedRole === ROLES.DOCTOR ? '#ccfbf1' : '#ffffff',
                color: '#0f766e',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <FaUserMd size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('auth.demoDoctor') || 'Doctor'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('HOSPITAL_ADMIN')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.55rem',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
                backgroundColor: (selectedRole === ROLES.HOSPITAL_ADMIN || selectedRole === ROLES.ADMIN) ? '#dbeafe' : '#ffffff',
                color: '#1e40af',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <FaHospital size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isTelugu ? 'హాస్పిటల్ అడ్మిన్' : 'Hosp Admin'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('RECEPTIONIST')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.55rem',
                borderRadius: '8px',
                border: '1px solid #ddd6fe',
                backgroundColor: selectedRole === ROLES.RECEPTIONIST ? '#ede9fe' : '#ffffff',
                color: '#6d28d9',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <FaClipboardList size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('auth.demoReceptionist') || 'Receptionist'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('HOSPITAL_SUPER_ADMIN')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.55rem',
                borderRadius: '8px',
                border: '1px solid #fed7aa',
                backgroundColor: selectedRole === ROLES.HOSPITAL_SUPER_ADMIN ? '#ffedd5' : '#ffffff',
                color: '#c2410c',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <FaHospitalSymbol size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('auth.demoSuperAdmin') || 'SuperAdmin'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('PLATFORM_OWNER')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.55rem',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                backgroundColor: selectedRole === ROLES.PLATFORM_OWNER ? '#fee2e2' : '#ffffff',
                color: '#991b1b',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <FaShieldAlt size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('auth.demoOwner') || 'Owner'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Navigation & Provisioning Notices */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          {currentPortal.hasPublicRegistration ? (
            <div style={{
              padding: '1.1rem 1.25rem',
              backgroundColor: 'var(--slate-50)',
              borderRadius: '12px',
              border: '1px solid var(--slate-200)',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontWeight: 500, color: 'var(--slate-700)', fontSize: '0.95rem' }}>
                {currentPortal.navPrompt}{' '}
                <Link
                  to={currentPortal.registrationLink || '/register'}
                  style={{
                    color: currentPortal.themeColor,
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginLeft: '0.35rem',
                    fontSize: '0.98rem'
                  }}
                >
                  <FaUserPlus size={14} />
                  <span>{currentPortal.registrationLabel}</span>
                  <FaArrowRight size={11} />
                </Link>
              </p>
              <span style={{ fontSize: '0.84rem', color: 'var(--slate-500)', display: 'block', marginTop: '0.4rem' }}>
                {currentPortal.navNotice}
              </span>
            </div>
          ) : (
            <div style={{
              padding: '1.1rem 1.25rem',
              backgroundColor: 'var(--slate-50)',
              borderRadius: '12px',
              border: '1px solid var(--slate-200)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <FaShieldAlt style={{ color: currentPortal.themeColor, marginTop: '0.2rem', flexShrink: 0, fontSize: '1.1rem' }} />
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--slate-800)', display: 'block' }}>
                    {currentPortal.navPrompt}
                  </span>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--slate-600)', marginTop: '0.3rem', lineHeight: 1.5 }}>
                    {currentPortal.navNotice}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
