import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getInterviewDetail, submitAnswer, completeInterview } from '../api/interview'
import { useAuth } from '../context/AuthContext'
import { saveRecording } from '../utils/recordingsDb'

// ─── Ultra-Low Space Codec Detection Helper (Minimizes file size) ──────────────
const getBestMimeType = (mode) => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return ''
  if (mode === 'audio') {
    const audioTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ]
    for (const type of audioTypes) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) return type
    }
    return ''
  }
  const videoTypes = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/mp4',
  ]
  for (const type of videoTypes) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

// ─── Real-time Audio Waveform Component (Compact & Adaptive) ─────────────────
const AudioWaveformBars = ({ isRecording = true, isPaused = false }) => {
  const heights = [
    10, 16, 22, 12, 28, 36, 18, 30, 38, 24, 16, 32,
    40, 24, 34, 42, 26, 18, 32, 38, 24, 30, 40, 22,
    16, 28, 34, 20, 14, 24, 28, 14, 18, 14, 10, 8
  ]

  return (
    <div className="flex items-center justify-between h-9 sm:h-11 w-full px-1 sm:px-2 py-0.5 gap-[2px] sm:gap-1 overflow-hidden">
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-[2.5px] sm:w-[3px] rounded-full transition-all duration-150 ${
            isRecording && !isPaused
              ? 'bg-blue-600'
              : 'bg-blue-200'
          }`}
          style={{
            height: isRecording && !isPaused ? `${Math.max(5, Math.min(38, h))}px` : '5px',
            animation: isRecording && !isPaused ? `pulse 1.2s ease-in-out infinite` : 'none',
            animationDelay: `${(i * 0.035).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Continuous & Resilient Speech Recognition Hook ───────────────────────────
const getSpeechRecognitionAPI = () => {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

const useSpeechRecognition = (onTranscript) => {
  const recognitionRef = useRef(null)
  const isExplicitlyStoppedRef = useRef(false)
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => !!getSpeechRecognitionAPI())
  const finalTranscriptRef = useRef('')

  const start = useCallback(() => {
    const SpeechAPI = getSpeechRecognitionAPI()
    if (!SpeechAPI) return

    isExplicitlyStoppedRef.current = false

    // Clean up existing instance if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {}
    }

    const recognition = new SpeechAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    // Prioritize device language or Indian/US English
    recognition.lang = (typeof navigator !== 'undefined' && navigator.language?.startsWith('en'))
      ? navigator.language
      : 'en-IN'

    recognition.onresult = (event) => {
      let interim = ''
      let newFinal = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i]
        const text = item[0]?.transcript || ''
        if (item.isFinal) {
          newFinal += text + ' '
        } else {
          interim += text
        }
      }

      if (newFinal) {
        finalTranscriptRef.current += newFinal
      }

      const combined = (finalTranscriptRef.current + interim).trim()
      if (combined) {
        onTranscript(combined)
      }
    }

    recognition.onerror = (event) => {
      // 'no-speech' happens naturally when candidate is thinking; keep going
      if (event.error === 'no-speech') {
        return
      }
      if (event.error === 'not-allowed') {
        console.warn('Microphone permission blocked for speech recognition')
        setListening(false)
        isExplicitlyStoppedRef.current = true
        return
      }
      console.warn('Speech recognition status:', event.error)
    }

    recognition.onend = () => {
      // Auto-restart if we should still be listening and candidate is answering
      if (!isExplicitlyStoppedRef.current) {
        try {
          recognition.start()
          setListening(true)
          return
        } catch {}
      }
      setListening(false)
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      setListening(true)
    } catch (e) {
      console.warn('Recognition start caught:', e)
    }
  }, [onTranscript])

  const stop = useCallback(() => {
    isExplicitlyStoppedRef.current = true
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    setListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = ''
  }, [])

  const syncTranscript = useCallback((text) => {
    finalTranscriptRef.current = text ? (text + ' ') : ''
  }, [])

  return { listening, supported, start, stop, resetTranscript, syncTranscript }
}

