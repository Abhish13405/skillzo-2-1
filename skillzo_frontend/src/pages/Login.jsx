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
    <div className="min-h-screen flex">
      {/* Left: brand panel */}
      <div className="hidden lg:flex w-1/2 bg-surface border-r border-surface-border flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-cyan/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-amber/5 blur-3xl" />
        <div className="relative z-10">
          <span className="font-display font-bold text-2xl">Skillzo</span>
        </div>
        <div className="relative z-10">
          <p className="eyebrow mb-3">Mission Briefing</p>
          <h1 className="text-4xl font-display font-semibold leading-tight mb-4">
            Walk into every interview<br />already having done it once.
          </h1>
          <p className="text-ink_text-muted max-w-md">
            AI-driven mock interviews, resume scoring, and performance dials that
            tell you exactly where you stand before the real thing does.
          </p>
        </div>
        <p className="relative z-10 text-xs text-ink_text-muted font-mono">© 2026 Skillzo</p>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-display font-semibold mb-1">Welcome back</h2>
          <p className="text-ink_text-muted text-sm mb-8">Log in to continue your prep.</p>

          {error && (
            <div className="mb-4 px-4 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
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
                <Link to="/forgot-password" className="text-xs text-cyan hover:underline">Forgot?</Link>
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
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="text-sm text-ink_text-muted mt-6 text-center">
            New to Skillzo?{' '}
            <Link to="/signup" className="text-cyan hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
