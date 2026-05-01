'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, AlertTriangle, Clock, TerminalSquare, ShieldAlert } from 'lucide-react';

export default function ExamResultsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
           router.push('/login');
           return;
        }

        const res = await fetch(`http://localhost:5000/api/exams/${examId}/my-results`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
           throw new Error('Could not fetch results');
        }

        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [examId, router]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center p-8 text-primary animate-pulse text-sm">Loading results...</div>;
  if (error) return <div className="min-h-screen bg-background flex items-center justify-center p-8 text-destructive text-sm">{error}</div>;
  if (!data) return <div className="min-h-screen bg-background flex items-center justify-center p-8 text-muted-foreground text-sm">No results found.</div>;

  const { session, submissions, exam } = data;
  const isTerminated = session.status === 'terminated';

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isTerminated ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]'} border`}>
               {isTerminated ? <ShieldAlert className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">{exam?.title || 'Exam'} Submitted</h1>
              <p className="text-muted-foreground mt-1 text-sm">Under Review by Instructor</p>
            </div>
          </div>
          <button 
            onClick={() => router.push('/dashboard/student')}
            className="rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
          >
            Back to Dashboard
          </button>
        </header>

        {isTerminated && (
          <div className="mb-8 bg-destructive/10 border border-destructive/20 text-destructive p-5 rounded-xl flex items-start gap-3">
             <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
             <div>
                <h3 className="font-semibold mb-1">Exam Terminated Early</h3>
                <p className="text-sm opacity-90">Your session was forcefully terminated because you reached the maximum allowed proctoring violations ({exam?.warningLimit || 3}). Your current score has been recorded.</p>
             </div>
          </div>
        )}

        <div className="glass-panel rounded-xl border border-primary/20 bg-primary/5 p-6 text-center mb-12 flex flex-col items-center justify-center">
           <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
             <CheckCircle2 className="h-6 w-6 text-primary" />
           </div>
           <h3 className="text-xl font-semibold text-white mb-2">Submission Received</h3>
           <p className="text-muted-foreground max-w-lg mx-auto">
             Your responses have been submitted successfully. The final result will be evaluated and shared on your dashboard by your teacher.
           </p>
           {session.warnings > 0 && (
             <p className="mt-4 text-xs font-medium text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
               Note: {session.warnings} Proctoring warning(s) were recorded during this session.
             </p>
           )}
        </div>

        <h2 className="text-xl font-semibold mb-6 text-white">Your Responses</h2>
        <div className="space-y-6">
           {submissions.map((sub: any, idx: number) => (
             <div key={idx} className="glass-panel rounded-xl border border-white/10 bg-[#111827]/80 p-6 flex flex-col gap-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-white">
                     {sub.questionId?.title || 'Unknown Question'}
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-[#1E1E1E] border border-white/5 rounded-md overflow-hidden">
                     <div className="bg-[#252526] px-3 py-1.5 text-xs text-muted-foreground border-b border-white/5 font-medium flex items-center gap-2">
                         <TerminalSquare className="w-3 h-3" /> Submitted Code ({sub.language})
                     </div>
                     <pre className="p-3 text-[13px] font-mono text-[#CCCCCC] overflow-x-auto custom-scrollbar h-32">{sub.code}</pre>
                   </div>

                   <div className="bg-[#1E1E1E] border border-white/5 rounded-md overflow-hidden flex flex-col">
                     <div className="bg-[#252526] px-3 py-1.5 text-xs text-muted-foreground border-b border-white/5 font-medium">
                         Execution Output
                     </div>
                     <pre className="p-3 text-[13px] font-mono overflow-x-auto text-[#10B981] flex-1 custom-scrollbar min-h-[5rem] whitespace-pre-wrap">{sub.output || 'No output'}</pre>
                   </div>
                </div>
             </div>
           ))}

           {submissions.length === 0 && (
              <div className="text-center p-12 border border-white/5 bg-[#111827]/50 border-dashed rounded-md text-sm text-muted-foreground">
                 You made no submissions during this exam.
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