// ─── Speech Synthesis Hook ───────────────────────────────────────────────────
// ─── Female Voice Selector ───────────────────────────────────────────────────
const getFemaleVoice = (voices) => {
  if (!voices || voices.length === 0) return null

  // Priority female voice name keywords (covers Windows, Edge, Chrome, macOS, Android, iOS)
  const preferredFemaleKeywords = [
    'jenny',      // Microsoft Jenny (Natural female - Edge & Windows 11)
    'aria',       // Microsoft Aria (Natural female - Edge)
    'zira',       // Microsoft Zira (Default Windows Desktop Female)
    'google uk english female',
    'google us english female',
    'samantha',   // macOS / iOS female
    'victoria',   // macOS female
    'karen',      // Australian female
    'moira',      // Irish female
    'tessa',      // South African female
    'serena',     // UK female
    'neerja',     // Indian English female
    'veena',      // Indian English female
    'swara',      // Indian English female
    'heera',      // Indian English female
    'stephanie',
    'eva',
    'hazel',
    'susan',
    'catherine'
  ]

  // Filter English voices
  const enVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'))
  const pool = enVoices.length > 0 ? enVoices : voices

  // 1. Try matching preferred female keywords
  for (const kw of preferredFemaleKeywords) {
    const match = pool.find(v => v.name.toLowerCase().includes(kw))
    if (match) return match
  }

  // 2. Any voice that explicitly mentions "female" or "woman"
  const femaleExplicit = pool.find(v => {
    const n = v.name.toLowerCase()
    return n.includes('female') || n.includes('woman')
  })
  if (femaleExplicit) return femaleExplicit

  // 3. Reject known male voices (David, Mark, George, Guy, Christopher, Eric, Male, Ravi)
  const maleNames = ['david', 'mark', 'george', 'guy', 'christopher', 'eric', 'male', 'ravi', 'prabhat', 'richard', 'sean']
  const nonMale = pool.find(v => {
    const n = v.name.toLowerCase()
    return !maleNames.some(m => n.includes(m))
  })
  if (nonMale) return nonMale

  return pool[0] || voices[0]
}

// ─── Speech Synthesis Hook with Guaranteed Female Voice ───────────────────────
const useSpeechSynthesis = () => {
  const [speaking, setSpeaking] = useState(false)
  const [voices, setVoices] = useState([])
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    if (!supported) return

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices()
      if (v && v.length > 0) {
        setVoices(v)
      }
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [supported])

  const speak = useCallback(
    (text, onEnd) => {
      if (!supported || !text) return
      window.speechSynthesis.cancel()

      const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices()
      const femaleVoice = getFemaleVoice(currentVoices)

      const utterance = new SpeechSynthesisUtterance(text)
      if (femaleVoice) {
        utterance.voice = femaleVoice
        utterance.lang = femaleVoice.lang || 'en-US'
      } else {
        utterance.lang = 'en-US'
      }

      // Slightly elevated pitch (1.18) ensures distinctly feminine, friendly, clear sound
      utterance.pitch = 1.18
      utterance.rate = 0.94

      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => {
        setSpeaking(false)
        onEnd?.()
      }
      utterance.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utterance)
    },
    [supported, voices]
  )

  const cancel = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel()
    }
    setSpeaking(false)
  }, [supported])

  return { speak, cancel, speaking, supported }
}

// ─── Smart Tips by Question ─────────────────────────────────────────────────
const TIPS_LIST = [
  'Use the STAR method (Situation, Task, Action, Result) to structure your answer.',
  'Quantify your impact with metrics, numbers, or percentages whenever possible.',
  'Focus on what YOU personally contributed rather than only what the team did.',
  'Keep your answer concise and targeted, aiming for 1 to 2 minutes.',
  'Mention the key technical tools, frameworks, and architecture you utilized.',
  'Highlight problem-solving reasoning and how you handled roadblocks.',
  'Conclude with the lesson learned or how that experience helped you grow.',
]

