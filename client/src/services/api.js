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
