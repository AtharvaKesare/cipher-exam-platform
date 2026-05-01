'use client';

import Link from 'next/link';
import { motion, useMotionTemplate, useMotionValue, useScroll, useTransform, useSpring, animate, useInView } from 'framer-motion';
import { 
  ArrowRight, 
  TerminalSquare, 
  CheckCircle2, 
  Eye, 
  Lock, 
  Activity,
  LogOut,
  User,
  LayoutDashboard,
  ChevronDown,
  Code2,
  ShieldCheck,
  Terminal,
  Server,
  Zap,
  Hexagon,
  Cpu
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { BrandLogo } from '@/components/brand-logo';

// Import professional backgrounds
import { ProfessionalBackground, HeroBackground as ProHeroBg } from '@/components/professional-background';

const HeroBackground = () => {
    return <ProHeroBg />;
}

const ParallaxTechIcons = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  useEffect(() => {
      let rafId: number;
      const handleMouseMove = (e: MouseEvent) => {
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
              const { innerWidth, innerHeight } = window;
              mouseX.set((e.clientX / innerWidth - 0.5));
              mouseY.set((e.clientY / innerHeight - 0.5));
          });
      };
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      return () => {
          window.removeEventListener("mousemove", handleMouseMove);
          cancelAnimationFrame(rafId);
      };
  }, [mouseX, mouseY]);

  // Looser springs = smoother, less CPU
  const smoothX = useSpring(mouseX, { stiffness: 25, damping: 30 });
  const smoothY = useSpring(mouseY, { stiffness: 25, damping: 30 });

  // Reduced displacement ranges — subtle, not jarring
  const x1 = useTransform(smoothX, [-0.5, 0.5], [20, -20]);
  const y1 = useTransform(smoothY, [-0.5, 0.5], [20, -20]);
  
  const x2 = useTransform(smoothX, [-0.5, 0.5], [-25, 25]);
  const y2 = useTransform(smoothY, [-0.5, 0.5], [-25, 25]);
  
  const x3 = useTransform(smoothX, [-0.5, 0.5], [30, -30]);
  const y3 = useTransform(smoothY, [-0.5, 0.5], [30, -30]);
  
  const x4 = useTransform(smoothX, [-0.5, 0.5], [-20, 20]);
  const y4 = useTransform(smoothY, [-0.5, 0.5], [-20, 20]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div 
         style={{ x: x1, y: y1, willChange: 'transform' }}
         className="absolute top-[15%] left-[5%] text-primary/[0.08] dark:text-primary/[0.05] transform-gpu"
      >
        <Code2 size={200} strokeWidth={1} />
      </motion.div>
      
      <motion.div 
         style={{ x: x2, y: y2, willChange: 'transform' }}
         className="absolute top-[35%] right-[5%] text-secondary/[0.08] dark:text-secondary/[0.05] transform-gpu"
      >
        <Server size={240} strokeWidth={1} />
      </motion.div>
      
      <motion.div 
         style={{ x: x3, y: y3, willChange: 'transform' }}
         className="absolute top-[60%] left-[8%] text-emerald-500/[0.08] dark:text-emerald-500/[0.05] transform-gpu"
      >
         <ShieldCheck size={160} strokeWidth={1} />
      </motion.div>
      
      <motion.div 
         style={{ x: x4, y: y4, willChange: 'transform' }}
         className="absolute bottom-[2%] right-[10%] text-primary/[0.08] dark:text-primary/[0.05] transform-gpu"
      >
         <Terminal size={180} strokeWidth={1} />
      </motion.div>
    </div>
  );
};

