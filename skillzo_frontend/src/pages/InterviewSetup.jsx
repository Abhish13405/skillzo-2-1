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
  { id: 'audio', icon: '🎤', label: 'Audio Interview', available: true, note: 'Chrome / Edge only' },
  { id: 'video', icon: '📹', label: 'Video Interview', available: true, note: 'Camera + Mic required' },
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
      setError(err.response?.data?.error || 'Could not start interview. Check your Groq API key on the backend.')
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
      <p className="eyebrow mb-1">Mission Briefing</p>
      <h1 className="text-3xl font-display font-semibold mb-8">Set up your interview</h1>

      {/* Stepper */}
      <div className="flex items-center gap-4 mb-10">
        {steps.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm font-semibold border-2 ${
                  step >= s.n ? 'border-amber text-amber bg-amber/10' : 'border-surface-border text-ink_text-muted'
                }`}
              >
                {s.n}
              </div>
              <span className={`text-sm font-medium ${step >= s.n ? 'text-ink_text' : 'text-ink_text-muted'}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-px ${step > s.n ? 'bg-amber' : 'bg-surface-border'}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`card text-left transition-all ${role === r ? 'border-amber shadow-glow' : 'hover:border-cyan/40'}`}
                >
                  <span className="font-medium">{r}</span>
                </button>
              ))}
            </div>
            {role === 'Custom Role' && (
              <input
                className="input-field mb-6"
                placeholder="Type the job role you're preparing for..."
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
              />
            )}
            <button
              disabled={!role || (role === 'Custom Role' && !customRole.trim())}
              onClick={() => setStep(2)}
              className="btn-primary"
            >
              Continue
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="grid grid-cols-3 gap-3 mb-6 max-w-lg">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`card text-center transition-all ${difficulty === d ? 'border-amber shadow-glow' : 'hover:border-cyan/40'}`}
                >
                  <span className="font-medium">{d}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
              <button disabled={!difficulty} onClick={() => setStep(3)} className="btn-primary">Continue</button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-2xl">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  disabled={!m.available}
                  onClick={() => setMode(m.id)}
                  className={`card text-center relative transition-all ${
                    mode === m.id ? 'border-amber shadow-glow' : m.available ? 'hover:border-cyan/40' : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <span className="text-3xl block mb-2">{m.icon}</span>
                  <span className="font-medium block">{m.label}</span>
                  {m.note && <span className="text-[10px] font-mono text-ink_text-muted mt-1 block">{m.note}</span>}
                </button>
              ))}
            </div>

            <div className="card max-w-2xl mb-6 bg-ink-light">
              <p className="text-xs text-ink_text-muted font-mono uppercase mb-2">Briefing summary</p>
              <p className="text-sm"><span className="text-ink_text-muted">Role:</span> {finalRole}</p>
              <p className="text-sm"><span className="text-ink_text-muted">Difficulty:</span> {difficulty}</p>
              <p className="text-sm"><span className="text-ink_text-muted">Mode:</span> {MODES.find(m => m.id === mode)?.label}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
              <button onClick={handleStart} disabled={loading} className="btn-primary">
                {loading ? 'Generating questions...' : 'Launch Interview'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}

export default InterviewSetup
