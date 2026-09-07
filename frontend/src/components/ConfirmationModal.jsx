import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

export const ConfirmationModal = ({ 
  isOpen, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?", 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  isDanger = true,
  loading = false,
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '440px', padding: '1.75rem' }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: isDanger ? 'var(--emergency-light)' : 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDanger ? 'var(--emergency)' : 'var(--primary)'
            }}>
              <FaExclamationTriangle size={18} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-900)' }}>
              {title}
            </h3>
          </div>
          <button 
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'var(--slate-400)', cursor: 'pointer', padding: '0.25rem' }}
          >
            <FaTimes size={16} />
          </button>
        </div>

        <p style={{ fontSize: '0.92rem', color: 'var(--slate-600)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
          {message}
        </p>

        <div className="flex items-center justify-between gap-3">
          <button 
            type="button" 
            onClick={onCancel} 
            disabled={loading}
            className="btn btn-secondary" 
            style={{ flex: 1 }}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            disabled={loading}
            className={`btn ${isDanger ? 'btn-emergency' : 'btn-primary'}`} 
            style={{ flex: 1 }}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
