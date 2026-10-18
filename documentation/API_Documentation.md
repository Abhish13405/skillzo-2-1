# Skillzo 2.1 — RESTful API Specification & Reference Manual

This technical specification details all production and development REST API endpoints exposed by the Skillzo 2.1 backend service. It serves as an authoritative reference for frontend engineers, QA test automation suites, third-party integrations, and DevOps engineers.

---

## 1. Global Architectural Overview

### 1.1 Base URLs
| Environment | Base URL | Protocol | Port / Binding |
| :--- | :--- | :--- | :--- |
| **Local Development** | `http://127.0.0.1:8001/api/` | HTTP/1.1 | Python Django WSGI / Port 8001 |
| **Production Cloud** | `https://skillzo-2-1-2.onrender.com/api/` | HTTPS/TLS 1.3 | Render Gunicorn + Uvicorn Proxy |

### 1.2 Authentication Scheme
- **Standard**: RFC 6750 JSON Web Token (JWT) Bearer Authentication.
- **Provider**: `rest_framework_simplejwt`.
- **Header Format**:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Token Lifetimes**:
  - `access`: 6 Hours (sliding session)
  - `refresh`: 7 Days (token rotation enabled upon refresh)

### 1.3 Standard Response Status Codes
| HTTP Code | Description | Standard Usage in Skillzo |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded | Successful GET queries, answer evaluations, session updates |
| `201 Created` | Resource instantiated | User registration, session creation, resume uploads |
| `400 Bad Request` | Validation failure | Malformed JSON, missing fields, invalid OTP |
| `401 Unauthorized`| Authentication error | Missing, expired, or invalid JWT bearer token |
| `403 Forbidden` | Access denied | Attempting to access another user's session or resume |
| `404 Not Found` | Resource nonexistent | Non-existent session ID, resume ID, or user account |
| `500 Server Error`| Downstream exception | Groq LLM API timeout or database connectivity fault |

---

## 2. Module 1: Authentication & User Accounts (`/api/auth/`)

### 2.1 User Registration (`POST /api/auth/signup/`)
Registers a new candidate or recruiter account in the platform.

- **URL**: `/api/auth/signup/`
- **Method**: `POST`
- **Authentication**: None (Public)
- **Headers**: `Content-Type: application/json`

#### Request Payload
```json
{
  "email": "candidate@example.com",
  "username": "candidate_alex",
  "password": "SecurePassword123!",
  "phone": "+919876543210",
  "college_or_company": "National Institute of Technology",
  "target_role": "Python Developer"
}
```

