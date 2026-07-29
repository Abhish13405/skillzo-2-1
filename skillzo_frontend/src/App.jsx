import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'

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
import Leaderboard from './pages/Leaderboard'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/resume" element={<ProtectedRoute><ResumeAnalysis /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />

      <Route path="/interview/setup" element={<ProtectedRoute><InterviewSetup /></ProtectedRoute>} />
      <Route path="/interview/:sessionId/session" element={<ProtectedRoute><InterviewSession /></ProtectedRoute>} />
      <Route path="/interview/:sessionId/report" element={<ProtectedRoute><InterviewReport /></ProtectedRoute>} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* 404 Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
