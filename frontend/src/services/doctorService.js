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
  },

  // Doctor Portal Methods (/doctor/*)
  getDoctorProfile: async () => {
    const response = await api.get('/api/doctor/profile');
    return response.data;
  },

  updateDoctorProfile: async (doctorData) => {
    const response = await api.put('/api/doctor/profile', doctorData);
    return response.data;
  },

  getDoctorStats: async () => {
    const response = await api.get('/api/doctor/stats');
    return response.data;
  },

  getDoctorPatients: async (params = {}) => {
    const response = await api.get('/api/doctor/patients', { params });
    return response.data;
  },

  getDoctorPatientDetails: async (patientId) => {
    const response = await api.get(`/api/doctor/patients/${patientId}`);
    return response.data;
  },

  updateDoctorAppointment: async (appointmentId, data) => {
    const response = await api.put(`/api/doctor/appointments/${appointmentId}`, data);
    return response.data;
  },

  getDoctorAppointments: async (params = {}) => {
    const response = await api.get('/api/appointments', { params });
    return response.data;
  }
};
