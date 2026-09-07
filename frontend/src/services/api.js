import axios from 'axios';

// Automatically normalize the backend API Base URL:
// Ensures clean handling of trailing slashes, missing /api, or accidental /api/auth in VITE_API_URL
const getNormalizedApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || !envUrl.trim()) {
    return 'http://localhost:5000/api';
  }

  let cleaned = envUrl.trim().replace(/\/+$/, '');

  // If the user specified an endpoint ending in /auth, strip /auth because services append /auth/...
  if (cleaned.endsWith('/auth')) {
    cleaned = cleaned.slice(0, -5);
  }

  // If the URL does not end with /api, append /api
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }

  return cleaned;
};

const API_BASE_URL = getNormalizedApiUrl();

if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  if (!import.meta.env.VITE_API_URL || API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
    console.warn(
      '[DoctorApp Deployment Notice] Frontend is running on a deployed domain (' +
        window.location.origin +
        '), but API_BASE_URL is pointing to localhost (' +
        API_BASE_URL +
        '). ' +
        'Browsers will block requests to local addresses. ' +
        'Please set the VITE_API_URL environment variable in your Vercel Project Settings to your deployed Flask backend URL (e.g. https://your-backend.onrender.com/api).'
    );
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medicare_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/admin') || currentPath.startsWith('/appointments') || currentPath.startsWith('/profile')) {
        localStorage.removeItem('medicare_token');
        localStorage.removeItem('medicare_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
