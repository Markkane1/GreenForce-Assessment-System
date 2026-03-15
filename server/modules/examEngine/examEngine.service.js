import Answer from '../../models/Answer.js';
import GroupMember from '../../models/GroupMember.js';
import MCQOption from '../../models/MCQOption.js';
import Question from '../../models/Question.js';
import Section from '../../models/Section.js';
import Test from '../../models/Test.js';
import TestAttempt from '../../models/TestAttempt.js';
import TestSchedule from '../../models/TestSchedule.js';

const shuffleArray = (items) => {
  const array = [...items];

  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }

  return array;
};

const sanitizeOptions = (options) =>
  options.map((option) => ({
    _id: option._id,
    text: option.text,
  }));

const getWordCount = (text = '') =>
  text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;

const isAnswerAttempted = (answer) =>
  Boolean(answer?.selectedOptionId) || Boolean(answer?.essayText?.trim());

const buildAnswerSnapshot = (answer) => {
  if (!answer) {
    return null;
  }

  return {
    selectedOptionId: answer.selectedOptionId || null,
    essayText: answer.essayText || '',
    score: answer.score ?? null,
    feedback: answer.feedback || '',
    gradingStatus: answer.gradingStatus || 'pending',
  };
};

const buildQuestionPayload = (question, options = [], section = null, answer = null) => ({
  ...(typeof question?.toObject === 'function' ? question.toObject() : { ...question }),
  section: section
    ? {
        _id: section._id,
        title: section.title,
        order: section.order,
      }
    : null,
  answer: buildAnswerSnapshot(answer),
  options: question.type === 'mcq' ? sanitizeOptions(options) : [],
});

const getAttemptExpiry = (attempt) => {
  const startedAt = new Date(attempt.startedAt);
  const durationMs = attempt.testId.timeLimitMinutes * 60 * 1000;
  const timeLimitExpiry = new Date(startedAt.getTime() + durationMs);
  const scheduleExpiry = new Date(attempt.scheduleId.endTime);

  return new Date(Math.min(timeLimitExpiry.getTime(), scheduleExpiry.getTime()));
};

const applyAttemptPopulation = (query) =>
  query
    .populate({
      path: 'testId',
      select: 'title passingScore timeLimitMinutes antiCheat',
    })
    .populate({
      path: 'scheduleId',
      select: 'startTime endTime',
    });

const getAttemptById = async (attemptId) => {
  const attempt = await applyAttemptPopulation(TestAttempt.findById(attemptId));

  if (!attempt) {
    const error = new Error('Exam attempt not found.');
    error.statusCode = 404;
    throw error;
  }

  return attempt;
};

const groupByStringKey = (items, getKey) =>
  items.reduce((accumulator, item) => {
    const key = getKey(item);

    if (!key) {
      return accumulator;
    }

    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push(item);
    return accumulator;
  }, {});

const ensureAttemptOwnership = (attempt, studentId) => {
  if (attempt.studentId.toString() !== studentId.toString()) {
    const error = new Error('You are not authorized to access this exam attempt.');
    error.statusCode = 403;
    throw error;
  }
};

const getQuestionDocumentsInOrder = async (questionOrder) => {
  const questions = await Question.find({ _id: { $in: questionOrder } });
  const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));

  return questionOrder
    .map((questionId) => questionMap.get(questionId.toString()))
    .filter(Boolean);
};

const getSectionMap = async (questionDocs) => {
  const sectionIds = [...new Set(questionDocs.map((question) => question.sectionId.toString()))];
  const sections = await Section.find({ _id: { $in: sectionIds } }).select('_id title order').lean();

  return new Map(sections.map((section) => [section._id.toString(), section]));
};

const getAnswerMapForAttempt = async (attemptId) => {
  const answers = await Answer.find({ attemptId }).lean();

  return answers.reduce((accumulator, answer) => {
    accumulator[answer.questionId.toString()] = answer;
    return accumulator;
  }, {});
};

