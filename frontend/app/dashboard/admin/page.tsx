'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ServerIcon, Activity, Trash2, Home, LogOut, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

function useAnimatedCounter(end: number | string, duration = 1000) {
  const [count, setCount] = useState(0);
  const endNum = typeof end === 'string' ? parseInt(end.replace(/[^0-9]/g, '')) || 0 : end;
  const suffix = typeof end === 'string' ? end.replace(/[0-9]/g, '') : '';

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = time - startTime;
      const percent = Math.min(progress / duration, 1);
      const ease = 1 - Math.pow(1 - percent, 4);
      setCount(Math.floor(endNum * ease));
      if (percent < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [endNum, duration]);

  return endNum === 0 ? end : `${count}${suffix}`;
}

const StatCard = ({ stat, i }: { stat: any, i: number }) => {
  const displayValue = useAnimatedCounter(stat.value, 1500);
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1, type: "spring" as any, stiffness: 100 }}
      className="glass-panel rounded-xl border border-border p-6 relative overflow-hidden group hover:border-primary/30 transition-colors bg-card shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
        <div className={`p-2 rounded-lg bg-background ${stat.color} border border-border shadow-sm group-hover:scale-110 transition-transform`}>
           <stat.icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-3xl font-bold text-foreground tracking-tight">{displayValue || '0'}</div>
    </motion.div>
  );
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ totalUsers: 0, totalExams: 0, activeSessions: 0, totalFlags: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
     try {
        const token = localStorage.getItem('token');
        if (!token) return router.push('/login');

        const [stRes, usRes, exRes] = await Promise.all([
           fetch('http://localhost:5000/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
           fetch('http://localhost:5000/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
           fetch('http://localhost:5000/api/admin/exams', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (stRes.ok) setStats(await stRes.json());
        if (usRes.ok) setUsers(await usRes.json());
        if (exRes.ok) setExams(await exRes.json());
        else if (stRes.status === 403) router.push('/dashboard/student'); // Not an admin
     } catch (err: any) {
        setError(err.message);
     } finally {
        setLoading(false);
     }
  };

  useEffect(() => {
    fetchAdminData();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleRoleChange = async (userId: string, newRole: string, currentSubject?: string) => {
     try {
       const token = localStorage.getItem('token');
       const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/role`, {
         method: 'PUT',
         headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({ role: newRole, subjectSpecialty: currentSubject })
       });
       if (res.ok) {
          setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
       }
     } catch (err) {
       console.error("Failed to change role", err);
     }
  };

  const handleSubjectChange = async (userId: string, newSubject: string, currentRole: string) => {
     try {
       const token = localStorage.getItem('token');
       const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/role`, {
         method: 'PUT',
         headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({ role: currentRole, subjectSpecialty: newSubject })
       });
       if (res.ok) {
          setUsers(users.map(u => u._id === userId ? { ...u, subjectSpecialty: newSubject } : u));
       }
     } catch (err) {
       console.error("Failed to change subject", err);
     }
  };

  const handleDeleteUser = async (userId: string) => {
     if (!confirm("Are you sure you want to completely delete this user?")) return;
     try {
       const token = localStorage.getItem('token');
       const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
         method: 'DELETE',
         headers: { 'Authorization': `Bearer ${token}` }
       });
       if (res.ok) {
          setUsers(users.filter(u => u._id !== userId));
          setStats(prev => ({...prev, totalUsers: prev.totalUsers - 1}));
       }
     } catch (err) {
       console.error("Failed to delete user", err);
     }
  };

  const handleDeleteExam = async (examId: string) => {
     if (!confirm("Are you sure you want to completely delete this exam and all its records?")) return;
     try {
       const token = localStorage.getItem('token');
       const res = await fetch(`http://localhost:5000/api/admin/exams/${examId}`, {
         method: 'DELETE',
         headers: { 'Authorization': `Bearer ${token}` }
       });
       if (res.ok) {
          setExams(exams.filter(e => e._id !== examId));
          setStats(prev => ({...prev, totalExams: prev.totalExams - 1}));
       }
     } catch (err) {
       console.error("Failed to delete exam", err);
     }
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring" as any, stiffness: 100 } } };

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <header className="mb-10 flex border-b border-border pb-6 items-start justify-between flex-wrap gap-4">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20 shadow-sm">
               <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Platform Administration</h1>
              <p className="text-muted-foreground mt-1 text-sm">System oversight and user management</p>
            </div>
          </motion.div>
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex gap-4">
             <button onClick={() => router.push('/')} className="rounded-md border border-border text-muted-foreground bg-card shadow-sm px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground flex items-center gap-2">
                 <Home className="h-4 w-4" /> Home
             </button>
             <button onClick={handleLogout} className="rounded-md border border-border text-muted-foreground bg-card shadow-sm px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground flex items-center gap-2">
                 <LogOut className="h-4 w-4" /> Logout
             </button>
          </motion.div>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {[
            { label: 'Total Platform Users', value: stats.totalUsers, icon: Users, color: 'text-primary' },
            { label: 'Total Exams Created', value: stats.totalExams, icon: ServerIcon, color: 'text-green-500' },
            { label: 'Active Edge Sessions', value: stats.activeSessions, icon: Activity, color: 'text-secondary' },
            { label: 'Platform Flags Raised', value: stats.totalFlags, icon: ShieldAlert, color: 'text-destructive' },
          ].map((stat, i) => (
            <StatCard key={i} stat={stat} i={i} />
          ))}
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="glass-panel border border-border rounded-xl p-6 bg-card/50 shadow-sm">
           <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> User Directory</h2>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-muted-foreground">
               <thead className="bg-muted/50 text-xs uppercase bg-foreground/5 text-foreground/70">
                 <tr>
                   <th className="px-5 py-3 rounded-tl-md">User Name</th>
                   <th className="px-5 py-3">Email Address</th>
                   <th className="px-5 py-3">Role</th>
                   <th className="px-5 py-3">Subject</th>
                   <th className="px-5 py-3">Joined Date</th>
                   <th className="px-5 py-3 text-right rounded-tr-md">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {users.map((u) => (
                   <motion.tr variants={itemVariants} key={u._id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                     <td className="px-5 py-4 font-medium text-foreground">{u.name}</td>
                     <td className="px-5 py-4">{u.email}</td>
                     <td className="px-5 py-4">
                        <select 
                          value={u.role} 
                          onChange={(e) => handleRoleChange(u._id, e.target.value, u.subjectSpecialty)}
                          className="bg-background border border-border rounded text-xs px-2 py-1 text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                        </select>
                     </td>
                     <td className="px-5 py-4">
                        {u.role !== 'student' ? (
                          <select 
                            value={u.subjectSpecialty || ''} 
                            onChange={(e) => handleSubjectChange(u._id, e.target.value, u.role)}
                            className="bg-background border border-border rounded text-xs px-2 py-1 text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                          >
                            <option value="">None</option>
                            <option value="Python">Python</option>
                            <option value="SQL">SQL</option>
                            <option value="JavaScript">JavaScript</option>
                            <option value="All">All</option>
                          </select>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">N/A</span>
                        )}
                     </td>
                     <td className="px-5 py-4 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                     <td className="px-5 py-4 text-right">
                        <button 
                           onClick={() => handleDeleteUser(u._id)}
                           className="text-destructive hover:bg-destructive/10 p-2 rounded transition-colors inline-block"
                           title="Delete User"
                        >
                           <Trash2 className="h-4 w-4" />
                        </button>
                     </td>
                   </motion.tr>
                 ))}
                 {users.length === 0 && !loading && (
                   <tr><td colSpan={5} className="text-center py-8">No users found.</td></tr>
                 )}
                 {loading && (
                   <tr><td colSpan={5} className="text-center py-8">Loading users...</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="glass-panel border border-border rounded-xl p-6 bg-card/50 shadow-sm mt-8 mb-16">
           <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2"><ServerIcon className="h-5 w-5 text-primary" /> Exam Directory</h2>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-muted-foreground">
               <thead className="bg-muted/50 text-xs uppercase bg-foreground/5 text-foreground/70">
                 <tr>
                   <th className="px-5 py-3 rounded-tl-md">Exam Title</th>
                   <th className="px-5 py-3">Status</th>
                   <th className="px-5 py-3">Start Time</th>
                   <th className="px-5 py-3">End Time</th>
                   <th className="px-5 py-3 text-right rounded-tr-md">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {exams.map((ex) => {
                   const now = new Date();
                   const hasEnded = now > new Date(ex.endTime);
                   const statusText = hasEnded ? 'Ended' : now < new Date(ex.startTime) ? 'Upcoming' : 'Active';
                   
                   return (
                   <motion.tr variants={itemVariants} key={ex._id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                     <td className="px-5 py-4 font-medium text-foreground">{ex.title}</td>
                     <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs border ${
                          hasEnded ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                          statusText === 'Upcoming' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                          'bg-green-500/10 text-green-500 border-green-500/20'
                        }`}>
                          {statusText}
                        </span>
                     </td>
                     <td className="px-5 py-4 whitespace-nowrap">{new Date(ex.startTime).toLocaleString()}</td>
                     <td className="px-5 py-4 whitespace-nowrap">{new Date(ex.endTime).toLocaleString()}</td>
                     <td className="px-5 py-4 text-right">
                        {hasEnded && (
                          <button 
                             onClick={() => handleDeleteExam(ex._id)}
                             className="text-destructive hover:bg-destructive/10 p-2 rounded transition-colors inline-block"
                             title="Delete Ended Exam"
                          >
                             <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                     </td>
                   </motion.tr>
                 )})}
                 {exams.length === 0 && !loading && (
                   <tr><td colSpan={5} className="text-center py-8">No exams found.</td></tr>
                 )}
                 {loading && (
                   <tr><td colSpan={5} className="text-center py-8">Loading exams...</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </motion.div>
      </div>
    </div>
  );
}
