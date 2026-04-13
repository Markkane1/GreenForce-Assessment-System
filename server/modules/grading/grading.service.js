import Answer from '../../models/Answer.js';
import GroupMember from '../../models/GroupMember.js';
import MCQOption from '../../models/MCQOption.js';
import Question from '../../models/Question.js';
import TestSchedule from '../../models/TestSchedule.js';
import Test from '../../models/Test.js';
import TestAttempt from '../../models/TestAttempt.js';

const FINISHED_ATTEMPT_STATUSES = ['submitted', 'force_submitted', 'expired'];
const isAnswerAttempted = (answer) =>
  Boolean(answer?.selectedOptionId) || Boolean(answer?.essayText?.trim());
const resolveAttemptPassed = (attempt, passingScore, hasPendingEssay = false) => {
  if (typeof attempt?.passed === 'boolean') {
    return attempt.passed;
  }

  if (hasPendingEssay) {
    return null;
  }

  const resolvedPassingScore = Number(passingScore);
  const resolvedScore = Number(attempt?.score);

  if (!Number.isFinite(resolvedPassingScore) || !Number.isFinite(resolvedScore)) {
    return null;
  }

  return resolvedScore >= resolvedPassingScore;
};

const buildManagedTestQuery = (teacherId, role, filters = {}) => {
  const query = role === 'admin' ? {} : { createdBy: teacherId };

  if (filters.testId) {
    query._id = filters.testId;
  }

  return query;
};

