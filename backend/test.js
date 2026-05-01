import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Exam from './models/Exam.js';
import ExamSession from './models/ExamSession.js';

mongoose.connect('mongodb://127.0.0.1:27017/proctorflow').then(async () => {
    const exam = await Exam.findById('69d6c0392518b49b0b8901c6').populate('enrolledStudents', 'name email');
    console.log('Exam Enrolled Students:', JSON.stringify(exam ? exam.enrolledStudents : null, null, 2));
    
    const sessions = await ExamSession.find({ examId: '69d6c0392518b49b0b8901c6' }).populate('studentId', 'name email');
    console.log('Sessions:', JSON.stringify(sessions, null, 2));
    
    process.exit(0);
});
