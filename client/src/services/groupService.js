import api from './api';

const normalizeError = (error, fallbackMessage) => {
  throw new Error(error.response?.data?.message || fallbackMessage);
};

export const getGroups = async () => {
  try {
    const { data } = await api.get('/groups');
    return data.groups;
  } catch (error) {
    normalizeError(error, 'Failed to load groups');
  }
};

export const getGroupById = async (id) => {
  try {
    const { data } = await api.get(`/groups/${id}`);
    return data.group;
  } catch (error) {
    normalizeError(error, 'Failed to load group');
  }
};

export const createGroup = async (payload) => {
  try {
    const { data } = await api.post('/groups', payload);
    return data.group;
  } catch (error) {
    normalizeError(error, 'Failed to create group');
  }
};

export const updateGroup = async (id, payload) => {
  try {
    const { data } = await api.put(`/groups/${id}`, payload);
    return data.group;
  } catch (error) {
    normalizeError(error, 'Failed to update group');
  }
};

export const deleteGroup = async (id) => {
  try {
    const { data } = await api.delete(`/groups/${id}`);
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to delete group');
  }
};

export const addMember = async (groupId, studentId) => {
  try {
    const { data } = await api.post(`/groups/${groupId}/members`, { studentId });
    return data.member;
  } catch (error) {
    normalizeError(error, 'Failed to add group member');
  }
};

export const removeMember = async (groupId, studentId) => {
  try {
    const { data } = await api.delete(`/groups/${groupId}/members/${studentId}`);
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to remove group member');
  }
};

export const getAllGroups = getGroups;
export const getAll = getGroups;
export const getById = getGroupById;
export const create = createGroup;
export const update = updateGroup;
export const remove = deleteGroup;
