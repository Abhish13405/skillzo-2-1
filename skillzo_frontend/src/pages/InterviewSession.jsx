import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getInterviewDetail, submitAnswer, completeInterview, uploadInterviewRecording } from '../api/interview'
import { useAuth } from '../context/AuthContext'
import { saveRecording, getAllRecordings, markRecordingUploaded } from '../utils/recordingsDb'

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

// ─── Mobile Device Detection Helper ───────────────────────────────────────────
const isMobileDevice = () => {
  if (typeof window === 'undefined' || !navigator.userAgent) return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
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

// ─── Overlap-Aware Transcript Merger (Prevents duplicate repeated words) ──────
const mergeTranscripts = (base, newSpoken) => {
  const b = (base || '').trim()
  const n = (newSpoken || '').trim()

  if (!b) return n
  if (!n) return b
  if (b.toLowerCase() === n.toLowerCase()) return b

  // If base already ends with newSpoken, do not duplicate
  if (b.toLowerCase().endsWith(n.toLowerCase())) {
    return b
  }

  // If newSpoken already begins with base, take newSpoken
  if (n.toLowerCase().startsWith(b.toLowerCase())) {
    return n
  }

  const bWords = b.split(/\s+/)
  const nWords = n.split(/\s+/)

  // Find longest matching word suffix of base that matches prefix of newSpoken
  const maxCheck = Math.min(bWords.length, nWords.length, 10)
  for (let len = maxCheck; len >= 1; len--) {
    const bSlice = bWords.slice(-len).map(w => w.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/gi, '')).join(' ')
    const nSlice = nWords.slice(0, len).map(w => w.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/gi, '')).join(' ')

    if (bSlice && bSlice === nSlice) {
      const remainingNewWords = nWords.slice(len)
      if (remainingNewWords.length === 0) return b
      return `${b} ${remainingNewWords.join(' ')}`.trim()
    }
  }

  // Deduplicate single repeating words (e.g. "hello" + "hello")
  const lastBWord = bWords[bWords.length - 1].toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/gi, '')
  if (nWords.every(w => w.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/gi, '') === lastBWord)) {
    return b
  }

  return `${b} ${n}`.trim()
}

// ─── Continuous & Resilient Speech Recognition Hook ───────────────────────────
const getSpeechRecognitionAPI = () => {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

const useSpeechRecognition = (onTranscript, onSpeechActivity, language = 'en-IN') => {
  const recognitionRef = useRef(null)
  const isExplicitlyStoppedRef = useRef(false)
  const isRunningRef = useRef(false)
  const isStartingRef = useRef(false)
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => !!getSpeechRecognitionAPI())
  const [speechError, setSpeechError] = useState('')

  const baseTextRef = useRef('')
  const currentFinalRef = useRef('')
  const currentSessionSpokenRef = useRef('')
  const restartTimerRef = useRef(null)

  const onTranscriptRef = useRef(onTranscript)
  const onSpeechActivityRef = useRef(onSpeechActivity)
  const languageRef = useRef(language)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
    onSpeechActivityRef.current = onSpeechActivity
    const prevLang = languageRef.current
    languageRef.current = language

    if (prevLang !== language && isRunningRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.lang = language
        recognitionRef.current.abort()
      } catch {}
    }
  }, [onTranscript, onSpeechActivity, language])

  const start = useCallback(() => {
    const SpeechAPI = getSpeechRecognitionAPI()
    if (!SpeechAPI) return

    isExplicitlyStoppedRef.current = false
    setSpeechError('')

    if (isRunningRef.current || isStartingRef.current) {
      setListening(true)
      return
    }

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null
        recognitionRef.current.onend = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onresult = null
        recognitionRef.current.abort()
      } catch {}
      recognitionRef.current = null
    }

    isStartingRef.current = true
    let recognition
    try {
      recognition = new SpeechAPI()
    } catch (e) {
      console.warn('SpeechAPI instantiation error:', e)
      isStartingRef.current = false
      isRunningRef.current = false
      return
    }

    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang = languageRef.current || 'en-IN'

    currentFinalRef.current = ''
    currentSessionSpokenRef.current = ''

    recognition.onstart = () => {
      isStartingRef.current = false
      isRunningRef.current = true
      setListening(true)
      setSpeechError('')
    }

    recognition.onspeechstart = () => {
      onSpeechActivityRef.current?.()
    }

    recognition.onresult = (event) => {
      onSpeechActivityRef.current?.()
      let sessionFinal = ''
      let sessionInterim = ''

      for (let i = 0; i < event.results.length; i++) {
        const item = event.results[i]
        const text = item[0]?.transcript || ''
        if (item.isFinal) {
          sessionFinal += text + ' '
        } else {
          sessionInterim += text
        }
      }

      currentFinalRef.current = sessionFinal.trim()
      const sessionSpoken = (sessionFinal + sessionInterim).trim()
      currentSessionSpokenRef.current = sessionSpoken

      const base = baseTextRef.current.trim()
      const combined = mergeTranscripts(base, sessionSpoken)

      if (combined) {
        onTranscriptRef.current?.(combined)
      }
    }

    recognition.onerror = (event) => {
      isStartingRef.current = false
      console.warn('SpeechRecognition error:', event.error)
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return
      }
      if (event.error === 'not-allowed') {
        setSpeechError('Microphone permission blocked. Please allow mic in browser.')
        isExplicitlyStoppedRef.current = true
        isRunningRef.current = false
        setListening(false)
        return
      }
      if (event.error === 'audio-capture' || event.error === 'network') {
        isRunningRef.current = false
        setListening(false)
        console.warn('SpeechRecognition audio-capture or network error:', event.error)
      }
    }

    recognition.onend = () => {
      isStartingRef.current = false
      isRunningRef.current = false
      if (currentSessionSpokenRef.current.trim()) {
        const base = baseTextRef.current.trim()
        const add = currentSessionSpokenRef.current.trim()
        baseTextRef.current = mergeTranscripts(base, add)
        currentSessionSpokenRef.current = ''
        currentFinalRef.current = ''
      }

      // Restart speech recognition smoothly if candidate is still in their active answering window
      if (!isExplicitlyStoppedRef.current) {
        setListening(true)
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
        restartTimerRef.current = setTimeout(() => {
          if (!isExplicitlyStoppedRef.current && !isRunningRef.current) {
            start()
          }
        }, isMobileDevice() ? 350 : 150)
      } else {
        setListening(false)
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (e) {
      isStartingRef.current = false
      if (e.name === 'InvalidStateError') {
        isRunningRef.current = true
        setListening(true)
      } else {
        isRunningRef.current = false
        console.warn('Recognition start caught error:', e)
        if (!isExplicitlyStoppedRef.current) {
          setTimeout(() => {
            if (!isExplicitlyStoppedRef.current && !isRunningRef.current) {
              start()
            }
          }, 250)
        }
      }
    }
  }, [])

  const stop = useCallback(() => {
    isExplicitlyStoppedRef.current = true
    isStartingRef.current = false
    isRunningRef.current = false
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
    if (currentSessionSpokenRef.current.trim()) {
      const base = baseTextRef.current.trim()
      const add = currentSessionSpokenRef.current.trim()
      baseTextRef.current = mergeTranscripts(base, add)
      currentSessionSpokenRef.current = ''
      currentFinalRef.current = ''
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null
        recognitionRef.current.onend = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onresult = null
        recognitionRef.current.abort()
      } catch {}
      recognitionRef.current = null
    }
    setListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    baseTextRef.current = ''
    currentFinalRef.current = ''
    currentSessionSpokenRef.current = ''
    // Abort active recognition session to flush browser native result buffer
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {}
    }
  }, [])

  const syncTranscript = useCallback((text) => {
    baseTextRef.current = text ? text.trim() : ''
    currentFinalRef.current = ''
    currentSessionSpokenRef.current = ''
  }, [])

  return { listening, supported, speechError, start, stop, resetTranscript, syncTranscript }
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
  const activeUtteranceRef = useRef(null)
  const resumeIntervalRef = useRef(null)
  const watchdogTimerRef = useRef(null)

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
      if (resumeIntervalRef.current) clearInterval(resumeIntervalRef.current)
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current)
    }
  }, [supported])

  const speak = useCallback(
    (text, onEnd) => {
      if (!supported || !text) {
        onEnd?.()
        return
      }

      if (resumeIntervalRef.current) {
        clearInterval(resumeIntervalRef.current)
        resumeIntervalRef.current = null
      }
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current)
        watchdogTimerRef.current = null
      }

      let ended = false
      const finishOnce = () => {
        if (!ended) {
          ended = true
          if (resumeIntervalRef.current) {
            clearInterval(resumeIntervalRef.current)
            resumeIntervalRef.current = null
          }
          if (watchdogTimerRef.current) {
            clearTimeout(watchdogTimerRef.current)
            watchdogTimerRef.current = null
          }
          setSpeaking(false)
          activeUtteranceRef.current = null
          onEnd?.()
        }
      }

      try {
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

        utterance.pitch = 1.15
        utterance.rate = 0.95

        utterance.onstart = () => {
          setSpeaking(true)
        }
        utterance.onend = () => {
          finishOnce()
        }
        utterance.onerror = () => {
          finishOnce()
        }

        activeUtteranceRef.current = utterance
        setSpeaking(true)
        window.speechSynthesis.speak(utterance)

        // Chromium keep-alive: prevents Chromium engine from silently auto-pausing long utterances
        resumeIntervalRef.current = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            finishOnce()
          } else if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume()
          }
        }, 1000)

        // Adaptive Mobile/Desktop Watchdog: based on question word count (approx 2 words per second + 3s buffer)
        // Prevents mobile browsers (Android Chrome / Safari) from hanging or freezing candidate mic access!
        const wordCount = (text || '').trim().split(/\s+/).length
        const maxSpeechMs = Math.max(3000, Math.min(10000, Math.round((wordCount / 2) * 1000) + 3000))
        watchdogTimerRef.current = setTimeout(() => {
          if (!ended) {
            try {
              window.speechSynthesis.cancel()
            } catch {}
            finishOnce()
          }
        }, maxSpeechMs)
      } catch (err) {
        console.warn('Speech synthesis caught error:', err)
        finishOnce()
      }
    },
    [supported, voices]
  )

  const cancel = useCallback(() => {
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current)
      resumeIntervalRef.current = null
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current)
      watchdogTimerRef.current = null
    }
    if (supported && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }
    setSpeaking(false)
    activeUtteranceRef.current = null
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

