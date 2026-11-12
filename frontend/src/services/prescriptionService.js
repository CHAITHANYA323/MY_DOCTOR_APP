import api from './api';

export const prescriptionService = {
  /**
   * Create digital prescription (Doctor only)
   */
  createPrescription: async (data) => {
    const response = await api.post('/api/doctor/prescriptions', data);
    return response.data;
  },

  /**
   * List prescriptions issued by the authenticated doctor
   */
  getDoctorPrescriptions: async (params = {}) => {
    const response = await api.get('/api/doctor/prescriptions', { params });
    return response.data;
  },

  /**
   * List prescriptions belonging strictly to the authenticated patient
   */
  getPatientPrescriptions: async () => {
    const response = await api.get('/api/patient/prescriptions');
    return response.data;
  },

  /**
   * Get prescription detail by ID (enforces IDOR access checks)
   */
  getPrescriptionById: async (id) => {
    const response = await api.get(`/api/prescriptions/${id}`);
    return response.data;
  },

  /**
   * Fetch PDF blob for viewing or embedded viewer
   */
  getPrescriptionPdfBlob: async (id) => {
    const response = await api.get(`/api/prescriptions/${id}/pdf`, {
      responseType: 'blob',
      headers: {
        Accept: 'application/pdf'
      }
    });
    return response.data;
  },

  /**
   * Trigger direct PDF download in browser
   */
  downloadPrescriptionPdf: async (id, filename = 'Prescription.pdf') => {
    const response = await api.get(`/api/prescriptions/${id}/pdf?download=true`, {
      responseType: 'blob',
      headers: {
        Accept: 'application/pdf'
      }
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return true;
  },

  /**
   * Verify prescription authenticity
   */
  verifyPrescription: async (prescriptionNumber) => {
    const response = await api.get(`/api/prescriptions/verify/${encodeURIComponent(prescriptionNumber)}`);
    return response.data;
  }
};

