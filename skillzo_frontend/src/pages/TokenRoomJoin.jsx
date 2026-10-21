import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { verifyInterviewToken } from '../api/company'
import Loader from '../components/Loader'

const TokenRoomJoin = () => {
  const { token } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Missing interview invitation token.')
      setLoading(false)
      return
    }

    verifyInterviewToken(token)
      .then((res) => {
        if (res.data?.valid) {
          setData(res.data)
        } else {
          setError(res.data?.error || 'Invitation is invalid or has expired.')
        }
      })
      .catch((err) => {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.detail ||
          'Unable to verify this interview token. It may have expired or been cancelled.'
        setError(msg)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  const handleJoin = () => {
    if (!data) return
    const roomId = data.room_id || `skz_live_${data.candidate_id}`
    const name = encodeURIComponent(data.candidate_name || 'Candidate')
    const email = encodeURIComponent(data.candidate_email || '')
    navigate(`/live-interview/${roomId}?as=candidate&candidate=${data.candidate_id}&candidateName=${name}&email=${email}&token=${token}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0f1e] text-white flex items-center justify-center p-4">
        <Loader label="Verifying your interview security token..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0d0f1e] text-white flex items-center justify-center p-4">
        <div className="bg-[#151833] border border-[#262a4d] rounded-2xl max-w-md w-full p-6 sm:p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 font-extrabold text-2xl flex items-center justify-center mx-auto border border-rose-500/30">
            ✕
          </div>
          <h2 className="text-xl font-bold font-heading text-white">Interview Link Unavailable</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {error}
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#7c6cff] hover:bg-[#6a58f7] text-white text-xs font-bold transition shadow-md shadow-[#7c6cff]/20"
            >
              Go to Candidate Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0f1e] text-white flex items-center justify-center p-4">
      <div className="bg-[#151833] border border-[#262a4d] rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#7c6cff]/20 text-[#a78bfa] font-extrabold text-xl flex items-center justify-center mx-auto border border-[#7c6cff]/30">
            SZ
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Verified Interview Token
          </span>
          <h1 className="text-2xl font-bold text-white font-heading">
            Live 1:1 Interview with {data?.company_name || 'Skillzo'}
          </h1>
          <p className="text-xs text-slate-400">
            Welcome, <strong>{data?.candidate_name}</strong> ({data?.candidate_email})
          </p>
        </div>

        {/* Room Info Box */}
        <div className="p-4 rounded-xl bg-[#0d0f1e] border border-[#262a4d] space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-[#262a4d]/60">
            <span className="text-slate-400 font-semibold">Scheduled Time:</span>
            <span className="text-white font-bold font-mono">
              {data?.scheduled_at ? new Date(data.scheduled_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Ready'}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-[#262a4d]/60">
            <span className="text-slate-400 font-semibold">Interview Format:</span>
            <span className="text-emerald-400 font-bold">1:1 WebRTC Video & Audio</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400 font-semibold">Status:</span>
            <span className="text-slate-200 font-bold">Clear to Join</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-[11px] text-slate-400 space-y-1">
          <div className="font-bold text-slate-300">Before entering the room:</div>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Ensure your webcam and microphone permissions are granted.</li>
            <li>Use Google Chrome, Brave, or Microsoft Edge for best connection.</li>
            <li>Find a quiet, well-lit environment.</li>
          </ul>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleJoin}
          className="w-full py-3 px-5 rounded-xl bg-[#7c6cff] hover:bg-[#6a58f7] text-white font-bold text-sm transition shadow-lg shadow-[#7c6cff]/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Enter Live Interview Room</span>
          <span>→</span>
        </button>

      </div>
    </div>
  )
}

export default TokenRoomJoin