// ─── Question Duration Limit (15 seconds maximum answer time per question) ───
const TOTAL_QUESTION_SECONDS = 15

// ─── Main 50/50 Split Zero-Scroll Interview Screen ───────────────────────────
const InterviewSession = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const [session, setSession] = useState(null)
  const isHrSession = Boolean(
    location.search.includes('track=hr') ||
    location.state?.isHRTrack ||
    (session?.job_role && (
      session.job_role.toLowerCase().includes('hr') ||
      session.job_role.toLowerCase().includes('behavioral') ||
      session.job_role.toLowerCase().includes('placement') ||
      session.job_role.toLowerCase().includes('culture') ||
      session.job_role.toLowerCase().includes('leadership')
    ))
  )
  const isResumeSession = Boolean(
    location.search.includes('track=resume') ||
    location.state?.isResumeTrack ||
    session?.resume ||
    (session?.job_role && session.job_role.toLowerCase().includes('resume'))
  )
  const [loadingSession, setLoadingSession] = useState(true)
  const [current, setCurrent] = useState(0)
  const questions = session?.questions || []
  const question = questions[current] || null
  const isLast = questions.length > 0 && current === questions.length - 1
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState('')
  const [showTip, setShowTip] = useState(false)
  const [uploadingCloud, setUploadingCloud] = useState(false)
  const [cloudUploadStatus, setCloudUploadStatus] = useState('idle') // 'idle', 'uploading', 'done', 'error'

  // Control Bar States (NO screen sharing)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isMicActive, setIsMicActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [stream, setStream] = useState(null)
  const [isMediaRecording, setIsMediaRecording] = useState(false)

  // View Switcher: 'candidate' (default full user video) or 'ai' (full AI avatar)
  const [mainView, setMainView] = useState('ai')

  // Delay before AI speaks
  const [speechCountdown, setSpeechCountdown] = useState(2)
  const [isCountingDown, setIsCountingDown] = useState(true)
  const [isAiAsking, setIsAiAsking] = useState(true) // True while AI reads question
  const isAiAskingRef = useRef(true)
  useEffect(() => {
    isAiAskingRef.current = isAiAsking
  }, [isAiAsking])

  // 2-second silent delay between AI finishing question and candidate mic turning ON (Strict: No countdown UI)
  const [isWarmup, setIsWarmup] = useState(false)
  const isWarmupRef = useRef(false)
  const micWarmupTimerRef = useRef(null)

  // Duplicate submission guard refs
  const isSubmittingRef = useRef(false)
  const submittedQuestionIndexRef = useRef(-1)

  // Timers: 15 seconds max per question
  const [questionSeconds, setQuestionSeconds] = useState(TOTAL_QUESTION_SECONDS)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const startTime = useRef(Date.now())
  const sessionStartTimeRef = useRef(Date.now())

  // Completed session metrics & states
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState(() => new Set())
  const [hasRecordings, setHasRecordings] = useState(false)
  const [recordingCount, setRecordingCount] = useState(0)
  const [evaluationStatus, setEvaluationStatus] = useState('pending') // 'pending', 'generating', 'completed', 'failed'

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const recordingStartTimeRef = useRef(null)

  // Direct element ref binder ensures live video track is instantly attached
  const attachVideoRef = useCallback((el) => {
    videoRef.current = el
    if (el) {
      const activeStream = streamRef.current || stream
      if (activeStream && el.srcObject !== activeStream) {
        el.srcObject = activeStream
      }
    }
  }, [stream])

  // ─── Real-time Speech-to-Text Dictation & Synthesis Handlers ───────────
  const [speechLang, setSpeechLang] = useState('en-IN')
  const [silenceSeconds, setSilenceSeconds] = useState(0)
  const lastSpeechTimeRef = useRef(Date.now())
  const aiFinishedForQuestionRef = useRef(false)
  const lastAskedQuestionIndexRef = useRef(-1)

  const { speak, cancel: cancelSpeech, speaking } = useSpeechSynthesis()

  const handleSkipAiVoiceRef = useRef(null)

  // Track candidate speech activity: strictly ignored while AI is speaking or in 2s warmup
  const handleSpeechActivity = useCallback(() => {
    if (isAiAskingRef.current || isWarmupRef.current) {
      return
    }
    lastSpeechTimeRef.current = Date.now()
    setSilenceSeconds(0)
  }, [])

  // Live transcribed speech directly streams into the candidate's answer box in real-time
  const handleTranscript = useCallback((t) => {
    if (isAiAskingRef.current || isWarmupRef.current) {
      return
    }
    lastSpeechTimeRef.current = Date.now()
    setSilenceSeconds(0)
    setAnswerText(t)
  }, [])

  const {
    listening,
    supported: speechSupported,
    speechError,
    start: startMic,
    stop: stopMic,
    resetTranscript,
    syncTranscript,
  } = useSpeechRecognition(handleTranscript, handleSpeechActivity, speechLang)

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
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStream(null)
    setIsCameraActive(false)
  }, [])

  // Hardware Camera Start (captures selfie video + microphone with multi-tier mobile resilience)
  const startCamera = useCallback(async () => {
    let combinedStream = null

    // On mobile devices (Android/iOS): video only!
    // This strictly prevents the camera from locking the hardware microphone away from Web Speech API!
    if (isMobileDevice()) {
      try {
        combinedStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        })
      } catch (mErr1) {
        try {
          combinedStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        } catch (mErr2) {
          console.warn('Mobile video camera acquisition failed:', mErr2)
        }
      }
    } else {
      // Desktop PC/Laptop:
      try {
        combinedStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
      } catch (err1) {
        try {
          combinedStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          })
        } catch (err2) {
          try {
            combinedStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          } catch {}
        }
      }
    }

    if (combinedStream) {
      // Enable video, but strictly mute audio tracks if AI is asking
      combinedStream.getVideoTracks().forEach((track) => {
        track.enabled = true
      })
      combinedStream.getAudioTracks().forEach((track) => {
        track.enabled = !isAiAskingRef.current
      })
      streamRef.current = combinedStream
      setStream(combinedStream)
      setIsCameraActive(combinedStream.getVideoTracks().length > 0)
      if (videoRef.current) {
        videoRef.current.srcObject = combinedStream
      }
    } else {
      setIsCameraActive(false)
    }
  }, [])

  // Audio Only Stream for Audio Mode with resilient fallback
  const startAudioStream = useCallback(async () => {
    let s = null
    try {
      s = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (err) {
      console.warn('Audio constraints failed, falling back to simple audio: true:', err)
      try {
        s = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (e2) {
        console.warn('Microphone permission denied or unavailable:', e2)
      }
    }
    if (s) {
      // Mute audio track initially if AI is asking
      s.getAudioTracks().forEach((t) => {
        t.enabled = !isAiAskingRef.current
      })
      streamRef.current = s
      setStream(s)
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

  // Start High-Reliability Video/Audio Recording with multi-tier fallback & self-healing audio track
  const startRecording = useCallback(async () => {
    const activeStream = streamRef.current || stream
    if (!activeStream || typeof MediaRecorder === 'undefined') {
      console.warn('startRecording: No active stream available yet.')
      return
    }
    const mode = session?.mode || 'video'
    if (mode === 'text') return // text mode does not record media

    // Self-healing for desktop: If stream has 0 audio tracks, dynamically acquire microphone for desktop
    if (!isMobileDevice() && activeStream.getAudioTracks().length === 0) {
      try {
        console.log('⚠️ Stream has 0 audio tracks! Acquiring microphone dynamically for recording...')
        const aStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const aTrack = aStream.getAudioTracks()[0]
        if (aTrack) {
          aTrack.enabled = true
          activeStream.addTrack(aTrack)
          if (streamRef.current && streamRef.current !== activeStream) {
            streamRef.current.addTrack(aTrack)
          }
          console.log('✅ Successfully attached microphone track to recording stream!')
        }
      } catch (micErr) {
        console.warn('Could not dynamically attach microphone track to stream:', micErr)
      }
    }

    // Explicitly guarantee all hardware audio tracks are enabled before recording starts
    activeStream.getAudioTracks().forEach((track) => {
      track.enabled = true
    })

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Already actively recording this turn, do not abort or wipe out recorded chunks
      return
    }

    try {
      recordedChunksRef.current = []
      let recorder = null

      const hasVideo = activeStream.getVideoTracks().length > 0
      const hasAudio = activeStream.getAudioTracks().length > 0

      // Tier 1: Try with optimized standard bandwidth (64kbps clean audio - 32kbps breaks mobile MediaCodec encoders!)
      try {
        const mimeType = getBestMimeType(mode)
        const options = {}
        if (mimeType) options.mimeType = mimeType
        if (hasVideo) options.videoBitsPerSecond = 250000
        if (hasAudio) options.audioBitsPerSecond = 64000
        recorder = new MediaRecorder(activeStream, options)
      } catch (optErr) {
        console.warn('MediaRecorder with bitrates failed, trying with mimeType only:', optErr)
        // Tier 2: Try with mimeType only
        try {
          const mimeType = getBestMimeType(mode)
          recorder = mimeType ? new MediaRecorder(activeStream, { mimeType }) : new MediaRecorder(activeStream)
        } catch (mimeErr) {
          console.warn('MediaRecorder with mimeType failed, falling back to default:', mimeErr)
          // Tier 3: Browser default (guaranteed to work across all devices)
          recorder = new MediaRecorder(activeStream)
        }
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data)
        }
      }

      recorder.onerror = (e) => {
        console.error('MediaRecorder runtime error:', e)
      }

      // Start with 500ms chunk timeslice for instant buffer availability
      recorder.start(500)
      mediaRecorderRef.current = recorder
      recordingStartTimeRef.current = Date.now()
      setIsMediaRecording(true)
    } catch (err) {
      console.warn('Could not start MediaRecorder:', err)
      setIsMediaRecording(false)
    }
  }, [session?.mode, stream])

  // Stop Recorder and Save Clip into IndexedDB with timeout safeguard
  const stopAndSaveRecording = useCallback(async (qNum, qText) => {
    setIsMediaRecording(false)
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      mediaRecorderRef.current = null
      const mode = session?.mode || 'video'
      const mimeType = recorder?.mimeType || (mode === 'audio' ? 'audio/webm' : 'video/webm')

      // Save helper function
      const commitBlob = async (chunks) => {
        try {
          if (!chunks || chunks.length === 0) {
            resolve(null)
            return
          }
          const blob = new Blob(chunks, { type: mimeType })
          recordedChunksRef.current = []
          const durationSeconds = recordingStartTimeRef.current
            ? Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000))
            : 1

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
            resolve({ saved, blob, durationSeconds, mode })
            return
          }
        } catch (e) {
          console.error('Error saving recording clip:', e)
        }
        resolve(null)
      }

      // Safety timeout: never block answer submission longer than 1.5 seconds
      const timeout = setTimeout(() => {
        commitBlob([...recordedChunksRef.current])
      }, 1500)

      if (!recorder || recorder.state === 'inactive') {
        clearTimeout(timeout)
        commitBlob([...recordedChunksRef.current])
        return
      }

      recorder.onstop = async () => {
        clearTimeout(timeout)
        await commitBlob([...recordedChunksRef.current])
      }

      try {
        if (recorder.state === 'recording') {
          recorder.requestData()
        }
        recorder.stop()
      } catch (err) {
        clearTimeout(timeout)
        commitBlob([...recordedChunksRef.current])
      }
    })
  }, [sessionId, session, user])

  // Load Session Detail and set up mode-based media
  useEffect(() => {
    let isCancelled = false
    setLoadingSession(true)
    setError('')

    getInterviewDetail(sessionId)
      .then((res) => {
        if (isCancelled) return
        const s = res.data
        setSession(s)

        if (s?.started_at) {
          const startedMs = new Date(s.started_at).getTime()
          if (!isNaN(startedMs)) {
            sessionStartTimeRef.current = startedMs
          }
        }
        if (s?.questions) {
          const answered = s.questions.filter((q) => q.answer).map((q) => q.id)
          if (answered.length > 0) {
            setAnsweredQuestionIds((prev) => new Set([...prev, ...answered]))
          }
        }
        if (s?.overall_score != null) {
          setEvaluationStatus('completed')
        }

        // If session was already completed, automatically redirect to report
        if (s?.status === 'completed') {
          navigate(`/interview/${sessionId}/report`, { replace: true })
          return
        }

        const smode = s?.mode || 'text'
        if (smode === 'video') {
          setIsCameraActive(true)
          setIsMicActive(false)
          setMainView('candidate')
          startCamera()
        } else if (smode === 'audio') {
          stopCamera()
          setIsCameraActive(false)
          setIsMicActive(false)
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
      .catch((err) => {
        if (isCancelled) return
        console.error('Failed to load session details:', err)
        setError(err.response?.data?.error || 'Could not load session details. Please check your connection or return to dashboard.')
      })
      .finally(() => {
        if (!isCancelled) {
          setLoadingSession(false)
        }
      })

    return () => {
      isCancelled = true
      stopAllMedia()
    }
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Connect stream to video element
  useEffect(() => {
    if (videoRef.current && stream && isCameraActive) {
      videoRef.current.srcObject = stream
    }
  }, [stream, isCameraActive, mainView])

  // Reactive Recording Watcher: Auto-start recording as soon as media stream is ready and AI finished asking
  useEffect(() => {
    const mode = session?.mode || 'text'
    if (mode === 'text' || isPaused || isCompleted || isAiAsking || isCountingDown) return
    const activeStream = streamRef.current || stream
    if (!activeStream) return

    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      startRecording()
    }
  }, [stream, isAiAsking, isCountingDown, isPaused, isCompleted, session?.mode, startRecording])


  // Called strictly AFTER AI finishes asking the question (or if candidate clicks Answer Now)
  const handleAiFinishedAsking = useCallback(() => {
    if (aiFinishedForQuestionRef.current) return
    aiFinishedForQuestionRef.current = true

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
      } catch (e) {
        // ignore
      }
    }

    setIsCountingDown(false)
    setSpeechCountdown(0)
    setIsWarmup(true)
    isWarmupRef.current = true

    if (micWarmupTimerRef.current) clearTimeout(micWarmupTimerRef.current)

    // Exactly 2 seconds silent delay after AI finishes speaking (Strict: No countdown UI)
    micWarmupTimerRef.current = setTimeout(() => {
      setIsWarmup(false)
      isWarmupRef.current = false
      setIsAiAsking(false)
      isAiAskingRef.current = false
      setQuestionSeconds(TOTAL_QUESTION_SECONDS)
      setRecordingSeconds(0)
      startTime.current = Date.now()
      lastSpeechTimeRef.current = Date.now()
      setSilenceSeconds(0)

      // Unmute hardware audio tracks silently
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = true
        })
      }

      // Automatically activate candidate mic silently
      if (!isPaused) {
        setIsMicActive(true)
        resetTranscript()
        startMic()
        startRecording()
      }
    }, 2000)
  }, [isPaused, resetTranscript, startMic, startRecording])

  // Skip AI voice read-aloud and immediately jump into the candidate's answering turn
  const handleSkipAiVoiceAndAnswerNow = useCallback(() => {
    cancelSpeech()
    if (micWarmupTimerRef.current) clearTimeout(micWarmupTimerRef.current)
    setIsWarmup(false)
    isWarmupRef.current = false
    aiFinishedForQuestionRef.current = true
    setIsCountingDown(false)
    setSpeechCountdown(0)
    setIsAiAsking(false)
    isAiAskingRef.current = false
    setQuestionSeconds(TOTAL_QUESTION_SECONDS)
    setRecordingSeconds(0)
    startTime.current = Date.now()
    lastSpeechTimeRef.current = Date.now()
    setSilenceSeconds(0)

    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = true
      })
    }

    if (!isPaused) {
      setIsMicActive(true)
      resetTranscript()
      startMic()
      startRecording()
    }
  }, [cancelSpeech, isPaused, resetTranscript, startMic, startRecording])

  useEffect(() => {
    handleSkipAiVoiceRef.current = handleSkipAiVoiceAndAnswerNow
  }, [handleSkipAiVoiceAndAnswerNow])

  // Speak question immediately
  const handleSpeakImmediately = useCallback(() => {
    setIsCountingDown(false)
    setSpeechCountdown(0)
    const q = session?.questions?.[current]
    const qText = current === 0 ? "Introduce yourself." : (q?.question_text || '')
    if (qText) {
      speak(qText, () => {
        handleAiFinishedAsking()
      })
    } else {
      handleAiFinishedAsking()
    }
  }, [session, current, speak, handleAiFinishedAsking])

  // Timers: Count down question duration AFTER AI finishes asking and 2s silent warmup completes (15 seconds limit)
  useEffect(() => {
    if (isPaused || isCompleted || isAiAsking || isWarmup) return

    const interval = setInterval(() => {
      setQuestionSeconds((prev) => (prev > 0 ? prev - 1 : 0))
      setRecordingSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isPaused, isCompleted, isAiAsking, isWarmup])

  // When question loads/changes: Mic is strictly OFF while AI asks the question ONCE
  useEffect(() => {
    if (!session || isCompleted) return
    if (lastAskedQuestionIndexRef.current === current) return
    lastAskedQuestionIndexRef.current = current

    if (micWarmupTimerRef.current) clearTimeout(micWarmupTimerRef.current)
    setIsWarmup(false)
    isWarmupRef.current = false
    aiFinishedForQuestionRef.current = false
    cancelSpeech()
    resetTranscript()
    setAnswerText('')
    setSilenceSeconds(0)

    // Silently mute hardware audio tracks without aborting speech recognition to eliminate off/on beeps
    setIsMicActive(false)
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = false
      })
    }

    setIsAiAsking(true)
    isAiAskingRef.current = true
    setQuestionSeconds(TOTAL_QUESTION_SECONDS)
    setRecordingSeconds(0)
    lastSpeechTimeRef.current = Date.now()

    const q = session.questions?.[current]
    const effectiveQuestionText = current === 0 ? "Introduce yourself." : (q?.question_text || '')
    if (!effectiveQuestionText) {
      handleAiFinishedAsking()
      return
    }

    // Brief settling pause: 1.5s for Q1, 400ms for subsequent questions
    const isFirstQuestion = current === 0
    const delayMs = isFirstQuestion ? 1500 : 400

    if (isFirstQuestion) {
      setIsCountingDown(true)
      setSpeechCountdown(2)
    } else {
      setIsCountingDown(false)
      setSpeechCountdown(0)
    }

    let countdownInterval = null
    if (isFirstQuestion) {
      countdownInterval = setInterval(() => {
        setSpeechCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    // AI speaks question - actual completion event (onend) triggers handleAiFinishedAsking
    const startTimer = setTimeout(() => {
      setIsCountingDown(false)
      setSpeechCountdown(0)
      speak(effectiveQuestionText, () => {
        handleAiFinishedAsking()
      })
    }, delayMs)

    return () => {
      if (countdownInterval) clearInterval(countdownInterval)
      clearTimeout(startTimer)
      cancelSpeech()
    }
  }, [current, session, isCompleted]) // eslint-disable-line react-hooks/exhaustive-deps

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
      isSubmittingRef.current = false
      // Stop mic and flush speech recognition buffer for 100% fresh start on next question
      stopMic()
      setIsMicActive(false)
      cancelSpeech()
      resetTranscript()
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false
        })
      }
      setIsAiAsking(true)
      isAiAskingRef.current = true
      setQuestionSeconds(TOTAL_QUESTION_SECONDS)
      setRecordingSeconds(0)
      lastSpeechTimeRef.current = Date.now()
      setCurrent((c) => c + 1)
      setAnswerText('')
      startTime.current = Date.now()
    }
  }

  // Submit Answer (supports manual submission or automatic transition on silence/timeout)
  const handleSubmitAnswer = async (isAutoSubmit = false) => {
    if (isSubmittingRef.current || submitting) return
    if (submittedQuestionIndexRef.current === current) return

    // When manually clicking, confirm if answer is empty. If auto-submitting on timeout, do NOT block with dialog
    if (!isAutoSubmit && !answerText.trim() && !window.confirm('Submit without answer text?')) return

    // Do not submit empty answer automatically if user has not spoken yet unless 15s limit reached
    if (isAutoSubmit && questionSeconds > 0 && answerText.trim().length < 3) {
      return
    }

    isSubmittingRef.current = true
    submittedQuestionIndexRef.current = current
    setSubmitting(true)
    setError('')
    const speakingTime = Math.round((Date.now() - startTime.current) / 1000)

    try {
      // Save recorded response clip locally and attach for server upload
      const recResult = await stopAndSaveRecording(current + 1, question?.question_text)

      const answerPayload = {
        question_id: question.id,
        answer_text: answerText.trim() || (isAutoSubmit ? 'No verbal response (timeout).' : 'Passed without verbal response.'),
        speaking_time_seconds: speakingTime,
      }

      await submitAnswer(sessionId, answerPayload)
      if (question?.id) {
        setAnsweredQuestionIds((prev) => new Set(prev).add(question.id))
      }
      advanceToNextOrFinish()
    } catch {
      setError('Could not submit answer. Please try again.')
      isSubmittingRef.current = false
    } finally {
      setSubmitting(false)
    }
  }

  // Ref to always hold latest handleSubmitAnswer for key listeners & timer
  const handleSubmitRef = useRef(handleSubmitAnswer)
  useEffect(() => {
    handleSubmitRef.current = handleSubmitAnswer
  })

  // Auto-advance to next question when total question time (15s) expires
  useEffect(() => {
    if (questionSeconds === 0 && !isAiAsking && !isWarmup && !isCountingDown && !submitting && !isCompleted && session && question) {
      handleSubmitRef.current(true)
    }
  }, [questionSeconds, isAiAsking, isWarmup, isCountingDown, submitting, isCompleted, session, question])

  // ─── Automatic Silence Detection & Answer Submission ────────────────────────
  // Automatically detects when user stops speaking after answering, waiting 3.5s of silence
  const SILENCE_THRESHOLD_SECONDS = 3.5
  useEffect(() => {
    if (isAiAsking || isWarmup || isCountingDown || isPaused || isCompleted || submitting) {
      setSilenceSeconds(0)
      return
    }

    // Only activate silence auto-submission AFTER candidate has spoken at least 3 characters
    const hasSpoken = Boolean(answerText.trim().length >= 3)
    if (!hasSpoken) {
      setSilenceSeconds(0)
      return
    }

    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - lastSpeechTimeRef.current) / 1000
      if (elapsedSec >= SILENCE_THRESHOLD_SECONDS) {
        clearInterval(interval)
        handleSubmitRef.current(true)
      } else {
        setSilenceSeconds(Math.floor(elapsedSec))
      }
    }, 200)

    return () => clearInterval(interval)
  }, [isAiAsking, isWarmup, isCountingDown, isPaused, isCompleted, submitting, answerText])

  // Enter key handler inside Textarea (Ctrl+Enter / Cmd+Enter = submit, Enter = natural new line)
  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (!submitting) {
        handleSubmitRef.current()
      }
    }
  }

  // Skip question
  const handleSkip = async () => {
    if (submitting) return
    if (listening) stopMic()
    cancelSpeech()
    try {
      await stopAndSaveRecording(current + 1, question?.question_text)
    } catch {}
    try {
      if (question?.id) {
        await submitAnswer(sessionId, {
          question_id: question.id,
          answer_text: 'Question skipped by candidate (No verbal response).',
          speaking_time_seconds: 0,
        })
        setAnsweredQuestionIds((prev) => new Set(prev).add(question.id))
      }
    } catch (e) {
      console.warn('Skip answer submission error:', e)
    }
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
    if (isAiAsking) {
      handleSkipAiVoiceAndAnswerNow()
      return
    }
    if (isMicActive) {
      stopMic()
      setIsMicActive(false)
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((t) => { t.enabled = false })
      }
    } else {
      setIsMicActive(true)
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((t) => { t.enabled = true })
      }
      if (!isPaused) {
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
          if (question?.id) {
            setAnsweredQuestionIds((prev) => new Set(prev).add(question.id))
          }
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

  // On session completion: stop real media streams, detach video element, refresh data, check recordings
  useEffect(() => {
    if (!isCompleted) return

    // 1. Confirm hardware camera & mic shutdown using real stream lifecycle
    stopAllMedia()
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    // 2. Pre-generate report scores & complete interview session on backend
    setEvaluationStatus('generating')
    completeInterview(sessionId)
      .then((res) => {
        if (res?.data) {
          setSession(res.data)
          setEvaluationStatus('completed')
          if (res.data.questions) {
            const answered = res.data.questions.filter((q) => q.answer).map((q) => q.id)
            if (answered.length > 0) {
              setAnsweredQuestionIds((prev) => new Set([...prev, ...answered]))
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Auto-completion warning, fetching existing session detail:', err)
        getInterviewDetail(sessionId)
          .then((res) => {
            if (res?.data) {
              setSession(res.data)
              if (res.data.overall_score != null) {
                setEvaluationStatus('completed')
              }
              if (res.data.questions) {
                const answered = res.data.questions.filter((q) => q.answer).map((q) => q.id)
                if (answered.length > 0) {
                  setAnsweredQuestionIds((prev) => new Set([...prev, ...answered]))
                }
              }
            }
          })
          .catch((dErr) => console.warn('Could not refresh session detail on completion:', dErr))
      })

    // 3. Check if candidate has local recordings for this session in IndexedDB
    getAllRecordings(user, true)
      .then((clips) => {
        const sessionClips = (clips || []).filter((c) => String(c.sessionId) === String(sessionId))
        setHasRecordings(sessionClips.length > 0)
        setRecordingCount(sessionClips.length)
      })
      .catch((err) => {
        console.warn('Could not inspect local recordings:', err)
      })
  }, [isCompleted, sessionId, user, stopAllMedia])

  // Open Final Feedback Report
  const handleOpenFeedback = async () => {
    if (session?.overall_score != null && session?.status === 'completed') {
      navigate(`/interview/${sessionId}/report`)
      return
    }

    setCompleting(true)
    setEvaluationStatus('generating')
    setError('')
    try {
      const res = await completeInterview(sessionId)
      if (res?.data) {
        setSession(res.data)
      }
      setEvaluationStatus('completed')
      navigate(`/interview/${sessionId}/report`)
    } catch (err) {
      console.error('Failed to complete interview:', err)
      setError(err?.response?.data?.error || 'Could not generate final evaluation report. Please try again.')
      setEvaluationStatus('failed')
      setCompleting(false)
    }
  }

  // Optional: Upload all local session clips to Cloudinary for Project Leader visibility
  const handleUploadSessionRecordingsToCloud = async () => {
    setUploadingCloud(true)
    setError('')
    try {
      const allClips = await getAllRecordings(user, true)
      const sessionClips = allClips.filter((c) => String(c.sessionId) === String(sessionId))
      if (sessionClips.length === 0) {
        setError('No local recorded clips found for this session.')
        setUploadingCloud(false)
        return
      }

      let uploadedAny = false
      for (const clip of sessionClips) {
        if (clip.blob) {
          try {
            const fd = new FormData()
            fd.append('file', clip.blob, `${clip.mode || 'video'}_${sessionId}_Q${clip.questionNumber}.webm`)
            fd.append('order', clip.questionNumber)
            fd.append('mode', clip.mode || 'video')
            if (clip.durationSeconds) fd.append('speaking_time_seconds', clip.durationSeconds)

            const res = await uploadInterviewRecording(sessionId, fd)
            const cloudUrl = res.data?.cloud_url || res.data?.cloud_video_url || res.data?.cloud_audio_url
            if (cloudUrl) {
              await markRecordingUploaded(clip.id, cloudUrl)
              uploadedAny = true
            }
          } catch (clipErr) {
            console.warn(`Upload clip Q${clip.questionNumber} warning:`, clipErr)
          }
        }
      }

      if (uploadedAny) {
        setCloudUploadStatus('done')
      } else {
        throw new Error('Upload attempt returned no cloud URL.')
      }
    } catch (err) {
      console.error('Failed to upload recordings to cloud:', err)
      setError('Could not complete cloud backup. Please check your internet connection and try again.')
      setCloudUploadStatus('error')
    } finally {
      setUploadingCloud(false)
    }
  }

  // ─── Derived Session & Completion Metrics ──────────────────────────────────
  const totalQuestions = questions.length || 1
  const serverAnsweredCount = session?.questions?.filter((q) => Boolean(q.answer))?.length || 0
  const localAnsweredCount = answeredQuestionIds.size
  const answeredCount = Math.min(
    totalQuestions,
    Math.max(serverAnsweredCount, localAnsweredCount, isCompleted && isLast ? totalQuestions : 0)
  )

  const calculateTotalDuration = () => {
    if (session?.started_at && session?.completed_at) {
      const start = new Date(session.started_at).getTime()
      const end = new Date(session.completed_at).getTime()
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        return Math.max(1, Math.round((end - start) / 1000))
      }
    }
    return Math.max(1, Math.round((Date.now() - sessionStartTimeRef.current) / 1000))
  }

  const formatDurationText = (sec) => {
    if (!sec || sec <= 0) return '0s'
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    if (mins === 0) return `${secs}s`
    if (secs === 0) return `${mins}m`
    return `${mins}m ${secs}s`
  }

  if (loadingSession || !session) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F4F6FB] dark:bg-[#080D1A] p-4 text-center font-sans">
        <div className="w-16 h-16 rounded-3xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl mb-4 animate-pulse shadow-inner border border-blue-200 dark:border-blue-900/60">
          📹
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {isHrSession ? 'Initializing HR Interview Studio' : 'Initializing Interview Studio'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
          {isHrSession
            ? <>Connecting webcam, microphone, and HR Interviewer (Sophia). Please tap <strong>Allow</strong> if your browser asks for camera permissions.</>
            : <>Connecting webcam, microphone, and AI interviewer. Please tap <strong>Allow</strong> if your browser asks for camera permissions.</>}
        </p>
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        {error ? (
          <div className="mt-4 max-w-md mx-auto">
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold mb-3">
              {error}
            </div>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                ↻ Retry
              </button>
              <button
                type="button"
                onClick={() => navigate(isHrSession ? '/hr' : (isResumeSession ? '/resume' : '/dashboard'))}
                className="btn-primary py-2 px-4 text-xs font-bold"
              >
                {isHrSession ? '← Return to HR Workspace' : (isResumeSession ? '← Return to Resume Workspace' : '← Return to Dashboard')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate(isHrSession ? '/hr' : (isResumeSession ? '/resume' : '/dashboard'))}
            className="mt-6 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
          >
            {isHrSession ? 'Cancel & Return to HR Workspace' : (isResumeSession ? 'Cancel & Return to Resume Workspace' : 'Cancel & Return to Dashboard')}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen w-full bg-[#F4F6FB] dark:bg-[#050505] flex flex-col p-2 sm:p-4 lg:p-5 select-none font-sans overflow-y-auto lg:overflow-hidden transition-colors duration-200">
      {/* ─── Outer Card Frame (Fits Exact Viewport Height on Desktop) ─── */}
      <div className="w-full min-h-full lg:h-full max-w-[1400px] mx-auto bg-white dark:bg-[#0A0A0A] rounded-2xl sm:rounded-3xl p-3 sm:p-5 lg:p-6 shadow-[0_10px_40px_-10px_rgba(30,58,138,0.08)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] border border-slate-100 dark:border-neutral-800 flex flex-col justify-between overflow-y-auto lg:overflow-hidden transition-colors duration-200">
        
        {/* ─── Top Header Bar (Slim & Clean) ─── */}
        <header className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isCompleted || window.confirm(isHrSession ? 'Leave HR interview session?' : 'Leave interview session?')) {
                  stopAllMedia()
                  navigate(isHrSession ? '/hr' : (isResumeSession ? '/resume' : '/dashboard'))
                }
              }}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#131E38] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors border border-transparent dark:border-slate-700/60 cursor-pointer"
              title={isHrSession ? "Back to HR Workspace" : "Back to Dashboard"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <img src="/logo-icon.png" alt="Skillzo Logo" className="w-7 h-7 object-contain shrink-0 drop-shadow-xs" />
            <div>
              <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {session?.job_role || (isHrSession ? 'HR & Behavioral Interview' : 'AI Mock Interview')}
              </h1>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-400">
                {session?.difficulty || 'Practice'} · {session?.mode || 'Video'} Mode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200/80 dark:border-emerald-900/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Session complete
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium">
                  Question {current + 1} of {questions.length || 1}
                </span>
                {!isAiAsking ? (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    questionSeconds <= 10
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${questionSeconds <= 10 ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                    <span className="font-mono">{formatTime(questionSeconds)}</span> left
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    AI asking
                  </span>
                )}
              </>
            )}
          </div>
        </header>

        {error && !isCompleted && (
          <div className="my-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-between shrink-0">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-rose-500 font-bold ml-2 cursor-pointer">✕</button>
          </div>
        )}

        {isCompleted ? (
          /* ─── Completed View (Clean, Human-Designed & Production Grade) ─── */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col justify-center items-center py-6 px-3 sm:px-6 w-full max-w-xl mx-auto overflow-y-auto"
          >
            {/* Status Icon */}
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            {/* Title & Concise Confirmation */}
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white text-center mb-1">
              {isHrSession ? 'HR interview completed' : 'Interview completed'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm text-center max-w-md mb-6 leading-relaxed">
              Your responses have been recorded and saved. Camera and microphone have been disconnected.
            </p>

            {/* Error Notification (if report generation or upload fails) */}
            {error && (
              <div className="w-full mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start justify-between gap-2">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 font-bold text-sm leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 3-Metric Summary Panel (Real Session Data) */}
            <div className="w-full bg-slate-50/80 dark:bg-[#111827]/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 mb-5 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 text-center gap-3 sm:gap-0">
              
              {/* Metric 1: Questions Completed */}
              <div className="pt-1 sm:pt-0 sm:px-3">
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Questions
                </span>
                <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {answeredCount} of {totalQuestions}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Answered
                </span>
              </div>

              {/* Metric 2: Duration */}
              <div className="pt-3 sm:pt-0 sm:px-3">
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Duration
                </span>
                <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {formatDurationText(calculateTotalDuration())}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Total time
                </span>
              </div>

              {/* Metric 3: AI Evaluation */}
              <div className="pt-3 sm:pt-0 sm:px-3">
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                  Evaluation
                </span>
                {session?.overall_score != null ? (
                  <>
                    <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      {Math.round(session.overall_score)}
                      <span className="text-xs font-normal text-slate-400">/100</span>
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                      Completed
                    </span>
                  </>
                ) : evaluationStatus === 'generating' || completing ? (
                  <>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Analyzing
                    </span>
                    <span className="text-[11px] text-blue-500 dark:text-blue-400 block mt-0.5">
                      Generating report
                    </span>
                  </>
                ) : evaluationStatus === 'failed' ? (
                  <>
                    <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                      Failed
                    </span>
                    <span className="text-[11px] text-rose-500 dark:text-rose-400 block mt-0.5">
                      Retry available
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Pending
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
                      Ready to evaluate
                    </span>
                  </>
                )}
              </div>

            </div>

            {/* Optional Cloud Backup Section (Explained honestly) */}
            {hasRecordings && (
              <div className="w-full bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3.5 mb-5 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Cloud backup
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Optional
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 leading-relaxed">
                  Recordings are saved locally in your browser storage. Back up to cloud storage if you want them accessible online to team leaders or across devices.
                </p>

                {cloudUploadStatus === 'done' ? (
                  <div className="py-1.5 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Recordings backed up to cloud successfully</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleUploadSessionRecordingsToCloud}
                    disabled={uploadingCloud}
                    className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingCloud ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-slate-600 dark:border-slate-300 border-t-transparent rounded-full animate-spin" />
                        <span>Backing up to cloud storage...</span>
                      </>
                    ) : cloudUploadStatus === 'error' ? (
                      <span>Retry cloud backup</span>
                    ) : (
                      <span>Back up recordings to cloud</span>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Action Hierarchy */}
            <div className="w-full flex flex-col gap-2.5">
              {/* Primary Action */}
              <button
                type="button"
                onClick={handleOpenFeedback}
                disabled={completing}
                className="w-full py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {completing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating evaluation report...</span>
                  </>
                ) : evaluationStatus === 'failed' ? (
                  <>
                    <span>Retry generating report</span>
                    <span>→</span>
                  </>
                ) : session?.overall_score != null ? (
                  <>
                    <span>View interview report</span>
                    <span>→</span>
                  </>
                ) : (
                  <>
                    <span>Generate & view report</span>
                    <span>→</span>
                  </>
                )}
              </button>

              {/* Secondary Action: Only if recordings exist */}
              {hasRecordings && (
                <button
                  type="button"
                  onClick={() => navigate(isHrSession ? '/recordings?track=hr' : '/recordings')}
                  className="w-full py-2.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200/90 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Review session recordings</span>
                  {recordingCount > 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({recordingCount})
                    </span>
                  )}
                </button>
              )}

              {/* Tertiary / Simple Navigation Action */}
              <button
                type="button"
                onClick={() => navigate(isHrSession ? '/hr' : (isResumeSession ? '/resume' : '/dashboard'))}
                className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-center cursor-pointer pt-1"
              >
                ← Return to {isHrSession ? 'HR workspace' : (isResumeSession ? 'Resume workspace' : 'dashboard')}
              </button>
            </div>

          </motion.div>
        ) : (
          /* ─── EXACT 50 / 50 SPLIT (Half Video / Half Questions - NO SCROLL) ─── */
          <div className="flex-1 min-h-0 pt-2.5 sm:pt-3 grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-5 lg:gap-6 items-stretch">
            
            {/* ═════════════════════════════════════════════════════════════════
                LEFT HALF (50%): SQUARE LIVE VIDEO + COMPACT CONTROLS
            ═════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col h-full justify-between items-center gap-3 min-h-0 w-full">
              
              {/* Square Video Screen (1:1 Ratio for Full Face & Headshot View) */}
              <div className="relative w-full aspect-square max-w-[420px] sm:max-w-[460px] lg:max-w-[480px] rounded-2xl overflow-hidden bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800 flex items-center justify-center group mx-auto">
                
                {/* 1. CANDIDATE FULL VIDEO */}
                {mainView === 'candidate' ? (
                  isCameraActive && stream ? (
                    <video
                      ref={attachVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover object-center transform -scale-x-100"
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
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors shadow-sm cursor-pointer"
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
                    className="w-full h-full object-cover object-center"
                  />
                )}

                {/* Picture-in-Picture (PIP) only in Video mode */}
                {session?.mode === 'video' && (
                  <div
                    onClick={() => setMainView(v => (v === 'candidate' ? 'ai' : 'candidate'))}
                    title="Click to Swap Video View"
                    className="absolute top-3 right-3 w-16 h-16 sm:w-20 sm:h-20 aspect-square rounded-xl overflow-hidden border border-white/80 shadow-md z-20 bg-slate-800 cursor-pointer hover:scale-105 active:scale-95 transition-all"
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
                            ref={attachVideoRef}
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
                <div className="absolute top-2.5 left-2.5 z-20 bg-white/95 dark:bg-[#121212]/90 backdrop-blur-md px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 border border-transparent dark:border-neutral-800">
                  <span className={`w-2 h-2 rounded-full ${mainView === 'candidate' && isCameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-blue-600 animate-pulse'}`} />
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    {session?.mode === 'video'
                      ? (mainView === 'candidate' ? (user?.username || 'You') : (isHrSession ? 'Sophia (HR)' : 'Sophia (AI)'))
                      : session?.mode === 'audio'
                      ? (isHrSession ? 'Sophia · Audio' : 'Sophia · Audio')
                      : (isHrSession ? 'Sophia · Text' : 'Sophia · Text')}
                  </span>
                </div>

                {/* Bottom-Left Unified Status Pill */}
                <div className="absolute bottom-2.5 left-2.5 z-20 bg-white/95 dark:bg-[#121212]/90 backdrop-blur-md px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 border border-transparent dark:border-neutral-800">
                  <span className="text-[10px] sm:text-[11px] font-medium tracking-tight flex items-center gap-1.5">
                    {isWarmup ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">Listening shortly</span>
                      </>
                    ) : isAiAsking ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-indigo-600 dark:text-indigo-400">
                          {isHrSession ? 'HR speaking' : 'AI speaking'}
                        </span>
                      </>
                    ) : isPaused ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-amber-600 dark:text-amber-400">Paused</span>
                      </>
                    ) : listening ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Your turn</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span className="text-slate-500 dark:text-slate-400">Mic off</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Bottom-Right Video Time Duration Badge */}
                {!isAiAsking && !isWarmup && (
                  <div className="absolute bottom-2.5 right-2.5 z-20 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 text-white text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-slate-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span className="font-mono">{formatTime(recordingSeconds)}</span>
                    </span>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-400 font-mono">{formatTime(TOTAL_QUESTION_SECONDS)}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      questionSeconds <= 5 
                        ? 'bg-rose-600 text-white animate-pulse' 
                        : 'bg-emerald-600 text-white'
                    }`}>
                      <span className="font-mono">{questionSeconds}s</span> left
                    </span>
                  </div>
                )}

                {/* Bottom Video Progress Bar (0 to 100%) */}
                {!isAiAsking && !isWarmup && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50 z-30 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        questionSeconds <= 5 
                          ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]' 
                          : questionSeconds <= 10 
                          ? 'bg-amber-400' 
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, ((TOTAL_QUESTION_SECONDS - questionSeconds) / TOTAL_QUESTION_SECONDS) * 100))}%` }}
                    />
                  </div>
                )}

                {/* Pause Interview Modal Overlay */}
                {isPaused && (
                  <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2.5 shadow-lg">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">Interview Paused</h3>
                    <p className="text-xs text-slate-300 max-w-xs mb-3.5 leading-relaxed">
                      Timer and recording are temporarily paused. Take your time and resume when ready.
                    </p>
                    <button
                      onClick={togglePause}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      <span>Resume Interview</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ─── Compact Controls Bar (Clean 4-Button Meeting Controls) ─── */}
              <div className="shrink-0 flex justify-center w-full">
                <div className="bg-slate-50 dark:bg-[#121212] border border-slate-200/80 dark:border-neutral-800 rounded-2xl px-4 sm:px-6 py-2 flex items-center justify-around sm:justify-center gap-3 sm:gap-6 w-full sm:w-auto shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                  
                  {/* 1. Camera Toggle (Only in Video mode) */}
                  {session?.mode === 'video' && (
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        onClick={toggleCamera}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          isCameraActive
                            ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/40 shadow-xs'
                            : 'bg-white dark:bg-[#131E38] text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        title={isCameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                        </svg>
                      </button>
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Camera</span>
                    </div>
                  )}

                  {/* 2. Mic Toggle (Available in all formats) */}
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      onClick={toggleMic}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isAiAsking
                          ? 'bg-slate-100 dark:bg-[#131E38] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800'
                          : isMicActive && listening
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 shadow-xs'
                          : 'bg-white dark:bg-[#131E38] text-rose-500 dark:text-rose-400 border border-rose-200 dark:border-rose-700/80 hover:bg-rose-50'
                      }`}
                      title={
                        isAiAsking
                          ? 'Mic OFF (AI speaking · Click to answer now)'
                          : isMicActive && listening
                          ? 'Mic ON (Listening · Click to mute)'
                          : 'Mic OFF (Click to unmute)'
                      }
                    >
                      {isAiAsking || !isMicActive || !listening ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="1" y1="1" x2="23" y2="23"/>
                          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      )}
                    </button>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      {isAiAsking ? 'Muted' : isMicActive && listening ? 'Live' : 'Muted'}
                    </span>
                  </div>

                  {/* 3. Pause Interview Toggle */}
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      onClick={togglePause}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        isPaused
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                          : 'bg-white dark:bg-[#131E38] text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700/80 hover:bg-blue-50 dark:hover:bg-slate-700'
                      }`}
                      title={isPaused ? 'Resume Interview' : 'Pause Interview'}
                    >
                      {isPaused ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>
                        </svg>
                      )}
                    </button>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      {isPaused ? 'Resume' : 'Pause'}
                    </span>
                  </div>

                  {/* 4. End Interview Button (Single Red Button) */}
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      onClick={handleEndCall}
                      className="w-10 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all"
                      title="End Interview"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.15-2.66 1.94a1 1 0 0 1-1.42 0L.3 13.2a1 1 0 0 1 0-1.41C2.5 9.54 6.94 8 12 8s9.5 1.54 11.7 3.79c.39.39.39 1.02 0 1.41l-2.46 2.46a1 1 0 0 1-1.42 0 12.8 12.8 0 0 0-2.66-1.94.99.99 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                      </svg>
                    </button>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">End</span>
                  </div>

                </div>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════════
                RIGHT HALF (50%): QUESTION & ANSWER (PRIORITIZED, CLEAN DESIGN)
            ═════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col h-full justify-between gap-3 min-h-0">
              
              {/* Group 1: Question & Progress */}
              <div className="bg-slate-50/80 dark:bg-[#121212] border border-transparent dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Question {current + 1}
                    </span>
                    <button
                      onClick={() => {
                        const qText = current === 0 ? "Introduce yourself." : question?.question_text
                        if (qText && !isAiAsking) {
                          speak(qText)
                        }
                      }}
                      disabled={isAiAsking}
                      title={isAiAsking ? 'AI is speaking' : 'Replay question voice'}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                    </button>
                  </div>

                  {isWarmup ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Listening shortly
                    </span>
                  ) : isAiAsking ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                        {isCountingDown && speechCountdown > 0 ? `Starting in ${speechCountdown}s` : 'AI speaking...'}
                      </span>
                      <button
                        type="button"
                        onClick={handleSkipAiVoiceAndAnswerNow}
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-all"
                        title="Skip AI voice reading and answer right now"
                      >
                        Skip to answer →
                      </button>
                    </div>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      questionSeconds <= 5
                        ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 font-semibold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${questionSeconds <= 5 ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                      <span className="font-mono">{questionSeconds}s</span> remaining (Max 15s)
                    </span>
                  )}
                </div>

                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                  {current === 0 ? "Introduce yourself." : (question?.question_text || 'Tell me about a time you solved a difficult problem.')}
                </p>

                {/* Integrated Progress Indicator */}
                <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{
                      width: `${Math.round(((current + 1) / Math.max(1, questions.length)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Group 2: Your Answer (Main Task) */}
              <div className="bg-slate-50/80 dark:bg-[#121212] border border-transparent dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xs flex-1 flex flex-col justify-between min-h-0">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Your answer
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Language Selector: English vs Hindi / Hinglish */}
                      <div className="flex items-center bg-slate-200/70 dark:bg-neutral-800/80 p-0.5 rounded-lg border border-transparent dark:border-neutral-700/50">
                        <button
                          type="button"
                          onClick={() => setSpeechLang('en-IN')}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            speechLang === 'en-IN'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Transcribe speech in English (en-IN)"
                        >
                          🇬🇧 English
                        </button>
                        <button
                          type="button"
                          onClick={() => setSpeechLang('hi-IN')}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                            speechLang === 'hi-IN'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Transcribe speech in Hindi or Hinglish (hi-IN)"
                        >
                          🇮🇳 Hindi / Hinglish
                        </button>
                      </div>

                      {/* Auto-submit on answer complete badge */}
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Auto-submit on answer complete</span>
                      </div>
                    </div>
                  </div>

                  {/* Browser speech recognition support warning */}
                  {!speechSupported && (
                    <div className="mb-2 p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs rounded-xl flex items-center justify-between">
                      <span>⚠️ Automatic voice typing requires <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>. If you are using Firefox, please switch to Chrome or type your answers.</span>
                    </div>
                  )}

                  {/* Single clear warning banner if microphone error */}
                  {speechError && (
                    <div className="mb-2 p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs rounded-xl flex items-center justify-between">
                      <span>⚠️ {speechError}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMicActive(true)
                          startMic()
                        }}
                        className="px-2.5 py-1 bg-rose-200 dark:bg-rose-800 rounded-lg font-semibold hover:bg-rose-300 cursor-pointer"
                      >
                        Retry mic
                      </button>
                    </div>
                  )}

                  {/* Single clear status notification strip */}
                  {isWarmup ? (
                    <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between border border-amber-200/80 dark:border-amber-900/60 shadow-2xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="font-semibold">Question complete · Microphone activating automatically...</span>
                      </span>
                    </div>
                  ) : isAiAsking ? (
                    <div className="mb-2 px-3 py-1.5 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 text-xs flex items-center justify-between shadow-2xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                        <span>AI reading question... (Mic is OFF)</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleSkipAiVoiceAndAnswerNow}
                        className="font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                      >
                        <span>Answer now</span> 🎙️
                      </button>
                    </div>
                  ) : listening ? (
                    <div className="mb-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between border border-emerald-200/80 dark:border-emerald-800/60">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-semibold">
                          🟢 Mic LIVE: Speak now — words type automatically in real time
                        </span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                        {questionSeconds}s left (Max 15s)
                      </span>
                    </div>
                  ) : !isAiAsking ? (
                    <div className="mb-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>Microphone paused. Click to speak in {speechLang === 'hi-IN' ? 'Hindi/Hinglish' : 'English'}:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMicActive(true)
                          startMic()
                        }}
                        className="font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-md text-xs cursor-pointer hover:bg-blue-700"
                      >
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Editable Text Area for Live Transcript & Typing */}
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <textarea
                    value={answerText}
                    onFocus={() => {
                      if (isAiAsking) {
                        handleSkipAiVoiceAndAnswerNow()
                      }
                    }}
                    onClick={() => {
                      if (isAiAsking) {
                        handleSkipAiVoiceAndAnswerNow()
                      }
                    }}
                    onChange={(e) => {
                      if (isAiAsking) {
                        handleSkipAiVoiceAndAnswerNow()
                      }
                      setAnswerText(e.target.value)
                      syncTranscript(e.target.value)
                      lastSpeechTimeRef.current = Date.now()
                      setSilenceSeconds(0)
                    }}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder={
                      isAiAsking
                        ? (speechLang === 'hi-IN'
                            ? "AI is reading question... Click Answer now or speak in Hindi/English anytime to answer!"
                            : "AI is reading question... Click Answer now or speak in English anytime to answer!")
                        : (speechLang === 'hi-IN'
                            ? "Listening live... Start speaking in Hindi or Hinglish (your answer will appear here in real-time)..."
                            : "Listening live... Start speaking in English (your answer will appear here in real-time)...")
                    }
                    className="w-full flex-1 p-3.5 bg-white dark:bg-[#131E38] rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200/80 dark:border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none leading-relaxed transition-all min-h-[120px]"
                  />

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      {isAiAsking ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Mic muted while AI speaks</span>
                        </>
                      ) : listening ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Listening live</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Mic paused</span>
                        </>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {answerText ? `${answerText.length} characters` : 'Ready'} · Ctrl+Enter to submit
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary Details: Collapsible Tip */}
              <div className="bg-slate-50/50 dark:bg-[#121212]/50 border border-transparent dark:border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => setShowTip((prev) => !prev)}
                  className="w-full flex items-center justify-between hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer text-left"
                >
                  <span className="truncate max-w-[340px] sm:max-w-[480px]">
                    💡 <strong>Tip:</strong> {showTip ? TIPS_LIST[current % TIPS_LIST.length] : 'Click to view answer recommendation'}
                  </span>
                  <span className="text-[10px] ml-2 text-slate-400">{showTip ? '▲ Hide' : '▼ View'}</span>
                </button>
              </div>

              {/* Action Buttons: Skip and Next Question */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={handleSkip}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 shrink-0 cursor-pointer"
                >
                  {isLast ? 'Skip & finish' : 'Skip'}
                </button>
                <button
                  onClick={() => handleSubmitAnswer(false)}
                  disabled={submitting}
                  className="flex-1 py-2.5 px-5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all text-center truncate cursor-pointer"
                >
                  {submitting ? 'Saving...' : isLast ? 'Submit & finish interview →' : 'Submit & next question →'}
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
