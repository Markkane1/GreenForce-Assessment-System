import api from './api';

const normalizeError = (error, fallbackMessage) => {
  throw new Error(error.response?.data?.message || fallbackMessage);
};

export const getAttemptsForGrading = async (filters = {}) => {
  try {
    const { data } = await api.get('/grading/attempts', { params: filters });
    return data.attempts;
  } catch (error) {
    normalizeError(error, 'Failed to load grading attempts');
  }
};

export const getAttemptDetail = async (id) => {
  try {
    const { data } = await api.get(`/grading/attempts/${id}`);
    return data.attempt;
  } catch (error) {
    normalizeError(error, 'Failed to load attempt details');
  }
};

export const gradeEssay = async (payload) => {
  try {
    const { data } = await api.post('/grading/essay', payload);
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to grade essay');
  }
};

export const finalizeAttempt = async (attemptId) => {
  try {
    const { data } = await api.post(`/grading/${attemptId}/finalize`);
    return data.attempt;
  } catch (error) {
    normalizeError(error, 'Failed to finalize attempt');
  }
};

export const getAttempts = getAttemptsForGrading;
