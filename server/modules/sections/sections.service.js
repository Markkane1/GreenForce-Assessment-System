import MCQOption from '../../models/MCQOption.js';
import Question from '../../models/Question.js';
import Section from '../../models/Section.js';
import Test from '../../models/Test.js';

const ensureSectionExists = async (id) => {
  const section = await Section.findById(id);

  if (!section) {
    const error = new Error('Section not found.');
    error.statusCode = 404;
    throw error;
  }

  return section;
};

const ensureTestExists = async (id) => {
  const test = await Test.findById(id);

  if (!test) {
    const error = new Error('Test not found.');
    error.statusCode = 404;
    throw error;
  }

  return test;
};

const ensureTeacherCanAccessTest = (test, userId, role) => {
  if (role === 'admin') {
    return;
  }

  if (test.createdBy.toString() !== userId.toString()) {
    const error = new Error('You are not authorized to access this test.');
    error.statusCode = 403;
    throw error;
  }
};

const ensureTeacherCanAccessSection = async (sectionId, userId, role) => {
  const section = await ensureSectionExists(sectionId);
  const test = await ensureTestExists(section.testId);
  ensureTeacherCanAccessTest(test, userId, role);

  return section;
};

const deleteSectionQuestions = async (sectionId) => {
  const questions = await Question.find({ sectionId }).select('_id');
  const questionIds = questions.map((question) => question._id);

  if (questionIds.length > 0) {
    await MCQOption.deleteMany({ questionId: { $in: questionIds } });
    await Question.deleteMany({ _id: { $in: questionIds } });
  }
};

export const createSection = async (testId, data, userId, role) => {
  const test = await ensureTestExists(testId);
  ensureTeacherCanAccessTest(test, userId, role);

  return Section.create({
    ...data,
    testId,
  });
};

export const getSectionsByTest = async (testId, userId, role) => {
  const test = await ensureTestExists(testId);
  ensureTeacherCanAccessTest(test, userId, role);
  return Section.find({ testId }).sort({ order: 1 });
};

export const updateSection = async (id, data, userId, role) => {
  await ensureTeacherCanAccessSection(id, userId, role);
  const updates = {};
  const fields = ['title', 'order', 'questionPoolSize', 'questionsToServe'];

  fields.forEach((field) => {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  });

  const section = await Section.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!section) {
    const error = new Error('Section not found.');
    error.statusCode = 404;
    throw error;
  }

  return section;
};

export const deleteSection = async (id, userId, role) => {
  const section = await ensureTeacherCanAccessSection(id, userId, role);

  await deleteSectionQuestions(section._id);
  await Section.findByIdAndDelete(id);

  return {
    success: true,
    message: 'Section deleted successfully.',
  };
};
