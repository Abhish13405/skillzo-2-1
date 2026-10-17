import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../context/AuthContext'

const CandidateLiveRoom = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [roomInput, setRoomInput] = useState('')
  const [candidateName, setCandidateName] = useState(user?.username || 'Candidate')
  const [targetRole, setTargetRole] = useState(user?.target_role || 'Software Engineer')
  const [errorMsg, setErrorMsg] = useState('')

  // Hardware Pre-check states
  const [mediaStream, setMediaStream] = useState(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [micActive, setMicActive] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [testingHardware, setTestingHardware] = useState(false)
  const [hardwareError, setHardwareError] = useState('')

  const videoRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)

  // Determine if current user is leader
  const userEmail = (user?.email || '').toLowerCase().trim()
  const userName = (user?.username || '').toLowerCase().trim()
  const isLeader = Boolean(
    user && !user.is_guest && (
      user?.is_leader ||
      user?.is_staff ||
      user?.is_superuser ||
      userEmail === 'abhishekkushwaha13405@gmail.com' ||
      userEmail === 'abhish@gmail.com' ||
      userEmail === 'abhishekkushwaha31387@bbdu.ac.in' ||
      userName === 'abhishek13405' ||
      userName === 'abhish' ||
      userName === 'abhishekkushwaha31387' ||
      userEmail.includes('abhishek') ||
      userName.includes('abhishek')
    )
  )

  // Auto clean Room ID from input (supports raw room id or full URL)
  const extractRoomId = (input) => {
    let clean = input.trim()
    if (!clean) return ''
    if (clean.includes('/live-interview/')) {
      clean = clean.split('/live-interview/')[1]?.split('?')[0] || clean
    } else if (clean.includes('/live/')) {
      clean = clean.split('/live/')[1]?.split('?')[0] || clean
    } else if (clean.includes('meet.jit.si/')) {
      clean = clean.split('meet.jit.si/')[1]?.split('?')[0] || clean
      if (clean.startsWith('skillzo_')) {
        clean = clean.replace('skillzo_', '')
      }
    }
    return clean.replace(/[^a-zA-Z0-9_-]/g, '')
  }

  // Handle Join Live Room
  const handleJoin = (e) => {
    e?.preventDefault()
    setErrorMsg('')
    const cleanId = extractRoomId(roomInput)
    if (!cleanId) {
      setErrorMsg('Please enter a valid Room Code or Invitation Link.')
      return
    }

    // Stop preview stream before entering meeting
    stopMediaStream()

    const candidateParam = user?.id ? `&candidate=${user.id}` : ''
    const emailParam = user?.email ? `&email=${encodeURIComponent(user.email)}` : ''
    const asParam = isLeader ? '' : '&as=candidate'

    navigate(
      `/live-interview/${cleanId}?candidateName=${encodeURIComponent(
        candidateName
      )}&role=${encodeURIComponent(targetRole)}${candidateParam}${emailParam}${asParam}`
    )
  }

  // Handle Practice / Test Room
  const handleStartPractice = () => {
    stopMediaStream()
    const practiceId = `skz_practice_${Date.now().toString(36)}`
    const candidateParam = user?.id ? `&candidate=${user.id}` : ''
    const emailParam = user?.email ? `&email=${encodeURIComponent(user?.email || 'guest@candidate.com')}` : ''
    navigate(
      `/live-interview/${practiceId}?candidateName=${encodeURIComponent(
        candidateName
      )}&role=${encodeURIComponent(targetRole)}${candidateParam}${emailParam}&as=candidate`
    )
  }

  // Start Hardware Test (Webcam & Mic)
  const startHardwareCheck = async () => {
    setHardwareError('')
    setTestingHardware(true)
    try {
      if (mediaStream) {
        stopMediaStream()
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360 },
        audio: true,
      })

      setMediaStream(stream)
      setCameraActive(true)
      setMicActive(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Audio visualizer setup
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 64
        const source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)

        audioContextRef.current = audioCtx
        analyserRef.current = analyser

        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        const updateAudio = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const avg = sum / dataArray.length
          const normalized = Math.min(100, Math.round((avg / 128) * 100))
          setAudioLevel(normalized)
          animFrameRef.current = requestAnimationFrame(updateAudio)
        }
        updateAudio()
      } catch (audioErr) {
        console.warn('Audio visualization unavailable:', audioErr)
      }
    } catch (err) {
      console.error('Camera/Mic permission error:', err)
      setHardwareError('Camera or microphone access denied. Please allow permissions in your browser.')
      setCameraActive(false)
      setMicActive(false)
    } finally {
      setTestingHardware(false)
    }
  }

  const stopMediaStream = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
      setMediaStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    setMicActive(false)
    setAudioLevel(0)
  }

  useEffect(() => {
    return () => {
      stopMediaStream()
    }
  }, [])

  return (
    <AppShell hideSidebar={true}>
      <div className="max-w-5xl mx-auto py-2 sm:py-3 px-3 sm:px-4">
        {/* Top Back Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#0D1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400/60 shadow-xs transition-all mb-2.5 group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
              Live HR Interview Lobby
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Join your 1-on-1 live video round with your recruiter or verify your camera and mic setup.
            </p>
          </div>

          {isLeader && (
            <Link
              to="/leader"
              className="self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
            >
              Open Leader Portal →
            </Link>
          )}
        </div>

        {/* 2-Column Split: Join Form + Hardware Readiness Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
          {/* Left Column: Room Code Input & Join */}
          <div className="lg:col-span-6 flex flex-col justify-between bg-white dark:bg-[#0D1527] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-6 shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-md font-bold bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800">
                  Instant Connection
                </span>
                <span className="text-xs text-slate-400 font-mono">1:1 WebRTC Video</span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Enter Interview Room
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                Paste the unique Room Code or complete invitation URL received from your HR recruiter.
              </p>

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Room Code or Invitation Link
                  </label>
                  <input
                    type="text"
                    value={roomInput}
                    onChange={(e) => {
                      setRoomInput(e.target.value)
                      if (errorMsg) setErrorMsg('')
                    }}
                    placeholder="e.g. skz_live_xyz123 or paste full link"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-white placeholder-slate-400 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                  {errorMsg && (
                    <p className="text-[11px] text-red-500 font-semibold mt-1.5">{errorMsg}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="Candidate Name"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Role / Position
                    </label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Software Engineer"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <span>Join Live Interview Room</span>
                  <span>→</span>
                </button>
              </form>
            </div>

            {/* Test Room Sandbox Option */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <span className="text-[11px] text-slate-400">
                Want to test before the recruiter arrives?
              </span>
              <button
                type="button"
                onClick={handleStartPractice}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-left sm:text-center"
              >
                Launch Test Practice Room ↗
              </button>
            </div>
          </div>

          {/* Right Column: Pre-Flight Hardware Check (Camera & Mic) */}
          <div className="lg:col-span-6 bg-white dark:bg-[#0D1527] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-md font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800">
                  Pre-Flight Readiness
                </span>
                <span className="text-xs text-slate-400 font-mono">Device Verification</span>
              </div>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Camera & Audio Pre-Check
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Ensure your camera frame is centered and your microphone detects your voice cleanly.
              </p>

              {/* Video Preview Frame */}
              <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden border border-slate-800 flex items-center justify-center mb-3">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${
                    cameraActive ? 'block' : 'hidden'
                  }`}
                />

                {!cameraActive && (
                  <div className="text-center p-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2 text-xl">
                      📹
                    </div>
                    <p className="text-xs text-slate-300 font-medium">Camera is currently inactive</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Click the button below to test your webcam feed
                    </p>
                  </div>
                )}

                {/* Overlaid Badges */}
                {cameraActive && (
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold backdrop-blur-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Camera Live
                  </div>
                )}
              </div>

              {/* Live Mic Level Indicator */}
              <div className="bg-slate-50 dark:bg-[#080D1A] rounded-xl p-3 border border-slate-200/80 dark:border-slate-800 mb-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>🎙️</span>
                    <span>Microphone Input</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {micActive ? `${audioLevel}%` : 'Off'}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      audioLevel > 15 ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                    style={{ width: `${micActive ? audioLevel : 0}%` }}
                  />
                </div>
              </div>

              {hardwareError && (
                <p className="text-[11px] text-red-500 font-semibold mb-3">{hardwareError}</p>
              )}
            </div>

            {/* Test Hardware Action Button */}
            <div className="flex gap-2">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startHardwareCheck}
                  disabled={testingHardware}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-900 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {testingHardware ? (
                    <span>Requesting access...</span>
                  ) : (
                    <>
                      <span>Test Camera & Mic</span>
                      <span>📹</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopMediaStream}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 border border-red-200 dark:border-red-900/60 transition-colors cursor-pointer"
                >
                  Turn Off Camera & Mic
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Interview Guidelines Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white dark:bg-[#0D1527] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-4">
            <span className="text-xl mb-1.5 block">🎧</span>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">
              Headphones Recommended
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Use earphones or a headset in a quiet room to eliminate background noise and echo.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0D1527] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-4">
            <span className="text-xl mb-1.5 block">💡</span>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">
              Lighting & Camera Angle
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Ensure your face is well-lit with light in front of you, sitting at eye level.
            </p>
          </div>

          <div className="bg-white dark:bg-[#0D1527] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-4">
            <span className="text-xl mb-1.5 block">📝</span>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">
              Live Evaluation
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              The company recruiter will score your answers and technical competencies during the call.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default CandidateLiveRoom
