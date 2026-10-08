import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AppShell from '../components/AppShell'
import { startInterview } from '../api/interview'

const ROLES = [
  'Python Developer', 'Java Developer', 'Frontend Developer',
  'Data Scientist', 'AI Engineer', 'HR Interview', 'Custom Role',
]
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']
const MODES = [
  {
    id: 'text',
    icon: '📝',
    label: 'Text Interview',
    available: true,
    note: 'Type answers · No camera or mic needed',
    description: 'Type your responses directly into the editor. Zero webcam or microphone required. Focus completely on structuring great written answers.',
  },
  {
    id: 'audio',
    icon: '🎙️',
    label: 'Audio Interview',
    available: true,
    note: 'Voice only · No webcam needed',
    description: 'Verbal conversation with Sophia AI using your microphone. Camera remains completely turned off. Practice speech fluency and articulation.',
  },
  {
    id: 'video',
    icon: '📹',
    label: 'Video Interview',
    available: true,
    note: 'Camera + Mic enabled',
    description: 'Full face-to-face AI simulation with live selfie camera, facial focus, and verbal dialogue with Sophia AI avatar.',
  },
]

const InterviewSetup = () => {
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [mode, setMode] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const finalRole = role === 'Custom Role' ? customRole : role

  const handleStart = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await startInterview({
        job_role: finalRole,
        difficulty,
        mode,
        question_count: questionCount,
      })
      navigate(`/interview/${res.data.id}/session`)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start interview. Check backend server and API key.')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { n: 1, label: 'Role' },
    { n: 2, label: 'Difficulty' },
    { n: 3, label: 'Mode' },
  ]

  return (
    <AppShell>
      <div className="mb-4 sm:mb-5 border-b border-slate-200/60 dark:border-slate-800/80 pb-3 sm:pb-4">
        <span className="eyebrow mb-1">Interview Studio</span>
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">Set up your mock interview</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Customize your target role, difficulty level, and practice format.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-3 mb-5 sm:mb-6 bg-white dark:bg-[#0D1527] p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-craft">
        {steps.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-mono text-xs sm:text-sm font-bold transition-all ${
                  step >= s.n 
                    ? 'bg-brand-600 text-white shadow-xs dark:shadow-[0_0_12px_rgba(37,99,235,0.5)]' 
                    : 'bg-slate-100 dark:bg-[#131E38] text-slate-400 border border-slate-200 dark:border-slate-700/80'
                }`}
              >
                {s.n}
              </div>
              <span className={`text-xs sm:text-sm font-bold ${step >= s.n ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${step > s.n ? 'bg-brand-600 dark:bg-blue-500' : 'bg-slate-200 dark:bg-slate-800'}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-brand-50 dark:bg-rose-950/60 border border-brand-200 dark:border-rose-900 text-brand-700 dark:text-rose-400 text-xs font-medium">{error}</div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3">Select Target Role</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-5">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`card text-left p-3.5 transition-all ${
                    role === r 
                      ? 'border-brand-500 dark:border-blue-500 ring-2 ring-brand-500/20 bg-brand-50/40 dark:bg-blue-950/70 text-brand-900 dark:text-white shadow-md dark:shadow-[0_0_15px_rgba(37,99,235,0.25)]' 
                      : 'hover:border-slate-300 dark:hover:border-blue-500/40'
                  }`}
                >
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{r}</span>
                </button>
              ))}
            </div>
            {role === 'Custom Role' && (
              <input
                className="input-field mb-6 max-w-lg"
                placeholder="Type the job role you are preparing for..."
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
              />
            )}
            <button
              disabled={!role || (role === 'Custom Role' && !customRole.trim())}
              onClick={() => setStep(2)}
              className="btn-primary"
            >
              Next Step →
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3">Select Question Difficulty</h2>
            <div className="grid grid-cols-3 gap-2.5 mb-5 max-w-lg">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`card text-center p-3 sm:p-3.5 transition-all ${
                    difficulty === d 
                      ? 'border-brand-500 dark:border-blue-500 ring-2 ring-brand-500/20 bg-brand-50/40 dark:bg-blue-950/70 text-brand-900 dark:text-white shadow-md dark:shadow-[0_0_15px_rgba(37,99,235,0.25)]' 
                      : 'hover:border-slate-300 dark:hover:border-blue-500/40'
                  }`}
                >
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{d}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setStep(1)} className="btn-secondary">← Back</button>
              <button disabled={!difficulty} onClick={() => setStep(3)} className="btn-primary">Next Step →</button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {!mode ? (
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3">Choose Interview Format</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5 max-w-2xl">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      disabled={!m.available}
                      onClick={() => setMode(m.id)}
                      className="card text-center p-4 hover:border-blue-500 dark:hover:border-blue-500 hover:ring-2 hover:ring-blue-100 dark:hover:ring-blue-900/40 transition-all group cursor-pointer shadow-xs"
                    >
                      <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">{m.icon}</span>
                      <span className="font-bold text-sm block text-slate-800 dark:text-slate-200">{m.label}</span>
                      {m.note && <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1 block">{m.note}</span>}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2.5">
                  <button onClick={() => setStep(2)} className="btn-secondary">← Back</button>
                </div>
              </div>
            ) : (
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {/* 1. Dedicated Selected Format Card */}
                <div className="flex items-center justify-between mb-3 max-w-2xl">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {MODES.find((m) => m.id === mode)?.label}
                  </h2>
                  <button
                    onClick={() => setMode('')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Change Format</span>
                    <span>↺</span>
                  </button>
                </div>

                <div className="card max-w-2xl p-4 mb-5 bg-gradient-to-r from-blue-50/70 via-white to-blue-50/40 dark:from-blue-950/60 dark:via-[#0D1527] dark:to-blue-950/40 border-2 border-blue-500/30 dark:border-blue-500/40 shadow-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                      {MODES.find((m) => m.id === mode)?.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          {MODES.find((m) => m.id === mode)?.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wide">
                          Selected
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {MODES.find((m) => m.id === mode)?.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Number of Questions */}
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-3">Number of Questions</h2>
                <div className="grid grid-cols-3 gap-2.5 mb-5 max-w-lg">
                  {[
                    { count: 5, label: '5 Questions', sub: 'Quick practice' },
                    { count: 10, label: '10 Questions', sub: 'Standard mock (Recommended)' },
                    { count: 15, label: '15 Questions', sub: 'Deep technical' },
                  ].map((opt) => (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => setQuestionCount(opt.count)}
                      className={`card text-center p-2.5 sm:p-3 transition-all cursor-pointer ${
                        questionCount === opt.count
                          ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/70 text-blue-900 dark:text-white shadow-sm dark:shadow-[0_0_15px_rgba(37,99,235,0.25)]' 
                          : 'hover:border-slate-300 dark:hover:border-blue-500/40'
                      }`}
                    >
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block">{opt.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">{opt.sub}</span>
                    </button>
                  ))}
                </div>

                {/* 3. Briefing Summary */}
                <div className="card max-w-2xl mb-5 bg-slate-50/70 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xs">
                  <span className="eyebrow mb-1">Briefing Summary</span>
                  <div className="space-y-1 mt-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    <p><strong className="text-slate-900 dark:text-white">Target Role:</strong> {finalRole}</p>
                    <p><strong className="text-slate-900 dark:text-white">Difficulty:</strong> {difficulty}</p>
                    <p><strong className="text-slate-900 dark:text-white">Format:</strong> {MODES.find(m => m.id === mode)?.label}</p>
                    <p><strong className="text-slate-900 dark:text-white">Total Questions:</strong> {questionCount} Questions</p>
                  </div>
                </div>

                {/* 4. Action Buttons */}
                <div className="flex gap-2.5">
                  <button onClick={() => setMode('')} className="btn-secondary">
                    ← Change Format
                  </button>
                  <button onClick={handleStart} disabled={loading} className="btn-primary shadow-sm">
                    {loading ? 'Preparing Questions...' : `🚀 Launch ${MODES.find(m => m.id === mode)?.label || 'Interview'}`}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}

export default InterviewSetup

