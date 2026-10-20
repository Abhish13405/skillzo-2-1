import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const Signup = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm_password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const { signup, loginAsGuest, user, loading: authLoading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    if (!authLoading && user) {
      navigate(from, { replace: true })
    }
  }, [user, authLoading, navigate, from])

  const handleGuestLogin = async () => {
    setError('')
    setGuestLoading(true)
    try {
      await loginAsGuest()
      navigate(from, { replace: true })
    } catch {
      setError('Could not start guest session. Please try again.')
      setGuestLoading(false)
    }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    setLoading(true)
    try {
      await signup({
        ...form,
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
      })
      navigate(from, { replace: true })
    } catch (err) {
      const data = err.response?.data
      let msg = ''
      if (typeof data?.error === 'string') {
        msg = data.error
      } else if (typeof data?.detail === 'string') {
        msg = data.detail
      } else if (data?.password && Array.isArray(data.password)) {
        msg = data.password.join(' ')
      } else if (data?.email && Array.isArray(data.email)) {
        msg = data.email.join(' ')
      } else if (data?.username && Array.isArray(data.username)) {
        msg = data.username.join(' ')
      } else if (data && typeof data === 'object') {
        const firstVal = Object.values(data)[0]
        msg = Array.isArray(firstVal) ? firstVal.join(' ') : (typeof firstVal === 'string' ? firstVal : '')
      }
      if (!msg) {
        if (!err.response || err.code === 'ECONNABORTED' || err.response?.status >= 500) {
          msg = 'Cloud server is connecting. Please wait a few seconds and try again.'
        } else {
          msg = 'Signup failed. Please try again.'
        }
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface-soft dark:bg-[#050505] font-body relative">
      {/* Floating Theme Toggle (Top Right) */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#121212] text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-neutral-800 shadow-2xs hover:border-neutral-700 transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
      </div>

      {/* Left: brand panel (Identical layout to Login page) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-50 via-indigo-50/70 to-blue-100/60 dark:from-[#080808] dark:via-[#0A0A0A] dark:to-[#050505] border-r border-blue-200/60 dark:border-neutral-800 text-slate-800 dark:text-slate-100 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-200/40 dark:bg-blue-600/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-indigo-200/30 dark:bg-cyan-500/5 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo-icon.png" alt="Skillzo Logo" className="w-11 h-11 object-contain drop-shadow-md" />
          <span className="font-display font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">Skillzo AI</span>
        </div>

        <div className="relative z-10 my-auto py-12">
          <span className="inline-block px-3.5 py-1 rounded-full bg-white dark:bg-[#121212] border border-blue-200 dark:border-neutral-800 text-xs font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-6 shadow-xs">
            Readiness Studio
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold leading-tight mb-6 tracking-tight text-slate-900 dark:text-white">
            Walk into every interview<br />already prepared for success.
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-base max-w-md leading-relaxed font-medium">
            AI-Based real-time mock sessions and performance dials that
            show you exactly where you stand.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-500 dark:text-slate-400 font-mono border-t border-blue-200/80 dark:border-neutral-800 pt-4 leading-relaxed">
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">© Skillzo Studio</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            <strong className="text-slate-800 dark:text-slate-200">Team:</strong> Abhishek Kushwaha • Jaya Maurya
          </p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-soft dark:bg-[#050505]">
        <div className="w-full max-w-md bg-white dark:bg-[#0D0D0D] p-8 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-neutral-800 shadow-craft">
          <div className="flex items-center gap-2.5 mb-6 lg:hidden">
            <img src="/logo-icon.png" alt="Skillzo Logo" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-xl text-slate-900 dark:text-white">Skillzo</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">Create your account</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-6">Join Skillzo AI to start tracking your interview readiness</p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                name="username"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className="input-field"
                value={form.username}
                onChange={handleChange}
                placeholder="username"
              />
            </div>
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                name="email"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className="input-field"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                name="password"
                required
                className="input-field"
                value={form.password}
                onChange={handleChange}
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                name="confirm_password"
                required
                className="input-field"
                value={form.confirm_password}
                onChange={handleChange}
                placeholder="Re-enter password"
              />
            </div>
            <button type="submit" disabled={loading || guestLoading} className="btn-primary w-full mt-2 shadow-md shadow-blue-500/20 py-3 font-bold text-sm">
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-[#0D0D0D] px-3 text-slate-400 font-mono text-[10px] font-bold">Or Instant Access</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading || guestLoading}
            className="w-full py-3 px-4 rounded-xl border border-emerald-500/50 hover:border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/60 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <span>⚡</span>
            <span>{guestLoading ? 'Activating Guest Mode...' : 'Continue as Guest (No Email Needed)'}</span>
          </button>

          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-6 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold ml-1">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup
