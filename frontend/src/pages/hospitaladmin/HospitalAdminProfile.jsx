import React, { useState, useEffect } from 'react';
import {
  FaUserShield,
  FaHospital,
  FaKey,
  FaLock,
  FaCheckCircle,
  FaShieldAlt,
  FaInfoCircle
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ecosystemService } from '../../services/ecosystemService';
import { notify } from '../../utils/toast';

export const HospitalAdminProfile = () => {
  const { user, changePassword } = useAuth();
  const { isTelugu } = useLanguage();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Password Change Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await ecosystemService.getHospitalAdminAccountProfile();
        if (res.success) {
          setProfileData(res);
        }
      } catch (err) {
        console.error('Error fetching admin profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      notify.error(isTelugu ? 'పాస్‌వర్డ్‌లు సరిపోలడం లేదు' : 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      notify.error(isTelugu ? 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి' : 'Password must be at least 6 characters.');
      return;
    }

    try {
      setChangingPass(true);
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      notify.success(isTelugu ? 'పాస్‌వర్డ్ విజయవంతంగా మార్చబడింది!' : 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      notify.error(err.response?.data?.message || (isTelugu ? 'పాస్‌వర్డ్ మార్పు విఫలమైంది' : 'Password update failed.'));
    } finally {
      setChangingPass(false);
    }
  };

  const hospital = profileData?.hospital || {};
  const isPrimary = profileData?.is_primary || false;
  const designation = profileData?.designation || 'Hospital Administrator';

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem' }}>
          {isTelugu ? 'నా ఖాతా & భద్రత' : 'My Account & Security'}
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>
          {isTelugu ? 'మీ వ్యక్తిగత ఖాతా వివరాలు మరియు లాగిన్ పాస్‌వర్డ్ నిర్వహణ.' : 'Manage your administrator account details and update your password.'}
        </p>
      </div>

      {/* Profile Overview Card */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: '#1d4ed8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                {user?.name || 'Administrator'}
              </h3>
              {isPrimary ? (
                <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '100px' }}>
                  ★ {isTelugu ? 'ప్రధాన హాస్పిటల్ అడ్మిన్' : 'Primary Hospital Admin'}
                </span>
              ) : (
                <span style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: '100px' }}>
                  {isTelugu ? 'కార్యాచరణ అడ్మిన్' : 'Operational Admin'}
                </span>
              )}
            </div>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{designation}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              {isTelugu ? 'ఈమెయిల్ చిరునామా' : 'Email Address'}
            </span>
            <div style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 600, marginTop: '0.2rem' }}>
              {user?.email}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              {isTelugu ? 'సంప్రదింపు నంబర్' : 'Phone'}
            </span>
            <div style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 600, marginTop: '0.2rem' }}>
              {user?.phone || 'Not specified'}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              {isTelugu ? 'కేటాయించిన ఆసుపత్రి' : 'Assigned Hospital'}
            </span>
            <div style={{ fontSize: '0.92rem', color: '#1d4ed8', fontWeight: 700, marginTop: '0.2rem' }}>
              {hospital.name || user?.hospital_name || 'Hospital #1'}
            </div>
          </div>
        </div>
      </div>

      {/* Governance Immutable Assignment Notice */}
      <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <FaInfoCircle color="#b45309" size={18} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
        <span style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.45 }}>
          {isTelugu
            ? 'భద్రతా విధానం ప్రకారం హాస్పిటల్ అడ్మినిస్ట్రేటర్లు వారి ఆసుపత్రి కేటాయింపును స్వతంత్రంగా మార్చలేరు. బదిలీలు లేదా పునర్వ్యవస్థీకరణ కోసం మీ కేటాయించిన సూపర్ అడ్మిన్ లేదా ప్లాట్‌ఫారమ్ గవర్నెన్స్‌ను సంప్రదించండి.'
            : 'Security Notice: Hospital administrators cannot modify or switch hospital assignments independently. All reassignment and branch transfers are controlled by your assigned SuperAdmin.'}
        </span>
      </div>

      {/* Change Password Card */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaKey color="#1d4ed8" />
          <span>{isTelugu ? 'పాస్‌వర్డ్ మార్చండి' : 'Change Security Password'}</span>
        </h3>

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 440 }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
              {isTelugu ? 'ప్రస్తుత పాస్‌వర్డ్' : 'Current Password'} *
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
              {isTelugu ? 'కొత్త పాస్‌వర్డ్' : 'New Password'} *
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
              {isTelugu ? 'కొత్త పాస్‌వర్డ్ ధృవీకరించండి' : 'Confirm New Password'} *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>

          <button
            type="submit"
            disabled={changingPass}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#1d4ed8',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: changingPass ? 'not-allowed' : 'pointer'
            }}
          >
            {changingPass ? (isTelugu ? 'అప్‌డేట్ చేస్తోంది...' : 'Updating...') : (isTelugu ? 'పాస్‌వర్డ్ అప్‌డేట్ చేయండి' : 'Update Password')}
          </button>
        </form>
      </div>
    </div>
  );
};
