import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FaHospitalSymbol,
  FaUserMd,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUser,
  FaPhone,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCalendarTimes
} from 'react-icons/fa';
import { invitationService } from '../../services/invitationService';
import { getApiErrorMessage } from '../../services/api';
import { ROLE_LABELS, normalizeRole } from '../../utils/roleUtils';
import { Button } from '../../components/common/Button';

export const AcceptInvitation = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  // Verification state
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState('');
  const [invitationData, setInvitationData] = useState(null);

  // Form inputs
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [activatedSuccess, setActivatedSuccess] = useState(false);

  // Verify invitation token on mount
  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      if (!token || token.trim().length < 10) {
        if (isMounted) {
          setVerifyError('Invalid or malformed invitation link.');
          setVerifying(false);
        }
        return;
      }

      try {
        const res = await invitationService.verifyInvitation(token.trim());
        if (isMounted) {
          if (res.success && res.invitation) {
            setInvitationData(res.invitation);
          } else {
            setVerifyError(res.message || 'Invitation is invalid or has expired.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setVerifyError(getApiErrorMessage(err, 'Unable to verify invitation link.'));
        }
      } finally {
        if (isMounted) {
          setVerifying(false);
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!invitationData) return;

    const isExistingAccount = invitationData.requires_password_verification;

    if (isExistingAccount) {
      if (!currentPassword) {
        setSubmitError('Please enter your current account password to link your profile.');
        return;
      }
      if (password && password.length < 6) {
        setSubmitError('New password must be at least 6 characters long.');
        return;
      }
      if (password && password !== confirmPassword) {
        setSubmitError('New passwords do not match.');
        return;
      }
    } else {
      if (!name.trim()) {
        setSubmitError('Full name is required.');
        return;
      }
      if (!password || password.length < 6) {
        setSubmitError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setSubmitError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        token: token.trim(),
        name: name.trim(),
        phone: phone.trim(),
      };

      if (isExistingAccount) {
        payload.current_password = currentPassword;
        if (password) {
          payload.new_password = password;
          payload.confirm_new_password = confirmPassword;
        }
      } else {
        payload.password = password;
        payload.confirm_password = confirmPassword;
      }

      const res = await invitationService.acceptInvitation(payload);
      if (res.success) {
        setActivatedSuccess(true);
      } else {
        setSubmitError(res.message || 'Unable to accept invitation.');
      }
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Failed to activate account.'));
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = invitationData?.role
    ? (ROLE_LABELS[normalizeRole(invitationData.role)] || invitationData.role)
    : 'Staff Member';

  // 1. Loading State
  if (verifying) {
    return (
      <div style={{
        minHeight: '75vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <div className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%', marginBottom: '1.5rem' }}></div>
        <p style={{ color: 'var(--slate-600)', fontWeight: 600, fontSize: '1rem' }}>
          Verifying cryptographic invitation token...
        </p>
      </div>
    );
  }

  // 2. Error / Expired / Revoked State
  if (verifyError) {
    const isAlreadyAccepted = verifyError.toLowerCase().includes('already been accepted');
    const isExpired = verifyError.toLowerCase().includes('expired');
    const isRevoked = verifyError.toLowerCase().includes('revoked');

    return (
      <div style={{
        minHeight: '75vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem'
      }}>
        <div className="card" style={{
          maxWidth: '520px',
          width: '100%',
          padding: '2.5rem',
          textAlign: 'center',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--slate-200)'
        }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            backgroundColor: isAlreadyAccepted ? 'var(--primary-light)' : 'var(--emergency-light)',
            color: isAlreadyAccepted ? 'var(--primary-dark)' : 'var(--emergency)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            fontSize: '1.75rem'
          }}>
            {isAlreadyAccepted ? <FaCheckCircle /> : isExpired ? <FaCalendarTimes /> : <FaExclamationTriangle />}
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.75rem' }}>
            {isAlreadyAccepted
              ? 'Invitation Already Claimed'
              : isExpired
              ? 'Invitation Link Expired'
              : isRevoked
              ? 'Invitation Revoked'
              : 'Invalid Invitation'}
          </h2>

          <p style={{ fontSize: '0.95rem', color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: '2rem' }}>
            {verifyError}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate('/login')}
            >
              Go to MediConnect Login
            </Button>
            <Link to="/" style={{ color: 'var(--slate-500)', fontSize: '0.88rem', textDecoration: 'none' }}>
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Activated Success State
  if (activatedSuccess) {
    return (
      <div style={{
        minHeight: '75vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem'
      }}>
        <div className="card" style={{
          maxWidth: '520px',
          width: '100%',
          padding: '2.5rem',
          textAlign: 'center',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--slate-200)'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            fontSize: '2rem'
          }}>
            <FaCheckCircle />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
            Account Successfully Activated!
          </h2>

          <p style={{ fontSize: '0.95rem', color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            Your staff account has been provisioned as <strong>{roleLabel}</strong>
            {invitationData?.hospital_name ? ` at ${invitationData.hospital_name}` : ''}.
            You may now log in to your authorized portal.
          </p>

          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate('/login', {
              state: {
                message: `Welcome aboard! Please sign in as ${roleLabel}.`,
                suggestedRole: invitationData?.role
              }
            })}
          >
            Proceed to Login
          </Button>
        </div>
      </div>
    );
  }

  // 4. Onboarding / Password Setup Form
  const isExistingUser = !!invitationData?.requires_password_verification;

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.25rem'
    }}>
      <div className="card" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--slate-200)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            margin: '0 auto 0.75rem',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
          }}>
            {invitationData?.role === 'DOCTOR' ? <FaUserMd size={26} /> : <FaHospitalSymbol size={26} />}
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Staff Invitation Onboarding
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
            Complete your profile setup to join the MediConnect healthcare network
          </p>
        </div>

        {/* Invitation Summary Card */}
        <div style={{
          backgroundColor: 'var(--primary-ultralight)',
          border: '1px solid var(--primary-light)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          marginBottom: '1.75rem'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.88rem' }}>
            <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Target Role:</span>
            <span style={{ color: 'var(--primary-dark)', fontWeight: 700 }}>{roleLabel}</span>

            {invitationData?.hospital_name && (
              <>
                <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Hospital:</span>
                <span style={{ color: 'var(--slate-800)', fontWeight: 700 }}>{invitationData.hospital_name}</span>
              </>
            )}

            {invitationData?.doctor_name && (
              <>
                <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Doctor Profile:</span>
                <span style={{ color: 'var(--slate-800)', fontWeight: 700 }}>{invitationData.doctor_name}</span>
              </>
            )}

            <span style={{ color: 'var(--slate-500)', fontWeight: 600 }}>Invited Email:</span>
            <span style={{ color: 'var(--slate-800)', fontWeight: 700 }}>{invitationData?.email}</span>
          </div>
        </div>

        {isExistingUser && (
          <div style={{
            padding: '0.85rem 1rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            color: '#92400e',
            marginBottom: '1.5rem',
            lineHeight: 1.5
          }}>
            <strong>Account Linking Notice:</strong> An account with email <code>{invitationData?.email}</code> already exists. Please verify your current password to link this staff role.
          </div>
        )}

        {submitError && (
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--emergency-light)',
            color: 'var(--emergency)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.25rem'
          }}>
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isExistingUser ? (
            /* Existing Account Verification Fields */
            <>
              <div className="form-group">
                <label className="form-label">Current Password (Required to link account)</label>
                <div style={{ position: 'relative' }}>
                  <FaLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
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
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">New Password (Optional, leave blank to keep current)</label>
                <input
                  type="password"
                  placeholder="Enter new password (optional)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
              </div>

              {password && (
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}
            </>
          ) : (
            /* New Account Creation Fields */
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <FaUser style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                  <input
                    type="text"
                    placeholder="Dr. / Staff Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <FaPhone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password (Min. 6 characters)</label>
                <div style={{ position: 'relative' }}>
                  <FaLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Set a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
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
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
            </>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            style={{ marginTop: '1rem' }}
          >
            {isExistingUser ? 'Confirm & Link Staff Account' : 'Activate Staff Account'}
          </Button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '1.75rem' }}>
          Already have login credentials?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AcceptInvitation;
