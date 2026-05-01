'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Clock, AlertTriangle, MonitorPlay, TerminalSquare, LogOut, Home, X, Trash2 } from 'lucide-react';

const StatCard = ({ stat }: { stat: any }) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 hover:border-border/80 hover:-translate-y-0.5 transition-all duration-200 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
        <div className={`p-2 rounded-lg bg-background ${stat.color} border border-border shadow-sm`}>
           <stat.icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-4xl font-semibold tracking-tight text-foreground">{stat.value || '0'}</div>
    </div>
  );
};

// Extend Time Modal Component
const ExtendTimeModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  examTitle, 
  isProcessing 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (minutes: number) => void; 
  examTitle: string; 
  isProcessing: boolean; 
}) => {
  const [minutes, setMinutes] = useState('15');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins <= 0) {
      setError('Please enter a valid positive number');
      return;
    }
    if (mins > 180) {
      setError('Maximum extension is 180 minutes');
      return;
    }
    setError('');
    onConfirm(mins);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl mx-4 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Extend Time</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{examTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-2 mb-5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Additional Minutes
            </label>
            <input
              type="number"
              min="1"
              max="180"
              value={minutes}
              onChange={(e) => { setMinutes(e.target.value); setError(''); }}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors shadow-sm"
              placeholder="e.g. 15"
              autoFocus
            />
            {error && (
              <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>
            )}
          </div>

          {/* Quick select buttons */}
          <div className="flex gap-2 mb-5">
            {[5, 10, 15, 30, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMinutes(String(m)); setError(''); }}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                  minutes === String(m) 
                    ? 'bg-primary/10 border-primary/30 text-primary' 
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing && <Clock className="h-4 w-4 animate-spin" />}
              {isProcessing ? 'Extending...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function TeacherDashboard() {
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [stats, setStats] = useState({ activeExams: 0, totalStudents: 0, avgCompletionTime: '0m', flagsRaised: 0 });
  const [user, setUser] = useState<any>(null);
  
  // Extend time modal state
  const [extendModal, setExtendModal] = useState<{ open: boolean; examId: string; examTitle: string }>({ open: false, examId: '', examTitle: '' });
  const [isExtending, setIsExtending] = useState(false);

  // Delete exam modal state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; examId: string; examTitle: string }>({ open: false, examId: '', examTitle: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const usr = localStorage.getItem('user');
    if (usr) setUser(JSON.parse(usr));
    
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const [stRes, exRes] = await Promise.all([
           fetch('http://localhost:5000/api/dashboard/teacher', { headers: { 'Authorization': `Bearer ${token}` } }),
           fetch('http://localhost:5000/api/exams', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (stRes.ok) {
           const stData = await stRes.json();
           setStats(stData);
        }
        
        if (exRes.ok) {
           const exData = await exRes.json();
           setExams(exData.map((exam: any) => ({
               id: exam._id,
               title: exam.title,
               subject: exam.subject,
               students: exam.studentCount || 0,
               date: new Date(exam.startTime).toLocaleDateString(),
               status: String(exam.status).charAt(0).toUpperCase() + String(exam.status).slice(1)
           })));
        }

      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };
    
    fetchData();
  }, [router]);

  const handleExtendTime = async (minutes: number) => {
    setIsExtending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/exams/${extendModal.examId}/extend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ additionalMinutes: minutes })
      });
      
      if (res.ok) {
        setExtendModal({ open: false, examId: '', examTitle: '' });
        // Refresh data
        const exRes = await fetch('http://localhost:5000/api/exams', { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (exRes.ok) {
          const exData = await exRes.json();
          setExams(exData.map((exam: any) => ({
            id: exam._id,
            title: exam.title,
            subject: exam.subject,
            students: exam.studentCount || 0,
            date: new Date(exam.startTime).toLocaleDateString(),
            status: String(exam.status).charAt(0).toUpperCase() + String(exam.status).slice(1)
          })));
        }
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to extend time');
      }
    } catch(err) {
      console.error(err);
      alert('An error occurred while extending time.');
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleDeleteExam = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/exams/${deleteModal.examId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete exam');
      // Remove from local state
      setExams(prev => prev.filter(e => e.id !== deleteModal.examId));
      setDeleteModal({ open: false, examId: '', examTitle: '' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      
      {/* Soft Ambient Background without Heavy Blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 w-full h-[500px] bg-gradient-to-b from-primary/[0.03] to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-10">
        
        {/* Header Section */}
        <header className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60"></span>
              Instructor Workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Welcome back, {user?.name ? user.name.split(' ')[0] : 'Instructor'}
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-card hover:bg-muted border border-border px-4 py-2 rounded-lg shadow-sm"
            >
              <Home className="h-4 w-4" /> Home
            </button>
            <button 
              onClick={() => router.push('/dashboard/teacher/students')}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-card hover:bg-muted border border-border px-4 py-2 rounded-lg shadow-sm"
            >
              <Users className="h-4 w-4" /> Students
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors bg-card hover:bg-red-500/5 border border-border hover:border-red-500/30 px-4 py-2 rounded-lg shadow-sm"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
            
            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
            
            <button 
              onClick={() => router.push('/dashboard/teacher/create')}
              className="flex items-center gap-2 text-sm font-medium text-background bg-foreground hover:opacity-90 transition-opacity px-5 py-2 rounded-lg shadow-sm"
            >
              <Plus className="h-4 w-4" /> New Exam
            </button>
          </div>
        </header>

        {/* Analytics Top Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {[
            { label: 'Active Exams', value: stats.activeExams, icon: MonitorPlay, color: 'text-emerald-500' },
            { label: 'Total Enrolled', value: stats.totalStudents, icon: Users, color: 'text-primary' },
            { label: 'Avg Finish Time', value: stats.avgCompletionTime, icon: Clock, color: 'text-yellow-500' },
            { label: 'Flags Raised', value: stats.flagsRaised, icon: AlertTriangle, color: 'text-red-500' },
          ].map((stat, i) => (
            <StatCard key={i} stat={stat} />
          ))}
        </div>

        {/* Manage Exams Section */}
        <div>
           <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              Your Exams
            </h2>
          </div>
          
          <div className="space-y-3">
            {exams.map((exam) => (
              <div key={exam.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 hover:border-border/80 hover:-translate-y-0.5 transition-all duration-200 shadow-sm">
                <div>
                  <h3 className="font-semibold text-[15px] text-foreground mb-2 flex items-center gap-3">
                    {exam.title}
                    <span className="rounded-md bg-secondary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-secondary border border-secondary/20">
                      {exam.subject}
                    </span>
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {exam.students} Enrolled</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {exam.date}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 sm:gap-4 mt-2 sm:mt-0 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border uppercase tracking-wide ${
                    exam.status === 'Upcoming' ? 'bg-secondary/10 text-secondary border-secondary/20' : 
                    exam.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    'bg-muted text-muted-foreground border-border'
                  }`}>
                    {exam.status}
                  </span>
                  
                  <div className="h-5 w-px bg-border hidden sm:block" />
                  
                  <button
                     onClick={() => setExtendModal({ open: true, examId: exam.id, examTitle: exam.title })}
                     className="text-xs font-medium text-amber-500/90 transition-colors hover:text-amber-500 flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 hover:bg-amber-500/20"
                  >
                     <Clock className="w-3.5 h-3.5" /> Extend Time
                  </button>
                  <button 
                    onClick={() => router.push(`/dashboard/teacher/exam/${exam.id}`)}
                    className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-lg transition-colors hover:bg-primary hover:text-primary-foreground flex items-center gap-1"
                  >
                    Manage
                  </button>
                  <button
                    onClick={() => setDeleteModal({ open: true, examId: exam.id, examTitle: exam.title })}
                    className="text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors hover:bg-red-500 hover:text-white flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
            
            {exams.length === 0 && (
               <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-border bg-card/50 border-dashed text-center">
                  <TerminalSquare className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground">No exams created</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">Start by creating your first exam to evaluate students.</p>
                  <button 
                    onClick={() => router.push('/dashboard/teacher/create')}
                    className="flex items-center gap-2 text-xs font-medium text-background bg-foreground hover:opacity-90 transition-opacity px-4 py-2 rounded-lg"
                  >
                    <Plus className="h-3.5 w-3.5" /> Create Exam
                  </button>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Extend Time Modal */}
      <ExtendTimeModal
        isOpen={extendModal.open}
        onClose={() => setExtendModal({ open: false, examId: '', examTitle: '' })}
        onConfirm={handleExtendTime}
        examTitle={extendModal.examTitle}
        isProcessing={isExtending}
      />

      {/* Delete Exam Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteModal({ open: false, examId: '', examTitle: '' })} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/20 bg-card p-6 shadow-2xl mx-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Delete Exam</h3>
                  <p className="text-xs text-muted-foreground truncate max-w-[220px]">{deleteModal.examTitle}</p>
                </div>
              </div>
              <button onClick={() => !isDeleting && setDeleteModal({ open: false, examId: '', examTitle: '' })} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-5">
              <p className="text-sm text-foreground font-medium mb-1">⚠️ This action is permanent.</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Deleting this exam will permanently remove all questions, student sessions, proctor logs, and submissions associated with it. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, examId: '', examTitle: '' })}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteExam}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting...</>
                ) : (
                  <><Trash2 className="h-4 w-4" />Delete Permanently</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
