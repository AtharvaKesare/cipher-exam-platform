import Exam from '../models/Exam.js';
import ExamSession from '../models/ExamSession.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';

export const startExam = async (req, res) => {
  const { id: examId } = req.params;
  const studentId = req.user.id;
  
  try {
    const exam = await Exam.findById(examId).populate('questions');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Check if enrolled
    if (!exam.enrolledStudents.includes(studentId)) {
      return res.status(403).json({ message: 'You are not enrolled in this exam. Please join using the exam code.' });
    }

    // Check if session exists
    let session = await ExamSession.findOne({ examId, studentId });
    if (!session) {
      session = await ExamSession.create({ 
        examId, 
        studentId, 
        startTime: new Date(),
        status: 'in_progress' 
      });
    } else if (session.status === 'not_started') {
      session.status = 'in_progress';
      session.startTime = new Date();
      await session.save();
    } else if (['submitted', 'terminated', 'auto_submitted'].includes(session.status)) {
      // Return 409 so frontend can redirect to results
      return res.status(409).json({ message: 'Exam has already been completed.', session });
    }
    
    res.status(200).json({ session, exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitExam = async (req, res) => {
  const { id: examId } = req.params;
  const studentId = req.user.id;
  const { reason, finalCode, questionId, language, allCode } = req.body; // optional: 'violation' to mark as terminated, plus final code
  
  try {
    // Save any pending code that wasn't "Run" immediately before submission
    if (allCode && typeof allCode === 'object') {
      for (const key of Object.keys(allCode)) {
        const [qId, lang] = key.split('_');
        if (qId && lang) {
          const codeVal = allCode[key];
          const existingSub = await Submission.findOne({ studentId, examId, questionId: qId });
          if (existingSub) {
             existingSub.code = codeVal;
             existingSub.language = lang;
             // Don't overwrite an existing 'passed' result, just update the code text
             await existingSub.save();
          } else {
             await Submission.create({
                studentId, examId, questionId: qId,
                code: codeVal,
                language: lang,
                result: 'pending',
                output: '',
                score: 0
             });
          }
        }
      }
    } else if (questionId && finalCode !== undefined) {
      // Find one or create Fallback
      const existingSub = await Submission.findOne({ studentId, examId, questionId });
      if (existingSub) {
        existingSub.code = finalCode;
        if (language) existingSub.language = language;
        // Don't overwrite an existing 'passed' result, just update the code text
        await existingSub.save();
      } else {
        await Submission.create({
          studentId, examId, questionId,
          code: finalCode,
          language: language || 'javascript',
          result: 'pending',
          output: '',
          score: 0
        });
      }
    }

    const submissions = await Submission.find({ examId, studentId });
    const exam = await Exam.findById(examId).populate('questions');
    
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    if (exam && exam.questions) {
       for (const question of exam.questions) {
          const maxPoints = question.points || 10;
          maxPossibleScore += maxPoints;
          
          const submission = submissions.find(s => s.questionId.toString() === question._id.toString());
          if (submission && submission.result === 'passed') {
              totalScore += maxPoints;
          }
       }
    }
    
    let finalPercentageScore = 0;
    if (maxPossibleScore > 0) {
        finalPercentageScore = Math.round((totalScore / maxPossibleScore) * 100);
    }

    const finalStatus = reason === 'violation' ? 'terminated' : 'submitted';

    const session = await ExamSession.findOneAndUpdate(
      { examId, studentId },
      { 
        endTime: new Date(), 
        status: finalStatus,
        submittedAt: new Date(),
        score: finalPercentageScore 
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ message: 'No active exam session found. Please start the exam first.' });
    }

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
