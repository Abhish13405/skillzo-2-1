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
  { id: 'text', icon: '📝', label: 'Text Interview', available: true, note: null },
  { id: 'audio', icon: '🎤', label: 'Audio Interview', available: true, note: 'Chrome / Edge recommended' },
  { id: 'video', icon: '📹', label: 'Video Interview', available: true, note: 'Camera + Mic enabled' },
]

const InterviewSetup = () => {
  const [step, setStep] = useState(1)
  const [role, setRole] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [mode, setMode] = useState('text')
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
        question_count: 5,
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
      <span className="eyebrow mb-2">Interview Studio</span>
      <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight mb-2">Set up your mock interview</h1>
      <p className="text-slate-500 text-sm mb-8">Customize your target role, difficulty level, and practice medium.</p>

      {/* Stepper */}
      <div className="flex items-center gap-4 mb-10 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-craft">
        {steps.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-sm font-bold transition-all ${
                  step >= s.n 
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {s.n}
              </div>
              <span className={`text-sm font-bold ${step >= s.n ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded-full ${step > s.n ? 'bg-brand-600' : 'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mb-6 px-4 py-3.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-sm font-medium">{error}</div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Select Target Role</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`card text-left transition-all ${
                    role === r 
                      ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/40 text-brand-900 shadow-md' 
                      : 'hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="font-bold text-sm text-slate-800">{r}</span>
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
            <h2 className="text-xl font-bold text-slate-900 mb-4">Select Question Difficulty</h2>
            <div className="grid grid-cols-3 gap-3 mb-6 max-w-lg">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`card text-center transition-all ${
                    difficulty === d 
                      ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/40 text-brand-900 shadow-md' 
                      : 'hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="font-bold text-sm text-slate-800">{d}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary">← Back</button>
              <button disabled={!difficulty} onClick={() => setStep(3)} className="btn-primary">Next Step →</button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Choose Interview Format</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-2xl">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  disabled={!m.available}
                  onClick={() => setMode(m.id)}
                  className={`card text-center relative transition-all ${
                    mode === m.id 
                      ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/40 text-brand-900 shadow-md' 
                      : m.available ? 'hover:border-slate-300 bg-white' : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span className="text-3xl block mb-2">{m.icon}</span>
                  <span className="font-bold text-sm block text-slate-800">{m.label}</span>
                  {m.note && <span className="text-[10px] font-mono text-slate-400 mt-1 block">{m.note}</span>}
                </button>
              ))}
            </div>

            <div className="card max-w-2xl mb-6 bg-slate-50 border border-slate-200">
              <span className="eyebrow mb-2">Briefing Summary</span>
              <div className="space-y-1 mt-2 text-sm text-slate-700">
                <p><strong className="text-slate-900">Target Role:</strong> {finalRole}</p>
                <p><strong className="text-slate-900">Difficulty:</strong> {difficulty}</p>
                <p><strong className="text-slate-900">Format:</strong> {MODES.find(m => m.id === mode)?.label}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary">← Back</button>
              <button onClick={handleStart} disabled={loading} className="btn-primary shadow-md shadow-brand-500/20">
                {loading ? 'Preparing Questions...' : '🚀 Launch Interview'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}

export default InterviewSetup

