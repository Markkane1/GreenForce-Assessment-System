import { Router } from 'express';
import { authorize, protect } from '../../middlewares/authMiddleware.js';
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from './users.controller.js';

const router = Router();

router.use(protect, authorize('admin'));

router.post('/', createUser);
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
