import api from './api';

export const dashboardService = {
  getAdminStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  getUserStats: async () => {
    const response = await api.get('/user/stats');
    return response.data;
  }
};
