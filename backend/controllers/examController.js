import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import ExamSession from '../models/ExamSession.js';
import ProctorLog from '../models/ProctorLog.js';
import User from '../models/User.js';
import Submission from '../models/Submission.js';

export const createExam = async (req, res) => {
  const { title, startTime, endTime, duration, warningLimit } = req.body;
  
  const subject = (req.user.role === 'admin' || !req.user.subjectSpecialty || req.user.subjectSpecialty === 'All') ? req.body.subject : req.user.subjectSpecialty;
  if (!subject || subject === 'All') {
     return res.status(403).json({ message: 'You must provide a specific subject to create an exam.' });
  }

  if (!title || !startTime || !endTime || !duration) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }
  
  if (new Date(endTime) <= new Date(startTime)) {
    return res.status(400).json({ message: 'End time must be after start time.' });
  }

  const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const exam = await Exam.create({ 
      title, 
      subject,
      teacherId: req.user.id, 
      startTime, 
      endTime, 
      duration, 
      warningLimit,
      joinCode: generateCode()
    });
    res.status(201).json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    // Only the teacher who created the exam (or an admin) can delete it
    if (exam.teacherId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to delete this exam.' });
    }

    // Delete all related data cascade-style
    await Question.deleteMany({ examId: exam._id });
    await ExamSession.deleteMany({ examId: exam._id });
    await ProctorLog.deleteMany({ examId: exam._id });
    await Submission.deleteMany({ examId: exam._id });
    await Exam.findByIdAndDelete(exam._id);

    res.json({ message: 'Exam and all associated data deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExams = async (req, res) => {
  try {
    const query = {};
    
    // If it's a student looking for exams to join, they provide req.query.subject
    if (req.user.role === 'student' || req.query.subject) {
       if (req.query.subject) query.subject = req.query.subject;
    } else {
       // Teachers and Admins on the Teacher Dashboard only specifically see exams THEY created
       query.teacherId = req.user.id;
       if (req.user.subjectSpecialty && req.user.subjectSpecialty !== 'All') {
          query.subject = req.user.subjectSpecialty;
       }
    }

    const exams = await Exam.find(query).lean();
    
    const now = new Date();
    const formattedExams = exams.map(exam => {
       const start = new Date(exam.startTime);
       const end = new Date(exam.endTime);
       let status = now < start ? 'upcoming' : now > end ? 'ended' : 'active';
       
       return {
         ...exam,
         studentCount: exam.enrolledStudents ? exam.enrolledStudents.length : 0,
         status
       };
    });

    res.json(formattedExams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    
    const questions = await Question.find({ examId: exam._id });
    
    res.json({ ...exam.toObject(), questions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addQuestion = async (req, res) => {
  const { id: examId } = req.params; // route uses :id not :examId
  let { title, description, difficulty, allowedLanguages, expectedOutput, points } = req.body;
  
  if (!title || !description) return res.status(400).json({ message: 'Title and description are required.' });
  if (difficulty) difficulty = difficulty.toLowerCase();
  
  try {
    const question = await Question.create({ examId, title, description, difficulty, allowedLanguages, expectedOutput, points });
    
    await Exam.findByIdAndUpdate(examId, { $push: { questions: question._id } });
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExamStudents = async (req, res) => {
  try {
    const { id: examId } = req.params;
    const exam = await Exam.findById(examId).lean();
    
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const sessions = await ExamSession.find({ examId }).lean();
    
    const studentIds = new Set();
    if (exam.enrolledStudents) {
      exam.enrolledStudents.forEach(id => studentIds.add(id.toString()));
    }
    sessions.forEach(s => {
      if (s.studentId) studentIds.add(s.studentId.toString());
    });

    const users = await User.find({ _id: { $in: Array.from(studentIds) } }).lean();

    const result = users.map(user => {
      const uId = user._id.toString();
      const session = sessions.find(s => s.studentId && s.studentId.toString() === uId);
      
      return {
         _id: user._id,
         name: user.name || 'Unknown',
         email: user.email || 'Unknown',
         status: session ? session.status : 'not_started',
         score: session ? session.score : 0,
         warnings: session ? session.warnings : 0,
         violationHistory: session && session.violationHistory ? session.violationHistory : []
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getExamLogs = async (req, res) => {
  try {
    const { id: examId } = req.params;
    
    const logs = await ProctorLog.find({ examId })
      .populate('studentId', 'name email')
      .sort({ timestamp: -1 });
      
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetStudentSession = async (req, res) => {
  try {
    const { id: examId, studentId } = req.params;
    
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    
    if (exam.teacherId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this exam' });
    }

    // Delete existing session, submissions, and logs for this student in this exam
    await ExamSession.findOneAndDelete({ examId, studentId });
    await Submission.deleteMany({ examId, studentId });
    await ProctorLog.deleteMany({ examId, studentId });

    if (req.io) {
      req.io.to(`student_${studentId}`).emit('session:reset');
    }

    res.json({ message: 'Student session has been reset. They can now re-enter the exam.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const extendExamTime = async (req, res) => {
  try {
    const { id: examId } = req.params;
    const { additionalMinutes } = req.body;
    
    if (!additionalMinutes || isNaN(additionalMinutes) || additionalMinutes <= 0) {
      return res.status(400).json({ message: 'Please provide a valid number of additional minutes.' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    
    if (exam.teacherId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this exam' });
    }

    const currentEndTime = new Date(exam.endTime);
    currentEndTime.setMinutes(currentEndTime.getMinutes() + Number(additionalMinutes));
    
    exam.endTime = currentEndTime;
    
    if (exam.duration) {
      exam.duration += Number(additionalMinutes);
    }

    await exam.save();
    
    res.json({ message: `Exam extended by ${additionalMinutes} minutes.`, exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentSubmissions = async (req, res) => {
  try {
    const { id: examId, studentId } = req.params;
    
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    
    if (exam.teacherId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const session = await ExamSession.findOne({ examId, studentId }).lean();
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const submissions = await Submission.find({ examId, studentId }).populate('questionId').lean();

    res.json({ session, submissions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const scoreStudentSession = async (req, res) => {
  try {
    const { id: examId, studentId } = req.params;
    const { score } = req.body;
    
    if (score === undefined || isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({ message: 'Please provide a valid score between 0 and 100.' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    
    if (exam.teacherId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const session = await ExamSession.findOneAndUpdate(
      { examId, studentId },
      { score: Number(score), status: 'graded' },
      { new: true }
    );

    if (!session) return res.status(404).json({ message: 'Session not found' });

    res.json({ message: 'Score successfully assigned', session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
