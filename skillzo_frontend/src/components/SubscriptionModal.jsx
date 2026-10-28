import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { subscribePlan } from '../api/interview'

const SubscriptionModal = ({ isOpen, onClose, quota, onSubscribed }) => {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState('yearly_pro')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const isGuest = user?.is_guest || quota?.is_guest

  const handleSubscribe = async () => {
    if (isGuest) {
      onClose()
      navigate('/signup')
      return
    }

    setLoading(true)
    try {
      await subscribePlan(selectedPlan)
      setSuccess(true)
      if (refreshUser) await refreshUser()
      if (onSubscribed) onSubscribed()
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1500)
    } catch (err) {
      alert(err.response?.data?.error || 'Upgrade failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-[#111326] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#2b305b] relative text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full hover:bg-[#1f244a] transition-colors"
        >
          ✕
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-purple-600/30 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner">
            👑
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <span>Skillzo Pro Membership</span>
              <span className="px-1.5 py-0.2 bg-amber-500/20 rounded text-[9px] border border-amber-500/40">VIP</span>
            </div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">
              {isGuest ? 'Guest Limit Reached (5/5)' : 'Free Quota Reached (10/10)'}
            </h3>
          </div>
        </div>

        {/* Quota Status Alert */}
        <div className="p-3.5 rounded-2xl bg-[#0c0d1c] border border-[#262a4d] mb-4 text-xs text-slate-300">
          {isGuest ? (
            <p>
              You have completed your <strong className="text-amber-400">5 guest interviews</strong>. Sign up with your personal email to get <strong className="text-emerald-400">10 free interviews</strong>, or upgrade to Pro for unlimited mock rounds!
            </p>
          ) : (
            <p>
              You have used all <strong className="text-amber-400">{quota?.limit || 10} interviews</strong>. Upgrade to Skillzo Pro for <strong className="text-emerald-400">unlimited interviews</strong>, or earn bonus credits by scoring 80%+ on cloud verified interviews!
            </p>
          )}
        </div>

        {/* Plan Cards */}
        {!isGuest && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div
              onClick={() => setSelectedPlan('monthly_pro')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                selectedPlan === 'monthly_pro'
                  ? 'bg-[#1b1f42] border-[#7c6cff] ring-1 ring-[#7c6cff]'
                  : 'bg-[#0c0d1c] border-[#262a4d] hover:border-[#3d4378]'
              }`}
            >
              <div className="text-xs text-slate-400 font-semibold">Monthly Pro</div>
              <div className="text-lg font-black text-white mt-1">₹499<span className="text-xs text-slate-400 font-normal"> / mo</span></div>
              <div className="text-[10px] text-slate-400 mt-1">Billed monthly</div>
            </div>

            <div
              onClick={() => setSelectedPlan('yearly_pro')}
              className={`p-3.5 rounded-2xl border cursor-pointer relative transition-all ${
                selectedPlan === 'yearly_pro'
                  ? 'bg-[#1b1f42] border-[#7c6cff] ring-1 ring-[#7c6cff]'
                  : 'bg-[#0c0d1c] border-[#262a4d] hover:border-[#3d4378]'
              }`}
            >
              <span className="absolute -top-2.5 right-3 text-[9px] bg-emerald-500 text-black font-extrabold px-2 py-0.5 rounded-full uppercase">
                Save 35%
              </span>
              <div className="text-xs text-slate-400 font-semibold">Yearly Pro</div>
              <div className="text-lg font-black text-emerald-400 mt-1">₹3,999<span className="text-xs text-slate-400 font-normal"> / yr</span></div>
              <div className="text-[10px] text-emerald-400/80 mt-1">Most Popular</div>
            </div>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="space-y-2 mb-5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span><strong>Unlimited Mock Interviews</strong> (HR, Technical & Resume Project box)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span><strong>Cloud Video & Audio Backup</strong> for instant Company Leader inspection</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span><strong>🌟 Star Performer Badges</strong> visible directly on Leader recruiting board</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span><strong>Deep AI Feedback</strong> & structured STAR methodology suggestions</span>
          </div>
        </div>

        {/* Free Credit Tip Banner */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/30 text-[11px] text-amber-200/90 mb-5 flex items-start gap-2">
          <span className="text-base shrink-0">💡</span>
          <div>
            <strong>Earn Free Interviews without paying:</strong> Score <span className="text-amber-300 font-bold">≥ 80%</span> with cloud backup on any interview to unlock a <span className="text-amber-300 font-bold">🌟 Star Performer Badge + 1 Free Interview Credit</span>!
          </div>
        </div>

        {/* Action Buttons */}
        {success ? (
          <div className="p-3 text-center bg-emerald-500/20 text-emerald-400 font-bold text-sm rounded-xl border border-emerald-500/40">
            🎉 Pro Subscription Activated! Enjoy Unlimited Interviews!
          </div>
        ) : isGuest ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                onClose()
                navigate('/signup')
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7c6cff] to-indigo-600 hover:from-[#6c5bf7] hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/30 transition cursor-pointer"
            >
              Sign Up Free (Unlock 10 Interviews)
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#0c0d1c] hover:bg-[#1a1c35] text-slate-400 text-xs font-semibold transition"
            >
              Maybe Later
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-purple-600 to-[#7c6cff] hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-500/30 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Activating Pro...' : 'Upgrade to Skillzo Pro'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 rounded-xl bg-[#0c0d1c] hover:bg-[#1a1c35] text-slate-400 text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SubscriptionModal
