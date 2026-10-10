import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      const data = err.response?.data
      let msg = ''
      if (typeof data?.error === 'string') {
        msg = data.error
      } else if (typeof data?.detail === 'string') {
        msg = data.detail
      } else if (data?.email && Array.isArray(data.email)) {
        msg = data.email.join(' ')
      } else if (data?.non_field_errors && Array.isArray(data.non_field_errors)) {
        msg = data.non_field_errors.join(' ')
      } else if (err.response?.status === 401) {
        msg = 'Invalid email/username or password.'
      } else if (!err.response || err.code === 'ECONNABORTED' || err.response?.status >= 500) {
        msg = 'Cloud server is waking up from sleep mode (takes ~30s on first load). Please wait 5 seconds and click Sign In again!'
      } else {
        msg = 'Sign in failed. Please check your credentials and try again.'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface-soft dark:bg-[#080D1A] font-body">
      {/* Left: brand panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-50 via-indigo-50/70 to-blue-100/60 dark:from-[#0A0F1D] dark:via-[#0D1527] dark:to-[#080D1A] border-r border-blue-200/60 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-200/40 dark:bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-indigo-200/30 dark:bg-cyan-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-display font-extrabold text-xl text-white shadow-md shadow-blue-500/20">
            S
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">Skillzo AI</span>
        </div>

        <div className="relative z-10 my-auto py-12">
          <span className="inline-block px-3.5 py-1 rounded-full bg-white dark:bg-[#131E38] border border-blue-200 dark:border-slate-800 text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-6 shadow-xs">
            Readiness Studio
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold leading-tight mb-6 tracking-tight text-slate-900 dark:text-white">
            Walk into every interview<br />already prepared for success.
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-base max-w-md leading-relaxed font-medium">
            AI-driven real-time mock sessions, ATS resume scoring, and performance dials that
            show you exactly where you stand.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-500 dark:text-slate-400 font-mono border-t border-blue-200/80 dark:border-slate-800 pt-4 leading-relaxed">
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">© 2026 Skillzo Studio</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            <strong className="text-slate-800 dark:text-slate-200">Team:</strong> Abhishek Kushwaha · Jaya Maurya Raj kumar verma Kundan Bhardwaj
          </p>
        </div>
      </div>


      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-soft dark:bg-[#080D1A]">
        <div className="w-full max-w-md bg-white dark:bg-[#0D1527] p-8 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-craft">
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-display font-extrabold text-sm">
              S
            </div>
            <span className="font-display font-bold text-xl text-slate-900 dark:text-white">Skillzo</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">Welcome back</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Log in to access your interview workspace.</p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email or Username</label>
              <input
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com or username"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700">Forgot password?</Link>
              </div>
              <input
                type="password"
                required
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 shadow-md shadow-blue-500/20 py-3">
              {loading ? 'Connecting & Signing In...' : 'Sign In →'}
            </button>
          </form>

          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-8 text-center">
            New to Skillzo?{' '}
            <Link to="/signup" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold ml-1">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login

