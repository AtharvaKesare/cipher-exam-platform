'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { io, Socket } from 'socket.io-client';
import { AlertCircle, AlertTriangle, Maximize, Play, CheckCircle, VideoOff, TerminalSquare, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useTheme } from 'next-themes';

import * as faceapi from 'face-api.js';

export default function ExamEnvironment() {
  const params = useParams();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const boilerplates: Record<string, string> = {
    javascript: `// Write your JavaScript solution here\nconsole.log('Hello from JavaScript!');\n`,
    python: `# Write your Python solution here\nprint("Hello from Python!")\n`,
    sql: `-- Write your SQL query here\nSELECT * FROM employees;\n`
  };
  const [code, setCode] = useState(boilerplates['javascript']);
  const codeRef = useRef(code);
  const [language, setLanguage] = useState('javascript');
  
  // Track code blocks per language and per question
  // structure: { 'questionId_lang': 'code...' }
  const [allCode, setAllCode] = useState<Record<string, string>>({});
  // violations = confirmed penalties (emitted to server)
  const [violations, setViolations] = useState(0);
  // notices = first-time grace warnings (no penalty yet)
  const [notices, setNotices] = useState(0);
  // alert state: { message, type: 'notice' | 'violation' } | null
  const [alert, setAlert] = useState<{ message: string; type: 'notice' | 'violation' } | null>(null);
  const [timeLeft, setTimeLeft] = useState(7200);
  const socketRef = useRef<Socket | null>(null);
  // lastTimestamp per eventType (for cooldown)
  const lastEventTime = useRef<Record<string, number>>({});
  // tracks which event types have already received a grace notice
  const graceGiven = useRef<Set<string>>(new Set());
  const [warningLimit, setWarningLimit] = useState(3);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // showFsBlocker: true whenever fullscreen has been exited mid-exam
  // Shows a hard blocking overlay — the student must click to re-enter
  const [showFsBlocker, setShowFsBlocker] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [examMounted, setExamMounted] = useState(false);
  const [fsExitCount, setFsExitCount] = useState(0);
  const [isFocused, setIsFocused] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  // Camera ready state — we start cam early so it's ready when exam begins
  const [isCamReady, setIsCamReady] = useState(false);
  const camStreamRef = useRef<MediaStream | null>(null);

  const [examTitle, setExamTitle] = useState("Loading...");
  const [examSubject, setExamSubject] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [hasPassed, setHasPassed] = useState<boolean | null>(null);
  const currentQuestion = questions[currentQuestionIndex] || null;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const terminationTriggered = useRef(false);
  const phoneWorkerRef = useRef<Worker | null>(null);

  // We need a ref to safely call triggerWarning from the worker without stale state
  const triggerWarningRef = useRef<Function | null>(null);

  // Initialize isolated phone detection worker
  useEffect(() => {
    phoneWorkerRef.current = new Worker('/phone-worker.js');
    phoneWorkerRef.current.onmessage = (e) => {
      if (e.data.type === 'RESULT' && e.data.predictions) {
        const phoneDetected = e.data.predictions.some((p: any) => p.class === 'cell phone');
        if (phoneDetected && triggerWarningRef.current) {
          triggerWarningRef.current("A mobile phone was detected in the camera frame.", "phone_detected", true);
        }
      }
    };
    return () => {
      phoneWorkerRef.current?.terminate();
    }
  }, []);

  // Map friendly labels for each event type
  const eventLabels: Record<string, string> = {
    tab_switch:       'Switching Tabs / Minimizing Window',
    window_blur:      'Focusing Away from Exam',
    fullscreen_exit:  'Exiting Full-Screen Mode',
    face_missing:     'No Face Detected in Camera',
    multiple_faces:   'Multiple Faces in Camera Frame',
    identity_mismatch:'Unrecognized Face (Identity Mismatch)',
    copy_paste:       'Copy / Paste Action',
    phone_detected:   'Mobile Phone Detected on Camera',
  };

  const triggerWarning = (reason: string, eventType: string, fatal: boolean = false) => {
    const now = Date.now();
    const lastTime = lastEventTime.current[eventType] || 0;
    const label = eventLabels[eventType] || reason;

    if (fatal) {
      setViolations(999); // Force immediate termination (avoids stale warningLimit closure)
      setAlert({
        type: 'violation',
        message: `🚨 Critical Violation — ${label}. Exam terminated.`
      });
      if (socketRef.current) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        socketRef.current.emit('proctor_warning', {
          examId: params.examId,
          studentId: user.id || user._id,
          eventType,
          timestamp: new Date()
        });
      }
      return;
    }

    // ── Stage 1: Grace Notice (first offence, no penalty) ──────────────
    if (!graceGiven.current.has(eventType)) {
      // Cooldown: 15s between repeated notices for same type before escalating
      if (now - lastTime < 15000) return;
      lastEventTime.current[eventType] = now;

      graceGiven.current.add(eventType);
      setNotices(n => n + 1);
      setAlert({
        type: 'notice',
        message: `⚠️ First Notice — ${label}. Please stop immediately. Repeating this will count as a PENALTY.`
      });
      return;  // no penalty, no socket
    }

    // ── Stage 2: Confirmed Violation (penalty) ─────────────────────────
    // 15s cooldown so rapid re-triggers don't stack penalties
    if (now - lastTime < 15000) return;
    lastEventTime.current[eventType] = now;

    setViolations(v => v + 1);
    setAlert({
      type: 'violation',
      message: `🚨 Violation — ${label}. This has been flagged and recorded.`
    });

    if (socketRef.current) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      socketRef.current.emit('proctor_warning', {
        examId: params.examId,
        studentId: user.id || user._id,
        eventType,
        timestamp: new Date()
      });
    }
  };
  
  // Keep ref updated so worker always uses latest function
  useEffect(() => {
    triggerWarningRef.current = triggerWarning;
  }, [triggerWarning]);

  // ── Early Camera Initialization (runs on mount, before exam starts) ────────
  // We start the camera and load models immediately so there's no delay
  // when the student clicks "Enter Full-Screen & Start".
  useEffect(() => {
    const initCameraEarly = async () => {
      try {
        // Request camera access right away
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        camStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCamReady(true);

        // Load face-api models in background
        try {
          await faceapi.tf.setBackend('cpu');
          await faceapi.tf.ready();
        } catch (_) {}
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

        setIsModelLoaded(true);
      } catch (e) {
        console.warn('Early camera init failed:', e);
      }
    };
    initCameraEarly();
    return () => {
      // Cleanup stream if component unmounts before exam starts
      camStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Re-attach camera stream when exam UI mounts ───────────────────────────
  // When examStarted flips to true, React swaps the pre-exam <video> for the
  // main exam <video>. The videoRef.current is a NEW element — we must re-set
  // srcObject on it so the camera feed appears in the proctor panel.
  useEffect(() => {
    if (examStarted && camStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = camStreamRef.current;
    }
  }, [examStarted, isCamReady]);

  // ── Force fullscreen blocker when exam starts but window is not fullscreen ─
  // Covers edge cases: fullscreen failed silently, student refreshed mid-exam,
  // or the browser never confirmed fullscreen entry.
  useEffect(() => {
    if (examStarted && !document.fullscreenElement) {
      setShowFsBlocker(true);
    }
  }, [examStarted]);



  // ── Fullscreen change listener (always active) ──────────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement;
      if (isFs) {
        // Confirmed fullscreen — hide blocker, mark as fullscreen
        setIsFullscreen(true);
        setShowFsBlocker(false);
        setExamMounted(true);
      } else {
        setIsFullscreen(false);
        if (examStarted) {
          // Show the hard blocker overlay immediately
           setFsExitCount(prev => prev + 1);
           setShowFsBlocker(true);
           triggerWarning("Exited full-screen mode during exam.", "fullscreen_exit");
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, [examStarted]);

  // ── Setup Anti-cheat & Proctoring (runs once exam is started) ────────────
  useEffect(() => {
    if (!examStarted) return;

    // Fetch initial exam configurations
    const initExam = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/student/exam/${params.examId}/start`, {
           method: 'POST',
           headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok && data.exam) {
           if (data.session && (data.session.status === 'submitted' || data.session.status === 'terminated' || data.session.status === 'auto_submitted')) {
              router.push(`/exam/${params.examId}/results`);
              return;
           }
           setWarningLimit(data.exam.warningLimit || 3);
           setTimeLeft((data.exam.duration || 120) * 60);
           setExamTitle(data.exam.title);
           setExamSubject(data.exam.subject || "All");
           if (data.exam.questions && data.exam.questions.length > 0) {
             setQuestions(data.exam.questions);
             const firstQ = data.exam.questions[0];
             
             let startLang = 'javascript';
             if (firstQ.allowedLanguages && firstQ.allowedLanguages.length > 0) {
               startLang = firstQ.allowedLanguages[0].toLowerCase();
             } else if (data.exam.subject && data.exam.subject !== 'All') {
               startLang = data.exam.subject.toLowerCase();
             }
             
             setLanguage(startLang);
             setCode(boilerplates[startLang] || boilerplates['javascript']);
             codeRef.current = boilerplates[startLang] || boilerplates['javascript'];
           }
        } else {
           setInitializationError(data.message || 'Failed to start exam. You may not be enrolled.');
        }
      } catch (err: any) {
        setInitializationError(err.message || 'Network error while starting exam.');
      }
    };
    initExam();

    // 1. Socket Connection
    socketRef.current = io('http://localhost:5000');
    if (localStorage.getItem('user')) {
       const userStr = localStorage.getItem('user');
       const user = userStr ? JSON.parse(userStr) : {};
       socketRef.current.emit('student_join', user.id || user._id);
    }
    
    socketRef.current.on('session:reset', () => {
       // Instantly reset the student when teacher forces session unlock
       router.push('/dashboard/student');
    });
    
    // 2. Tab switch / window blur detection
    const handleVisibilityChange = () => {
      if (document.hidden) triggerWarning("You switched tabs or minimized the window.", "tab_switch");
    };
    
    let blurTimer: ReturnType<typeof setTimeout>;
    const handleWindowBlur = () => {
      setIsFocused(false);
      blurTimer = setTimeout(() => {
        if (!document.hidden) triggerWarning("You focused away from the exam window.", "window_blur");
      }, 200);
    };
    const handleWindowFocus = () => {
      setIsFocused(true);
      clearTimeout(blurTimer);
    };

    // 3. Proctoring interval — reuse the stream already started on mount
    let proctorInterval: NodeJS.Timeout;

    const startProctoring = () => {
      // Camera was already initialized early — just attach listeners and start scanning
      // Setup anti-cheat listeners now
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);

      const userStr = localStorage.getItem('user');
      let savedDescriptor: Float32Array | null = null;
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.faceEmbedding && user.faceEmbedding.length > 0) savedDescriptor = new Float32Array(user.faceEmbedding);
      }

      let scanCount = 0;

      proctorInterval = setInterval(async () => {
        try {
          if (videoRef.current && !videoRef.current.paused) {
            scanCount++;

            // 1. Phone Detection (Runs every cycle using COCO-SSD Web Worker)
            if (phoneWorkerRef.current && videoRef.current) {
              const canvas = document.createElement('canvas');
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              const ctx = canvas.getContext('2d');
              if (ctx && canvas.width > 0) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                phoneWorkerRef.current.postMessage({ imageData });
              }
            }

            const isIdentityCheckTime = scanCount % 6 === 0;

            if (!isIdentityCheckTime) {
              const detections = await faceapi.detectAllFaces(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 })
              );
              if (detections.length === 0) {
                triggerWarning("No face detected in the camera frame.", "face_missing");
              } else if (detections.length > 1) {
                const areas = detections.map(d => d.box.width * d.box.height).sort((a, b) => b - a);
                const sizeRatio = areas[areas.length - 1] / areas[0];
                  // Size ratio heuristic removed in favor of COCO-SSD above.
                  triggerWarning("Multiple people detected in the camera frame.", "multiple_faces");
              }
            } else {
              const detections = await faceapi.detectAllFaces(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 })
              ).withFaceLandmarks().withFaceDescriptors();
              if (detections.length === 0) {
                triggerWarning("No face detected in the camera frame.", "face_missing");
              } else if (detections.length > 1) {
                const areas = detections.map(d => d.detection.box.width * d.detection.box.height).sort((a, b) => b - a);
                const sizeRatio = areas[areas.length - 1] / areas[0];
                  // Size ratio heuristic removed in favor of COCO-SSD above.
                  triggerWarning("Multiple people detected in the camera frame.", "multiple_faces");
              } else if (savedDescriptor && detections.length === 1) {
                const distance = faceapi.euclideanDistance(savedDescriptor, detections[0].descriptor);
                if (distance > 0.6) triggerWarning("Identity mismatch: Unrecognized face detected.", "identity_mismatch");
              }
            }
          }
        } catch(err) {}
      }, 5000);
    };

    startProctoring();

    // 4. Timer
    let hasAutoSubmitted = false;
    const timer = setInterval(() => {
      setTimeLeft((t: number) => { 
        if (t <= 1) { 
          clearInterval(timer); 
          if (!hasAutoSubmitted) {
            hasAutoSubmitted = true;
            autoSubmitExam();
          }
          return 0; 
        } 
        return t - 1; 
      });
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      clearTimeout(blurTimer);
      if (socketRef.current) {
         socketRef.current.off('session:reset');
         socketRef.current.disconnect();
      }
      clearInterval(timer);
      if (proctorInterval) clearInterval(proctorInterval);
      // Note: camera stream is managed by the early-init useEffect; don't stop it here
    };
  }, [params.examId, examStarted]);

  // Context Menu & Copy/Paste/Cut Prevention
  useEffect(() => {
    if (!examStarted) return;

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const blockClipboard = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      triggerWarning('Copy, cut and paste are disabled.', 'copy_paste');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();
      
      if (key === 'escape' || key === 'f12' || key === 'f5') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      if (isCtrl && ['c', 'v', 'u', 's', 'p', 'r', 'f'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning('Keyboard shortcuts are disabled.', 'copy_paste');
        return;
      }
      
      if (isCtrl && isShift && ['i', 'j', 'c', 'k'].includes(key)) {
         e.preventDefault();
         e.stopPropagation();
         return;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('copy',  blockClipboard, { capture: true });
    document.addEventListener('cut',   blockClipboard, { capture: true });
    document.addEventListener('paste', blockClipboard, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('copy',  blockClipboard, { capture: true });
      document.removeEventListener('cut',   blockClipboard, { capture: true });
      document.removeEventListener('paste', blockClipboard, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [examStarted]);

  // ── Browser Navigation / Back Button Prevention ────────────
  useEffect(() => {
    if (!examStarted) return;

    // Push a dummy state to history to trap the back button
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      // User clicked the back button; re-push state to prevent leaving
      window.history.pushState(null, '', window.location.href);
      
      // Instead of relying on window.alert (which conflicts with the local 'alert' state variable), 
      // trigger a fatal warning. This shows the 'Exam Terminated' UI and auto-submits the exam.
      triggerWarning("You navigated away from the exam page.", "navigation_leave", true);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Most modern browsers ignore this custom message and display their own
      e.returnValue = 'Leaving this page will automatically submit your exam. Are you sure?';
      return e.returnValue;
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [examStarted, params.examId]);


  // Alert banner auto-dismiss
  useEffect(() => {
    if (alert) {
      // Notices stay 6s, violations stay 8s so students read them
      const duration = alert.type === 'notice' ? 6000 : 8000;
      const t = setTimeout(() => setAlert(null), duration);
      return () => clearTimeout(t);
    }
  }, [alert]);

  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        // NOTE: Do NOT call setIsFullscreen(true) here.
        // The 'fullscreenchange' event listener is responsible for updating
        // isFullscreen state once the browser has confirmed the mode change.
        // setExamStarted(true) is called here so proctoring starts immediately.
        setExamStarted(true);
      }
    } catch (err) {
      console.error("Cannot enter fullscreen:", err);
    }
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60); const sec = s % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setOutput('Running...');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setOutput('[Error] You are not logged in. Please refresh and log in again.');
        setIsRunning(false);
        return;
      }

      let req: Response;
      try {
        req = await fetch('http://localhost:5000/api/code/run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ code: codeRef.current, language, examId: params.examId, questionId: currentQuestion?._id })
        });
      } catch (networkErr: any) {
        // Pure network failure (server down, CORS, no internet)
        setOutput(`[Network Error] Cannot reach the server. Make sure the backend is running on port 5000.\n\nDetails: ${networkErr.message}`);
        setIsRunning(false);
        return;
      }

      // Handle non-OK HTTP responses explicitly
      if (!req.ok) {
        let errMsg = `Server returned ${req.status}`;
        try {
          const errData = await req.json();
          errMsg = errData.message || errMsg;
        } catch {}
        if (req.status === 429) {
          setOutput(`[Rate Limit] You are running code too fast. Please wait a moment and try again.`);
        } else if (req.status === 401) {
          setOutput(`[Auth Error] Session expired. Please refresh the page and log in again.`);
        } else {
          setOutput(`[Server Error ${req.status}] ${errMsg}`);
        }
        setIsRunning(false);
        return;
      }

      const res = await req.json();
      setIsRunning(false);

      if (res.state === 'completed' || res.state === 'failed') {
        const { output, error, resultType } = res.result || {};
        
        if (resultType === 'timeout') {
            setOutput(`[Time Limit Exceeded]\n${error}`);
            setHasPassed(false);
        } else if (resultType === 'runtime_error') {
            const errDisplay = error ? error : (output || 'Unknown Runtime Error');
            setOutput(`[Runtime Error]\n${errDisplay}`);
            setHasPassed(false);
        } else if (resultType === 'system_error') {
            setOutput(`[Execution Failed]\n${error || 'System failed to execute your code.'}`);
            setHasPassed(false);
        } else if (output != null) {
            setOutput(output);
            if (res.result.passed !== undefined) {
                setHasPassed(res.result.passed);
            }
        } else if (error) {
            setOutput(`Error:\n${error}`);
            setHasPassed(false);
        } else {
            setOutput('Execution finished with no output.');
            setHasPassed(false);
        }
      } else {
        setOutput('Failed to execute code: Unexpected response from server.');
      }

    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
      setIsRunning(false);
    }
  };

  const autoSubmitExam = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/student/exam/${params.examId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
           reason: 'normal',
           finalCode: codeRef.current,
           questionId: currentQuestion?._id,
           language: language,
           allCode: allCode
        })
      });
    } catch (e) {}
    router.push(`/exam/${params.examId}/results`);
  };



  // Scroll animations observer
  useEffect(() => {
    if (!isFullscreen) return;
    const animatedElements = document.querySelectorAll('.verification-panel, .code-editor, .output-terminal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    animatedElements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [isFullscreen]);

  // Session termination via violations — use useEffect to avoid render-body side effects
  useEffect(() => {
    if (violations >= warningLimit && !terminationTriggered.current) {
      terminationTriggered.current = true;
      (async () => {
        try {
          const token = localStorage.getItem('token');
          await fetch(`http://localhost:5000/api/student/exam/${params.examId}/submit`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              reason: 'violation',
              finalCode: codeRef.current,
              questionId: currentQuestion?._id,
              language: language,
              allCode: allCode
            })
          });
        } catch (e) {}
      })();
    }
  }, [violations, warningLimit, params.examId]);

  if (initializationError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-background text-foreground">
        <div className="max-w-md w-full text-center bg-card border border-border p-10 rounded-2xl shadow-2xl">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-6 opacity-80" />
          <h1 className="text-2xl font-bold mb-3 text-foreground">Cannot Start Exam</h1>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">{initializationError}</p>
          <button onClick={() => router.push('/dashboard/student')} className="neon-btn w-full py-3 rounded-md font-medium">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (violations >= warningLimit) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-background">
        <div className="text-center bg-card border border-destructive/20 p-12 rounded-2xl max-w-lg w-full shadow-2xl">
          <ShieldAlert className="h-14 w-14 text-destructive mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-foreground mb-3">Exam Terminated</h1>
          <p className="text-muted-foreground mb-4">Your exam was automatically submitted due to repeated proctoring violations.</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
              <p className="text-yellow-400 text-xl font-bold">{notices}</p>
              <p className="text-xs text-muted-foreground mt-1">Notices Given</p>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center">
              <p className="text-destructive text-xl font-bold">{violations}</p>
              <p className="text-xs text-muted-foreground mt-1">Penalties Applied</p>
            </div>
          </div>
          <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-md mb-8 border border-destructive/20 text-left">
             <span className="font-semibold block mb-1">Note:</span>
             Each violation type received a warning notice first. Penalties were only applied after repeated offences.
          </div>
          <button 
            onClick={() => router.push(`/exam/${params.examId}/results`)}
            className="w-full px-4 py-3 bg-card text-foreground text-foreground rounded-md hover:bg-muted text-foreground transition-colors border border-border/50 font-medium"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  if (!isFullscreen && !examStarted) {
    // Pre-exam screen: show camera preview early so student knows cam is working
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <Maximize className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Ready to begin?</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              This exam requires full-screen mode. Exiting full-screen, switching tabs, or hiding your face will result in a penalty. Navigating away or pressing the back button will automatically submit the exam.
            </p>
          </div>

          {/* Live camera preview */}
          <div className="relative mb-6 rounded-xl overflow-hidden border border-border bg-card aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-full border border-border text-xs font-medium">
              {isCamReady
                ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Camera Ready</>
                : <><span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse"></span> Initializing Camera...</>
              }
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-full border border-border text-xs font-medium">
              {isModelLoaded
                ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> AI Ready</>
                : <><span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse"></span> Loading AI...</>
              }
            </div>
          </div>

          {(violations > 0 || notices > 0) && (
            <div className={`mb-5 p-3 rounded-lg text-sm font-medium border ${
              violations > 0
                ? 'bg-destructive/10 border-destructive/20 text-destructive'
                : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
            }`}>
              {violations > 0
                ? `⚠ You have ${violations} penalty${violations > 1 ? 'ies' : 'y'}. ${warningLimit - violations} remaining before termination.`
                : `ℹ You received ${notices} notice${notices > 1 ? 's' : ''}. Please stay in full-screen to avoid penalties.`
              }
            </div>
          )}

          <button
            onClick={enterFullscreen}
            className="w-full py-3.5 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Maximize className="h-4 w-4" />
            Enter Full-Screen &amp; Start Exam
          </button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            You will receive a notice before any penalty is applied.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">

      {/* ── Hard Fullscreen Blocker Overlay (shows when ESC is pressed mid-exam) ── */}
      {showFsBlocker && fsExitCount < 3 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm" style={{ pointerEvents: 'all' }}>
          <div className="max-w-md w-full mx-6 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/30 mb-6">
               <ShieldAlert className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Full-Screen Required</h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
               You exited full-screen mode. <strong className="text-red-400">This has been recorded as a violation.</strong> You must return to full-screen.
            </p>
            <button
               onClick={async () => {
                 try {
                   await document.documentElement.requestFullscreen();
                 } catch(e) {}
               }}
               className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
               <Maximize className="h-4 w-4" />
               Return to Full-Screen
            </button>
          </div>
        </div>
      )}

      {showFsBlocker && fsExitCount >= 3 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm" style={{ pointerEvents: 'all' }}>
          <div className="max-w-md w-full mx-6 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/30 mb-6">
               <ShieldAlert className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-red-500 mb-3">Exam Locked</h2>
            <p className="text-white text-sm leading-relaxed">
               Your exam has been locked due to repeated security violations. Please wait for your invigilator.
            </p>
          </div>
        </div>
      )}
      
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-card/40 backdrop-blur-md backdrop-blur-sm p-4">
          <div className="bg-card border border-border p-6 rounded-xl max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-foreground mb-2">Submit Exam</h2>
            <p className="text-sm text-muted-foreground mb-6">Are you sure you want to submit? You will not be able to return to the exam.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-foreground bg-card text-foreground hover:bg-muted text-foreground rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => { setIsSubmitModalOpen(false); autoSubmitExam(); }}
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors"
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Alert Toast (Notice = yellow, Violation = red) ── */}
      {alert && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full mx-4 flex items-start gap-3 px-5 py-4 rounded-xl border shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 ${
          alert.type === 'notice'
            ? 'bg-yellow-950/95 border-yellow-500/40 text-yellow-200'
            : 'bg-red-950/95 border-red-500/40 text-red-200'
        }`}>
          {alert.type === 'notice'
            ? <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            : <ShieldAlert className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          }
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug">
              {alert.type === 'notice' ? 'First Notice' : 'Violation Recorded'}
            </p>
            <p className="text-xs mt-1 opacity-80 leading-relaxed">{alert.message.replace(/^[^—]+— /, '')}</p>
          </div>
          <button onClick={() => setAlert(null)} className="text-xs opacity-50 hover:opacity-100 flex-shrink-0 mt-0.5">✕</button>
        </div>
      )}

      {/* Top Bar */}
      <header className="flex h-12 items-center justify-between border-b border-border/50 bg-card px-4 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <TerminalSquare className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-sm text-foreground">{examTitle}</h1>
        </div>
        
        {/* Status Bar: [● SECURED | FOCUSED | VIOLATIONS: X/3] */}
        <div className={`flex items-center gap-3 px-4 py-1.5 rounded-md border text-xs font-bold ${
            violations === 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
            violations < 3 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
            'bg-red-500/10 text-red-500 border-red-500/20'
        }`}>
           <span className="flex items-center gap-1.5 rounded-full">
              {!isFullscreen ? <span className="text-red-500 flex items-center gap-1">● NOT SECURE</span> : <span className="text-emerald-400 flex items-center gap-1">● SECURED</span>}
           </span>
           <span className="opacity-50">|</span>
           <span className="flex items-center gap-1.5 rounded-full">
              {!isFocused ? <span className="text-amber-500 flex items-center gap-1">FOCUS LOST</span> : <span className="text-emerald-400 flex items-center gap-1">FOCUSED</span>}
           </span>
           <span className="opacity-50">|</span>
           <span>VIOLATIONS: {violations}/{warningLimit}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-lg font-bold text-foreground font-mono">
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left Panel: Problem & Webcam */}
        <div className="verification-panel w-full md:w-[380px] border-r border-border/50 bg-background flex flex-col flex-shrink-0 hide-on-mobile-landscape">
          
          {/* Proctor Feed */}
          <div className="h-[280px] border-b border-border/50 bg-card relative p-3 flex-shrink-0">
            <div className="verify-badge absolute top-5 left-5 z-20 flex items-center gap-2 text-[10px] font-bold text-[#10B981] bg-card/80 px-2 py-1 rounded border border-[#10B981]/30 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" /> Proctor Active
            </div>
            <div className="relative h-full w-full rounded-md overflow-hidden border border-border bg-card">
               <video 
                 ref={videoRef} 
                 className="h-full w-full object-cover" 
                 autoPlay playsInline muted 
               />
            </div>
          </div>

          {/* Language Tabs & Problem Statement */}
          <div className="flex flex-col flex-1 overflow-hidden">
             {questions.length > 0 && (
               <div className="flex border-b border-border/50 bg-card flex-shrink-0">
                 {['sql', 'python', 'javascript'].map(lang => {
                   if (examSubject && examSubject !== 'All' && examSubject.toLowerCase() !== lang) return null;

                   const q = questions.find(q => q.allowedLanguages?.includes(lang));
                   if (!q) return null;
                   const isActive = currentQuestion?._id === q._id;
                   const langLabel: Record<string, string> = { sql: 'SQL', python: 'Python', javascript: 'JavaScript' };
                   return (
                     <button
                       key={lang}
                       onClick={() => {
                         // Save current BEFORE switching
                         if (currentQuestion) {
                            setAllCode(prev => ({ ...prev, [`${currentQuestion._id}_${language}`]: codeRef.current }));
                         }
                         const idx = questions.findIndex(x => x._id === q._id);
                         setCurrentQuestionIndex(idx);
                         setLanguage(lang);
                         
                         const key = `${q._id}_${lang}`;
                         // Use saved code if exists, otherwise boilerplate
                         setCode(prev => {
                            const newCode = allCode[key] !== undefined ? allCode[key] : (boilerplates[lang] || boilerplates['javascript']);
                            codeRef.current = newCode;
                            return newCode;
                         });
                         
                         setHasPassed(null);
                         setOutput(null);
                       }}
                       className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${
                         isActive
                           ? 'border-primary text-primary bg-primary/5'
                           : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5'
                       }`}
                     >
                       {langLabel[lang]}
                     </button>
                   );
                 })}
               </div>
             )}

             <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
               {currentQuestion ? (
                 <>
                   <div className="flex items-center justify-between mb-3">
                     <div className="inline-flex items-center rounded-md bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold text-secondary border border-secondary/20 capitalize">
                       {currentQuestion.difficulty || 'medium'}
                     </div>
                   </div>
                   <h2 className="text-lg font-semibold mb-3 text-foreground">{currentQuestion.title}</h2>
                   <div className="prose prose-invert prose-sm max-w-none text-muted-foreground">
                     <p className="whitespace-pre-wrap leading-relaxed">{currentQuestion.description}</p>
                   </div>
                 </>
               ) : (
                 <div className="text-center py-12 text-sm text-muted-foreground">
                   No questions found.
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Right Panel: Editor & Terminal */}
        <div className="flex flex-1 flex-col dark:bg-[#1E1E1E] bg-[#FAFAFA] min-w-0">
          <div className="flex items-center justify-between border-b border-border/50 dark:bg-[#252526] bg-[#F1F5F9] px-4 py-2 flex-shrink-0 min-h-[40px]">
             <span className="text-xs text-muted-foreground font-medium">{language === 'javascript' ? 'solution.js' : language === 'python' ? 'solution.py' : 'query.sql'}</span>
          </div>
          
          <div className="code-editor flex-1 overflow-hidden relative">
            <CodeMirror
              value={code}
              height="100%"
              theme={resolvedTheme === "light" ? "light" : "dark"}
              extensions={[
                language === 'javascript' ? javascript() : 
                language === 'python' ? python() : 
                sql()
              ]}
              onChange={(val) => { 
                setCode(val); 
                codeRef.current = val;
                if (currentQuestion) {
                  setAllCode(prev => ({ ...prev, [`${currentQuestion._id}_${language}`]: val }));
                }
              }}
              className="h-full text-[13px] font-fira"
            />
          </div>
          
          {/* Terminal Output */}
          <div className="output-terminal h-[250px] border-t border-border/50 dark:bg-[#1E1E1E] bg-[#FAFAFA] flex flex-col flex-shrink-0">
            <div className="terminal-header px-4 py-2 border-b border-border/50 flex items-center justify-between text-xs font-medium text-muted-foreground dark:bg-[#252526] bg-[#F1F5F9]">
              <span className="flex items-center gap-2">Terminal</span>
              {isRunning && <span className="text-primary animate-pulse">Running...</span>}
            </div>
            <div className="flex-1 p-4 font-fira text-[13px] text-[#10B981] overflow-y-auto whitespace-pre-wrap dark:bg-[#1E1E1E] bg-[#FAFAFA] custom-scrollbar">
              {output || <span className="output-text block w-fit text-muted-foreground font-mono">Ready to execute code...<span className="terminal-cursor-alt">▌</span></span>}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 border-t border-border/50 dark:bg-[#252526] bg-[#F1F5F9] p-3 flex-shrink-0">
            <button 
              onClick={handleRunCode}
              disabled={isRunning}
              className={`px-4 py-1.5 text-sm font-medium rounded-md bg-muted text-foreground text-foreground hover:bg-muted-foreground/20 transition-colors border border-border ${isRunning ? 'opacity-50 cursor-wait' : ''}`}
            >
              Run Code
            </button>
            <button 
              onClick={() => setIsSubmitModalOpen(true)} 
              className="px-4 py-1.5 text-sm font-medium rounded-md bg-primary text-foreground hover:bg-primary/90 transition-colors"
            >
              Submit Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
