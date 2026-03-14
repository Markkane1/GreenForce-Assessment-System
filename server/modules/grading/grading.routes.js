import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import {
  finalizeAttempt,
  getAttemptDetail,
  getAttemptsForGrading,
  gradeEssay,
} from './grading.controller.js';

const router = Router();

router.use(protect, authorize('teacher', 'admin'));

router.get('/attempts', getAttemptsForGrading);
router.get('/attempts/:id', getAttemptDetail);
router.post('/essay', gradeEssay);
router.post('/:attemptId/finalize', finalizeAttempt);

export default router;
