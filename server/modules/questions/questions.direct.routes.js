import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import { deleteQuestion, updateQuestion } from './questions.controller.js';

const router = Router();

router.use(protect, authorize('admin', 'teacher'));
router.route('/:id').put(updateQuestion).delete(deleteQuestion);

export default router;
