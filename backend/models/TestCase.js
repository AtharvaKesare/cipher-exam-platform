import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('TestCase', testCaseSchema);
