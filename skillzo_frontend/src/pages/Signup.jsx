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
      window.location.href = '/dashboard'
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-soft dark:bg-[#080D1A] font-body">
      <div className="w-full max-w-md bg-white dark:bg-[#0D1527] p-8 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-craft">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-400 text-white font-display font-extrabold text-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
            S
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">Create your account</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Join Skillzo AI to start tracking your interview readiness</p>
        </div>

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
          <button type="submit" disabled={loading || guestLoading} className="btn-primary w-full mt-2 shadow-md shadow-blue-500/20 py-3">
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-[#0D1527] px-3 text-slate-400 font-mono text-[10px] font-bold">Or Instant Access</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={loading || guestLoading}
          className="w-full py-3 px-4 rounded-xl border border-emerald-500/50 hover:border-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/60 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
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
  )
}

export default Signup
