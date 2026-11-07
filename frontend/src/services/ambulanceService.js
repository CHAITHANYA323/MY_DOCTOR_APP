import api from './api';

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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

  requestAmbulance: async (requestData, idempotencyKey = null) => {
    const config = {};
    if (idempotencyKey) {
      config.headers = {
        'Idempotency-Key': String(idempotencyKey).trim()
      };
    }
    const response = await api.post('/api/ambulance-requests', requestData, config);
    return response.data;
  },

  cancelAmbulanceRequest: async (id) => {
    const response = await api.post(`/api/ambulance-requests/${id}/cancel`);
    return response.data;
  },

  getAmbulanceRequests: async (params = {}) => {
    const response = await api.get('/api/ambulance-requests', { params });
    return response.data;
  },

  updateRequestStatus: async (id, statusOrPayload, assignedAmbulanceId = undefined) => {
    let payload = {};
    if (typeof statusOrPayload === 'object' && statusOrPayload !== null) {
      payload = { ...statusOrPayload };
    } else {
      if (statusOrPayload) {
        payload.status = statusOrPayload;
      }
      if (assignedAmbulanceId !== undefined) {
        payload.assigned_ambulance_id = assignedAmbulanceId;
      }
    }
    const response = await api.put(`/api/ambulance-requests/${id}`, payload);
    return response.data;
  }
};
