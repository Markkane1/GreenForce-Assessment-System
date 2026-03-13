import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import {
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from './users.controller.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
