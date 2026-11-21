import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaHospitalSymbol } from 'react-icons/fa';
import { useLanguage } from '../../context/LanguageContext';

const DEFAULT_TAGLINES_EN = [
  'Your Health, Our Priority',
  'Connected Care, Better Health',
  'Trusted Digital Healthcare'
];

const DEFAULT_TAGLINES_TE = [
  'మీ ఆరోగ్యం, మా ప్రాధాన్యత',
  'అనుసంధానిత సంరక్షణ, మెరుగైన ఆరోగ్యం',
  'విశ్వసనీయ డిజిటల్ ఆరోగ్య సంరక్షణ'
];

/**
 * MediConnectBrand
 * 
 * Reusable, premium healthcare brand identity component.
 * Features:
 * - Animated heartbeat / ECG pulse line integrated with the logo
 * - Smooth rotating healthcare tagline with bilingual English & Telugu support
 * - Subtle medical glow & hover interaction
 * - Zero layout shift (preserves existing header height)
 * - Full support for 'prefers-reduced-motion'
 * - Responsive scaling for desktop, tablet, mobile, and collapsed sidebar
 */
export const MediConnectBrand = ({
  to = '/',
  theme = 'light', // 'light' (white header) | 'dark' (navy/slate sidebar)
  size = 'md',     // 'sm' | 'md' | 'lg'
  variant = 'navbar', // 'navbar' | 'sidebar' | 'welcome'
  subtitle = null, // Custom subtitle override if provided
  showTagline = true,
  showPulseLine = true,
  isCollapsed = false,
  badgeIcon = null,
  badgeGradient = null,
  onClick = undefined,
  className = '',
  ariaLabel = 'MediConnect Healthcare Platform Home'
}) => {
  const { t, language, isTelugu } = useLanguage();
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check user's reduced-motion preference
  useEffect(() => {
    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e) => setPrefersReducedMotion(e.matches);
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(listener);
        return () => mediaQuery.removeListener(listener);
      }
    } catch (_) {}
  }, []);

  // Retrieve bilingual taglines
  const taglines = useMemo(() => {
    const fromTranslations = t('brand.taglines');
    if (Array.isArray(fromTranslations) && fromTranslations.length > 0) {
      return fromTranslations;
    }
    return isTelugu ? DEFAULT_TAGLINES_TE : DEFAULT_TAGLINES_EN;
  }, [t, isTelugu]);

  // Rotate tagline smoothly every 3.6s (pause if hovered or reduced motion)
  useEffect(() => {
    if (prefersReducedMotion || isHovered || !showTagline || subtitle) {
      return;
    }

    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % taglines.length);
    }, 3600);

    return () => clearInterval(interval);
  }, [prefersReducedMotion, isHovered, showTagline, subtitle, taglines.length]);

  // Keep index within bounds if language changes length
  useEffect(() => {
    if (taglineIndex >= taglines.length) {
      setTaglineIndex(0);
    }
  }, [taglines.length, taglineIndex]);

  // Determine current display tagline
  const currentTagline = subtitle || taglines[taglineIndex] || (isTelugu ? 'హెల్త్‌కేర్ ప్లాట్‌ఫామ్' : 'Healthcare Platform');

  // Dimension scaling
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          logoSize: 34,
          iconSize: 18,
          titleSize: '1.15rem',
          taglineSize: '0.64rem',
          ecgWidth: 32,
          ecgHeight: 13,
          gap: '0.55rem'
        };
      case 'lg':
        return {
          logoSize: 48,
          iconSize: 26,
          titleSize: '1.65rem',
          taglineSize: '0.78rem',
          ecgWidth: 46,
          ecgHeight: 16,
          gap: '0.85rem'
        };
      case 'md':
      default:
        return {
          logoSize: 38,
          iconSize: 20,
          titleSize: '1.35rem',
          taglineSize: '0.68rem',
          ecgWidth: 38,
          ecgHeight: 14,
          gap: '0.65rem'
        };
    }
  }, [size]);

  const isDark = theme === 'dark';
  const defaultGradient = isDark
    ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
    : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';

  const titleColorPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const titleColorAccent = isDark ? '#38BDF8' : '#0284C7';
  const tagColor = isDark ? '#94A3B8' : '#64748B';
  const ecgStrokeColor = isDark ? '#38BDF8' : '#0284C7';

  // If in collapsed sidebar mode, render only the pulsing logo mark with accessible tooltip
  if (isCollapsed) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`mediconnect-brand-root is-collapsed ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          position: 'relative'
        }}
        title={`MediConnect - ${currentTagline}`}
        aria-label={ariaLabel}
      >
        <div
          className="mediconnect-brand-logo-badge"
          style={{
            width: sizeConfig.logoSize,
            height: sizeConfig.logoSize,
            borderRadius: '10px',
            background: badgeGradient || defaultGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            position: 'relative',
            flexShrink: 0,
            boxShadow: isDark
              ? '0 4px 14px rgba(2, 132, 199, 0.4)'
              : '0 3px 10px rgba(2, 132, 199, 0.3)'
          }}
        >
          {badgeIcon || <FaHospitalSymbol size={sizeConfig.iconSize} aria-hidden="true" />}
          {/* Subtle heartbeat pulse ring */}
          <span className="mediconnect-pulse-ring" aria-hidden="true" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`mediconnect-brand-root ${isDark ? 'theme-dark' : 'theme-light'} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeConfig.gap,
        textDecoration: 'none',
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
        lineHeight: 1
      }}
      aria-label={`${ariaLabel} - ${currentTagline}`}
    >
      {/* 1. Premium Logo Mark with Heartbeat Aura */}
      <div
        className="mediconnect-brand-logo-badge"
        style={{
          width: sizeConfig.logoSize,
          height: sizeConfig.logoSize,
          borderRadius: size === 'lg' ? '13px' : '10px',
          background: badgeGradient || defaultGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          position: 'relative',
          flexShrink: 0,
          boxShadow: isDark
            ? '0 4px 14px rgba(2, 132, 199, 0.38)'
            : '0 3px 10px rgba(2, 132, 199, 0.28)',
          transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease'
        }}
      >
        {badgeIcon || <FaHospitalSymbol size={sizeConfig.iconSize} aria-hidden="true" />}
        {/* Subtle Heartbeat Pulse Ring Aura */}
        <span className="mediconnect-pulse-ring" aria-hidden="true" />
      </div>

      {/* 2. Brand Typography, Integrated ECG Pulse Line & Rotating Tagline */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
        {/* Top row: Brand Name + Subtle ECG Pulse Wave */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span
            className="mediconnect-brand-title"
            style={{
              fontSize: sizeConfig.titleSize,
              fontWeight: 900,
              letterSpacing: '-0.025em',
              color: titleColorPrimary,
              lineHeight: 1.15,
              whiteSpace: 'nowrap'
            }}
          >
            Medi<span style={{ color: titleColorAccent }}>Connect</span>
          </span>

          {/* Subtle animated Heartbeat/ECG line integrated beside the title */}
          {showPulseLine && (
            <div
              className="mediconnect-ecg-container"
              title="24/7 Active Healthcare Connectivity"
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: sizeConfig.ecgHeight,
                color: ecgStrokeColor
              }}
            >
              <svg
                width={sizeConfig.ecgWidth}
                height={sizeConfig.ecgHeight}
                viewBox="0 0 38 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mediconnect-ecg-svg"
                style={{ overflow: 'visible' }}
              >
                {/* Background resting pulse line */}
                <path
                  d="M 1 7 L 8 7 L 11 2 L 14 12 L 17 4 L 20 10 L 23 7 L 37 7"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isDark ? 0.3 : 0.22}
                />
                {/* Active animated heartbeat pulse line */}
                <path
                  d="M 1 7 L 8 7 L 11 2 L 14 12 L 17 4 L 20 10 L 23 7 L 37 7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mediconnect-ecg-wave"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Bottom row: Rotating Tagline / Healthcare Identity Element */}
        {showTagline && (
          <div
            className="mediconnect-tagline-wrap"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              height: '16px',
              overflow: 'hidden',
              marginTop: '1px'
            }}
          >
            {/* Live healthcare pulse status dot */}
            <span
              className="mediconnect-live-dot"
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: isDark ? '#38BDF8' : '#0284C7',
                flexShrink: 0
              }}
              aria-hidden="true"
            />

            {/* Rotating tagline text container with smooth fade transition */}
            <span
              key={currentTagline}
              className="mediconnect-rotating-tagline"
              style={{
                fontSize: sizeConfig.taglineSize,
                fontWeight: 700,
                color: tagColor,
                letterSpacing: '0.04em',
                textTransform: subtitle ? 'uppercase' : 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-block',
                lineHeight: '16px'
              }}
            >
              {currentTagline}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default MediConnectBrand;
