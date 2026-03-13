import api from './api';

const normalizeError = (error, fallbackMessage) => {
  throw new Error(error.response?.data?.message || fallbackMessage);
};

export const login = async (email, password) => {
  try {
    const { data } = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to sign in');
  }
};

export const register = async (name, email, password, role) => {
  try {
    const { data } = await api.post('/auth/register', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
    });
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to create account');
  }
};

export const forgotPassword = async (email) => {
  try {
    const { data } = await api.post('/auth/forgot-password', {
      email: email.trim().toLowerCase(),
    });
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to request password reset');
  }
};

export const resetPassword = async (token, newPassword) => {
  try {
    const { data } = await api.post('/auth/reset-password', {
      token: token.trim(),
      newPassword,
    });
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to reset password');
  }
};

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const { data } = await api.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to change password');
  }
};
