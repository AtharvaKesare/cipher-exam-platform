import express from 'express';
import { startExam, submitExam } from '../controllers/studentExamController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/:id/start', protect, restrictTo('student'), startExam);
router.post('/:id/submit', protect, restrictTo('student'), submitExam);

export default router;
