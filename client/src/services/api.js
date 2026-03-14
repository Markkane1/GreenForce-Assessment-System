import axios from 'axios';
import { API_BASE_URL } from '../env';

let logoutHandler = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const setLogoutFunction = (fn) => {
  logoutHandler = fn;
};

const readCookie = (name) => {
  if (typeof document === 'undefined') {
    return null;
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  const csrfToken = readCookie('csrf_token');

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) {
    config.headers = config.headers || {};
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
      logoutHandler?.({ syncServer: false, redirect: false });

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

export default api;