const ensureTeacherOwnsTest = async (testId, teacherId, role = 'teacher') => {
  const test = await Test.findById(testId).select('title passingScore createdBy');

  if (!test) {
    const error = new Error('Test not found.');
    error.statusCode = 404;
    throw error;
  }

  if (role !== 'admin' && test.createdBy.toString() !== teacherId.toString()) {
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

export const finalizeAttempt = async (attemptId, teacherId, role = 'teacher') => {
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
    error.statusCode = 409;
    throw error;
  }

  if (role !== 'admin' && attempt.testId.createdBy.toString() !== teacherId.toString()) {
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
    error.statusCode = 409;
    throw error;
  }

  const totalScore = answers.reduce((sum, answer) => sum + (answer.score || 0), 0);
  attempt.score = totalScore;
  attempt.passed = totalScore >= attempt.testId.passingScore;
  await attempt.save();

  return attempt;
};

export const getAttemptsForGrading = async (teacherId, filters = {}, role = 'teacher') => {
  const tests = await Test.find(buildManagedTestQuery(teacherId, role, filters)).select('_id title');
  const testIds = tests.map((test) => test._id);

  const attemptQuery = {
    testId: { $in: testIds },
    status: { $in: FINISHED_ATTEMPT_STATUSES },
  };

  if (filters.scheduleId) {
    attemptQuery.scheduleId = filters.scheduleId;
  }

  const attempts = await TestAttempt.find(attemptQuery)
    .populate({ path: 'studentId', select: 'name' })
    .populate({ path: 'testId', select: 'title' })
    .populate({ path: 'scheduleId', select: 'startTime endTime' })
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

export const getConcludedSchedules = async (teacherId, role = 'teacher') => {
  const tests = await Test.find(buildManagedTestQuery(teacherId, role)).select('_id');
  const testIds = tests.map((test) => test._id);

  const schedules = await TestSchedule.find({
    testId: { $in: testIds },
    endTime: { $lt: new Date() },
  })
    .populate({
      path: 'testId',
      select: 'title passingScore createdBy',
      populate: {
        path: 'createdBy',
        select: 'name email',
      },
    })
    .populate({
      path: 'assignedGroups',
      select: 'name',
    })
    .sort({ endTime: -1 });

  const scheduleIds = schedules.map((schedule) => schedule._id);
  const attempts = scheduleIds.length
    ? await TestAttempt.find({
        scheduleId: { $in: scheduleIds },
        status: { $in: FINISHED_ATTEMPT_STATUSES },
      }).select('_id scheduleId studentId violationsCount')
    : [];
  const essayStateMap = await getEssayQuestionIds(attempts.map((attempt) => attempt._id));
  const uniqueGroupIds = [
    ...new Set(
      schedules.flatMap((schedule) => (schedule.assignedGroups || []).map((group) => group._id.toString())),
    ),
  ];
  const memberships = uniqueGroupIds.length
    ? await GroupMember.find({ groupId: { $in: uniqueGroupIds } }).select('groupId studentId')
    : [];
  const memberCountByGroup = memberships.reduce((accumulator, membership) => {
    const key = membership.groupId.toString();
    accumulator[key] = accumulator[key] || new Set();
    accumulator[key].add(membership.studentId.toString());
    return accumulator;
  }, {});

  return schedules.map((schedule) => {
    const candidateIds = new Set(
      (schedule.assignedGroups || []).flatMap((group) => Array.from(memberCountByGroup[group._id.toString()] || [])),
    );
    const scheduleAttempts = attempts.filter(
      (attempt) => attempt.scheduleId.toString() === schedule._id.toString(),
    );
    const presentCandidateIds = new Set(scheduleAttempts.map((attempt) => attempt.studentId.toString()));
    const totalViolations = scheduleAttempts.reduce(
      (sum, attempt) => sum + (attempt.violationsCount || 0),
      0,
    );
    const hasPendingEssay = scheduleAttempts.some(
      (attempt) => essayStateMap[attempt._id.toString()]?.hasPendingEssay,
    );

    return {
      _id: schedule._id,
      testTitle: schedule.testId?.title || 'Untitled Test',
      passingScore: schedule.testId?.passingScore ?? 0,
      conductingOfficer: schedule.testId?.createdBy?.name || 'Unknown Teacher',
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      assignedGroups: (schedule.assignedGroups || []).map((group) => ({
        _id: group._id,
        name: group.name,
      })),
      assignedCandidateCount: candidateIds.size,
      attendanceCount: presentCandidateIds.size,
      absentCount: Math.max(candidateIds.size - presentCandidateIds.size, 0),
      totalViolations,
      gradingStatus: hasPendingEssay ? 'pending_essay' : 'ready',
      pendingEssayAttempts: scheduleAttempts.filter(
        (attempt) => essayStateMap[attempt._id.toString()]?.hasPendingEssay,
      ).length,
    };
  });
};

export const getScheduleReport = async (scheduleId, teacherId, role = 'teacher') => {
  const schedule = await TestSchedule.findById(scheduleId)
    .populate({
      path: 'testId',
      select: 'title passingScore createdBy',
      populate: {
        path: 'createdBy',
        select: 'name email',
      },
    })
    .populate({
      path: 'assignedGroups',
      select: 'name',
    });

  if (!schedule) {
    const error = new Error('Schedule not found.');
    error.statusCode = 404;
    throw error;
  }

  if (role !== 'admin' && schedule.testId?.createdBy?._id?.toString() !== teacherId.toString()) {
    const error = new Error('You are not authorized to view this schedule report.');
    error.statusCode = 403;
    throw error;
  }

  const memberships = await GroupMember.find({
    groupId: { $in: (schedule.assignedGroups || []).map((group) => group._id) },
  })
    .populate({ path: 'groupId', select: 'name' })
    .populate({ path: 'studentId', select: 'name email' })
    .sort({ createdAt: 1 });

  const candidates = memberships.reduce((accumulator, membership) => {
    const student = membership.studentId;

    if (!student) {
      return accumulator;
    }

    if (!accumulator.has(student._id.toString())) {
      accumulator.set(student._id.toString(), {
        _id: student._id,
        name: student.name,
        email: student.email,
        groupNames: [],
      });
    }

    const candidate = accumulator.get(student._id.toString());
    const groupName = membership.groupId?.name;

    if (groupName && !candidate.groupNames.includes(groupName)) {
      candidate.groupNames.push(groupName);
    }

    return accumulator;
  }, new Map());

  const attempts = await TestAttempt.find({
    scheduleId,
    status: { $in: FINISHED_ATTEMPT_STATUSES },
  })
    .populate({ path: 'studentId', select: 'name email' })
    .sort({ submittedAt: -1, createdAt: -1 });

  const latestAttemptByStudent = attempts.reduce((accumulator, attempt) => {
    const key = attempt.studentId?._id?.toString() || attempt.studentId?.toString();

    if (key && !accumulator.has(key)) {
      accumulator.set(key, attempt);
    }

    return accumulator;
  }, new Map());

  latestAttemptByStudent.forEach((attempt, studentId) => {
    if (!attempt.studentId || candidates.has(studentId)) {
      return;
    }

    candidates.set(studentId, {
      _id: attempt.studentId._id || attempt.studentId,
      name: attempt.studentId.name || 'Unknown Candidate',
      email: attempt.studentId.email || '',
      groupNames: [],
    });
  });

  const attemptIds = Array.from(latestAttemptByStudent.values()).map((attempt) => attempt._id);
  const answers = attemptIds.length
    ? await Answer.find({ attemptId: { $in: attemptIds } }).select('attemptId questionId selectedOptionId essayText')
    : [];
  const questionIds = [...new Set(answers.map((answer) => answer.questionId.toString()))];
  const questions = questionIds.length
    ? await Question.find({ _id: { $in: questionIds } }).select('_id type')
    : [];
  const questionTypeMap = new Map(questions.map((question) => [question._id.toString(), question.type]));
  const mcqQuestionIds = questions.filter((question) => question.type === 'mcq').map((question) => question._id);
  const correctOptions = mcqQuestionIds.length
    ? await MCQOption.find({
        questionId: { $in: mcqQuestionIds },
        isCorrect: true,
      }).select('_id questionId')
    : [];
  const correctOptionIds = new Set(correctOptions.map((option) => option._id.toString()));
  const answersByAttempt = answers.reduce((accumulator, answer) => {
    const key = answer.attemptId.toString();
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(answer);
    return accumulator;
  }, {});
  const essayStateMap = await getEssayQuestionIds(attemptIds);

  const candidateRows = Array.from(candidates.values()).map((candidate) => {
    const attempt = latestAttemptByStudent.get(candidate._id.toString());

    if (!attempt) {
      return {
        candidateId: candidate._id,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        candidateGroupName: candidate.groupNames.join(', '),
        candidateGroupNames: candidate.groupNames,
        attendanceStatus: 'Absent',
        questionsAttempted: 0,
        correctQuestions: 0,
        wrongQuestions: 0,
        marksObtained: 0,
        passFailStatus: 'Fail',
        cheatingTries: 0,
        disruptedByCheating: 'No',
        startedAt: null,
        submittedAt: null,
        attemptId: null,
      };
    }

    const attemptAnswers = answersByAttempt[attempt._id.toString()] || [];
    const questionsAttempted = attemptAnswers.filter(isAnswerAttempted).length;
    const correctQuestions = attemptAnswers.filter(
      (answer) =>
        questionTypeMap.get(answer.questionId.toString()) === 'mcq'
        && answer.selectedOptionId
        && correctOptionIds.has(answer.selectedOptionId.toString()),
    ).length;
    const wrongQuestions = attemptAnswers.filter(
      (answer) =>
        questionTypeMap.get(answer.questionId.toString()) === 'mcq'
        && answer.selectedOptionId
        && !correctOptionIds.has(answer.selectedOptionId.toString()),
    ).length;
    const hasPendingEssay = essayStateMap[attempt._id.toString()]?.hasPendingEssay;
    const passed = resolveAttemptPassed(
      attempt,
      schedule.testId?.passingScore ?? 0,
      hasPendingEssay,
    );

    return {
      candidateId: candidate._id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      candidateGroupName: candidate.groupNames.join(', '),
      candidateGroupNames: candidate.groupNames,
      attendanceStatus: 'Present',
      questionsAttempted,
      correctQuestions,
      wrongQuestions,
      marksObtained: attempt.score || 0,
      passFailStatus: hasPendingEssay ? 'Pending' : passed ? 'Pass' : 'Fail',
      cheatingTries: attempt.violationsCount || 0,
      disruptedByCheating: attempt.status === 'force_submitted' ? 'Yes' : 'No',
      startedAt: attempt.startedAt || null,
      submittedAt: attempt.submittedAt || null,
      attemptId: attempt._id,
    };
  });

  const totalViolations = candidateRows.reduce((sum, row) => sum + (row.cheatingTries || 0), 0);
  const pendingEssayCount = candidateRows.filter((row) => row.passFailStatus === 'Pending').length;

  return {
    schedule: {
      _id: schedule._id,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      assignedGroups: (schedule.assignedGroups || []).map((group) => ({
        _id: group._id,
        name: group.name,
      })),
    },
    test: {
      _id: schedule.testId?._id,
      title: schedule.testId?.title || 'Untitled Test',
      passingScore: schedule.testId?.passingScore ?? 0,
      conductingOfficer: schedule.testId?.createdBy?.name || 'Unknown Teacher',
      conductingOfficerEmail: schedule.testId?.createdBy?.email || '',
    },
    gradingStatus: pendingEssayCount > 0 ? 'pending_essay' : 'ready',
    totalViolations,
    candidateRows,
  };
};

export const getAttemptDetail = async (attemptId, teacherId, role = 'teacher') => {
  const attempt = await TestAttempt.findById(attemptId)
    .populate({ path: 'studentId', select: 'name email' })
    .populate({ path: 'testId', select: 'title passingScore createdBy' })
    .populate({ path: 'scheduleId' });

  if (!attempt) {
    const error = new Error('Attempt not found.');
    error.statusCode = 404;
    throw error;
  }

  if (role !== 'admin' && attempt.testId.createdBy.toString() !== teacherId.toString()) {
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

export const gradeEssay = async (answerId, score, feedback, teacherId, role = 'teacher') => {
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
    error.statusCode = 422;
    throw error;
  }

  const attempt = await TestAttempt.findById(answer.attemptId).select('testId');

  if (!attempt) {
    const error = new Error('Attempt not found for this answer.');
    error.statusCode = 404;
    throw error;
  }

  await ensureTeacherOwnsTest(attempt.testId, teacherId, role);

  if (score < 0 || score > answer.questionId.points) {
    const error = new Error(`Score must be between 0 and ${answer.questionId.points}.`);
    error.statusCode = 422;
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
    finalizedAttempt = await finalizeAttempt(answer.attemptId, teacherId, role);
  }

  return {
    answer: updatedAnswer,
    attempt: finalizedAttempt,
  };
};
