import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AppShell from '../components/AppShell'
import Loader from '../components/Loader'
import ReadinessDial from '../components/ReadinessDial'
import { getInterviewDetail, submitAnswer, completeInterview } from '../api/interview'

// ─── Timer Component ────────────────────────────────────────────────────────
const CountdownTimer = ({ seconds, onExpire }) => {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (remaining <= 0) { onExpire?.(); return }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, onExpire])

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0')
  const secs = String(remaining % 60).padStart(2, '0')
  const pct = remaining / seconds
  const color = pct > 0.5 ? '#E11D48' : pct > 0.2 ? '#D97706' : '#991B1B'

  return (
    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
      <svg width="32" height="32" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#F1F5F9" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15" fill="none"
          stroke={color} strokeWidth="3.5"
          strokeDasharray={`${2 * Math.PI * 15}`}
          strokeDashoffset={`${2 * Math.PI * 15 * (1 - pct)}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <span className="font-mono text-sm font-bold tracking-tight" style={{ color }}>
        {mins}:{secs}
      </span>
    </div>
  )
}

// ─── SpeechRecognition Helper ───────────────────────────────────────────────
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition

const useSpeechRecognition = (onTranscript) => {
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => !!SpeechRecognitionAPI)

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) return
    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      onTranscript(transcript)
    }

    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [onTranscript])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  return { listening, supported, start, stop }
}

// ─── Video Preview Component ────────────────────────────────────────────────
const VideoPreview = ({ stream, isVideoMuted }) => {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="relative w-full aspect-video md:aspect-[21/9] bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-md mb-4 flex items-center justify-center">
      {stream && !isVideoMuted ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 bg-slate-900/90">
          <CameraOffIcon />
          <span className="mt-2 text-xs font-semibold">Camera is Off</span>
        </div>
      )}

      {/* Recording Indicator Overlay */}
      {stream && !isVideoMuted && (
        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 flex items-center gap-2">
           <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
           <span className="text-[10px] font-mono text-brand-400 font-bold tracking-wider">LIVE STREAM</span>
        </div>
      )}
    </div>
  )
}

// ─── SpeechSynthesis (Text-to-Speech) Helper ───────────────────────────────
const useSpeechSynthesis = () => {
  const [speaking, setSpeaking] = useState(false)
  const supported = 'speechSynthesis' in window

  const speak = useCallback((text, lang = 'en-US', onEnd) => {
    if (!supported || !text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 1
    utterance.pitch = 1
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => {
      setSpeaking(false)
      onEnd?.()
    }
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [supported])

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  return { speak, cancel, speaking, supported }
}

// ─── Main Component ─────────────────────────────────────────────────────────
const TIMER_SECONDS = 30 // 30 seconds per question


const InterviewSession = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastEval, setLastEval] = useState(null)
  const [error, setError] = useState('')
  const [timerKey, setTimerKey] = useState(0)
  const startTime = useRef(Date.now())

  // Video State
  const [stream, setStream] = useState(null)
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const streamRef = useRef(null)

  const isAudioMode = session?.mode === 'audio' || session?.mode === 'video'
  const isVideoMode = session?.mode === 'video'

  const handleTranscript = useCallback((t) => setAnswerText(t), [])
  const { listening, supported: speechSupported, start: startMic, stop: stopMic } = useSpeechRecognition(handleTranscript)
  const { speak, cancel: cancelSpeech, speaking, supported: ttsSupported } = useSpeechSynthesis()

  useEffect(() => {
    getInterviewDetail(sessionId).then((res) => setSession(res.data))
  }, [sessionId])

  // Camera initialization
  useEffect(() => {
    if (session?.mode === 'video') {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((s) => {
          streamRef.current = s
          setStream(s)
        })
        .catch((err) => {
          console.error("Webcam error:", err)
          setError('Camera access denied or unavailable. Please allow camera permissions.')
        })
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [session?.mode])

  useEffect(() => {
    if (!session) return
    stopMic()
    const q = session.questions[current]
    const audioVideoMode = session.mode === 'audio' || session.mode === 'video'
    if (audioVideoMode && q?.question_text) {
      speak(q.question_text, 'en-US', () => startMic())
    }
    return () => cancelSpeech()
  }, [current, session]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => stopMic()
  }, [current, stopMic])

  if (!session) return <AppShell><Loader label="Loading interview session" /></AppShell>

  const questions = session.questions
  const question = questions[current]
  const isLast = current === questions.length - 1

  const handleTimerExpire = () => {
    if (!lastEval && answerText.trim()) {
      handleSubmitAnswer()
    }
  }

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) return
    if (listening) stopMic()
    setSubmitting(true)
    setError('')
    const speakingTime = Math.round((Date.now() - startTime.current) / 1000)
    try {
      const res = await submitAnswer(sessionId, {
        question_id: question.id,
        answer_text: answerText,
        speaking_time_seconds: speakingTime,
      })
      setLastEval(res.data)
    } catch {
      setError('Evaluation failed. Check your Groq API key / connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = async () => {
    if (isLast) {
      setSubmitting(true)
      try {
        await completeInterview(sessionId)
        navigate(`/interview/${sessionId}/report`)
      } catch {
        setError('Could not generate final report. Try again.')
        setSubmitting(false)
      }
    } else {
      stopMic()
      setCurrent(current + 1)
      setAnswerText('')
      setLastEval(null)
      setTimerKey(k => k + 1)
      startTime.current = Date.now()
    }
  }

  const handleSkip = async () => {
    if (listening) stopMic()
    cancelSpeech()
    if (isLast) {
      setSubmitting(true)
      try {
        await completeInterview(sessionId)
        navigate(`/interview/${sessionId}/report`)
      } catch {
        setError('Could not generate final report. Try again.')
        setSubmitting(false)
      }
    } else {
      setCurrent(current + 1)
      setAnswerText('')
      setLastEval(null)
      setTimerKey(k => k + 1)
      startTime.current = Date.now()
    }
  }

  const toggleMic = () => {
    if (speaking) return
    if (listening) stopMic()
    else startMic()
  }

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(t => {
        t.enabled = !t.enabled
      })
      setIsVideoMuted(!isVideoMuted)
    }
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/80">
        <div>
          <span className="eyebrow mb-1">{session.job_role} · {session.difficulty} · {session.mode}</span>
          <h1 className="text-2xl font-display font-extrabold text-slate-900">Question {current + 1} of {questions.length}</h1>
        </div>
        <div className="flex items-center gap-4">
          {!lastEval && (
            <CountdownTimer key={timerKey} seconds={TIMER_SECONDS} onExpire={handleTimerExpire} />
          )}
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {questions.map((_, i) => (
              <div key={i} className={`w-7 h-2 rounded-full transition-all ${i < current ? 'bg-brand-600' : i === current ? 'bg-brand-400 ring-2 ring-brand-200' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>
      </div>

      {error && <div className="mb-6 px-4 py-3 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-sm font-medium">{error}</div>}

      {/* Question Card */}
      <div className="card mb-6 bg-white border border-slate-200/80 shadow-craft">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100">
            {question.category || 'Core Question'}
          </span>
          {isAudioMode && ttsSupported && (
            <button
              onClick={() => speak(question.question_text)}
              disabled={speaking}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 disabled:opacity-50 transition-colors"
            >
              {speaking ? '🔊 Speaking...' : '🔁 Replay Audio'}
            </button>
          )}
        </div>
        <p className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">{question.question_text}</p>
      </div>

      {/* Audio/Video mode browser notice */}
      {isAudioMode && !speechSupported && (
        <div className="mb-4 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
          ⚠️ Web Speech API is not supported in your browser. Please use Chrome or Edge for audio/video mode, or switch to text mode.
        </div>
      )}

      <AnimatePresence mode="wait">
        {!lastEval ? (
          <motion.div key="answer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* Video Mode Preview */}
            {isVideoMode && (
              <VideoPreview stream={stream} isVideoMuted={isVideoMuted} />
            )}

            {/* Audio & Video Mode Shared Transcript UI */}
            {isAudioMode && speechSupported ? (
              <div className="mb-4">
                {/* Live transcript area */}
                <div className="input-field min-h-[140px] mb-4 relative p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                  {answerText ? (
                    <p className="text-slate-900 leading-relaxed font-medium">{answerText}</p>
                  ) : (
                    <p className="text-slate-400 text-sm">
                      {listening ? 'Listening to your response... speak clearly' : 'Press the mic button below to record your response'}
                    </p>
                  )}
                  {listening && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
                      <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
                      <span className="text-[10px] text-brand-700 font-mono font-bold">REC</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">

                  {/* Camera toggle button (Video Mode Only) */}
                  {isVideoMode && (
                    <button
                      onClick={toggleCamera}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        isVideoMuted
                          ? 'bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {isVideoMuted ? (
                        <>
                          <CameraOffIcon /> Turn On Camera
                        </>
                      ) : (
                        <>
                          <CameraIcon /> Turn Off Camera
                        </>
                      )}
                    </button>
                  )}

                  {/* Mic toggle button */}
                  <button
                    onClick={toggleMic}
                    disabled={speaking}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      listening
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20 hover:bg-brand-700'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {listening ? (
                      <>
                        <MicIcon /> Mic is ON
                      </>
                    ) : (
                      <>
                        <MicOffIcon /> Mic is OFF
                      </>
                    )}
                  </button>

                  {/* Clear transcript */}
                  {answerText && !listening && (
                    <button onClick={() => setAnswerText('')} className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors px-2 py-1">
                      Clear Text
                    </button>
                  )}

                  {/* Skip Question Option */}
                  <button
                    onClick={handleSkip}
                    disabled={submitting}
                    className="btn-secondary text-xs font-semibold hover:border-amber-300 hover:text-amber-700"
                  >
                    Skip Question ⏭️
                  </button>

                  {/* Submit */}
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={submitting || !answerText.trim()}
                    className="btn-primary ml-auto shadow-md shadow-brand-500/20"
                  >
                    {submitting ? 'Evaluating with AI...' : 'Submit Answer →'}
                  </button>
                </div>
              </div>
            ) : (
              /* Text Mode UI */
              <>
                <textarea
                  className="input-field min-h-[160px] resize-none mb-4"
                  placeholder="Type your structured answer here..."
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                />
                <div className="flex justify-between items-center gap-3">
                  <button onClick={handleSkip} disabled={submitting} className="btn-secondary text-xs font-semibold hover:border-amber-300 hover:text-amber-700">
                    Skip Question ⏭️
                  </button>
                  <button onClick={handleSubmitAnswer} disabled={submitting || !answerText.trim()} className="btn-primary shadow-md shadow-brand-500/20">
                    {submitting ? 'Evaluating with AI...' : 'Submit Answer →'}
                  </button>
                </div>
              </>
            )}
          </motion.div>

        ) : (
          <motion.div key="eval" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Evaluation Card */}
            <div className="card mb-6 bg-white border border-slate-200/80 shadow-craft">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-display font-extrabold text-xl text-slate-900">AI Evaluation Feedback</h3>
                  <p className="text-xs text-slate-500">Real-time answer assessment breakdown</p>
                </div>
                <ReadinessDial score={lastEval.overall_score} size={76} />
              </div>

              {/* Score grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                {[
                  ['Technical', lastEval.technical_knowledge],
                  ['Communication', lastEval.communication],
                  ['Grammar', lastEval.grammar],
                  ['Confidence', lastEval.confidence],
                  ['Problem Solving', lastEval.problem_solving],
                ].map(([label, val]) => (
                  <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-slate-500 font-mono font-bold uppercase mb-1">{label}</p>
                    <p className={`font-mono font-extrabold text-xl ${val >= 75 ? 'text-emerald-600' : val >= 40 ? 'text-amber-600' : 'text-brand-600'}`}>
                      {val}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {lastEval.strengths?.length > 0 && (
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
                    <p className="text-xs font-mono font-bold uppercase text-emerald-700 mb-2">Key Strengths</p>
                    <ul className="text-xs space-y-1.5 text-emerald-900">
                      {lastEval.strengths.map((s, i) => <li key={i} className="flex gap-2"><span>✓</span><span>{s}</span></li>)}
                    </ul>
                  </div>
                )}
                {lastEval.improvements?.length > 0 && (
                  <div className="bg-brand-50/60 border border-brand-100 rounded-xl p-4">
                    <p className="text-xs font-mono font-bold uppercase text-brand-700 mb-2">Areas for Growth</p>
                    <ul className="text-xs space-y-1.5 text-brand-900">
                      {lastEval.improvements.map((s, i) => <li key={i} className="flex gap-2"><span>↑</span><span>{s}</span></li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* Ideal Answer Summary */}
              {lastEval.ideal_answer_summary && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-mono font-bold uppercase text-slate-500 mb-2">💡 Ideal Answer Summary</p>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-200/60 font-medium">
                    {lastEval.ideal_answer_summary}
                  </p>
                </div>
              )}
            </div>

            <button onClick={handleNext} disabled={submitting} className="btn-primary w-full sm:w-auto shadow-md shadow-brand-500/20">
              {submitting ? 'Finalizing...' : isLast ? 'Finish & See Comprehensive Report →' : 'Next Question →'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)

const MicOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)

const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
)

const CameraOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

export default InterviewSession

