import api from './api';

/**
 * Service for staff invitation verification, acceptance, and platform audit management.
 * Integrates directly with existing backend endpoints in routes/invitations.py.
 */
export const invitationService = {
  /**
   * Public: Verifies invitation token validity and retrieves safe metadata.
   * Endpoint: GET /api/invitations/verify/<token>
   */
  verifyInvitation: async (token) => {
    const response = await api.get(`/api/invitations/verify/${encodeURIComponent(token)}`);
    return response.data;
  },

  /**
   * Public: Atomically accepts invitation, provisioning or linking user account.
   * Endpoint: POST /api/invitations/accept
   */
  acceptInvitation: async (payload) => {
    const response = await api.post('/api/invitations/accept', payload);
    return response.data;
  },

  /**
   * Platform Owner: Creates initial Hospital Super Admin invitation.
   * Endpoint: POST /api/platform/invitations
   */
  createPlatformInvitation: async (data) => {
    const response = await api.post('/api/platform/invitations', data);
    return response.data;
  },

  /**
   * Hospital Super Admin: Creates DOCTOR or RECEPTIONIST invitation.
   * Endpoint: POST /api/hospital/invitations
   */
  createHospitalInvitation: async (data) => {
    const response = await api.post('/api/hospital/invitations', data);
    return response.data;
  },

  /**
   * Super Admin / Platform Owner: Lists pending & historical invitations.
   * Endpoint: GET /api/hospital/invitations
   */
  listInvitations: async () => {
    const response = await api.get('/api/hospital/invitations');
    return response.data;
  },

  /**
   * Super Admin / Platform Owner: Revokes an active invitation.
   * Endpoint: DELETE /api/hospital/invitations/<id>/revoke
   */
  revokeInvitation: async (invitationId) => {
    const response = await api.delete(`/api/hospital/invitations/${invitationId}/revoke`);
    return response.data;
  },

  /**
   * Platform Owner: Retrieves platform audit event logs.
   * Endpoint: GET /api/platform/audit-logs
   */
  getPlatformAuditLogs: async (params = {}) => {
    const response = await api.get('/api/platform/audit-logs', { params });
    return response.data;
  },
};

export default invitationService;
