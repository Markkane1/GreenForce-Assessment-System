import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import {
  createSection,
  deleteSection,
  getSectionsByTest,
  updateSection,
} from './sections.controller.js';

const router = Router();

router
  .route('/tests/:testId/sections')
  .get(protect, authorize('admin', 'teacher'), getSectionsByTest)
  .post(protect, authorize('admin', 'teacher'), createSection);

router
  .route('/sections/:id')
  .put(protect, authorize('admin', 'teacher'), updateSection)
  .delete(protect, authorize('admin', 'teacher'), deleteSection);

export default router;
