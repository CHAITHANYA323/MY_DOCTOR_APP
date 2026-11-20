import React, { useState, useEffect } from 'react';
import {
  FaTimes,
  FaArrowRight,
  FaArrowLeft,
  FaCheck,
  FaLightbulb
} from 'react-icons/fa';

/**
 * FirstTimeGuideModal
 * A guided onboarding walkthrough modal for new Hospital Super Admins and Platform Owners.
 * Explains dashboard sections, workflow steps, and best practices.
 */
export const FirstTimeGuideModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  steps = [],
  storageKey,
  btnNextText = 'Next',
  btnPrevText = 'Back',
  btnFinishText = 'Got It, Let’s Start',
  btnSkipText = 'Skip Guide'
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleDismiss();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !steps || steps.length === 0) return null;

  const handleDismiss = () => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, 'true');
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }
    }
    onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const activeStepData = steps[currentStep] || steps[0];
  const isLast = currentStep === steps.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '560px',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary, #0284c7)'
                }}
              />
              <span
                id="guide-modal-title"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--primary, #0284c7)'
                }}
              >
                {title || 'Walkthrough Guide'}
              </span>
            </div>
            {subtitle && (
              <p
                style={{
                  fontSize: '0.78rem',
                  color: '#64748b',
                  margin: '0.2rem 0 0 0'
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close guide"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div
          style={{
            display: 'flex',
            gap: '0.35rem',
            padding: '0.75rem 1.5rem 0.25rem',
            justifyContent: 'center'
          }}
        >
          {steps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              aria-label={`Go to step ${idx + 1}`}
              style={{
                height: '5px',
                borderRadius: '3px',
                flex: 1,
                border: 'none',
                cursor: 'pointer',
                backgroundColor:
                  idx === currentStep
                    ? 'var(--primary, #0284c7)'
                    : idx < currentStep
                    ? '#93c5fd'
                    : '#e2e8f0',
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          {/* Step Icon & Title Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                backgroundColor: activeStepData.colorBg || '#e0f2fe',
                color: activeStepData.colorFg || '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                flexShrink: 0
              }}
            >
              {activeStepData.icon}
            </div>
            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                Step {currentStep + 1} of {steps.length}
              </span>
              <h2
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: '0.2rem 0 0 0',
                  lineHeight: 1.3
                }}
              >
                {activeStepData.title}
              </h2>
            </div>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: '0.92rem',
              color: '#334155',
              lineHeight: 1.55,
              margin: 0
            }}
          >
            {activeStepData.description}
          </p>

          {/* Tip Callout */}
          {activeStepData.tip && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px'
              }}
            >
              <FaLightbulb color="#15803d" size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '0.82rem', color: '#166534', lineHeight: 1.45, fontWeight: 500 }}>
                {activeStepData.tip}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            backgroundColor: '#fafafa'
          }}
        >
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px'
            }}
          >
            {btnSkipText}
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <FaArrowLeft size={11} /> {btnPrevText}
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1.15rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--primary, #0284c7)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
              }}
            >
              {isLast ? (
                <>
                  <FaCheck size={12} /> {btnFinishText}
                </>
              ) : (
                <>
                  {btnNextText} <FaArrowRight size={11} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirstTimeGuideModal;

