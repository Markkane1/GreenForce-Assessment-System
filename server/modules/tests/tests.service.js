import MCQOption from '../../models/MCQOption.js';
import Question from '../../models/Question.js';
import Section from '../../models/Section.js';
import Test from '../../models/Test.js';

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

const ensureOwnership = (test, userId) => {
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

export const createTest = async (data, teacherId) =>
  Test.create({
    ...data,
    createdBy: teacherId,
  });

export const getAllTests = async (userId, role) => {
  const query = role === 'teacher' ? { createdBy: userId } : {};

  return Test.find(query)
    .populate({
      path: 'createdBy',
      select: '-password',
    })
    .sort({ createdAt: -1 });
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

export const updateTest = async (id, data, userId) => {
  const test = await ensureTestExists(id);
  ensureOwnership(test, userId);

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

  await test.save();

  return test;
};

export const deleteTest = async (id, userId) => {
  const test = await ensureTestExists(id);
  ensureOwnership(test, userId);

  const sections = await Section.find({ testId: id }).select('_id');
  const sectionIds = sections.map((section) => section._id);

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

export const publishTest = async (id, userId) => {
  const test = await ensureTestExists(id);
  ensureOwnership(test, userId);

  const sections = await Section.find({ testId: id }).select('_id title');

  if (sections.length === 0) {
    const error = new Error('Test must contain at least one section before publishing.');
    error.statusCode = 400;
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
    error.statusCode = 400;
    throw error;
  }

  test.isPublished = true;
  await test.save();

  return test;
};
