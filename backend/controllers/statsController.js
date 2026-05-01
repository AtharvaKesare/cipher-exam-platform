import Exam from '../models/Exam.js';
import ExamSession from '../models/ExamSession.js';
import ProctorLog from '../models/ProctorLog.js';

export const getTeacherStats = async (req, res) => {
  try {
      const exams = await Exam.find({ teacherId: req.user.id });
      const examIds = exams.map(e => e._id);
      
      const activeExams = exams.filter(e => {
         const now = new Date();
         return now >= new Date(e.startTime) && now <= new Date(e.endTime);
      }).length;
      
      let totalStudents = 0;
      exams.forEach(e => totalStudents += (e.enrolledStudents ? e.enrolledStudents.length : 0));
      
      const sessions = await ExamSession.find({ examId: { $in: examIds } });
      
      let totalFlags = 0;
      let totalCompletionTimeMs = 0;
      let submittedCount = 0;
      
      sessions.forEach(s => {
          totalFlags += (s.warnings || 0);
          if (s.status === 'submitted' && s.endTime && s.startTime) {
              totalCompletionTimeMs += (new Date(s.endTime) - new Date(s.startTime));
              submittedCount++;
          }
      });
      
      const avgCompletionMinutes = submittedCount > 0 ? Math.round((totalCompletionTimeMs / submittedCount) / 60000) : 0;
      
      res.json({
         activeExams,
         totalStudents,
         flagsRaised: totalFlags,
         avgCompletionTime: `${avgCompletionMinutes}m`
      });
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
};

export const getMyStudents = async (req, res) => {
    try {
        const exams = await Exam.find({ teacherId: req.user.id }).populate('enrolledStudents', 'name email');
        const examIds = exams.map(e => e._id);
        const sessions = await ExamSession.find({ examId: { $in: examIds }});
        
        let studentMap = {};
        
        exams.forEach(exam => {
            if (exam.enrolledStudents) {
               exam.enrolledStudents.forEach(st => {
                    const stId = st._id.toString();
                    if (!studentMap[stId]) {
                        studentMap[stId] = {
                            id: stId,
                            name: st.name,
                            email: st.email,
                            totalExams: 0,
                            totalWarnings: 0,
                            status: 'CLEAN'
                        };
                    }
                    studentMap[stId].totalExams++;
               });
            }
        });
        
        sessions.forEach(s => {
             const stId = s.studentId.toString();
             if (studentMap[stId]) {
                 studentMap[stId].totalWarnings += (s.warnings || 0);
                 
                 const w = studentMap[stId].totalWarnings;
                 if (w >= 3) studentMap[stId].status = 'SUSPENDED';
                 else if (w > 0) studentMap[stId].status = 'FLAGGED';
             }
        });
        
        res.json(Object.values(studentMap));
    } catch (err) {
       res.status(500).json({ message: err.message });
    }
};

export const getStudentStats = async (req, res) => {
    try {
        const studentId = req.user.id;
        // Find exams the student is enrolled in
        const exams = await Exam.find({ enrolledStudents: studentId }).lean();
        
        // Find sessions
        const sessions = await ExamSession.find({ studentId }).lean();
        
        const recentResults = [];
        sessions.forEach(session => {
             const exam = exams.find(e => e._id.toString() === session.examId.toString());
             if (exam && (session.status === 'submitted' || session.status === 'terminated' || session.status === 'auto_submitted' || session.status === 'graded')) {
                 recentResults.push({
                     examId: exam._id,
                     title: exam.title,
                     score: session.score,
                     submittedAt: session.submittedAt || session.updatedAt
                 });
             }
        });
        
        res.json({
            enrolledExams: exams.filter(e => {
                const session = sessions.find(s => s.examId.toString() === e._id.toString());
                return !session || session.status === 'not_started' || session.status === 'in_progress';
            }),
            recentResults: recentResults.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getStudentLogs = async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const logs = await ProctorLog.find({ studentId })
            .populate('examId', 'title subject')
            .sort({ timestamp: -1 })
            .lean();

        const formatted = logs.map(log => ({
            _id: log._id,
            eventType: log.eventType,
            timestamp: log.timestamp || log.createdAt,
            examTitle: log.examId ? log.examId.title : 'Unknown Exam',
            examSubject: log.examId ? log.examId.subject : '',
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