const getAttemptEssayState = async (attemptId) => {
  const answers = await Answer.find({ attemptId }).select('questionId gradingStatus').lean();

  if (answers.length === 0) {
    return { hasPendingEssay: false };
  }

  const questionIds = [...new Set(answers.map((answer) => answer.questionId.toString()))];
  const essayQuestions = await Question.find({
    _id: { $in: questionIds },
    type: 'essay',
  }).select('_id').lean();
  const essayQuestionIds = new Set(essayQuestions.map((question) => question._id.toString()));

  if (essayQuestionIds.size === 0) {
    return { hasPendingEssay: false };
  }

  return {
    hasPendingEssay: answers.some(
      (answer) =>
        essayQuestionIds.has(answer.questionId.toString())
        && answer.gradingStatus !== 'graded',
    ),
  };
};

const resolveAttemptPassed = (attempt, { hasPendingEssay = false } = {}) => {
  if (typeof attempt?.passed === 'boolean') {
    return attempt.passed;
  }

  if (hasPendingEssay || !['submitted', 'force_submitted', 'expired'].includes(attempt?.status)) {
    return null;
  }

  const passingScore = Number(attempt?.testId?.passingScore);
  const score = Number(attempt?.score);

  if (!Number.isFinite(passingScore) || !Number.isFinite(score)) {
    return null;
  }

  return score >= passingScore;
};

const buildOrderedQuestions = async (questionDocs, optionOrder = {}, answerMap = {}) => {
  const questionIds = questionDocs
    .filter((question) => question.type === 'mcq')
    .map((question) => question._id);
  const sectionMap = await getSectionMap(questionDocs);

  const options = await MCQOption.find({ questionId: { $in: questionIds } }).lean();
  const optionsByQuestion = options.reduce((accumulator, option) => {
    const key = option.questionId.toString();
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(option);
    return accumulator;
  }, {});

  return questionDocs.map((question) => {
    const section = sectionMap.get(question.sectionId.toString()) || null;
    const answer = answerMap[question._id.toString()] || null;

    if (question.type !== 'mcq') {
      return buildQuestionPayload(question, [], section, answer);
    }

    const storedOrder = optionOrder[question._id.toString()] || [];
    const questionOptions = optionsByQuestion[question._id.toString()] || [];
    const optionMap = new Map(questionOptions.map((option) => [option._id.toString(), option]));
    const orderedOptions = storedOrder.length > 0
      ? storedOrder.map((optionId) => optionMap.get(optionId.toString())).filter(Boolean)
      : questionOptions;

    return buildQuestionPayload(question, orderedOptions, section, answer);
  });
};

const buildAttemptResponse = (attempt) => {
  const expiresAt = getAttemptExpiry(attempt);
  const remainingTimeMs = Math.max(expiresAt.getTime() - Date.now(), 0);

  return {
    ...attempt.toObject(),
    expiresAt,
    remainingTimeSeconds: Math.floor(remainingTimeMs / 1000),
  };
};

const buildResumePayload = async (attempt, remainingSeconds) => {
  const questionDocs = await getQuestionDocumentsInOrder(attempt.questionOrder || []);
  const answerMap = await getAnswerMapForAttempt(attempt._id);
  const orderedQuestions = await buildOrderedQuestions(
    questionDocs,
    attempt.optionOrder || {},
    answerMap,
  );

  return {
    attempt: buildAttemptResponse(attempt),
    questions: orderedQuestions,
    resumed: true,
    remainingSeconds,
  };
};

const ensureAttemptOpenForSaving = async (attempt, attemptId) => {
  if (attempt.status !== 'in_progress') {
    const error = new Error('Exam attempt is not active.');
    error.statusCode = 409;
    throw error;
  }

  if (Date.now() > new Date(attempt.scheduleId.endTime).getTime()) {
    const score = await autoGradeMCQ(attemptId);
    const essayState = await getAttemptEssayState(attemptId);
    attempt.status = 'expired';
    attempt.submittedAt = attempt.submittedAt || new Date();
    attempt.score = score;
    attempt.passed = resolveAttemptPassed(attempt, essayState);
    await attempt.save();

    const error = new Error('Exam window has closed');
    error.statusCode = 409;
    throw error;
  }

  await ensureAttemptActive(attempt);
};

