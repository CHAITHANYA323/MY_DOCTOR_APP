import api from './api';

export const doctorService = {
  getDoctors: async (params = {}) => {
    const response = await api.get('/doctors', { params });
    return response.data;
  },

  getDoctorById: async (id) => {
    const response = await api.get(`/doctors/${id}`);
    return response.data;
  },

  getFeaturedDoctors: async (limit = 6) => {
    const response = await api.get('/doctors/featured', { params: { limit } });
    return response.data;
  },

  createDoctor: async (doctorData) => {
    const response = await api.post('/doctors', doctorData);
    return response.data;
  },

  updateDoctor: async (id, doctorData) => {
    const response = await api.put(`/doctors/${id}`, doctorData);
    return response.data;
  },

  deleteDoctor: async (id) => {
    const response = await api.delete(`/doctors/${id}`);
    return response.data;
  },

  getSpecializations: async () => {
    const response = await api.get('/specializations');
    return response.data;
  },

  createSpecialization: async (data) => {
    const response = await api.post('/specializations', data);
    return response.data;
  },

  addReview: async (reviewData) => {
    const response = await api.post('/reviews', reviewData);
    return response.data;
  },

  getDoctorReviews: async (doctorId) => {
    const response = await api.get('/reviews', { params: { doctor_id: doctorId } });
    return response.data;
  },

  toggleFavorite: async (doctorId) => {
    const response = await api.post('/favorites/toggle', { doctor_id: doctorId });
    return response.data;
  },

  getFavorites: async () => {
    const response = await api.get('/favorites');
    return response.data;
  }
};
