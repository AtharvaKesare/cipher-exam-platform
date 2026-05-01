import express from 'express';
import { getTeacherStats, getMyStudents, getStudentStats, getStudentLogs } from '../controllers/statsController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/teacher', protect, restrictTo('teacher', 'admin'), getTeacherStats);
router.get('/students', protect, restrictTo('teacher', 'admin'), getMyStudents);
router.get('/student', protect, getStudentStats);
router.get('/students/:studentId/logs', protect, restrictTo('teacher', 'admin'), getStudentLogs);

export default router;
