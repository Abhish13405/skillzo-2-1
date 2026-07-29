# Skillzo Frontend (Phase 1)

React (Vite) + Tailwind CSS frontend for the Skillzo AI Interview Platform.
Covers Module 1 (Auth), Module 2 (Dashboard), Module 3 (Resume Analysis),
Module 4 (AI Interview — Text mode). Audio/Video mode buttons are visible
but disabled ("Phase 2") to match the current backend scope.

## Setup

Make sure the Django backend is already running on `http://127.0.0.1:8000`
(see the backend's own README) before starting the frontend.

```bash
cd skillzo_frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Design System

- **Colors**: Ink Navy background, Signal Amber accent (scores/CTAs), Circuit Cyan (AI/live states)
- **Type**: Space Grotesk (headings) + Inter (body) + JetBrains Mono (scores/data)
- **Signature element**: the "Readiness Dial" — a radial gauge used for every
  score in the app (Dashboard, Resume ATS score, Interview report)

## Folder Structure

```
src/
├── api/            # Axios calls, one file per backend module
│   ├── axios.js     # JWT interceptor + auto token refresh
│   ├── auth.js
│   ├── dashboard.js
│   ├── resume.js
│   └── interview.js
├── context/
│   └── AuthContext.jsx   # Global auth state (JWT, user)
├── components/
│   ├── AppShell.jsx       # Sidebar + content layout
│   ├── Sidebar.jsx
│   ├── ProtectedRoute.jsx
│   ├── Loader.jsx
│   └── ReadinessDial.jsx  # Signature score gauge
└── pages/
    ├── Login.jsx
    ├── Signup.jsx
    ├── ForgotPassword.jsx
    ├── Dashboard.jsx
    ├── Profile.jsx
    ├── ResumeAnalysis.jsx
    ├── InterviewSetup.jsx    # 3-step wizard: Role -> Difficulty -> Mode
    ├── InterviewSession.jsx  # Question-by-question text answer + live AI eval
    ├── InterviewReport.jsx
    └── History.jsx
```

## Backend URL

The API base URL is hardcoded in `src/api/axios.js`:
```js
export const API_BASE_URL = 'http://127.0.0.1:8000/api'
```
Change this if your backend runs on a different host/port.

## Not Yet Implemented (Phase 2 / Phase 3)

- Audio Interview (Web Speech API integration)
- Video Interview (React Webcam + MediaRecorder)
- Certificate PDF download
- Admin panel UI (use Django admin at `/admin/` for now)
- Leaderboard, badges, career roadmap
