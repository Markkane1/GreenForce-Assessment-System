import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import {
  createSchedule,
  deleteSchedule,
  getActiveAttempts,
  getScheduleById,
  getSchedules,
  updateSchedule,
} from './schedules.controller.js';

const router = Router();

router.use(protect);

router.route('/').post(authorize('teacher'), createSchedule).get(authorize('teacher', 'student'), getSchedules);
router.get('/:id/active-attempts', authorize('teacher', 'admin'), getActiveAttempts);
router
  .route('/:id')
  .get(authorize('admin', 'teacher', 'student'), getScheduleById)
  .put(authorize('teacher'), updateSchedule)
  .delete(authorize('teacher'), deleteSchedule);

export default router;