#### Response: `201 Created`
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 42,
    "email": "candidate@example.com",
    "username": "candidate_alex",
    "phone": "+919876543210",
    "college_or_company": "National Institute of Technology",
    "target_role": "Python Developer",
    "current_streak": 0,
    "longest_streak": 0
  },
  "tokens": {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Response: `400 Bad Request`
```json
{
  "email": ["A user with that email already exists."],
  "password": ["This password is too short. It must contain at least 8 characters."]
}
```

---

### 2.2 User Login (`POST /api/auth/login/`)
Authenticates an existing user via email or username and issues JWT access and refresh credentials.

- **URL**: `/api/auth/login/`
- **Method**: `POST`
- **Authentication**: None (Public)
- **Headers**: `Content-Type: application/json`

#### Request Payload
```json
{
  "email": "candidate@example.com",
  "password": "SecurePassword123!"
}
```

#### Response: `200 OK`
```json
{
  "user": {
    "id": 42,
    "email": "candidate@example.com",
    "username": "candidate_alex",
    "phone": "+919876543210",
    "college_or_company": "National Institute of Technology",
    "target_role": "Python Developer",
    "current_streak": 3,
    "longest_streak": 7
  },
  "tokens": {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2.3 Guest Sandbox Login (`POST /api/auth/guest-login/`)
Provisions an ephemeral or pre-configured guest demonstration account for immediate trial without email verification.

- **URL**: `/api/auth/guest-login/`
- **Method**: `POST`
- **Authentication**: None (Public)
- **Headers**: `Content-Type: application/json`

#### Request Payload
```json
{}
```

#### Response: `200 OK`
```json
{
  "user": {
    "id": 999,
    "email": "guest_demo@skillzo.ai",
    "username": "GuestExplorer",
    "target_role": "Full Stack Engineer"
  },
  "tokens": {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2.4 Token Refresh (`POST /api/auth/token/refresh/`)
Exchanges an active refresh token for a newly minted access token (and rotates the refresh token).

- **URL**: `/api/auth/token/refresh/`
- **Method**: `POST`
- **Authentication**: None
- **Headers**: `Content-Type: application/json`

#### Request Payload
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response: `200 OK`
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2.5 Forgot Password Step 1: Request OTP (`POST /api/auth/forgot-password/`)
Dispatches a 6-digit numeric verification OTP via transactional email (Gmail SMTP / Brevo API) and registers an unverified `PasswordResetOTP` record.

- **URL**: `/api/auth/forgot-password/`
- **Method**: `POST`
- **Authentication**: None
- **Headers**: `Content-Type: application/json`

#### Request Payload
```json
{
  "email": "candidate@example.com"
}
```

#### Response: `200 OK`
```json
{
  "message": "Verification code has been dispatched to your email address."
}
```

---

### 2.6 Forgot Password Step 2: Verify OTP (`POST /api/auth/verify-otp/`)
Validates that the provided 6-digit OTP matches an active, unused record generated within the past 10 minutes.

- **URL**: `/api/auth/verify-otp/`
- **Method**: `POST`
- **Authentication**: None

#### Request Payload
```json
{
  "email": "candidate@example.com",
  "otp": "481920"
}
```

#### Response: `200 OK`
```json
{
  "message": "OTP verified successfully. You may now reset your password.",
  "reset_token": "valid_otp_session_481920"
}
```

---

### 2.7 Forgot Password Step 3: Reset Password (`POST /api/auth/reset-password/`)
Sets the new account password and marks the OTP record as consumed (`is_used = true`).

- **URL**: `/api/auth/reset-password/`
- **Method**: `POST`

#### Request Payload
```json
{
  "email": "candidate@example.com",
  "otp": "481920",
  "new_password": "NewSecretPassword2026!"
}
```

#### Response: `200 OK`
```json
{
  "message": "Password has been successfully updated. Please login with your new credentials."
}
```

---

### 2.8 User Profile (`GET`, `PUT`, `PATCH /api/auth/profile/`)
Retrieves or updates candidate personal details, target specialization role, bio, and profile photo.

- **URL**: `/api/auth/profile/`
- **Method**: `GET`, `PATCH`, `PUT`
- **Authentication**: Required (`Bearer <JWT>`)
- **Headers**: `Authorization: Bearer <token>`

#### GET Response: `200 OK`
```json
{
  "id": 42,
  "email": "candidate@example.com",
  "username": "candidate_alex",
  "phone": "+919876543210",
  "college_or_company": "National Institute of Technology",
  "target_role": "Python Developer",
  "bio": "Passionate backend engineer with expertise in Django, FastAPI, and Distributed Systems.",
  "profile_photo": "http://127.0.0.1:8001/media/profile_photos/alex.jpg",
  "current_streak": 4,
  "longest_streak": 9,
  "last_active_date": "2026-10-18"
}
```

---

## 3. Module 2: Dashboard & Aggregated Analytics (`/api/dashboard/`)

### 3.1 Candidate Dashboard Summary (`GET /api/dashboard/summary/`)
Aggregates overall performance metrics, interview completion counters, readiness percentage, and recent session history for the logged-in user.

- **URL**: `/api/dashboard/summary/`
- **Method**: `GET`
- **Authentication**: Required (`Bearer <JWT>`)

#### Response: `200 OK`
```json
{
  "metrics": {
    "total_interviews": 12,
    "completed_interviews": 10,
    "average_score": 78.4,
    "technical_average": 81.0,
    "communication_average": 74.5,
    "current_streak": 4,
    "longest_streak": 9,
    "readiness_index": 82
  },
  "recent_interviews": [
    {
      "id": 56,
      "job_role": "Python Developer",
      "mode": "text",
      "difficulty": "Intermediate",
      "overall_score": 85,
      "status": "completed",
      "started_at": "2026-10-17T14:22:10Z"
    }
  ],
  "skill_radar": [
    {"subject": "Data Structures", "score": 85},
    {"subject": "System Design", "score": 70},
    {"subject": "Communication", "score": 78},
    {"subject": "Problem Solving", "score": 82},
    {"subject": "Domain Knowledge", "score": 88}
  ]
}
```

---

### 3.2 Recruiter & Leader Portal Statistics (`GET /api/dashboard/leader-stats/`)
Exposes cohort-wide talent benchmarking, department scoring distributions, and candidate interview completion funnels for recruiters and engineering managers.

- **URL**: `/api/dashboard/leader-stats/`
- **Method**: `GET`
- **Authentication**: Required (`Bearer <JWT>`)

#### Response: `200 OK`
```json
{
  "total_candidates_evaluated": 148,
  "average_cohort_score": 76.2,
  "top_performing_roles": [
    {"role": "Python Developer", "count": 64, "avg_score": 81.4},
    {"role": "DevOps Engineer", "count": 32, "avg_score": 79.0},
    {"role": "HR Behavioral", "count": 52, "avg_score": 74.2}
  ],
  "pass_rate_percentage": 68.5,
  "evaluation_breakdown": {
    "technical_mastery": 79.1,
    "communication_clarity": 73.8,
    "problem_solving": 75.4
  }
}
```

---

## 4. Module 3: ATS Resume Analysis Engine (`/api/resume/`)

### 4.1 Upload Resume (`POST /api/resume/`)
Accepts a PDF or DOCX file upload, stores it in the `media/resumes/` filesystem, and extracts raw text for LLM scoring.

- **URL**: `/api/resume/`
- **Method**: `POST`
- **Authentication**: Required (`Bearer <JWT>`)
- **Headers**: `Content-Type: multipart/form-data`

#### Request Parameters
- `file`: Binary file stream (`.pdf` or `.docx`, max 50 MB)

#### Response: `201 Created`
```json
{
  "id": 18,
  "file": "/media/resumes/Alex_Kushwaha_Resume_2026.pdf",
  "uploaded_at": "2026-10-18T09:15:30Z",
  "is_analyzed": false
}
```

---

### 4.2 Analyze Resume with AI (`POST /api/resume/<int:pk>/analyze/`)
Executes an ATS parsing run via Groq Cloud LLM, extracting hard skills, keyword coverage, and providing actionable resume improvements.

- **URL**: `/api/resume/<int:pk>/analyze/`
- **Method**: `POST`
- **Authentication**: Required (`Bearer <JWT>`)

#### Response: `200 OK`
```json
{
  "id": 18,
  "is_analyzed": true,
  "ats_score": 84,
  "extracted_skills": ["Python", "Django", "PostgreSQL", "Docker", "Redis", "REST APIs", "AWS"],
  "suggested_job_roles": [
    "Senior Python Developer",
    "Backend Software Engineer",
    "Cloud API Architect"
  ],
  "missing_keywords": [
    "Kubernetes",
    "CI/CD Pipeline",
    "Unit Testing (PyTest)"
  ],
  "feedback": [
    "Include quantifiable metrics in past experience (e.g., 'reduced API latency by 35%').",
    "Add explicit mention of asynchronous processing (Celery / Redis).",
    "Strengthen executive summary with target seniority level."
  ]
}
```

---

## 5. Module 4: AI Interview Engine (`/api/interview/`)

### 5.1 Initialize Interview Session (`POST /api/interview/start/`)
Creates an `InterviewSession` record and prompts the Groq LLM service to synthesize custom, non-repetitive interview questions tailored to the chosen role, track, and seniority level.

- **URL**: `/api/interview/start/`
- **Method**: `POST`
- **Authentication**: Required (`Bearer <JWT>`)
- **Headers**: `Content-Type: application/json`

#### Request Payload
```json
{
  "job_role": "Python Developer",
  "difficulty": "Intermediate",
  "mode": "text",
  "question_count": 5
}
```

#### Response: `201 Created`
```json
{
  "session_id": 57,
  "job_role": "Python Developer",
  "difficulty": "Intermediate",
  "mode": "text",
  "status": "in_progress",
  "questions": [
    {
      "id": 201,
      "order": 1,
      "question_text": "Introduce yourself and describe your recent experience with Python backend systems.",
      "category": "Behavioral / Introduction"
    },
    {
      "id": 202,
      "order": 2,
      "question_text": "What is the difference between mutable and immutable objects in Python, and how does it affect function arguments?",
      "category": "Core Python"
    },
    {
      "id": 203,
      "order": 3,
      "question_text": "Explain how Python's Global Interpreter Lock (GIL) influences multithreaded CPU-bound tasks versus I/O-bound tasks.",
      "category": "Concurrency & Architecture"
    }
  ]
}
```

---

### 5.2 Submit Candidate Answer (`POST /api/interview/<int:session_id>/answer/`)
Submits a written or voice-transcribed answer for a question. Immediately triggers Groq AI multi-dimensional scoring (Technical Mastery, Communication, Confidence, Grammar, Problem Solving) and returns instant feedback.

- **URL**: `/api/interview/<int:session_id>/answer/`
- **Method**: `POST`
- **Authentication**: Required (`Bearer <JWT>`)

#### Request Payload
```json
{
  "question_id": 202,
  "answer_text": "Mutable objects like lists and dictionaries can be changed in place without changing their memory address. Immutable objects like tuples and integers cannot be modified once created. In Python functions, arguments are passed by object reference, so mutating a list inside a function alters the caller's instance."
}
```

#### Response: `200 OK`
```json
{
  "question_id": 202,
  "technical_knowledge": 9,
  "communication": 9,
  "grammar": 10,
  "confidence": 8,
  "problem_solving": 8,
  "overall_score": 88,
  "strengths": [
    "Accurately differentiated mutable and immutable object behaviors.",
    "Correctly highlighted the pass-by-object-reference nuance in Python."
  ],
  "improvements": [
    "Could illustrate with a brief example involving default mutable arguments (e.g. def func(arg=[]))."
  ],
  "ideal_answer_summary": "Mutable objects can be modified in-place; immutable objects create new instances upon modification. Python uses pass-by-object-assignment."
}
```

---

### 5.3 Upload Video / Audio Clip (`POST /api/interview/<int:session_id>/upload-recording/`)
Accepts recorded WebM media chunks from client-side `MediaRecorder`. Stores locally under `media/interview_video/` and concurrently uploads to Cloudinary CDN if configured.

- **URL**: `/api/interview/<int:session_id>/upload-recording/`
- **Method**: `POST`
- **Authentication**: Required (`Bearer <JWT>`)
- **Headers**: `Content-Type: multipart/form-data`

#### Request Parameters
- `question_id`: Integer foreign key matching question.
- `video_file`: Binary WebM recording file.
- `duration_seconds`: Integer total recording length.

#### Response: `200 OK`
```json
{
  "message": "Media uploaded successfully",
  "local_path": "/media/interview_video/session_57_q202.webm",
  "cloud_video_url": "https://res.cloudinary.com/skillzo/video/upload/v171800/session_57_q202.webm"
}
```

---

### 5.4 Finalize & Grade Interview (`POST /api/interview/<int:session_id>/complete/`)
Aggregates all question-answer pairs for the session, calls Groq AI to calculate composite weighted scores, executive hiring verdict, and improvement roadmap, and marks the session as `completed`.

- **URL**: `/api/interview/<int:session_id>/complete/`
- **Method**: `POST`
- **Authentication**: Required (`Bearer <JWT>`)

#### Request Payload
```json
{}
```

#### Response: `200 OK`
```json
{
  "session_id": 57,
  "status": "completed",
  "overall_score": 86,
  "technical_score": 88,
  "communication_score": 83,
  "confidence_trend": "Increasing",
  "verdict": "Strong Hire: Demonstrates thorough grasp of Python runtime internals and clean technical articulation.",
  "ai_suggestions": [
    "Deepen knowledge of asynchronous coroutines (asyncio event loops).",
    "Maintain structured STAR methodology during behavioral responses."
  ],
  "completed_at": "2026-10-18T10:14:02Z"
}
```

---

### 5.5 Session History Directory (`GET /api/interview/history/`)
Lists all historical interview sessions conducted by the authenticated user, paginated with scoring metadata.

- **URL**: `/api/interview/history/`
- **Method**: `GET`
- **Authentication**: Required (`Bearer <JWT>`)

#### Response: `200 OK`
```json
[
  {
    "id": 56,
    "job_role": "Python Developer",
    "difficulty": "Intermediate",
    "mode": "text",
    "status": "completed",
    "overall_score": 85,
    "started_at": "2026-10-17T14:22:10Z",
    "completed_at": "2026-10-17T14:45:00Z"
  },
  {
    "id": 55,
    "job_role": "Python Developer",
    "difficulty": "Advanced",
    "mode": "video",
    "status": "in_progress",
    "overall_score": null,
    "started_at": "2026-10-16T11:10:00Z",
    "completed_at": null
  }
]
```

---

### 5.6 Live Evaluation Sync (`POST /api/interview/live-evaluation/`)
Enables recruiters or automated evaluation monitors in 1:1 live interview rooms to submit ad-hoc candidate performance notes and real-time scores.

- **URL**: `/api/interview/live-evaluation/`
- **Method**: `POST`
- **Authentication**: Required (`Bearer <JWT>`)

#### Request Payload
```json
{
  "room_id": "room_live_49182",
  "candidate_email": "candidate@example.com",
  "technical_rating": 8,
  "communication_rating": 9,
  "evaluator_notes": "Candidate explained microservices caching patterns with outstanding clarity."
}
```

#### Response: `200 OK`
```json
{
  "status": "recorded",
  "timestamp": "2026-10-18T10:20:00Z"
}
```
