import api from './api';

const normalizeError = (error, fallbackMessage) => {
  throw new Error(error.response?.data?.message || fallbackMessage);
};

export const getUsers = async (filters = {}) => {
  try {
    const { data } = await api.get('/users', { params: filters });
    return data.users;
  } catch (error) {
    normalizeError(error, 'Failed to load users');
  }
};

export const getUserById = async (id) => {
  try {
    const { data } = await api.get(`/users/${id}`);
    return data.user;
  } catch (error) {
    normalizeError(error, 'Failed to load user');
  }
};

export const createUser = async (payload) => {
  try {
    const { data } = await api.post('/users', payload);
    return data.user;
  } catch (error) {
    normalizeError(error, 'Failed to create user');
  }
};

export const updateUser = async (id, payload) => {
  try {
    const { data } = await api.put(`/users/${id}`, payload);
    return data.user;
  } catch (error) {
    normalizeError(error, 'Failed to update user');
  }
};

export const deleteUser = async (id) => {
  try {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to delete user');
  }
};

export const getAllUsers = getUsers;
export const getAll = getUsers;
export const getById = getUserById;
export const create = createUser;
export const update = updateUser;
export const remove = deleteUser;