const SpotlightCard = ({ children, className }: any) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function onMouseMove({ currentTarget, clientX, clientY }: any) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-border/80 bg-card/80 shadow-md dark:shadow-none backdrop-blur-md transition-transform duration-500 hover:-translate-y-2 hover:shadow-2xl ${className}`}
      onMouseMove={onMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-500 group-hover:opacity-100 z-0"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(59, 130, 246, 0.12),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative z-10 w-full h-full p-8 md:p-10">
         {children}
      </div>
    </div>
  );
};

const MockupTiltWrapper = ({ children }: any) => {
    return (
        <motion.div
            className="w-full max-w-6xl mx-auto relative z-10 mt-16 md:mt-24 lg:mt-32"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: "easeOut" }}
        >
            {/* CSS-only float animation — no JS tick required */}
            <div className="relative w-full max-w-4xl mx-auto rounded-xl border border-zinc-300 dark:border-zinc-800 shadow-2xl dark:shadow-[0_0_50px_rgba(6,182,212,0.15)] bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl overflow-hidden transform-gpu animate-gentle-float">
                {children}
            </div>
        </motion.div>
    )
}

const RevealText = ({ text, delay = 0, className }: any) => {
    const words = text.split(" ");
    return (
        <motion.span initial="hidden" animate="visible" className={className} variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: delay } }
        }}>
            {words.map((word: string, i: number) => (
                <span key={i} className="inline-block overflow-hidden py-1 pr-3">
                    <motion.span className="inline-block" variants={{
                        hidden: { y: "110%", opacity: 0, rotate: 6 },
                        visible: { y: "0%", opacity: 1, rotate: 0, transition: { type: "spring", damping: 18, stiffness: 100 } }
                    }}>
                        {word}
                    </motion.span>
                </span>
            ))}
        </motion.span>
    )
}

const AnimatedCounter = ({ from = 0, to, duration = 2, decimals = 0, prefix = "", suffix = "" }: any) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" }); 
  const count = useMotionValue(from);
  const displayValue = useTransform(count, (latest) => `${prefix}${latest.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    if (isInView) {
      animate(count, to, { duration: duration, ease: "easeOut" });
    }
  }, [isInView, count, to, duration]);

  return <motion.span ref={ref}>{displayValue}</motion.span>;
};

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const usr = localStorage.getItem('user');
    if (usr) {
      try {
        setUser(JSON.parse(usr));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsProfileOpen(false);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background selection:bg-primary/30">
      
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl transition-all">
        <div className="container mx-auto flex h-24 items-center justify-between px-6 lg:px-12">
          <Link href="/" className="z-10 origin-left scale-[0.8] md:scale-100 transition-transform">
             <BrandLogo />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 z-10">
            <Link href="#features" className="text-sm font-medium text-muted-foreground transition-all hover:text-foreground">Features</Link>
            <Link href="#security" className="text-sm font-medium text-muted-foreground transition-all hover:text-foreground">Security</Link>
          </nav>

          <div className="flex items-center gap-4 z-10">
            <ThemeToggle />
            {user ? (
               <div className="relative">
                 <button 
                   onClick={() => setIsProfileOpen(!isProfileOpen)}
                   className="flex items-center gap-2 rounded-full border border-border bg-card pl-2 pr-3 py-1.5 text-sm font-medium hover:bg-muted transition-all shadow-sm"
                 >
                   <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
                     <User className="h-4 w-4" />
                   </div>
                   <span className="max-w-[120px] truncate">{user.name || 'User Profile'}</span>
                   <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                 </button>
                 
                 {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden transform transition-all">
                      <div className="px-4 py-3 border-b border-border/50 bg-muted/40">
                         <p className="text-sm font-medium text-foreground truncate">{user.name || 'User Profile'}</p>
                         <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                         <div className="mt-2 flex items-center">
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider border border-primary/20">
                              {user.role}
                            </span>
                         </div>
                      </div>
                      <div className="p-1.5">
                         <button 
                           onClick={() => {
                              setIsProfileOpen(false);
                              router.push(user.role === 'admin' ? '/dashboard/admin' : user.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student');
                           }}
                           className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                         >
                           <LayoutDashboard className="h-4 w-4" />
                           Dashboard
                         </button>
                         <button 
                           onClick={handleLogout}
                           className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors mt-1"
                         >
                           <LogOut className="h-4 w-4" />
                           Sign Out
                         </button>
                      </div>
                    </div>
                 )}
               </div>
            ) : (
                <>
                  <Link href="/register" className="relative group inline-flex h-9 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] hover:scale-[1.02]">
                    <span className="relative z-10 flex items-center gap-1.5">Get Started</span>
                  </Link>
                </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">
        
        {/* ULTRA ADVANCED HERO SECTION */}
        <section className="relative w-full flex flex-col items-center justify-center px-6 pt-24 md:pt-36 pb-24 md:pb-40 overflow-hidden">
          <HeroBackground />
          <ParallaxTechIcons />

          <div className="container relative z-10 mx-auto text-center flex flex-col items-center">
            
            <motion.div initial={{ scale: 0.8, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2 mb-10 text-sm text-primary shadow-[0_0_20px_rgba(59,130,246,0.15)] backdrop-blur-xl">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
                <span className="font-bold tracking-wide uppercase text-[11px]">v2.0 Secure Release</span>
              </div>
            </motion.div>

            <h1 className="max-w-6xl text-6xl sm:text-7xl md:text-8xl lg:text-[6.5rem] font-black tracking-tighter text-foreground font-sans leading-[1.05] flex flex-col items-center">
               <RevealText text="Secure coding exams" delay={0.1} className="block w-full" />
               <span className="relative inline-block pb-2">
                 <RevealText text="powered by AI." delay={0.4} className="bg-gradient-to-br from-cyan-400 via-blue-500 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm" />
                 <motion.div 
                   className="absolute bottom-1 left-4 right-4 h-3 bg-gradient-to-r from-primary to-secondary rounded-full blur-[4px] mix-blend-multiply dark:mix-blend-screen"
                   initial={{ width: 0, opacity: 0 }}
                   animate={{ width: '80%', opacity: 1 }}
                   transition={{ delay: 1.2, duration: 1.5, ease: "circOut" }}
                 />
                 <motion.div 
                   className="absolute bottom-1 left-4 right-4 h-2 bg-gradient-to-r from-primary to-secondary rounded-full"
                   initial={{ width: 0 }}
                   animate={{ width: '80%' }}
                   transition={{ delay: 1.2, duration: 1.5, ease: "circOut" }}
                 />
               </span>
            </h1>

            <motion.p 
              initial={{ y: 30, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              transition={{ delay: 1, duration: 0.8 }}
              className="mt-12 max-w-2xl text-xl sm:text-2xl text-muted-foreground/80 leading-relaxed font-sans font-medium"
            >
              Eliminate cheating without invading privacy. 
              Cipher fuses local face tracking and isolated Docker execution into one seamless interface.
            </motion.p>
            
            <motion.div 
              initial={{ y: 30, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              transition={{ delay: 1.2, duration: 0.8 }}
              className="mt-14 flex flex-col gap-5 sm:flex-row justify-center w-full max-w-md mx-auto sm:max-w-none"
            >
                <Link href="/register" className="relative group inline-flex h-14 w-full sm:w-auto items-center justify-center rounded-xl bg-cyan-600 px-10 text-lg font-bold text-white transition-all hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)]">
                  Start Exam Setup <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-2" />
                </Link>
                <Link href="/login" className="inline-flex h-14 w-full sm:w-auto items-center justify-center rounded-xl border border-border/80 bg-background/50 backdrop-blur-md px-10 text-lg font-semibold text-foreground transition-all hover:bg-muted hover:border-foreground/30 hover:scale-[1.03]">
                  Login as Teacher
                </Link>
            </motion.div>
          </div>

          <MockupTiltWrapper>
             {/* Outward glow effect */}
             <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/40 via-purple-500/30 to-secondary/40 blur-3xl opacity-50 dark:opacity-60 mix-blend-multiply dark:mix-blend-screen"></div>
             
             {/* The glass panel */}
             <div className="relative rounded-[2rem] border border-border/60 bg-background/80 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col z-10 w-full transform-gpu ring-1 ring-white/10">
                {/* Header Bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-gradient-to-r from-muted/60 to-muted/30">
                  <div className="flex space-x-2.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#FF5F56] border border-[#E0443E]/50 shadow-sm"></div>
                    <div className="w-3.5 h-3.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]/50 shadow-sm"></div>
                    <div className="w-3.5 h-3.5 rounded-full bg-[#27C93F] border border-[#1AAB29]/50 shadow-sm"></div>
                  </div>
                  <div className="flex-1 flex justify-center">
                      <div className="flex items-center gap-2 px-6 py-1.5 bg-background/80 rounded-full text-[13px] font-mono text-muted-foreground border border-border/50 shadow-inner">
                        <Lock className="w-3.5 h-3.5 text-emerald-500" /> secure.proctorflow.com
                      </div>
                  </div>
                  <div className="w-20"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 min-h-[550px]">
                  {/* Left Sidebar - Proctoring Panel */}
                  <div className="hidden md:flex col-span-1 border-r border-border/50 p-6 bg-card/20 flex-col gap-8 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 opacity-10">
                         <Activity size={120} />
                     </div>
                     
                     <div className="flex items-center gap-2 text-[13px] font-black text-foreground/80 uppercase tracking-[0.2em] relative z-10">
                         <Eye className="w-5 h-5 text-primary" /> Tracking
                     </div>

                     <div className="h-40 rounded-2xl bg-background/50 border border-border/80 shadow-inner relative overflow-hidden flex items-center justify-center group backdrop-blur-sm">
                        <UserIcon className="w-14 h-14 text-muted-foreground/30 transition-transform duration-700 group-hover:scale-110" />
                        
                        <motion.div 
                            className="absolute inset-0 border-[3px] border-primary/20 rounded-2xl"
                            animate={{ borderColor: ['rgba(59,130,246,0.1)', 'rgba(59,130,246,0.6)', 'rgba(59,130,246,0.1)'] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <motion.div 
                            className="absolute top-0 left-0 right-0 h-1.5 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.9)]"
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ duration: 3.5, ease: 'linear', repeat: Infinity }}
                        />

                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-background/95 px-2.5 py-1.5 rounded-lg text-[10px] uppercase font-bold text-emerald-500 font-mono border border-emerald-500/20 shadow-md">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Checked
                        </div>
                     </div>
                     <div className="space-y-6 flex-1 relative z-10">
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <span>Network</span>
                                <span className="text-emerald-500 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Encrypted</span>
                            </div>
                            <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-emerald-500 w-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <span>Focus Index</span>
                                <span className="text-foreground font-black">98.5%</span>
                            </div>
                            <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden shadow-inner">
                                <motion.div 
                                    className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                                    initial={{ width: '0%' }}
                                    whileInView={{ width: '98.5%' }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 2, delay: 1 }}
                                ></motion.div>
                            </div>
                        </div>
                     </div>
                  </div>

                  {/* Main Editor & Output Terminal */}
                  <div className="col-span-1 md:col-span-3 flex flex-col font-mono text-[15px] bg-background/30 relative">
                     {/* Background Watermark Symbol */}
                     <div className="absolute top-[20%] right-[5%] opacity-[0.02] pointer-events-none rotate-12 mix-blend-overlay">
                         <Code2 size={300} />
                     </div>

                     <div className="flex-1 p-8 text-foreground/80 overflow-hidden relative z-10 flex flex-col">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/30">
                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                                <TerminalSquare className="w-4 h-4 text-secondary" /> Workspace.ts
                            </div>
                            <div className="flex gap-2">
                                <div className="px-3 py-1 bg-muted/40 rounded-md text-[11px] font-bold text-muted-foreground border border-border/50 uppercase tracking-widest shadow-sm">TypeScript</div>
                            </div>
                        </div>

                        <div className="space-y-2.5 opacity-95 text-[16px] leading-relaxed flex-1 pt-2 overflow-hidden font-medium">
                            <motion.div initial={{ width: 0 }} whileInView={{ width: '100%' }} viewport={{ once: true }} transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }} className="overflow-hidden whitespace-nowrap">
                                <span className="text-purple-600 dark:text-[#c678dd]">import</span> {"{"} ExecutionContext {"}"} <span className="text-purple-600 dark:text-[#c678dd]">from</span> <span className="text-emerald-600 dark:text-[#98c379]">'@proctorflow/core'</span>;
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.2 }} className="pt-3">
                                <span className="text-blue-600 dark:text-[#61afef]">export async function</span> <span className="text-amber-600 dark:text-[#e5c07b]">executeSubmission</span>(code: <span className="text-cyan-600 dark:text-[#56b6c2]">string</span>) {"{"}
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.7 }} className="pl-10">
                                <span className="text-slate-500 dark:text-[#7f848e] italic">// Secure execution in hardware-virtualised container</span>
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 2.3 }} className="pl-10 mt-2">
                                <span className="text-rose-600 dark:text-[#e06c75]">const</span> engine = <span className="text-cyan-600 dark:text-[#56b6c2]">new</span> <span className="text-amber-600 dark:text-[#e5c07b]">ExecutionContext</span>();
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 2.8 }} className="pl-10 mt-2">
                                <span className="text-rose-600 dark:text-[#e06c75]">const</span> metrics = <span className="text-purple-600 dark:text-[#c678dd]">await</span> engine.<span className="text-blue-600 dark:text-[#61afef]">analyze</span>({`{`}
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 3.2 }} className="pl-20">
                                <span className="text-rose-600 dark:text-[#e06c75]">payload</span>: code,
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 3.4 }} className="pl-20">
                                <span className="text-rose-600 dark:text-[#e06c75]">isolation</span>: <span className="text-cyan-600 dark:text-[#56b6c2]">true</span>,
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 3.6 }} className="pl-20">
                                <span className="text-rose-600 dark:text-[#e06c75]">timeout</span>: <span className="text-orange-600 dark:text-[#d19a66]">5000</span>
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 3.8 }} className="pl-10">
                                {`});`}
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 4.2 }} className="pl-10 mt-2">
                                <span className="text-purple-600 dark:text-[#c678dd]">return</span> metrics;
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 4.4 }}>
                                {"}"}
                            </motion.div>
                        </div>
                     </div>
                     
                     {/* Lower Terminal Block */}
                     <div className="h-48 border-t border-border/50 bg-[#000000] dark:bg-[#07090e] flex flex-col relative overflow-hidden group p-6">
                        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px] pointer-events-none"></div>
                        <div className="flex items-center gap-3 text-muted-foreground/50 text-[11px] font-black uppercase tracking-[0.3em] mb-4 relative z-10 font-sans">
                           <TerminalSquare className="w-4 h-4 text-emerald-500/50" /> System Log
                        </div>
                        <div className="space-y-2 text-[14px] text-gray-400/80 font-mono relative z-10 leading-relaxed font-medium">
                          <motion.p initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 4.8 }} className="text-blue-400">→ Booting hypervisor sandbox...</motion.p>
                          <motion.p initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 5.3 }}>→ Allocating secure memory region <span className="text-green-500 font-black">[0x4B3A..]</span></motion.p>
                          <motion.p initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 5.8 }}>→ Executing test suites in parallel...</motion.p>
                          <motion.p initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 6.8 }} className="text-emerald-400 font-bold flex items-center pt-2 text-[15px]">
                              <CheckCircle2 className="w-4 h-4 mr-2" /> V_CHECK_PASS: 12/12 assertions verified.
                          </motion.p>
                          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 7.2 }} className="text-white pt-2 flex items-center gap-2">
                              <span className="text-purple-400">root@sandbox</span><span className="text-muted-foreground">~#</span> <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-2.5 h-5 inline-block bg-primary align-middle"></motion.span>
                          </motion.p>
                        </div>
                     </div>
                  </div>
                </div>
             </div>
          </MockupTiltWrapper>
        </section>

        {/* INFINITE SCROLL LOGOS SECTION — CSS-only marquee */}
        <section className="py-16 border-y border-border/30 bg-muted/10 overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10"></div>
            <div className="container mx-auto px-6 text-center relative z-20 mb-8">
                <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Deployed across global enterprises</p>
            </div>
            
            <div className="flex overflow-hidden relative w-full h-20" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
                <div className="flex w-max items-center gap-20 whitespace-nowrap opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 transform-gpu animate-marquee pr-20">
                    {/* Doubled content for seamless loop */}
                    {[...Array(2)].map((_, j) => (
                        <div key={j} className="flex gap-20 items-center">
                            <div className="flex items-center gap-3 text-3xl font-black font-sans"><TerminalSquare className="w-8 h-8 text-primary"/> CodeAcademics</div>
                            <div className="flex items-center gap-3 text-3xl font-black font-sans"><Activity className="w-8 h-8 text-secondary"/> TechAssess</div>
                            <div className="flex items-center gap-3 text-3xl font-black font-sans"><LayoutDashboard className="w-8 h-8 text-blue-500"/> UnivExam</div>
                            <div className="flex items-center gap-3 text-3xl font-black font-sans"><ShieldCheck className="w-8 h-8 text-emerald-500"/> SecurTest</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* ADVANCED SPOTLIGHT FEATURES SECTION */}
        <section id="features" className="relative container mx-auto px-6 py-40 flex flex-col items-center">
          <div className="absolute top-[20%] right-0 w-[600px] h-[600px] bg-primary/5 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[150px] pointer-events-none"></div>

          <div className="text-center mb-24 max-w-4xl relative z-10">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                <h2 className="text-5xl md:text-6xl font-black text-foreground mb-8 tracking-tighter">Uncompromised Infrastructure</h2>
                <p className="text-muted-foreground mx-auto text-2xl leading-relaxed font-medium">Built from the ground up to offer the most rugged, high-performance proctoring layer on the web.</p>
            </motion.div>
          </div>
          
          <div className="grid gap-10 md:grid-cols-3 max-w-7xl w-full relative z-10 flex-1">
            {[
              {
                title: "Browser Edge AI",
                description: "On-device biometric verification ensures absolute privacy. Face tracking runs natively utilizing internal GPU acceleration.",
                icon: Eye,
                color: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                title: "Deep Isolation",
                description: "Student code executes in heavily locked-down environments mapped to read-only kernels. Unmatched memory safety.",
                icon: Server,
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
              },
              {
                title: "Telemetry Hook",
                description: "Microsecond-latency WebSocket channels stream behavioral analytics instantly back to dashboard systems.",
                icon: Zap,
                color: "text-purple-500",
                bg: "bg-purple-500/10",
              }
            ].map((Feature, i) => (
              <motion.div 
                 key={i} 
                 initial={{ opacity: 0, y: 40 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true, margin: "-100px" }}
                 transition={{ duration: 0.6, delay: i * 0.15 }}
                 className="h-full flex flex-col"
              >
                  <SpotlightCard className="flex-1 flex flex-col items-start text-left">
                    <div className="absolute top-0 right-0 p-6 opacity-5 transition-opacity duration-500 group-hover:opacity-10">
                        <Feature.icon size={140} />
                    </div>
                    <div className={`mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${Feature.bg} ${Feature.color} transition-transform duration-500 group-hover:scale-110 shadow-inner`}>
                      <Feature.icon className="h-8 w-8" />
                    </div>
                    <h3 className="mb-4 text-3xl font-black text-foreground tracking-tight">{Feature.title}</h3>
                    <p className="text-muted-foreground/80 leading-relaxed text-[17px] font-medium">{Feature.description}</p>
                  </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* PARALLAX STATS SECTION */}
        <section id="security" className="relative py-32 md:py-40 overflow-hidden border-y border-border/40 bg-muted/20">
           {/* Background Image / Pattern */}
           <div className="absolute inset-0 bg-grid-white/[0.04] bg-[size:40px_40px] z-0"></div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] z-0"></div>
           
           <div className="container mx-auto px-6 relative z-10 max-w-7xl">
             <div className="mb-20 text-center max-w-3xl mx-auto">
                 <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tighter">The Standard in Assessment Security</h2>
             </div>

             <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
               {[
                 { val: 0.0, decimals: 1, suffix: "%", label: "External Tracking API", icon: ShieldCheck },
                 { val: 40, prefix: "<", suffix: "ms", label: "Telemetry Latency", icon: Zap },
                 { val: 100, suffix: "%", label: "Container Isolation", icon: Cpu },
                 { staticVal: "O(1)", label: "Verification Scaling", icon: Activity }
               ].map((stat: any, i) => (
                 <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="flex flex-col items-center justify-center p-10 rounded-3xl bg-background/80 dark:bg-background/50 backdrop-blur-xl border border-border/80 text-center shadow-lg dark:shadow-xl transition-all duration-500 hover:scale-105 hover:bg-card hover:shadow-[0_0_40px_rgba(6,182,212,0.15)] group"
                >
                   <stat.icon className="w-10 h-10 text-cyan-500/40 mb-6 group-hover:text-cyan-400 transition-colors" />
                   <h3 className="text-5xl lg:text-6xl font-black font-sans text-foreground mb-3 tracking-tighter">
                       {stat.staticVal ? stat.staticVal : <AnimatedCounter to={stat.val} decimals={stat.decimals || 0} prefix={stat.prefix} suffix={stat.suffix} />}
                   </h3>
                   <p className="text-[13px] font-black text-muted-foreground uppercase tracking-[0.15em]">{stat.label}</p>
                 </motion.div>
               ))}
             </div>
           </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-40 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 z-0"></div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
            
            <div className="container mx-auto px-6 relative z-10 max-w-5xl text-center flex flex-col items-center">
                <motion.h2 
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   className="text-5xl md:text-7xl font-black mb-8 tracking-tighter"
                >
                   Ready to upgrade your stack?
                </motion.h2>
                <motion.p 
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: 0.2 }}
                   className="text-2xl text-muted-foreground mb-14 font-medium"
                >
                   Join the institutions already relying on Cipher for absolute integrity.
                </motion.p>
                <motion.div
                   initial={{ opacity: 0, scale: 0.9 }}
                   whileInView={{ opacity: 1, scale: 1 }}
                   viewport={{ once: true }}
                   transition={{ delay: 0.4 }}
                >
                    <Link href="/register">
                      <button className="relative overflow-hidden rounded-full bg-cyan-500 hover:bg-cyan-400 text-white font-semibold px-8 py-4 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] group">
                        <span className="relative z-10 flex items-center gap-2">
                          Launch Dashboard Now
                          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </span>
                        <div
                          className="absolute top-0 left-0 z-0 h-full w-[150%] bg-gradient-to-r from-transparent via-white/30 to-transparent transform-gpu animate-shimmer"
                          style={{ transform: "skewX(-20deg)" }}
                        />
                      </button>
                    </Link>
                </motion.div>
            </div>
        </section>
      </main>

      <footer className="bg-background py-20 flex flex-col items-center relative z-10 border-t border-border/30">
        <div className="container mx-auto px-6 text-center">
          <div className="flex justify-center mb-12 opacity-80 hover:opacity-100 transition-opacity">
             <Link href="/">
                <BrandLogo className="scale-[1.1] md:scale-[1.3]" />
             </Link>
           </div>
           
           <div className="flex justify-center gap-8 mb-10 text-[15px] font-bold text-muted-foreground">
               <Link href="#" className="hover:text-foreground transition-colors">Privacy Posture</Link>
               <Link href="#" className="hover:text-foreground transition-colors">Service Terms</Link>
               <Link href="#" className="hover:text-foreground transition-colors">Enterprise Contact</Link>
           </div>
           
           <p className="text-[11px] font-black text-muted-foreground/30 mt-12 tracking-[0.3em] uppercase">
             © {new Date().getFullYear()} CIPHER INC.
           </p>
        </div>
      </footer>
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
