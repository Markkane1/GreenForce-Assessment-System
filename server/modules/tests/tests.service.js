import Answer from '../../models/Answer.js';
import MCQOption from '../../models/MCQOption.js';
import ProctorLog from '../../models/ProctorLog.js';
import Question from '../../models/Question.js';
import Section from '../../models/Section.js';
import Test from '../../models/Test.js';
import TestAttempt from '../../models/TestAttempt.js';
import TestSchedule from '../../models/TestSchedule.js';

const DEFAULT_ANTI_CHEAT = {
  disableContextMenu: true,
  disableCopyPaste: true,
  disableTranslate: true,
  disableAutocomplete: true,
  disableSpellcheck: true,
  disablePrinting: true,
};

const buildAntiCheatPayload = (antiCheat = {}) => ({
  ...DEFAULT_ANTI_CHEAT,
  ...antiCheat,
});

const buildTestPayload = (data = {}) => ({
  title: data.title,
  description: data.description,
  timeLimitMinutes: data.timeLimitMinutes,
  passingScore: data.passingScore,
  maxAttempts: data.maxAttempts,
  allowResume: data.allowResume,
  randomizeQuestions: data.randomizeQuestions,
  randomizeOptions: data.randomizeOptions,
  antiCheat: buildAntiCheatPayload(data.antiCheat),
});

const ensureTestExists = async (id) => {
  const test = await Test.findById(id).populate({
    path: 'createdBy',
    select: '-password',
  });

  if (!test) {
    const error = new Error('Test not found.');
    error.statusCode = 404;
    throw error;
  }

  return test;
};

const ensureOwnership = (test, userId, role) => {
  if (role === 'admin') {
    return;
  }

  if (test.createdBy._id.toString() !== userId.toString()) {
    const error = new Error('You are not authorized to modify this test.');
    error.statusCode = 403;
    throw error;
  }
};

const deleteQuestionsAndOptions = async (sectionIds) => {
  const questions = await Question.find({ sectionId: { $in: sectionIds } }).select('_id');
  const questionIds = questions.map((question) => question._id);

  if (questionIds.length > 0) {
    await MCQOption.deleteMany({ questionId: { $in: questionIds } });
    await Question.deleteMany({ _id: { $in: questionIds } });
  }
};

const buildQuestionCountMap = async (testIds) => {
  if (!testIds.length) {
    return new Map();
  }

  const sections = await Section.find({ testId: { $in: testIds } }).select('_id testId').lean();
  const sectionIds = sections.map((section) => section._id);

  if (sectionIds.length === 0) {
    return new Map();
  }

  const testIdBySectionId = new Map(
    sections.map((section) => [section._id.toString(), section.testId.toString()]),
  );
  const counts = await Question.aggregate([
    {
      $match: {
        sectionId: { $in: sectionIds },
      },
    },
    {
      $group: {
        _id: '$sectionId',
        questionCount: { $sum: 1 },
      },
    },
  ]);

  return counts.reduce((accumulator, entry) => {
    const testId = testIdBySectionId.get(entry._id.toString());

    if (!testId) {
      return accumulator;
    }

    accumulator.set(testId, (accumulator.get(testId) || 0) + entry.questionCount);
    return accumulator;
  }, new Map());
};

export const createTest = async (data, teacherId) =>
  Test.create({
    ...buildTestPayload(data),
    createdBy: teacherId,
  });

export const getAllTests = async (userId, role) => {
  const query = role === 'teacher' ? { createdBy: userId } : {};
  const tests = await Test.find(query)
    .populate({
      path: 'createdBy',
      select: '-password',
    })
    .sort({ createdAt: -1 });
  const questionCountMap = await buildQuestionCountMap(tests.map((test) => test._id));

  return tests.map((test) => ({
    ...test.toObject(),
    questionCount: questionCountMap.get(test._id.toString()) || 0,
  }));
};

