import User from '../models/User.js';
import Exam from '../models/Exam.js';
import ExamSession from '../models/ExamSession.js';
import ProctorLog from '../models/ProctorLog.js';

export const getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalExams = await Exam.countDocuments();
    const activeSessions = await ExamSession.countDocuments({ status: 'in_progress' });
    const totalFlags = await ProctorLog.countDocuments();

    res.json({
      totalUsers,
      totalExams,
      activeSessions,
      totalFlags
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -faceEmbedding').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    // Prevent removing the last admin? Good practice but let's keep it simple for now
    
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password -faceEmbedding');
    if (!user) return res.status(404).json({ message: 'User not found' });
    

    await user.save();
    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Optionally remove their sessions or exams, but let's keep it simple
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    
    // Also delete associated sessions and logs
    await ExamSession.deleteMany({ examId: req.params.id });
    await ProctorLog.deleteMany({ examId: req.params.id });
    
    res.json({ message: 'Exam and all associated data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
