import mongoose from 'mongoose';

const proctorLogSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  eventType: { 
    type: String, 
    enum: ['face_missing', 'multiple_faces', 'looking_away', 'tab_switch', 'copy_paste', 'window_blur', 'fullscreen_exit', 'identity_mismatch'], 
    required: true 
  },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('ProctorLog', proctorLogSchema);
