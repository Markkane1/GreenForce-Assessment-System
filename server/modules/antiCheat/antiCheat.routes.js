import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import { getLogs, logViolation } from './antiCheat.controller.js';

const router = Router();

router.post('/log', protect, authorize('student'), logViolation);
router.get('/:attemptId/logs', protect, authorize('teacher', 'admin'), getLogs);

export default router;
