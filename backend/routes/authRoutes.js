import express from 'express';
import { registerUser, loginUser, loginFaceUser, upgradeToTeacher, getMe } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/login-face', loginFaceUser);
router.post('/upgrade-to-teacher', protect, upgradeToTeacher);
router.get('/me', protect, getMe);

export default router;
