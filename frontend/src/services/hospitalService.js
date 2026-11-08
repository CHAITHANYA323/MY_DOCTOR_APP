import api from './api';

export const hospitalService = {
  getHospitals: async (params = {}) => {
    const response = await api.get('/api/hospitals', { params });
    return response.data;
  },

  getHospitalById: async (id) => {
    const response = await api.get(`/api/hospitals/${id}`);
    return response.data;
  },

  createHospital: async (hospitalData) => {
    const response = await api.post('/api/hospitals', hospitalData);
    return response.data;
  },

  /**
   * Platform Owner: Onboard hospital and generate initial Super Admin invitation.
   * Endpoint: POST /api/platform/hospitals
   */
  createPlatformHospital: async (payload) => {
    const response = await api.post('/api/platform/hospitals', payload);
    return response.data;
  },

  updateHospital: async (id, hospitalData) => {
    const response = await api.put(`/api/hospitals/${id}`, hospitalData);
    return response.data;
  },

  deleteHospital: async (id) => {
    const response = await api.delete(`/api/hospitals/${id}`);
    return response.data;
  }
};

export default hospitalService;
