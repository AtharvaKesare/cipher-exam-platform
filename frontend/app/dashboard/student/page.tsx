'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle2, Clock, Code2, Home, LogOut, ArrowRight, Target, Activity, Check } from 'lucide-react';

export default function StudentDashboard() {
  const router = useRouter();
  const [enrolledExams, setEnrolledExams] = useState<any[]>([]);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [user, setUser] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return router.push('/login');
      
      const res = await fetch(`http://localhost:5000/api/dashboard/student`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setEnrolledExams(data.enrolledExams || []);
        setRecentResults(data.recentResults || []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  };

  useEffect(() => {
    const usr = localStorage.getItem('user');
    if (usr) setUser(JSON.parse(usr));
    fetchDashboardData();

    // Enable realtime updates for graded exams via background polling
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleJoinExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (!joinCode.trim()) return;

    setIsJoining(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/exams/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ joinCode })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to join exam');
      
      setJoinCode('');
      fetchDashboardData();
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Derived Metrics
  const totalCompleted = recentResults.length;
  const pendingCount = enrolledExams.length;
  const averageScore = totalCompleted > 0 
    ? Math.round(recentResults.reduce((acc, curr) => acc + curr.score, 0) / totalCompleted) 
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      
      {/* Soft Ambient Background without Heavy Blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 w-full h-[500px] bg-gradient-to-b from-primary/[0.03] to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1100px] mx-auto px-6 py-10">
        
        {/* Header Section */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60"></span>
              Student Workspace
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Welcome back, {user?.name ? user.name.split(' ')[0] : 'Student'}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/')} 
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-card hover:bg-muted border border-border px-4 py-2 rounded-lg shadow-sm"
            >
              <Home className="h-4 w-4" /> Home
            </button>
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-red-500 transition-colors bg-card hover:bg-red-500/5 border border-border hover:border-red-500/30 px-4 py-2 rounded-lg shadow-sm"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </header>

        {/* Top Analytics Row (Bento Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          
          {/* Total Exams Card */}
          <div className="bg-card border border-border rounded-xl p-6 hover:border-border/80 transition-colors flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-6">
              <CheckCircle2 className="h-4 w-4" />
              Assessments Completed
            </div>
            <div className="flex items-end justify-between mt-auto">
              <div className="text-4xl font-semibold tracking-tight text-foreground">
                {totalCompleted > 0 ? totalCompleted : '--'}
              </div>
            </div>
          </div>

          {/* Average Score Card */}
          <div className="bg-card border border-border rounded-xl p-6 hover:border-border/80 transition-colors flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-6">
              <Target className="h-4 w-4" />
              Average Score
            </div>
            <div className="flex items-end gap-3 mt-auto">
              <div className="text-4xl font-semibold tracking-tight text-foreground">
                {totalCompleted > 0 ? `${averageScore}%` : '--'}
              </div>
              {totalCompleted > 0 && (
                <div className="h-6 w-6 rounded-full border-[3px] mb-1.5" style={{ 
                  borderColor: averageScore >= 80 ? '#10B981' : averageScore >= 60 ? '#EAB308' : '#EF4444',
                  borderTopColor: 'transparent',
                  transform: 'rotate(-45deg)'
                }} />
              )}
            </div>
          </div>

          {/* Pending & Performance Card */}
          <div className="bg-card border border-border rounded-xl p-6 hover:border-border/80 transition-colors flex items-center justify-between shadow-sm">
             <div className="flex flex-col justify-between h-full w-full">
                <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-6">
                  <Activity className="h-4 w-4" />
                  Performance Trend
                </div>
                <div className="flex items-end justify-between mt-auto">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <span className="text-2xl font-semibold text-foreground leading-none mt-1">{pendingCount}</span>
                  </div>
                  
                  {recentResults.length > 0 ? (
                    <div className="h-[42px] w-28 flex items-end gap-1.5 opacity-80">
                      {/* CSS Only Mini Bar Chart representing last 5 exams */}
                      {recentResults.slice(0, 5).reverse().map((res, i) => (
                        <div key={i} className="w-full bg-primary/20 rounded-t-sm relative group overflow-hidden" style={{ height: `${Math.max(10, res.score)}%` }}>
                            <div className="absolute top-0 left-0 w-full h-1 bg-primary rounded-t-sm" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground pb-1">No data yet</div>
                  )}
                </div>
             </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (Join + Enrolled) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Primary CTA: Join Exam */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.03] p-8 shadow-sm">
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div>
                   <h2 className="text-xl font-semibold text-foreground mb-1">Enroll in an Assessment</h2>
                   <p className="text-sm text-muted-foreground">Enter the 6-digit access code provided by your instructor.</p>
                 </div>
                 
                 <form onSubmit={handleJoinExam} className="flex items-center gap-2 w-full md:w-auto">
                    <input 
                      type="text" 
                      placeholder="Code" 
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="w-full md:w-32 rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono tracking-widest transition-colors uppercase"
                      maxLength={6}
                    />
                    <button 
                      type="submit" 
                      disabled={isJoining || joinCode.length < 6} 
                      className="rounded-lg bg-foreground text-background px-6 py-3 text-sm font-medium shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {isJoining ? 'Joining...' : 'Enroll'} <ArrowRight className="h-4 w-4" />
                    </button>
                 </form>
               </div>
               {joinError && <p className="text-red-500 text-sm mt-4 font-medium">{joinError}</p>}
            </div>

            {/* Enrolled Exams List */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-foreground">Pending Assessments</h3>
              </div>
              
              <div className="space-y-3">
                {enrolledExams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-border bg-card/50 text-center">
                     <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-3" />
                     <p className="text-sm font-medium text-foreground">No pending assessments</p>
                     <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">You are all caught up. Enter a code above to enroll in a new assessment.</p>
                  </div>
                ) : (
                  enrolledExams.map((exam) => (
                    <div key={exam._id} className="group relative rounded-xl border border-border bg-card p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                        
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-foreground text-[15px]">{exam.title}</h4>
                            <span className="rounded-md bg-secondary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-secondary border border-secondary/20">
                              {exam.subject}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {exam.duration}m limit</span>
                            <span className="flex items-center gap-1.5"><Code2 className="h-3.5 w-3.5" /> {exam.questions?.length || 0} tasks</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => router.push(`/exam/${exam._id}`)} 
                          className="w-full md:w-auto rounded-lg bg-primary/[0.08] text-primary hover:bg-primary hover:text-primary-foreground px-5 py-2.5 text-sm font-medium transition-colors border border-primary/20 hover:border-transparent flex items-center justify-center gap-2"
                        >
                          Start Session
                        </button>
                        
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
          </div>

          {/* Right Column (Recent Results) */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-5">Past Results</h3>
            
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm">
               {recentResults.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                   <Check className="h-6 w-6 text-muted-foreground/40 mb-3" />
                   <p className="text-sm font-medium text-foreground">No completed exams</p>
                   <p className="text-xs text-muted-foreground mt-1">Your past results will securely appear here.</p>
                 </div>
               ) : (
                 recentResults.map((result, idx) => (
                   <div 
                     key={idx} 
                     onClick={() => router.push(`/exam/${result.examId}/results`)}
                     className="p-4 hover:bg-muted/50 cursor-pointer transition-colors group flex items-center justify-between"
                   >
                     <div className="flex-1 pr-4">
                       <h4 className="font-medium text-[14px] text-foreground group-hover:text-primary transition-colors line-clamp-1">{result.title}</h4>
                       <p className="text-xs text-muted-foreground mt-1">Completed successfully</p>
                     </div>
                     
                     {/* Circular Score Visualizer */}
                     <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-background border border-border shadow-sm">
                       {/* SVG Progress Ring */}
                       <svg className="absolute inset-0 h-full w-full -rotate-90">
                          <circle className="text-border" strokeWidth="2.5" stroke="currentColor" fill="transparent" r="16" cx="20" cy="20" />
                          <circle 
                            className={result.score >= 80 ? "text-emerald-500" : result.score >= 60 ? "text-yellow-500" : "text-red-500"} 
                            strokeWidth="2.5" 
                            strokeDasharray={100} 
                            strokeDashoffset={100 - result.score}
                            strokeLinecap="round" 
                            stroke="currentColor" 
                            fill="transparent" 
                            r="16" cx="20" cy="20" 
                            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                          />
                       </svg>
                       <span className="relative text-[10px] font-bold text-foreground">{result.score}</span>
                     </div>
                   </div>
                 ))
               )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
