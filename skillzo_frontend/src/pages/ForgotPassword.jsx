import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgotPassword, resetPassword } from '../api/auth'

const ForgotPassword = () => {
  const [step, setStep] = useState(1) // 1 = request OTP, 2 = reset
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRequestOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await forgotPassword(email)
      setMessage(res.data.debug_otp ? `Dev mode -- your OTP is ${res.data.debug_otp}` : 'OTP sent to your email.')
      setStep(2)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword({ email, otp, new_password: newPassword })
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-display font-bold text-2xl">Skillzo</span>
          <p className="eyebrow mt-2">Account recovery</p>
        </div>

        {message && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-cyan/10 border border-cyan/30 text-cyan text-sm font-mono">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="label">OTP</label>
              <input required className="input-field" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6} />
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" required className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="text-sm text-ink_text-muted mt-6 text-center">
          <Link to="/login" className="text-cyan hover:underline">Back to login</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
