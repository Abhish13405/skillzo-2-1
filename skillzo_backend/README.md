# Skillzo AI Interview Platform — Backend (Phase 1 MVP)

Django + DRF backend covering Module 1 (Auth), Module 2 (Dashboard),
Module 3 (Resume Analysis), Module 4 (AI Interview — Text mode).
Audio/Video modes (Phase 2) plug into the same models and the same
`GroqService` — no schema rework needed later.

## Setup

```bash
cd skillzo_backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env -> add your GROQ_API_KEY

python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Project Structure

```
skillzo_backend/
├── skillzo/            # Project settings, root urls
├── common/
│   └── groq_service.py # SINGLE shared Groq API wrapper (used by all modules)
├── accounts/            # Module 1: Signup, Login (JWT), Forgot Password, Profile
├── dashboard/            # Module 2: Stats aggregation (reads from interview app)
├── resume_analysis/      # Module 3: Upload, extract text, ATS score via Groq
└── interview/            # Module 4: Sessions, Questions, Answers, Evaluation, Reports
```

## Key Design Decision

Every module (Resume Analysis, Text Interview, and — in Phase 2 — Audio/Video
Interview) calls the **same** `groq_service` singleton from `common/groq_service.py`.
Audio/Video will convert speech to text on the frontend (Web Speech API /
MediaRecorder + browser transcript) and then hit the exact same
`evaluate_answer()` endpoint that Text mode uses today. One API key,
one client, three interview modes.

## API Endpoints (Phase 1)

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup/` | Create account, returns JWT |
| POST | `/api/auth/login/` | Login, returns JWT, updates streak |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| POST | `/api/auth/forgot-password/` | Request OTP |
| POST | `/api/auth/reset-password/` | Reset password with OTP |
| GET/PUT | `/api/auth/profile/` | View/update profile |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/summary/` | All dashboard stats in one call |

### Resume Analysis
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/resume/` | List / upload resumes |
| POST | `/api/resume/<id>/analyze/` | Run Groq ATS + skill analysis |

### AI Interview
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/interview/start/` | Create session + generate questions |
| POST | `/api/interview/<id>/answer/` | Submit + evaluate one answer |
| POST | `/api/interview/<id>/complete/` | Finalize report + AI suggestions |
| GET | `/api/interview/history/` | Past completed interviews |
| GET | `/api/interview/<id>/` | Full session detail |

## Not Yet Implemented (Phase 2 / Phase 3)

- Audio/Video recording upload endpoints (model fields already exist:
  `InterviewAnswer.audio_file`, `InterviewAnswer.video_file`)
- Certificate PDF generation
- Question bank browsing endpoints
- Admin panel custom views beyond Django admin
- Leaderboard, badges, career roadmap, live coding editor
