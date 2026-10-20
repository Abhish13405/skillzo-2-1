import React from 'react'

import { Routes, Route, Navigate } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'

import ErrorBoundary from './components/ErrorBoundary'



import Login from './pages/Login'

import Signup from './pages/Signup'

import ForgotPassword from './pages/ForgotPassword'

import Dashboard from './pages/Dashboard'

import Profile from './pages/Profile'

import ResumeAnalysis from './pages/ResumeAnalysis'

import InterviewSetup from './pages/InterviewSetup'

import InterviewSession from './pages/InterviewSession'

import InterviewReport from './pages/InterviewReport'

import History from './pages/History'

import Recordings from './pages/Recordings'

import LeaderPortal from './pages/LeaderPortal'

import TechnicalStudio from './pages/TechnicalStudio'

import HrStudio from './pages/HrStudio'

import LiveInterview from './pages/LiveInterview'

import CandidateLiveRoom from './pages/CandidateLiveRoom'

import NotFound from './pages/NotFound'



import { useAuth } from './context/AuthContext'



const RootRedirect = () => {

  const { user, loading } = useAuth()

  if (loading) return null

  if (user) {

    return <Navigate to="/dashboard" replace />

  }

  return <Navigate to="/login" replace />

}



function App() {

  return (

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

      <Route path="/live-room" element={<ProtectedRoute featureName="Live HR Room"><CandidateLiveRoom /></ProtectedRoute>} />

      <Route path="/live-interview/:roomId" element={<LiveInterview />} />

      <Route path="/live/:roomId" element={<LiveInterview />} />



      {/* Root redirect: auto-resume dashboard if logged in, else login */}

      <Route path="/" element={<RootRedirect />} />

      

      {/* 404 Fallback */}

      <Route path="*" element={<NotFound />} />

    </Routes>

  )

}



export default App

