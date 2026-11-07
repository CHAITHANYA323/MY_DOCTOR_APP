import api from './api';

export const appointmentService = {
  getAppointments: async (params = {}) => {
    const response = await api.get('/api/appointments', { params });
    return response.data;
  },

  getAppointmentById: async (id) => {
    const response = await api.get(`/api/appointments/${id}`);
    return response.data;
  },

  getBookedSlots: async (doctorId, date) => {
    const response = await api.get('/api/appointments/booked-slots', {
      params: { doctor_id: doctorId, date }
    });
    return response.data;
  },

  bookAppointment: async (appointmentData) => {
    const response = await api.post('/api/appointments', appointmentData);
    return response.data;
  },

  updateAppointmentStatus: async (id, status, notes = '') => {
    const response = await api.put(`/api/appointments/${id}`, { status, notes });
    return response.data;
  },

  cancelAppointment: async (id) => {
    const response = await api.put(`/api/appointments/${id}`, { status: 'Cancelled' });
    return response.data;
  },

  deleteAppointment: async (id) => {
    const response = await api.delete(`/api/appointments/${id}`);
    return response.data;
  }
};
