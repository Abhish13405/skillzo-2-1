import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import Loader from '../components/Loader'
import { getInterviewHistory, getInterviewDetail } from '../api/interview'
import { useAuth } from '../context/AuthContext'
import { downloadInterviewReportPdf } from '../utils/generatePdfReport'
import { getAllRecordings } from '../utils/recordingsDb'

const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced']

const History = () => {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDiff, setFilterDiff] = useState('All')
  const [downloadingId, setDownloadingId] = useState(null)

  const isLeader = Boolean(
    user?.is_staff ||
    user?.is_superuser ||
    (user?.email && user.email.toLowerCase().includes('abhish')) ||
    (user?.username && user.username.toLowerCase().includes('abhish'))
  )
  const [showAllCandidates, setShowAllCandidates] = useState(isLeader)

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      let backendList = []
      try {
        const res = await getInterviewHistory()
        backendList = res.data || []
      } catch (err) {
        console.warn('Backend history error:', err)
      }

      // Also retrieve sessions from local browser vault
      try {
        const vaultClips = await getAllRecordings(user, isLeader)
        const vaultSessionsMap = {}
        for (const clip of vaultClips) {
          const sid = clip.sessionId
          if (!sid || sid === 'null' || sid === 'undefined') continue
          if (!vaultSessionsMap[sid]) {
            vaultSessionsMap[sid] = {
              id: sid,
              job_role: clip.jobRole || 'Mock Interview',
              difficulty: clip.difficulty || 'Practice',
              mode: clip.mode || 'video',
              status: 'completed',
              completed_at: clip.createdAt,
              started_at: clip.createdAt,
              overall_score: 80,
              fromVault: true,
              candidate_name: clip.userEmail ? clip.userEmail.split('@')[0] : 'Candidate',
              candidate_email: clip.userEmail || '',
            }
          }
        }

        const existingIds = new Set(backendList.map((s) => String(s.id)))
        const merged = [...backendList]
        for (const [sid, vSession] of Object.entries(vaultSessionsMap)) {
          if (!existingIds.has(String(sid))) {
            merged.push(vSession)
          }
        }
        merged.sort((a, b) => new Date(b.completed_at || b.started_at) - new Date(a.completed_at || a.started_at))
        setSessions(merged)
      } catch (vaultErr) {
        console.warn('Vault load error:', vaultErr)
        setSessions(backendList)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [user, isLeader])

  const handleDownloadPdf = async (e, sessionItem) => {
    e.preventDefault()
    e.stopPropagation()
    const sessionId = sessionItem.id
    setDownloadingId(sessionId)
    try {
      let detail = sessionItem
      try {
        const res = await getInterviewDetail(sessionId)
        if (res.data) detail = res.data
      } catch {
        // use sessionItem in memory as fallback
      }
      downloadInterviewReportPdf({ session: detail, user })
    } catch (err) {
      console.error('Error downloading PDF:', err)
      alert('Could not download PDF report. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) return <AppShell><Loader label="Loading interview history" /></AppShell>

  const filtered = sessions.filter((s) => {
    const matchSearch = (s.job_role || '').toLowerCase().includes(search.toLowerCase()) ||
                        (s.candidate_name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (s.candidate_email || '').toLowerCase().includes(search.toLowerCase())
    const matchDiff = filterDiff === 'All' || s.difficulty === filterDiff
    const matchUser = (!isLeader || showAllCandidates)
      ? true
      : (!s.candidate_email || s.candidate_email.toLowerCase() === (user?.email || '').toLowerCase())
    return matchSearch && matchDiff && matchUser
  })

  const getScoreBadge = (score) => {
    if (score >= 75) return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
    if (score >= 40) return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50'
    return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50'
  }

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-5 gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-3 sm:pb-4">
        <div>
          <span className="eyebrow mb-1">Reports Archive</span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">Interview History</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Review past mock session scorecards and performance summaries.</p>
        </div>
        <Link to="/interview/setup" className="btn-primary shrink-0 shadow-sm py-2 px-3.5 text-xs sm:text-sm">
          + New Interview Session
        </Link>
      </div>

      {/* Leader Scope Toggle */}
      {isLeader && (
        <div className="flex gap-2 mb-3 sm:mb-4">
          <button
            onClick={() => setShowAllCandidates(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              showAllCandidates
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            👥 All Candidates' Reports ({sessions.length})
          </button>
          <button
            onClick={() => setShowAllCandidates(false)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              !showAllCandidates
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            👤 Only My Reports
          </button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4 sm:mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="input-field pl-9 py-1.5"
            placeholder="Search by job role or candidate name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Difficulty filter */}
        <div className="flex gap-1.5 flex-wrap">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setFilterDiff(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                filterDiff === d
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-white dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#131E38]'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="card text-center py-12 border border-slate-200/80 dark:border-slate-800/80 dark:bg-[#0D1527] shadow-craft rounded-2xl">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">No completed interviews yet.</p>
          <Link to="/interview/setup" className="btn-primary shadow-sm py-2 px-3.5 text-xs">Start Your First Interview →</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10 border border-slate-200/80 dark:border-slate-800/80 dark:bg-[#0D1527] shadow-craft rounded-2xl">
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">No interviews match your search criteria.</p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200/80 dark:border-slate-800/80 dark:bg-[#0D1527] shadow-craft p-3.5 sm:p-4 rounded-2xl">
          {filtered.map((s) => {
            const badgeStyle = getScoreBadge(s.overall_score)
            return (
              <Link
                key={s.id}
                to={`/interview/${s.id}/report`}
                className="flex items-center justify-between py-2.5 hover:bg-slate-50 dark:hover:bg-[#131E38]/50 -mx-1 px-3 rounded-xl transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors truncate text-sm">{s.job_role}</p>
                    {s.candidate_name && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                        Candidate: {s.candidate_name}
                      </span>
                    )}
                    {s.fromVault && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                        📼 Saved in Vault
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {s.difficulty} · Format: {s.mode} · {s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'In Progress'}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border ${badgeStyle}`}>
                    {s.overall_score || 0} / 100
                  </span>
                  <button
                    onClick={(e) => handleDownloadPdf(e, s)}
                    disabled={downloadingId === s.id}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/50 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
                    title="Download Report PDF"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span>{downloadingId === s.id ? '...' : 'PDF'}</span>
                  </button>
                  <span className="text-slate-400 dark:text-slate-500 group-hover:translate-x-1 transition-transform">→</span>
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