// ─── Main 50/50 Split Zero-Scroll Interview Screen ───────────────────────────
const InterviewSession = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [session, setSession] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState('')

  // Control Bar States (NO screen sharing)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isMicActive, setIsMicActive] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [stream, setStream] = useState(null)
  const [isMediaRecording, setIsMediaRecording] = useState(false)

  // View Switcher: 'candidate' (default full user video) or 'ai' (full AI avatar)
  const [mainView, setMainView] = useState('ai')

  // 5-Second Delay before AI speaks
  const [speechCountdown, setSpeechCountdown] = useState(5)
  const [isCountingDown, setIsCountingDown] = useState(true)

  // Timers
  const [questionSeconds, setQuestionSeconds] = useState(40)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const startTime = useRef(Date.now())

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const recordingStartTimeRef = useRef(null)

  // Speech Handlers
  const handleTranscript = useCallback((t) => setAnswerText(t), [])
  const {
    listening,
    supported: speechSupported,
    start: startMic,
    stop: stopMic,
    resetTranscript,
    syncTranscript,
  } = useSpeechRecognition(handleTranscript)
  const { speak, cancel: cancelSpeech, speaking } = useSpeechSynthesis()

  // Hardware Camera Stop
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch (e) {
          console.error('Error stopping track:', e)
        }
      })
      streamRef.current = null
    }
    setStream(null)
    setIsCameraActive(false)
  }, [])

  // Hardware Camera Start (captures selfie video + microphone for unified recordings)
  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 }, // 640x480 gives crisp clarity while keeping storage ultra-compact
          height: { ideal: 480 },
        },
        audio: true,
      })
      streamRef.current = s
      setStream(s)
      setIsCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = s
      }
    } catch (err) {
      console.warn('Camera with audio failed, falling back to video only:', err)
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        })
        streamRef.current = s
        setStream(s)
        setIsCameraActive(true)
        if (videoRef.current) {
          videoRef.current.srcObject = s
        }
      } catch (e2) {
        console.warn('Camera permission denied or unavailable:', e2)
        setIsCameraActive(false)
      }
    }
  }, [])

  // Audio Only Stream for Audio Mode
  const startAudioStream = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = s
      setStream(s)
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err)
    }
  }, [])

  // Stop All Media
  const stopAllMedia = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop()
      } catch {}
    }
    setIsMediaRecording(false)
    stopCamera()
    stopMic()
    cancelSpeech()
  }, [stopCamera, stopMic, cancelSpeech])

  // Start Ultra-Low Space Recording (250 kbps video / 32 kbps audio)
  const startRecording = useCallback(() => {
    if (!streamRef.current || typeof MediaRecorder === 'undefined') return
    const mode = session?.mode || 'video'
    if (mode === 'text') return // text mode does not record media

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop()
      } catch {}
    }

    try {
      recordedChunksRef.current = []
      const mimeType = getBestMimeType(mode)

      const options = {
        videoBitsPerSecond: 250000, // 250 kbps - High compression, minimal storage
        audioBitsPerSecond: 32000,  // 32 kbps - Crisp voice audio
      }
      if (mimeType) {
        options.mimeType = mimeType
      }

      const recorder = new MediaRecorder(streamRef.current, options)
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data)
        }
      }

      recorder.start(1000)
      mediaRecorderRef.current = recorder
      recordingStartTimeRef.current = Date.now()
      setIsMediaRecording(true)
    } catch (err) {
      console.warn('Could not start MediaRecorder:', err)
      setIsMediaRecording(false)
    }
  }, [session?.mode])

  // Stop Recorder and Save Clip into IndexedDB
  const stopAndSaveRecording = useCallback(async (qNum, qText) => {
    setIsMediaRecording(false)
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(null)
        return
      }

      recorder.onstop = async () => {
        try {
          const mode = session?.mode || 'video'
          const mimeType = recorder.mimeType || (mode === 'audio' ? 'audio/webm' : 'video/webm')
          const blob = new Blob(recordedChunksRef.current, { type: mimeType })
          recordedChunksRef.current = []

          const durationSeconds = recordingStartTimeRef.current
            ? Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
            : 0

          if (blob && blob.size > 0) {
            const saved = await saveRecording({
              sessionId,
              jobRole: session?.job_role || 'Mock Interview',
              difficulty: session?.difficulty || 'Practice',
              mode,
              questionNumber: qNum,
              questionText: qText,
              blob,
              durationSeconds,
              userId: user?.id,
              userEmail: user?.email,
            })
            resolve(saved)
            return
          }
        } catch (e) {
          console.error('Error saving recording clip:', e)
        }
        resolve(null)
      }

      try {
        recorder.stop()
      } catch {
        resolve(null)
      }
    })
  }, [sessionId, session, user])

  // Load Session Detail and set up mode-based media
  useEffect(() => {
    getInterviewDetail(sessionId).then((res) => {
      const s = res.data
      setSession(s)
      const smode = s?.mode || 'text'
      if (smode === 'video') {
        setIsCameraActive(true)
        setIsMicActive(true)
        setMainView('candidate')
        startCamera()
      } else if (smode === 'audio') {
        stopCamera()
        setIsCameraActive(false)
        setIsMicActive(true)
        setMainView('ai')
        startAudioStream()
      } else {
        // text mode: neither camera nor mic auto-starts
        stopCamera()
        setIsCameraActive(false)
        setIsMicActive(false)
        setMainView('ai')
      }
    })
    return () => {
      stopAllMedia()
    }
  }, [sessionId, startCamera, startAudioStream, stopCamera, stopAllMedia])

  // Connect stream to video element
  useEffect(() => {
    if (videoRef.current && stream && isCameraActive) {
      videoRef.current.srcObject = stream
    }
  }, [stream, isCameraActive, mainView])

  // Timers
  useEffect(() => {
    if (isPaused || isCompleted) return

    const interval = setInterval(() => {
      setQuestionSeconds((prev) => (prev > 0 ? prev - 1 : 0))
      setRecordingSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isPaused, isCompleted])

  // Immediate speech trigger (if user clicks "Speak Now" or skips the 5s delay)
  const handleSpeakImmediately = useCallback(() => {
    setIsCountingDown(false)
    setSpeechCountdown(0)
    resetTranscript()
    const q = session?.questions?.[current]
    if (q?.question_text) {
      speak(q.question_text, () => {
        if (session?.mode !== 'text' && isMicActive && !isPaused) {
          startMic()
          startRecording()
        }
      })
      // Also start mic right away so candidate can speak immediately
      if (session?.mode !== 'text' && isMicActive && !isPaused) {
        startMic()
        startRecording()
      }
    }
  }, [session, current, isMicActive, isPaused, speak, startMic, startRecording, resetTranscript])

  // When question changes: 5-second countdown, then speak and start mic & recording
  useEffect(() => {
    if (!session || isCompleted) return
    stopMic()
    cancelSpeech()
    resetTranscript()

    setSpeechCountdown(5)
    setIsCountingDown(true)
    setQuestionSeconds(40)
    setRecordingSeconds(0)

    let remaining = 5
    const countdownInterval = setInterval(() => {
      remaining -= 1
      setSpeechCountdown(remaining)
      if (remaining <= 0) {
        clearInterval(countdownInterval)
        setIsCountingDown(false)
        const q = session.questions?.[current]
        if (q?.question_text) {
          speak(q.question_text, () => {
            if (session.mode !== 'text' && isMicActive && !isPaused) {
              startMic()
              startRecording()
            }
          })
          // Fallback: If speech synthesis takes more than 1 second, ensure mic starts so candidate can respond
          if (session.mode !== 'text' && isMicActive && !isPaused) {
            setTimeout(() => {
              startMic()
              startRecording()
            }, 1200)
          }
        }
      }
    }, 1000)

    return () => {
      clearInterval(countdownInterval)
      cancelSpeech()
    }
  }, [current, session, isCompleted]) // eslint-disable-line react-hooks/exhaustive-deps

  const questions = session?.questions || []
  const question = questions[current]
  const isLast = current === questions.length - 1

  // Format MM:SS
  const formatTime = (totalSec) => {
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0')
    const s = String(totalSec % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  // Advance or Complete
  const advanceToNextOrFinish = () => {
    if (isLast) {
      stopAllMedia()
      setIsCompleted(true)
    } else {
      stopMic()
      cancelSpeech()
      resetTranscript()
      setCurrent((c) => c + 1)
      setAnswerText('')
      startTime.current = Date.now()
    }
  }

  // Submit Answer (supports manual submission or automatic transition on 40s timeout)
  const handleSubmitAnswer = async (isAutoSubmit = false) => {
    if (submitting) return
    // When manually clicking, confirm if answer is empty. If auto-submitting on 40s timeout, do NOT block with dialog
    if (!isAutoSubmit && !answerText.trim() && !window.confirm('Submit without answer text?')) return
    if (listening) stopMic()
    setSubmitting(true)
    setError('')
    const speakingTime = Math.round((Date.now() - startTime.current) / 1000)

    try {
      // Save recorded response clip before submitting
      await stopAndSaveRecording(current + 1, question?.question_text)

      await submitAnswer(sessionId, {
        question_id: question.id,
        answer_text: answerText.trim() || (isAutoSubmit ? 'Time expired before response.' : 'Passed without verbal response.'),
        speaking_time_seconds: speakingTime,
      })
      advanceToNextOrFinish()
    } catch {
      setError('Could not submit answer. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Ref to always hold latest handleSubmitAnswer for key listeners & timer
  const handleSubmitRef = useRef(handleSubmitAnswer)
  useEffect(() => {
    handleSubmitRef.current = handleSubmitAnswer
  })

  // Auto-advance to next question when 40 seconds expire
  useEffect(() => {
    if (questionSeconds === 0 && !isCountingDown && !submitting && !isCompleted && session && question) {
      handleSubmitRef.current(true)
    }
  }, [questionSeconds, isCountingDown, submitting, isCompleted, session, question])

  // Enter key handler inside Textarea (Enter = submit, Shift + Enter = new line)
  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return // allow new line
      }
      e.preventDefault()
      if (!submitting) {
        handleSubmitRef.current()
      }
    }
  }

  // Global Enter key listener (allows pressing Enter anywhere to submit answer)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key !== 'Enter' || e.shiftKey) return
      // If currently focused inside a textarea or input, that element's own onKeyDown handles it
      if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
        return
      }
      if (!isCompleted && !submitting && session) {
        e.preventDefault()
        handleSubmitRef.current()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isCompleted, submitting, session])

  // Skip question
  const handleSkip = async () => {
    if (submitting) return
    if (listening) stopMic()
    cancelSpeech()
    try {
      await stopAndSaveRecording(current + 1, question?.question_text)
    } catch {}
    advanceToNextOrFinish()
  }

  // Camera toggle button
  const toggleCamera = async () => {
    if (isCameraActive) {
      stopCamera()
    } else {
      await startCamera()
    }
  }

  // Mic toggle button
  const toggleMic = () => {
    if (isMicActive) {
      stopMic()
      setIsMicActive(false)
    } else {
      setIsMicActive(true)
      if (!speaking && !isPaused) {
        startMic()
      }
    }
  }

  // Pause / Resume toggle
  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false)
      if (mediaRecorderRef.current?.state === 'paused') {
        try {
          mediaRecorderRef.current.resume()
        } catch {}
      }
      if (isMicActive && !speaking) startMic()
    } else {
      setIsPaused(true)
      if (mediaRecorderRef.current?.state === 'recording') {
        try {
          mediaRecorderRef.current.pause()
        } catch {}
      }
      stopMic()
      cancelSpeech()
    }
  }

  // End Call / Finish early
  const handleEndCall = async () => {
    if (window.confirm('Do you want to end the interview and generate your feedback report?')) {
      if (answerText.trim() && question) {
        try {
          const speakingTime = Math.round((Date.now() - startTime.current) / 1000)
          await submitAnswer(sessionId, {
            question_id: question.id,
            answer_text: answerText.trim(),
            speaking_time_seconds: speakingTime,
          })
        } catch (e) {
          console.warn('Could not submit active answer prior to finishing:', e)
        }
      }
      try {
        await stopAndSaveRecording(current + 1, question?.question_text)
      } catch {}
      stopAllMedia()
      setIsCompleted(true)
    }
  }

  // Open Final Feedback Report
  const handleOpenFeedback = async () => {
    setCompleting(true)
    setError('')
    try {
      await completeInterview(sessionId)
      navigate(`/interview/${sessionId}/report`)
    } catch {
      setError('Could not generate final report. Try again.')
      setCompleting(false)
    }
  }

  return (
    <div className="h-screen max-h-screen w-full bg-[#F4F6FB] dark:bg-[#080D1A] flex flex-col p-2 sm:p-4 lg:p-5 select-none font-sans overflow-hidden transition-colors duration-200">
      {/* ─── Outer Card Frame (Fits Exact Viewport Height with Zero Scroll) ─── */}
      <div className="w-full h-full max-w-[1400px] mx-auto bg-white dark:bg-[#0A0F1D] rounded-2xl sm:rounded-3xl p-3 sm:p-5 lg:p-6 shadow-[0_10px_40px_-10px_rgba(30,58,138,0.08)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between overflow-hidden transition-colors duration-200">
        
        {/* ─── Top Header Bar (Slim & Clean) ─── */}
        <header className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.confirm('Leave interview session?')) {
                  stopAllMedia()
                  navigate('/dashboard')
                }
              }}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#131E38] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors border border-transparent dark:border-slate-700/60"
              title="Back to Dashboard"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div>
              <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {session?.job_role || 'AI Mock Interview'}
              </h1>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-400">
                {session?.difficulty || 'Practice'} · {session?.mode || 'Video'} Mode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isMediaRecording && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-bold font-mono border border-rose-200 dark:border-rose-900/60">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                REC (Space Saver)
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 text-[11px] font-bold font-mono border border-blue-100 dark:border-blue-900/60">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              LIVE
            </span>
            <button
              onClick={handleEndCall}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-2.5 sm:px-3 py-1 rounded-xl transition-colors border border-rose-200 dark:border-rose-900/60"
            >
              End Call
            </button>
          </div>
        </header>

        {error && (
          <div className="my-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-between shrink-0">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-rose-500 font-bold ml-2">✕</button>
          </div>
        )}

        {isCompleted ? (
          /* ─── Completed View ─── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="my-auto py-8 px-4 text-center max-w-md mx-auto"
          >
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl shadow-inner border border-transparent dark:border-blue-900/50">
              🎉
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1.5">
              Interview Finished!
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 leading-relaxed">
              All questions have been completed. Your camera and microphone are safely turned off.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 text-[11px] font-mono font-bold mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Camera & Microphone: OFF
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleOpenFeedback}
                disabled={completing}
                className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 dark:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2"
              >
                {completing ? 'Generating AI Feedback Report...' : '📊 Open Feedback & Comprehensive Report →'}
              </button>
              <button
                onClick={() => navigate('/recordings')}
                className="w-full py-2.5 px-6 rounded-xl bg-slate-100 dark:bg-[#131E38] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
              >
                📼 View Session Recordings Vault
              </button>
            </div>
          </motion.div>
        ) : (
          /* ─── EXACT 50 / 50 SPLIT (Half Video / Half Questions - NO SCROLL) ─── */
          <div className="flex-1 min-h-0 pt-2.5 sm:pt-3 grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-5 lg:gap-6 items-stretch">
            
            {/* ═════════════════════════════════════════════════════════════════
                LEFT HALF (50%): FULL-FRAME LIVE VIDEO + COMPACT CONTROLS
            ═════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col h-full justify-between gap-2.5 min-h-0">
              
              {/* Full-Frame Video Screen */}
              <div className="flex-1 min-h-0 relative w-full rounded-2xl overflow-hidden bg-slate-900 shadow-sm border border-slate-100 flex items-center justify-center group">
                
                {/* 1. CANDIDATE FULL VIDEO */}
                {mainView === 'candidate' ? (
                  isCameraActive && stream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : (
                    /* Fallback when Camera is Off */
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 text-slate-400 p-4 text-center">
                      <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center mb-2 shadow-md">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                          <line x1="1" y1="1" x2="23" y2="23"/>
                          <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"/>
                        </svg>
                      </div>
                      <p className="font-bold text-slate-300 text-xs mb-1">Camera is Off</p>
                      <button
                        onClick={startCamera}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors shadow-sm"
                      >
                        Turn On Camera 📹
                      </button>
                    </div>
                  )
                ) : (
                  /* 2. AI INTERVIEWER FULL VIDEO (If Swapped) */
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80"
                    alt="AI Interviewer"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Picture-in-Picture (PIP) only in Video mode */}
                {session?.mode === 'video' && (
                  <div
                    onClick={() => setMainView(v => (v === 'candidate' ? 'ai' : 'candidate'))}
                    title="Click to Swap Video View"
                    className="absolute top-2.5 right-2.5 w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden border-2 border-white shadow-lg z-20 bg-slate-800 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  >
                    {mainView === 'candidate' ? (
                      <div className="relative w-full h-full">
                        <img
                          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80"
                          alt="AI Interviewer PIP"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/15 flex items-end p-0.5">
                          <span className="text-[8px] font-bold text-white bg-black/70 px-1 py-0.2 rounded backdrop-blur-xs flex items-center gap-0.5">
                            AI 🔄
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full bg-slate-800">
                        {isCameraActive && stream ? (
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform -scale-x-100"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                            Off
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/15 flex items-end p-0.5">
                          <span className="text-[8px] font-bold text-white bg-black/70 px-1 py-0.2 rounded backdrop-blur-xs flex items-center gap-0.5">
                            You 🔄
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Top-Left Tag Badge */}
                <div className="absolute top-2.5 left-2.5 z-20 bg-white/95 dark:bg-[#0D1527]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${mainView === 'candidate' && isCameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-blue-600 animate-pulse'}`} />
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                    {session?.mode === 'video'
                      ? (mainView === 'candidate' ? (user?.username || 'You: Live 📹') : 'AI Interviewer (Sophia)')
                      : session?.mode === 'audio'
                      ? 'AI Interviewer (Sophia) · Audio Mode 🎙️'
                      : 'AI Interviewer (Sophia) · Text Mode 📝'}
                  </span>
                </div>

                {/* Bottom-Left Status Pill */}
                <div className="absolute bottom-2.5 left-2.5 z-20 bg-white/95 dark:bg-[#0D1527]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                    <span className="w-1 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                    <span className="w-1 h-3.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 tracking-tight">
                    {isCountingDown
                      ? `Sophia speaking in ${speechCountdown}s...`
                      : speaking
                      ? 'Speaking...'
                      : isPaused
                      ? 'Paused'
                      : listening
                      ? 'Listening...'
                      : 'Ready'}
                  </span>
                </div>
              </div>

              {/* ─── Compact Controls Bar (NO SCREEN SHARE OPTION) ─── */}
              <div className="shrink-0 flex justify-center w-full">
                <div className="bg-slate-50 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800/90 rounded-2xl px-3 sm:px-5 py-1.5 sm:py-2 flex items-center justify-around sm:justify-center gap-2 sm:gap-6 w-full sm:w-auto shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                  
                  {/* 1. Camera Toggle (Only in Video mode) */}
                  {session?.mode === 'video' && (
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        onClick={toggleCamera}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
                          isCameraActive
                            ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/40 shadow-xs dark:shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                            : 'bg-white dark:bg-[#131E38] text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        title={isCameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                        </svg>
                      </button>
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Camera</span>
                    </div>
                  )}

                  {/* 2. Mic Toggle (In Audio or Video mode) */}
                  {session?.mode !== 'text' && (
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        onClick={toggleMic}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
                          isMicActive
                            ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/40 shadow-xs dark:shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                            : 'bg-white dark:bg-[#131E38] text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        title={isMicActive ? 'Mute Mic' : 'Unmute Mic'}
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      </button>
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Mic</span>
                    </div>
                  )}

                  {/* 3. Pause Toggle */}
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      onClick={togglePause}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
                        isPaused
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                          : 'bg-white dark:bg-[#131E38] text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700/80 hover:bg-blue-50 dark:hover:bg-slate-700'
                      }`}
                      title={isPaused ? 'Resume' : 'Pause'}
                    >
                      {isPaused ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>
                        </svg>
                      )}
                    </button>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      {isPaused ? 'Resume' : 'Pause'}
                    </span>
                  </div>

                  {/* 4. Swap View Toggle (Only in Video mode) */}
                  {session?.mode === 'video' && (
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        onClick={() => setMainView(v => (v === 'candidate' ? 'ai' : 'candidate'))}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-[#131E38] border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all"
                        title="Swap Main Camera / AI View"
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/>
                        </svg>
                      </button>
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Swap</span>
                    </div>
                  )}

                  {/* 5. End Call Button (Solid Red) */}
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      onClick={handleEndCall}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all"
                      title="End Interview"
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.15-2.66 1.94a1 1 0 0 1-1.42 0L.3 13.2a1 1 0 0 1 0-1.41C2.5 9.54 6.94 8 12 8s9.5 1.54 11.7 3.79c.39.39.39 1.02 0 1.41l-2.46 2.46a1 1 0 0 1-1.42 0 12.8 12.8 0 0 0-2.66-1.94.99.99 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                      </svg>
                    </button>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">End</span>
                  </div>

                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════
                RIGHT HALF (50%): QUESTION GENERATION & SUBMIT (NO SCROLL)
            ═════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col h-full justify-between gap-2.5 min-h-0">
              
              {/* Card 1: Current Question with Timer & 5s AI Speech Delay */}
              <div className="bg-slate-50/70 dark:bg-[#0D1527] rounded-2xl p-3 sm:p-4 border border-slate-200/70 dark:border-slate-800/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Current Question
                    </span>
                    {isCountingDown ? (
                      <button
                        onClick={handleSpeakImmediately}
                        title="Click to hear question immediately without waiting 5s"
                        className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1 transition-colors animate-pulse border border-amber-300 dark:border-amber-700/60"
                      >
                        <span>⏳ {speechCountdown}s</span>
                        <span className="text-amber-900 dark:text-amber-200 font-extrabold underline">Speak now ⚡</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (question?.question_text) {
                            speak(question.question_text)
                          }
                        }}
                        title="Listen to Question (AI Sophia Voice)"
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors ${
                          speaking
                            ? 'bg-blue-600 text-white animate-pulse'
                            : 'bg-blue-100 dark:bg-[#131E38] hover:bg-blue-200 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-400 border border-transparent dark:border-slate-700'
                        }`}
                      >
                        <span>🔊</span>
                        <span>{speaking ? 'Speaking...' : 'AI Voice'}</span>
                      </button>
                    )}
                  </div>
                  <div
                    className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-lg border shadow-2xs transition-all ${
                      questionSeconds <= 10
                        ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 animate-pulse'
                        : 'text-blue-600 dark:text-blue-400 bg-white dark:bg-[#131E38] border-blue-100 dark:border-slate-700'
                    }`}
                    title={`${questionSeconds}s remaining · Next question opens automatically on 0s`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>{formatTime(questionSeconds)}</span>
                  </div>
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-3">
                  {question?.question_text || 'Tell me about a time you solved a difficult problem.'}
                </p>
              </div>

              {/* Card 2: Your Answer (Audio Waveform + Recording status / Interactive Textarea) */}
              <div className="bg-slate-50/70 dark:bg-[#0D1527] rounded-2xl p-3 sm:p-3.5 border border-slate-200/70 dark:border-slate-800/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Your Answer
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {formatTime(recordingSeconds)}
                    </span>
                    {session?.mode === 'text' ? (
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                        Typing Mode ⌨️
                      </span>
                    ) : (
                      <>
                        {listening && !isPaused ? (
                          <button
                            type="button"
                            onClick={stopMic}
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 animate-pulse cursor-pointer shadow-2xs"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>🔴 Speaking Live... (Mic On)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsMicActive(true)
                              startMic()
                            }}
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                          >
                            <span>🎤 Tap to Speak / Dictate</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Compact Waveform only in audio/video mode */}
                {session?.mode !== 'text' && (
                  <div className="my-0.5">
                    <AudioWaveformBars isRecording={listening || !!answerText} isPaused={isPaused} />
                  </div>
                )}

                {/* Editable Text Area (allows typing in text mode and live editing/dictation in audio/video) */}
                <div className="mt-1">
                  <textarea
                    value={answerText}
                    onChange={(e) => {
                      setAnswerText(e.target.value)
                      syncTranscript(e.target.value)
                    }}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder={
                      session?.mode === 'text'
                        ? 'Type your detailed answer here...'
                        : 'Speak into your microphone now (words appear here in real-time) or type directly...'
                    }
                    rows={session?.mode === 'text' ? 4 : 2}
                    className="w-full p-2 bg-white dark:bg-[#131E38] rounded-xl text-xs sm:text-[13px] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 outline-none resize-none leading-relaxed transition-all"
                  />
                  {session?.mode !== 'text' && (
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      <span>
                        {listening
                          ? '🟢 Live audio dictation active'
                          : '⚪ Mic paused. Tap "Tap to Speak" or type answer'}
                      </span>
                      <span>{answerText ? `${answerText.length} chars` : 'Ready to record'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Interview Progress Bar */}
              <div className="bg-slate-50/70 dark:bg-[#0D1527] rounded-2xl p-2.5 sm:p-3 border border-slate-200/70 dark:border-slate-800/90 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Interview Progress
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                    {current + 1} / {questions.length}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                    style={{
                      width: `${Math.round(((current + 1) / Math.max(1, questions.length)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Card 4: Tips Box */}
              <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl p-2.5 sm:p-3 border border-blue-100 dark:border-blue-900/60 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18h6"/><path d="M10 22h4"/>
                    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block leading-none mb-0.5">
                    Tips
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug font-medium line-clamp-2">
                    {TIPS_LIST[current % TIPS_LIST.length]}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Skip and Next Question */}
              <div className="flex items-center gap-2 pt-0.5 shrink-0">
                <button
                  onClick={handleSkip}
                  disabled={submitting}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors border border-slate-200 dark:border-slate-700/80 shrink-0"
                >
                  {isLast ? 'Skip & Finish' : 'Skip ⏭️'}
                </button>
                <button
                  onClick={handleSubmitAnswer}
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 dark:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all text-center truncate cursor-pointer"
                >
                  {submitting ? 'Saving...' : isLast ? 'Submit & Finish Interview →' : 'Submit & Next Question →'}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InterviewSession
