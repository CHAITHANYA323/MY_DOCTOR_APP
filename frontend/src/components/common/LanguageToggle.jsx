import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { FaGlobe } from 'react-icons/fa';

/**
 * Reusable Language Toggle component for MediConnect.
 * Allows quick switching between Telugu ('te', default) and English ('en').
 * 
 * Props:
 * - size: 'sm' (default, compact for headers/sidebars) | 'md' (hero/cards)
 * - showIcon: boolean (default true)
 * - className: optional extra class string
 */
export const LanguageToggle = ({ size = 'sm', showIcon = true, className = '' }) => {
  const { language, setLanguage } = useLanguage();

  const isSmall = size === 'sm';

  const containerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '9999px',
    padding: isSmall ? '2px' : '4px',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
    gap: '2px',
    userSelect: 'none',
    zIndex: 10
  };

  const getBtnStyle = (langCode) => {
    const isActive = language === langCode;
    return {
      border: 'none',
      outline: 'none',
      cursor: 'pointer',
      padding: isSmall ? '0.28rem 0.65rem' : '0.45rem 0.95rem',
      borderRadius: '9999px',
      fontSize: isSmall ? '0.78rem' : '0.88rem',
      fontWeight: isActive ? 700 : 500,
      backgroundColor: isActive ? '#0284c7' : 'transparent',
      color: isActive ? '#ffffff' : '#475569',
      transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      lineHeight: 1.4,
      boxShadow: isActive ? '0 2px 6px rgba(2, 132, 199, 0.35)' : 'none'
    };
  };

  return (
    <div
      className={`language-toggle-group ${className}`}
      style={containerStyle}
      role="group"
      aria-label="Language selector / భాష ఎంపిక"
    >
      {showIcon && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            color: '#0284c7',
            paddingLeft: isSmall ? '0.4rem' : '0.6rem',
            paddingRight: '0.15rem'
          }}
          aria-hidden="true"
        >
          <FaGlobe size={isSmall ? 12 : 15} />
        </span>
      )}

      <button
        type="button"
        onClick={() => setLanguage('te')}
        style={getBtnStyle('te')}
        aria-pressed={language === 'te'}
        aria-label="తెలుగు భాషను ఎంచుకోండి"
      >
        తెలుగు
      </button>

      <button
        type="button"
        onClick={() => setLanguage('en')}
        style={getBtnStyle('en')}
        aria-pressed={language === 'en'}
        aria-label="Select English language"
      >
        English
      </button>
    </div>
  );
};

export default LanguageToggle;

