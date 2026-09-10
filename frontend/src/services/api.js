import axios from 'axios';

/**
 * Centralized API Base URL configuration.
 * Automatically resolves the backend URL from environment variables:
 * - In local development: defaults to 'http://127.0.0.1:5000' if VITE_API_URL is unset.
 * - In production: uses import.meta.env.VITE_API_URL.
 * - Strips any trailing slashes and trailing /api to ensure canonical joining.
 */
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || !envUrl.trim()) {
    return 'http://127.0.0.1:5000';
  }

  let cleaned = envUrl.trim().replace(/\/+$/, '');

  // If user configured VITE_API_URL with a trailing /api, strip it
  // so that endpoint paths starting with /api (e.g. /api/auth/login) match cleanly
  if (cleaned.endsWith('/api')) {
    cleaned = cleaned.slice(0, -4);
  }

  return cleaned;
};

const API_BASE_URL = getBaseUrl();

// Safe diagnostic notice if running on deployed domain without VITE_API_URL configured
if (
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
) {
  if (
    !import.meta.env.VITE_API_URL ||
    API_BASE_URL.includes('localhost') ||
    API_BASE_URL.includes('127.0.0.1')
  ) {
    console.warn(
      '[DoctorApp Notice] Running on production domain (' +
        window.location.origin +
        ') but VITE_API_URL is pointing to ' +
        API_BASE_URL +
        '. Please configure VITE_API_URL in your Vercel Project Settings (Environment Variables) to your deployed Flask backend URL and redeploy the frontend.'
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

// Request Interceptor: Attach JWT Token & Ensure Canonical /api Prefix
api.interceptors.request.use(
  (config) => {
    // Ensure every relative API call starts with /api (preventing missing /api or /api/api)
    if (
      config.url &&
      !config.url.startsWith('/api') &&
      !config.url.startsWith('http://') &&
      !config.url.startsWith('https://')
    ) {
      config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
    }

    const token = localStorage.getItem('medicare_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors & Auth Expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      const currentPath = window.location.pathname;
      if (
        currentPath.startsWith('/admin') ||
        currentPath.startsWith('/appointments') ||
        currentPath.startsWith('/profile')
      ) {
        localStorage.removeItem('medicare_token');
        localStorage.removeItem('medicare_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export { API_BASE_URL };

/**
 * Utility to extract user-friendly error messages from API calls.
 * Ensures internal details, stack traces, and database credentials are never exposed.
 */
export const getApiErrorMessage = (
  error,
  defaultMessage = 'An unexpected error occurred. Please try again later.'
) => {
  if (!error) return defaultMessage;

  // Network or connectivity failure
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || !error.response) {
    return 'Unable to connect to the backend server. Please try again later.';
  }

  // Backend returned JSON error payload
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (typeof error.response?.data === 'string' && error.response.data.trim()) {
    return error.response.data;
  }

  // HTTP status based fallback messages
  if (error.response?.status === 400) return 'Invalid request details. Please check your input.';
  if (error.response?.status === 401) return 'Invalid credentials or session expired.';
  if (error.response?.status === 403) return 'You do not have permission to perform this action.';
  if (error.response?.status === 404) return 'The requested resource was not found.';
  if (error.response?.status === 409) return 'A conflict occurred. The record may already exist.';
  if (error.response?.status >= 500) return 'Server error occurred. Please try again later.';

  return defaultMessage;
};

export default api;
