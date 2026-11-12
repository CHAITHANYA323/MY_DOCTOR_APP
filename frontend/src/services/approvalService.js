import api from './api';

export const approvalService = {
  // Hospital Super Admin Approvals
  getHospitalApprovals: async (status = 'pending') => {
    const res = await api.get(`/hospital/approvals?status=${encodeURIComponent(status)}`);
    return res.data;
  },

  approveHospitalStaff: async (userId) => {
    const res = await api.post(`/hospital/approvals/${userId}/approve`);
    return res.data;
  },

  rejectHospitalStaff: async (userId, reason = '') => {
    const res = await api.post(`/hospital/approvals/${userId}/reject`, { reason });
    return res.data;
  },

  // Platform Owner Super Admin Approvals
  getPlatformApprovals: async (status = 'pending') => {
    const res = await api.get(`/platform/approvals?status=${encodeURIComponent(status)}`);
    return res.data;
  },

  approveSuperAdminRequest: async (userId, payload = {}) => {
    const res = await api.post(`/platform/approvals/${userId}/approve`, payload);
    return res.data;
  },

  rejectSuperAdminRequest: async (userId, reason = '') => {
    const res = await api.post(`/platform/approvals/${userId}/reject`, { reason });
    return res.data;
  },

  // Public Role Registration Request
  submitRegistrationRequest: async (data) => {
    const res = await api.post('/auth/register-request', data);
    return res.data;
  }
};

