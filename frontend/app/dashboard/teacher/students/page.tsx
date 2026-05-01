'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Clock, Search, X, AlertTriangle, Eye, Monitor, Copy, Maximize, UserX, ArrowLeft, FileWarning, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EVENT_TYPE_MAP: Record<string, { label: string; icon: any; color: string }> = {
  face_missing:      { label: 'Face Missing',       icon: UserX,          color: 'text-red-500 bg-red-500/10 border-red-500/20' },
  multiple_faces:    { label: 'Multiple Faces',     icon: Users,          color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
  phone_detected:    { label: 'Phone Detected',     icon: Smartphone,     color: 'text-rose-600 bg-rose-600/10 border-rose-600/20' },
  looking_away:      { label: 'Looking Away',       icon: Eye,            color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
  tab_switch:        { label: 'Tab Switch',         icon: Monitor,        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  copy_paste:        { label: 'Copy / Paste',       icon: Copy,           color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
  window_blur:       { label: 'Window Blur',        icon: Maximize,       color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
  fullscreen_exit:   { label: 'Fullscreen Exit',    icon: Maximize,       color: 'text-pink-500 bg-pink-500/10 border-pink-500/20' },
  identity_mismatch: { label: 'Identity Mismatch',  icon: AlertTriangle,  color: 'text-red-600 bg-red-600/10 border-red-600/20' },
};

// ── Logs Modal ──
function LogsModal({ 
  student, 
  onClose 
}: { 
  student: { id: string; name: string; email: string }; 
  onClose: () => void; 
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/dashboard/students/${student.id}/logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [student.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-full max-w-2xl max-h-[80vh] rounded-2xl border border-border bg-card shadow-2xl mx-4 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20">
              <FileWarning className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Infraction Logs</h3>
              <p className="text-xs text-muted-foreground">{student.name} · {student.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                <Users className="h-7 w-7 text-green-500" />
              </div>
              <p className="text-sm font-medium text-foreground">No infractions found</p>
              <p className="text-xs text-muted-foreground mt-1">This student has a clean record across all exams.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log: any, i: number) => {
                const info = EVENT_TYPE_MAP[log.eventType] || { label: log.eventType, icon: AlertTriangle, color: 'text-muted-foreground bg-muted border-border' };
                const Icon = info.icon;
                const time = new Date(log.timestamp);

                return (
                  <motion.div
                    key={log._id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 rounded-xl border border-border bg-background/50 p-3.5 group hover:border-primary/20 transition-colors"
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
                        <span className="text-[10px] px-2 py-0.5 rounded-md border border-border bg-muted text-muted-foreground font-medium truncate max-w-[160px]">
                          {log.examTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {time.toLocaleDateString()} at {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 shrink-0 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {logs.length} total infraction{logs.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ──
export default function StudentsManagement() {
  const router = useRouter();
  
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; email: string } | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/dashboard/students`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStudents(data);
        }
      } catch (err) {
        console.error('Failed to fetch students:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
       case 'CLEAN':
         return <span className="text-xs px-2.5 py-1 font-medium rounded-full border bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20">Clean</span>;
       case 'MONITOR':
         return <span className="text-xs px-2.5 py-1 font-medium rounded-full border bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Monitor</span>;
       case 'FLAGGED':
         return <span className="text-xs px-2.5 py-1 font-medium rounded-full border bg-orange-500/10 text-orange-500 border-orange-500/20">Flagged</span>;
       case 'SUSPENDED':
         return <span className="text-xs px-2.5 py-1 font-medium rounded-full border bg-destructive/10 text-destructive border-destructive/20 animate-pulse">Suspended</span>;
       default:
         return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <header className="mb-8 flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
               <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">Student Directory</h1>
              <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
                Manage students, exams, and infraction logs
              </p>
            </div>
          </div>
          <button 
            onClick={() => router.push('/dashboard/teacher')}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground flex items-center gap-2"
          >
             <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
        </header>

        <div className="rounded-xl border border-border p-4 relative overflow-hidden mb-6 bg-card shadow-sm">
           <div className="flex items-center gap-4 relative z-10">
             <Search className="w-5 h-5 text-muted-foreground" />
             <input 
               type="text" 
               placeholder="Search by student name or email..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-transparent border-none focus:outline-none text-foreground text-sm placeholder:text-muted-foreground"
             />
           </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium">Student Name</th>
                    <th className="px-6 py-4 font-medium">Email Address</th>
                    <th className="px-6 py-4 font-medium text-center">Exams Taken</th>
                    <th className="px-6 py-4 font-medium text-center">Total Infractions</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-muted-foreground">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{student.name}</div>
                        <div className="text-xs text-muted-foreground/60 mt-1 hidden group-hover:block">ID: {student.id}</div>
                      </td>
                      <td className="px-6 py-4">{student.email}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground font-medium">
                           {student.totalExams}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border font-medium ${
                           student.totalWarnings === 0 ? 'bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]' :
                           student.totalWarnings < 3 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                           'bg-destructive/10 border-destructive/20 text-destructive'
                        }`}>
                           {student.totalWarnings}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         {getStatusBadge(student.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button 
                           onClick={() => setSelectedStudent({ id: student.id, name: student.name, email: student.email })}
                           className="text-xs font-medium text-primary hover:text-primary/80 transition-colors border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-md flex items-center gap-1.5 ml-auto"
                         >
                            <Eye className="w-3.5 h-3.5" /> View Logs
                         </button>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">
                        No students match current search terms.
                      </td>
                    </tr>
                  )}
                </tbody>
             </table>
           </div>
        </div>

      </div>

      {/* Logs Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <LogsModal
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
