import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import { Modal } from './common/Modal';
import { Button } from './common/Button';

/**
 * Accessible confirmation dialog composing Modal and Button atoms.
 * Preserves 100% backward compatibility with all existing functional contracts.
 */
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
  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onCancel}
      title={title}
      size="sm"
      showCloseBtn={!loading}
      closeOnOverlay={!loading}
      closeOnEsc={!loading}
      contentStyle={{ maxWidth: '440px', padding: '1.75rem' }}
    >
      <div className="flex items-start gap-3" style={{ marginBottom: '1.25rem' }}>
        <div 
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            backgroundColor: isDanger ? 'var(--emergency-light, #fef2f2)' : 'var(--primary-light, #e0f2fe)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDanger ? 'var(--emergency, #dc2626)' : 'var(--primary-dark, #0369a1)',
            flexShrink: 0
          }}
          aria-hidden="true"
        >
          <FaExclamationTriangle size={18} />
        </div>
        <p style={{ 
          fontSize: '0.95rem', 
          color: 'var(--slate-700, #334155)', 
          lineHeight: 1.55,
          margin: 0,
          paddingTop: '0.2rem'
        }}>
          {message}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3" style={{ marginTop: '1.5rem' }}>
        <Button 
          type="button" 
          variant="secondary"
          onClick={onCancel} 
          disabled={loading}
          style={{ minWidth: '100px' }}
        >
          {cancelText}
        </Button>
        <Button 
          type="button" 
          variant={isDanger ? "danger" : "primary"}
          onClick={onConfirm} 
          loading={loading}
          style={{ minWidth: '120px' }}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
