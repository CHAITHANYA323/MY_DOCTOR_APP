import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaUserMd, FaHospitalSymbol } from 'react-icons/fa';
import { Button } from '../components/common/Button';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.25rem',
      textAlign: 'center'
    }}>
      <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '3.5rem 2rem', borderRadius: 'var(--radius-xl)' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '20px',
          background: 'linear-gradient(135deg, var(--primary, #0284c7), var(--primary-hover, #0369a1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          margin: '0 auto 1.5rem',
          boxShadow: '0 8px 20px rgba(2, 132, 199, 0.3)'
        }}>
          <FaHospitalSymbol size={32} aria-hidden="true" />
        </div>

        <h1 style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--slate-900)', lineHeight: 1 }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0.75rem 0' }}>
          Page Not Found
        </h2>
        <p style={{ color: 'var(--slate-600)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          The medical resource or page you are looking for might have been moved, renamed, or is temporarily unavailable.
        </p>

        <div className="flex items-center justify-center gap-3" style={{ flexWrap: 'wrap' }}>
          <Button 
            variant="primary" 
            onClick={() => navigate('/')}
            icon={<FaHome aria-hidden="true" />}
          >
            Back to Home
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => navigate('/doctors')}
            icon={<FaUserMd aria-hidden="true" />}
          >
            Find Doctors
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
