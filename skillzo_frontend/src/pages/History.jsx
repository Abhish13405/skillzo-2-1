import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import Loader from '../components/Loader'
import { getInterviewHistory, getInterviewDetail } from '../api/interview'
import { useAuth } from '../context/AuthContext'
import { downloadInterviewReportPdf } from '../utils/generatePdfReport'

const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced']

const History = () => {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDiff, setFilterDiff] = useState('All')
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => {
    getInterviewHistory().then((res) => setSessions(res.data)).finally(() => setLoading(false))
  }, [])

  const handleDownloadPdf = async (e, sessionId) => {
    e.preventDefault()
    e.stopPropagation()
    setDownloadingId(sessionId)
    try {
      const res = await getInterviewDetail(sessionId)
      downloadInterviewReportPdf({ session: res.data, user })
    } catch (err) {
      console.error('Error downloading PDF:', err)
      alert('Could not download PDF report. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-5 gap-3 border-b border-slate-200/60 pb-3 sm:pb-4">
        <div>
          <span className="eyebrow mb-1">Reports Archive</span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight mt-0.5">Interview History</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Review past mock session scorecards and performance summaries.</p>
        </div>
        <Link to="/interview/setup" className="btn-primary shrink-0 shadow-sm py-2 px-3.5 text-xs sm:text-sm">
          + New Interview Session
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4 sm:mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="input-field pl-9 py-1.5"
            placeholder="Search by job role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Difficulty filter */}
        <div className="flex gap-1.5 flex-wrap">
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              onClick={() => setFilterDiff(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                filterDiff === d
                  ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="card bg-white text-center py-12 border border-slate-200/80 shadow-craft rounded-2xl">
          <p className="text-slate-500 text-sm mb-3">No completed interviews yet.</p>
          <Link to="/interview/setup" className="btn-primary shadow-sm py-2 px-3.5 text-xs">Start Your First Interview →</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card bg-white text-center py-10 border border-slate-200/80 shadow-craft rounded-2xl">
          <p className="text-slate-500 text-xs sm:text-sm">No interviews match your search criteria.</p>
        </div>
      ) : (
        <div className="card bg-white divide-y divide-slate-100 border border-slate-200/80 shadow-craft p-3.5 sm:p-4 rounded-2xl">
          {filtered.map((s) => {
            const badgeStyle = getScoreBadge(s.overall_score)
            return (
              <Link
                key={s.id}
                to={`/interview/${s.id}/report`}
                className="flex items-center justify-between py-2.5 hover:bg-slate-50 -mx-1 px-3 rounded-xl transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate text-sm">{s.job_role}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {s.difficulty} · Format: {s.mode} · {s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'In Progress'}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border ${badgeStyle}`}>
                    {s.overall_score} / 100
                  </span>
                  <button
                    onClick={(e) => handleDownloadPdf(e, s.id)}
                    disabled={downloadingId === s.id}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                    title="Download Report PDF"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span>{downloadingId === s.id ? '...' : 'PDF'}</span>
                  </button>
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

