import api from './api';

const normalizeError = (error, fallbackMessage) => {
  throw new Error(error.response?.data?.message || fallbackMessage);
};

const sanitizeQuestions = (questions = []) =>
  questions.map((question) => ({
    ...question,
    options: Array.isArray(question.options)
      ? question.options.map((option) => ({
          _id: option._id,
          text: option.text,
        }))
      : [],
  }));

export const startExam = async (scheduleId) => {
  try {
    const { data } = await api.post('/exam/start', { scheduleId });
    return {
      attempt: data.attempt,
      questions: sanitizeQuestions(data.questions || []),
      alreadySubmitted: Boolean(data.alreadySubmitted),
      resumed: Boolean(data.resumed),
      remainingSeconds: data.remainingSeconds,
    };
  } catch (error) {
    normalizeError(error, 'Failed to start exam');
  }
};

export const getSchedulePreview = async (scheduleId) => {
  try {
    const { data } = await api.get(`/schedules/${scheduleId}`);
    return data.schedule;
  } catch (error) {
    normalizeError(error, 'Failed to load exam preview');
  }
};

export const getQuestions = async (attemptId) => {
  try {
    const { data } = await api.get(`/exam/${attemptId}/questions`);
    return {
      ...data,
      questions: sanitizeQuestions(data.questions),
    };
  } catch (error) {
    normalizeError(error, 'Failed to load exam questions');
  }
};

export const saveAnswer = async (attemptId, questionId, answer) => {
  try {
    const { data } = await api.post('/exam/save-answer', {
      attemptId,
      questionId,
      answer,
    });

    return data.answer;
  } catch (error) {
    normalizeError(error, 'Failed to save answer');
  }
};

export const saveAnswersBatch = async (attemptId, answers) => {
  try {
    const { data } = await api.post('/exam/save-answers-batch', {
      attemptId,
      answers,
    });

    return {
      savedCount: data.savedCount || 0,
      questionIds: data.questionIds || [],
    };
  } catch (error) {
    normalizeError(error, 'Failed to save answers');
  }
};

export const submitExam = async (attemptId) => {
  try {
    const { data } = await api.post(`/exam/${attemptId}/submit`);
    return data.attempt;
  } catch (error) {
    normalizeError(error, 'Failed to submit exam');
  }
};

export const getAttemptStatus = async (attemptId) => {
  try {
    const { data } = await api.get(`/exam/${attemptId}/status`);
    return data.attempt;
  } catch (error) {
    normalizeError(error, 'Failed to load attempt status');
  }
};

export const logViolation = async (attemptId, eventType, metadata = {}) => {
  try {
    const { data } = await api.post('/proctor/log', {
      attemptId,
      eventType,
      metadata,
    });

    return data;
  } catch (error) {
    normalizeError(error, 'Failed to log exam violation');
  }
};

export const getResults = async (attemptId) => {
  try {
    const { data } = await api.get(`/exam/${attemptId}/results`);
    return data;
  } catch (error) {
    normalizeError(error, 'Failed to load exam results');
  }
};

export const getMyAttempts = async () => {
  try {
    const { data } = await api.get('/exam/my-attempts');
    return data.attempts || [];
  } catch (error) {
    normalizeError(error, 'Failed to load past exam attempts');
  }
};
