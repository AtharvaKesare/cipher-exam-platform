# Project Blueprint: AI-Powered Proctored Coding Exam Platform (ProctorFlow)

## 1. Project Overview
**ProctorFlow** is a secure, state-of-the-art platform for conducting coding examinations. It combines AI-driven behavioral monitoring with sandboxed code execution to ensure academic integrity without compromising user experience.

---

## 2. System Architecture
The platform follows a microservices-inspired architecture with three primary decoupling layers:

### 2.1. Frontend (Next.js 15+ / Turbopack)
The client-side application provides a premium, low-latency interface for both Teachers and Students.
- **Client-Side AI**: Face detection and recognition are performed *locally* in the browser to ensure privacy and low latency.
- **Real-time Telemetry**: Uses WebSockets to report proctoring events directly to the teacher's dashboard.
- **Rich Editor**: Integration with CodeMirror for a professional IDE-like experience.

### 2.2. Backend API (Node.js / Express)
The central orchestrator for data, authentication, and communication.
- **RESTful API**: Manages exams, user sessions, and statistical metrics.
- **Socket.io Server**: Manages real-time bi-directional communication between students and proctors.
- **Task Producer**: Queues code execution requests into Redis for processing by workers.
- **Persistent Storage**: MongoDB for relational-like document mapping (Users, Exams, Sessions).

### 2.3. Execution Worker (Dockerized Worker)
A specialized service dedicated to running student-submitted code safely.
- **Job Consumer**: Listens to the `code-execution` queue (BullMQ).
- **Sandboxed Execution**: Spawns isolated Docker containers to run code with strict resource limits (CPU/Memory).
- **Language Support**: Native support for Python, JavaScript (Node), and SQL (SQLite).

---

## 3. Technology Stack

### **Frontend**
- **Core**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion (for smooth animations)
- **AI**: `face-api.js` (TensorFlow.js based)
- **Editor**: `@uiw/react-codemirror`
- **Communication**: `socket.io-client`
- **Icons**: Lucide React

### **Backend**
- **Runtime**: Node.js (ES Modules)
- **Database**: MongoDB Atlas
- **Cache/Queue**: Upstash Redis
- **Queue Manager**: BullMQ
- **Auth**: JWT (JSON Web Tokens), Bcrypt
- **Email**: Nodemailer (for results/registration)

### **Execution Layer**
- **Containerization**: Docker
- **Process Mgmt**: Node.js `child_process` (spawn/exec)

---

## 4. Core Features & "Anti-Cheat" Layers

### 🛡️ AI Proctoring Engine
1.  **Face Landmark Tracking**: Detects if the student is looking away or if a second person enters the frame.
2.  **Identity Verification**: Compares the current face against the saved "profile" descriptor.
3.  **Fullscreen Enforcement**: Blocks the exam content until the student enters dedicated fullscreen mode.
4.  **Tab Switch Detection**: Triggers a violation if the student leaves the browser tab or focuses on another window.

### 🔒 Secure Editor Protection
1.  **Clipboard Blocking**: Right-click, Copy, Cut, and Paste are disabled globally but *allowed only inside* the code editor.
2.  **Keyboard Interception**: Blocks `Ctrl+C`, `Ctrl+V`, etc., outside the editor area.

### 🐧 Sandboxed Execution
- All code runs in ephemeral Docker containers.
- **No Networking**: Containers are isolated from the internet to prevent data exfiltration.
- **Resource Constraints**: Limits RAM to 256MB and execution time to 3 seconds.

---

## 5. Data Architecture
- **User**: Profile, Role (Student/Teacher), Face Embedding (stored as a float array).
- **Exam**: Title, Duration, Questions, Join Code.
- **ExamSession**: Status (started/submitted), Warnings Counter, Violation History.
- **ProctorLog**: Individual event logs with timestamps for teacher review.

---

## 6. Directory Structure

```text
├── backend/                # Express API
│   ├── config/             # DB & Redis connection logic
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic (e.g., Plagiarism check)
│   └── index.js            # Main entry point
├── frontend/               # Next.js Application
│   ├── app/                # App Router (Dashboard, Login, Exam pages)
│   ├── components/         # Reusable UI components
│   └── public/             # Static assets (Face-api models)
└── execution-worker/       # BullMQ Job Consumer
    ├── temp_code/          # Temporary storage for code files
    ├── index.js            # Docker spawn logic
    └── .env                # Redis credentials
```

---

## 7. Current Project Status
- ✅ **Core Infrastructure**: All components connected and communicating.
- ✅ **Security**: Fullscreen enforcement and clipboard protection active.
- ✅ **AI**: Face-api models loaded and tracking.
- ✅ **Execution**: Python, JS, and SQL execution via Docker verified.
- 🚀 **Next Phase**: Production deployment and load testing.
