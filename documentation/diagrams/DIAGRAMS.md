# Skillzo 2.1 - Editable Diagrams Source Repository

This directory contains the complete source code and structural specifications for all system diagrams in the Skillzo 2.1 AI Interview & Talent Intelligence Platform. All diagrams are authored in Mermaid standard syntax and can be rendered using Mermaid CLI, GitHub Markdown, or the Antigravity previewer.

---

## 1. System Architecture (`01_system_architecture.mmd`)

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Browser / SPA)"]
        UI["React 18 Single Page App<br/>(Vite, Tailwind CSS, Lucide)"]
        SpeechAPI["Web Speech API<br/>(SpeechRecognition)"]
        MediaRec["MediaRecorder API<br/>(WebM Audio/Video)"]
        WebRTCClient["WebRTC PeerConnection<br/>(1:1 Video/Audio Stream)"]
        LocalIDB["IndexedDB<br/>(skillzo_recordings_db)"]
    end

    subgraph GatewayLayer ["Network & Routing Layer"]
        VercelCDN["Vercel Global Edge CDN<br/>(skillzo-2-1.vercel.app)"]
        RenderRouter["Render Reverse Proxy / TLS<br/>(skillzo-2-1-2.onrender.com)"]
        CORS["Django CORS Headers<br/>(Whitelisted Origins & Methods)"]
    end

    subgraph AppLayer ["Application Layer (Django 5 DRF)"]
        WSGI["Gunicorn / WSGI Application"]
        JWTAuth["JWT Authentication<br/>(SimpleJWT Access/Refresh)"]
        
        subgraph DjangoApps ["Core Django Applications"]
            AppAuth["accounts<br/>(Auth, User, OTP, Profile)"]
            AppDash["dashboard<br/>(Metrics, Activity, Leader Stats)"]
            AppResume["resume_analysis<br/>(PDF/DOCX Extraction & ATS)"]
            AppInterview["interview<br/>(Session, Questions, Answer Eval)"]
        end
        
        subgraph CommonServices ["Common Services & Adapters"]
            GroqWrapper["common.groq_service.GroqService<br/>(Singleton Client, Error Recovery)"]
            CloudAdapter["common.cloud_storage<br/>(Cloudinary CDN Upload)"]
            EmailAdapter["Django Mail & Brevo API<br/>(Transactional OTPs)"]
        end
    end

    subgraph DataStorageLayer ["Data & Storage Layer"]
        PostgresSQL["PostgreSQL (Production - Render)<br/>/ SQLite3 (Local Dev)"]
        LocalMedia["Local Media Directory<br/>(/media/resumes, /media/interview_video)"]
        CloudinaryCDN["Cloudinary Cloud Media CDN<br/>(Remote MP4/WebM Video Vault)"]
    end

    subgraph ExternalAILayer ["External AI & Cloud Services"]
        GroqAPI["Groq Cloud LLM API<br/>(Qwen 2.5 32B / Llama 3.3 70B)"]
        BrevoAPI["Brevo (Sendinblue) REST API<br/>(Transactional Email Delivery)"]
        STUN["Google Public STUN<br/>(stun:stun.l.google.com:19302)"]
    end

    UI --> VercelCDN
    VercelCDN --> RenderRouter
    RenderRouter --> WSGI
    WSGI --> CORS
    CORS --> JWTAuth
    JWTAuth --> DjangoApps

    UI -.-> SpeechAPI
    UI -.-> MediaRec
    UI -.-> LocalIDB
    UI <--> WebRTCClient
    WebRTCClient -.-> STUN

    AppAuth --> EmailAdapter
    EmailAdapter --> BrevoAPI

    AppResume --> GroqWrapper
    AppInterview --> GroqWrapper
    GroqWrapper --> GroqAPI

    AppInterview --> CloudAdapter
    CloudAdapter --> CloudinaryCDN

    DjangoApps --> PostgresSQL
    DjangoApps --> LocalMedia
```

---

## 2. Frontend Routing Map (`02_frontend_routing.mmd`)

```mermaid
graph LR
    Root["/ (Entry Route)"] --> Login["/login (Login)"]
    Root --> Signup["/signup (Signup)"]
    Root --> Forgot["/forgot-password (OTP Reset)"]

    subgraph ProtectedRoutes ["Protected Routes (Require JWT Auth)"]
        Dashboard["/dashboard (4-Track Launcher)"]
        
        HRTrack["/hr (Track 1: HR Workspace)"]
        TechTrack["/technical (Track 2: Technical Studio)"]
        CandidateTrack["/live-room (Track 3: Candidate Pre-check)"]
        RecruiterTrack["/leader (Track 3: Recruiter Portal)"]
        ATSResume["/resume (Track 4: ATS Resume Review)"]

        SetupMock["/interview/setup (Session Configurator)"]
        ActiveRoom["/interview/:sessionId/session (50/50 Live Room)"]
        ReportView["/interview/:sessionId/report (AI Report Card)"]

        History["/history (Historical Audits)"]
        Recordings["/recordings (IndexedDB Media Vault)"]
        Profile["/profile (User Account Settings)"]
        LiveCall["/live-interview/:roomId (WebRTC 1:1 Live)"]
    end

    Dashboard --> HRTrack
    Dashboard --> TechTrack
    Dashboard --> CandidateTrack
    Dashboard --> RecruiterTrack
    Dashboard --> ATSResume

    HRTrack --> SetupMock
    TechTrack --> SetupMock
    SetupMock --> ActiveRoom
    ActiveRoom --> ReportView
    Dashboard --> History
    Dashboard --> Recordings
    Dashboard --> Profile
    CandidateTrack --> LiveCall
    RecruiterTrack --> LiveCall

    Wildcard["* (Catch-all)"] --> NotFound["NotFound (404 Fallback)"]
