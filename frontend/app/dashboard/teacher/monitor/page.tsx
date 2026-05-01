'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { 
  MonitorPlay, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  Users, 
  Clock, 
  Activity,
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  Maximize2,
  Eye,
  Ban,
  MessageSquare,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/toast-provider';

// Types
interface StudentSession {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  warnings: number;
  notices: number;
  lastEvent: string;
  lastEventTime: Date;
  status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  timeRemaining: number;
  progress: number;
  joinTime: Date;
  events: ProctorEvent[];
}

interface ProctorEvent {
  id: string;
  type: string;
  timestamp: Date;
  severity: 'notice' | 'warning' | 'violation';
  message: string;
}

interface Stats {
  totalStudents: number;
  activeNow: number;
  warningsToday: number;
  avgProgress: number;
}

const eventLabels: Record<string, string> = {
  tab_switch: 'Switched Tabs',
  window_blur: 'Window Focus Lost',
  fullscreen_exit: 'Left Fullscreen',
  face_missing: 'Face Not Detected',
  multiple_faces: 'Multiple Faces',
  identity_mismatch: 'Identity Mismatch',
  copy_paste: 'Copy/Paste Attempt',
};

import { Suspense } from 'react';

function MonitorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get('examId');
  const socketRef = useRef<Socket | null>(null);
  const { success, error: showError, warning } = useToast();
  
  const [sessions, setSessions] = useState<Record<string, StudentSession>>({});
  const [filteredSessions, setFilteredSessions] = useState<StudentSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    activeNow: 0,
    warningsToday: 0,
    avgProgress: 0,
  });
  const [isConnected, setIsConnected] = useState(false);

  // Connect to WebSocket
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    socketRef.current = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}`, {
      auth: { token }
    });
    
    socketRef.current.on('connect', () => {
      setIsConnected(true);
      success('Connected to monitoring server');
      
      // Join exam room if examId provided
      if (examId) {
        socketRef.current?.emit('join_monitoring', { examId });
      }
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      warning('Disconnected from monitoring server');
    });

    // Listen for proctor events
    socketRef.current.on('proctor_event', (data: any) => {
      handleProctorEvent(data);
    });

    // Listen for student join/leave
    socketRef.current.on('student_joined', (data: any) => {
      handleStudentJoined(data);
    });

    socketRef.current.on('student_left', (data: any) => {
      handleStudentLeft(data);
    });

    // Fetch initial sessions
    fetchActiveSessions();
    
    // Update timer every second
    const timer = setInterval(updateTimeRemaining, 1000);

    return () => {
      clearInterval(timer);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [examId, router, success, warning]);

  // Filter sessions
  useEffect(() => {
    let filtered = Object.values(sessions);
    
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    setFilteredSessions(filtered);
    
    // Update stats
    const active = filtered.filter(s => s.status !== 'OFFLINE').length;
    const warnings = filtered.reduce((acc, s) => acc + s.warnings, 0);
    const avgProgress = filtered.length > 0 
      ? filtered.reduce((acc, s) => acc + s.progress, 0) / filtered.length 
      : 0;
    
    setStats({
      totalStudents: Object.keys(sessions).length,
      activeNow: active,
      warningsToday: warnings,
      avgProgress: Math.round(avgProgress),
    });
  }, [sessions, searchQuery, statusFilter]);

  const fetchActiveSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/exams/${examId}/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        const sessionsMap: Record<string, StudentSession> = {};
        
        data.sessions.forEach((session: any) => {
          sessionsMap[session.studentId] = {
            id: session.studentId,
            name: session.studentName,
            email: session.studentEmail,
            warnings: session.warnings || 0,
            notices: session.notices || 0,
            lastEvent: 'Connected',
            lastEventTime: new Date(),
            status: 'SAFE',
            timeRemaining: session.timeRemaining || 3600,
            progress: session.progress || 0,
            joinTime: new Date(session.joinTime),
            events: [],
          };
        });
        
        setSessions(sessionsMap);
      }
    } catch (err) {
      showError('Failed to fetch active sessions');
    }
  };

  const handleProctorEvent = (data: any) => {
    setSessions(prev => {
      const student = prev[data.studentId];
      if (!student) return prev;

      const event: ProctorEvent = {
        id: Math.random().toString(36).substring(2, 9),
        type: data.eventType,
        timestamp: new Date(data.timestamp),
        severity: data.severity || 'notice',
        message: eventLabels[data.eventType] || data.eventType,
      };

      const newWarnings = data.severity === 'violation' ? student.warnings + 1 : student.warnings;
      const newNotices = data.severity === 'notice' ? student.notices + 1 : student.notices;
      
      let newStatus: StudentSession['status'] = 'SAFE';
      if (newWarnings >= 3) newStatus = 'CRITICAL';
      else if (newWarnings > 0 || newNotices > 0) newStatus = 'WARNING';

      // Show toast for violations
      if (data.severity === 'violation') {
        warning(`${student.name}: ${event.message}`);
      }

      return {
        ...prev,
        [data.studentId]: {
          ...student,
          warnings: newWarnings,
          notices: newNotices,
          lastEvent: event.message,
          lastEventTime: new Date(),
          status: newStatus,
          events: [event, ...student.events].slice(0, 50), // Keep last 50 events
        }
      };
    });
  };

  const handleStudentJoined = (data: any) => {
    setSessions(prev => ({
      ...prev,
      [data.studentId]: {
        id: data.studentId,
        name: data.studentName,
        email: data.studentEmail,
        warnings: 0,
        notices: 0,
        lastEvent: 'Joined exam',
        lastEventTime: new Date(),
        status: 'SAFE',
        timeRemaining: data.duration || 3600,
        progress: 0,
        joinTime: new Date(),
        events: [],
      }
    }));
    success(`${data.studentName} joined the exam`);
  };

  const handleStudentLeft = (data: any) => {
    setSessions(prev => {
      const student = prev[data.studentId];
      if (!student) return prev;
      
      return {
        ...prev,
        [data.studentId]: {
          ...student,
          status: 'OFFLINE',
          lastEvent: 'Left exam',
          lastEventTime: new Date(),
        }
      };
    });
  };

  const updateTimeRemaining = () => {
    setSessions(prev => {
      const updated: Record<string, StudentSession> = {};
      
      Object.entries(prev).forEach(([id, session]) => {
        if (session.status !== 'OFFLINE' && session.timeRemaining > 0) {
          updated[id] = {
            ...session,
            timeRemaining: Math.max(0, session.timeRemaining - 1),
          };
        } else {
          updated[id] = session;
        }
      });
      
      return updated;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'SAFE':
        return {
          color: 'border-emerald-500/30 bg-emerald-500/5',
          icon: ShieldCheck,
          iconColor: 'text-emerald-500',
          label: 'Safe',
          pulse: false,
        };
      case 'WARNING':
        return {
          color: 'border-amber-500/30 bg-amber-500/5',
          icon: AlertTriangle,
          iconColor: 'text-amber-500',
          label: 'Warning',
          pulse: true,
        };
      case 'CRITICAL':
        return {
          color: 'border-destructive/40 bg-destructive/10',
          icon: AlertTriangle,
          iconColor: 'text-destructive',
          label: 'Critical',
          pulse: true,
        };
      default:
        return {
          color: 'border-muted bg-muted/30',
          icon: Eye,
          iconColor: 'text-muted-foreground',
          label: 'Offline',
          pulse: false,
        };
    }
  };

  const selectedSession = selectedStudent ? sessions[selectedStudent] : null;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/5 blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/dashboard/teacher')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-sm font-medium">Back</span>
                </motion.button>

                <div className="h-8 w-px bg-border" />

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                    <MonitorPlay className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold">Live Monitor</h1>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`} />
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden md:flex items-center gap-6">
                <StatBadge label="Total" value={stats.totalStudents} icon={Users} />
                <StatBadge label="Active" value={stats.activeNow} icon={Activity} color="primary" />
                <StatBadge label="Warnings" value={stats.warningsToday} icon={AlertTriangle} color="warning" />
              </div>
            </div>
          </div>
        </header>

        {/* Filters & Search */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            
            <div className="flex gap-2">
              {['all', 'SAFE', 'WARNING', 'CRITICAL'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'bg-card border border-border hover:bg-muted'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Student Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filteredSessions.map((session) => {
                const config = getStatusConfig(session.status);
                const Icon = config.icon;
                
                return (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    onClick={() => setSelectedStudent(session.id)}
                    className={`relative rounded-2xl border p-5 cursor-pointer transition-all group ${config.color} hover:shadow-xl`}
                  >
                    {/* Status Indicator */}
                    <div className="absolute top-4 right-4">
                      <motion.div
                        animate={config.pulse ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Icon className={`h-5 w-5 ${config.iconColor}`} />
                      </motion.div>
                    </div>

                    {/* Student Info */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-lg font-bold text-primary">
                        {session.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{session.name}</h3>
                        <p className="text-xs text-muted-foreground">{session.email}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{session.progress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${session.progress}%` }}
                          className="h-full bg-gradient-to-r from-primary to-cyan-500 rounded-full"
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-background/50 rounded-lg p-2.5">
                        <div className="text-muted-foreground mb-1">Time Left</div>
                        <div className="font-mono font-semibold">{formatTime(session.timeRemaining)}</div>
                      </div>
                      <div className="bg-background/50 rounded-lg p-2.5">
                        <div className="text-muted-foreground mb-1">Warnings</div>
                        <div className={`font-semibold ${session.warnings > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {session.warnings}
                        </div>
                      </div>
                    </div>

                    {/* Last Event */}
                    {session.lastEvent !== 'Connected' && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground truncate">{session.lastEvent}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {filteredSessions.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-4">
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No students found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search query</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Student Detail Modal */}
      <AnimatePresence>
        {selectedSession && (
          <StudentDetailModal
            session={selectedSession}
            onClose={() => setSelectedStudent(null)}
            eventLabels={eventLabels}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper Components
function StatBadge({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color?: string }) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    default: 'bg-card text-foreground border-border',
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colorClasses[color as keyof typeof colorClasses] || colorClasses.default}`}>
      <Icon className="h-4 w-4" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-bold">{value}</div>
      </div>
    </div>
  );
}

function StudentDetailModal({ session, onClose, eventLabels }: { session: StudentSession; onClose: () => void; eventLabels: Record<string, string> }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, x: '100%' }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.95, x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-lg font-bold text-primary">
              {session.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-semibold">{session.name}</h2>
              <p className="text-sm text-muted-foreground">{session.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-sm font-medium ${
                session.status === 'SAFE' ? 'bg-emerald-500/10 text-emerald-600' :
                session.status === 'WARNING' ? 'bg-amber-500/10 text-amber-600' :
                session.status === 'CRITICAL' ? 'bg-destructive/10 text-destructive' :
                'bg-muted text-muted-foreground'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  session.status === 'SAFE' ? 'bg-emerald-500' :
                  session.status === 'WARNING' ? 'bg-amber-500' :
                  session.status === 'CRITICAL' ? 'bg-destructive' :
                  'bg-muted-foreground'
                }`} />
                {session.status}
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="text-sm text-muted-foreground mb-1">Warnings</div>
              <div className={`text-2xl font-bold ${session.warnings > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {session.warnings}
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div>
            <h3 className="font-semibold mb-4">Activity Timeline</h3>
            <div className="space-y-3">
              {session.events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No events recorded yet
                </p>
              ) : (
                session.events.map((event, idx) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-start gap-3 p-3 rounded-xl ${
                      event.severity === 'violation' ? 'bg-destructive/5 border border-destructive/10' :
                      event.severity === 'warning' ? 'bg-amber-500/5 border border-amber-500/10' :
                      'bg-muted/30'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                      event.severity === 'violation' ? 'bg-destructive' :
                      event.severity === 'warning' ? 'bg-amber-500' :
                      'bg-primary'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      event.severity === 'violation' ? 'bg-destructive/10 text-destructive' :
                      event.severity === 'warning' ? 'bg-amber-500/10 text-amber-600' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {event.severity}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-border space-y-3">
          <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">Send Message</span>
          </button>
          <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
            <Ban className="h-4 w-4" />
            <span className="text-sm font-medium">Terminate Session</span>
          </button>
        </div>
      </motion.div>
    </>
  );
}

export default function LiveMonitor() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading monitor...</div>}>
      <MonitorContent />
    </Suspense>
  );
}