export const getTestById = async (id) => {
  const test = await ensureTestExists(id);
  const sections = await Section.find({ testId: id }).sort({ order: 1 }).lean();
  const sectionIds = sections.map((section) => section._id);
  const counts = await Question.aggregate([
    {
      $match: {
        sectionId: { $in: sectionIds },
      },
    },
    {
      $group: {
        _id: '$sectionId',
        questionCount: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map(counts.map((entry) => [entry._id.toString(), entry.questionCount]));

  return {
    ...test.toObject(),
    sections: sections.map((section) => ({
      ...section,
      questionCount: countMap.get(section._id.toString()) || 0,
    })),
  };
};

export const getTestWorkspace = async (id) => {
  const test = await ensureTestExists(id);
  const sections = await Section.find({ testId: id }).sort({ order: 1 }).lean();
  const sectionIds = sections.map((section) => section._id);
  const questions = sectionIds.length > 0
    ? await Question.find({ sectionId: { $in: sectionIds } }).sort({ createdAt: 1 }).lean()
    : [];
  const questionIds = questions.map((question) => question._id);
  const options = questionIds.length > 0
    ? await MCQOption.find({ questionId: { $in: questionIds } }).sort({ createdAt: 1 }).lean()
    : [];

  const optionsByQuestionId = options.reduce((accumulator, option) => {
    const key = option.questionId.toString();
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(option);
    return accumulator;
  }, {});

  const questionsBySectionId = questions.reduce((accumulator, question) => {
    const key = question.sectionId.toString();
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push({
      ...question,
      options: question.type === 'mcq' ? optionsByQuestionId[question._id.toString()] || [] : [],
    });
    return accumulator;
  }, {});

  return {
    ...test.toObject(),
    sections: sections.map((section) => ({
      ...section,
      questions: questionsBySectionId[section._id.toString()] || [],
      questionCount: (questionsBySectionId[section._id.toString()] || []).length,
    })),
  };
};

export const updateTest = async (id, data, userId, role) => {
  const test = await ensureTestExists(id);
  ensureOwnership(test, userId, role);

  const updatableFields = [
    'title',
    'description',
    'timeLimitMinutes',
    'passingScore',
    'maxAttempts',
    'allowResume',
    'randomizeQuestions',
    'randomizeOptions',
  ];

  updatableFields.forEach((field) => {
    if (data[field] !== undefined) {
      test[field] = data[field];
    }
  });

  if (data.antiCheat !== undefined) {
    test.antiCheat = buildAntiCheatPayload({
      ...(test.antiCheat?.toObject?.() || test.antiCheat || {}),
      ...data.antiCheat,
    });
  }

  await test.save();

  return test;
};

export const deleteTest = async (id, userId, role) => {
  const test = await ensureTestExists(id);
  ensureOwnership(test, userId, role);

  const schedules = await TestSchedule.find({ testId: id }).select('_id').lean();
  const scheduleIds = schedules.map((schedule) => schedule._id);
  const attempts = scheduleIds.length > 0
    ? await TestAttempt.find({ scheduleId: { $in: scheduleIds } }).select('_id').lean()
    : [];
  const attemptIds = attempts.map((attempt) => attempt._id);
  const sections = await Section.find({ testId: id }).select('_id');
  const sectionIds = sections.map((section) => section._id);

  if (attemptIds.length > 0) {
    await Promise.all([
      Answer.deleteMany({ attemptId: { $in: attemptIds } }),
      ProctorLog.deleteMany({ attemptId: { $in: attemptIds } }),
      TestAttempt.deleteMany({ _id: { $in: attemptIds } }),
    ]);
  }

  if (scheduleIds.length > 0) {
    await TestSchedule.deleteMany({ _id: { $in: scheduleIds } });
  }

  if (sectionIds.length > 0) {
    await deleteQuestionsAndOptions(sectionIds);
    await Section.deleteMany({ _id: { $in: sectionIds } });
  }

  await Test.findByIdAndDelete(id);

  return {
    success: true,
    message: 'Test deleted successfully.',
  };
};

export const publishTest = async (id, userId, role) => {
  const test = await ensureTestExists(id);
  ensureOwnership(test, userId, role);

  const sections = await Section.find({ testId: id }).select('_id title');

  if (sections.length === 0) {
    const error = new Error('Test must contain at least one section before publishing.');
    error.statusCode = 409;
    throw error;
  }

  const sectionIds = sections.map((section) => section._id);
  const counts = await Question.aggregate([
    {
      $match: {
        sectionId: { $in: sectionIds },
      },
    },
    {
      $group: {
        _id: '$sectionId',
        questionCount: { $sum: 1 },
      },
    },
  ]);

  const countMap = new Map(counts.map((entry) => [entry._id.toString(), entry.questionCount]));
  const emptySection = sections.find((section) => !countMap.get(section._id.toString()));

  if (emptySection) {
    const error = new Error(`Section "${emptySection.title}" must contain at least one question before publishing.`);
    error.statusCode = 409;
    throw error;
  }

  test.isPublished = true;
  await test.save();

  return test;
};
