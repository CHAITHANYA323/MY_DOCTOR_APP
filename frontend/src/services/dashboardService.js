import api from './api';

export const dashboardService = {
  getAdminStats: async () => {
    const response = await api.get('/api/admin/stats');
    return response.data;
  },

  getUserStats: async () => {
    const response = await api.get('/api/user/stats');
    return response.data;
  }
};
