import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppShell from '../components/AppShell'
import Loader from '../components/Loader'
import ReadinessDial from '../components/ReadinessDial'
import { getInterviewHistory } from '../api/interview'

const MEDALS = ['🥇', '🥈', '🥉']

const Leaderboard = () => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInterviewHistory()
      .then(res => {
        // Sort by overall_score descending, then by date (most recent first as tiebreaker)
        const sorted = [...res.data].sort((a, b) => b.overall_score - a.overall_score)
        setSessions(sorted)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <AppShell><Loader label="Loading leaderboard" /></AppShell>

  const top3 = sessions.slice(0, 3)
  const rest  = sessions.slice(3)

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-cyan'
    if (score >= 40) return 'text-amber'
    return 'text-danger'
  }

  const getBgColor = (score) => {
    if (score >= 75) return 'bg-cyan/10 border-cyan/30'
    if (score >= 40) return 'bg-amber/10 border-amber/30'
    return 'bg-danger/10 border-danger/30'
  }

  return (
    <AppShell>
      <p className="eyebrow mb-1">Personal Records</p>
      <h1 className="text-3xl font-display font-semibold mb-2">Your Leaderboard</h1>
      <p className="text-ink_text-muted text-sm mb-10">Your best interview performances, ranked by score.</p>

      {sessions.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-4">🏆</p>
          <p className="text-ink_text-muted mb-2">No completed interviews yet.</p>
          <p className="text-sm text-ink_text-muted mb-6">Complete your first interview to start your leaderboard!</p>
          <Link to="/interview/setup" className="btn-primary">Start First Interview</Link>
        </div>
      ) : (
        <>
          {/* Podium for top 3 */}
          {top3.length > 0 && (
            <div className="mb-10">
              <h2 className="font-display font-semibold text-sm text-ink_text-muted uppercase tracking-widest mb-6">Top Performances</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {top3.map((s, idx) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Link
                      to={`/interview/${s.id}/report`}
                      className={`card flex flex-col items-center text-center border transition-all hover:shadow-glow group ${
                        idx === 0 ? 'border-amber/50 bg-amber/5' : 'border-surface-border'
                      }`}
                    >
                      <span className="text-4xl mb-3">{MEDALS[idx]}</span>
                      <ReadinessDial score={s.overall_score} size={100} />
                      <p className="font-display font-semibold mt-4 group-hover:text-amber transition-colors">{s.job_role}</p>
                      <p className="text-xs text-ink_text-muted font-mono mt-1">{s.difficulty} · {s.mode}</p>
                      <p className="text-xs text-ink_text-muted font-mono mt-0.5">
                        {s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-IN') : '—'}
                      </p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Rest of the sessions table */}
          {rest.length > 0 && (
            <div className="card">
              <h2 className="font-display font-semibold mb-4">All Attempts</h2>
              <div className="divide-y divide-surface-border">
                {sessions.map((s, idx) => (
                  <Link
                    key={s.id}
                    to={`/interview/${s.id}/report`}
                    className="flex items-center justify-between py-3.5 hover:bg-ink-light/40 -mx-2 px-2 rounded transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-7 text-center font-mono text-sm text-ink_text-muted">
                        {idx < 3 ? MEDALS[idx] : `#${idx + 1}`}
                      </span>
                      <div>
                        <p className="font-medium group-hover:text-amber transition-colors">{s.job_role}</p>
                        <p className="text-xs text-ink_text-muted font-mono">
                          {s.difficulty} · {s.mode} · {s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-IN') : '—'}
                        </p>
                      </div>
                    </div>
                    <div className={`font-mono font-bold text-xl px-3 py-1 rounded-lg border ${getBgColor(s.overall_score)} ${getScoreColor(s.overall_score)}`}>
                      {s.overall_score}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Total Attempts', value: sessions.length },
              { label: 'Best Score', value: sessions[0]?.overall_score || 0 },
              { label: 'Avg Score', value: sessions.length ? Math.round(sessions.reduce((s, x) => s + x.overall_score, 0) / sessions.length) : 0 },
              { label: 'Roles Practiced', value: new Set(sessions.map(s => s.job_role)).size },
            ].map(({ label, value }) => (
              <div key={label} className="card text-center">
                <p className="text-2xl font-mono font-bold text-amber">{value}</p>
                <p className="text-xs text-ink_text-muted font-mono uppercase tracking-wide mt-1">{label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  )
}

export default Leaderboard
