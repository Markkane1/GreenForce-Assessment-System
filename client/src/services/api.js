import axios from 'axios';
import { API_BASE_URL } from '../env';

const TOKEN_STORAGE_KEY = 'auth_token';
let logoutHandler = null;

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const setLogoutFunction = (fn) => {
  logoutHandler = fn;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      logoutHandler?.();

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

export default api;
