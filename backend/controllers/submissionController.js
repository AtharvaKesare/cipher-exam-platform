import Exam from '../models/Exam.js';
import ExamSession from '../models/ExamSession.js';
import Submission from '../models/Submission.js';

export const getMyResults = async (req, res) => {
  const { id: examId } = req.params;
  const studentId = req.user.id;

  try {
     const session = await ExamSession.findOne({ examId, studentId });
     if (!session) return res.status(404).json({ message: 'No session found for this exam' });
     
     const submissions = await Submission.find({ examId, studentId }).populate('questionId', 'title expectedOutput points');
     const exam = await Exam.findById(examId).select('title questions warningLimit');
     
     res.status(200).json({
       session,
       submissions,
       exam
     });
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
};

export const joinExam = async (req, res) => {
  const { joinCode } = req.body;
  const studentId = req.user.id;

  try {
    const exam = await Exam.findOne({ joinCode: joinCode.trim() });
    if (!exam) return res.status(404).json({ message: 'Invalid or expired join code.' });

    if (exam.enrolledStudents.includes(studentId)) {
      return res.status(400).json({ message: 'You are already enrolled in this exam.', examId: exam._id });
    }

    exam.enrolledStudents.push(studentId);
    await exam.save();

    res.status(200).json({ message: 'Successfully enrolled!', examId: exam._id, title: exam.title });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const generateCode = async (req, res) => {
  const { id: examId } = req.params;
  const generateNewCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    
    exam.joinCode = generateNewCode();
    await exam.save();
    
    res.status(200).json({ joinCode: exam.joinCode });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEnrollStatus = async (req, res) => {
  const { id: examId } = req.params;
  const studentId = req.user.id;

  try {
     const exam = await Exam.findById(examId);
     if (!exam) return res.status(404).json({ message: 'Exam not found' });
     
     const isEnrolled = exam.enrolledStudents.includes(studentId);
     res.status(200).json({ isEnrolled });
  } catch(error) {
      res.status(500).json({ message: error.message });
  }
};
