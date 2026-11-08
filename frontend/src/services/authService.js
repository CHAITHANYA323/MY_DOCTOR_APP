import api from './api';

export const authService = {
  login: async (credentials) => {
    const response = await api.post('/api/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('medicare_token', response.data.token);
      localStorage.setItem('medicare_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    // Do NOT automatically store token or user on register
    // The user must explicitly log in after registering
    return {
      status: response.status,
      ...response.data
    };
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/api/auth/profile', data);
    if (response.data.token) {
      localStorage.setItem('medicare_token', response.data.token);
    }
    if (response.data.user) {
      localStorage.setItem('medicare_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  changePassword: async (data) => {
    const response = await api.post('/api/auth/change-password', data);
    if (response.data.token) {
      localStorage.setItem('medicare_token', response.data.token);
    }
    if (response.data.user) {
      localStorage.setItem('medicare_user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  getUsers: async () => {
    const response = await api.get('/api/auth/users');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('medicare_token');
    localStorage.removeItem('medicare_user');
  },

  getStoredUser: () => {
    try {
      const u = localStorage.getItem('medicare_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  getStoredToken: () => localStorage.getItem('medicare_token'),
};
