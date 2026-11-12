import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { authService } from '../services/authService';
import {
  ROLES,
  ROLE_LABELS,
  normalizeRole,
  getRoleDashboardPath,
  hasRole as checkHasRole,
  isPlatformOwnerRole,
  isHospitalSuperAdminRole,
  isReceptionistRole,
  isDoctorRole,
  isPatientRole,
  isAnyAdminRole,
} from '../utils/roleUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getStoredUser());
  const [token, setToken] = useState(() => authService.getStoredToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = authService.getStoredToken();
      if (storedToken) {
        try {
          const res = await authService.getCurrentUser();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('medicare_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err);
          authService.logout();
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials, expectedRole = null) => {
    const res = await authService.login(credentials);
    if (res.success && res.user) {
      const rawUserRole = res.user.role;
      const normalizedUserRole = normalizeRole(rawUserRole);

      // If caller passed expectedRole, enforce defensive matching
      if (expectedRole) {
        const normalizedExpected = normalizeRole(expectedRole);

        // Explicit handling for ADMIN accounts:
        // Do NOT automatically convert ADMIN to PLATFORM_OWNER, HOSPITAL_SUPER_ADMIN, or RECEPTIONIST
        if (rawUserRole === ROLES.ADMIN) {
          if (expectedRole !== ROLES.ADMIN) {
            authService.logout();
            return {
              success: false,
              roleMismatch: true,
              authenticatedRole: ROLES.ADMIN,
              rawRole: rawUserRole,
              message: `Hospital Administrator account detected. This account cannot access the ${ROLE_LABELS[normalizedExpected] || expectedRole} portal. Please switch to the Hospital Admin portal to sign in.`,
            };
          }
        } else if (normalizedUserRole !== normalizedExpected) {
          // Role mismatch: clear token immediately and deny access
          authService.logout();
          return {
            success: false,
            roleMismatch: true,
            authenticatedRole: normalizedUserRole,
            rawRole: rawUserRole,
            message: `Account role mismatch: You selected "${ROLE_LABELS[normalizedExpected] || expectedRole}", but your account is registered as "${ROLE_LABELS[normalizedUserRole] || rawUserRole}". Please switch to the correct portal tab to sign in.`,
          };
        }
      }

      setUser(res.user);
      setToken(res.token);
    }
    return res;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    // Do NOT automatically log in after registration. User must manually log in.
    return res;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const updateUser = (updatedUserData) => {
    setUser(updatedUserData);
    localStorage.setItem('medicare_user', JSON.stringify(updatedUserData));
  };

  const role = user?.role ? normalizeRole(user.role) : null;
  const rawRole = user?.role || null;
  const isAuthenticated = !!token && !!user;

  // Multi-role capability flags
  const isPlatformOwner = isPlatformOwnerRole(rawRole);
  const isHospitalSuperAdmin = isHospitalSuperAdminRole(rawRole);
  const isReceptionist = isReceptionistRole(rawRole);
  const isDoctor = isDoctorRole(rawRole);
  const isPatient = isPatientRole(rawRole);

  // Legacy admin flag maintained for backward compatibility with existing components
  const isAdmin = isAnyAdminRole(rawRole);

  // Hospital tenant scoping
  const hospitalId = user?.hospital_id || null;
  const hospitalName = user?.hospital_name || null;

  // Role dashboard navigation target
  const dashboardPath = getRoleDashboardPath(rawRole);

  // Dynamic role checker
  const hasRole = useCallback(
    (allowedRoles) => checkHasRole(rawRole, allowedRoles),
    [rawRole]
  );

  const mustChangePassword = !!user?.must_change_password;

  const changePassword = async (data) => {
    const res = await authService.changePassword(data);
    if (res.success && res.user) {
      setUser(res.user);
      if (res.token) setToken(res.token);
    }
    return res;
  };

  const contextValue = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated,
    mustChangePassword,
    role,
    rawRole,
    isPlatformOwner,
    isHospitalSuperAdmin,
    isReceptionist,
    isDoctor,
    isPatient,
    isAdmin,
    hospitalId,
    hospitalName,
    dashboardPath,
    hasRole,
    login,
    register,
    logout,
    updateUser,
    changePassword,
  }), [
    user,
    token,
    loading,
    isAuthenticated,
    mustChangePassword,
    role,
    rawRole,
    isPlatformOwner,
    isHospitalSuperAdmin,
    isReceptionist,
    isDoctor,
    isPatient,
    isAdmin,
    hospitalId,
    hospitalName,
    dashboardPath,
    hasRole,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
