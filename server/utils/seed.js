import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import { createUser as createUserService } from '../modules/users/users.service.js';
import GroupMember from '../models/GroupMember.js';
import MCQOption from '../models/MCQOption.js';
import Question from '../models/Question.js';
import Section from '../models/Section.js';
import StudentGroup from '../models/StudentGroup.js';
import Test from '../models/Test.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const credentials = {
  admin: {
    name: 'System Admin',
    email: 'admin@exam-pop.local',
    password: 'Admin123!',
    role: 'admin',
  },
  teacher: {
    name: 'Tina Teacher',
    email: 'teacher@exam-pop.local',
    password: 'Teacher123!',
    role: 'teacher',
  },
  student: {
    name: 'Sam Student',
    email: 'student@exam-pop.local',
    password: 'Student123!',
    role: 'student',
  },
};

const sampleTestTitle = 'Sample JavaScript Basics Test';
const sampleGroupName = 'Sample Student Group';

const upsertUser = async ({ name, email, password, role }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    existingUser.name = name;
    existingUser.role = role;
    existingUser.password = await bcrypt.hash(password, 12);
    await existingUser.save();
    return existingUser;
  }

  return createUserService({
    name,
    email,
    password,
    role,
  });
};

const clearExistingSampleTest = async (teacherId) => {
  const existingTests = await Test.find({
    createdBy: teacherId,
    title: sampleTestTitle,
  }).select('_id');

  const testIds = existingTests.map((test) => test._id);

  if (testIds.length === 0) {
    return;
  }

  const sections = await Section.find({ testId: { $in: testIds } }).select('_id');
  const sectionIds = sections.map((section) => section._id);
  const questions = await Question.find({ sectionId: { $in: sectionIds } }).select('_id');
  const questionIds = questions.map((question) => question._id);

  if (questionIds.length > 0) {
    await MCQOption.deleteMany({ questionId: { $in: questionIds } });
    await Question.deleteMany({ _id: { $in: questionIds } });
  }

  if (sectionIds.length > 0) {
    await Section.deleteMany({ _id: { $in: sectionIds } });
  }

  await Test.deleteMany({ _id: { $in: testIds } });
};

const seed = async () => {
  await connectDB();

  const admin = await upsertUser(credentials.admin);
  const teacher = await upsertUser(credentials.teacher);
  const student = await upsertUser(credentials.student);

  const group = await StudentGroup.findOneAndUpdate(
    { name: sampleGroupName, createdBy: teacher._id },
    {
      name: sampleGroupName,
      description: 'Seeded student group for local development.',
      createdBy: teacher._id,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  await GroupMember.findOneAndUpdate(
    { groupId: group._id, studentId: student._id },
    { groupId: group._id, studentId: student._id },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  await clearExistingSampleTest(teacher._id);

  const test = await Test.create({
    title: sampleTestTitle,
    description: 'A seeded introductory assessment for JavaScript fundamentals.',
    timeLimitMinutes: 30,
    passingScore: 2,
    maxAttempts: 1,
    allowResume: true,
    randomizeQuestions: true,
    randomizeOptions: true,
    createdBy: teacher._id,
    isPublished: true,
  });

  const section = await Section.create({
    testId: test._id,
    title: 'Section A',
    order: 1,
    questionPoolSize: 3,
    questionsToServe: 3,
  });

  const sampleQuestions = [
    {
      content: 'Which keyword declares a block-scoped variable in JavaScript?',
      points: 1,
      options: [
        { text: 'var', isCorrect: false },
        { text: 'let', isCorrect: true },
        { text: 'const', isCorrect: false },
        { text: 'static', isCorrect: false },
      ],
    },
    {
      content: 'Which array method creates a new array by transforming each item?',
      points: 1,
      options: [
        { text: 'filter()', isCorrect: false },
        { text: 'reduce()', isCorrect: false },
        { text: 'map()', isCorrect: true },
        { text: 'forEach()', isCorrect: false },
      ],
    },
    {
      content: 'What is the result type of JSON.parse() when given a JSON object string?',
      points: 1,
      options: [
        { text: 'String', isCorrect: false },
        { text: 'Object', isCorrect: true },
        { text: 'Array', isCorrect: false },
        { text: 'Boolean', isCorrect: false },
      ],
    },
  ];

  for (const sampleQuestion of sampleQuestions) {
    const question = await Question.create({
      sectionId: section._id,
      type: 'mcq',
      content: sampleQuestion.content,
      points: sampleQuestion.points,
      maxWordCount: null,
    });

    await MCQOption.insertMany(
      sampleQuestion.options.map((option) => ({
        questionId: question._id,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    );
  }

  console.log('Seed completed successfully.\n');
  console.log('Credentials');
  console.log(`Admin   -> ${credentials.admin.email} / ${credentials.admin.password}`);
  console.log(`Teacher -> ${credentials.teacher.email} / ${credentials.teacher.password}`);
  console.log(`Student -> ${credentials.student.email} / ${credentials.student.password}`);
  console.log('\nSeeded Assets');
  console.log(`Student Group -> ${group.name}`);
  console.log(`Sample Test   -> ${test.title}`);
};

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
