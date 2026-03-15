import dotenv from 'dotenv';
import mongoose from 'mongoose';
import GroupMember from '../models/GroupMember.js';
import StudentGroup from '../models/StudentGroup.js';
import User from '../models/User.js';
import { getSchedulesForStudent } from '../modules/schedules/schedules.service.js';

dotenv.config();

const readArgValues = (flag) => {
  const values = [];

  for (let index = 2; index < process.argv.length; index += 1) {
    const current = process.argv[index];

    if (current === flag && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
      index += 1;
      continue;
    }

    if (current.startsWith(`${flag}=`)) {
      values.push(current.slice(flag.length + 1));
    }
  }

  return values;
};

const normalizeEmailList = (values) =>
  values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

const formatSchedule = (schedule) => ({
  id: schedule._id.toString(),
  title: schedule.testId?.title || 'Untitled Test',
  startTime: schedule.startTime,
  endTime: schedule.endTime,
  attemptsTaken: schedule.attemptsTaken ?? 0,
  hasAttemptsLeft: Boolean(schedule.hasAttemptsLeft),
  groups: (schedule.assignedGroups || []).map((group) => group.name),
});

const buildUserAudit = async (user) => {
  const memberships = await GroupMember.find({ studentId: user._id }).lean();
  const groupIds = memberships.map((membership) => membership.groupId);
  const groups = groupIds.length > 0
    ? await StudentGroup.find({ _id: { $in: groupIds } }).select('name').lean()
    : [];
  const schedules = user.role === 'student'
    ? await getSchedulesForStudent(user._id.toString())
    : [];

  return {
    name: user.name,
    email: user.email,
    role: user.role,
    membershipCount: memberships.length,
    groups: groups.map((group) => group.name),
    scheduleCount: schedules.length,
    schedules: schedules.map(formatSchedule),
  };
};

const main = async () => {
  const groupNames = readArgValues('--group').map((value) => value.trim()).filter(Boolean);
  const emails = normalizeEmailList(readArgValues('--email'));

  if (groupNames.length === 0 && emails.length === 0) {
    console.error('Usage: node utils/auditScheduleVisibility.js --group "EPA Inspectors"');
    console.error('   or: node utils/auditScheduleVisibility.js --email "student@example.com,other@example.com"');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const results = [];

    if (groupNames.length > 0) {
      for (const groupName of groupNames) {
        const group = await StudentGroup.findOne({ name: groupName }).select('_id name').lean();

        if (!group) {
          results.push({
            group: groupName,
            exists: false,
            members: [],
          });
          continue;
        }

        const memberships = await GroupMember.find({ groupId: group._id }).lean();
        const users = await User.find({
          _id: { $in: memberships.map((membership) => membership.studentId) },
        })
          .select('name email role')
          .sort({ name: 1 })
          .lean();

        const members = [];

        for (const user of users) {
          members.push(await buildUserAudit(user));
        }

        results.push({
          group: group.name,
          exists: true,
          memberCount: members.length,
          studentsWithoutSchedules: members.filter((member) => member.role === 'student' && member.scheduleCount === 0).length,
          members,
        });
      }
    }

    if (emails.length > 0) {
      const users = await User.find({ email: { $in: emails } })
        .select('name email role')
        .sort({ email: 1 })
        .lean();
      const foundEmails = new Set(users.map((user) => user.email));
      const missingEmails = emails.filter((email) => !foundEmails.has(email));
      const audits = [];

      for (const user of users) {
        audits.push(await buildUserAudit(user));
      }

      results.push({
        emails,
        missingEmails,
        users: audits,
      });
    }

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
