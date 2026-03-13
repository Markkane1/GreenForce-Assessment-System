import Answer from '../../models/Answer.js';
import MCQOption from '../../models/MCQOption.js';
import Question from '../../models/Question.js';
import Test from '../../models/Test.js';
import TestAttempt from '../../models/TestAttempt.js';

const FINISHED_ATTEMPT_STATUSES = ['submitted', 'force_submitted', 'expired'];

const ensureTeacherOwnsTest = async (testId, teacherId) => {
  const test = await Test.findById(testId).select('title passingScore createdBy');

  if (!test) {
    const error = new Error('Test not found.');
    error.statusCode = 404;
    throw error;
  }

  if (test.createdBy.toString() !== teacherId.toString()) {
    const error = new Error('You are not authorized to grade this test.');
    error.statusCode = 403;
    throw error;
  }

  return test;
};

const getEssayQuestionIds = async (attemptIds) => {
  const answers = await Answer.find({ attemptId: { $in: attemptIds } }).select('attemptId questionId gradingStatus');
  const questionIds = [...new Set(answers.map((answer) => answer.questionId.toString()))];
  const questions = await Question.find({ _id: { $in: questionIds } }).select('_id type');
  const questionTypeMap = new Map(questions.map((question) => [question._id.toString(), question.type]));

  return answers.reduce((accumulator, answer) => {
    if (questionTypeMap.get(answer.questionId.toString()) !== 'essay') {
      return accumulator;
    }

    const key = answer.attemptId.toString();
    accumulator[key] = accumulator[key] || { hasEssay: false, hasPendingEssay: false };
    accumulator[key].hasEssay = true;

    if (answer.gradingStatus === 'pending') {
      accumulator[key].hasPendingEssay = true;
    }

    return accumulator;
  }, {});
};

export const finalizeAttempt = async (attemptId, teacherId) => {
  const attempt = await TestAttempt.findById(attemptId)
    .populate({ path: 'testId', select: 'title passingScore createdBy' })
    .populate({ path: 'studentId', select: 'name email' });

  if (!attempt) {
    const error = new Error('Attempt not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!FINISHED_ATTEMPT_STATUSES.includes(attempt.status)) {
    const error = new Error('Only completed attempts can be finalized.');
    error.statusCode = 400;
    throw error;
  }

  if (attempt.testId.createdBy.toString() !== teacherId.toString()) {
    const error = new Error('You are not authorized to finalize this attempt.');
    error.statusCode = 403;
    throw error;
  }

  const answers = await Answer.find({ attemptId }).populate({ path: 'questionId', select: 'type' });
  const pendingEssay = answers.find(
    (answer) => answer.questionId?.type === 'essay' && answer.gradingStatus !== 'graded',
  );

  if (pendingEssay) {
    const error = new Error('All essay answers must be graded before finalizing the attempt.');
    error.statusCode = 400;
    throw error;
  }

  const totalScore = answers.reduce((sum, answer) => sum + (answer.score || 0), 0);
  attempt.score = totalScore;
  attempt.passed = totalScore >= attempt.testId.passingScore;
  await attempt.save();

  return attempt;
};

export const getAttemptsForGrading = async (teacherId, filters = {}) => {
  const testQuery = { createdBy: teacherId };

  if (filters.testId) {
    testQuery._id = filters.testId;
  }

  const tests = await Test.find(testQuery).select('_id title');
  const testIds = tests.map((test) => test._id);

  const attempts = await TestAttempt.find({
    testId: { $in: testIds },
    status: { $in: FINISHED_ATTEMPT_STATUSES },
  })
    .populate({ path: 'studentId', select: 'name' })
    .populate({ path: 'testId', select: 'title' })
    .sort({ submittedAt: -1 });

  const attemptStatusMap = await getEssayQuestionIds(attempts.map((attempt) => attempt._id));

  return attempts.filter((attempt) => {
    const gradingState = attemptStatusMap[attempt._id.toString()] || { hasEssay: false, hasPendingEssay: false };

    if (filters.status === 'pending_essay') {
      return gradingState.hasPendingEssay;
    }

    if (filters.status === 'fully_graded') {
      return !gradingState.hasPendingEssay;
    }

    return true;
  });
};

export const getAttemptDetail = async (attemptId, teacherId) => {
  const attempt = await TestAttempt.findById(attemptId)
    .populate({ path: 'studentId', select: 'name email' })
    .populate({ path: 'testId', select: 'title passingScore createdBy' })
    .populate({ path: 'scheduleId' });

  if (!attempt) {
    const error = new Error('Attempt not found.');
    error.statusCode = 404;
    throw error;
  }

  if (attempt.testId.createdBy.toString() !== teacherId.toString()) {
    const error = new Error('You are not authorized to view this attempt.');
    error.statusCode = 403;
    throw error;
  }

  const answers = await Answer.find({ attemptId })
    .populate({ path: 'questionId', select: 'type content points maxWordCount' })
    .populate({ path: 'selectedOptionId', select: 'text' })
    .sort({ createdAt: 1 });

  const questionIds = answers.map((answer) => answer.questionId?._id).filter(Boolean);
  const mcqOptions = await MCQOption.find({ questionId: { $in: questionIds } }).select('questionId text isCorrect');
  const optionsByQuestion = mcqOptions.reduce((accumulator, option) => {
    const key = option.questionId.toString();
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(option);
    return accumulator;
  }, {});

  const enrichedAnswers = answers.map((answer) => {
    const questionId = answer.questionId?._id?.toString();
    const correctAnswers = (optionsByQuestion[questionId] || [])
      .filter((option) => option.isCorrect)
      .map((option) => option.text);

    return {
      ...answer.toObject(),
      correctAnswers,
    };
  });

  return {
    ...attempt.toObject(),
    answers: enrichedAnswers,
  };
};

export const gradeEssay = async (answerId, score, feedback, teacherId) => {
  const answer = await Answer.findById(answerId).populate({
    path: 'questionId',
    select: 'type points',
  });

  if (!answer) {
    const error = new Error('Answer not found.');
    error.statusCode = 404;
    throw error;
  }

  if (answer.questionId?.type !== 'essay') {
    const error = new Error('Only essay answers can be graded manually.');
    error.statusCode = 400;
    throw error;
  }

  const attempt = await TestAttempt.findById(answer.attemptId).select('testId');

  if (!attempt) {
    const error = new Error('Attempt not found for this answer.');
    error.statusCode = 404;
    throw error;
  }

  await ensureTeacherOwnsTest(attempt.testId, teacherId);

  if (score < 0 || score > answer.questionId.points) {
    const error = new Error(`Score must be between 0 and ${answer.questionId.points}.`);
    error.statusCode = 400;
    throw error;
  }

  const updatedAnswer = await Answer.findByIdAndUpdate(
    answerId,
    {
      score,
      feedback,
      gradingStatus: 'graded',
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .populate({ path: 'questionId', select: 'type content points maxWordCount' })
    .populate({ path: 'selectedOptionId', select: 'text' });

  const pendingAnswers = await Answer.find({
    attemptId: answer.attemptId,
    gradingStatus: 'pending',
  }).populate({ path: 'questionId', select: 'type' });

  const hasPendingEssay = pendingAnswers.some((pendingAnswer) => pendingAnswer.questionId?.type === 'essay');
  let finalizedAttempt = null;

  if (!hasPendingEssay) {
    finalizedAttempt = await finalizeAttempt(answer.attemptId, teacherId);
  }

  return {
    answer: updatedAnswer,
    attempt: finalizedAttempt,
  };
};
