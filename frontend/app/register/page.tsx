'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as faceapi from 'face-api.js';
import { ScanFace, CheckCircle2, User, Mail, Lock, Key, ArrowRight, Shield, Zap, Sparkles, ChevronRight } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

// Import professional background
import { ProfessionalBackground } from '@/components/professional-background';

// Interactive Card with Mouse Spotlight
const SpotlightCard = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      className={`relative overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 z-0"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) => `radial-gradient(400px circle at ${x}px ${y}px, rgba(6, 182, 212, 0.15), transparent 60%)`
          )
        }}
      />
      {children}
    </motion.div>
  );
};

// Animated Feature Badge
const FeatureBadge = ({ icon: Icon, text, delay }: { icon: any, text: string, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="flex items-center gap-2 text-sm text-muted-foreground/80"
  >
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
      <Icon className="h-3 w-3 text-primary" />
    </div>
    {text}
  </motion.div>
);

// Progress Step Indicator
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number, totalSteps: number }) => (
  <div className="flex items-center gap-2 mb-6">
    {Array.from({ length: totalSteps }).map((_, i) => (
      <motion.div
        key={i}
        className={`h-2 rounded-full transition-all duration-300 ${
          i < currentStep ? 'bg-primary w-8' : i === currentStep ? 'bg-primary/50 w-8' : 'bg-muted w-2'
        }`}
        initial={false}
        animate={{ 
          backgroundColor: i < currentStep ? '#0891B2' : i === currentStep ? 'rgba(8, 145, 178, 0.5)' : 'var(--muted)',
          width: i === currentStep ? 32 : i < currentStep ? 32 : 8
        }}
      />
    ))}
  </div>
);

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student', inviteCode: '', subjectSpecialty: 'Python' });
  const [error, setError] = useState('');
  
  // Minimal face capture conceptual state
  const [faceCaptured, setFaceCaptured] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      // Load necessary models for full face descriptor extraction
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error", err);
    }
  };

  const captureFace = async () => {
    if (!videoRef.current) return;
    try {
      setError('');
      
      // Capture multiple face descriptors for better accuracy
      const NUM_SAMPLES = 3;
      const descriptors: Float32Array[] = [];
      
      for (let attempt = 0; attempt < NUM_SAMPLES; attempt++) {
        // Small delay between captures for slightly different angles/lighting
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const detection = await faceapi.detectSingleFace(
          videoRef.current!,
          new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
        ).withFaceLandmarks().withFaceDescriptor();

        if (detection) {
          descriptors.push(detection.descriptor);
        }
      }

      if (descriptors.length < 2) {
        setError('Could not capture enough face samples. Please ensure good lighting and look directly at the camera.');
        return;
      }
      
      // Average all captured descriptors for a more robust face embedding
      const avgDescriptor = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        let sum = 0;
        for (const desc of descriptors) {
          sum += desc[i];
        }
        avgDescriptor[i] = sum / descriptors.length;
      }

      setFormData(prev => ({ ...prev, faceEmbedding: Array.from(avgDescriptor) }));
      setFaceCaptured(true);
      setError('');
      
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err) {
      console.error('Face capture failed', err);
      setError('Face capture failed. Make sure models are loaded.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faceCaptured && formData.role === 'student') {
      setError('Please verify face identity prior to initialization.');
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      
      if (formData.inviteCode) {
         const upgradeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/upgrade-to-teacher`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
            body: JSON.stringify({ inviteCode: formData.inviteCode, subjectSpecialty: formData.subjectSpecialty })
         });
         const upgradeData = await upgradeRes.json();
         if (upgradeRes.ok) {
            localStorage.setItem('user', JSON.stringify(upgradeData.user));
            return router.push('/dashboard/teacher');
         } else {
            setError(upgradeData.message || 'Teacher code invalid, registered as student');
         }
      }
      
      router.push('/dashboard/student');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Calculate form progress
  const calculateProgress = () => {
    let progress = 0;
    if (formData.name) progress++;
    if (formData.email) progress++;
    if (formData.password.length >= 8) progress++;
    if (faceCaptured) progress++;
    return progress;
  };
  
  const progress = calculateProgress();
  const totalSteps = 4;

  return (
    <div className="flex min-h-screen relative bg-background overflow-hidden">
      <ProfessionalBackground showMesh={true} showGrid={true} showOrbs={true} showStars={true} />
      
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        {/* Mobile Logo */}
        <div className="absolute top-6 left-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo size="sm" className="origin-left" />
          </Link>
        </div>
        
        <SpotlightCard className="group w-full max-w-lg">
          <div className="relative z-10 rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-cyan-500/10 border border-primary/20 mb-4 shadow-lg shadow-primary/10"
              >
                <ScanFace className="h-7 w-7 text-primary" />
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-foreground"
              >
                Create Account
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-muted-foreground mt-1"
              >
                Join the future of secure assessments
              </motion.p>
            </div>
            
            {/* Progress Indicator */}
            <StepIndicator currentStep={progress} totalSteps={totalSteps} />
            
            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="mb-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 flex items-center gap-3"
                >
                  <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Form */}
            <form onSubmit={handleRegister} className="space-y-5">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <input 
                    type="text" 
                    required 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full rounded-xl border border-input bg-background/50 pl-11 pr-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                    placeholder="John Doe"
                  />
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="space-y-2"
              >
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <input 
                    type="email" 
                    required 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full rounded-xl border border-input bg-background/50 pl-11 pr-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-2"
              >
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <input 
                    type="password" 
                    required 
                    value={formData.password} 
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full rounded-xl border border-input bg-background/50 pl-11 pr-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                    placeholder="Create a strong password"
                  />
                </div>
                {formData.password && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex gap-1 mt-1"
                  >
                    {[1,2,3,4].map((i) => (
                      <div 
                        key={i} 
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          formData.password.length >= i * 2 ? 
                            formData.password.length >= 8 ? 'bg-green-500' : 'bg-yellow-500' 
                            : 'bg-muted'
                        }`} 
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="space-y-2"
              >
                <label className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <Key className="h-3 w-3" />
                  Teacher Invite Code (Optional)
                </label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={formData.inviteCode} 
                    onChange={(e) => setFormData({...formData, inviteCode: e.target.value})}
                    className="w-full rounded-xl border border-primary/30 bg-primary/5 pl-4 pr-4 py-3.5 text-sm text-foreground font-mono placeholder:text-muted-foreground/50 focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                    placeholder="TEACHER-XXXX"
                  />
                </div>
              </motion.div>
              
              <AnimatePresence>
                {formData.inviteCode && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-xs font-semibold text-primary uppercase tracking-wider">Teaching Subject</label>
                    <div className="relative">
                      <select 
                        value={formData.subjectSpecialty} 
                        onChange={(e) => setFormData({...formData, subjectSpecialty: e.target.value})} 
                        className="w-full rounded-xl border border-primary/30 bg-primary/5 px-4 py-3.5 text-sm text-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm appearance-none cursor-pointer"
                      >
                        <option value="Python">Python Programming</option>
                        <option value="SQL">SQL & Databases</option>
                        <option value="JavaScript">JavaScript & Web Dev</option>
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rotate-90 pointer-events-none" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Face Capture Section */}
              <AnimatePresence mode="wait">
                {!faceCaptured ? (
                  <motion.div 
                    key="capture"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="rounded-2xl border border-border bg-muted/30 p-6 text-center relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                    
                    <p className="text-sm font-medium text-foreground mb-4 relative">Identity Verification Required</p>
                    
                    <div className="relative mx-auto aspect-video w-full max-w-[280px] overflow-hidden rounded-xl border-2 border-border bg-black shadow-2xl">
                      <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
                      
                      {/* Corner Markers */}
                      <div className="absolute inset-4 border border-primary/30 rounded-lg pointer-events-none" />
                      <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-primary" />
                      <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-primary" />
                      <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-primary" />
                      <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-primary" />
                    </div>
                    
                    <div className="mt-5 flex justify-center gap-3">
                      <motion.button 
                        type="button" 
                        onClick={startCamera}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
                      >
                        Start Camera
                      </motion.button>
                      <motion.button 
                        type="button" 
                        onClick={captureFace}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
                      >
                        Capture Face
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="captured"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="rounded-xl bg-emerald-500/10 p-4 text-center border border-emerald-500/20 flex items-center justify-center gap-3"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Biometric Verified</p>
                      <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Face captured successfully</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.button 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(6, 182, 212, 0.4)' }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                className="relative w-full rounded-xl bg-gradient-to-r from-primary to-cyan-500 py-4 text-sm font-bold text-white shadow-lg shadow-primary/25 overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Create Account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-primary opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </motion.button>
            </form>
            
            {/* Footer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 pt-6 border-t border-border/50 text-center"
            >
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link 
                  href="/login" 
                  className="font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 group"
                >
                  Sign in
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Link>
              </p>
            </motion.div>
          </div>
        </SpotlightCard>
      </div>
      
      {/* Logo - absolute top right of page */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-6 right-8 z-20 hidden lg:block"
      >
        <Link href="/" className="inline-block group">
          <BrandLogo size="sm" className="transition-transform group-hover:scale-105" />
        </Link>
      </motion.div>
      
      {/* Right Side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative z-10">
        {/* Hero content */}
        <div className="max-w-lg ml-auto" style={{ marginTop: '-2rem' }}>
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl font-black text-foreground mb-6 leading-tight tracking-tight"
            >
              Join the
              <span className="block bg-gradient-to-r from-cyan-400 to-primary bg-clip-text text-transparent">
                Revolution
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-lg text-muted-foreground mb-10 leading-relaxed"
            >
              Create your account and experience the next generation 
              of secure, AI-powered technical assessments.
            </motion.p>
            
            <div className="space-y-4">
              <FeatureBadge icon={Shield} text="Zero-knowledge face verification" delay={0.4} />
              <FeatureBadge icon={Zap} text="Real-time proctoring dashboard" delay={0.5} />
              <FeatureBadge icon={Sparkles} text="AI-powered code analysis" delay={0.6} />
              <FeatureBadge icon={ScanFace} text="Privacy-first biometric storage" delay={0.7} />
            </div>
          </motion.div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute bottom-12 right-12 flex items-center gap-4 text-sm text-muted-foreground/60">
          <span>Join 10,000+ students & educators</span>
          <div className="flex -space-x-2">
            {[1,2,3,4].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 border-2 border-background" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
