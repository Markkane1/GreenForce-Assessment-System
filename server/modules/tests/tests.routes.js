import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import {
  createTest,
  deleteTest,
  getAllTests,
  getTestById,
  publishTest,
  updateTest,
} from './tests.controller.js';

const router = Router();

router.use(protect, authorize('admin', 'teacher'));

router.route('/').get(getAllTests).post(createTest);
router.route('/:id').get(getTestById).put(updateTest).delete(deleteTest);
router.post('/:id/publish', publishTest);

export default router;
