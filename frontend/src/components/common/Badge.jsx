import React from 'react';

/**
 * Verified status mapping dictionary based strictly on backend database enums:
 * - Appointment: Pending, Confirmed, Completed, Cancelled
 * - Ambulance: Available, On Duty, Maintenance
 * - AmbulanceRequest: Pending, Dispatched, Arrived, Completed, Cancelled
 * - Doctor: Active, Inactive
 * - User: USER, ADMIN
 */
const STATUS_TO_VARIANT = {
  // Success (Green)
  Available: 'success',
  Confirmed: 'success',
  Completed: 'success',
  Active: 'success',

  // Warning (Amber)
  Pending: 'warning',
  Arrived: 'warning',

  // Danger (Red)
  Cancelled: 'danger',
  Emergency: 'danger',

  // Info / Primary (Blue)
  Dispatched: 'info',
  'On Duty': 'info',
  ADMIN: 'info',

  // Neutral (Slate)
  Inactive: 'neutral',
  Maintenance: 'neutral',
  USER: 'neutral',
};

/**
 * Universal accessible status Badge component with verified WCAG contrast.
 */
export const Badge = ({
  variant,
  status,
  size = 'md',
  dot = false,
  icon = null,
  children,
  className = '',
  style = {},
  ...rest
}) => {
  // Derive variant from status or string children if not explicitly specified
  const effectiveStatus = status || (typeof children === 'string' ? children.trim() : '');
  const resolvedVariant = variant || STATUS_TO_VARIANT[effectiveStatus] || 'neutral';

  const variantClass = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    primary: 'badge-primary',
    neutral: 'badge-neutral',
  }[resolvedVariant] || 'badge-neutral';

  const sizeClass = size === 'sm' ? 'badge-sm' : 'badge-md';

  const classes = [
    'badge',
    variantClass,
    sizeClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} style={style} {...rest}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {icon && <span className="badge-icon" aria-hidden="true">{icon}</span>}
      <span className="badge-label">{children || status}</span>
    </span>
  );
};

export default Badge;

