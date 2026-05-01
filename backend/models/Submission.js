import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  code: { type: String, required: true },
  language: { type: String, required: true },
  result: { type: String, enum: ['pending', 'passed', 'failed', 'error'], default: 'pending' },
  executionTime: { type: Number }, // in milliseconds
  memoryUsed: { type: Number }, // in KB
  score: { type: Number, default: 0 },
  output: { type: String }
}, { timestamps: true });

submissionSchema.index({ studentId: 1, examId: 1, questionId: 1 });

export default mongoose.model('Submission', submissionSchema);
