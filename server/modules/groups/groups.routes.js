import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import {
  addMember,
  createGroup,
  deleteGroup,
  getAllGroups,
  getGroupById,
  removeMember,
  updateGroup,
} from './groups.controller.js';

const router = Router();

router.use(protect);

router
  .route('/')
  .post(authorize('admin', 'teacher'), createGroup)
  .get(authorize('admin', 'teacher'), getAllGroups);

router
  .route('/:id')
  .get(authorize('admin', 'teacher'), getGroupById)
  .put(authorize('admin', 'teacher'), updateGroup)
  .delete(authorize('admin'), deleteGroup);

router.post('/:id/members', authorize('admin', 'teacher'), addMember);
router.delete('/:id/members/:studentId', authorize('admin', 'teacher'), removeMember);

export default router;
