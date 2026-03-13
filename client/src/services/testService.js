import api from './api';

const normalizeError = (error, fallbackMessage) => {
  throw new Error(error.response?.data?.message || fallbackMessage);
};

export const getTests = async () => {
  try {
    const { data } = await api.get('/tests');
    return data.tests;
  } catch (error) {
    normalizeError(error, 'Failed to load tests');
  }
};

export const getTestById = async (id) => {
  try {
    const { data } = await api.get(`/tests/${id}`);
    return data.test;
  } catch (error) {
    normalizeError(error, 'Failed to load test');
  }
};

export const createTest = async (payload) => {
  try {
    const { data } = await api.post('/tests', payload);
    return data.test;
  } catch (error) {
    normalizeError(error, 'Failed to create test');
  }
};

export const updateTest = async (id, payload) => {
  try {
    const { data } = await api.put(`/tests/${id}`, payload);
    return data.test;
  } catch (error) {
    normalizeError(error, 'Failed to update test');
  }
};

export const deleteTest = async (id) => {
  try {
    const { data } = await api.delete(`/tests/${id}`);
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to delete test');
  }
};

export const publishTest = async (id) => {
  try {
    const { data } = await api.post(`/tests/${id}/publish`);
    return data.test;
  } catch (error) {
    normalizeError(error, 'Failed to publish test');
  }
};

export const getSectionsByTest = async (testId) => {
  try {
    const { data } = await api.get(`/tests/${testId}/sections`);
    return data.sections;
  } catch (error) {
    normalizeError(error, 'Failed to load sections');
  }
};

export const createSection = async (testId, payload) => {
  try {
    const { data } = await api.post(`/tests/${testId}/sections`, payload);
    return data.section;
  } catch (error) {
    normalizeError(error, 'Failed to create section');
  }
};

export const updateSection = async (id, payload) => {
  try {
    const { data } = await api.put(`/sections/${id}`, payload);
    return data.section;
  } catch (error) {
    normalizeError(error, 'Failed to update section');
  }
};

export const deleteSection = async (id) => {
  try {
    const { data } = await api.delete(`/sections/${id}`);
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to delete section');
  }
};

export const getQuestionsBySection = async (sectionId) => {
  try {
    const { data } = await api.get(`/sections/${sectionId}/questions`);
    return data.questions;
  } catch (error) {
    normalizeError(error, 'Failed to load questions');
  }
};

export const createQuestion = async (sectionId, payload) => {
  try {
    const { data } = await api.post(`/sections/${sectionId}/questions`, payload);
    return data.question;
  } catch (error) {
    normalizeError(error, 'Failed to create question');
  }
};

export const importQuestions = async (sectionId, questions) => {
  try {
    const { data } = await api.post(`/sections/${sectionId}/questions/import`, { questions });
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to import questions');
  }
};

export const updateQuestion = async (id, payload) => {
  try {
    const { data } = await api.put(`/questions/${id}`, payload);
    return data.question;
  } catch (error) {
    normalizeError(error, 'Failed to update question');
  }
};

export const deleteQuestion = async (id) => {
  try {
    const { data } = await api.delete(`/questions/${id}`);
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to delete question');
  }
};

export const getTestWorkspace = async (testId) => {
  try {
    const { data } = await api.get(`/tests/${testId}/workspace`);
    return data.test;
  } catch (error) {
    normalizeError(error, 'Failed to load test workspace');
  }
};

export const getAllTests = getTests;
export const getAll = getTests;
export const getById = getTestById;
export const create = createTest;
export const update = updateTest;
export const remove = deleteTest;
