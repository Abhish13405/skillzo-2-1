import React, { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { submitLiveEvaluation } from '../api/interview'

const LiveInterview = () => {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const jitsiContainerRef = useRef(null)
  const apiRef = useRef(null)

  const candidateId = searchParams.get('candidate')
  const candidateName = searchParams.get('candidateName') || 'Candidate'
  const candidateRole = searchParams.get('role') || 'Software Engineer'
  const candidateEmail = searchParams.get('email') || ''
  const isCandidateRole = searchParams.get('as') === 'candidate'

  // Determine if the current viewer is the HR Interviewer
  const userEmail = (user?.email || '').toLowerCase().trim()
  const userName = (user?.username || '').toLowerCase().trim()
  const isLeader = Boolean(
    user && !user.is_guest && (
      user.is_leader ||
      user.is_staff ||
      user.is_superuser ||
      userEmail === 'abhishekkushwaha13405@gmail.com' ||
      userEmail === 'abhish@gmail.com' ||
      userEmail === 'abhishekkushwaha31387@bbdu.ac.in' ||
      userName === 'abhishek13405' ||
      userName === 'abhish' ||
      userName === 'abhishekkushwaha31387'
    )
  )

  const isHR = isLeader && !isCandidateRole

  // Evaluation form state (strictly for HR)
  const [techScore, setTechScore] = useState(80)
  const [commScore, setCommScore] = useState(85)
  const [fitScore, setFitScore] = useState(80)
  const [verdict, setVerdict] = useState('Hire')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [evaluatedSessionId, setEvaluatedSessionId] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [evalOpen, setEvalOpen] = useState(true)
  const [callJoined, setCallJoined] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const cleanRoom = `skillzo_${(roomId || 'main').replace(/[^a-zA-Z0-9_-]/g, '')}`
  const directRoomUrl = `https://meet.jit.si/${cleanRoom}`

  const overallScore = Math.round((techScore + commScore + fitScore) / 3)

  const getCandidateInviteUrl = () => {
    return `${window.location.origin}/live-interview/${roomId}?as=candidate&candidate=${candidateId || ''}&candidateName=${encodeURIComponent(candidateName)}&role=${encodeURIComponent(candidateRole)}&email=${encodeURIComponent(candidateEmail || '')}`
  }

  // Copy candidate invite link
  const handleCopyInvite = () => {
    const inviteUrl = getCandidateInviteUrl()
    navigator.clipboard.writeText(inviteUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 3000)
  }

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const inviteUrl = getCandidateInviteUrl()
    const msg = `Namaste ${candidateName}! Your Live 1:1 Interview with Skillzo is ready.\n\nRole: ${candidateRole}\nJoin Video Call: ${inviteUrl}\n\nPlease join using a laptop/mobile with camera and microphone access.`
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank')
  }

  // Share via Email
  const handleShareEmail = () => {
    const inviteUrl = getCandidateInviteUrl()
    const subject = `Skillzo Live 1:1 Interview Invitation - ${candidateName} (${candidateRole})`
    const body = `Dear ${candidateName},\n\nYou are invited to join your Live 1:1 Interview on Skillzo for the role of ${candidateRole}.\n\nInterview Room Link:\n${inviteUrl}\n\nPlease click the link above when ready. Ensure your webcam and microphone are enabled.\n\nBest regards,\nSkillzo Recruitment Team`
    const mailtoUrl = `mailto:${candidateEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl
  }

  // Load and mount Jitsi Meet WebRTC Video
  useEffect(() => {
    let isMounted = true

    // 7-second timeout watchdog in case network blocks or delays external script
    const timer = setTimeout(() => {
      if (isMounted && !apiRef.current) {
        setLoadError(true)
      }
    }, 7000)

    const loadScript = () => {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve(window.JitsiMeetExternalAPI)
          return
        }
        const existing = document.getElementById('jitsi-external-api-script')
        if (existing) {
          existing.onload = () => resolve(window.JitsiMeetExternalAPI)
          return
        }
        const script = document.createElement('script')
        script.id = 'jitsi-external-api-script'
        script.src = 'https://meet.jit.si/external_api.js'
        script.async = true
        script.onload = () => resolve(window.JitsiMeetExternalAPI)
        script.onerror = (err) => reject(err)
        document.body.appendChild(script)
      })
    }

    loadScript()
      .then((JitsiAPI) => {
        if (!isMounted || !jitsiContainerRef.current) return

        const displayName = isHR
          ? `${user?.username || 'HR Interviewer'} (Interviewer)`
          : `${user?.username || candidateName} (Candidate)`

        const api = new JitsiAPI('meet.jit.si', {
          roomName: cleanRoom,
          parentNode: jitsiContainerRef.current,
          userInfo: {
            displayName,
            email: user?.email || '',
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            prejoinPageEnabled: false,
            enableWelcomePage: false,
            enableClosePage: false,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'closedcaptions',
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'hangup',
              'chat',
              'raisehand',
              'tileview',
              'videoquality',
              'select-background',
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_REMOTE_DISPLAY_NAME: isHR ? candidateName : 'Interviewer',
          },
        })

        apiRef.current = api
        setCallJoined(true)
        setLoadError(false)

        api.addEventListener('videoConferenceLeft', () => {
          if (isHR) {
            navigate('/leader')
          } else {
            navigate('/dashboard')
          }
        })
      })
      .catch((err) => {
        console.error('Failed to load video conferencing module:', err)
        if (isMounted) setLoadError(true)
      })

    return () => {
      isMounted = false
      clearTimeout(timer)
      if (apiRef.current) {
        try {
          apiRef.current.dispose()
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }, [roomId, isHR, candidateName, user, navigate, cleanRoom])

  // Submit HR Evaluation
  const handleSubmitEvaluation = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await submitLiveEvaluation({
        candidate_id: candidateId || undefined,
        job_role: candidateRole,
        technical_score: techScore,
        communication_score: commScore,
        cultural_fit_score: fitScore,
        verdict,
        notes,
      })
      if (res.data?.success) {
        setEvaluatedSessionId(res.data.session_id)
      }
    } catch (err) {
      alert('Failed to save evaluation. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#070B14] text-slate-100 font-body overflow-hidden">
      {/* Top Professional Control Bar */}
      <header className="h-14 border-b border-slate-800 bg-[#0B1021] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <img src="/logo-icon.png" alt="Skillzo Logo" className="w-8 h-8 object-contain shrink-0 drop-shadow-sm" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm tracking-tight text-white">Skillzo Live</span>
              <span className="flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-950/80 text-red-400 border border-red-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE CALL
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              Room: {roomId}
            </span>
          </div>
        </div>

        {/* Center: Candidate / Role Header */}
        <div className="hidden md:flex items-center gap-2 bg-[#131B33] px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-mono">Candidate:</span>
          <span className="font-bold text-white">{candidateName}</span>
          <span className="text-slate-600">•</span>
          <span className="text-blue-400 font-medium">{candidateRole}</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {isHR && (
            <>
              {/* WhatsApp Share Button */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Share room invitation on WhatsApp"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.772.84 2.791.84 3.182 0 5.768-2.587 5.768-5.766.001-3.18-2.585-5.766-5.768-5.766zm9.969 5.766c0 5.503-4.477 9.98-9.969 9.98-1.74 0-3.37-.45-4.795-1.238l-5.236 1.372 1.398-5.105c-.86-1.47-1.336-3.18-1.336-4.999 0-5.503 4.477-9.98 9.969-9.98 5.503 0 9.969 4.477 9.969 9.98z"/>
                </svg>
                <span>WhatsApp</span>
              </button>

              {/* Email Share Button */}
              <button
                type="button"
                onClick={handleShareEmail}
                className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Send invitation via Email"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span>Email</span>
              </button>

              {/* Copy Invite Link Button */}
              <button
                type="button"
                onClick={handleCopyInvite}
                className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Copy Direct Interview Link"
              >
                {copiedLink ? (
                  <span className="text-emerald-400 font-bold">✓ Copied</span>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setEvalOpen((prev) => !prev)}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  evalOpen
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <span>HR Scorecard</span>
                <span>{evalOpen ? '→' : '←'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to exit the interview room?')) {
                if (apiRef.current) apiRef.current.dispose()
                navigate(isHR ? '/leader' : '/live-room')
              }
            }}
            className="py-1.5 px-3 rounded-lg text-xs font-bold bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 transition-colors cursor-pointer"
          >
            Leave Room
          </button>
        </div>
      </header>

      {/* Main Split Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Video Conference Stream Container */}
        <div className="flex-1 h-full w-full bg-[#050811] relative flex items-center justify-center">
          <div ref={jitsiContainerRef} className="w-full h-full" />
          {!callJoined && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070B14] p-6 text-center z-10">
              {loadError ? (
                <div className="max-w-md bg-[#0D1527] p-6 rounded-2xl border border-slate-800 shadow-xl">
                  <div className="w-12 h-12 rounded-full bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center mx-auto mb-3 text-xl">
                    📹
                  </div>
                  <h4 className="font-bold text-white text-base mb-1">Live Video Room Ready</h4>
                  <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                    Connecting to encrypted video stream. You can also launch the meeting in a full secure window:
                  </p>
                  <a
                    href={directRoomUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary py-2.5 px-5 text-xs font-bold inline-flex items-center gap-2 shadow-md w-full justify-center cursor-pointer"
                  >
                    <span>Launch Live Video Room ↗</span>
                  </a>
                  <p className="text-[11px] text-slate-500 font-mono mt-3">
                    {isHR
                      ? 'Your HR Scorecard on the right remains active to evaluate in real time.'
                      : 'Your recruiter will connect momentarily once they join the room.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-mono text-slate-400">Connecting to secure live interview room...</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: HR Private Evaluation Dock (Exclusively for HR) */}
        {isHR && evalOpen && (
          <aside className="w-80 sm:w-96 border-l border-slate-800 bg-[#0B1021] flex flex-col h-full shrink-0 z-10 shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0E152B]">
              <div>
                <h3 className="font-display font-extrabold text-sm text-white">Live Evaluation Form</h3>
                <p className="text-[11px] text-slate-400 font-mono">Private interviewer rubric (Candidate cannot see)</p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-blue-950 text-blue-400 border border-blue-800">
                {overallScore}/100
              </span>
            </div>

            {evaluatedSessionId ? (
              <div className="p-6 text-center my-auto">
                <div className="w-12 h-12 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                  ✓
                </div>
                <h4 className="font-bold text-white text-base">Evaluation Recorded!</h4>
                <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
                  Candidate scorecard has been saved to the database and is now live in the Leader Portal.
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    to={`/interview/${evaluatedSessionId}/report`}
                    target="_blank"
                    className="btn-primary text-xs py-2 px-3 block text-center"
                  >
                    View Official Scorecard Report ↗
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEvaluatedSessionId(null)}
                    className="text-xs text-slate-400 hover:text-white py-1 transition-colors"
                  >
                    Edit Evaluation
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitEvaluation} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* Candidate Info Card */}
                <div className="bg-[#111827] p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{candidateName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {candidateRole}
                    </span>
                  </div>
                  {candidateEmail && (
                    <p className="text-[11px] text-slate-400 font-mono mt-1">{candidateEmail}</p>
                  )}
                </div>

                {/* Score Sliders */}
                <div className="space-y-3.5">
                  <div>
                    <div className="flex justify-between items-center mb-1 text-slate-300">
                      <span>Technical & Concept Depth</span>
                      <span className="font-mono font-bold text-blue-400">{techScore}/100</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={techScore}
                      onChange={(e) => setTechScore(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1 text-slate-300">
                      <span>Communication & Fluency</span>
                      <span className="font-mono font-bold text-emerald-400">{commScore}/100</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={commScore}
                      onChange={(e) => setCommScore(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1 text-slate-300">
                      <span>Cultural Fit & Problem Solving</span>
                      <span className="font-mono font-bold text-purple-400">{fitScore}/100</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={fitScore}
                      onChange={(e) => setFitScore(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>

                {/* Decision Chips */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Hiring Recommendation</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Strong Hire', 'Hire', 'On Hold', 'Reject'].map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setVerdict(d)}
                        className={`py-1.5 px-2 rounded-lg font-bold text-center border transition-all cursor-pointer ${
                          verdict === d
                            ? d.includes('Hire')
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                              : d === 'On Hold'
                              ? 'bg-amber-600 text-white border-amber-500'
                              : 'bg-red-600 text-white border-red-500'
                            : 'bg-[#111827] text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Interviewer Feedback Notes</label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Candidate demonstrated strong core fundamentals. Articulation was clear, minor guidance needed on complex optimization..."
                    className="w-full bg-[#111827] border border-slate-800 rounded-xl p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none text-xs leading-relaxed"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Scorecard...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit & Save Evaluation</span>
                      <span>✓</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}

export default LiveInterview
