'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as faceapi from 'face-api.js';
import { Mail, Lock, ScanFace, ArrowRight, Sparkles, Shield, Zap, Eye } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';

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
    initial={{ opacity: 0, x: -20 }}
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

export default function LoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'password' | 'face'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Face elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  // Unmount camera on mode switch
  useEffect(() => {
    if (loginMethod === 'password') {
      stopCamera();
    }
    return () => stopCamera();
  }, [loginMethod]);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setError('');
      setIsProcessing(true);
      
      if (!modelsLoaded) {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setModelsLoaded(true);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error", err);
      setError("Failed to access camera or load models.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFaceLogin = async () => {
    if (!email) {
       setError("Please enter your email address first.");
       return;
    }
    if (!videoRef.current) return;

    try {
      setIsProcessing(true);
      setError('');
      
      // Capture multiple face samples for more accurate matching
      const NUM_SAMPLES = 3;
      const descriptors: Float32Array[] = [];
      
      for (let attempt = 0; attempt < NUM_SAMPLES; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 400));
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
        setError('Could not capture enough face data. Please ensure good lighting and look directly at the camera.');
        setIsProcessing(false);
        return;
      }
      
      // Average descriptors for more stable comparison
      const avgDescriptor = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        let sum = 0;
        for (const desc of descriptors) {
          sum += desc[i];
        }
        avgDescriptor[i] = sum / descriptors.length;
      }
      
      const faceEmbedding = Array.from(avgDescriptor);
      
      const res = await fetch('http://localhost:5000/api/auth/login-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, faceEmbedding }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Face login failed');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      
      stopCamera();
      
      if (data.role === 'admin') {
        router.push('/dashboard/admin');
      } else if (data.role === 'teacher') {
        router.push('/dashboard/teacher');
      } else {
        router.push('/dashboard/student');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setError('');
    setIsProcessing(true);
    
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Login failed');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      
      if (data.role === 'admin') {
        router.push('/dashboard/admin');
      } else if (data.role === 'teacher') {
        router.push('/dashboard/teacher');
      } else {
        router.push('/dashboard/student');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen relative bg-background overflow-hidden">
      <ProfessionalBackground showMesh={true} showGrid={true} showOrbs={true} showStars={true} />
      
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
      
      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative z-10">
        {/* Hero content - positioned slightly above center */}
        <div className="max-w-lg" style={{ marginTop: '-2rem' }}>
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl font-black text-foreground mb-6 leading-tight tracking-tight"
            >
              Secure Assessment
              <span className="block bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Redefined
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-lg text-muted-foreground mb-10 leading-relaxed"
            >
              AI-powered proctoring meets world-class code execution. 
              The future of technical assessments is here.
            </motion.p>
            
            <div className="space-y-4">
              <FeatureBadge icon={Shield} text="Bank-grade security & encryption" delay={0.4} />
              <FeatureBadge icon={Zap} text="Real-time AI face verification" delay={0.5} />
              <FeatureBadge icon={Eye} text="Advanced behavioral analytics" delay={0.6} />
              <FeatureBadge icon={Sparkles} text="Docker-isolated code execution" delay={0.7} />
            </div>
          </motion.div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute bottom-12 left-12 flex items-center gap-4 text-sm text-muted-foreground/60">
          <div className="flex -space-x-2">
            {[1,2,3,4].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 border-2 border-background" />
            ))}
          </div>
          <span>Trusted by 10,000+ educators</span>
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Mobile Logo */}
        <div className="absolute top-6 left-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo size="sm" className="origin-left" />
          </Link>
        </div>
        
        <SpotlightCard className="group w-full max-w-md">
          <div className="relative z-10 rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-4 shadow-lg shadow-primary/10"
              >
                <AnimatePresence mode="wait">
                  {loginMethod === 'password' ? (
                    <motion.div
                      key="password-icon"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Lock className="h-7 w-7 text-primary" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="face-icon"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ScanFace className="h-7 w-7 text-primary" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-foreground"
              >
                Welcome Back
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-muted-foreground mt-1"
              >
                Sign in to access your dashboard
              </motion.p>
            </div>
            
            {/* Login Method Tabs */}
            <div className="flex p-1 mb-6 rounded-xl bg-muted/50 border border-border/50">
              <motion.button 
                type="button"
                onClick={() => setLoginMethod('password')}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  loginMethod === 'password' 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {loginMethod === 'password' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/50"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Password
                </span>
              </motion.button>
              <motion.button 
                type="button"
                onClick={() => setLoginMethod('face')}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  loginMethod === 'face' 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {loginMethod === 'face' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/50"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <ScanFace className="h-4 w-4" />
                  Face ID
                </span>
              </motion.button>
            </div>
            
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
            <form onSubmit={loginMethod === 'password' ? handlePasswordLogin : (e) => e.preventDefault()} className="space-y-5">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/50 pl-11 pr-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </motion.div>
              
              <AnimatePresence mode="wait">
                {loginMethod === 'password' ? (
                  <motion.div 
                    key="password"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <input 
                          type="password" 
                          required 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full rounded-xl border border-input bg-background/50 pl-11 pr-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                          placeholder="Enter your password"
                        />
                      </div>
                    </div>
                    
                    <motion.button 
                      whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(6, 182, 212, 0.4)' }}
                      whileTap={{ scale: 0.98 }}
                      type="submit" 
                      disabled={isProcessing}
                      className="relative w-full rounded-xl bg-gradient-to-r from-primary to-cyan-500 py-4 text-sm font-bold text-white shadow-lg shadow-primary/25 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isProcessing ? (
                          <>
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                            />
                            Signing In...
                          </>
                        ) : (
                          <>
                            Sign In
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </span>
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="face"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                      
                      <p className="text-sm font-medium text-foreground mb-4 relative">Look at the camera to verify</p>
                      
                      <div className="relative mx-auto aspect-video w-full max-w-[280px] overflow-hidden rounded-xl border-2 border-border bg-black shadow-2xl">
                        <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
                        
                        <AnimatePresence>
                          {!cameraActive && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 flex flex-col items-center justify-center bg-black/90"
                            >
                              <ScanFace className="h-12 w-12 text-muted-foreground/50 mb-3" />
                              <p className="text-xs text-muted-foreground">Camera not active</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        {/* Scanning Animation */}
                        {cameraActive && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 pointer-events-none"
                          >
                            <motion.div
                              animate={{ top: ['0%', '100%', '0%'] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                            />
                            <div className="absolute inset-4 border-2 border-primary/30 rounded-lg" />
                            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-primary" />
                            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-primary" />
                            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-primary" />
                            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-primary" />
                          </motion.div>
                        )}
                      </div>
                      
                      <div className="mt-5">
                        <AnimatePresence mode="wait">
                          {!cameraActive ? (
                            <motion.button
                              key="start"
                              type="button"
                              onClick={startCamera}
                              disabled={isProcessing}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm disabled:opacity-50"
                            >
                              {isProcessing ? 'Initializing...' : 'Start Camera'}
                            </motion.button>
                          ) : (
                            <motion.button
                              key="scan"
                              type="button"
                              onClick={handleFaceLogin}
                              disabled={isProcessing}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(6, 182, 212, 0.4)' }}
                              whileTap={{ scale: 0.98 }}
                              className="relative w-full rounded-xl bg-gradient-to-r from-primary to-cyan-500 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 overflow-hidden group disabled:opacity-50"
                            >
                              <span className="relative z-10 flex items-center justify-center gap-2">
                                {isProcessing ? (
                                  <>
                                    <motion.div 
                                      animate={{ rotate: 360 }}
                                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                      className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                                    />
                                    Verifying...
                                  </>
                                ) : (
                                  <>
                                    <ScanFace className="h-4 w-4" />
                                    Verify Identity
                                  </>
                                )}
                              </span>
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
            
            {/* Footer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-8 pt-6 border-t border-border/50 text-center"
            >
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link 
                  href="/register" 
                  className="font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 group"
                >
                  Create one
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Link>
              </p>
            </motion.div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
