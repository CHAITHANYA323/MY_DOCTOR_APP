import React from 'react';
import { RoleRoute } from './RoleRoute';

/**
 * ProtectedRoute component for MediConnect.
 * Maintains full backward compatibility with legacy `adminOnly={true}` calls
 * while seamlessly supporting modern `allowedRoles={['...']}` role matrices.
 */
export const ProtectedRoute = ({
  children,
  adminOnly = false,
  allowedRoles = null,
  redirectTo = null,
  requireHospital = false
}) => {
  // If legacy adminOnly is specified without explicit allowedRoles,
  // allow any administrative role (Platform Owner, Super Admin, Receptionist, Legacy Admin)
  const effectiveRoles = allowedRoles
    ? allowedRoles
    : (adminOnly ? ['PLATFORM_OWNER', 'HOSPITAL_SUPER_ADMIN', 'RECEPTIONIST', 'ADMIN'] : null);

  return (
    <RoleRoute
      allowedRoles={effectiveRoles}
      redirectTo={redirectTo}
      requireHospital={requireHospital}
    >
      {children}
    </RoleRoute>
  );
};

export default ProtectedRoute;
