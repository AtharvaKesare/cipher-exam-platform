import mongoose from 'mongoose';

const examSessionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  warnings: { type: Number, default: 0 },
  violationHistory: [{
    type: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  status: { 
    type: String, 
    enum: ['not_started', 'in_progress', 'submitted', 'auto_submitted', 'terminated'], 
    default: 'in_progress' 
  },
  score: { type: Number, default: 0 },
  submittedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('ExamSession', examSessionSchema);
