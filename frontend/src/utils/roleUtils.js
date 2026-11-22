/**
 * Role Constants and Routing Utilities for MediConnect Multi-Hospital Platform.
 * Supports:
 * - PLATFORM_OWNER: Global platform administration (/owner)
 * - HOSPITAL_SUPER_ADMIN: Single hospital operational administration (/superadmin)
 * - RECEPTIONIST: Hospital front-desk operations, triage, check-in, appointments (/admin)
 * - DOCTOR: Clinical agenda, consultations, schedule, and profile (/doctor)
 * - PATIENT / USER: Healthcare directory and personal appointments (/patient)
 * - ADMIN: Legacy administrator (retained for backward compatibility: /admin)
 */

export const ROLES = Object.freeze({
  PLATFORM_OWNER: 'PLATFORM_OWNER',
  HOSPITAL_SUPER_ADMIN: 'HOSPITAL_SUPER_ADMIN',
  SUPERADMIN: 'HOSPITAL_SUPER_ADMIN', // Alias for SuperAdmin
  HOSPITAL_ADMIN: 'HOSPITAL_ADMIN',
  ADMIN: 'ADMIN', // Standard and legacy Hospital Admin
  RECEPTIONIST: 'RECEPTIONIST',
  DOCTOR: 'DOCTOR',
  PATIENT: 'PATIENT',
  USER: 'USER', // Legacy alias for PATIENT
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.PLATFORM_OWNER]: 'Platform Owner',
  [ROLES.HOSPITAL_SUPER_ADMIN]: 'SuperAdmin',
  [ROLES.HOSPITAL_ADMIN]: 'Hospital Admin',
  [ROLES.ADMIN]: 'Hospital Admin',
  [ROLES.RECEPTIONIST]: 'Receptionist',
  [ROLES.DOCTOR]: 'Doctor',
  [ROLES.PATIENT]: 'Patient / User',
  [ROLES.USER]: 'Patient / User',
});

export const ROLE_DASHBOARD_ROUTES = Object.freeze({
  [ROLES.PLATFORM_OWNER]: '/owner',
  [ROLES.HOSPITAL_SUPER_ADMIN]: '/superadmin',
  [ROLES.HOSPITAL_ADMIN]: '/hospital-admin',
  [ROLES.ADMIN]: '/hospital-admin',
  [ROLES.RECEPTIONIST]: '/admin',
  [ROLES.DOCTOR]: '/doctor',
  [ROLES.PATIENT]: '/patient',
  [ROLES.USER]: '/patient',
});

/**
 * Normalizes role string to standard uppercase role name.
 * Maps legacy 'USER' to 'PATIENT'.
 */
export const normalizeRole = (role) => {
  if (!role) return null;
  const upper = String(role).trim().toUpperCase();
  if (upper === ROLES.USER) return ROLES.PATIENT;
  return upper;
};

/**
 * Resolves the primary dashboard route for any given role.
 */
export const getRoleDashboardPath = (role) => {
  if (!role) return '/login';
  const upper = String(role).trim().toUpperCase();
  return ROLE_DASHBOARD_ROUTES[upper] || '/patient';
};

/**
 * Checks whether userRole matches any role in allowedRoles.
 * Handles normalization and PATIENT/USER equivalence.
 */
export const hasRole = (userRole, allowedRoles) => {
  if (!userRole) return false;
  if (!allowedRoles || allowedRoles.length === 0) return true;

  const current = normalizeRole(userRole);
  const rawAllowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const normalizedAllowed = rawAllowed.map((r) => normalizeRole(r));

  return normalizedAllowed.includes(current);
};

export const isPlatformOwnerRole = (role) => {
  return String(role || '').trim().toUpperCase() === ROLES.PLATFORM_OWNER;
};

export const isHospitalSuperAdminRole = (role) => {
  return String(role || '').trim().toUpperCase() === ROLES.HOSPITAL_SUPER_ADMIN;
};

export const isHospitalAdminRole = (role) => {
  const upper = String(role || '').trim().toUpperCase();
  return upper === ROLES.HOSPITAL_ADMIN || upper === ROLES.ADMIN;
};

export const isReceptionistRole = (role) => {
  return String(role || '').trim().toUpperCase() === ROLES.RECEPTIONIST;
};

export const isDoctorRole = (role) => {
  return String(role || '').trim().toUpperCase() === ROLES.DOCTOR;
};

export const isPatientRole = (role) => {
  const upper = String(role || '').trim().toUpperCase();
  return upper === ROLES.PATIENT || upper === ROLES.USER;
};

/**
 * Checks if the role has any administrative capabilities (legacy or modern).
 * Note: Does NOT grant global fallback access; used for UI visibility checks.
 */
export const isAnyAdminRole = (role) => {
  const upper = String(role || '').trim().toUpperCase();
  return [
    ROLES.PLATFORM_OWNER,
    ROLES.HOSPITAL_SUPER_ADMIN,
    ROLES.HOSPITAL_ADMIN,
    ROLES.ADMIN,
    ROLES.RECEPTIONIST,
  ].includes(upper);
};
