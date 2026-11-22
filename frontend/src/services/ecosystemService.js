import api from './api';

export const ecosystemService = {
  // ==========================================
  // 1. Hospital Admin APIs (/api/hospital-admin)
  // ==========================================
  getHospitalAdminDashboard: async () => {
    const res = await api.get('/hospital-admin/dashboard');
    return res.data;
  },

  getHospitalAdminProfile: async () => {
    const res = await api.get('/hospital-admin/hospital-profile');
    return res.data;
  },

  updateHospitalAdminProfile: async (data) => {
    const res = await api.put('/hospital-admin/hospital-profile', data);
    return res.data;
  },

  getHospitalAdminDoctors: async () => {
    const res = await api.get('/hospital-admin/doctors');
    return res.data;
  },

  getHospitalAdminReceptionists: async () => {
    const res = await api.get('/hospital-admin/receptionists');
    return res.data;
  },

  addHospitalAdminReceptionist: async (data) => {
    const res = await api.post('/hospital-admin/receptionists', data);
    return res.data;
  },

  updateHospitalAdminReceptionistStatus: async (userId, isActive) => {
    const res = await api.post(`/hospital-admin/receptionists/${userId}/status`, { is_active: isActive });
    return res.data;
  },

  getHospitalAdminAppointments: async (params = {}) => {
    const res = await api.get('/hospital-admin/appointments', { params });
    return res.data;
  },

  updateHospitalAdminAppointmentStatus: async (appointmentId, status) => {
    const res = await api.put(`/hospital-admin/appointments/${appointmentId}/status`, { status });
    return res.data;
  },

  getHospitalAdminReports: async () => {
    const res = await api.get('/hospital-admin/reports');
    return res.data;
  },

  getHospitalAdminAccountProfile: async () => {
    const res = await api.get('/hospital-admin/profile');
    return res.data;
  },

  // ==========================================
  // 2. SuperAdmin APIs (/api/superadmin)
  // ==========================================
  getSuperadminAssignedHospitals: async () => {
    const res = await api.get('/superadmin/assigned-hospitals');
    return res.data;
  },

  getSuperadminDashboardStats: async (hospitalId = null) => {
    const params = hospitalId ? { hospital_id: hospitalId } : {};
    const res = await api.get('/superadmin/dashboard-stats', { params });
    return res.data;
  },

  getSuperadminHospitalAdmins: async (hospitalId = null, status = 'all') => {
    const params = { status };
    if (hospitalId) params.hospital_id = hospitalId;
    const res = await api.get('/superadmin/hospital-admins', { params });
    return res.data;
  },

  approveHospitalAdmin: async (userId) => {
    const res = await api.post(`/superadmin/hospital-admins/${userId}/approve`);
    return res.data;
  },

  rejectHospitalAdmin: async (userId, reason) => {
    const res = await api.post(`/superadmin/hospital-admins/${userId}/reject`, { reason });
    return res.data;
  },

  updateHospitalAdminStatus: async (userId, isActive, reason = '') => {
    const res = await api.post(`/superadmin/hospital-admins/${userId}/status`, { is_active: isActive, reason });
    return res.data;
  },

  replacePrimaryHospitalAdmin: async (hospitalId, newAdminId, reason) => {
    const res = await api.post(`/superadmin/hospitals/${hospitalId}/replace-primary-admin`, {
      new_admin_id: newAdminId,
      reason
    });
    return res.data;
  },

  getHospitalAdminHistory: async (hospitalId) => {
    const res = await api.get(`/superadmin/hospitals/${hospitalId}/admin-history`);
    return res.data;
  },

  getSuperadminVerificationCenter: async () => {
    const res = await api.get('/superadmin/verification-center');
    return res.data;
  },

  // ==========================================
  // 3. Platform Owner APIs (/api/owner)
  // ==========================================
  getPlatformOverview: async () => {
    const res = await api.get('/owner/overview');
    return res.data;
  },

  getPlatformSuperadmins: async () => {
    const res = await api.get('/owner/superadmins');
    return res.data;
  },

  getPlatformSuperadminDetails: async (userId) => {
    const res = await api.get(`/owner/superadmins/${userId}`);
    return res.data;
  },

  createSuperadmin: async (data) => {
    const res = await api.post('/owner/superadmins', data);
    return res.data;
  },

  assignHospitalsToSuperadmin: async (userId, hospitalIds, notes = '') => {
    const res = await api.post(`/owner/superadmins/${userId}/assign-hospitals`, {
      hospital_ids: hospitalIds,
      notes
    });
    return res.data;
  },

  removeHospitalFromSuperadmin: async (userId, hospitalId, reason = '') => {
    const res = await api.post(`/owner/superadmins/${userId}/remove-hospital`, {
      hospital_id: hospitalId,
      reason
    });
    return res.data;
  },

  reassignHospital: async (hospitalId, fromSuperadminId, toSuperadminId, reason = '') => {
    const res = await api.post('/owner/superadmins/reassign-hospital', {
      hospital_id: hospitalId,
      from_superadmin_id: fromSuperadminId,
      to_superadmin_id: toSuperadminId,
      reason
    });
    return res.data;
  },

  updateSuperadminStatus: async (userId, isActive, reason = '') => {
    const res = await api.post(`/owner/superadmins/${userId}/status`, {
      is_active: isActive,
      reason
    });
    return res.data;
  },

  getPlatformHospitalAdmins: async (params = {}) => {
    const res = await api.get('/owner/hospital-admins', { params });
    return res.data;
  },

  getPlatformAuditLogs: async (params = {}) => {
    const res = await api.get('/owner/audit-logs', { params });
    return res.data;
  },

  getPlatformAnalytics: async () => {
    const res = await api.get('/owner/analytics');
    return res.data;
  }
};
