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

const ensureQuestionExists = async (id) => {
  const question = await Question.findById(id);

  if (!question) {
    const error = new Error('Question not found.');
    error.statusCode = 404;
    throw error;
  }

  return question;
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

const ensureTeacherCanAccessSection = async (sectionId, userId, role) => {
  const section = await ensureSectionExists(sectionId);
  const test = await ensureTestExists(section.testId);

  if (role !== 'admin' && test.createdBy.toString() !== userId.toString()) {
    const error = new Error('You are not authorized to access this section.');
    error.statusCode = 403;
    throw error;
  }

  return section;
};

const ensureTeacherCanAccessQuestion = async (questionId, userId, role) => {
  const question = await ensureQuestionExists(questionId);
  await ensureTeacherCanAccessSection(question.sectionId, userId, role);
  return question;
};

const validateMcqOptions = (options) => {
  if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
    const error = new Error('MCQ questions must include between 2 and 6 options.');
    error.statusCode = 400;
    throw error;
  }

  if (!options.some((option) => option.isCorrect)) {
    const error = new Error('MCQ questions must include at least one correct option.');
    error.statusCode = 400;
    throw error;
  }
};

const attachOptions = async (questions) => {
  const questionIds = questions.filter((question) => question.type === 'mcq').map((question) => question._id);
  const options = await MCQOption.find({ questionId: { $in: questionIds } }).sort({ createdAt: 1 }).lean();
  const optionsByQuestion = options.reduce((accumulator, option) => {
    const key = option.questionId.toString();
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(option);
    return accumulator;
  }, {});

  return questions.map((question) => ({
    ...question.toObject(),
    options: question.type === 'mcq' ? optionsByQuestion[question._id.toString()] || [] : [],
  }));
};

export const createQuestion = async (sectionId, data, userId, role) => {
  await ensureTeacherCanAccessSection(sectionId, userId, role);

  if (data.type === 'mcq') {
    validateMcqOptions(data.options);
  }

  const question = await Question.create({
    sectionId,
    type: data.type,
    content: data.content,
    points: data.points,
    maxWordCount: data.type === 'essay' ? data.maxWordCount : null,
  });

  if (question.type === 'mcq') {
    await MCQOption.insertMany(
      data.options.map((option) => ({
        questionId: question._id,
        text: option.text,
        isCorrect: Boolean(option.isCorrect),
      })),
    );
  }

  const [createdQuestion] = await attachOptions([question]);
  return createdQuestion;
};

export const getQuestionsBySection = async (sectionId, userId, role) => {
  await ensureTeacherCanAccessSection(sectionId, userId, role);

  const questions = await Question.find({ sectionId }).sort({ createdAt: 1 });
  return attachOptions(questions);
};

export const updateQuestion = async (id, data, userId, role) => {
  const question = await ensureTeacherCanAccessQuestion(id, userId, role);
  const nextType = data.type || question.type;

  if (nextType === 'mcq') {
    if (data.options) {
      validateMcqOptions(data.options);
    } else if (data.type === 'mcq') {
      const error = new Error('MCQ questions require options when changing type to mcq.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (data.type !== undefined) {
    question.type = data.type;
  }

  if (data.content !== undefined) {
    question.content = data.content;
  }

  if (data.points !== undefined) {
    question.points = data.points;
  }

  if (nextType === 'essay') {
    question.maxWordCount = data.maxWordCount !== undefined ? data.maxWordCount : question.maxWordCount;
    await MCQOption.deleteMany({ questionId: question._id });
  } else {
    question.maxWordCount = null;

    if (data.options) {
      await MCQOption.deleteMany({ questionId: question._id });
      await MCQOption.insertMany(
        data.options.map((option) => ({
          questionId: question._id,
          text: option.text,
          isCorrect: Boolean(option.isCorrect),
        })),
      );
    }
  }

  await question.save();

  const [updatedQuestion] = await attachOptions([question]);
  return updatedQuestion;
};

export const deleteQuestion = async (id, userId, role) => {
  const question = await ensureTeacherCanAccessQuestion(id, userId, role);

  await MCQOption.deleteMany({ questionId: question._id });
  await Question.findByIdAndDelete(id);

  return {
    success: true,
    message: 'Question deleted successfully.',
  };
};
