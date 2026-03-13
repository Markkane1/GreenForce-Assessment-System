import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import { deleteSection, updateSection } from './sections.controller.js';

const router = Router();

router.use(protect, authorize('admin', 'teacher'));
router.route('/:id').put(updateSection).delete(deleteSection);

export default router;
