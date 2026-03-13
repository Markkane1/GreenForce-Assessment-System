import { Router } from 'express';
import { protect } from '../../middlewares/authMiddleware.js';
import { changePasswordHandler, forgotPasswordHandler, login, register, resetPasswordHandler } from './auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);
router.put('/change-password', protect, changePasswordHandler);

export default router;
