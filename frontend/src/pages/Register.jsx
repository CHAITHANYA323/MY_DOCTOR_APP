import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaHospitalSymbol, FaUser, FaEnvelope, FaPhoneAlt, FaLock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../services/api';
import { Button } from '../components/common/Button';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    // 1. Missing required fields
    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    // 2. Email format validation
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    // 3. Phone number validation (if provided)
    if (trimmedPhone) {
      const phoneDigits = trimmedPhone.replace(/\D/g, '');
      const validPhoneFormat = /^\+?[0-9\s\-()]+$/.test(trimmedPhone);
      if (phoneDigits.length < 7 || phoneDigits.length > 15 || !validPhoneFormat) {
        setError('Please enter a valid phone number.');
        return;
      }
    }

    // 4. Password mismatch check
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // 5. Password minimum length check
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        password,
        confirm_password: confirmPassword,
        role: 'USER'
      });

      if (res && (res.status === 201 || res.success)) {
        setError('');
        const successMessage = res.message || 'Account created successfully!';
        setSuccess(successMessage);
        // Clear the form fields upon successful registration
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          navigate('/login', { state: { message: successMessage, suggestedRole: 'PATIENT' } });
        }, 1500);
      } else {
        setSuccess('');
        setError(res?.message || 'Unable to create account. Please try again later.');
      }
    } catch (err) {
      setSuccess('');
      setError(getApiErrorMessage(err, 'Unable to create account. Please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.25rem'
    }}>
      <div className="card" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--slate-200)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '14px',
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
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Create Patient Account
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
            Join thousands of patients managing appointments and healthcare records
          </p>
        </div>

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
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <div style={{ position: 'relative' }}>
              <FaUser style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input 
                type="text" 
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email Address *</label>
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
              />
            </div>
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label">Contact Phone</label>
            <div style={{ position: 'relative' }}>
              <FaPhoneAlt style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
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

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password *</label>
            <div style={{ position: 'relative' }}>
              <FaLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input 
                type="password" 
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label">Confirm Password *</label>
            <div style={{ position: 'relative' }}>
              <FaLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input 
                type="password" 
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
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
            Register Account
          </Button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--slate-500)', marginTop: '1.75rem' }}>
          Already registered?{' '}
          <Link to="/login" state={{ suggestedRole: 'PATIENT' }} style={{ color: 'var(--primary)', fontWeight: 700 }}>
            Login as Patient
          </Link>
        </p>
      </div>
    </div>
  );
};
