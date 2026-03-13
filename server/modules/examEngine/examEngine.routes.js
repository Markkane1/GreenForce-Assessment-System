import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import {
  getAttemptResults,
  getAttemptQuestions,
  getAttemptStatus,
  getMyAttempts,
  saveAnswer,
  startExam,
  submitExam,
} from './examEngine.controller.js';

const router = Router();

router.use(protect, authorize('student'));

router.post('/start', startExam);
router.get('/my-attempts', getMyAttempts);
router.get('/:attemptId/questions', getAttemptQuestions);
router.get('/:attemptId/results', getAttemptResults);
router.post('/save-answer', saveAnswer);
router.post('/:attemptId/submit', submitExam);
router.get('/:attemptId/status', getAttemptStatus);

export default router;
