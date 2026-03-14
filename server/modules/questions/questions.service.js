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
  if (!Array.isArray(options) || options.length !== 4) {
    const error = new Error('MCQ questions must include exactly 4 options.');
    error.statusCode = 400;
    throw error;
  }

  if (options.some((option) => !option.text?.trim())) {
    const error = new Error('MCQ option text is required for all 4 options.');
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

const syncSectionQuestionCounts = async (sectionId) => {
  const totalQuestionCount = await Question.countDocuments({ sectionId });

  await Section.findByIdAndUpdate(sectionId, {
    questionPoolSize: totalQuestionCount,
    questionsToServe: totalQuestionCount,
  });

  return totalQuestionCount;
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

  await syncSectionQuestionCounts(sectionId);

  const [createdQuestion] = await attachOptions([question]);
  return createdQuestion;
};

export const importQuestions = async (sectionId, rows, userId, role) => {
  const section = await ensureTeacherCanAccessSection(sectionId, userId, role);

  if (!Array.isArray(rows) || rows.length === 0) {
    const error = new Error('Import payload must include at least one question.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedRows = rows.map((row, index) => {
    const content = row.content?.trim();
    const options = Array.isArray(row.options)
      ? row.options.map((option) => ({
          text: option.text?.trim(),
          isCorrect: Boolean(option.isCorrect),
        }))
      : [];

    if (!content) {
      const error = new Error(`Row ${index + 1}: question text is required.`);
      error.statusCode = 400;
      throw error;
    }

    validateMcqOptions(options);

    return {
      sectionId,
      type: 'mcq',
      content,
      points: Number.isFinite(Number(row.points)) && Number(row.points) > 0 ? Number(row.points) : 1,
      maxWordCount: null,
      options,
    };
  });

  const createdQuestions = await Question.insertMany(
    normalizedRows.map((row) => ({
      sectionId: row.sectionId,
      type: row.type,
      content: row.content,
      points: row.points,
      maxWordCount: null,
    })),
  );

  await MCQOption.insertMany(
    createdQuestions.flatMap((question, index) =>
      normalizedRows[index].options.map((option) => ({
        questionId: question._id,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    ),
  );

  await syncSectionQuestionCounts(sectionId);

  return {
    importedCount: createdQuestions.length,
  };
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
  await syncSectionQuestionCounts(question.sectionId);

  return {
    success: true,
    message: 'Question deleted successfully.',
  };
};
