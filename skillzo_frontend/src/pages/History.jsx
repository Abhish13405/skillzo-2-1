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

  if (loading) return <AppShell><Loader label="Loading history" /></AppShell>

  const filtered = sessions.filter(s => {
    const matchSearch = s.job_role.toLowerCase().includes(search.toLowerCase())
    const matchDiff = filterDiff === 'All' || s.difficulty === filterDiff
    return matchSearch && matchDiff
  })

  const getScoreStyle = (score) => {
    if (score >= 75) return { text: 'text-cyan', bg: 'bg-cyan/10 border-cyan/30' }
    if (score >= 40) return { text: 'text-amber', bg: 'bg-amber/10 border-amber/30' }
    return { text: 'text-danger', bg: 'bg-danger/10 border-danger/30' }
  }

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="eyebrow mb-1">Reports Archive</p>
          <h1 className="text-3xl font-display font-semibold">Interview History</h1>
        </div>
        <Link to="/interview/setup" className="btn-primary shrink-0">New Interview</Link>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink_text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="input-field pl-9"
            placeholder="Search by role..."
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
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                filterDiff === d
                  ? 'bg-amber/10 border-amber/40 text-amber'
                  : 'bg-surface border-surface-border text-ink_text-muted hover:text-ink_text hover:border-cyan/30'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-ink_text-muted mb-4">No completed interviews yet.</p>
          <Link to="/interview/setup" className="btn-primary">Start Your First Interview</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-ink_text-muted">No interviews match your filter. Try adjusting the search or difficulty.</p>
        </div>
      ) : (
        <div className="card divide-y divide-surface-border">
          {filtered.map((s) => {
            const { text, bg } = getScoreStyle(s.overall_score)
            return (
              <Link
                key={s.id}
                to={`/interview/${s.id}/report`}
                className="flex items-center justify-between py-4 hover:bg-ink-light/40 -mx-2 px-2 rounded transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium group-hover:text-amber transition-colors truncate">{s.job_role}</p>
                  <p className="text-xs text-ink_text-muted font-mono mt-0.5">
                    {s.difficulty} · {s.mode} · {s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </p>
                </div>
                <span className={`font-mono font-bold text-lg ml-4 shrink-0 px-3 py-1 rounded-lg border ${bg} ${text}`}>
                  {s.overall_score}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Count */}
      {sessions.length > 0 && (
        <p className="text-xs text-ink_text-muted font-mono mt-4 text-right">
          Showing {filtered.length} of {sessions.length} interviews
        </p>
      )}
    </AppShell>
  )
}

export default History
