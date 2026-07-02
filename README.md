# Cipher - AI-Powered Proctored Coding Exam Platform

[🌍 **View Live Demo**](https://cipher-exam-platform.vercel.app/)

> **🚀 Live Demo Note:** 
> This application is deployed using the free tiers of Vercel (Frontend) and Render (Backend). Because Render spins down inactive instances to conserve resources, the initial API request (like logging in) may take up to **50 seconds** as the server cold-starts. Subsequent requests will be lightning fast!

## Overview
Cipher is a next-generation, secure, and AI-powered coding assessment platform designed to ensure fair and tamper-proof technical examinations. It features real-time code execution, AI-driven face verification, and a robust anti-cheat proctoring system.

## Key Features
- **Secure Code Execution:** Isolated Docker-based environment for safe compilation and execution of student code.
- **AI Face Verification:** Zero-knowledge face verification to ensure the authenticity of the test taker.
- **Advanced Proctoring:** Real-time behavioral analytics, tab-switch monitoring, and full-screen enforcement.
- **Role-Based Dashboards:** Dedicated interfaces for Students (taking exams), Teachers (creating/monitoring exams), and Admins (system oversight).

## Tech Stack
- **Frontend:** Next.js, React, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express, Socket.io
- **Database:** MongoDB