const normalizeAnswerEntries = (answerEntries = []) => {
  const deduplicatedEntries = new Map();

  answerEntries.forEach((entry) => {
    const questionId = entry?.questionId?.toString();

    if (!questionId) {
      return;
    }

    deduplicatedEntries.set(questionId, {
      questionId,
      answer: entry?.answer || {},
    });
  });

  return Array.from(deduplicatedEntries.values());
};

const saveAnswerEntries = async (attempt, attemptId, answerEntries = []) => {
  const normalizedEntries = normalizeAnswerEntries(answerEntries);

  if (normalizedEntries.length === 0) {
    const error = new Error('At least one answer is required.');
    error.statusCode = 400;
    throw error;
  }

  const questionOrder = new Set((attempt.questionOrder || []).map((id) => id.toString()));

  normalizedEntries.forEach(({ questionId }) => {
    if (!questionOrder.has(questionId)) {
      const error = new Error('Question does not belong to this exam attempt.');
      error.statusCode = 422;
      throw error;
    }
  });

  const questionIds = normalizedEntries.map(({ questionId }) => questionId);
  const questions = await Question.find({ _id: { $in: questionIds } }).select('_id type maxWordCount').lean();
  const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));

  if (questionMap.size !== questionIds.length) {
    const error = new Error('One or more questions were not found.');
    error.statusCode = 404;
    throw error;
  }

  const mcqSelections = [];
  const now = new Date();
  const bulkOperations = normalizedEntries.map(({ questionId, answer }) => {
    const question = questionMap.get(questionId);
    const nextAnswer = answer || {};

    if (question.type === 'mcq') {
      const selectedOptionId = nextAnswer.selectedOptionId?.toString();

      if (!selectedOptionId) {
        const error = new Error('selectedOptionId is required for MCQ answers.');
        error.statusCode = 422;
        throw error;
      }

      mcqSelections.push({ questionId, selectedOptionId });

      return {
        updateOne: {
          filter: { attemptId, questionId },
          update: {
            $set: {
              selectedOptionId,
              essayText: '',
              gradingStatus: 'pending',
              updatedAt: now,
            },
            $setOnInsert: {
              attemptId,
              questionId,
              score: null,
              feedback: '',
              createdAt: now,
            },
          },
          upsert: true,
        },
      };
    }

    const essayText = nextAnswer.essayText || '';

    if (question.maxWordCount && getWordCount(essayText) > question.maxWordCount) {
      const error = new Error(`Essay answers cannot exceed ${question.maxWordCount} words.`);
      error.statusCode = 422;
      throw error;
    }

    return {
      updateOne: {
        filter: { attemptId, questionId },
        update: {
          $set: {
            selectedOptionId: null,
            essayText,
            gradingStatus: 'pending',
            updatedAt: now,
          },
          $setOnInsert: {
            attemptId,
            questionId,
            score: null,
            feedback: '',
            createdAt: now,
          },
        },
        upsert: true,
      },
    };
  });

  if (mcqSelections.length > 0) {
    const validOptions = await MCQOption.find({
      _id: { $in: mcqSelections.map(({ selectedOptionId }) => selectedOptionId) },
      questionId: { $in: mcqSelections.map(({ questionId }) => questionId) },
    }).select('_id questionId').lean();
    const validOptionPairs = new Set(
      validOptions.map((option) => `${option.questionId.toString()}:${option._id.toString()}`),
    );

    mcqSelections.forEach(({ questionId, selectedOptionId }) => {
      if (!validOptionPairs.has(`${questionId}:${selectedOptionId}`)) {
        const error = new Error('Selected option is invalid for this question.');
        error.statusCode = 422;
        throw error;
      }
    });
  }

  await Answer.bulkWrite(bulkOperations, { ordered: false });

  return normalizedEntries.map(({ questionId }) => questionId);
};

