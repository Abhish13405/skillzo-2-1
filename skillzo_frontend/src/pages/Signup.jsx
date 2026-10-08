import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Signup = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm_password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(form)
      navigate('/dashboard')
    } catch (err) {
      const data = err.response?.data
      const firstError = data ? Object.values(data)[0] : null
      setError(Array.isArray(firstError) ? firstError[0] : firstError || 'Signup failed. Try again.')
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
            <input name="username" required className="input-field" value={form.username} onChange={handleChange} placeholder="username" />
          </div>
          <div>
            <label className="label">Email address</label>
            <input type="email" name="email" required className="input-field" value={form.email} onChange={handleChange} placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" name="password" required className="input-field" value={form.password} onChange={handleChange} placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input type="password" name="confirm_password" required className="input-field" value={form.confirm_password} onChange={handleChange} placeholder="Re-enter password" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2 shadow-md shadow-blue-500/20 py-3">
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>
        </form>

        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold ml-1">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
