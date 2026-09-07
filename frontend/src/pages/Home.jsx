import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaHospitalSymbol, 
  FaSignInAlt, 
  FaUserPlus, 
  FaShieldAlt,
  FaHeartbeat
} from 'react-icons/fa';

export const Home = () => {
  const { isAuthenticated } = useAuth();

  // Once authenticated, there is NO Home section in the application; redirect directly to /doctors
  if (isAuthenticated) {
    return <Navigate to="/doctors" replace />;
  }
  return (
    <div style={{
      minHeight: 'calc(100vh - 74px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '3rem 1.25rem',
      background: 'radial-gradient(ellipse at top, #f0f9ff 0%, #e0f2fe 35%, #ffffff 100%)'
    }}>
      {/* Ambient Decorative Medical Lighting / Glow */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '640px',
        height: '640px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(2, 132, 199, 0.09) 0%, rgba(13, 148, 136, 0.04) 45%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main Centered Welcome Card */}
      <div style={{
        maxWidth: '720px',
        width: '100%',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        animation: 'welcomeFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* MediConnect Brand Icon / Logo */}
        <div style={{
          width: '92px',
          height: '92px',
          borderRadius: '26px',
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 14px 32px rgba(2, 132, 199, 0.35), 0 4px 12px rgba(2, 132, 199, 0.2)',
          marginBottom: '2rem',
          border: '3px solid rgba(255, 255, 255, 0.9)'
        }}>
          <FaHospitalSymbol size={46} />
        </div>

        {/* Welcome Text Section */}
        <div style={{ marginBottom: '2.75rem' }}>
          <span style={{
            display: 'block',
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--slate-500)',
            marginBottom: '0.75rem'
          }}>
            Welcome To
          </span>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 6.5vw, 4rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '0.65rem'
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>
              MEDICONNECT
            </span>
          </h1>

          <span style={{
            display: 'block',
            fontSize: 'clamp(1.15rem, 3.2vw, 1.65rem)',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--slate-700)'
          }}>
            Healthcare Platform
          </span>
        </div>

        {/* Action Buttons: Login & Register */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
          marginBottom: '2.5rem'
        }}>
          <Link
            to="/login"
            className="btn btn-primary"
            style={{
              minWidth: '165px',
              padding: '0.95rem 2.25rem',
              fontSize: '1.05rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-full)',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <FaSignInAlt size={16} /> Login
          </Link>

          <Link
            to="/register"
            className="btn btn-outline"
            style={{
              minWidth: '165px',
              padding: '0.95rem 2.25rem',
              fontSize: '1.05rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              textDecoration: 'none',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease'
            }}
          >
            <FaUserPlus size={16} /> Register
          </Link>
        </div>

        {/* Subtle Reassurance Micro-Tag */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.45rem 1.1rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          border: '1px solid var(--slate-200)',
          color: 'var(--slate-500)',
          fontSize: '0.82rem',
          fontWeight: 600,
          boxShadow: 'var(--shadow-xs)'
        }}>
          <FaShieldAlt color="var(--primary)" size={12} />
          <span>Secure Patient & Specialist Healthcare Portal</span>
        </div>
      </div>

      <style>{`
        @keyframes welcomeFadeIn {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
