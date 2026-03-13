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
  ...question.toObject(),
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

const getAttemptById = async (attemptId) => {
  const attempt = await TestAttempt.findById(attemptId)
    .populate('testId')
    .populate('scheduleId');

  if (!attempt) {
    const error = new Error('Exam attempt not found.');
    error.statusCode = 404;
    throw error;
  }

  return attempt;
};

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

const ensureAttemptActive = async (attempt) => {
  if (attempt.status !== 'in_progress') {
    const error = new Error('Exam attempt is not active.');
    error.statusCode = 400;
    throw error;
  }

  const expiresAt = getAttemptExpiry(attempt);

  if (Date.now() > expiresAt.getTime()) {
    await autoGradeMCQ(attempt._id);
    attempt.status = 'expired';
    attempt.submittedAt = new Date();
    await attempt.save();

    const error = new Error('Exam time has expired.');
    error.statusCode = 400;
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
  const schedule = await TestSchedule.findById(scheduleId);

  if (!schedule) {
    const error = new Error('Schedule not found.');
    error.statusCode = 404;
    throw error;
  }

  if (now < new Date(schedule.startTime) || now > new Date(schedule.endTime)) {
    const error = new Error('Exam is not currently active');
    error.statusCode = 403;
    throw error;
  }

  const memberships = await GroupMember.find({
    groupId: { $in: schedule.assignedGroups },
    studentId,
  }).select('_id');
  const isAssigned = memberships.length > 0;

  if (!isAssigned) {
    const error = new Error('You are not assigned to this exam schedule.');
    error.statusCode = 403;
    throw error;
  }

  const test = await Test.findById(schedule.testId);

  if (!test) {
    const error = new Error('Test not found.');
    error.statusCode = 404;
    throw error;
  }

  const existingAttempt = await TestAttempt.findOne({
    studentId,
    scheduleId,
    status: 'in_progress',
  })
    .populate('testId')
    .populate('scheduleId');

  if (existingAttempt) {
    if (test.allowResume) {
      const elapsedSeconds = Math.floor((Date.now() - existingAttempt.startedAt.getTime()) / 1000);
      const totalSeconds = test.timeLimitMinutes * 60;
      const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

      if (remainingSeconds === 0) {
        await submitExam(existingAttempt._id.toString(), studentId);
        throw Object.assign(new Error('Exam time has expired'), { statusCode: 403 });
      }

      return buildResumePayload(existingAttempt, remainingSeconds);
    }

    const error = new Error('An exam attempt is already in progress and resume is not allowed');
    error.statusCode = 403;
    throw error;
  }

  const completedAttempt = await TestAttempt.findOne({
    studentId,
    scheduleId,
    status: { $in: ['submitted', 'force_submitted', 'expired'] },
  })
    .sort({ submittedAt: -1, createdAt: -1 })
    .populate('testId')
    .populate('scheduleId');

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
    error.statusCode = 400;
    throw error;
  }

  const sections = await Section.find({ testId: test._id }).sort({ order: 1 });

  if (sections.length === 0) {
    const error = new Error('This test has no sections configured.');
    error.statusCode = 400;
    throw error;
  }

  const selectedQuestions = [];

  for (const section of sections) {
    const sectionQuestions = await Question.find({ sectionId: section._id })
      .sort({ createdAt: 1 })
      .limit(section.questionPoolSize);

    if (sectionQuestions.length < section.questionsToServe) {
      const error = new Error(`Section "${section.title}" does not have enough questions configured.`);
      error.statusCode = 400;
      throw error;
    }

    const sampledQuestions = shuffleArray(sectionQuestions).slice(0, section.questionsToServe);
    selectedQuestions.push(...sampledQuestions);
  }

  const orderedQuestionDocs = test.randomizeQuestions ? shuffleArray(selectedQuestions) : selectedQuestions;
  const questionOrder = orderedQuestionDocs.map((question) => question._id.toString());
  const optionOrder = {};

  const orderedQuestions = await Promise.all(
    orderedQuestionDocs.map(async (question) => {
      if (question.type !== 'mcq') {
        return buildQuestionPayload(question);
      }

      const options = await MCQOption.find({ questionId: question._id }).sort({ createdAt: 1 }).lean();
      const orderedOptions = test.randomizeOptions ? shuffleArray(options) : options;
      optionOrder[question._id.toString()] = orderedOptions.map((option) => option._id.toString());

      return buildQuestionPayload(question, orderedOptions);
    }),
  );

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
    })
      .populate('testId')
      .populate('scheduleId');

    if (!concurrentAttempt) {
      throw error;
    }

    if (!test.allowResume) {
      const resumeError = new Error('An exam attempt is already in progress and resume is not allowed');
      resumeError.statusCode = 403;
      throw resumeError;
    }

    const elapsedSeconds = Math.floor((Date.now() - concurrentAttempt.startedAt.getTime()) / 1000);
    const totalSeconds = test.timeLimitMinutes * 60;
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

    if (remainingSeconds === 0) {
      await submitExam(concurrentAttempt._id.toString(), studentId);
      throw Object.assign(new Error('Exam time has expired'), { statusCode: 403 });
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

  if (attempt.status !== 'in_progress') {
    const error = new Error('Exam attempt is not active.');
    error.statusCode = 400;
    throw error;
  }

  if (Date.now() > new Date(attempt.scheduleId.endTime).getTime()) {
    const score = await autoGradeMCQ(attemptId);
    attempt.status = 'expired';
    attempt.submittedAt = attempt.submittedAt || new Date();
    attempt.score = score;
    await attempt.save();

    const error = new Error('Exam window has closed');
    error.statusCode = 403;
    throw error;
  }

  await ensureAttemptActive(attempt);

  const questionOrder = (attempt.questionOrder || []).map((id) => id.toString());

  if (!questionOrder.includes(questionId.toString())) {
    const error = new Error('Question does not belong to this exam attempt.');
    error.statusCode = 400;
    throw error;
  }

  const question = await Question.findById(questionId);

  if (!question) {
    const error = new Error('Question not found.');
    error.statusCode = 404;
    throw error;
  }

  const update = {
    attemptId,
    questionId,
  };

  if (question.type === 'mcq') {
    const selectedOptionId = answer?.selectedOptionId;

    if (!selectedOptionId) {
      const error = new Error('selectedOptionId is required for MCQ answers.');
      error.statusCode = 400;
      throw error;
    }

    const option = await MCQOption.findOne({
      _id: selectedOptionId,
      questionId,
    }).select('_id');

    if (!option) {
      const error = new Error('Selected option is invalid for this question.');
      error.statusCode = 400;
      throw error;
    }

    update.selectedOptionId = selectedOptionId;
    update.essayText = '';
    update.gradingStatus = 'pending';
  } else {
    const essayText = answer?.essayText || '';

    if (question.maxWordCount && getWordCount(essayText) > question.maxWordCount) {
      const error = new Error(`Essay answers cannot exceed ${question.maxWordCount} words.`);
      error.statusCode = 400;
      throw error;
    }

    update.selectedOptionId = null;
    update.essayText = essayText;
    update.gradingStatus = 'pending';
  }

  return Answer.findOneAndUpdate(
    { attemptId, questionId },
    update,
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
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
    error.statusCode = 400;
    throw error;
  }

  const elapsed = Date.now() - new Date(attempt.startedAt).getTime();
  const allowedMs = (attempt.testId.timeLimitMinutes * 60 * 1000) + 30000;
  const scheduleClosed = Date.now() > new Date(attempt.scheduleId.endTime).getTime();

  if (elapsed > allowedMs || scheduleClosed) {
    const score = await autoGradeMCQ(attemptId);
    attempt.status = 'expired';
    attempt.submittedAt = attempt.submittedAt || new Date();
    attempt.score = score;
    await attempt.save();

    return buildAttemptResponse(attempt);
  }

  const score = await autoGradeMCQ(attemptId);
  attempt.status = 'submitted';
  attempt.submittedAt = new Date();
  attempt.score = score;
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
    error.statusCode = 400;
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
    attempt: buildAttemptResponse(attempt),
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

  const questionIds = [...new Set(
    attempts.flatMap((attempt) => (attempt.questionOrder || []).map((questionId) => questionId.toString())),
  )];

  const questions = questionIds.length > 0
    ? await Question.find({ _id: { $in: questionIds } }).select('_id points').lean()
    : [];
  const pointsByQuestionId = new Map(questions.map((question) => [question._id.toString(), question.points || 0]));

  return attempts.map((attempt) => {
    const totalPoints = (attempt.questionOrder || []).reduce(
      (sum, questionId) => sum + (pointsByQuestionId.get(questionId.toString()) || 0),
      0,
    );

    return {
      attemptId: attempt._id,
      testTitle: attempt.testId?.title || 'Untitled Test',
      submittedAt: attempt.submittedAt,
      score: attempt.score ?? 0,
      totalPoints,
      passed:
        typeof attempt.passed === 'boolean'
          ? attempt.passed
          : (attempt.score ?? 0) >= (attempt.testId?.passingScore ?? Number.POSITIVE_INFINITY),
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