const ensureAttemptActive = async (attempt) => {
  if (attempt.status !== 'in_progress') {
    const error = new Error('Exam attempt is not active.');
    error.statusCode = 409;
    throw error;
  }

  const expiresAt = getAttemptExpiry(attempt);

  if (Date.now() > expiresAt.getTime()) {
    const score = await autoGradeMCQ(attempt._id);
    const essayState = await getAttemptEssayState(attempt._id);
    attempt.status = 'expired';
    attempt.submittedAt = new Date();
    attempt.score = score;
    attempt.passed = resolveAttemptPassed(attempt, essayState);
    await attempt.save();

    const error = new Error('Exam time has expired.');
    error.statusCode = 409;
    throw error;
  }
};

export const autoGradeMCQ = async (attemptId) => {
  const answers = await Answer.find({ attemptId }).lean();
  const questionIds = answers.map((answer) => answer.questionId);
  const mcqQuestions = await Question.find({
    _id: { $in: questionIds },
    type: 'mcq',
  }).select('_id points');

  const mcqQuestionIds = mcqQuestions.map((question) => question._id);
  const correctOptions = await MCQOption.find({
    questionId: { $in: mcqQuestionIds },
    isCorrect: true,
  }).select('_id questionId');

  const pointsByQuestion = new Map(mcqQuestions.map((question) => [question._id.toString(), question.points]));
  const correctOptionIdsByQuestion = correctOptions.reduce((accumulator, option) => {
    const key = option.questionId.toString();
    accumulator[key] = accumulator[key] || new Set();
    accumulator[key].add(option._id.toString());
    return accumulator;
  }, {});

  let totalScore = 0;
  const mcqAnswerUpdates = [];

  for (const answer of answers) {
    const questionId = answer.questionId.toString();
    const correctOptionIds = correctOptionIdsByQuestion[questionId];

    if (!correctOptionIds) {
      continue;
    }

    const isCorrect = answer.selectedOptionId && correctOptionIds.has(answer.selectedOptionId.toString());
    const score = isCorrect ? pointsByQuestion.get(questionId) || 0 : 0;
    totalScore += score;
    mcqAnswerUpdates.push({
      updateOne: {
        filter: { attemptId, questionId: answer.questionId },
        update: {
          $set: {
            score,
            gradingStatus: 'auto_graded',
          },
        },
      },
    });
  }

  if (mcqAnswerUpdates.length > 0) {
    await Answer.bulkWrite(mcqAnswerUpdates, { ordered: false });
  }

  await TestAttempt.findByIdAndUpdate(attemptId, { score: totalScore });

  return totalScore;
};

