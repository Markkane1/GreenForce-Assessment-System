import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import { createUser as createUserService } from '../modules/auth/auth.service.js';
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
const epaInspectorsGroupName = 'EPA Inspectors';
const epaInspectorsDefaultPassword = 'Inspectors123!';
const seedOutputDirectory = path.resolve(__dirname, './seed-output');
const epaInspectorsCsvPath = path.join(seedOutputDirectory, 'epa-inspectors.csv');

const epaInspectorStudents = [
  { name: 'Hafiz Abdul Malik', phone: '3306376193', email: 'abdulmalikkhokharofkhudian@gmail.com' },
  { name: 'Hina Akram', phone: '3067017902', email: 'hinaakram169@gmail.com' },
  { name: 'Tehreem Afzal', phone: '3000791418', email: 'tehreemafz@gmail.com' },
  { name: 'Rubab Rizwan', phone: '3211173625', email: 'rubabrizwan789@gmail.com' },
  { name: 'Hafiza Mashal Fatima', phone: '3070441250', email: 'mashalyasin848@gmail.com' },
  { name: 'Hafiza Ayesha Tasadduq', phone: '3013461307', email: 'ayeshatasaddyq18@gmail.com' },
  { name: 'Hina Gulshan', phone: '3041744091', email: 'hinagulshan322@gmail.com' },
  { name: 'Muhammad Yahya Ramzan', phone: '3203429202', email: 'yahyaenvironmentalist@gmail.com' },
  { name: 'Muhammad Umer Fayyaz', phone: '3090824438', email: 'umer.fayez.85@gmail.com' },
  { name: 'Ahmad Ibrahim', phone: '3228696827', email: 'aibrahimmaqbool@gmail.com' },
  { name: 'Rabia Yasmeen', phone: '3068026275', email: 'rabiayasmeen786@gmail.com' },
  { name: 'Ayesha Batool', phone: '3185800197', email: 'batoolayesha60@gmail.com' },
  { name: 'Hafiz Muhammad Hassaan', phone: '3356226333', email: 'muhammadhassaanqasim@gmail.com' },
  { name: 'Rana Umair Asad', phone: '3087832172', email: 'ranaumairasad@gmail.com' },
  { name: 'Farwa Rani', phone: '3427417244', email: 'rfarwa158@gmail.com' },
  { name: 'Basra Semab', phone: '3052055875', email: 'basrasemab@gmail.com' },
  { name: 'Maryam Yaqub', phone: '3482791625', email: 'yaqubmaryam5@gmail.com' },
  { name: 'Asad Abbas', phone: '3037964490', email: 'asadabbasmanj@gmail.com' },
  { name: 'Saira Aslam', phone: '3417229239', email: 'sairaaslam709@gmail.com' },
  { name: 'M. Ans', phone: '3061656020', email: 'm.anszool786@gmail.com' },
  { name: 'Haroon Rasheed', phone: '3007124433', email: 'hr481872@gmail.com' },
  { name: 'Muhammad Shoaib Arshad', phone: '3015525031', email: 'm.shoaibb66@gmail.com' },
  { name: 'Rana M Yasir Riaz', phone: '3048063373', email: 'ranayasir904@gmail.com' },
  { name: 'Muhammad', phone: '3117005302', email: 'mkmughalzada@gmail.com' },
  { name: 'Nimmra Rafique', phone: '3477334477', email: 'nimmrarafique999@gmail.com' },
  { name: 'Muhammad Sami-ul-Din', phone: '3056434992', email: 'msamiuldin@gmail.com' },
  { name: 'Ammar Ali Khan', phone: '3057111665', email: 'ammaralikhan009@gmail.com' },
  { name: 'Zahid Rasool', phone: '3353182728', email: 'zahidrasool428@gmail.com' },
  { name: 'Muhammad Obaidullah', phone: '3124177842', email: 'ubaidullah00722@gmail.com' },
  { name: 'Nisha Lal Din', phone: '3101452440', email: 'nishalaldin920@gmail.com' },
  { name: 'Mubeena Iram', phone: '3160179521', email: 'mubeenairam@gmail.com' },
  { name: 'Ahsan Ishtiaq', phone: '3351080789', email: 'ahsanishtiaq608@gmail.com' },
  { name: 'Tayyba Fatima', phone: '3007694583', email: 'tayybafatima67@gmail.com' },
  { name: 'Iqra Ateeq', phone: '3120164427', email: 'iqra.ateeq1999@gmail.com' },
  { name: 'Maha Ali Khan', phone: '3265864543', email: 'mahaalikhaan@gmail.com' },
  { name: 'Masood Iqbal', phone: '3334645862', email: 'masoodiqbal773@gmail.com' },
  { name: 'Zaib-un-Nisa', phone: '3229494256', email: 'zaibunnisa431928@gmail.com' },
  { name: 'Inzamam Hashim', phone: '3183607074', email: 'inzamamhashim346@gmail.com' },
  { name: 'M. Arslan Sarwar', phone: '3107419817', email: 'mmuhammadarslan527@gmail.com' },
  { name: 'M. Ashar Rauf', phone: '3457711564', email: 'asharrauf01@gmail.com' },
  { name: 'Zeeshan Bashir', phone: '3217205355', email: 'zeeshanbashir187@gmail.com' },
  { name: 'Tanzeel Ahmad', phone: '3245526552', email: 'tanzeelahmad055@gmail.com' },
  { name: 'Shahid Abbas', phone: '3037139086', email: 'shahidsial321@gmail.com' },
  { name: 'Mehroz Khan', phone: '3080015282', email: 'meehrozkhan455@gmail.com' },
  { name: 'M. Zain-ul-Abideen', phone: '3041737385', email: 'zaeenansari@gmail.com' },
  { name: 'Umar Farooq', phone: '3098392829', email: 'umerfarooq.es@gmail.com' },
  { name: 'Fraz Ilyas', phone: '3016201870', email: 'frazilyas05@gmail.com' },
  { name: 'Naeem Sajjad', phone: '3166146236', email: 'naeemsajjad221418@gmail.com' },
  { name: 'Muhammad Moin-UD-Din', phone: '0312-8653527', email: 'malikmoin583@gmail.com' },
  { name: 'Areeba Muskan', phone: '3146202489', email: 'areebamuskan1998@gmail.com' },
  { name: 'Iqra Mubeen', phone: '3094537609', email: 'iqramubeen5415@gmail.com' },
  { name: 'Laraib Maryam', phone: '3176317034', email: 'laraibmaryam753@gmail.com' },
  { name: 'Esha Irfan', phone: '3351404364', email: 'eshairfan010@gmail.com' },
  { name: 'Maha Umer', phone: '3039565194', email: 'mahaumer83@gmail.com' },
  { name: 'Khadija Masood', phone: '3052346500', email: 'dijamasud@gmail.com' },
  { name: 'Mehak Saghir', phone: '3164324473', email: 'mkkhan2917@gmail.com' },
  { name: 'Asma Idrees', phone: '3204860314', email: 'asmaidrees97@gmail.com' },
  { name: 'Sidra Fatima', phone: '3184443774', email: 'sidratariq011@gmail.com' },
  { name: 'Nimra Shehzadi', phone: '3476796338', email: 'nimrazafar45@gmail.com' },
  { name: 'Tahira Jamil', phone: '3054744542', email: 'tahirarana96@gmail.com' },
  { name: 'Sana Younas', phone: '3024416077', email: 'sanayounas859@gmail.com' },
  { name: 'Arooj Samuel', phone: '3037939367', email: 'aroojsamuel61@gmail.com' },
  { name: 'Asif Shaukat', phone: '3090600253', email: 'asifshoukat24@gmail.com' },
  { name: 'Sharaz Basharat', phone: '3200650530', email: 'sherazbasharat@gmail.com' },
  { name: 'Aneela Batool', phone: '3468849172', email: 'aneelabtool735@gmail.com' },
  { name: 'Shams Tubraiz', phone: '3072588108', email: 'shamstubraiz94@gmail.com' },
];

