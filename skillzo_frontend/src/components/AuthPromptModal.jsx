import React from 'react'
import { useNavigate } from 'react-router-dom'

const AuthPromptModal = ({ isOpen, onClose, featureName = 'this feature' }) => {
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleLogin = () => {
    onClose()
    navigate('/login')
  }

  const handleSignup = () => {
    onClose()
    navigate('/signup')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800 relative transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Icon Header */}
        <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 border border-brand-200/80 dark:border-brand-900 flex items-center justify-center text-2xl shadow-sm mb-5 mx-auto sm:mx-0">
          🚀
        </div>

        {/* Modal Text */}
        <div className="text-center sm:text-left">
          <h3 className="text-xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
            First Signup Required
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            Please sign up or log in first to access <span className="font-bold text-brand-600 dark:text-brand-400">{featureName}</span> and start practicing AI interviews.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSignup}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold text-sm shadow-md shadow-brand-600/20 transition-all text-center"
          >
            Create Free Account
          </button>
          <button
            onClick={handleLogin}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm border border-slate-200 dark:border-slate-700 transition-all text-center"
          >
            Sign In
          </button>
        </div>

        {/* Cancel link */}
        <div className="mt-4 text-center">
          <button 
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium underline"
          >
            Continue as Guest on Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuthPromptModal
