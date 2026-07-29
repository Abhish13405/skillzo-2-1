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
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-display font-bold text-2xl">Skillzo</span>
          <p className="eyebrow mt-2">Start your readiness log</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Username</label>
            <input name="username" required className="input-field" value={form.username} onChange={handleChange} placeholder="yourname" />
          </div>
          <div>
            <label className="label">Email</label>
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
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-ink_text-muted mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
