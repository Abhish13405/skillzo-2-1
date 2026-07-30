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
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface-soft font-body">
      {/* Left: brand panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-brand-700 via-brand-600 to-rose-700 text-white flex-col justify-between p-12 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-rose-400/20 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-display font-extrabold text-xl text-white border border-white/20">
            S
          </div>
          <span className="font-display font-extrabold text-2xl tracking-tight text-white">Skillzo AI</span>
        </div>

        <div className="relative z-10 my-auto py-12">
          <span className="inline-block px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-mono font-bold uppercase tracking-wider text-rose-100 mb-6">
            Readiness Studio
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold leading-tight mb-6 tracking-tight text-white">
            Walk into every interview<br />already prepared for success.
          </h1>
          <p className="text-rose-100 text-base max-w-md leading-relaxed">
            AI-driven real-time mock sessions, ATS resume scoring, and performance dials that
            show you exactly where you stand.
          </p>
        </div>

        <div className="relative z-10 text-xs text-rose-200/80 font-mono border-t border-white/10 pt-4">
          © 2026 Skillzo Studio · Made by Abhishek Kushwaha, Harshit Singh, Amritanshu Shukla, Rudra Pratap Singh & Shivam Kumar
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-soft">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-craft">
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-display font-extrabold text-sm">
              S
            </div>
            <span className="font-display font-bold text-xl text-slate-900">Skillzo</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Log in to access your interview workspace.</p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                required
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-brand-600 hover:text-brand-700">Forgot password?</Link>
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
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2 shadow-md shadow-brand-500/20 py-3">
              {loading ? 'Logging in...' : 'Sign In →'}
            </button>
          </form>

          <p className="text-xs font-semibold text-slate-500 mt-8 text-center">
            New to Skillzo?{' '}
            <Link to="/signup" className="text-brand-600 hover:text-brand-700 font-bold ml-1">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login

