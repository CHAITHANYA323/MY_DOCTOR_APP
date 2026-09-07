import React from 'react';
import { FaHospitalSymbol } from 'react-icons/fa';

export const Footer = () => {
  return (
    <footer style={{
      backgroundColor: 'var(--slate-900)',
      color: 'var(--slate-400)',
      padding: '1.25rem 1rem',
      borderTop: '1px solid var(--slate-800)',
      marginTop: 'auto'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: 26,
            height: 26,
            borderRadius: '7px',
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <FaHospitalSymbol size={13} />
          </div>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>
            Medi<span style={{ color: 'var(--primary)' }}>Connect</span>
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--slate-400)', marginLeft: '0.25rem' }}>
            Healthcare Platform
          </span>
        </div>

        {/* Copyright */}
        <div style={{ fontSize: '0.82rem', color: 'var(--slate-400)' }}>
          &copy; 2026 MediConnect. All rights reserved.
        </div>

        {/* Legal Links */}
        <div style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span style={{ color: 'var(--slate-400)' }}>Privacy Policy</span>
          <span style={{ color: 'var(--slate-600)' }}>|</span>
          <span style={{ color: 'var(--slate-400)' }}>Terms of Service</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
