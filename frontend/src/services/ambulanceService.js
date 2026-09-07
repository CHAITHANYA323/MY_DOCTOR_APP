import api from './api';

export const ambulanceService = {
  getAmbulances: async (params = {}) => {
    const response = await api.get('/ambulances', { params });
    return response.data;
  },

  createAmbulance: async (data) => {
    const response = await api.post('/ambulances', data);
    return response.data;
  },

  updateAmbulance: async (id, data) => {
    const response = await api.put(`/ambulances/${id}`, data);
    return response.data;
  },

  deleteAmbulance: async (id) => {
    const response = await api.delete(`/ambulances/${id}`);
    return response.data;
  },

  requestAmbulance: async (requestData) => {
    const response = await api.post('/ambulance-requests', requestData);
    return response.data;
  },

  getAmbulanceRequests: async (params = {}) => {
    const response = await api.get('/ambulance-requests', { params });
    return response.data;
  },

  updateRequestStatus: async (id, status, assignedAmbulanceId = null) => {
    const payload = { status };
    if (assignedAmbulanceId !== null) {
      payload.assigned_ambulance_id = assignedAmbulanceId;
    }
    const response = await api.put(`/ambulance-requests/${id}`, payload);
    return response.data;
  }
};
