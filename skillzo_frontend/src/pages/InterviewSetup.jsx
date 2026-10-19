import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AppShell from '../components/AppShell'
import { startInterview } from '../api/interview'

const TECH_ROLES = [
  'Python Developer',
  'Java Developer',
  'Frontend Developer',
  'Data Scientist',
  'AI Engineer',
  'Custom Role',
]

const HR_ROLES = [
  'HR & Behavioral Round',
  'Fresher Campus Placement HR',
  'Software Engineer HR Round',
  'Leadership & Behavioral Round',
  'Custom Role',
]

const DIFFICULTIES = [
  { id: 'Beginner', label: 'Beginner', hrSub: 'Core HR, Strengths & Projects', techSub: 'Fundamentals & Syntax' },
  { id: 'Intermediate', label: 'Intermediate', hrSub: 'STAR Situational Scenarios', techSub: 'OOPs & Architecture' },
  { id: 'Advanced', label: 'Advanced', hrSub: 'Leadership, Ethics & Conflicts', techSub: 'Internals & Concurrency' },
]

const MODES = [
  {
    id: 'video',
    icon: '📹',
    label: 'Video Interview',
    available: true,
    note: 'Camera + Mic enabled',
    hrBadge: '★ Highly Recommended for HR',
    description: 'Full face-to-face AI simulation with live selfie camera, facial focus, and verbal dialogue with Sophia AI avatar.',
  },
  {
    id: 'audio',
    icon: '🎙️',
    label: 'Audio Interview',
    available: true,
    note: 'Voice only · No webcam needed',
    hrBadge: 'Great for Speech Fluency',
    description: 'Verbal conversation with Sophia AI using your microphone. Camera remains completely turned off. Practice speech fluency and articulation.',
  },
  {
    id: 'text',
    icon: '📝',
    label: 'Text Interview',
    available: true,
    note: 'Type answers · No camera or mic needed',
    hrBadge: null,
    description: 'Type your responses directly into the editor. Zero webcam or microphone required. Focus completely on structuring great written answers.',
  },
]

