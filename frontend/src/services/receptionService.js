import api from './api';

/**
 * Service client for Hospital Front Desk & Reception workflows.
 * Scoped strictly to the authenticated receptionist's assigned hospital.
 */
export const receptionService = {
  /**
   * Retrieves real-time daily operational statistics for the front desk.
   * Endpoint: GET /api/reception/stats
   */
  getStats: async () => {
    const response = await api.get('/api/reception/stats');
    return response.data;
  },

  /**
   * Searches and retrieves the patient directory for this hospital.
   * Endpoint: GET /api/reception/patients
   */
  getPatients: async (params = {}) => {
    const response = await api.get('/api/reception/patients', { params });
    return response.data;
  },

  /**
   * Retrieves a single patient's basic record and hospital consultation history.
   * Endpoint: GET /api/reception/patients/:id
   */
  getPatientById: async (id) => {
    const response = await api.get(`/api/reception/patients/${id}`);
    return response.data;
  },

  /**
   * Registers a new walk-in patient at the reception desk.
   * Endpoint: POST /api/reception/patients
   */
  registerPatient: async (patientData) => {
    const response = await api.post('/api/reception/patients', patientData);
    return response.data;
  },

  /**
   * Checks a patient in for an existing appointment (transitions to 'Confirmed').
   * Endpoint: PUT /api/appointments/:id
   */
  checkInPatient: async (appointmentId, notes = '') => {
    const response = await api.put(`/api/appointments/${appointmentId}`, {
      status: 'Confirmed',
      notes
    });
    return response.data;
  },

  /**
   * Cancels an appointment from reception.
   * Endpoint: PUT /api/appointments/:id
   */
  cancelAppointment: async (appointmentId, notes = '') => {
    const response = await api.put(`/api/appointments/${appointmentId}`, {
      status: 'Cancelled',
      notes
    });
    return response.data;
  },

  /**
   * Books a consultation for a patient with an in-hospital doctor.
   * Endpoint: POST /api/appointments
   */
  bookAppointment: async (payload) => {
    const response = await api.post('/api/appointments', payload);
    return response.data;
  }
};

export default receptionService;
