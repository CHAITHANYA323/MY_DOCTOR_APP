import React, { useState } from 'react';
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
  FaInfoCircle
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

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If redirected with a suggested role or from staff onboarding
  const suggestedRole = location.state?.suggestedRole
    ? normalizeRole(location.state.suggestedRole)
    : ROLES.PATIENT;

  const [selectedRole, setSelectedRole] = useState(suggestedRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [mismatchRole, setMismatchRole] = useState(null);
  const [loading, setLoading] = useState(false);

  // Redirection metadata
  const from = location.state?.from?.pathname || (typeof location.state?.from === 'string' ? location.state.from : null);
  const redirectMessage = location.state?.message || '';

  // Role selector configuration
  const roleTabs = [
    { id: ROLES.PATIENT, label: 'Patient / User', icon: <FaUser aria-hidden="true" /> },
    { id: ROLES.DOCTOR, label: 'Doctor', icon: <FaUserMd aria-hidden="true" /> },
    { id: ROLES.RECEPTIONIST, label: 'Reception / Admin', icon: <FaClipboardList aria-hidden="true" /> },
    { id: ROLES.HOSPITAL_SUPER_ADMIN, label: 'Super Admin', icon: <FaHospitalSymbol aria-hidden="true" /> },
    { id: ROLES.PLATFORM_OWNER, label: 'Platform Owner', icon: <FaShieldAlt aria-hidden="true" /> },
  ];

  const roleDescriptions = {
    [ROLES.PATIENT]: 'Patient Portal: Book consultations, manage appointments, and access medical records.',
    [ROLES.DOCTOR]: 'Clinical Portal: Access daily patient agenda, clinical consultations, and availability schedule.',
    [ROLES.RECEPTIONIST]: 'Hospital Front Desk: Rapid patient check-in, queue management, and on-duty doctor status.',
    [ROLES.HOSPITAL_SUPER_ADMIN]: 'Hospital Operations: Manage hospital doctors, staff invitations, and departmental settings.',
    [ROLES.PLATFORM_OWNER]: 'Platform Console: Multi-hospital oversight, platform security, and super admin onboarding.',
    [ROLES.ADMIN]: 'Legacy Administration Console: Unassigned administrator console access.',
  };

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
        setError(res.message || 'Invalid email or password.');
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
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem 1rem'
    }}>
      <div className="card" style={{
        maxWidth: '540px',
        width: '100%',
        padding: '2.25rem 2rem',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--slate-200)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            margin: '0 auto 0.75rem',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
          }}>
            <FaHospitalSymbol size={24} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            MediConnect Login
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
            Unified Healthcare Platform & Staff Access
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
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    backgroundColor: isSelected ? 'white' : 'transparent',
                    color: isSelected ? 'var(--primary-dark)' : 'var(--slate-600)',
                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
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

        {/* Role Context Description */}
        <div style={{
          backgroundColor: 'var(--primary-ultralight)',
          borderLeft: '4px solid var(--primary)',
          padding: '0.65rem 0.85rem',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          fontSize: '0.82rem',
          color: 'var(--slate-700)',
          lineHeight: 1.45,
          marginBottom: '1.25rem'
        }}>
          {roleDescriptions[selectedRole] || roleDescriptions[ROLES.PATIENT]}
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
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--emergency-light)',
            color: 'var(--emergency)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
            border: '1px solid #fecaca'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <FaExclamationTriangle style={{ marginTop: '0.2rem', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0 }}>{error}</p>
                {mismatchRole && (
                  <button
                    type="button"
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

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="form-group">
            <label className="form-label">
              {selectedRole === ROLES.PATIENT ? 'Email Address' : `${ROLE_LABELS[selectedRole]} Email`}
            </label>
            <div style={{ position: 'relative' }}>
              <FaEnvelope style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <FaLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            style={{ marginTop: '0.5rem' }}
          >
            Sign In as {ROLE_LABELS[selectedRole] || 'User'}
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

        {/* Bottom Navigation */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--slate-500)' }}>
          {selectedRole === ROLES.PATIENT ? (
            <p style={{ margin: 0 }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                Register as Patient
              </Link>
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              Received a staff invitation?{' '}
              <span style={{ color: 'var(--slate-700)', fontWeight: 600 }}>
                Use your unique invite link to activate.
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
