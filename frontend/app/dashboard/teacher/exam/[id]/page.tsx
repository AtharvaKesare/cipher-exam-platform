'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Plus, Clock, Users, TerminalSquare, ShieldCheck, Filter, X, Eye, FileWarning, AlertTriangle, Monitor, Copy, Maximize, UserX, Smartphone } from 'lucide-react';
import { useConfirmModal } from '@/components/confirm-modal';
import { useToast } from '@/components/toast-provider';

// ── Per-exam per-student infraction log modal ──────────────────────────────
const EVENT_TYPE_MAP: Record<string, { label: string; icon: any; color: string }> = {
  face_missing:      { label: 'Face Missing',       icon: UserX,          color: 'text-red-500 bg-red-500/10 border-red-500/20' },
  multiple_faces:    { label: 'Multiple Faces',     icon: Users,          color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
  phone_detected:    { label: 'Phone Detected',     icon: Smartphone,     color: 'text-rose-600 bg-rose-600/10 border-rose-600/20' },
  tab_switch:        { label: 'Tab Switch',         icon: Monitor,        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  copy_paste:        { label: 'Copy / Paste',       icon: Copy,           color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
  window_blur:       { label: 'Window Blur',        icon: Maximize,       color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
  fullscreen_exit:   { label: 'Fullscreen Exit',    icon: Maximize,       color: 'text-pink-500 bg-pink-500/10 border-pink-500/20' },
  identity_mismatch: { label: 'Identity Mismatch',  icon: AlertTriangle,  color: 'text-red-600 bg-red-600/10 border-red-600/20' },
};

function StudentInfractionModal({
  student,
  examLogs,
  onClose,
}: {
  student: { _id: string; name: string; email: string };
  examLogs: any[];
  onClose: () => void;
}) {
  // Filter logs from already-fetched exam logs array to this student only
  const studentLogs = examLogs.filter(
    (log) => (log.studentId?._id || log.studentId) === student._id
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl mx-4 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20">
              <FileWarning className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Infraction Logs</h3>
              <p className="text-xs text-muted-foreground">{student.name} · This Exam Only</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">
          {studentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                <ShieldCheck className="h-7 w-7 text-green-500" />
              </div>
              <p className="text-sm font-medium text-foreground">No infractions for this exam</p>
              <p className="text-xs text-muted-foreground mt-1">This student had a clean session.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {studentLogs.map((log: any, i: number) => {
                const info = EVENT_TYPE_MAP[log.eventType] || { label: log.eventType, icon: AlertTriangle, color: 'text-muted-foreground bg-muted border-border' };
                const Icon = info.icon;
                const time = new Date(log.timestamp);
                return (
                  <div
                    key={log._id || i}
                    className="flex items-center gap-4 rounded-xl border border-border bg-background/50 p-3.5 hover:border-primary/20 transition-colors"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${info.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{info.label}</span>
                        {log.eventType === 'phone_detected' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 font-medium">Auto-Terminated</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {time.toLocaleDateString()} at {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 shrink-0 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {studentLogs.length} infraction{studentLogs.length !== 1 ? 's' : ''} in this exam
          </span>
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManageExamPage() {
  const { confirm, ConfirmModalComponent } = useConfirmModal();
  const { success, error: showError } = useToast();
  const router = useRouter();
  const params = useParams();
  const examId = params.id as string;

  const [exam, setExam] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-student per-exam infraction modal
  const [infractionStudent, setInfractionStudent] = useState<any>(null);
  const [reviewModalData, setReviewModalData] = useState<any>(null);
  const [reviewScore, setReviewScore] = useState<string>('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);


  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    title: '',
    description: '',
    expectedOutput: '',
    difficulty: 'easy',
    allowedLanguages: [] as string[]
  });

  // Derive the locked language from the exam's subject whenever exam loads
  useEffect(() => {
    if (exam?.subject) {
      const lang = exam.subject.toLowerCase();
      setQuestionForm(prev => ({ ...prev, allowedLanguages: [lang] }));
    }
  }, [exam?.subject]);

  const fetchExam = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch(`http://localhost:5000/api/exams/${examId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch exam details');
      
      const data = await res.json();
      setExam(data);

      // Fetch enrolled students / analytics
      const studentsRes = await fetch(`http://localhost:5000/api/exams/${examId}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (studentsRes.ok) {
        setStudents(await studentsRes.json());
      }

      // Fetch logs
      const logsRes = await fetch(`http://localhost:5000/api/exams/${examId}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/exams/${examId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(questionForm)
      });

      if (!res.ok) throw new Error('Failed to add question');

      setShowAddQuestion(false);
      const lang = exam?.subject ? exam.subject.toLowerCase() : 'javascript';
      setQuestionForm({
        title: '',
        description: '',
        expectedOutput: '',
        difficulty: 'easy',
        allowedLanguages: [lang]
      });
      fetchExam(); // Refresh to show new question
      success('Question added successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to add question');
    }
  };

  const handleResetSession = async (studentId: string) => {
    const confirmed = await confirm({
      title: 'Reset Student Session',
      message: 'Are you sure you want to reset this student\'s session? They will have to restart the exam from the beginning.',
      confirmText: 'Reset Session',
      cancelText: 'Cancel',
      type: 'warning'
    });
    
    if (!confirmed) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/exams/${examId}/session/${studentId}/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset session');
      
      success(data.message || 'Session reset successfully');
      fetchExam(); // Refresh to show status changed to not_started
    } catch (err: any) {
      showError(err.message || 'Failed to reset session');
    }
  };

  const handleOpenReview = async (studentId: string) => {
    setReviewLoading(true);
    setIsReviewOpen(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/exams/${examId}/students/${studentId}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch submissions');
      const data = await res.json();
      setReviewModalData({ studentId, ...data });
      setReviewScore(data.session?.score?.toString() || '0');
    } catch (err: any) {
      showError(err.message);
      setIsReviewOpen(false);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSubmitScore = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/exams/${examId}/students/${reviewModalData.studentId}/score`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: Number(reviewScore) })
      });
      if (!res.ok) throw new Error('Failed to submit score');
      success('Score submitted successfully!');
      setIsReviewOpen(false);
      fetchExam();
    } catch (err: any) {
      showError(err.message);
    }
  };

  if (loading) return <div className="min-h-screen bg-background text-primary flex items-center justify-center p-8 animate-pulse text-sm">Loading exam details...</div>;
  if (error) return <div className="min-h-screen bg-background text-destructive flex items-center justify-center p-8 text-sm">{error}</div>;
  if (!exam) return <div className="min-h-screen bg-background text-muted-foreground flex items-center justify-center p-8 text-sm">Exam not found</div>;

  return (
    <>
      <ConfirmModalComponent />
      <div className="min-h-screen bg-background text-foreground p-8 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-8 flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
               <TerminalSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{exam.title}</h1>
              <p className="text-muted-foreground mt-1 text-xs">
                ID: {exam._id}
              </p>
            </div>
          </div>
          <button 
            onClick={() => router.push('/dashboard/teacher')}
            className="rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Back to Dashboard
          </button>
        </header>

        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="glass-panel rounded-xl border border-border p-6 shadow-sm text-center relative overflow-hidden hover:bg-muted/50 transition-colors">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Duration Allowed</h3>
            <p className="text-3xl font-bold flex items-center justify-center gap-3 text-foreground">
              <Clock className="w-6 h-6 text-primary" /> {exam.duration}m
            </p>
          </div>
          <div className="glass-panel rounded-xl border border-border p-6 shadow-sm text-center relative overflow-hidden hover:bg-muted/50 transition-colors">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Infraction Limit</h3>
            <p className="text-3xl font-bold flex items-center justify-center gap-3 text-foreground">
               <Filter className="w-6 h-6 text-destructive" /> {exam.warningLimit}
            </p>
          </div>
          <div className="glass-panel rounded-xl border border-border p-6 shadow-sm text-center relative overflow-hidden hover:bg-muted/50 transition-colors">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Questions</h3>
            <p className="text-3xl font-bold flex items-center justify-center gap-3 text-foreground">
              <ShieldCheck className="w-6 h-6 text-secondary" /> {exam.questions?.length || 0}
            </p>
          </div>
        </div>

        {/* Join Code Display */}
        <div className="mb-12 glass-panel rounded-xl border border-primary/20 bg-primary/5 p-6 flex items-center justify-between">
            <div>
               <h3 className="text-sm font-medium text-muted-foreground mb-1">Student Enrollment Code</h3>
               <p className="text-4xl font-mono text-foreground tracking-widest font-bold">{exam.joinCode || '------'}</p>
            </div>
            <div className="flex gap-3">
               <button 
                 onClick={() => {
                   navigator.clipboard.writeText(exam.joinCode);
                   success('Join code copied to clipboard!');
                 }}
                 className="px-4 py-2 border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 rounded-md text-sm font-medium transition-colors"
               >
                 Copy Code
               </button>
               <button 
                 onClick={async () => {
                   const token = localStorage.getItem('token');
                   const res = await fetch(`http://localhost:5000/api/exams/${examId}/generate-code`, {
                     method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
                   });
                   if (res.ok) {
                     const data = await res.json();
                     setExam({ ...exam, joinCode: data.joinCode });
                   }
                 }}
                 className="px-4 py-2 bg-card text-foreground rounded-md border border-border hover:bg-muted text-sm font-medium transition-colors"
               >
                 Regenerate
               </button>
            </div>
        </div>

        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
             Exam Questions
          </h2>
          <button 
            onClick={() => setShowAddQuestion(!showAddQuestion)}
            className="neon-btn flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add Question
          </button>
        </div>

        {showAddQuestion && (
          <form onSubmit={handleAddQuestion} className="mb-8 rounded-xl border border-border bg-card p-6 space-y-6 shadow-xl relative overflow-hidden">
            <h3 className="font-semibold text-foreground text-lg mb-2">New Question Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Question Title</label>
              <input 
                type="text" required
                value={questionForm.title}
                onChange={e => setQuestionForm({...questionForm, title: e.target.value})}
                placeholder="e.g. Reverse a String"
                className="w-full rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Description (Markdown Supported)</label>
              <textarea 
                required rows={4}
                value={questionForm.description}
                onChange={e => setQuestionForm({...questionForm, description: e.target.value})}
                placeholder="Write a function that reverses..."
                className="w-full rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Expected Output (Auto-Grading)</label>
              <textarea 
                rows={2}
                value={questionForm.expectedOutput}
                onChange={e => setQuestionForm({...questionForm, expectedOutput: e.target.value})}
                placeholder="Exact terminal output expected from correct code"
                className="w-full rounded-md border border-border bg-muted px-4 py-3 text-sm text-[#10B981] font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Difficulty</label>
                <select 
                  value={questionForm.difficulty}
                  onChange={e => setQuestionForm({...questionForm, difficulty: e.target.value})}
                  className="w-full rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors appearance-none"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Allowed Language</label>
                <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/20 border border-primary/30 px-3 py-1 text-sm font-semibold text-primary uppercase tracking-wide">
                    {questionForm.allowedLanguages[0] || (exam?.subject?.toLowerCase()) || '—'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">Locked to exam subject</span>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-6 pt-6 border-t border-border">
              <button 
                type="button" onClick={() => setShowAddQuestion(false)}
                className="flex-1 rounded-md border border-border bg-transparent px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="neon-btn flex-1 rounded-md px-4 py-3 text-sm font-medium"
              >
                Save Question
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {exam.questions?.length === 0 ? (
            <div className="text-center p-12 border border-border bg-card/50 border-dashed rounded-md text-sm text-muted-foreground">
              No questions found in this exam.
            </div>
          ) : (
            exam.questions?.map((q: any, i: number) => (
              <div key={q._id} className="glass-panel rounded-xl border border-border bg-card p-6 flex flex-col justify-between group hover:border-primary/30 transition-colors relative overflow-hidden">
                
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-2 flex items-center gap-2">
                    <span className="text-primary">Q{i + 1}.</span> {q.title}
                  </h3>
                  <div className="text-sm text-muted-foreground line-clamp-2 my-3">
                    {q.description}
                  </div>
                  
                  {q.expectedOutput && (
                    <div className="mt-3 bg-muted/50 dark:bg-black/30 border border-[#10B981]/10 rounded-md p-3 text-xs">
                      <span className="text-muted-foreground font-semibold block mb-1">Expected Output:</span>
                      <pre className="text-[#10B981] font-mono line-clamp-1">{q.expectedOutput}</pre>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 font-medium rounded-full border ${
                      q.difficulty === 'easy' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' :
                      q.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                      'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                        {q.difficulty?.charAt(0).toUpperCase() + q.difficulty?.slice(1)}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md border border-border font-mono">
                      {q.allowedLanguages?.join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- STUDENT MONITORING SECTION --- */}
        <div className="mt-16 mb-6 flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
             <Users className="w-5 h-5 text-primary" /> Enrolled Students
          </h2>
        </div>

        <div className="glass-panel rounded-xl border border-border bg-card overflow-hidden mb-12">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Student</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-center">Score</th>
                  <th className="px-6 py-4 font-medium text-center">Warnings</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">
                      No students enrolled.
                    </td>
                  </tr>
                ) : (
                  students.map(student => (
                    <tr key={student._id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{student.name}</div>
                        <div className="text-xs text-muted-foreground/60">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs px-2.5 py-1 font-medium rounded-full border ${
                          (student.status || 'not_started') === 'not_started' ? 'bg-muted text-muted-foreground border-border' :
                          student.status === 'in_progress' ? 'bg-primary/10 text-primary border-primary/20' :
                          student.status === 'submitted' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' :
                          'bg-destructive/10 text-destructive border-destructive/20'
                        }`}>
                          {(student.status || 'not_started').replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-foreground">{student.score}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border font-medium ${
                           student.warnings === 0 ? 'bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]' :
                           student.warnings < exam.warningLimit ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                           'bg-destructive/10 border-destructive/20 text-destructive'
                        }`}>
                           {student.warnings}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {student.status !== 'not_started' && (
                          <div className="flex items-center justify-end gap-2">
                             {['submitted', 'auto_submitted', 'terminated', 'graded'].includes(student.status) && (
                               <button 
                                 onClick={() => handleOpenReview(student._id)}
                                 className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors"
                               >
                                 <Eye className="w-3.5 h-3.5" /> Review
                               </button>
                             )}
                             <button
                               onClick={() => setInfractionStudent(student)}
                               className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-colors"
                             >
                               <FileWarning className="w-3.5 h-3.5" /> Logs
                             </button>
                             <button 
                               onClick={() => handleResetSession(student._id)}
                               className="text-xs font-medium px-3 py-1.5 rounded bg-muted text-muted-foreground hover:bg-muted/80 border border-border transition-colors"
                             >
                               Reset
                             </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- CHEATING ANALYTICS --- */}
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
             <ShieldCheck className="w-5 h-5 text-secondary" /> Cheating & Analytics Logs
          </h2>
        </div>
        
        <div className="glass-panel rounded-xl border border-border bg-card overflow-hidden">
          {logs.length === 0 ? (
             <div className="text-center p-12 border-dashed border border-border text-sm text-muted-foreground">
               No suspicious activity detected. (Logs are clean)
             </div>
          ) : (
             <div className="divide-y divide-border">
                {logs.map((log: any) => (
                  <div key={log._id} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground text-sm mb-1">{log.studentId?.name || 'Unknown Student'}</div>
                      <div className="text-xs text-muted-foreground">Event: <span className="text-destructive font-medium uppercase">{log.eventType.replace('_', ' ')}</span></div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                       {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
             </div>
          )}
        </div>

      </div>
    </div>
    
    {/* --- REVIEW MODAL --- */}
    {isReviewOpen && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="bg-card w-full max-w-6xl h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-border animate-in zoom-in-95 duration-200">
          
          <header className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
             <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                   <Eye className="w-5 h-5 text-primary" /> Grade Submission
                </h2>
                {reviewModalData?.session && (
                   <p className="text-xs text-muted-foreground mt-1">
                      Status: <span className="uppercase text-primary font-medium">{reviewModalData.session.status.replace('_', ' ')}</span> &bull; 
                      Recorded Infractions: <span className="text-destructive font-bold">{reviewModalData.session.warnings || 0}</span>
                   </p>
                )}
             </div>
             <button onClick={() => setIsReviewOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"><X className="w-5 h-5" /></button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 bg-muted/10 custom-scrollbar relative">
             {reviewLoading ? (
                <div className="absolute inset-0 flex items-center justify-center text-primary animate-pulse text-sm">Loading submission data...</div>
             ) : (
                <div className="space-y-6">
                   {reviewModalData?.submissions?.length === 0 ? (
                      <div className="text-center p-12 text-sm text-muted-foreground border border-dashed border-border rounded-xl">No submissions made by this student.</div>
                   ) : (
                      reviewModalData?.submissions?.map((sub: any, idx: number) => (
                         <div key={idx} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-muted px-4 py-3 border-b border-border shrink-0">
                               <h3 className="font-semibold text-foreground">{sub.questionId?.title || 'Unknown Question'}</h3>
                            </div>
                            
                            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                               <div className="flex flex-col gap-4">
                                  <div className="bg-background border border-border rounded-lg overflow-hidden flex flex-col h-48">
                                     <div className="bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground border-b border-border font-medium flex items-center justify-between shrink-0">
                                         <span className="flex items-center gap-1.5"><TerminalSquare className="w-3.5 h-3.5" /> Submitted Code ({sub.language})</span>
                                     </div>
                                     <div className="flex-1 overflow-auto custom-scrollbar p-0">
                                        <pre className="text-[13px] font-mono text-foreground m-0 p-3 w-full h-full pb-8">{sub.code}</pre>
                                     </div>
                                  </div>
                               </div>

                               <div className="flex flex-col gap-4">
                                  <div className="bg-background border border-border rounded-lg overflow-hidden flex flex-col h-20">
                                     <div className="bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground border-b border-border font-medium flex-shrink-0">Expected Output (from Question details)</div>
                                     <div className="flex-1 overflow-auto custom-scrollbar p-0">
                                        <pre className="text-[13px] font-mono text-emerald-500 m-0 p-3 h-full">{sub.questionId?.expectedOutput || 'None specified'}</pre>
                                     </div>
                                  </div>

                                  <div className="bg-background border border-border rounded-lg overflow-hidden flex flex-col h-24">
                                     <div className="bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground border-b border-border font-medium flex-shrink-0">Actual Execution Output</div>
                                     <div className="flex-1 overflow-auto custom-scrollbar p-0">
                                        <pre className="text-[13px] font-mono text-foreground m-0 p-3 h-full">{sub.output || 'No output'}</pre>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </div>
                      ))
                   )}
                </div>
             )}
          </div>

          <footer className="px-6 py-4 border-t border-border bg-card shrink-0 flex items-center justify-between">
             <div className="flex flex-col text-sm">
                <span className="text-muted-foreground mb-1">Current Auto-score (if any):</span>
                <span className="font-semibold text-foreground text-lg">{reviewModalData?.session?.score || 0}/100</span>
             </div>

             <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                   <label className="text-sm font-semibold text-foreground">Final Grade <span className="text-muted-foreground font-normal">(0-100)</span></label>
                   <input 
                      type="number" min="0" max="100"
                      value={reviewScore}
                      onChange={(e) => setReviewScore(e.target.value)}
                      className="w-24 text-center rounded-md border border-primary/50 bg-primary/5 px-3 py-2 text-primary font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary" 
                   />
                </div>
                <button 
                   onClick={handleSubmitScore}
                   disabled={reviewLoading}
                   className="neon-btn px-6 py-2.5 rounded-md font-medium text-sm flex items-center gap-2"
                >
                   Save & Submit Grade
                </button>
             </div>
          </footer>
        </div>
      </div>
    )}

    {/* Per-student per-exam infraction modal */}
    {infractionStudent && (
      <StudentInfractionModal
        student={infractionStudent}
        examLogs={logs}
        onClose={() => setInfractionStudent(null)}
      />
    )}

    </>
  );
}

