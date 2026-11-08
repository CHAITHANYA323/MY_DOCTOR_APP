import api from './api';

export const patientService = {
  // Patient Portal Dashboard Metrics
  getDashboardStats: async () => {
    const response = await api.get('/api/patient/stats');
    return response.data;
  },

  // Personal Consultations & Appointments
  getAppointments: async (params = {}) => {
    const response = await api.get('/api/patient/appointments', { params });
    return response.data;
  },

  getAppointmentById: async (id) => {
    const response = await api.get(`/api/patient/appointments/${id}`);
    return response.data;
  },

  cancelAppointment: async (id) => {
    const response = await api.put(`/api/patient/appointments/${id}/cancel`);
    return response.data;
  },

  // Consultation Clinical Records & Prescriptions
  getMedicalRecords: async () => {
    const response = await api.get('/api/patient/medical-records');
    return response.data;
  },

  // Personal Profile
  getProfile: async () => {
    const response = await api.get('/api/patient/profile');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/api/patient/profile', data);
    return response.data;
  },

  // Appointment Booking
  bookAppointment: async (appointmentData) => {
    const response = await api.post('/api/appointments', appointmentData);
    return response.data;
  }
};
