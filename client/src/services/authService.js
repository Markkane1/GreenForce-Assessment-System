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

export const validateInviteCode = async (code) => {
  try {
    const { data } = await api.post('/invite-codes/validate', {
      code: code.trim().toUpperCase(),
    });
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to validate invite code');
  }
};

export const registerStudent = async (name, email, phone, password, inviteCode) => {
  try {
    const { data } = await api.post('/auth/register-student', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      inviteCode: inviteCode.trim().toUpperCase(),
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
    const { data } = await api.put(
      '/auth/change-password',
      {
        currentPassword,
        newPassword,
      },
      { skipAuthRedirect: true },
    );
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to change password');
  }
};

export const getCurrentUser = async () => {
  try {
    const { data } = await api.get('/auth/me', { skipAuthRedirect: true });
    return data.user;
  } catch (error) {
    normalizeError(error, 'Failed to load current user');
  }
};

export const logout = async () => {
  try {
    const { data } = await api.post('/auth/logout', null, { skipAuthRedirect: true });
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to log out');
  }
};
