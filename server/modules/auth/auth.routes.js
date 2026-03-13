import { Router } from 'express';
import { protect } from '../../middlewares/authMiddleware.js';
import {
  changePasswordHandler,
  forgotPasswordHandler,
  login,
  logoutHandler,
  meHandler,
  registerStudentHandler,
  resetPasswordHandler,
} from './auth.controller.js';

const router = Router();

router.post('/register-student', registerStudentHandler);
router.post('/login', login);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);
router.get('/me', protect, meHandler);
router.post('/logout', logoutHandler);
router.put('/change-password', protect, changePasswordHandler);

export default router;
