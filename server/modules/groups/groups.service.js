import GroupMember from '../../models/GroupMember.js';
import StudentGroup from '../../models/StudentGroup.js';
import User from '../../models/User.js';

const buildGroupWithMembers = async (group) => {
  const members = await GroupMember.find({ groupId: group._id })
    .populate({
      path: 'studentId',
      select: '-password',
    })
    .sort({ createdAt: 1 });

  return {
    ...group.toObject(),
    members,
  };
};

const ensureGroupExists = async (groupId) => {
  const group = await StudentGroup.findById(groupId).populate({
    path: 'createdBy',
    select: '-password',
  });

  if (!group) {
    const error = new Error('Group not found.');
    error.statusCode = 404;
    throw error;
  }

  return group;
};

export const createGroup = async (name, description, createdBy) => {
  const group = await StudentGroup.create({
    name,
    description,
    createdBy,
  });

  return StudentGroup.findById(group._id).populate({
    path: 'createdBy',
    select: '-password',
  });
};

export const getAllGroups = async () =>
  StudentGroup.find()
    .populate({
      path: 'createdBy',
      select: '-password',
    })
    .sort({ createdAt: -1 });

export const getGroupById = async (id) => {
  const group = await ensureGroupExists(id);
  return buildGroupWithMembers(group);
};

export const updateGroup = async (id, data) => {
  const updates = {};

  if (data.name !== undefined) {
    updates.name = data.name;
  }

  if (data.description !== undefined) {
    updates.description = data.description;
  }

  const group = await StudentGroup.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).populate({
    path: 'createdBy',
    select: '-password',
  });

  if (!group) {
    const error = new Error('Group not found.');
    error.statusCode = 404;
    throw error;
  }

  return group;
};

export const deleteGroup = async (id) => {
  const group = await StudentGroup.findByIdAndDelete(id);

  if (!group) {
    const error = new Error('Group not found.');
    error.statusCode = 404;
    throw error;
  }

  await GroupMember.deleteMany({ groupId: id });

  return {
    success: true,
    message: 'Group deleted successfully.',
  };
};

export const addMember = async (groupId, studentId) => {
  await ensureGroupExists(groupId);

  const student = await User.findById(studentId).select('-password');

  if (!student || student.role !== 'student') {
    const error = new Error('Student not found or user is not a student.');
    error.statusCode = 400;
    throw error;
  }

  const existingMember = await GroupMember.findOne({ groupId, studentId });

  if (existingMember) {
    const error = new Error('Student is already a member of this group.');
    error.statusCode = 400;
    throw error;
  }

  const member = await GroupMember.create({ groupId, studentId });

  return GroupMember.findById(member._id).populate({
    path: 'studentId',
    select: '-password',
  });
};

export const removeMember = async (groupId, studentId) => {
  await ensureGroupExists(groupId);

  const member = await GroupMember.findOneAndDelete({ groupId, studentId }).populate({
    path: 'studentId',
    select: '-password',
  });

  if (!member) {
    const error = new Error('Group member not found.');
    error.statusCode = 404;
    throw error;
  }

  return {
    success: true,
    message: 'Member removed successfully.',
    member,
  };
};
