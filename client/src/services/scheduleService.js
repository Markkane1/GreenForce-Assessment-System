import api from './api';

const normalizeError = (error, fallbackMessage) => {
  throw new Error(error.response?.data?.message || fallbackMessage);
};

const serializeSchedulePayload = (payload) => ({
  ...payload,
  startTime: payload.startTime ? new Date(payload.startTime).toISOString() : payload.startTime,
  endTime: payload.endTime ? new Date(payload.endTime).toISOString() : payload.endTime,
});

export const getSchedules = async () => {
  try {
    const { data } = await api.get('/schedules');
    return data.schedules;
  } catch (error) {
    normalizeError(error, 'Failed to load schedules');
  }
};

export const getScheduleById = async (id) => {
  try {
    const { data } = await api.get(`/schedules/${id}`);
    return data.schedule;
  } catch (error) {
    normalizeError(error, 'Failed to load schedule');
  }
};

export const createSchedule = async (payload) => {
  try {
    const { data } = await api.post('/schedules', serializeSchedulePayload(payload));
    return data.schedule;
  } catch (error) {
    normalizeError(error, 'Failed to create schedule');
  }
};

export const updateSchedule = async (id, payload) => {
  try {
    const { data } = await api.put(`/schedules/${id}`, serializeSchedulePayload(payload));
    return data.schedule;
  } catch (error) {
    normalizeError(error, 'Failed to update schedule');
  }
};

export const deleteSchedule = async (id) => {
  try {
    const { data } = await api.delete(`/schedules/${id}`);
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to delete schedule');
  }
};

export const getActiveAttempts = async (scheduleId) => {
  try {
    const { data } = await api.get(`/schedules/${scheduleId}/active-attempts`);
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to load active exam attempts');
  }
};

export const getAllSchedules = getSchedules;
export const getAll = getSchedules;
export const getById = getScheduleById;
export const create = createSchedule;
export const update = updateSchedule;
export const remove = deleteSchedule;
