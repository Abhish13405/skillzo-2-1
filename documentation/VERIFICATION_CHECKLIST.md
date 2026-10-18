# Skillzo 2.1 — QA Engineering Verification & Validation Checklist

This document details the comprehensive testing, verification audit, and quality assurance assessment conducted on the live Skillzo 2.1 full-stack codebase.

---

## 1. Executive QA Audit Summary

| Test Domain | Target Scope | Verified Items | Status |
| :--- | :--- | :--- | :--- |
| **User Interface & Routes** | 18 Platform Views & States | 18 Captured & Rendered | **100% PASSED** |
| **REST API Layer** | 18 Backend Endpoints | 18 Validated against DRF | **100% PASSED** |
| **Relational Database** | 6 Server Models | Schema Migrations Applied | **100% PASSED** |
| **Client-Side Persistence** | IndexedDB Media Store | Read/Write/Delete/Quota OK | **100% PASSED** |
| **AI LLM Inference** | Groq Cloud API | Prompting, Schema Recovery OK | **100% PASSED** |
| **Media & Audio/Video** | MediaRecorder + STT | WebM Recording & Transcripts OK | **100% PASSED** |
| **P2P Live Collaboration** | WebRTC + Google STUN | Peer Connection Handshake OK | **100% PASSED** |

---

## 2. Screen & Route Verification Matrix

Every accessible screen has been rendered on the live application server (`http://localhost:5174`) and genuine high-resolution screenshots have been saved in `documentation/screenshots/`.

| # | Screen Name | Route Path | Screenshot Artifact | File Size | Render Status |
| :---: | :--- | :--- | :--- | :---: | :---: |
| 1 | **Login View** | `/login` | `screen_01_login.png` | 355 KB | Verified |
| 2 | **User Registration** | `/signup` | `screen_02_signup.png` | 371 KB | Verified |
| 3 | **Password Reset (OTP)**| `/forgot-password` | `screen_03_forgot_password.png` | 29 KB | Verified |
| 4 | **4-Track Dashboard** | `/dashboard` | `screen_04_dashboard.png` | 57 KB | Verified |
| 5 | **Track 1: HR Studio** | `/hr` | `screen_05_hr_studio.png` | 179 KB | Verified |
| 6 | **Track 2: Technical Studio** | `/technical` | `screen_06_technical_studio.png` | 126 KB | Verified |
| 7 | **Track 3: Recruiter Portal** | `/leader` | `screen_07_leader_portal.png` | 145 KB | Verified |
| 8 | **Track 3: Candidate Live Room**| `/live-room` | `screen_08_candidate_live_room.png` | 95 KB | Verified |
| 9 | **Track 4: ATS Resume Engine** | `/resume` | `screen_09_resume_analysis.png` | 164 KB | Verified |
| 10| **Interview Setup (Tech)** | `/interview/setup` | `screen_10_interview_setup.png` | 74 KB | Verified |
| 11| **Interview Setup (HR)** | `/interview/setup?track=hr` | `screen_11_interview_setup_hr.png` | 54 KB | Verified |
| 12| **Interview History** | `/history` | `screen_12_history.png` | 36 KB | Verified |
| 13| **Recordings Vault** | `/recordings` | `screen_13_recordings.png` | 89 KB | Verified |
| 14| **User Profile & Settings** | `/profile` | `screen_14_profile.png` | 64 KB | Verified |
| 15| **404 Not Found Page** | `/*` | `screen_15_not_found.png` | 47 KB | Verified |
| 16| **Interview Report Card** | `/interview/:id/report` | `screen_16_interview_report.png` | 120 KB | Verified |
| 17| **Live Interview Session** | `/interview/:id/session` | `screen_17_interview_session.png` | 90 KB | Verified |
| 18| **WebRTC 1:1 Live Call** | `/live-interview/:roomId` | `screen_18_live_interview_room.png` | 55 KB | Verified |

---

## 3. Backend API Verification Matrix

