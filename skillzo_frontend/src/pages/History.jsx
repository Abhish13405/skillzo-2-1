import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import Loader from '../components/Loader'
import { getInterviewHistory } from '../api/interview'

const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced']

const History = () => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDiff, setFilterDiff] = useState('All')

  useEffect(() => {
    getInterviewHistory().then((res) => setSessions(res.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <AppShell><Loader label="Loading interview history" /></AppShell>

  const filtered = sessions.filter(s => {
    const matchSearch = s.job_role.toLowerCase().includes(search.toLowerCase())
    const matchDiff = filterDiff === 'All' || s.difficulty === filterDiff
    return matchSearch && matchDiff
  })

  const getScoreBadge = (score) => {
    if (score >= 75) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (score >= 40) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-brand-50 text-brand-700 border-brand-200'
  }

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <span className="eyebrow mb-2">Reports Archive</span>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight">Interview History</h1>
          <p className="text-slate-500 text-sm mt-1">Review past mock session scorecards and performance summaries.</p>
        </div>
        <Link to="/interview/setup" className="btn-primary shrink-0 shadow-md shadow-brand-500/20">
          + New Interview Session
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="input-field pl-10"
            placeholder="Search by job role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Difficulty filter */}
        <div className="flex gap-2 flex-wrap">
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              onClick={() => setFilterDiff(d)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                filterDiff === d
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="card bg-white text-center py-16 border border-slate-200/80 shadow-craft rounded-2xl">
          <p className="text-slate-500 text-sm mb-4">No completed interviews yet.</p>
          <Link to="/interview/setup" className="btn-primary shadow-md shadow-brand-500/20">Start Your First Interview →</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card bg-white text-center py-12 border border-slate-200/80 shadow-craft rounded-2xl">
          <p className="text-slate-500 text-sm">No interviews match your search criteria.</p>
        </div>
      ) : (
        <div className="card bg-white divide-y divide-slate-100 border border-slate-200/80 shadow-craft p-4 rounded-2xl">
          {filtered.map((s) => {
            const badgeStyle = getScoreBadge(s.overall_score)
            return (
              <Link
                key={s.id}
                to={`/interview/${s.id}/report`}
                className="flex items-center justify-between py-4 hover:bg-slate-50 -mx-2 px-4 rounded-xl transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate">{s.job_role}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {s.difficulty} · Format: {s.mode} · {s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'In Progress'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono font-bold text-sm px-3 py-1.5 rounded-full border ${badgeStyle}`}>
                    {s.overall_score} / 100
                  </span>
                  <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Count */}
      {sessions.length > 0 && (
        <p className="text-xs text-slate-400 font-mono mt-4 text-right">
          Showing {filtered.length} of {sessions.length} sessions
        </p>
      )}
    </AppShell>
  )
}

export default History

