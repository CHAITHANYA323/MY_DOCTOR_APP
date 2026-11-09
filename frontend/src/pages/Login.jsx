import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FaHospitalSymbol,
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
  FaUserPlus
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../services/api';
import {
  ROLES,
  ROLE_LABELS,
  getRoleDashboardPath,
  normalizeRole
} from '../utils/roleUtils';
import { Button } from '../components/common/Button';

// Dynamic configuration for each role-based portal
const PORTAL_CONFIGS = Object.freeze({
  [ROLES.PATIENT]: {
    id: ROLES.PATIENT,
    tabLabel: 'Patient / User',
    heading: 'Patient Portal Sign In',
    subtitle: 'Access verified doctors, book appointments, and review your personal healthcare history.',
    description: 'Patient Portal: Book consultations, manage appointments, and access personal medical records.',
    buttonLabel: 'Sign In to Patient Portal',
    themeColor: '#0284c7', // Sky Blue
    accentGradient: 'linear-gradient(135deg, #0284c7, #0369a1)',
    badgeBg: '#f0f9ff',
    badgeText: '#0369a1',
    badgeBorder: '#bae6fd',
    icon: <FaUser />,
    emailLabel: 'Patient Email Address',
    emailPlaceholder: 'name@example.com',
    hasPublicRegistration: true,
    registrationLink: '/register',
    registrationLabel: 'Register as a Patient',
    navPrompt: 'New to MediConnect?',
    navNotice: 'Free public registration for doctor discovery, online booking & personal healthcare management.',
  },
  [ROLES.DOCTOR]: {
    id: ROLES.DOCTOR,
    tabLabel: 'Doctor',
    heading: 'Doctor Clinical Sign In',
    subtitle: 'Access your daily consultation agenda, patient medical histories, and clinical schedule.',
    description: 'Clinical Portal: Access daily patient agenda, clinical consultations, and availability schedule.',
    buttonLabel: 'Sign In as Doctor',
    themeColor: '#0d9488', // Medical Teal
    accentGradient: 'linear-gradient(135deg, #0d9488, #0f766e)',
    badgeBg: '#f0fdfa',
    badgeText: '#0f766e',
    badgeBorder: '#99f6e4',
    icon: <FaUserMd />,
    emailLabel: 'Doctor Official Email',
    emailPlaceholder: 'dr.name@hospital.com',
    hasPublicRegistration: false,
    navPrompt: 'Need Doctor Credentials?',
    navNotice: 'No public doctor registration. Doctor accounts are provisioned by hospital administration and activated through authorized invitation links.',
  },
  [ROLES.RECEPTIONIST]: {
    id: ROLES.RECEPTIONIST,
    tabLabel: 'Receptionist',
    heading: 'Hospital Front Desk Sign In',
    subtitle: 'Real-time patient intake terminal, fast check-in queue, and consultation triage.',
    description: 'Hospital Front Desk: Rapid patient check-in, queue management, and on-duty doctor status.',
    buttonLabel: 'Sign In to Reception Terminal',
    themeColor: '#7c3aed', // Front-desk Violet
    accentGradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    badgeBg: '#f5f3ff',
    badgeText: '#6d28d9',
    badgeBorder: '#ddd6fe',
    icon: <FaClipboardList />,
    emailLabel: 'Receptionist Staff Email',
    emailPlaceholder: 'reception@hospital.com',
    hasPublicRegistration: false,
    navPrompt: 'Front Desk Access Notice:',
    navNotice: 'No public receptionist registration. Front-desk accounts must be created and provisioned by an authorized Hospital Super Admin.',
  },
  [ROLES.HOSPITAL_SUPER_ADMIN]: {
    id: ROLES.HOSPITAL_SUPER_ADMIN,
    tabLabel: 'Super Admin',
    heading: 'Hospital Administration Console',
    subtitle: 'Hospital-level operations, clinical staff directory, departments, and appointment oversight.',
    description: 'Hospital Operations: Manage hospital doctors, staff invitations, and departmental settings.',
    buttonLabel: 'Sign In as Hospital Super Admin',
    themeColor: '#ea580c', // Operations Amber/Orange
    accentGradient: 'linear-gradient(135deg, #ea580c, #c2410c)',
    badgeBg: '#fff7ed',
    badgeText: '#c2410c',
    badgeBorder: '#fed7aa',
    icon: <FaHospitalSymbol />,
    emailLabel: 'Hospital Super Admin Email',
    emailPlaceholder: 'admin@hospital.com',
    hasPublicRegistration: false,
    navPrompt: 'Hospital Admin Provisioning:',
    navNotice: 'No public administrator registration. Hospital Super Admin accounts are provisioned through the authorized Platform Owner governance workflow.',
  },
  [ROLES.PLATFORM_OWNER]: {
    id: ROLES.PLATFORM_OWNER,
    tabLabel: 'Platform Owner',
    heading: 'Platform Governance Console',
    subtitle: 'Multi-hospital oversight, security audit logs, platform metrics, and super admin onboarding.',
    description: 'Platform Console: Multi-hospital oversight, platform security, and super admin onboarding.',
    buttonLabel: 'Sign In to Platform Governance',
    themeColor: '#b91c1c', // Security Red
    accentGradient: 'linear-gradient(135deg, #b91c1c, #991b1b)',
    badgeBg: '#fef2f2',
    badgeText: '#991b1b',
    badgeBorder: '#fecaca',
    icon: <FaShieldAlt />,
    emailLabel: 'Platform Owner Security Email',
    emailPlaceholder: 'owner@mediconnect.com',
    hasPublicRegistration: false,
    navPrompt: 'Platform Governance Notice:',
    navNotice: 'No public owner registration. Platform Owner accounts are strictly restricted to authorized server-level provisioning.',
  },
  [ROLES.ADMIN]: {
    id: ROLES.ADMIN,
    tabLabel: 'Legacy Admin',
    heading: 'Legacy Administration Console',
    subtitle: 'Unassigned administrator console access retained for backward compatibility.',
    description: 'Legacy Administration Console: Unassigned administrator console access.',
    buttonLabel: 'Sign In as Legacy Admin',
    themeColor: '#475569',
    accentGradient: 'linear-gradient(135deg, #475569, #334155)',
    badgeBg: '#f8fafc',
    badgeText: '#334155',
    badgeBorder: '#cbd5e1',
    icon: <FaShieldAlt />,
    emailLabel: 'Legacy Admin Email',
    emailPlaceholder: 'legacy.admin@medicare.com',
    hasPublicRegistration: false,
    navPrompt: 'Legacy Administration:',
    navNotice: 'Legacy administrative console access.',
  }
});

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If redirected with a suggested role or from staff onboarding
  const initialRole = location.state?.suggestedRole
    ? normalizeRole(location.state.suggestedRole)
    : ROLES.PATIENT;

  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
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
        setMismatchRole(null);
      }
    }
  }, [location.state?.suggestedRole]);

  // Active portal configuration
  const currentPortal = PORTAL_CONFIGS[selectedRole] || PORTAL_CONFIGS[ROLES.PATIENT];

  // Role selector configuration for the five portals
  const roleTabs = [
    { id: ROLES.PATIENT, label: 'Patient / User', icon: <FaUser aria-hidden="true" /> },
    { id: ROLES.DOCTOR, label: 'Doctor', icon: <FaUserMd aria-hidden="true" /> },
    { id: ROLES.RECEPTIONIST, label: 'Reception / Admin', icon: <FaClipboardList aria-hidden="true" /> },
    { id: ROLES.HOSPITAL_SUPER_ADMIN, label: 'Super Admin', icon: <FaHospitalSymbol aria-hidden="true" /> },
    { id: ROLES.PLATFORM_OWNER, label: 'Platform Owner', icon: <FaShieldAlt aria-hidden="true" /> },
  ];

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId);
    setError('');
    setMismatchRole(null);
  };

  const handleSwitchToCorrectRole = (targetRole) => {
    setSelectedRole(targetRole);
    setError('');
    setMismatchRole(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMismatchRole(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
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
        setError(res.message || 'Invalid email or password. Please try again.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Authentication failed. Please verify your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (roleKey) => {
    setError('');
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
      case 'ADMIN':
        setSelectedRole(ROLES.ADMIN);
        setEmail('legacy.admin@medicare.com');
        setPassword('Admin@123');
        break;
      default:
        break;
    }
  };

  return (
    <div style={{
      minHeight: '82vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem 1rem'
    }}>
      <div className="card" style={{
        maxWidth: '560px',
        width: '100%',
        padding: '2.25rem 2rem',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--slate-200)',
        transition: 'all 0.25s ease'
      }}>
        {/* Dynamic Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '14px',
            background: currentPortal.accentGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            margin: '0 auto 0.75rem',
            boxShadow: `0 4px 14px ${currentPortal.themeColor}40`,
            transition: 'all 0.25s ease'
          }}>
            <span style={{ fontSize: '1.5rem', display: 'flex' }}>
              {currentPortal.icon}
            </span>
          </div>
          <h1 style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: 'var(--slate-900)',
            transition: 'all 0.2s ease',
            margin: 0
          }}>
            {currentPortal.heading}
          </h1>
          <p style={{
            fontSize: '0.88rem',
            color: 'var(--slate-500)',
            marginTop: '0.35rem',
            lineHeight: 1.45,
            transition: 'all 0.2s ease'
          }}>
            {currentPortal.subtitle}
          </p>
        </div>

        {/* Account Type Selector Tabs */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--slate-600)',
            display: 'block',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            Select Account Portal:
          </label>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.35rem',
            backgroundColor: 'var(--slate-100)',
            padding: '0.35rem',
            borderRadius: 'var(--radius-md)'
          }}>
            {roleTabs.map((tab) => {
              const isSelected = selectedRole === tab.id;
              const tabConfig = PORTAL_CONFIGS[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleRoleChange(tab.id)}
                  style={{
                    flex: '1 1 auto',
                    minWidth: '95px',
                    padding: '0.45rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected ? `1.5px solid ${tabConfig?.themeColor || 'var(--primary)'}` : '1.5px solid transparent',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    backgroundColor: isSelected ? 'white' : 'transparent',
                    color: isSelected ? (tabConfig?.themeColor || 'var(--primary-dark)') : 'var(--slate-600)',
                    boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '0.85rem' }}>{tab.icon}</span>
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
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          fontSize: '0.83rem',
          color: 'var(--slate-700)',
          lineHeight: 1.5,
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          transition: 'all 0.25s ease'
        }}>
          <span style={{ color: currentPortal.themeColor, marginTop: '0.15rem', flexShrink: 0, fontSize: '0.95rem' }}>
            {currentPortal.icon}
          </span>
          <div>
            <strong style={{
              color: currentPortal.badgeText,
              display: 'block',
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.15rem'
            }}>
              {currentPortal.tabLabel} Portal
            </strong>
            <span>{currentPortal.description}</span>
          </div>
        </div>

        {/* Redirect Message Banner */}
        {redirectMessage && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary-dark)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
            border: '1px solid var(--primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FaInfoCircle />
            <span>{redirectMessage}</span>
          </div>
        )}

        {/* Error / Role Mismatch Banner */}
        {error && (
          <div
            className="login-error-banner"
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--emergency-light)',
              color: 'var(--emergency)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
              border: '1px solid #fecaca'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <FaExclamationTriangle style={{ marginTop: '0.2rem', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0 }}>{error}</p>
                {mismatchRole && (
                  <button
                    type="button"
                    className="role-switch-btn"
                    onClick={() => handleSwitchToCorrectRole(mismatchRole)}
                    style={{
                      marginTop: '0.5rem',
                      background: 'var(--emergency)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Switch to {ROLE_LABELS[mismatchRole] || mismatchRole} Tab
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Dynamic Email Field */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              {currentPortal.emailLabel} *
            </label>
            <div style={{ position: 'relative' }}>
              <FaEnvelope style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--slate-400)'
              }} />
              <input
                type="email"
                placeholder={currentPortal.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Password *
            </label>
            <div style={{ position: 'relative' }}>
              <FaLock style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--slate-400)'
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
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
                  cursor: 'pointer'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
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
              marginTop: '0.75rem',
              background: currentPortal.accentGradient,
              border: 'none',
              boxShadow: `0 4px 12px ${currentPortal.themeColor}35`,
              fontWeight: 700,
              transition: 'all 0.2s ease'
            }}
          >
            {currentPortal.buttonLabel}
          </Button>
        </form>

        {/* 1-Click Quick Demo Sign-In */}
        <div style={{
          marginTop: '1.5rem',
          padding: '0.75rem',
          backgroundColor: 'var(--slate-50)',
          border: '1px dashed var(--slate-300)',
          borderRadius: 'var(--radius-md)'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--slate-600)', fontWeight: 700, display: 'block', marginBottom: '0.45rem' }}>
            ⚡ 1-Click Demo Accounts:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.4rem' }}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDemoFill('PATIENT')}
              icon={<FaUser aria-hidden="true" />}
              style={{ backgroundColor: 'white', borderColor: 'var(--slate-300)', fontSize: '0.72rem', padding: '0.35rem 0.5rem', justifyContent: 'flex-start' }}
            >
              Demo Patient
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDemoFill('DOCTOR')}
              icon={<FaUserMd aria-hidden="true" />}
              style={{ backgroundColor: 'white', borderColor: 'var(--slate-300)', fontSize: '0.72rem', padding: '0.35rem 0.5rem', justifyContent: 'flex-start' }}
            >
              Demo Doctor
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDemoFill('RECEPTIONIST')}
              icon={<FaClipboardList aria-hidden="true" />}
              style={{ backgroundColor: 'white', borderColor: 'var(--slate-300)', fontSize: '0.72rem', padding: '0.35rem 0.5rem', justifyContent: 'flex-start' }}
            >
              Demo Receptionist
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDemoFill('HOSPITAL_SUPER_ADMIN')}
              icon={<FaHospitalSymbol aria-hidden="true" />}
              style={{ backgroundColor: 'white', borderColor: 'var(--slate-300)', fontSize: '0.72rem', padding: '0.35rem 0.5rem', justifyContent: 'flex-start' }}
            >
              Demo Super Admin
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDemoFill('PLATFORM_OWNER')}
              icon={<FaShieldAlt aria-hidden="true" />}
              style={{ backgroundColor: 'white', borderColor: 'var(--slate-300)', fontSize: '0.72rem', padding: '0.35rem 0.5rem', justifyContent: 'flex-start' }}
            >
              Demo Owner
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDemoFill('ADMIN')}
              icon={<FaShieldAlt aria-hidden="true" />}
              style={{ backgroundColor: 'white', borderColor: 'var(--slate-300)', fontSize: '0.72rem', padding: '0.35rem 0.5rem', justifyContent: 'flex-start' }}
            >
              Legacy Admin
            </Button>
          </div>
        </div>

        {/* Dynamic Navigation & Provisioning Notices */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.88rem' }}>
          {selectedRole === ROLES.PATIENT ? (
            <div style={{
              padding: '0.9rem',
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-200)',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontWeight: 500, color: 'var(--slate-600)', fontSize: '0.88rem' }}>
                {currentPortal.navPrompt}{' '}
                <Link
                  to="/register"
                  style={{
                    color: currentPortal.themeColor,
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    marginLeft: '0.3rem'
                  }}
                >
                  <FaUserPlus size={13} />
                  <span>{currentPortal.registrationLabel}</span>
                  <FaArrowRight size={10} />
                </Link>
              </p>
              <span style={{ fontSize: '0.76rem', color: 'var(--slate-400)', display: 'block', marginTop: '0.35rem' }}>
                {currentPortal.navNotice}
              </span>
            </div>
          ) : (
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-200)',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                <FaShieldAlt style={{ color: currentPortal.themeColor, marginTop: '0.2rem', flexShrink: 0, fontSize: '0.9rem' }} />
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-700)', display: 'block' }}>
                    {currentPortal.navPrompt}
                  </span>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: '0.25rem', lineHeight: 1.45 }}>
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
