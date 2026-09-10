import api from './api';

export const ambulanceService = {
  getAmbulances: async (params = {}) => {
    const response = await api.get('/api/ambulances', { params });
    return response.data;
  },

  createAmbulance: async (data) => {
    const response = await api.post('/api/ambulances', data);
    return response.data;
  },

  updateAmbulance: async (id, data) => {
    const response = await api.put(`/api/ambulances/${id}`, data);
    return response.data;
  },

  deleteAmbulance: async (id) => {
    const response = await api.delete(`/api/ambulances/${id}`);
    return response.data;
  },

  requestAmbulance: async (requestData) => {
    const response = await api.post('/api/ambulance-requests', requestData);
    return response.data;
  },

  getAmbulanceRequests: async (params = {}) => {
    const response = await api.get('/api/ambulance-requests', { params });
    return response.data;
  },

  updateRequestStatus: async (id, status, assignedAmbulanceId = null) => {
    const payload = { status };
    if (assignedAmbulanceId !== null) {
      payload.assigned_ambulance_id = assignedAmbulanceId;
    }
    const response = await api.put(`/api/ambulance-requests/${id}`, payload);
    return response.data;
  }
};
