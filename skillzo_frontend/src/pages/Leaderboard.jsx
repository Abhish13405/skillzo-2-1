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
        const sorted = [...res.data].sort((a, b) => b.overall_score - a.overall_score)
        setSessions(sorted)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <AppShell><Loader label="Loading leaderboard rankings" /></AppShell>

  const top3 = sessions.slice(0, 3)
  const rest  = sessions.slice(3)

  const getScoreBadge = (score) => {
    if (score >= 75) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (score >= 40) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-brand-50 text-brand-700 border-brand-200'
  }

  return (
    <AppShell>
      <div className="mb-8 border-b border-slate-200/60 pb-6">
        <span className="eyebrow mb-2">Personal Records</span>
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight">Your Leaderboard</h1>
        <p className="text-slate-500 text-sm mt-1">Your best mock interview scorecards, ordered by readiness rank.</p>
      </div>

      {sessions.length === 0 ? (
        <div className="card bg-white text-center py-16 border border-slate-200/80 shadow-craft rounded-2xl">
          <p className="text-4xl mb-4">🏆</p>
          <h3 className="font-display font-bold text-lg text-slate-900">No completed interviews yet</h3>
          <p className="text-slate-500 text-xs mb-6 mt-1">Complete your first interview to populate your personal leaderboard.</p>
          <Link to="/interview/setup" className="btn-primary shadow-md shadow-brand-500/20">Start First Interview →</Link>
        </div>
      ) : (
        <>
          {/* Podium for top 3 */}
          {top3.length > 0 && (
            <div className="mb-10">
              <span className="eyebrow mb-4">Top Performance Podium</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                {top3.map((s, idx) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Link
                      to={`/interview/${s.id}/report`}
                      className={`card bg-white flex flex-col items-center text-center border transition-all hover:shadow-craftHover group p-6 rounded-2xl ${
                        idx === 0 ? 'border-brand-500 ring-2 ring-brand-500/15 bg-gradient-to-b from-brand-50/50 to-white' : 'border-slate-200/80 shadow-craft'
                      }`}
                    >
                      <span className="text-4xl mb-3">{MEDALS[idx]}</span>
                      <ReadinessDial score={s.overall_score} size={100} />
                      <p className="font-display font-extrabold text-lg text-slate-900 mt-4 group-hover:text-brand-600 transition-colors">{s.job_role}</p>
                      <p className="text-xs text-slate-500 font-mono mt-1">{s.difficulty} · {s.mode}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-IN') : '—'}
                      </p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* All sessions table */}
          {sessions.length > 0 && (
            <div className="card bg-white shadow-craft border border-slate-200/80 p-6 rounded-2xl mb-8">
              <h2 className="font-display font-bold text-lg text-slate-900 mb-4">All Ranked Sessions</h2>
              <div className="divide-y divide-slate-100">
                {sessions.map((s, idx) => (
                  <Link
                    key={s.id}
                    to={`/interview/${s.id}/report`}
                    className="flex items-center justify-between py-3.5 hover:bg-slate-50 -mx-2 px-4 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-8 text-center font-mono font-extrabold text-sm text-slate-400">
                        {idx < 3 ? MEDALS[idx] : `#${idx + 1}`}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors text-sm">{s.job_role}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {s.difficulty} · {s.mode} · {s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-IN') : '—'}
                        </p>
                      </div>
                    </div>
                    <div className={`font-mono font-bold text-xs px-3 py-1.5 rounded-full border ${getScoreBadge(s.overall_score)}`}>
                      Score: {s.overall_score} / 100
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
              <div key={label} className="card bg-white text-center p-5 border border-slate-200/80 shadow-craft rounded-2xl">
                <p className="text-2xl sm:text-3xl font-display font-extrabold text-brand-600">{value}</p>
                <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mt-1">{label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  )
}

export default Leaderboard