export const startExam = async (studentId, scheduleId) => {
  const now = new Date();
  const schedule = await TestSchedule.findById(scheduleId).select('testId startTime endTime assignedGroups');

  if (!schedule) {
    const error = new Error('Schedule not found.');
    error.statusCode = 404;
    throw error;
  }

  if (now < new Date(schedule.startTime) || now > new Date(schedule.endTime)) {
    const error = new Error('Exam is not currently active');
    error.statusCode = 409;
    throw error;
  }

  const [
    membership,
    test,
    existingAttempt,
    completedAttempt,
  ] = await Promise.all([
    GroupMember.exists({
      groupId: { $in: schedule.assignedGroups },
      studentId,
    }),
    Test.findById(schedule.testId).select(
      'title timeLimitMinutes passingScore maxAttempts allowResume randomizeQuestions randomizeOptions antiCheat',
    ),
    applyAttemptPopulation(
      TestAttempt.findOne({
        studentId,
        scheduleId,
        status: 'in_progress',
      }),
    ),
    applyAttemptPopulation(
      TestAttempt.findOne({
        studentId,
        scheduleId,
        status: { $in: ['submitted', 'force_submitted', 'expired'] },
      }).sort({ submittedAt: -1, createdAt: -1 }),
    ),
  ]);
  const isAssigned = Boolean(membership);

  if (!isAssigned) {
    const error = new Error('You are not assigned to this exam schedule.');
    error.statusCode = 403;
    throw error;
  }

  if (!test) {
    const error = new Error('Test not found.');
    error.statusCode = 404;
    throw error;
  }

  if (existingAttempt) {
    if (test.allowResume) {
      const elapsedSeconds = Math.floor((Date.now() - existingAttempt.startedAt.getTime()) / 1000);
      const totalSeconds = test.timeLimitMinutes * 60;
      const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

      if (remainingSeconds === 0) {
        await submitExam(existingAttempt._id.toString(), studentId);
        throw Object.assign(new Error('Exam time has expired'), { statusCode: 409 });
      }

      return buildResumePayload(existingAttempt, remainingSeconds);
    }

    const error = new Error('An exam attempt is already in progress and resume is not allowed');
    error.statusCode = 409;
    throw error;
  }

  if (completedAttempt) {
    return {
      attempt: buildAttemptResponse(completedAttempt),
      questions: [],
      alreadySubmitted: true,
      resumed: false,
      remainingSeconds: 0,
    };
  }

  const attemptsCount = await TestAttempt.countDocuments({
    studentId,
    testId: test._id,
    scheduleId,
    status: { $ne: 'in_progress' },
  });

  if (attemptsCount >= test.maxAttempts) {
    const error = new Error('Maximum exam attempts exceeded.');
    error.statusCode = 409;
    throw error;
  }

  const sections = await Section.find({ testId: test._id })
    .select('_id title order questionPoolSize questionsToServe')
    .sort({ order: 1 })
    .lean();

  if (sections.length === 0) {
    const error = new Error('This test has no sections configured.');
    error.statusCode = 409;
    throw error;
  }

  const allSectionQuestions = await Question.find({
    sectionId: { $in: sections.map((section) => section._id) },
  })
    .select('_id sectionId type content points maxWordCount')
    .sort({ createdAt: 1 })
    .lean();
  const questionsBySection = groupByStringKey(
    allSectionQuestions,
    (question) => question.sectionId?.toString(),
  );
  const selectedQuestions = [];

  for (const section of sections) {
    const sectionQuestions = (questionsBySection[section._id.toString()] || []).slice(
      0,
      section.questionPoolSize,
    );

    if (sectionQuestions.length < section.questionsToServe) {
      const error = new Error(`Section "${section.title}" does not have enough questions configured.`);
      error.statusCode = 409;
      throw error;
    }

    const sampledQuestions = shuffleArray(sectionQuestions).slice(0, section.questionsToServe);
    selectedQuestions.push(...sampledQuestions);
  }

  const orderedQuestionDocs = test.randomizeQuestions ? shuffleArray(selectedQuestions) : selectedQuestions;
  const questionOrder = orderedQuestionDocs.map((question) => question._id.toString());
  const optionOrder = {};
  const mcqQuestionIds = orderedQuestionDocs
    .filter((question) => question.type === 'mcq')
    .map((question) => question._id);
  const allOptions = mcqQuestionIds.length > 0
    ? await MCQOption.find({ questionId: { $in: mcqQuestionIds } })
      .sort({ createdAt: 1 })
      .lean()
    : [];
  const optionsByQuestion = groupByStringKey(
    allOptions,
    (option) => option.questionId?.toString(),
  );
  const orderedQuestions = orderedQuestionDocs.map((question) => {
    if (question.type !== 'mcq') {
      return buildQuestionPayload(question);
    }

    const questionOptions = optionsByQuestion[question._id.toString()] || [];
    const orderedOptions = test.randomizeOptions ? shuffleArray(questionOptions) : questionOptions;
    optionOrder[question._id.toString()] = orderedOptions.map((option) => option._id.toString());

    return buildQuestionPayload(question, orderedOptions);
  });

  let attempt;

  try {
    attempt = await TestAttempt.create({
      studentId,
      testId: test._id,
      scheduleId,
      startedAt: now,
      status: 'in_progress',
      questionOrder,
      optionOrder,
    });
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    const concurrentAttempt = await TestAttempt.findOne({
      studentId,
      scheduleId,
      status: 'in_progress',
    }).then((queryResult) =>
      queryResult ? getAttemptById(queryResult._id) : null,
    );

    if (!concurrentAttempt) {
      throw error;
    }

    if (!test.allowResume) {
      const resumeError = new Error('An exam attempt is already in progress and resume is not allowed');
      resumeError.statusCode = 409;
      throw resumeError;
    }

    const elapsedSeconds = Math.floor((Date.now() - concurrentAttempt.startedAt.getTime()) / 1000);
    const totalSeconds = test.timeLimitMinutes * 60;
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

    if (remainingSeconds === 0) {
      await submitExam(concurrentAttempt._id.toString(), studentId);
      throw Object.assign(new Error('Exam time has expired'), { statusCode: 409 });
    }

    return buildResumePayload(concurrentAttempt, remainingSeconds);
  }

  const populatedAttempt = await getAttemptById(attempt._id);

  const attemptResponse = buildAttemptResponse(populatedAttempt);

  return {
    attempt: attemptResponse,
    questions: orderedQuestions,
    resumed: false,
    remainingSeconds: test.timeLimitMinutes * 60,
  };
};

