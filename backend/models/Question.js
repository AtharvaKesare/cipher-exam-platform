import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  allowedLanguages: { type: [String], default: ['javascript', 'python', 'sql'] },
  expectedOutput: { type: String },
  points: { type: Number, default: 10 }
}, { timestamps: true });

export default mongoose.model('Question', questionSchema);