| Endpoint | Method | Expected Status | Verified Status | Auth Required | Test Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/api/auth/signup/` | `POST` | `201 Created` | `201 Created` | No | Creates user & issues JWT pair |
| `/api/auth/login/` | `POST` | `200 OK` | `200 OK` | No | Validates credentials via email/username |
| `/api/auth/guest-login/` | `POST` | `200 OK` | `200 OK` | No | Instantly provisions guest tokens |
| `/api/auth/token/refresh/` | `POST` | `200 OK` | `200 OK` | No | Rotates JWT refresh & issues new access token |
| `/api/auth/forgot-password/`| `POST` | `200 OK` | `200 OK` | No | Sends 6-digit OTP via email |
| `/api/auth/verify-otp/` | `POST` | `200 OK` | `200 OK` | No | Validates OTP within 10-minute validity window |
| `/api/auth/reset-password/` | `POST` | `200 OK` | `200 OK` | No | Modifies password and expires OTP |
| `/api/auth/profile/` | `GET` | `200 OK` | `200 OK` | Yes | Fetches user bio, streak, and photo |
| `/api/dashboard/summary/` | `GET` | `200 OK` | `200 OK` | Yes | Returns readiness score and recent list |
| `/api/dashboard/leader-stats/`| `GET`| `200 OK` | `200 OK` | Yes | Returns recruiter cohort analytics |
| `/api/resume/` | `POST` | `201 Created` | `201 Created` | Yes | Multipart upload of PDF / DOCX resume |
| `/api/resume/<id>/analyze/` | `POST` | `200 OK` | `200 OK` | Yes | Triggers Groq ATS analysis & keyword check |
| `/api/interview/start/` | `POST` | `201 Created` | `201 Created` | Yes | Generates questions via Groq AI |
| `/api/interview/<id>/answer/` | `POST` | `200 OK` | `200 OK` | Yes | Real-time AI grading with metrics |
| `/api/interview/<id>/upload-recording/` | `POST` | `200 OK` | `200 OK` | Yes | Uploads WebM video clip to Cloudinary/disk |
| `/api/interview/<id>/complete/`| `POST`| `200 OK` | `200 OK` | Yes | Computes overall report & verdict |
| `/api/interview/history/` | `GET` | `200 OK` | `200 OK` | Yes | Lists historical attempts |
| `/api/interview/live-evaluation/` | `POST` | `200 OK` | `200 OK` | Yes | Synchronizes live evaluator ratings |

---

## 4. Subsystem & Integration Verification

### 4.1 Groq Cloud LLM Inference Engine
- **Configured Model**: `qwen/qwen3.8-27b` (fallback: `llama-3.3-70b-versatile`).
- **Resilience**: Custom `_chat()` method intercepts `BadRequestError` and recovers from unescaped JSON double quotes using regex parsing and automated prompt retry.
- **Verification Status**: Verified. Tested question generation and answer evaluation pipelines.

### 4.2 Web Speech API (Client-side STT)
- **Engine**: Browser-native `SpeechRecognition` / `webkitSpeechRecognition`.
- **Latency**: Near zero-latency streaming text transcription during user answer delivery.
- **Verification Status**: Verified in Chromium-based browsers (Edge / Chrome).

### 4.3 Client-Side IndexedDB Vault
- **Engine**: Browser `window.indexedDB` (`skillzo_recordings_db`).
- **Features**: Ultra-compressed WebM blob storage, automatic quota tracking, exportable `.webm` video download.
- **Verification Status**: Verified. Read/write operations function without server network dependence.

### 4.4 Cloud Storage (Cloudinary & Local Media)
- **Engine**: Dual-tier storage via `common.cloud_storage.upload_media_to_cloud`.
- **Fallback Policy**: Automatically falls back to local disk (`media/interview_video/`) if Cloudinary credentials are absent or network times out.
- **Verification Status**: Verified.

---

## 5. Known Limitations & Honest Architectural Disclosures

1. **Speech-to-Text Browser Compatibility**: Native `webkitSpeechRecognition` is supported out-of-the-box in Google Chrome, Microsoft Edge, and Safari 14.1+. On Firefox or older browsers where the Web Speech API is absent, candidates must type their answers in Text Mode or use an external microphone polyfill.
2. **WebRTC NAT Traversal**: The live interview room uses Google's public STUN server (`stun:stun.l.google.com:19302`). For candidates behind strict enterprise corporate firewalls or symmetric NATs, a TURN server (such as Coturn or Twilio Network Traversal) should be provisioned for 100% peer connectivity.
3. **Email Delivery**: When `BREVO_API_KEY` is active, transactional OTP emails are routed via Brevo HTTP API. If offline, the platform falls back to standard Gmail SMTP.
