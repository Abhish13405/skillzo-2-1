import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

const ProtectedRoute = ({ children, featureName = 'this feature', requireLeader = false }) => {
  const { user, loading, openAuthModal } = useAuth()
  const [passcode, setPasscode] = useState('')
  const [passcodeError, setPasscodeError] = useState('')
  const [unlocked, setUnlocked] = useState(
    typeof window !== 'undefined' && sessionStorage.getItem('leader_passcode_unlocked') === 'true'
  )

  useEffect(() => {
    if (!loading && !user) {
      openAuthModal(featureName)
    }
  }, [loading, user, openAuthModal, featureName])

  if (loading) return <Loader full />
  if (!user) return <Navigate to="/dashboard" replace />

  if (requireLeader) {
    const isLeader = Boolean(
      user.is_staff ||
      user.is_superuser ||
      (user.email && user.email.toLowerCase().includes('abhish')) ||
      (user.username && user.username.toLowerCase().includes('abhish'))
    )
    if (!isLeader && !unlocked) {
      const handleVerifyPasscode = (e) => {
        e.preventDefault()
        const clean = passcode.trim().toLowerCase()
        if (clean === 'anmo' || clean === 'anmol' || clean === 'skillzo@2026') {
          sessionStorage.setItem('leader_passcode_unlocked', 'true')
          setUnlocked(true)
        } else {
          setPasscodeError('Invalid Leader Passcode. Please try again.')
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-surface-soft dark:bg-[#080D1A] font-body">
          <div className="w-full max-w-md bg-white dark:bg-[#0D1527] p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-craft text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              🔐
            </div>
            <h2 className="text-xl font-display font-extrabold text-slate-900 dark:text-white mb-2">
              Leader Portal Access Verification
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              This area is restricted to project leadership. Enter the leader access passcode to continue.
            </p>
            {passcodeError && (
              <div className="mb-4 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 p-2.5 rounded-xl">
                {passcodeError}
              </div>
            )}
            <form onSubmit={handleVerifyPasscode} className="space-y-4">
              <input
                type="password"
                required
                className="input-field text-center tracking-widest font-mono text-base py-3"
                placeholder="Enter passcode..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn-primary w-full py-2.5">
                Unlock Leader Portal →
              </button>
            </form>
          </div>
        </div>
      )
    }
  }

  return children
}

export default ProtectedRoute