const upsertUser = async ({
  name, email, password, role, phone = null,
}) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    existingUser.name = name;
    existingUser.role = role;
    existingUser.phone = phone ? phone.trim() : null;
    existingUser.password = await bcrypt.hash(password, 12);
    await existingUser.save();
    return existingUser;
  }

  return createUserService(name, email, password, role, phone);
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

const escapeCsvValue = (value) => {
  const stringValue = String(value ?? '');

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const writeEpaInspectorsCsv = async () => {
  const rows = [
    ['Name', 'Phone', 'Email', 'Password', 'Group'],
    ...epaInspectorStudents.map((student) => [
      student.name,
      student.phone,
      student.email,
      epaInspectorsDefaultPassword,
      epaInspectorsGroupName,
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');

  await fs.mkdir(seedOutputDirectory, { recursive: true });
  await fs.writeFile(epaInspectorsCsvPath, csv, 'utf8');
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

  const epaInspectorsGroup = await StudentGroup.findOneAndUpdate(
    { name: epaInspectorsGroupName, createdBy: admin._id },
    {
      name: epaInspectorsGroupName,
      description: 'Seeded EPA inspectors cohort.',
      createdBy: admin._id,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  for (const inspector of epaInspectorStudents) {
    const inspectorUser = await upsertUser({
      ...inspector,
      password: epaInspectorsDefaultPassword,
      role: 'student',
    });

    await GroupMember.findOneAndUpdate(
      { groupId: epaInspectorsGroup._id, studentId: inspectorUser._id },
      { groupId: epaInspectorsGroup._id, studentId: inspectorUser._id },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );
  }

  await writeEpaInspectorsCsv();

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
  console.log(`EPA Group     -> ${epaInspectorsGroup.name} (${epaInspectorStudents.length} students)`);
  console.log(`Sample Test   -> ${test.title}`);
  console.log(`EPA Students  -> default password: ${epaInspectorsDefaultPassword}`);
  console.log(`EPA CSV       -> ${epaInspectorsCsvPath}`);
};

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
