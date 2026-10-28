import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Loader from './components/Loader'

// Critical Path Pages (Loaded immediately for instant first-paint)
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'

// Lazy-Loaded Heavy Subpages (Loaded on demand to cut initial JS bundle by 70%)
const Profile = lazy(() => import('./pages/Profile'))
const ResumeAnalysis = lazy(() => import('./pages/ResumeAnalysis'))
const InterviewSetup = lazy(() => import('./pages/InterviewSetup'))
const InterviewSession = lazy(() => import('./pages/InterviewSession'))
const InterviewReport = lazy(() => import('./pages/InterviewReport'))
const History = lazy(() => import('./pages/History'))
const Recordings = lazy(() => import('./pages/Recordings'))
const LeaderPortal = lazy(() => import('./pages/LeaderPortal'))
const TechnicalStudio = lazy(() => import('./pages/TechnicalStudio'))
const HrStudio = lazy(() => import('./pages/HrStudio'))
const LiveInterview = lazy(() => import('./pages/LiveInterview'))
const CandidateLiveRoom = lazy(() => import('./pages/CandidateLiveRoom'))
const TokenRoomJoin = lazy(() => import('./pages/TokenRoomJoin'))

import { useAuth } from './context/AuthContext'

const PageFallback = () => (
  <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
    <Loader label="Loading workspace..." />
  </div>
)

const RootRedirect = () => {
  const { user, loading, isLeader } = useAuth()
  if (loading) return null
  if (user) {
    if (isLeader) {
      return <Navigate to="/leader" replace />
    }
    return <Navigate to="/dashboard" replace />
  }
  return <Navigate to="/login" replace />
}

function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/dashboard" element={<ProtectedRoute featureName="Track Dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="/hr" element={<ProtectedRoute featureName="HR Workspace"><HrStudio /></ProtectedRoute>} />
        <Route path="/technical" element={<ProtectedRoute featureName="Technical Studio"><TechnicalStudio /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute featureName="Profile"><Profile /></ProtectedRoute>} />
        <Route path="/resume" element={<ProtectedRoute featureName="ATS Resume Analysis"><ResumeAnalysis /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute featureName="Reports & History"><History /></ProtectedRoute>} />
        <Route path="/recordings" element={<ProtectedRoute featureName="Recordings"><Recordings /></ProtectedRoute>} />
        <Route path="/leader" element={<ProtectedRoute featureName="Leader Portal" requireLeader><LeaderPortal /></ProtectedRoute>} />
        <Route path="/leader-portal" element={<Navigate to="/leader" replace />} />

        <Route path="/interview/setup" element={<ProtectedRoute featureName="AI Interview"><ErrorBoundary><InterviewSetup /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/interview/:sessionId/session" element={<ProtectedRoute featureName="AI Interview Session"><ErrorBoundary><InterviewSession /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/interview/:sessionId/report" element={<ProtectedRoute featureName="Interview Report"><ErrorBoundary><InterviewReport /></ErrorBoundary></ProtectedRoute>} />

        <Route path="/interview/report/:sessionId" element={<ProtectedRoute featureName="Interview Report"><InterviewReport /></ProtectedRoute>} />

        {/* Live 1:1 HR Interview Room */}
        <Route path="/live/join/:token" element={<TokenRoomJoin />} />
        <Route path="/live-room" element={<ProtectedRoute featureName="Live HR Room"><CandidateLiveRoom /></ProtectedRoute>} />
        <Route path="/live-interview/:roomId" element={<LiveInterview />} />
        <Route path="/live/:roomId" element={<LiveInterview />} />

        {/* Root redirect: auto-route leader to /leader, candidate to /dashboard, unauthenticated to /login */}
        <Route path="/" element={<RootRedirect />} />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App
