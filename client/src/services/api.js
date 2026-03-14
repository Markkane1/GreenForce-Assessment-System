import axios from 'axios';
import { API_BASE_URL } from '../env';

let logoutHandler = null;
let authToken = null;
const SESSION_TOKEN_KEY = 'auth_bearer_fallback';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const setLogoutFunction = (fn) => {
  logoutHandler = fn;
};

export const setAuthToken = (token) => {
  authToken = token || null;

  if (typeof window === 'undefined') {
    return;
  }

  if (authToken) {
    window.sessionStorage.setItem(SESSION_TOKEN_KEY, authToken);
    return;
  }

  window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
};

const getStoredToken = () => {
  if (authToken) {
    return authToken;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const storedToken = window.sessionStorage.getItem(SESSION_TOKEN_KEY);

  if (storedToken) {
    authToken = storedToken;
  }

  return authToken;
};

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
      setAuthToken(null);
      logoutHandler?.({ syncServer: false, redirect: false });

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

export default api;
