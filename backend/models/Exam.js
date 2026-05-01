import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, enum: ['SQL', 'Python', 'JavaScript'], required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // in minutes
  warningLimit: { type: Number, default: 3 },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  joinCode: { type: String, unique: true, sparse: true }
}, { timestamps: true });

export default mongoose.model('Exam', examSchema);
