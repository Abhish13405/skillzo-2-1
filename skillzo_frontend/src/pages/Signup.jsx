import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Signup = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm_password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const { signup, loginAsGuest } = useAuth()
  const navigate = useNavigate()

  const handleGuestLogin = async () => {
    setError('')
    setGuestLoading(true)
    try {
      await loginAsGuest()
      navigate('/dashboard')
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
      navigate('/dashboard')
    } catch (err) {
      const data = err.response?.data
      let msg = ''
      if (typeof data?.error === 'string') {
        msg = data.error
      } else if (typeof data?.detail === 'string') {
        msg = data.detail
      } else if (data) {
        const firstVal = Object.values(data)[0]
        msg = Array.isArray(firstVal) ? firstVal[0] : (typeof firstVal === 'string' ? firstVal : '')
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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-surface-soft dark:bg-[#080D1A] font-body">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
        
        {/* ─── SIDE 1 (LEFT): PROJECT TEAM & PLATFORM SHOWCASE ─── */}
        <div className="flex flex-col justify-between p-7 sm:p-10 rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B132B] to-slate-950 text-white border border-slate-800 shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* Header Brand */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-display font-extrabold text-xl shadow-md shadow-blue-500/30">
                S
              </div>
              <div>
                <span className="font-display font-extrabold text-xl tracking-tight block">Skillzo AI</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold">Interview Studio</span>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight leading-snug text-white mt-2">
              Next-Gen AI Mock Interview Platform
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2.5 leading-relaxed">
              Practice real-time technical & HR rounds with live speech recognition, camera recording, and deep algorithmic scorecards.
            </p>

            {/* Project Team Showcase: Abhishek & Jaya ONLY */}
            <div className="mt-8 pt-6 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[11px] font-mono uppercase tracking-widest font-bold text-blue-400">
                  Project Team Members
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                  Core Creators
                </span>
              </div>

              <div className="space-y-3">
                {/* Team Member 1: Abhishek */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 hover:bg-white/[0.08] border border-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-display font-bold text-base shadow-sm">
                    A
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">Abhishek</h4>
                    <p className="text-[11px] font-mono text-blue-300/80 mt-0.5">Project Lead & AI Developer</p>
                  </div>
                </div>

                {/* Team Member 2: Jaya */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 hover:bg-white/[0.08] border border-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-display font-bold text-base shadow-sm">
                    J
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">Jaya</h4>
                    <p className="text-[11px] font-mono text-indigo-300/80 mt-0.5">Core Developer & Engineering</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-slate-800/60 mt-6 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Skillzo Assessment Suite</span>
            <span>2026 Edition</span>
          </div>
        </div>

        {/* ─── SIDE 2 (RIGHT): ORIGINAL SIGNUP FORM ─── */}
        <div className="bg-white dark:bg-[#0D1527] p-7 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-craft flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
                Create your account
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Enter your details to register or access instantly as guest
              </p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
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

              <button
                type="submit"
                disabled={loading || guestLoading}
                className="btn-primary w-full mt-2 shadow-md shadow-blue-500/20 py-3 font-bold text-sm"
              >
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-[#0D1527] px-3 text-slate-400 font-mono text-[10px] font-bold">
                  Or Instant Access
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading || guestLoading}
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-500/50 hover:border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/60 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <span>⚡</span>
              <span>{guestLoading ? 'Activating Guest Mode...' : 'Continue as Guest (No Email Needed)'}</span>
            </button>
          </div>

          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-6 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold ml-1">
              Log in
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}

export default Signup