export const saveAnswer = async (attemptId, studentId, questionId, answer) => {
  const attempt = await getAttemptById(attemptId);
  ensureAttemptOwnership(attempt, studentId);
  await ensureAttemptOpenForSaving(attempt, attemptId);
  await saveAnswerEntries(attempt, attemptId, [{ questionId, answer }]);

  return Answer.findOne({ attemptId, questionId });
};

export const saveAnswersBatch = async (attemptId, studentId, answerEntries = []) => {
  const attempt = await getAttemptById(attemptId);
  ensureAttemptOwnership(attempt, studentId);
  await ensureAttemptOpenForSaving(attempt, attemptId);

  const savedQuestionIds = await saveAnswerEntries(attempt, attemptId, answerEntries);

  return {
    savedCount: savedQuestionIds.length,
    questionIds: savedQuestionIds,
  };
};

export const getAttemptQuestions = async (attemptId, studentId) => {
  const attempt = await getAttemptById(attemptId);
  ensureAttemptOwnership(attempt, studentId);

  if (attempt.status === 'in_progress') {
    try {
      await ensureAttemptActive(attempt);
    } catch (error) {
      if (error.message !== 'Exam time has expired.') {
        throw error;
      }
    }
  }

  const questionDocs = await getQuestionDocumentsInOrder(attempt.questionOrder || []);
  const answerMap = await getAnswerMapForAttempt(attemptId);
  const questions = await buildOrderedQuestions(questionDocs, attempt.optionOrder || {}, answerMap);

  return {
    attempt: buildAttemptResponse(attempt),
    questions,
  };
};

export const submitExam = async (attemptId, studentId) => {
  const attempt = await getAttemptById(attemptId);
  ensureAttemptOwnership(attempt, studentId);

  if (attempt.status !== 'in_progress') {
    const error = new Error('Exam already submitted');
    error.statusCode = 409;
    throw error;
  }

  const elapsed = Date.now() - new Date(attempt.startedAt).getTime();
  const allowedMs = (attempt.testId.timeLimitMinutes * 60 * 1000) + 30000;
  const scheduleClosed = Date.now() > new Date(attempt.scheduleId.endTime).getTime();

  if (elapsed > allowedMs || scheduleClosed) {
    const score = await autoGradeMCQ(attemptId);
    const essayState = await getAttemptEssayState(attemptId);
    attempt.status = 'expired';
    attempt.submittedAt = attempt.submittedAt || new Date();
    attempt.score = score;
    attempt.passed = resolveAttemptPassed(attempt, essayState);
    await attempt.save();

    return buildAttemptResponse(attempt);
  }

  const score = await autoGradeMCQ(attemptId);
  const essayState = await getAttemptEssayState(attemptId);
  attempt.status = 'submitted';
  attempt.submittedAt = new Date();
  attempt.score = score;
  attempt.passed = resolveAttemptPassed(attempt, essayState);
  await attempt.save();

  return buildAttemptResponse(attempt);
};

export const getAttemptStatus = async (attemptId, studentId) => {
  const attempt = await getAttemptById(attemptId);
  ensureAttemptOwnership(attempt, studentId);

  if (attempt.status === 'in_progress') {
    try {
      await ensureAttemptActive(attempt);
    } catch (error) {
      if (error.message !== 'Exam time has expired.') {
        throw error;
      }
    }
  }

  return buildAttemptResponse(attempt);
};

