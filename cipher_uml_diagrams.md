# Cipher Platform UML Diagrams

This document contains key UML diagrams that illustrate the system behavior, state transitions, and object interactions for the **Cipher AI-Powered Proctored Coding Exam Platform**.

## 1. Collaboration Diagram (Communication Diagram)

The collaboration diagram models the interactions and messages passed between different system components during an active exam session.

```mermaid
flowchart TD
    Student(("🧑 Student"))
    UI["💻 Exam Interface"]
    Proctor["👁️ AI Proctoring Engine"]
    Server["⚙️ Backend Server"]
    DB[("🗄️ Database")]

    Student -- "1. Start Exam\n3. Type Code\n5. Submit Exam" --> UI
    UI -- "1.1 Request Fullscreen\n1.2 Initialize Camera" --> Proctor
    UI -- "2. Fetch Questions\n5.1 Send Submission" --> Server
    Proctor -- "1.3 Load Object Detection Model\n4. Monitor Anomalies" --> Proctor
    Proctor -- "4.1 Report Cheating (e.g., Phone)" --> Server
    Server -- "2.1 Query Data\n4.2 Log Violation\n5.2 Save Code" --> DB
```

## 2. State Chart Diagram

The state chart outlines the lifecycle of an exam session from the student's perspective, emphasizing the strict security states and termination triggers.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Scheduled
    
    Scheduled --> Setup : Enter Exam Environment
    Setup --> Active : Fullscreen & Camera Ready
    Setup --> Failed : Hardware/Permissions Denied
    
    state Active {
        [*] --> Coding
        Coding --> Warning : Minor Violation (e.g., Tab Switch)
        Warning --> Coding : Student Acknowledges
    }
    
    Active --> Terminated : Fatal Violation (e.g., Phone Detected)
    Active --> Submitted : Manual / Time-up Submit
    
    Terminated --> PendingGrading
    Submitted --> PendingGrading
    
    PendingGrading --> Graded : Teacher Reviews
    Graded --> [*]
    Failed --> [*]
```

## 3. Activity Diagram

The activity diagram maps the concurrent processes occurring during an exam: the student completing their work and the background AI continuously monitoring for academic dishonesty.

```mermaid
flowchart TD
    Start((Start)) --> Login[Student Logs In]
    Login --> SelectExam[Select Active Exam]
    SelectExam --> Enforce[Enforce Hard-Blocking Full-Screen]
    Enforce --> InitProctor[Init Camera & AI Web Worker]
    
    InitProctor --> Fork(( ))
    
    %% Parallel Paths
    Fork --> ExamActivity[Answer Questions / Write Code]
    Fork --> ProctorActivity[Continuous AI Proctoring Loop]
    
    %% Exam Loop
    ExamActivity --> SubmitCheck{Finished or \n Time Up?}
    SubmitCheck -- No --> ExamActivity
    
    %% Proctor Loop
    ProctorActivity --> Detect{Anomaly \n Detected?}
    Detect -- No --> ProctorActivity
    Detect -- "Minor (Tab Blur)" --> Warn[Display Warning Overlay]
    Warn --> ProctorActivity
    Detect -- "Major (Phone)" --> Kill[Terminate Exam Immediately]
    
    %% Joins and ends
    SubmitCheck -- Yes --> Join(( ))
    Kill --> Join
    
    Join --> Save[Save Submission & Security Logs to DB]
    Save --> End((End))
```
