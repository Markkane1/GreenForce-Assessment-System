import api from './api';

const normalizeError = (error, fallbackMessage) => {
  throw new Error(error.response?.data?.message || fallbackMessage);
};

export const validateCode = async (code) => {
  try {
    const { data } = await api.post('/invite-codes/validate', { code });
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to validate invite code');
  }
};

export const generateSingle = async (groupId) => {
  try {
    const { data } = await api.post('/invite-codes/single', { groupId });
    return data.inviteCode;
  } catch (error) {
    normalizeError(error, 'Failed to generate invite code');
  }
};

export const generateBulk = async (groupId, count) => {
  try {
    const { data } = await api.post('/invite-codes/bulk', { groupId, count });
    return data.inviteCodes;
  } catch (error) {
    normalizeError(error, 'Failed to generate invite codes');
  }
};

export const getCodesByGroup = async (groupId) => {
  try {
    const { data } = await api.get(`/invite-codes/${groupId}`);
    return data.inviteCodes;
  } catch (error) {
    normalizeError(error, 'Failed to load invite codes');
  }
};

export const deleteCode = async (id) => {
  try {
    const { data } = await api.delete(`/invite-codes/${id}`);
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to delete invite code');
  }
};

export default {
  validateCode,
  generateSingle,
  generateBulk,
  getCodesByGroup,
  deleteCode,
};