export const getAttemptResults = async (attemptId, studentId) => {
  const attempt = await getAttemptById(attemptId);
  ensureAttemptOwnership(attempt, studentId);

  if (attempt.status === 'in_progress') {
    const error = new Error('Results are not available until the exam is submitted.');
    error.statusCode = 409;
    throw error;
  }

  const questionDocs = await getQuestionDocumentsInOrder(attempt.questionOrder || []);
  const sectionMap = await getSectionMap(questionDocs);
  const answers = await Answer.find({ attemptId }).lean();
  const answerMap = answers.reduce((accumulator, answer) => {
    accumulator[answer.questionId.toString()] = answer;
    return accumulator;
  }, {});

  const mcqQuestionIds = questionDocs
    .filter((question) => question.type === 'mcq')
    .map((question) => question._id);

  const allOptions = await MCQOption.find({ questionId: { $in: mcqQuestionIds } }).lean();
  const optionTextById = new Map(allOptions.map((option) => [option._id.toString(), option.text]));
  const correctOptionsByQuestion = allOptions.reduce((accumulator, option) => {
    const key = option.questionId.toString();
    accumulator[key] = accumulator[key] || [];

    if (option.isCorrect) {
      accumulator[key].push(option.text);
    }

    return accumulator;
  }, {});

  const questionResults = questionDocs.map((question) => {
    const answer = answerMap[question._id.toString()] || null;
    const section = sectionMap.get(question.sectionId.toString()) || null;
    const selectedOptionId = answer?.selectedOptionId?.toString() || null;
    const correctAnswers = correctOptionsByQuestion[question._id.toString()] || [];
    const isCorrect = question.type === 'mcq'
      ? correctAnswers.length > 0 && correctAnswers.includes(optionTextById.get(selectedOptionId))
      : null;

    return {
      _id: question._id,
      type: question.type,
      content: question.content,
      points: question.points,
      maxWordCount: question.maxWordCount,
      section: section
        ? {
            _id: section._id,
            title: section.title,
            order: section.order,
          }
        : null,
      selectedOptionId,
      selectedOptionText: selectedOptionId ? optionTextById.get(selectedOptionId) || '' : '',
      essayText: answer?.essayText || '',
      correctAnswers,
      score: answer?.score ?? 0,
      feedback: answer?.feedback || '',
      gradingStatus: answer?.gradingStatus || (question.type === 'essay' ? 'pending' : 'auto_graded'),
      isCorrect,
    };
  });

  const sections = [];
  const sectionLookup = new Map();

  questionResults.forEach((question) => {
    const sectionKey = question.section?._id?.toString() || 'ungrouped';

    if (!sectionLookup.has(sectionKey)) {
      const nextSection = {
        _id: question.section?._id || sectionKey,
        title: question.section?.title || 'Ungrouped',
        order: question.section?.order || 0,
        questions: [],
      };

      sectionLookup.set(sectionKey, nextSection);
      sections.push(nextSection);
    }

    sectionLookup.get(sectionKey).questions.push(question);
  });

  sections.sort((first, second) => first.order - second.order);

  const totalPoints = questionResults.reduce((sum, question) => sum + (question.points || 0), 0);
  const correctCount = questionResults.filter((question) => question.type === 'mcq' && question.isCorrect).length;
  const wrongCount = questionResults.filter((question) => question.type === 'mcq' && !question.isCorrect).length;
  const essayPendingCount = questionResults.filter(
    (question) => question.type === 'essay' && question.gradingStatus !== 'graded',
  ).length;
  const timeTakenSeconds = Math.max(
    Math.floor((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000),
    0,
  );

  return {
    attempt: {
      ...buildAttemptResponse(attempt),
      passed: resolveAttemptPassed(attempt, { hasPendingEssay: essayPendingCount > 0 }),
    },
    summary: {
      totalPoints,
      correctCount,
      wrongCount,
      essayPendingCount,
      timeTakenSeconds,
    },
    sections,
  };
};

export const getMyAttempts = async (studentId) => {
  const attempts = await TestAttempt.find({
    studentId,
    status: { $ne: 'in_progress' },
  })
    .populate('testId', 'title passingScore')
    .populate('scheduleId', 'startTime endTime')
    .sort({ submittedAt: -1, createdAt: -1 });

  const fallbackTestIds = [
    ...new Set(
      attempts
        .map((attempt) => attempt.testId?._id?.toString())
        .filter(Boolean),
    ),
  ];
  const questionIds = [...new Set(
    attempts.flatMap((attempt) => (attempt.questionOrder || []).map((questionId) => questionId.toString())),
  )];
  const fallbackSections = fallbackTestIds.length > 0
    ? await Section.find({ testId: { $in: fallbackTestIds } }).select('_id testId').lean()
    : [];
  const fallbackSectionIds = fallbackSections.map((section) => section._id);
  const fallbackSectionMap = fallbackSections.reduce((accumulator, section) => {
    accumulator[section._id.toString()] = section.testId.toString();
    return accumulator;
  }, {});

  const questions = questionIds.length > 0
    ? await Question.find({ _id: { $in: questionIds } }).select('_id points type').lean()
    : [];
  const fallbackQuestions = fallbackSectionIds.length > 0
    ? await Question.find({ sectionId: { $in: fallbackSectionIds } }).select('sectionId points').lean()
    : [];
  const answers = attempts.length > 0
    ? await Answer.find({ attemptId: { $in: attempts.map((attempt) => attempt._id) } })
      .select('attemptId questionId selectedOptionId essayText gradingStatus')
      .lean()
    : [];
  const pointsByQuestionId = new Map(questions.map((question) => [question._id.toString(), question.points || 0]));
  const questionTypeById = new Map(questions.map((question) => [question._id.toString(), question.type || 'mcq']));
  const fallbackPointsByTestId = fallbackQuestions.reduce((accumulator, question) => {
    const testId = fallbackSectionMap[question.sectionId.toString()];

    if (!testId) {
      return accumulator;
    }

    accumulator[testId] = (accumulator[testId] || 0) + (question.points || 0);
    return accumulator;
  }, {});
  const attemptedCountByAttemptId = answers.reduce((accumulator, answer) => {
    if (!isAnswerAttempted(answer)) {
      return accumulator;
    }

    const key = answer.attemptId.toString();
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
  const pendingEssayCountByAttemptId = answers.reduce((accumulator, answer) => {
    if (!isAnswerAttempted(answer)) {
      return accumulator;
    }

    if (questionTypeById.get(answer.questionId?.toString()) !== 'essay') {
      return accumulator;
    }

    if (answer.gradingStatus === 'graded') {
      return accumulator;
    }

    const key = answer.attemptId.toString();
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  return attempts.map((attempt) => {
    const totalPointsFromAttempt = (attempt.questionOrder || []).reduce(
      (sum, questionId) => sum + (pointsByQuestionId.get(questionId.toString()) || 0),
      0,
    );
    const totalPoints =
      totalPointsFromAttempt > 0
        ? totalPointsFromAttempt
        : fallbackPointsByTestId[attempt.testId?._id?.toString()] || 0;
    const pendingEssayCount = pendingEssayCountByAttemptId[attempt._id.toString()] || 0;
    const passed = resolveAttemptPassed(attempt, { hasPendingEssay: pendingEssayCount > 0 });

    return {
      attemptId: attempt._id,
      testTitle: attempt.testId?.title || 'Untitled Test',
      submittedAt: attempt.submittedAt,
      score: attempt.score ?? 0,
      totalPoints,
      questionsAttempted: attemptedCountByAttemptId[attempt._id.toString()] || 0,
      passed,
      pendingEssayCount,
      resultStatus: pendingEssayCount > 0 ? 'pending' : passed ? 'passed' : 'failed',
      status: attempt.status,
      schedule: attempt.scheduleId
        ? {
            startTime: attempt.scheduleId.startTime,
            endTime: attempt.scheduleId.endTime,
          }
        : null,
    };
  });
};


