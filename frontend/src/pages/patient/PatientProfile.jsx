import React, { useState, useEffect, useMemo } from 'react';
import {
  FaPhoneAlt,
  FaLock,
  FaSave,
  FaCheckCircle,
  FaEnvelope,
  FaEdit,
  FaTimes,
  FaSync,
  FaCamera
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { patientService } from '../../services/patientService';

export const PatientProfile = () => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Profile fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [profileData, setProfileData] = useState(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await patientService.getProfile();
        if (res.success && isMounted) {
          const u = res.user;
          setProfileData(u);
          setName(u.name || '');
          setPhone(u.phone || '');
          setAvatar(u.avatar || '');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        toast.error('Failed to load profile details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => { isMounted = false; };
  }, []);

  const handleCancelEdit = () => {
    if (profileData) {
      setName(profileData.name || '');
      setPhone(profileData.phone || '');
      setAvatar(profileData.avatar || '');
    }
    setIsEditing(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full name is required.');
      return;
    }

    try {
      setSaving(true);
      const res = await patientService.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        avatar: avatar.trim()
      });

      if (res.success) {
        toast.success(t('patientPortal.saveSuccess') || 'Patient profile updated successfully!');
        setProfileData(res.user);
        if (updateUser) {
          updateUser(res.user);
        }
        setIsEditing(false);
      } else {
        toast.error(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error(err.response?.data?.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    try {
      setUpdatingPassword(true);
      const res = await patientService.updateProfile({
        current_password: currentPassword,
        new_password: newPassword
      });

      if (res.success) {
        toast.success(t('patientPortal.passwordSuccess') || 'Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.message || 'Password update failed.');
      }
    } catch (err) {
      console.error('Password change error:', err);
      toast.error(err.response?.data?.message || 'Current password was incorrect.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const patientInitials = useMemo(() => {
    const displayName = name || user?.name || 'P';
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }, [name, user]);

  const memberSince = useMemo(() => {
    if (profileData?.created_at) {
      try {
        return new Date(profileData.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch {
        return 'Active Member';
      }
    }
    return 'Registered Healthcare Consumer';
  }, [profileData]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: '1rem'
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          border: '3px solid #E2E8F0',
          borderTopColor: '#1677C8',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#718096', fontSize: '0.9rem', fontWeight: 600 }}>Loading patient profile...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Profile Header Hero Card */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '2rem 2.25rem',
        boxShadow: '0 2px 10px rgba(16, 42, 67, 0.04)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: 'linear-gradient(90deg, #102A43, #1677C8, #13B8A6)'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Avatar Container */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #102A43 0%, #1677C8 100%)',
              border: '3px solid #FFFFFF',
              boxShadow: '0 8px 20px rgba(22, 119, 200, 0.25)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '2rem',
              overflow: 'hidden'
            }}>
              {avatar ? (
                <img
                  src={avatar}
                  alt={name || 'Patient'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                patientInitials
              )}
            </div>
            {isEditing && (
              <div
                title="Edit Photo URL below"
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#13B8A6',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  border: '2px solid #FFFFFF'
                }}
              >
                <FaCamera />
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#102A43', margin: 0, letterSpacing: '-0.02em' }}>
                {name || user?.name || 'Registered Patient'}
              </h1>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                backgroundColor: 'rgba(22, 163, 106, 0.1)',
                border: '1px solid rgba(22, 163, 106, 0.3)',
                color: '#16A36A',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.15rem 0.55rem',
                borderRadius: '999px'
              }}>
                <FaCheckCircle size={10} />
                <span>{t('patientPortal.activePatient') || 'Verified Patient'}</span>
              </span>
            </div>

            <div style={{ fontSize: '0.86rem', color: '#718096', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>{user?.email || 'patient@mediconnect.com'}</span>
              <span>&bull;</span>
              <span style={{ color: '#1677C8', fontWeight: 700 }}>
                ID: #MC-PAT-{(user?.id || 1).toString().padStart(4, '0')}
              </span>
              <span>&bull;</span>
              <span style={{ color: '#64748B' }}>Member since {memberSince}</span>
            </div>
          </div>
        </div>

        {/* Edit Profile Trigger */}
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#1677C8',
              color: '#FFFFFF',
              padding: '0.65rem 1.35rem',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(22, 119, 200, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <FaEdit size={13} />
            <span>{t('patientPortal.editProfile') || 'Edit Profile'}</span>
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleCancelEdit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                padding: '0.65rem 1.15rem',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer'
              }}
            >
              <FaTimes size={12} />
              <span>{t('patientPortal.cancelChanges') || 'Cancel'}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#16A36A',
                color: '#FFFFFF',
                padding: '0.65rem 1.35rem',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 106, 0.25)'
              }}
            >
              {saving ? <FaSync size={13} className="animate-spin" /> : <FaSave size={13} />}
              <span>{t('patientPortal.saveChanges') || 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Content Grid: Account Information, Personal Details, Password Update */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.75rem'
      }}>
        {/* Column 1: Personal & Account Details Form */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '1.75rem',
          boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#102A43', margin: '0 0 0.25rem 0' }}>
              {t('patientPortal.personalDetails') || 'Personal Information'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#718096', margin: 0 }}>
              Primary identity and emergency communication details.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                {t('patientPortal.fullName') || 'Full Name'} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: isEditing ? '1px solid #1677C8' : '1px solid #CBD5E1',
                  fontSize: '0.86rem',
                  backgroundColor: isEditing ? '#FFFFFF' : '#F8FAFC',
                  color: '#243447',
                  outline: 'none'
                }}
              />
            </div>

            {/* Email (Readonly) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                {t('patientPortal.registeredEmail') || 'Registered Email Address'}
              </label>
              <div style={{ position: 'relative' }}>
                <FaEnvelope style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    backgroundColor: '#F1F5F9',
                    color: '#64748B',
                    cursor: 'not-allowed'
                  }}
                />
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.2rem', display: 'block' }}>
                Email is tied to your primary authentication identity and cannot be changed.
              </span>
            </div>

            {/* Phone Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                {t('patientPortal.phoneNumber') || 'Phone Number'}
              </label>
              <div style={{ position: 'relative' }}>
                <FaPhoneAlt style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isEditing}
                  placeholder="+91 98765 43210"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                    borderRadius: '8px',
                    border: isEditing ? '1px solid #1677C8' : '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    backgroundColor: isEditing ? '#FFFFFF' : '#F8FAFC',
                    color: '#243447',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Avatar URL */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#102A43', marginBottom: '0.35rem' }}>
                {t('patientPortal.avatarUrl') || 'Profile Photo URL'}
              </label>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                disabled={!isEditing}
                placeholder="https://example.com/photo.jpg"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: isEditing ? '1px solid #1677C8' : '1px solid #CBD5E1',
                  fontSize: '0.86rem',
                  backgroundColor: isEditing ? '#FFFFFF' : '#F8FAFC',
                  color: '#243447',
                  outline: 'none'
                }}
              />
            </div>

            {isEditing && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    padding: '0.6rem 1.15rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.6rem 1.35rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#16A36A',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}
                >
                  {saving && <FaSync size={11} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Column 2: Account Overview & Security Password Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Account Overview Metadata Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '1.75rem',
            boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#102A43', margin: '0 0 1rem 0' }}>
              {t('patientPortal.accountInfo') || 'Account Information'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>System Role</span>
                <span style={{
                  padding: '0.15rem 0.6rem',
                  backgroundColor: 'rgba(22, 119, 200, 0.1)',
                  color: '#1677C8',
                  borderRadius: '999px',
                  fontWeight: 800,
                  fontSize: '0.74rem'
                }}>
                  {user?.role || 'PATIENT'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Patient ID</span>
                <strong style={{ color: '#102A43' }}>#MC-PAT-{(user?.id || 1).toString().padStart(4, '0')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #F0F4F8' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Status</span>
                <span style={{ color: '#16A36A', fontWeight: 800 }}>Active Verified Patient</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span style={{ color: '#718096', fontWeight: 600 }}>Data Encryption</span>
                <span style={{ color: '#475569', fontWeight: 700 }}>AES-256 / SHA-256</span>
              </div>
            </div>
          </div>

          {/* Security & Password Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '1.75rem',
            boxShadow: '0 2px 8px rgba(16, 42, 67, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(22, 119, 200, 0.1)',
                color: '#1677C8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FaLock size={15} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#102A43', margin: 0 }}>
                  {t('patientPortal.securityPassword') || 'Security & Password'}
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#718096', margin: 0 }}>
                  Update your authentication credentials.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#102A43', marginBottom: '0.3rem' }}>
                  {t('patientPortal.currentPassword') || 'Current Password'} *
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    backgroundColor: '#FFFFFF',
                    color: '#243447',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#102A43', marginBottom: '0.3rem' }}>
                  {t('patientPortal.newPassword') || 'New Password'} *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    backgroundColor: '#FFFFFF',
                    color: '#243447',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#102A43', marginBottom: '0.3rem' }}>
                  {t('patientPortal.confirmNewPassword') || 'Confirm New Password'} *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.86rem',
                    backgroundColor: '#FFFFFF',
                    color: '#243447',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#102A43',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem'
                }}
              >
                {updatingPassword && <FaSync size={11} className="animate-spin" />}
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
