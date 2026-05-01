import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const examSchema = new mongoose.Schema({
  title: String,
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subject: String,
  joinCode: String,
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { collection: 'exams' });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
}, { collection: 'users' });

const sessionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: String,
  score: Number
}, { collection: 'examsessions' });

const Exam = mongoose.model('Exam', examSchema);
const User = mongoose.model('User', userSchema);
const ExamSession = mongoose.model('ExamSession', sessionSchema);

mongoose.connect('mongodb://127.0.0.1:27017/proctorflow').then(async () => {
    try {
      const exams = await Exam.find({ title: /DSA Python/i });
      console.log('DSA Python Exams found:', exams.length);
      for (const ex of exams) {
        console.log(`\nExam ID: ${ex._id}`);
        console.log(`Enrolled IDs count:`, ex.enrolledStudents.length);
        console.log(`Raw enrolledStudents:`, ex.enrolledStudents);
        
        const sessions = await ExamSession.find({ examId: ex._id });
        console.log(`Sessions count:`, sessions.length);
        console.log(`Sessions raw:`, sessions);
      }
      process.exit(0);
    } catch(e) {
      console.error(e);
      process.exit(1);
    }
});
