# 🚀 Skillzo AI Studio — Next-Gen AI Mock Interview & Career Readiness Platform

[![Skillzo AI Banner](https://raw.githubusercontent.com/Abhish13405/skillzo-2-1/main/skillzo_frontend/public/logo-icon.png)](https://skillzo-2-1.vercel.app)

> **Walk into every interview already prepared for success.**  
> Skillzo AI is a full-stack, real-time AI-powered mock interview simulator, resume ATS analyzer, and career readiness platform designed to evaluate and elevate candidate performance with instantaneous AI feedback.

---

## 🌟 Live Links & Production Deployment

* **🌐 Live Frontend (Vercel):** [https://skillzo-2-1.vercel.app](https://skillzo-2-1.vercel.app)
* **⚙️ Live Backend API (Render):** [https://skillzo-2-1-2.onrender.com/api](https://skillzo-2-1-2.onrender.com/api)
* **💻 GitHub Repository:** [https://github.com/Abhish13405/skillzo-2-1](https://github.com/Abhish13405/skillzo-2-1)

---

## 👥 Project Team & Authors
* **Project Leader & Lead Developer:** Abhishek Kushwaha ([@Abhish13405](https://github.com/Abhish13405))
* **Core Contributor:** Jaya Maurya

---

## 🎯 Key Highlights & Architecture

```
                                  +---------------------------------------+
                                  |         Skillzo AI Web Client         |
                                  |      (React 18 + Vite + Tailwind)     |
                                  +-------------------+-------------------+
                                                      |
                                       HTTPS / JWT REST Endpoints
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |       Django 5.0 REST Backend         |
                                  |  (Auth, Interview Engine, Resume ATS) |
                                  +---------+-------------------+---------+
                                            |                   |
                        +-------------------+                   +-------------------+
                        v                                                           v
+-------------------------------+                               +-------------------------------+
|       Groq AI Cloud API       |                               |      Database & Media CDN     |
|   (Ultra-Fast LLM Inference)  |                               |   (PostgreSQL / SQLite, S3)   |
+-------------------------------+                               +-------------------------------+
```

---

## 🧭 Main Hub: 4 Interactive Workspaces

Skillzo provides a streamlined, distraction-free **Main Hub (`/dashboard`)** featuring four dedicated preparation modules:

### 1. 👔 HR Readiness Studio (`/hr`)
* **Behavioral & Culture Drills:** Practice situational, leadership, and conflict resolution scenarios.
* **STAR Framework:** AI prompts engineered to test Situation, Task, Action, and Result framing.
* **Emotional Intelligence & Culture Fitment:** Dials measuring tone, professional presence, and maturity.

### 2. 💻 Technical Readiness Studio (`/technical`)
* **Role-Specific Engineering:** Frontend, Backend, Full Stack, Python, DevOps, Data Science, and System Design tracks.
* **Difficulty Scaling:** Beginner, Intermediate, and Advanced question tiers.
* **In-Depth Code & Concept Evaluation:** Real-time accuracy validation with detailed ideal answers.

### 3. 🎙️ Live HR Mock Room (`/live-interview/:roomId`)
* **Live Camera & Audio Feed:** WebRTC `getUserMedia` video preview and dynamic audio waveform display.
* **AI Text-To-Speech (TTS):** Browser `SpeechSynthesis` voices read each question out loud naturally.
* **Real-Time Speech-to-Text (STT):** Continuous speech recognition transcribes answers as candidates speak.
* **Adaptive Controls:** Live countdown timers, answer skip buttons, and instant question progression.

### 4. 📄 Resume ATS Analyzer (`/resume`)
* **Multi-Format Ingestion:** Instant extraction from `.pdf` (via `pdfplumber`) and `.docx` (via `python-docx`).
* **ATS Compatibility Score (0–100%):** Matches resume keywords against desired role requirements.
* **Skill Gap Analysis:** Highlights extracted technical competencies vs. missing high-impact keywords.
* **Formatting Suggestions:** Actionable line-by-line recommendations for cleaner ATS parsing.

---

## 🛡️ Administrative & Leadership System

### 👑 Project Leader Portal (`/leader`)
A secure administrative control center restricted strictly to the Project Leader:
* **Live Candidate Roster:** Real-time monitoring of registered candidates, signup timestamps, and login activity.
* **Interview Archive:** Complete transcripts, scores, and question-by-question breakdown for every session.
* **Cloud Recording Vault:** Direct access to candidate audio and video recordings stored on cloud storage.
* **Platform Metrics:** Total users, total interviews conducted, and aggregate candidate readiness distribution.
* **Role-Based Access Control (RBAC):** Backend permissions (`IsLeaderUser`) block unauthorized users with `403 Forbidden`.

---

## ✨ Additional Features

* **⚡ 1-Click Guest Mode:** Candidates can immediately enter and practice without mandatory registration or email verification.
* **🌑 Obsidian Pitch Black Dark Theme:** True pitch black (`#050505`) and Obsidian dark mode, paired with a sleek Porcelain Light theme and SVG Sun/Moon switches.
* **📜 Certificate Generation Engine:** Candidates scoring $\ge 60\%$ automatically unlock a client-side printable **Skillzo Certificate of Achievement**.
* **🔥 Daily Streaks & Habits:** Active streak counter tracking consecutive days of interview preparation.
* **📧 Real-Time OTP Password Recovery:** 6-digit OTP verification powered by Brevo HTTP API and SMTP failover.

---

## 🛠️ Technology Stack

### Frontend
| Technology | Description |
| :--- | :--- |
| **React 18** | High-performance UI library with modern hooks and contexts |
| **Vite** | Ultra-fast next-generation frontend tooling and build pipeline |
| **Tailwind CSS** | Utility-first styling framework with custom Dark Mode palettes |
| **Recharts** | Interactive SVG-based radar, bar, and area charts |
| **Axios** | HTTP client configured with automatic token refresh interceptors |
| **React Router v6** | Client-side routing with protected route boundaries |
| **Canvas Confetti** | Celebration visual effects on passing interviews |

### Backend
| Technology | Description |
| :--- | :--- |
| **Python 3.12** | Core backend language |
| **Django 5.0+** | Scalable Python web framework |
| **Django REST Framework (DRF)** | Robust RESTful API architecture |
| **SimpleJWT** | Stateless JSON Web Token authentication with rotating refresh tokens |
| **Groq Cloud API** | Ultra-low latency LLM inference engine (`qwen/qwen3.8-27b`, Llama 3) |
| **pdfplumber & python-docx** | Document parsing and keyword extraction |
| **WhiteNoise** | High-efficiency static file serving for production |
| **dj-database-url** | 12-factor database URL configuration supporting SQLite & PostgreSQL |

---

## 📂 Project Structure

```
skillzo-2-1/
├── skillzo_backend/              # Django REST API Backend
│   ├── manage.py
│   ├── skillzo/                  # Core Project Configuration
│   │   ├── settings.py           # Database, CORS, JWT, Groq, Email settings
│   │   ├── urls.py               # Master URL routing
│   │   └── wsgi.py
│   ├── accounts/                 # User Auth, Profiles, OTP Reset, Guest Mode
│   │   ├── models.py             # Custom User model & PasswordResetOTP
│   │   ├── serializers.py        # Signup, Login, Profile serializers
│   │   ├── views.py              # Auth & Profile API views
│   │   └── emails.py             # Brevo / SMTP email dispatch
│   ├── interview/                # AI Interview Engine
│   │   ├── models.py             # InterviewSession, Question, Answer models
│   │   ├── serializers.py        # Session & Evaluation serializers
│   │   ├── views.py              # Setup, Live session, and Groq evaluation views
│   │   └── groq_client.py        # Groq API prompt orchestration
│   ├── resume_analysis/          # Resume ATS Scanner
│   │   ├── models.py             # Resume model & ATS score history
│   │   ├── parsers.py            # PDF & DOCX text extractors
│   │   └── views.py              # File upload & ATS scoring views
│   └── dashboard/                # Aggregations & Leader Portal
│       └── views.py              # Summary stats & LeaderPortalStatsView
│
├── skillzo_frontend/             # React 18 + Vite Frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js        # Pitch Black & Porcelain Light theme configs
│   └── src/
│       ├── api/                  # Axios instances and endpoint services
│       ├── components/           # AppShell, Sidebar, Navbar, Loader, AuthModal
│       ├── context/              # AuthContext & ThemeContext
│       ├── pages/                # Main Hub, HR, Technical, LiveRoom, LeaderPortal, etc.
│       └── utils/                # IndexedDB recording vault, storage helpers
│
├── requirements.txt              # Backend Python dependencies
├── Procfile                      # Process configuration for Render deployment
└── README.md                     # Comprehensive project documentation
```

---

## 🚀 Local Development Setup

Follow these instructions to run Skillzo AI locally on your development machine.

### 1. Clone the Repository
```bash
git clone https://github.com/Abhish13405/skillzo-2-1.git
cd skillzo-2-1
```

---

### 2. Backend Setup (Django)

1. **Navigate to the backend directory:**
   ```bash
   cd skillzo_backend
   ```

2. **Create and activate a Python virtual environment:**
   * **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   * **macOS / Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables (`.env`):**
   Create a `.env` file inside `skillzo_backend/`:
   ```ini
   DEBUG=True
   SECRET_KEY=your-secret-key-here
   GROQ_API_KEY=your-groq-api-key
   GROQ_MODEL=qwen/qwen3.8-27b
   BREVO_API_KEY=your-brevo-api-key
   BREVO_SENDER_EMAIL=your-verified-sender@example.com
   CORS_ALLOW_ALL_ORIGINS=True
   ```

5. **Run database migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Start the Django development server (Port 8001):**
   ```bash
   python manage.py runserver 127.0.0.1:8001
   ```
   *Backend API is now live at: `http://127.0.0.1:8001/api`*

---

### 3. Frontend Setup (React + Vite)

1. **Open a new terminal and navigate to the frontend directory:**
   ```bash
   cd skillzo_frontend
   ```

2. **Install Node packages:**
   ```bash
   npm install
   ```

3. **Configure Frontend Environment (`.env` or `.env.local`):**
   ```ini
   VITE_API_BASE_URL=http://127.0.0.1:8001/api
   ```

4. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   *Frontend is now accessible at: `http://localhost:5173`*

---

## 📡 Key API Endpoints

### 🔐 Authentication (`/api/auth/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/signup/` | Register new user account |
| `POST` | `/api/auth/login/` | Authenticate user & return JWT tokens |
| `POST` | `/api/auth/guest-login/` | Instant 1-click guest access token |
| `POST` | `/api/auth/forgot-password/` | Generate & email 6-digit verification OTP |
| `POST` | `/api/auth/verify-otp/` | Validate OTP code |
| `POST` | `/api/auth/reset-password/` | Set new password with verified OTP |
| `GET/PATCH` | `/api/auth/profile/` | Fetch or update user profile details |

### 🎙️ AI Mock Interview (`/api/interview/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/interview/setup/` | Initialize session and generate 5 AI questions |
| `GET` | `/api/interview/session/<id>/` | Retrieve session status and question roster |
| `POST` | `/api/interview/submit-answer/` | Submit candidate answer for instant AI evaluation |
| `POST` | `/api/interview/complete/<id>/` | Finalize session & compute aggregate scores |
| `GET` | `/api/interview/report/<id>/` | Retrieve comprehensive readiness scorecard |

### 📄 Resume ATS Analysis (`/api/resume/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/resume/upload/` | Upload PDF/DOCX and run Groq ATS evaluation |
| `GET` | `/api/resume/history/` | List all past resume scans and scores |

### 📊 Dashboard & Leader Portal (`/api/dashboard/`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/summary/` | Candidate stats, daily streak, recent reports |
| `GET` | `/api/dashboard/leader-stats/` | Master candidate roster and video vault (Admin only) |

---

## 🔒 Security & Privacy

* **Stateless JWT Authorization:** Protected endpoints require standard `Bearer <access_token>` headers.
* **Safe Credential Handling:** Passwords hashed with PBKDF2 with SHA-256 by default.
* **CORS & CSRF Protection:** Strict origin regex validation for both local and production domains.
* **RBAC:** Strict access controls protecting administrative candidate records.

---

## 📄 License & Intellectual Property

This project is licensed under the **MIT License**.  
© **Skillzo Studio** — Created with passion by **Abhishek Kushwaha** & **Jaya Maurya**.