```

---

## 3. Interview Evaluation Sequence (`03_interview_evaluation_sequence.mmd`)

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Candidate / User
    participant UI as React UI (InterviewSession.jsx)
    participant Speech as Web Speech API
    participant Media as MediaRecorder
    participant IDB as IndexedDB (recordings)
    participant API as Django Backend (/api/interview/)
    participant Groq as Groq Cloud AI (Qwen/Llama)
    participant DB as Database (PostgreSQL/SQLite)
    participant Cloud as Cloudinary Media CDN

    Candidate->>UI: Select Role, Difficulty & Question Count
    UI->>API: POST /api/interview/start/ {role, difficulty, count, mode}
    API->>Groq: generate_questions(role, difficulty, count)
    Groq-->>API: JSON: [{order, question_text, category}]
    API->>DB: INSERT InterviewSession & InterviewQuestions
    API-->>UI: 201 Created {session_id, questions[]}

    loop For Each Question
        UI->>Candidate: Display & Read Aloud Question
        Candidate->>UI: Click "Start Recording / Speak"
        UI->>Speech: Start SpeechRecognition
        UI->>Media: Start MediaRecorder (Video/Audio)
        Candidate->>UI: Speaks Answer
        Speech-->>UI: Live Transcript Events (Interim -> Final)
        Candidate->>UI: Click "Submit Answer"
        UI->>Media: Stop MediaRecorder -> Generates WebM Blob
        UI->>IDB: saveRecording({sessionId, blob, questionText})
        
        opt Video or Audio Mode Cloud Upload
            UI->>API: POST /api/interview/:id/upload-recording/ (FormData)
            API->>Cloud: upload_media_to_cloud(video_file)
            Cloud-->>API: Return Secure HTTPS CDN URL
            API->>DB: Save cloud_video_url / local video_file
        end

        UI->>API: POST /api/interview/:id/answer/ {question_id, answer_text}
        API->>Groq: evaluate_answer(question, answer_text, role)
        Groq-->>API: JSON: {scores: [tech, comm, grammar, confidence], strengths, improvements}
        API->>DB: INSERT InterviewAnswer with Metrics
        API-->>UI: 200 OK {score, feedback, next_question}
    end

    UI->>API: POST /api/interview/:id/complete/
    API->>Groq: generate_final_report_summary(session_data)
    Groq-->>API: JSON: {overall_score, verdict, recommendations}
    API->>DB: UPDATE InterviewSession status='completed'
    API-->>UI: 200 OK {status: 'completed'}
    UI->>Candidate: Redirect to /interview/:id/report (Analytics & PDF Download)
```

---

## 4. Database Entity-Relationship Diagram (`04_database_erd.mmd`)

```mermaid
erDiagram
    User ||--o{ PasswordResetOTP : "requests"
    User ||--o{ InterviewSession : "attempts"
    User ||--o{ Resume : "uploads"
    InterviewSession ||--|{ InterviewQuestion : "contains"
    InterviewQuestion ||--o| InterviewAnswer : "evaluated_by"

    User {
        int id PK
        string email UK
        string username
        string phone
        string profile_photo
        string college_or_company
        string target_role
        text bio
        int current_streak
        int longest_streak
        date last_active_date
        datetime date_joined
        boolean is_active
        boolean is_staff
    }

    PasswordResetOTP {
        int id PK
        int user_id FK
        string otp
        datetime created_at
        boolean is_used
    }

    InterviewSession {
        int id PK
        int user_id FK
        string job_role
        string difficulty
        string mode
        string status
        datetime started_at
        datetime completed_at
        int overall_score
        int technical_score
        int communication_score
        string confidence_trend
        json ai_suggestions
        string verdict
    }

    InterviewQuestion {
        int id PK
        int session_id FK
        int order
        text question_text
        string category
    }

    InterviewAnswer {
        int id PK
        int question_id FK,UK
        text answer_text
        string audio_file
        string video_file
        string cloud_video_url
        string cloud_audio_url
        int speaking_time_seconds
        datetime answered_at
        int technical_knowledge
        int communication
        int grammar
        int confidence
        int problem_solving
        int overall_score
        json strengths
        json improvements
        text ideal_answer_summary
    }

    Resume {
        int id PK
        int user_id FK
        string file
        datetime uploaded_at
        json extracted_skills
        int ats_score
        json feedback
        json suggested_job_roles
        json missing_keywords
        boolean is_analyzed
    }
```
