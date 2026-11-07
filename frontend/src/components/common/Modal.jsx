import React, { useEffect, useRef, useId, useCallback } from 'react';
import { FaTimes } from 'react-icons/fa';

// Module-level stack tracking open dialog instances and preserving scroll position
const modalStack = [];
let savedScrollY = 0;

const lockBodyScroll = () => {
  if (modalStack.length === 1) {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }
};

const unlockBodyScroll = () => {
  if (modalStack.length === 0) {
    const top = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    const scrollY = parseInt(top || '0', 10) * -1;
    window.scrollTo(0, scrollY || savedScrollY || 0);
  }
};

/**
 * Accessible Modal dialog component with focus trapping,
 * Escape key dismissal, focus restoration, and nested dialog stack management.
 */
export const Modal = ({
  isOpen = false,
  onClose,
  title,
  children,
  size = 'md',
  showCloseBtn = true,
  closeOnOverlay = true,
  closeOnEsc = true,
  ariaLabel,
  className = '',
  contentStyle = {},
}) => {
  const modalId = useId();
  const titleId = `${modalId}-title`;
  const dialogRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Determine whether this modal instance is the topmost active dialog
  const isTopmost = useCallback(() => {
    return modalStack[modalStack.length - 1] === modalId;
  }, [modalId]);

  // Lifecycle for modal registration, focus restoration, and scroll locking
  useEffect(() => {
    if (!isOpen) return;

    // Capture the trigger element that opened the dialog
    previousActiveElement.current = document.activeElement;

    // Register into modal stack
    modalStack.push(modalId);
    lockBodyScroll();

    // Focus the modal dialog container or first interactive element
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      const index = modalStack.indexOf(modalId);
      if (index > -1) {
        modalStack.splice(index, 1);
      }
      unlockBodyScroll();

      // Programmatically restore focus to the triggering element
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, modalId]);

  // Keyboard navigation: Escape key & focus trapping on the topmost modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (!isTopmost()) return;

      // Escape key dismissal
      if (e.key === 'Escape' && closeOnEsc) {
        e.stopPropagation();
        if (onClose) onClose();
        return;
      }

      // Keyboard focus trap on Tab
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === dialogRef.current) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, isTopmost, onClose]);

  if (!isOpen) return null;

  const stackIndex = modalStack.indexOf(modalId);
  const zIndex = 1050 + Math.max(0, stackIndex) * 10;

  const sizeClass = {
    sm: 'modal-sm',
    md: 'modal-md',
    lg: 'modal-lg',
    xl: 'modal-xl',
  }[size] || 'modal-md';

  const handleOverlayClick = (e) => {
    if (closeOnOverlay && e.target === e.currentTarget && isTopmost()) {
      if (onClose) onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{ zIndex }}
      onClick={handleOverlayClick}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel || 'Dialog' : undefined}
        tabIndex={-1}
        className={`modal-content ${sizeClass} ${className}`}
        style={contentStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseBtn) && (
          <div className="modal-header">
            {title ? (
              <h3 id={titleId} className="modal-title">
                {title}
              </h3>
            ) : <div />}

            {showCloseBtn && (
              <button
                type="button"
                onClick={onClose}
                className="modal-close-btn"
                aria-label="Close dialog"
              >
                <FaTimes size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