const InterviewSetup = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const isQueryHR = searchParams.get('track') === 'hr' || location.search.includes('track=hr')
  const rawRole = (location.state?.role || '').toLowerCase()
  const isInitiallyHR = isQueryHR || Boolean(location.state?.isHRTrack) || rawRole.includes('hr') || rawRole.includes('behavioral')

  const [isHRTrack, setIsHRTrack] = useState(isInitiallyHR)
  const initialRole = isInitiallyHR
    ? (location.state?.role === 'HR Interview' ? 'HR & Behavioral Round' : location.state?.role || 'HR & Behavioral Round')
    : (location.state?.role || 'Python Developer')
  const initialMode = location.state?.mode || (isInitiallyHR ? 'video' : 'text')

  const [step, setStep] = useState(1)
  const [role, setRole] = useState(initialRole)
  const [customRole, setCustomRole] = useState('')
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [mode, setMode] = useState(initialMode)
  const [questionCount, setQuestionCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const activeRoles = isHRTrack ? HR_ROLES : TECH_ROLES
  const finalRole = role === 'Custom Role' ? customRole : role

  const handleStart = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await startInterview({
        job_role: finalRole || (isHRTrack ? 'HR & Behavioral Round' : 'Python Developer'),
        difficulty: difficulty || 'Intermediate',
        mode: mode || 'text',
        question_count: questionCount || 5,
      })
      navigate(`/interview/${res.data.id}/session${isHRTrack ? '?track=hr' : ''}`, {
        state: { isHRTrack, role: finalRole }
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start interview. Check backend server and API key.')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { n: 1, label: isHRTrack ? 'HR Focus' : 'Role' },
    { n: 2, label: 'Difficulty' },
    { n: 3, label: 'Mode' },
  ]

  return (
    <AppShell>
      {/* Top Header */}
      <div className="mb-4 sm:mb-5 border-b border-slate-200/60 dark:border-slate-800/80 pb-3 sm:pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            to={isHRTrack ? "/hr" : "/dashboard"}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors mb-1.5"
          >
            <span>←</span>
            <span>{isHRTrack ? "Back to HR Workspace" : "Back to Main Hub"}</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="eyebrow">
              {isHRTrack ? 'HR Interview Studio' : 'Technical Studio'}
            </span>
            <span
              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md font-semibold border ${
                isHRTrack
                  ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              }`}
            >
              {isHRTrack ? 'HR Interview Track' : 'Coding Track'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            {isHRTrack ? 'Set up HR Interview' : 'Set up your mock interview'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            {isHRTrack
              ? 'Practice real-world behavioral questions, STAR situational scenarios, and cultural fit with our HR Recruiter AI.'
              : 'Customize your target role, difficulty level, and practice format.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const nextTrack = !isHRTrack
            setIsHRTrack(nextTrack)
            setRole(nextTrack ? 'HR & Behavioral Round' : 'Python Developer')
            if (nextTrack && mode === 'text') setMode('video')
          }}
          className="self-start sm:self-center px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0D1527] transition-all cursor-pointer shadow-xs"
        >
          {isHRTrack ? 'Switch to Technical Studio ↗' : 'Switch to HR & Behavioral ↗'}
        </button>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6 bg-white dark:bg-[#0D1527] p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-craft">
        {steps.map((s, i) => (
          <React.Fragment key={s.n}>
            <button
              type="button"
              onClick={() => setStep(s.n)}
              className="flex items-center gap-2 sm:gap-2.5 text-left cursor-pointer focus:outline-hidden"
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-mono text-xs sm:text-sm font-bold transition-all ${
                  step === s.n
                    ? 'bg-brand-600 text-white shadow-xs dark:shadow-[0_0_12px_rgba(37,99,235,0.5)] ring-2 ring-blue-400/40'
                    : step > s.n
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-[#131E38] text-slate-400 border border-slate-200 dark:border-slate-700/80'
                }`}
              >
                {step > s.n ? '✓' : s.n}
              </div>
              <span
                className={`text-xs sm:text-sm font-bold ${
                  step === s.n ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {s.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 rounded-full ${
                  step > s.n ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-brand-50 dark:bg-rose-950/60 border border-brand-200 dark:border-rose-900 text-brand-700 dark:text-rose-400 text-xs font-medium">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Role / Focus Selection */}
        {step === 1 && (
          <motion.div
            key="s1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3">
              {isHRTrack ? 'Select HR & Behavioral Focus' : 'Select Target Role'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mb-5">
              {activeRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`card text-left p-3.5 transition-all ${
                    role === r
                      ? 'border-brand-500 dark:border-blue-500 ring-2 ring-brand-500/20 bg-brand-50/40 dark:bg-blue-950/70 text-brand-900 dark:text-white shadow-md dark:shadow-[0_0_15px_rgba(37,99,235,0.25)]'
                      : 'hover:border-slate-300 dark:hover:border-blue-500/40'
                  }`}
                >
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">{r}</span>
                  {isHRTrack && r === 'HR & Behavioral Round' && (
                    <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold block mt-0.5">
                      Comprehensive Core HR
                    </span>
                  )}
                  {isHRTrack && r === 'Fresher Campus Placement HR' && (
                    <span className="text-[10px] text-blue-500 dark:text-blue-400 font-semibold block mt-0.5">
                      Entry-Level, Projects & Strengths
                    </span>
                  )}
                  {isHRTrack && r === 'Software Engineer HR Round' && (
                    <span className="text-[10px] text-purple-500 dark:text-purple-400 font-semibold block mt-0.5">
                      Tech Team Culture & Delivery
                    </span>
                  )}
                  {isHRTrack && r === 'Leadership & Behavioral Round' && (
                    <span className="text-[10px] text-amber-500 dark:text-amber-400 font-semibold block mt-0.5">
                      Team Conflicts & Ownership
                    </span>
                  )}
                </button>
              ))}
            </div>
            {role === 'Custom Role' && (
              <input
                className="input-field mb-6 max-w-lg"
                placeholder={
                  isHRTrack
                    ? 'e.g. Executive HR Round, Managerial Behavioral...'
                    : 'Type the job role you are preparing for...'
                }
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
              />
            )}
            <button
              disabled={!role || (role === 'Custom Role' && !customRole.trim())}
              onClick={() => setStep(2)}
              className="btn-primary"
            >
              Next: Question Difficulty (Step 2/3) →
            </button>
          </motion.div>
        )}

        {/* Step 2: Difficulty Selection */}
        {step === 2 && (
          <motion.div
            key="s2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3">
              {isHRTrack ? 'Select Experience Tier & Question Depth' : 'Select Question Difficulty'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5 max-w-2xl">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  className={`card text-left p-3.5 sm:p-4 transition-all ${
                    difficulty === d.id
                      ? 'border-brand-500 dark:border-blue-500 ring-2 ring-brand-500/20 bg-brand-50/40 dark:bg-blue-950/70 text-brand-900 dark:text-white shadow-md dark:shadow-[0_0_15px_rgba(37,99,235,0.25)]'
                      : 'hover:border-slate-300 dark:hover:border-blue-500/40'
                  }`}
                >
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">
                    {d.label}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1 leading-snug">
                    {isHRTrack ? d.hrSub : d.techSub}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setStep(1)} className="btn-secondary">
                ← Back to {isHRTrack ? 'Focus' : 'Role'}
              </button>
              <button disabled={!difficulty} onClick={() => setStep(3)} className="btn-primary">
                Next: Format & Mode (Step 3/3) →
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Format & Count Selection */}
        {step === 3 && (
          <motion.div
            key="s3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3">
              Choose Interview Format (Video, Audio, or Text)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5 max-w-3xl">
              {MODES.map((m) => {
                const isSelected = mode === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`card text-left p-4 transition-all group cursor-pointer relative ${
                      isSelected
                        ? 'border-2 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/70 shadow-md'
                        : 'hover:border-slate-300 dark:hover:border-blue-500/40'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wide">
                        ✓ Selected
                      </span>
                    )}
                    <span className="text-3xl block mb-2">{m.icon}</span>
                    <span className="font-bold text-base block text-slate-900 dark:text-white">
                      {m.label}
                    </span>
                    {isHRTrack && m.hrBadge ? (
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                        {m.hrBadge}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block mt-0.5">
                        {m.note}
                      </span>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {m.description}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Number of Questions */}
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3">
              Number of Questions
            </h2>
            <div className="grid grid-cols-3 gap-2.5 mb-5 max-w-lg">
              {[
                { count: 5, label: '5 Questions', sub: 'Quick practice' },
                { count: 10, label: '10 Questions', sub: 'Standard round (Recommended)' },
                { count: 15, label: '15 Questions', sub: 'In-depth behavioral round' },
              ].map((opt) => (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setQuestionCount(opt.count)}
                  className={`card text-center p-2.5 sm:p-3 transition-all cursor-pointer ${
                    questionCount === opt.count
                      ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/70 text-blue-900 dark:text-white shadow-xs dark:shadow-[0_0_15px_rgba(37,99,235,0.25)]'
                      : 'hover:border-slate-300 dark:hover:border-blue-500/40'
                  }`}
                >
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {opt.sub}
                  </span>
                </button>
              ))}
            </div>

            {/* Briefing Summary */}
            <div className="card max-w-2xl mb-5 bg-slate-50/70 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
              <span className="eyebrow mb-1">Briefing Summary</span>
              <div className="space-y-1 mt-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <p>
                  <strong className="text-slate-900 dark:text-white">
                    {isHRTrack ? 'Behavioral Track:' : 'Target Role:'}
                  </strong>{' '}
                  {finalRole}
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">Tier:</strong> {difficulty}
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">Format:</strong>{' '}
                  {MODES.find((m) => m.id === mode)?.label}
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">Total Questions:</strong>{' '}
                  {questionCount} Questions
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                ← Back to Difficulty
              </button>
              <button
                type="button"
                onClick={handleStart}
                disabled={loading}
                className="btn-primary shadow-xs"
              >
                {loading
                  ? 'Preparing Questions...'
                  : isHRTrack
                  ? `🚀 Launch HR ${MODES.find((m) => m.id === mode)?.label || 'Interview'}`
                  : `🚀 Launch ${MODES.find((m) => m.id === mode)?.label || 'Interview'}`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}

export default InterviewSetup
