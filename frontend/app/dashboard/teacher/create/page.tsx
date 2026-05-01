'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusSquare } from 'lucide-react';

export default function CreateExamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    subject: 'Python',
    startTime: '',
    endTime: '',
    duration: 60,
    warningLimit: 3
  });
  
  const [userSubject, setUserSubject] = useState('');
  
  useEffect(() => {
     try {
       const u = JSON.parse(localStorage.getItem('user') || '{}');
       setUserSubject(u.subjectSpecialty || 'All');
     } catch(e) {}
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not logged in. Please log in as a teacher.');
      }

      const res = await fetch('http://localhost:5000/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create exam');
      }

      // Success, redirect back to dashboard
      router.push('/dashboard/teacher');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex justify-center items-start font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl glass-panel relative overflow-hidden rounded-xl border border-white/10 bg-[#111827]/90 p-8 shadow-2xl mt-12 z-10">
        
        <header className="mb-8 border-b border-white/10 pb-6 flex items-center gap-4">
           <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
             <PlusSquare className="h-6 w-6 text-primary" />
           </div>
           <div>
             <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Create New Exam</h1>
             <p className="text-muted-foreground mt-1 text-sm">Configure your proctored exam parameters</p>
           </div>
        </header>

        {error && (
          <div className="mb-6 rounded-md bg-destructive/10 p-4 text-sm font-medium text-destructive border border-destructive/20 flex items-center gap-2">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Exam Title
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Data Structures Midterm"
                className="w-full rounded-md border border-white/10 bg-[#1F2937] px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Subject
              </label>
              {userSubject === 'All' ? (
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full rounded-md border border-white/10 bg-[#1F2937] px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                >
                  <option value="SQL">SQL</option>
                  <option value="Python">Python</option>
                  <option value="JavaScript">JavaScript</option>
                </select>
              ) : (
                <div className="w-full rounded-md border border-white/10 bg-[#1F2937]/50 px-4 py-3 text-sm text-white/50 cursor-not-allowed">
                   {userSubject || 'Unassigned'}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Start Time
              </label>
              <input
                type="datetime-local"
                name="startTime"
                required
                value={formData.startTime}
                onChange={handleChange}
                className="w-full rounded-md border border-white/10 bg-[#1F2937] px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                End Time
              </label>
              <input
                type="datetime-local"
                name="endTime"
                required
                value={formData.endTime}
                onChange={handleChange}
                className="w-full rounded-md border border-white/10 bg-[#1F2937] px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Duration (Minutes)
              </label>
              <input
                type="number"
                name="duration"
                min="1"
                required
                value={formData.duration}
                onChange={handleChange}
                className="w-full rounded-md border border-white/10 bg-[#1F2937] px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                Violation Limit
              </label>
              <input
                type="number"
                name="warningLimit"
                min="1"
                required
                value={formData.warningLimit}
                onChange={handleChange}
                className="w-full rounded-md border border-white/10 bg-[#1F2937] px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <div className="pt-6 flex gap-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => router.push('/dashboard/teacher')}
              className="flex-1 rounded-md border border-white/10 bg-transparent px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="neon-btn flex-1 rounded-md px-4 py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
