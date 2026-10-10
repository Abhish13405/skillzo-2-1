import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgotPassword, verifyOtp, resetPassword } from '../api/auth'

const ForgotPassword = () => {
  const [step, setStep] = useState(1) // 1 = Request, 2 = Verify & Reset, 3 = Success
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const navigate = useNavigate()

  // Resend OTP countdown
  useEffect(() => {
    let interval = null
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    } else if (resendTimer === 0) {
      setCanResend(true)
    }
    return () => clearInterval(interval)
  }, [step, resendTimer])

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e?.preventDefault()
    if (!email.trim()) {
      setError('Please enter your registered email address.')
      return
    }
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await forgotPassword(email.trim())
      const data = res.data
      if (data.debug_otp) {
        setDevOtp(data.debug_otp)
        setMessage(`Real-time OTP dispatched! (Dev mode preview: ${data.debug_otp})`)
      } else {
        setDevOtp('')
        setMessage(`Verification code dispatched to ${data.email || email}. Check your inbox!`)
      }
      setResendTimer(60)
      setCanResend(false)
      setStep(2)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Could not find account. Please verify your email.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Live OTP check when 6 digits are typed
  const handleOtpChange = async (val) => {
    const cleanVal = val.replace(/\D/g, '').slice(0, 6)
    setOtp(cleanVal)
    if (cleanVal.length === 6) {
      try {
        await verifyOtp({ email: email.trim(), otp: cleanVal })
        setOtpVerified(true)
        setError('')
      } catch {
        setOtpVerified(false)
      }
    } else {
      setOtpVerified(false)
    }
  }

  // Step 2: Reset Password
  const handleReset = async (e) => {
    e.preventDefault()
    setError('')

    if (otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit OTP code.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.')
      return
    }

    setLoading(true)
    try {
      await resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword,
      })
      setStep(3)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.response?.data?.new_password?.[0] || 'Invalid OTP code or password.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-soft dark:bg-[#080D1A] font-body transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#0D1527] p-8 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-craft">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-display font-extrabold text-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
            S
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
            Account Recovery
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Real-time OTP Verification & Password Reset
          </p>
        </div>

        {/* Status Alerts */}
        {message && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold leading-relaxed">
            ✉️ {message}
          </div>
        )}
        {devOtp && step === 2 && (
          <div className="mb-5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 flex items-center justify-between text-xs">
            <span className="font-mono text-blue-800 dark:text-blue-300">
              Demo Code: <strong className="text-base tracking-widest">{devOtp}</strong>
            </span>
            <button
              type="button"
              onClick={() => handleOtpChange(devOtp)}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-900/60 px-2 py-1 rounded-md border border-blue-200 dark:border-blue-700 hover:bg-blue-50"
            >
              Auto-Fill
            </button>
          </div>
        )}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-xs font-semibold leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: Enter Email / Username */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="label">Registered Email Address</label>
              <input
                type="text"
                required
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com or username"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full shadow-md shadow-blue-500/20 py-3 text-sm"
            >
              {loading ? 'Dispatching Verification Code...' : 'Send Verification OTP →'}
            </button>
          </form>
        )}

        {/* STEP 2: Verify OTP & New Password */}
        {step === 2 && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">6-Digit OTP Code</label>
                {otpVerified && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    ✓ Code Verified
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                maxLength={6}
                className={`input-field font-mono text-center tracking-[0.4em] text-lg font-bold ${
                  otpVerified ? 'border-emerald-500 focus:ring-emerald-500' : ''
                }`}
                value={otp}
                onChange={(e) => handleOtpChange(e.target.value)}
                placeholder="••••••"
                autoFocus
              />
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Code expires in 10 mins</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
                  >
                    Resend Code
                  </button>
                ) : (
                  <span>Resend in {resendTimer}s</span>
                )}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">New Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-blue-600"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full shadow-md shadow-blue-500/20 py-3 text-sm mt-2"
            >
              {loading ? 'Verifying & Updating...' : 'Reset & Save Password →'}
            </button>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-3xl flex items-center justify-center mx-auto mb-2 border border-emerald-200 dark:border-emerald-800">
              ✓
            </div>
            <h3 className="font-display font-extrabold text-xl text-slate-900 dark:text-white">
              Password Reset Successfully!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              Your account password has been updated. You can now log into Skillzo Studio using your new credentials.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full py-3 shadow-md shadow-blue-500/20"
            >
              Sign In Now →
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
          <Link
            to="/login"
            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
