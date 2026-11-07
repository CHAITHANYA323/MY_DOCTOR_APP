import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaPhoneAlt, FaLock, FaSave, FaHeart, FaUserMd, FaTrash, FaCalendarCheck, FaSignOutAlt, FaIdBadge } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { doctorService } from '../services/doctorService';
import { DoctorCard } from '../components/DoctorCard';
import { notify } from '../utils/toast';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

export const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Favorites
  const [favorites, setFavorites] = useState([]);
  const [favLoading, setFavLoading] = useState(true);

  const fetchFavorites = async () => {
    try {
      setFavLoading(true);
      const res = await doctorService.getFavorites();
      if (res.success) {
        setFavorites(res.favorites);
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    } finally {
      setFavLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Full name cannot be empty.');
      return;
    }

    // Validate password change inputs if any password field is populated
    if (newPassword || currentPassword || confirmPassword) {
      if (!currentPassword) {
        setErrorMsg('Please enter your current password to authorize a password change.');
        return;
      }
      if (!newPassword) {
        setErrorMsg('Please enter your new password.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMsg('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('New password and confirm password do not match.');
        return;
      }
      if (currentPassword === newPassword) {
        setErrorMsg('New password must be different from current password.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = { name, phone };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
        payload.password = newPassword;
      }

      const res = await authService.updateProfile(payload);
      if (res.success) {
        updateUser(res.user);
        notify.success('Profile details updated successfully!');
        setSuccessMsg('Profile details updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        notify.error(res.message || 'Failed to update profile.');
        setErrorMsg(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      notify.error(err.response?.data?.message || 'Failed to update profile.');
      setErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (doctorId) => {
    try {
      await doctorService.toggleFavorite(doctorId);
      fetchFavorites();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '2.5rem 0 5rem' }}>
      <div className="container">
        {/* Page Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div className="section-tag">
            <FaUser /> Account Settings
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Patient Profile & Saved Doctors
          </h1>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.95rem' }}>
            Update your personal contact information and manage your favorite specialist doctors
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.6fr',
          gap: '2.5rem',
          alignItems: 'flex-start'
        }} className="profile-layout">

          {/* Left Column: Personal Info Form */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <img 
                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=0284c7&color=fff`} 
                alt={user?.name}
                style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 0.75rem', border: '3px solid var(--primary-light)' }} 
              />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                {user?.name}
              </h3>
              <span className="badge badge-confirmed" style={{ marginTop: '0.25rem' }}>
                {user?.role === 'ADMIN' ? 'Administrator' : 'Verified Patient'}
              </span>
            </div>

            {successMsg && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem', fontWeight: 600 }}>
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--emergency-light)', color: 'var(--emergency)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.88rem', fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <FaUser style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Read-Only)</label>
                <div style={{ position: 'relative' }}>
                  <FaEnvelope style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                  <input 
                    type="email" 
                    value={user?.email || ''}
                    disabled
                    className="form-input"
                    style={{ paddingLeft: '2.5rem', backgroundColor: 'var(--slate-100)', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <FaPhoneAlt style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              {/* Change Password Section */}
              <div style={{
                marginTop: '1.25rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--slate-200)',
                marginBottom: '1rem'
              }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--slate-700)', display: 'block', marginBottom: '0.75rem' }}>
                  Change Password <span style={{ fontWeight: 400, color: 'var(--slate-500)', fontSize: '0.8rem' }}>(Leave blank to keep unchanged)</span>
                </span>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <FaLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                    <input 
                      type="password" 
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <FaLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                    <input 
                      type="password" 
                      placeholder="Enter new password (min. 6 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <FaLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                    <input 
                      type="password" 
                      placeholder="Re-type new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                variant="primary"
                fullWidth
                loading={loading}
                icon={<FaSave aria-hidden="true" />}
                style={{ marginTop: '0.5rem' }}
              >
                Save Profile Changes
              </Button>
            </form>

            {/* Quick Actions: My Appointments & Logout */}
            <div style={{ marginTop: '1.75rem', paddingTop: '1.5rem', borderTop: '1px solid var(--slate-200)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link 
                to="/appointments" 
                className="btn btn-secondary" 
                style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
              >
                <FaCalendarCheck /> View My Appointments
              </Link>
              
              <button 
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="btn btn-outline" 
                style={{ 
                  width: '100%', 
                  justifyContent: 'center', 
                  color: 'var(--emergency)', 
                  borderColor: 'var(--emergency)',
                  fontWeight: 700
                }}
              >
                <FaSignOutAlt /> Log Out
              </button>
            </div>
          </div>

          {/* Right Column: Favorite Doctors */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
              <div className="flex items-center gap-2">
                <FaHeart color="var(--emergency)" />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  Saved Favorite Doctors ({favorites.length})
                </h3>
              </div>
            </div>

            {favLoading ? (
              <p>Loading favorites...</p>
            ) : favorites.length === 0 ? (
              <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <FaHeart size={36} color="var(--slate-300)" style={{ marginBottom: '0.75rem' }} />
                <h4 style={{ fontSize: '1.1rem', color: 'var(--slate-700)', marginBottom: '0.35rem' }}>No Favorite Doctors Saved</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
                  Click the heart icon on any doctor's profile to bookmark them for easy access.
                </p>
                <Link to="/doctors" className="btn btn-primary btn-sm">Find Doctors</Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
                {favorites.map((fav) => (
                  <div key={fav.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                    <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
                      <img 
                        src={fav.doctor?.image || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80'} 
                        alt={fav.doctor?.name} 
                        style={{ width: 54, height: 54, borderRadius: '12px', objectFit: 'cover' }} 
                      />
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.2rem' }}>
                          <Link to={`/doctors/${fav.doctor_id}`} style={{ color: 'inherit' }}>
                            {fav.doctor?.name}
                          </Link>
                        </h4>
                        <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>
                          {fav.doctor?.specialization_name}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginBottom: '1rem' }}>
                      {fav.doctor?.hospital_name} &bull; {fav.doctor?.location}
                    </p>

                    <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                      <Link to={`/doctors/${fav.doctor_id}?book=true`} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                        Book
                      </Link>
                      <button 
                        onClick={() => handleRemoveFavorite(fav.doctor_id)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--emergency)' }}
                        title="Remove from favorites"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .profile-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};
