import express from 'express';
import { getSystemStats, getAllUsers, updateUserRole, deleteUser, getAllExams, deleteExam } from '../controllers/adminController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/stats', getSystemStats);
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);
router.get('/exams', getAllExams);
router.delete('/exams/:id', deleteExam);

export default router;
