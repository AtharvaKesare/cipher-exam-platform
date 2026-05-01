import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import examRoutes from './routes/examRoutes.js';
import studentExamRoutes from './routes/studentExamRoutes.js';
import codeRoutes from './routes/codeRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import rateLimit from 'express-rate-limit';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }
});

// Connect to Database
connectDB();

// Middlewares
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());



const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per `window` (here, per 1 minute)
  message: { message: 'Too many requests from this IP, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

const codeExecutionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // Allow up to 60 code runs per minute per student
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // Manually set CORS header so the browser doesn't swallow this as 'Failed to fetch'
    const origin = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(429).json({
      message: 'You are running code too fast. Please wait a moment before trying again.'
    });
  }
});

app.use('/api', apiLimiter);
app.use('/api/code', codeExecutionLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/student-exams', studentExamRoutes);
app.use('/api/student/exam', studentExamRoutes);  // alias: frontend uses this path
app.use('/api/code', codeRoutes);
app.use('/api/dashboard', statsRoutes);
app.use('/api/admin', adminRoutes);

// Socket.io connection for proctoring
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Teachers join a specific exam room to monitor
  socket.on('join_monitor', (examId) => {
    socket.join(`monitor_${examId}`);
    console.log(`Teacher joined monitor room for exam: ${examId}`);
  });

  // Students join a room uniquely identified by their student ID for targeted events
  socket.on('student_join', (studentId) => {
    socket.join(`student_${studentId}`);
    console.log(`Student joined their private socket room: ${studentId}`);
  });

  // Students send warning alerts
  socket.on('proctor_warning', async (data) => {
    // data: { examId, studentId, eventType, timestamp }
    io.to(`monitor_${data.examId}`).emit('student_warning', data);

    try {
      const ExamSession = (await import('./models/ExamSession.js')).default;
      const ProctorLog = (await import('./models/ProctorLog.js')).default;

      // Cast IDs properly to avoid ObjectId mismatch when client sends string
      let examId, studentId;
      try {
        examId = new mongoose.Types.ObjectId(data.examId);
        studentId = new mongoose.Types.ObjectId(data.studentId);
      } catch {
        console.error('Invalid ObjectId in proctor_warning:', data.examId, data.studentId);
        return;
      }
      
      const session = await ExamSession.findOne({ examId, studentId });
      if (session) {
        session.warnings += 1;
        session.violationHistory.push({ type: data.eventType, timestamp: data.timestamp || new Date() });
        await session.save();
      } else {
        console.warn(`proctor_warning: No session found for student=${data.studentId} exam=${data.examId}`);
      }
      
      await ProctorLog.create({
         studentId,
         examId,
         eventType: data.eventType,
         timestamp: data.timestamp || new Date()
      });
    } catch (err) {
      console.error('Error saving proctor warning:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Basic Route
app.get('/', (req, res) => {
  res.send('Proctored Exam API is running...');
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
