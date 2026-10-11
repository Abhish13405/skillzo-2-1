import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

const ProtectedRoute = ({ children, featureName = 'this feature', requireLeader = false }) => {
  const { user, loading, openAuthModal } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      openAuthModal(featureName)
    }
  }, [loading, user, openAuthModal, featureName])

  if (loading) return <Loader full />
  if (!user) return <Navigate to="/dashboard" replace />

  if (requireLeader) {
    const userEmail = (user?.email || '').toLowerCase().trim()
    const isAuthorizedLeader = (userEmail === 'abhishekkushwaha13405@gmail.com' || userEmail === 'abhish@gmail.com')

    if (!isAuthorizedLeader) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-surface-soft dark:bg-[#080D1A] font-body">
          <div className="w-full max-w-md bg-white dark:bg-[#0D1527] p-8 rounded-3xl border border-red-200 dark:border-red-900/60 shadow-craft text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              🔒
            </div>
            <h2 className="text-xl font-display font-extrabold text-slate-900 dark:text-white mb-2">
              Leader Portal Access Restricted
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              This portal is strictly reserved for Project Leader (<strong>abhishekkushwaha13405@gmail.com</strong>). Other accounts do not have permission to view or manage leader controls.
            </p>
            <a
              href="/dashboard"
              className="btn-primary inline-block w-full py-2.5 text-center shadow-md shadow-blue-500/20 text-xs font-bold"
            >
              ← Return to Dashboard
            </a>
          </div>
        </div>
      )
    }
  }

  return children
}

export default ProtectedRoute

