import React, { forwardRef } from 'react';

/**
 * Universal Button component with accessible focus states,
 * WCAG-compliant color contrasts, and loading state indicators.
 */
export const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon = null,
  iconRight = null,
  type = 'button',
  onClick,
  children,
  className = '',
  style = {},
  ...rest
}, ref) => {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    emergency: 'btn-emergency',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  }[variant] || 'btn-primary';

  const sizeClass = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
  }[size] || 'btn-md';

  const classes = [
    'btn',
    variantClass,
    sizeClass,
    fullWidth ? 'btn-full-width' : '',
    loading ? 'btn-loading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      aria-disabled={disabled || loading ? 'true' : undefined}
      onClick={loading || disabled ? undefined : onClick}
      className={classes}
      style={style}
      {...rest}
    >
      {loading && (
        <svg
          className="btn-spinner"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ opacity: 0.25 }}
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )}
      {!loading && icon && <span className="btn-icon-left" aria-hidden="true">{icon}</span>}
      <span className="btn-content">{children}</span>
      {!loading && iconRight && <span className="btn-icon-right" aria-hidden="true">{iconRight}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;

