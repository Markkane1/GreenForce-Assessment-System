import MCQOption from '../../models/MCQOption.js';
import Question from '../../models/Question.js';
import Section from '../../models/Section.js';
import Test from '../../models/Test.js';

const DEFAULT_OPTION_COUNT = 4;

const buildDefaultOptionDocs = (questionId) =>
  Array.from({ length: DEFAULT_OPTION_COUNT }, (_, index) => ({
    questionId,
    text: `Option ${index + 1}`,
    isCorrect: index === 0,
  }));

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

const syncQuestionOptions = async (questionIds) => {
  if (questionIds.length === 0) {
    return;
  }

  const options = await MCQOption.find({ questionId: { $in: questionIds } }).sort({ createdAt: 1 });
  const optionsByQuestion = options.reduce((accumulator, option) => {
    const key = option.questionId.toString();
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(option);
    return accumulator;
  }, {});

  await Promise.all(
    questionIds.map(async (questionId) => {
      const questionOptions = optionsByQuestion[questionId.toString()] || [];
      const keptOptions = questionOptions.slice(0, DEFAULT_OPTION_COUNT);
      const removedOptions = questionOptions.slice(DEFAULT_OPTION_COUNT);

      if (removedOptions.length > 0) {
        await MCQOption.deleteMany({ _id: { $in: removedOptions.map((option) => option._id) } });
      }

      if (keptOptions.length === 0) {
        await MCQOption.insertMany(buildDefaultOptionDocs(questionId));
        return;
      }

      while (keptOptions.length < DEFAULT_OPTION_COUNT) {
        keptOptions.push(
          await MCQOption.create({
            questionId,
            text: `Option ${keptOptions.length + 1}`,
            isCorrect: false,
          }),
        );
      }

      if (!keptOptions.some((option) => option.isCorrect)) {
        await MCQOption.findByIdAndUpdate(keptOptions[0]._id, { isCorrect: true });
      }
    }),
  );
};

const syncSectionQuestionPool = async (sectionId, targetCount) => {
  const existingQuestions = await Question.find({ sectionId }).sort({ createdAt: 1 });
  const surplusQuestions = existingQuestions.slice(targetCount);

  if (surplusQuestions.length > 0) {
    const surplusQuestionIds = surplusQuestions.map((question) => question._id);
    await MCQOption.deleteMany({ questionId: { $in: surplusQuestionIds } });
    await Question.deleteMany({ _id: { $in: surplusQuestionIds } });
  }

  const retainedQuestions = existingQuestions.slice(0, targetCount);

  await Promise.all(
    retainedQuestions.map(async (question) => {
      if (question.type !== 'mcq' || question.maxWordCount !== null) {
        question.type = 'mcq';
        question.maxWordCount = null;
        await question.save();
      }
    }),
  );

  if (retainedQuestions.length < targetCount) {
    const createdQuestions = await Question.insertMany(
      Array.from({ length: targetCount - retainedQuestions.length }, (_, index) => ({
        sectionId,
        type: 'mcq',
        content: `Question ${retainedQuestions.length + index + 1}`,
        points: 1,
        maxWordCount: null,
      })),
    );

    await MCQOption.insertMany(createdQuestions.flatMap((question) => buildDefaultOptionDocs(question._id)));
    retainedQuestions.push(...createdQuestions);
  }

  await syncQuestionOptions(retainedQuestions.map((question) => question._id));
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
  const existingSection = await ensureTeacherCanAccessSection(id, userId, role);
  const updates = {};
  const fields = ['title', 'order', 'questionPoolSize', 'questionsToServe'];

  fields.forEach((field) => {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  });

  const mergedQuestionPoolSize = updates.questionPoolSize ?? existingSection.questionPoolSize;
  const mergedQuestionsToServe = updates.questionsToServe ?? existingSection.questionsToServe;

  if (mergedQuestionsToServe > mergedQuestionPoolSize) {
    const error = new Error('questionsToServe cannot exceed questionPoolSize.');
    error.statusCode = 400;
    throw error;
  }

  const section = await Section.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
    context: 'query',
  });

  if (!section) {
    const error = new Error('Section not found.');
    error.statusCode = 404;
    throw error;
  }

  await syncSectionQuestionPool(section._id, mergedQuestionPoolSize);

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
