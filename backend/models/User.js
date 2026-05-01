import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher', 'student'], default: 'student' },
  subjectSpecialty: { type: String, enum: ['All', 'Python', 'SQL', 'JavaScript'] },
  faceEmbedding: { type: [Number], default: [] }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
