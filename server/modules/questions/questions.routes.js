import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import {
  createQuestion,
  deleteQuestion,
  getQuestionsBySection,
  importQuestions,
  updateQuestion,
} from './questions.controller.js';

const router = Router();

router
  .route('/sections/:sectionId/questions')
  .get(protect, authorize('admin', 'teacher'), getQuestionsBySection)
  .post(protect, authorize('admin', 'teacher'), createQuestion);

router
  .route('/sections/:sectionId/questions/import')
  .post(protect, authorize('admin', 'teacher'), importQuestions);

router
  .route('/questions/:id')
  .put(protect, authorize('admin', 'teacher'), updateQuestion)
  .delete(protect, authorize('admin', 'teacher'), deleteQuestion);

export default router;
