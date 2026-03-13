import asyncHandler from '../../utils/asyncHandler.js';
import {
  addMember as addMemberService,
  createGroup as createGroupService,
  deleteGroup as deleteGroupService,
  getAllGroups as getAllGroupsService,
  getGroupById as getGroupByIdService,
  removeMember as removeMemberService,
  updateGroup as updateGroupService,
} from './groups.service.js';

export const createGroup = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const group = await createGroupService(name, description, req.user.id);

  res.status(201).json({
    success: true,
    group,
  });
});

export const getAllGroups = asyncHandler(async (req, res) => {
  const groups = await getAllGroupsService();

  res.status(200).json({
    success: true,
    groups,
  });
});

export const getGroupById = asyncHandler(async (req, res) => {
  const group = await getGroupByIdService(req.params.id);

  res.status(200).json({
    success: true,
    group,
  });
});

export const updateGroup = asyncHandler(async (req, res) => {
  const group = await updateGroupService(req.params.id, req.body);

  res.status(200).json({
    success: true,
    group,
  });
});

export const deleteGroup = asyncHandler(async (req, res) => {
  const result = await deleteGroupService(req.params.id);

  res.status(200).json(result);
});

export const addMember = asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  const member = await addMemberService(req.params.id, studentId);

  res.status(201).json({
    success: true,
    member,
  });
});

export const removeMember = asyncHandler(async (req, res) => {
  const result = await removeMemberService(req.params.id, req.params.studentId);

  res.status(200).json(result);
});
