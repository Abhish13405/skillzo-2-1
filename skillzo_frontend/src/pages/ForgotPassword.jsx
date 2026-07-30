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
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-soft font-body">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-craft">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white font-display font-extrabold text-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-brand-500/20">
            S
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">Account Recovery</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Reset your Skillzo password via email verification</p>
        </div>

        {message && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-semibold">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-sm font-medium">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="label">Registered Email</label>
              <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full shadow-md shadow-brand-500/20 py-3">
              {loading ? 'Sending Code...' : 'Send Verification OTP →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="label">OTP Verification Code</label>
              <input required className="input-field font-mono tracking-widest text-center" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" maxLength={6} />
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" required className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full shadow-md shadow-brand-500/20 py-3">
              {loading ? 'Resetting...' : 'Reset Password →'}
            </button>
          </form>
        )}

        <p className="text-xs font-semibold text-slate-500 mt-6 text-center">
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-bold">← Back to Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword

