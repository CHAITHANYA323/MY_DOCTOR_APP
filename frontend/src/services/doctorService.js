import api from './api';

export const doctorService = {
  getDoctors: async (params = {}) => {
    const response = await api.get('/api/doctors', { params });
    return response.data;
  },

  getDoctorById: async (id) => {
    const response = await api.get(`/api/doctors/${id}`);
    return response.data;
  },

  getFeaturedDoctors: async (limit = 6) => {
    const response = await api.get('/api/doctors/featured', { params: { limit } });
    return response.data;
  },

  createDoctor: async (doctorData) => {
    const response = await api.post('/api/doctors', doctorData);
    return response.data;
  },

  updateDoctor: async (id, doctorData) => {
    const response = await api.put(`/api/doctors/${id}`, doctorData);
    return response.data;
  },

  deleteDoctor: async (id) => {
    const response = await api.delete(`/api/doctors/${id}`);
    return response.data;
  },

  getSpecializations: async () => {
    const response = await api.get('/api/specializations');
    return response.data;
  },

  createSpecialization: async (data) => {
    const response = await api.post('/api/specializations', data);
    return response.data;
  },

  addReview: async (reviewData) => {
    const response = await api.post('/api/reviews', reviewData);
    return response.data;
  },

  updateReview: async (reviewId, reviewData) => {
    const response = await api.put(`/api/reviews/${reviewId}`, reviewData);
    return response.data;
  },

  deleteReview: async (reviewId) => {
    const response = await api.delete(`/api/reviews/${reviewId}`);
    return response.data;
  },

  getDoctorReviews: async (doctorId) => {
    const response = await api.get('/api/reviews', { params: { doctor_id: doctorId } });
    return response.data;
  },

  toggleFavorite: async (doctorId) => {
    const response = await api.post('/api/favorites/toggle', { doctor_id: doctorId });
    return response.data;
  },

  getFavorites: async () => {
    const response = await api.get('/api/favorites');
    return response.data;
  }
};
