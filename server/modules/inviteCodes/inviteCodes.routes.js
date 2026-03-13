import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import {
  deleteCodeHandler,
  generateBulkCodesHandler,
  generateSingleCodeHandler,
  getCodesByGroupHandler,
  validateCodeHandler,
} from './inviteCodes.controller.js';

const router = Router();

router.post('/validate', validateCodeHandler);

router.use(protect, authorize('admin'));

router.post('/single', generateSingleCodeHandler);
router.post('/bulk', generateBulkCodesHandler);
router.get('/:groupId', getCodesByGroupHandler);
router.delete('/:id', deleteCodeHandler);

export default router;
