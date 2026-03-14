import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import {
  finalizeAttempt,
  getAttemptDetail,
  getAttemptsForGrading,
  getConcludedSchedules,
  getScheduleReport,
  gradeEssay,
} from './grading.controller.js';

const router = Router();

router.use(protect, authorize('teacher', 'admin'));

router.get('/schedules', getConcludedSchedules);
router.get('/schedules/:id/report', getScheduleReport);
router.get('/attempts', getAttemptsForGrading);
router.get('/attempts/:id', getAttemptDetail);
router.post('/essay', gradeEssay);
router.post('/:attemptId/finalize', finalizeAttempt);

export default router;
