import express from 'express';
import { createExam, getExams, getExamById, addQuestion, getExamStudents, getExamLogs, resetStudentSession, extendExamTime, getStudentSubmissions, scoreStudentSession, deleteExam } from '../controllers/examController.js';
import { getMyResults, joinExam, generateCode, getEnrollStatus } from '../controllers/submissionController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, restrictTo('teacher', 'admin'), createExam)
  .get(protect, getExams);

router.post('/join', protect, joinExam);
router.route('/:id')
  .get(protect, getExamById)
  .delete(protect, restrictTo('teacher', 'admin'), deleteExam);

router.route('/:id/questions')
  .post(protect, restrictTo('teacher', 'admin'), addQuestion);

// Analytics & Monitor routes protected for teachers
router.route('/:id/students')
  .get(protect, restrictTo('teacher', 'admin'), getExamStudents);

router.route('/:id/logs')
  .get(protect, restrictTo('teacher', 'admin'), getExamLogs);

router.get('/:id/my-results', protect, getMyResults);
router.post('/:id/generate-code', protect, restrictTo('teacher', 'admin'), generateCode);
router.get('/:id/enroll-status', protect, getEnrollStatus);
router.post('/:id/session/:studentId/reset', protect, restrictTo('teacher', 'admin'), resetStudentSession);
router.put('/:id/extend', protect, restrictTo('teacher', 'admin'), extendExamTime);

router.get('/:id/students/:studentId/submissions', protect, restrictTo('teacher', 'admin'), getStudentSubmissions);
router.post('/:id/students/:studentId/score', protect, restrictTo('teacher', 'admin'), scoreStudentSession);

export default router;
