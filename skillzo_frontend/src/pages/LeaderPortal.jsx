import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import Loader from '../components/Loader'
import { getLeaderStats } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import {
  getAllRecordings,
  deleteRecording,
  formatBytes,
} from '../utils/recordingsDb'

const LeaderPortal = () => {
  const { user } = useAuth()

  const userEmail = (user?.email || '').toLowerCase().trim()
  const userName = (user?.username || '').toLowerCase().trim()
  const isLeader = Boolean(
    user && !user.is_guest && (
      user.is_leader ||
      user.is_staff ||
      user.is_superuser ||
      userEmail === 'abhishekkushwaha13405@gmail.com' ||
      userEmail === 'abhish@gmail.com' ||
      userEmail === 'abhishekkushwaha31387@bbdu.ac.in' ||
      userName === 'abhishek13405' ||
      userName === 'abhish' ||
      userName === 'abhishekkushwaha31387'
    )
  )

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(isLeader)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all') // 'all', 'interviewed', 'resumes'
  const [userSort, setUserSort] = useState('latest') // 'latest', 'interviews', 'score', 'alpha'
  const [error, setError] = useState('')

  // Detailed Candidate Inspector Modal
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [candidateTab, setCandidateTab] = useState('interviews') // 'interviews', 'resumes', 'recordings', 'info'

  // Recorded video vault states
  const [recordings, setRecordings] = useState([])
  const [loadingRecs, setLoadingRecs] = useState(true)
  const [activePlayback, setActivePlayback] = useState(null)
  const [recFilter, setRecFilter] = useState('all') // 'all', 'video', 'audio'

  const loadRecordings = async () => {
    try {
      const recs = await getAllRecordings(null, true)
      setRecordings(recs || [])
    } catch (err) {
      console.warn('Could not load recordings:', err)
    } finally {
      setLoadingRecs(false)
    }
  }

  const fetchLeaderData = (isManual = false) => {
    if (isManual) setRefreshing(true)
    setError('')

    getLeaderStats()
      .then(async (res) => {
        if (res.data && (Array.isArray(res.data.users) || Array.isArray(res.data.all_users))) {
          const userList = res.data.users || res.data.all_users || []
          setStats({ ...res.data, users: userList, all_users: userList })

          // Leader Portal ONLY displays recordings that candidates uploaded to cloud CDN
          const serverRecs = (res.data.server_recordings || []).filter((r) =>
            r.url && (r.url.startsWith('http://') || r.url.startsWith('https://'))
          )
          serverRecs.sort((a, b) => {
            const tA = a.timestamp ? (a.timestamp > 1e11 ? a.timestamp : a.timestamp * 1000) : (new Date(a.createdAt).getTime() || 0)
            const tB = b.timestamp ? (b.timestamp > 1e11 ? b.timestamp : b.timestamp * 1000) : (new Date(b.createdAt).getTime() || 0)
            return tB - tA
          })
          setRecordings(serverRecs)
        } else {
          setError('Received invalid data format from server.')
        }
      })
      .catch((err) => {
        console.error('Failed to load leader stats:', err)
        const errMsg =
          err.response?.data?.detail ||
          err.response?.data?.error ||
          err.message ||
          'Failed to connect to database for live candidate roster.'
        setError(errMsg)
      })
      .finally(() => {
        setLoading(false)
        setLoadingRecs(false)
        if (isManual) setRefreshing(false)
      })
  }

  useEffect(() => {
    if (!isLeader) {
      setLoading(false)
      return
    }

    fetchLeaderData(false)
  }, [isLeader])

  // Download candidate video (supports both local blob and remote server URL)
  const handleDownloadRec = (rec, e) => {
    e?.stopPropagation()
    const url = rec?.blob ? URL.createObjectURL(rec.blob) : (rec?.url || rec?.blobUrl)
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    const ext = 'webm'
    const safeRole = String(rec.jobRole || 'interview').replace(/[^a-zA-Z0-9_-]/g, '_')
    const userTag = rec.userEmail ? `_${rec.userEmail.split('@')[0]}` : ''
    a.download = `Skillzo_${rec.mode}_Q${rec.questionNumber}${userTag}_${safeRole}_${Date.now()}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    if (rec?.blob) setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  // Delete recording from vault
  const handleDeleteRec = async (id, e) => {
    e?.stopPropagation()
    if (!window.confirm('Delete this candidate recording?')) return
    await deleteRecording(id)
    if (activePlayback?.id === id) setActivePlayback(null)
    await loadRecordings()
  }

  // Export full candidates dataset to CSV
  const exportCandidatesCSV = () => {
    if (!stats?.users?.length) return

    const headers = [
      'ID',
      'Username',
      'Email',
      'Phone',
      'College_or_Company',
      'Target_Role',
      'Streak_Days',
      'Registered_Date',
      'Last_Active',
      'Total_Interviews',
      'Completed_Interviews',
      'Average_Score',
      'Best_Score',
      'Total_Resumes',
      'Latest_ATS_Score',
      'Is_Active',
      'Is_Leader',
    ]

    const rows = stats.users.map((u) => [
      u.id,
      `"${(u.username || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.phone || '').replace(/"/g, '""')}"`,
      `"${(u.college_or_company || '').replace(/"/g, '""')}"`,
      `"${(u.target_role || '').replace(/"/g, '""')}"`,
      u.current_streak || 0,
      `"${u.date_joined || ''}"`,
      `"${u.last_active_date || ''}"`,
      u.total_interviews || 0,
      u.completed_interviews || 0,
      u.avg_score || 0,
      u.best_score || 0,
      u.total_resumes || 0,
      u.latest_ats_score !== null && u.latest_ats_score !== undefined ? u.latest_ats_score : 'N/A',
      u.is_active ? 'Yes' : 'No',
      u.is_leader ? 'Leader' : 'Candidate',
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Skillzo_Registered_Candidates_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  if (!isLeader) {
    return (
      <AppShell>
        <div className="card text-center py-16 px-4 max-w-md mx-auto my-12 border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 rounded-2xl shadow-craft">
          <span className="text-4xl mb-3 block">🔒</span>
          <h2 className="text-xl font-display font-extrabold text-red-600 dark:text-red-400">
            Access Restricted
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 mb-6">
            This portal is exclusively reserved for Project Leader (Abhishek). Your account does not have administrative clearance.
          </p>
          <Link to="/dashboard" className="btn-primary text-xs py-2 px-4 shadow-sm inline-block">
            ← Return to Dashboard
          </Link>
        </div>
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell>
        <Loader label="Accessing Leader Control Center & Candidate Records" />
      </AppShell>
    )
  }

  const allUsersList = stats?.users || []

  const filteredUsers = allUsersList.filter((u) => {
    const q = search.toLowerCase().trim()
    const matchSearch =
      !q ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.target_role && u.target_role.toLowerCase().includes(q)) ||
      (u.college_or_company && u.college_or_company.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q))

    if (!matchSearch) return false

    if (roleFilter === 'interviewed') return (u.total_interviews || 0) > 0
    if (roleFilter === 'resumes') return (u.total_resumes || 0) > 0
    if (roleFilter === 'leaders') return u.is_leader
    return true
  })

  // Sorted Candidates: defaults to newest registered user first
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (userSort === 'interviews') return (b.total_interviews || 0) - (a.total_interviews || 0)
    if (userSort === 'score') return (b.best_score || b.avg_score || 0) - (a.best_score || a.avg_score || 0)
    if (userSort === 'alpha') return (a.username || '').localeCompare(b.username || '')
    return (b.id || 0) - (a.id || 0)
  })

  // Selected candidate's matching vault recordings (strictly newest first)
  const candidateRecordings = (() => {
    if (!selectedCandidate) return []
    const candEmail = (selectedCandidate.email || '').toLowerCase()
    const candId = String(selectedCandidate.id || '')

    const list = []
    const seen = new Set()

    const addRec = (rec) => {
      if (!rec || !rec.url) return
      // Strict Leader Portal Rule: Only show recordings uploaded to Cloudinary
      if (!rec.url.includes('cloudinary') && !rec.url.includes('res.cloudinary.com')) return
      const key = rec.id || rec.url || `${rec.sessionId}_${rec.questionNumber}`
      if (key && !seen.has(key)) {
        seen.add(key)
        list.push(rec)
      }
    }

    // 1. Direct recordings attached to candidate from backend
    if (Array.isArray(selectedCandidate.recordings)) {
      selectedCandidate.recordings.forEach(addRec)
    }

    // 2. Global recordings matching candidate email or id
    recordings
      .filter(
        (r) =>
          (r.userEmail && r.userEmail.toLowerCase() === candEmail) ||
          (r.userId && String(r.userId) === candId)
      )
      .forEach(addRec)

    // 3. Session answers with video/audio
    if (Array.isArray(selectedCandidate.sessions)) {
      selectedCandidate.sessions.forEach((s) => {
        if (Array.isArray(s.questions)) {
          s.questions.forEach((q) => {
            if (q.answer && (q.answer.video_url || q.answer.audio_url)) {
              const cloudUrl = q.answer.video_url || q.answer.audio_url
              if (cloudUrl && (cloudUrl.includes('cloudinary') || cloudUrl.includes('res.cloudinary.com'))) {
                addRec({
                  id: `cand_ans_${q.answer.id}`,
                  sessionId: s.id,
                  userId: selectedCandidate.id,
                  userEmail: selectedCandidate.email,
                  candidateName: selectedCandidate.username,
                  jobRole: s.role || 'AI Interview',
                  difficulty: s.difficulty || 'Intermediate',
                  mode: q.answer.video_url ? 'video' : 'audio',
                  questionNumber: q.order,
                  questionText: q.question_text,
                  url: cloudUrl,
                  durationSeconds: q.answer.speaking_time_seconds || 0,
                  score: q.answer.overall_score,
                  displayDate: s.started_at,
                  createdAt: s.started_at,
                })
              }
            }
          })
        }
      })
    }

    return list.sort((a, b) => {
      const tA = a.timestamp ? (a.timestamp > 1e11 ? a.timestamp : a.timestamp * 1000) : (new Date(a.createdAt).getTime() || 0)
      const tB = b.timestamp ? (b.timestamp > 1e11 ? b.timestamp : b.timestamp * 1000) : (new Date(b.createdAt).getTime() || 0)
      return tB - tA
    })
  })()

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3 flex-wrap border-b border-slate-200/60 dark:border-slate-800/80 pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="eyebrow w-fit">
              <span>Project Leader Headquarters</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              ● Live Cloud DB
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Leader Control Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            Complete database of all registered candidates, interview attempts, ATS scores & video recordings.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fetchLeaderData(true)}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 shadow-sm cursor-pointer disabled:opacity-50"
            title="Refresh candidate data from database"
          >
            <span className={refreshing ? 'animate-spin inline-block' : ''}>🔄</span>
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>

          <button
            type="button"
            onClick={exportCandidatesCSV}
            disabled={!allUsersList.length}
            className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 shadow-sm cursor-pointer disabled:opacity-50"
            title="Download candidates data in CSV spreadsheet"
          >
            <span>📥 Export CSV</span>
          </button>

          <Link
            to="/recordings?view=all"
            className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 shadow-sm"
          >
            <span>📼 Video Vault</span>
          </Link>

          <a
            href="https://skillzo-2-1-2.onrender.com/admin"
            target="_blank"
            rel="noreferrer"
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3 shadow-sm"
          >
            <span>Django Admin ↗</span>
          </a>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchLeaderData(true)}
            className="btn-primary text-xs py-1 px-3 shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="card p-4 sm:p-5 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800 shadow-craft rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Registered Users
          </span>
          <p className="text-3xl sm:text-4xl font-display font-extrabold text-blue-600 dark:text-blue-400 mt-2">
            {stats?.total_users ?? allUsersList.length}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            Accounts In System
          </p>
        </div>

        <div className="card p-4 sm:p-5 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800 shadow-craft rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Mock Interviews
          </span>
          <p className="text-3xl sm:text-4xl font-display font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {stats?.total_interviews || 0}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            Candidate Test Sessions
          </p>
        </div>

        <div className="card p-4 sm:p-5 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800 shadow-craft rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Resumes Analyzed
          </span>
          <p className="text-3xl sm:text-4xl font-display font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
            {stats?.total_resumes || 0}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            ATS AI Scans Completed
          </p>
        </div>

        <div className="card p-4 sm:p-5 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800 shadow-craft rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Video & Audio Vault
          </span>
          <p className="text-3xl sm:text-4xl font-display font-extrabold text-purple-600 dark:text-purple-400 mt-2">
            {recordings.length}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            Clips Stored Locally
          </p>
        </div>
      </div>

      {/* Candidates Directory */}
      <div className="card p-4 sm:p-6 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800 shadow-craft rounded-2xl mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                All Registered Candidates & User Roster
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                {filteredUsers.length} of {allUsersList.length} Users
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click on any candidate to inspect their full profile, interviews, resumes, scores, and recordings.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <div className="flex gap-1 bg-slate-100 dark:bg-[#131E38] p-1 rounded-xl">
              {[
                { id: 'all', label: 'All' },
                { id: 'interviewed', label: 'Interviewed' },
                { id: 'resumes', label: 'Resumes' },
                { id: 'leaders', label: 'Leaders' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setRoleFilter(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    roleFilter === t.id
                      ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:w-60">
              <input
                type="text"
                placeholder="Search by name, email, role, college..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field py-1.5 px-3 text-xs w-full"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-mono text-[10px] uppercase font-bold text-slate-400">Sort:</span>
              <select
                value={userSort}
                onChange={(e) => setUserSort(e.target.value)}
                className="input-field py-1 px-2 text-xs rounded-lg cursor-pointer bg-white dark:bg-[#131E38] border-slate-200 dark:border-slate-800"
              >
                <option value="latest">Newest Registered</option>
                <option value="interviews">Most Interviews</option>
                <option value="score">Highest Score</option>
                <option value="alpha">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Candidate Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-800 text-slate-400 font-mono font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Candidate</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Target Role</th>
                <th className="py-2.5 px-3 text-center">Interviews</th>
                <th className="py-2.5 px-3 text-center">Resumes / ATS</th>
                <th className="py-2.5 px-3">Joined Date</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400 text-xs">
                    No registered candidates match your search or filter.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((u, idx) => (
                  <tr
                    key={u.id}
                    onClick={() => {
                      setSelectedCandidate(u)
                      setCandidateTab('interviews')
                    }}
                    className="hover:bg-blue-50/40 dark:hover:bg-[#131E38]/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>

                    {/* Candidate & Role badge */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {u.username[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                              {u.username}
                            </span>
                            {u.is_leader && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                LEADER
                              </span>
                            )}
                          </div>
                          {u.college_or_company && u.college_or_company !== '—' && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[140px] block">
                              {u.college_or_company}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                      {u.email}
                    </td>

                    {/* Target Role */}
                    <td className="py-3 px-3">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {u.target_role || 'Candidate'}
                      </span>
                    </td>

                    {/* Interview Stats */}
                    <td className="py-3 px-3 text-center">
                      {u.total_interviews > 0 ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {u.total_interviews} session{u.total_interviews > 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Avg: {u.avg_score}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">0</span>
                      )}
                    </td>

                    {/* Resume Stats */}
                    <td className="py-3 px-3 text-center">
                      {u.total_resumes > 0 ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {u.total_resumes} file{u.total_resumes > 1 ? 's' : ''}
                          </span>
                          {u.latest_ats_score !== null && (
                            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ATS: {u.latest_ats_score}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                      {u.date_joined}
                    </td>

                    {/* Inspect Button */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedCandidate(u)
                          setCandidateTab('interviews')
                        }}
                        className="btn-secondary py-1 px-2.5 text-[11px] font-bold rounded-lg inline-flex items-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                      >
                        <span>Inspect</span>
                        <span>👁️</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Candidate Deep-Dive Modal (Sab Data View) ─── */}
      {selectedCandidate && (
        <div
          className="fixed inset-0 bg-slate-900/80 dark:bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5"
          onClick={() => setSelectedCandidate(null)}
        >
          <div
            className="bg-white dark:bg-[#0D1527] rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-extrabold text-lg flex items-center justify-center shrink-0 shadow-xs">
                  {selectedCandidate.username[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-extrabold text-slate-900 dark:text-white text-lg">
                      {selectedCandidate.username}
                    </h3>
                    {selectedCandidate.is_leader && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        PROJECT LEADER
                      </span>
                    )}
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      ID: #{selectedCandidate.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {selectedCandidate.email}
                    {selectedCandidate.phone && selectedCandidate.phone !== '—' && (
                      <span> · 📞 {selectedCandidate.phone}</span>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#131E38] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics of Candidate */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 shrink-0">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#131E38]/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  Interviews
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedCandidate.total_interviews || 0}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  {selectedCandidate.completed_interviews || 0} finished
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#131E38]/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  Average Score
                </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedCandidate.avg_score}%
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  Best: {selectedCandidate.best_score}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#131E38]/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  Resumes
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {selectedCandidate.total_resumes || 0}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  ATS: {selectedCandidate.latest_ats_score !== null ? `${selectedCandidate.latest_ats_score}%` : 'N/A'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#131E38]/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                  Practice Streak
                </span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {selectedCandidate.current_streak} days
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  Longest: {selectedCandidate.longest_streak || 0}
                </span>
              </div>
            </div>

            {/* Candidate Navigation Tabs */}
            <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3 shrink-0">
              {[
                { id: 'interviews', label: `Interviews (${selectedCandidate.sessions?.length || 0})` },
                { id: 'resumes', label: `Resumes (${selectedCandidate.resumes?.length || 0})` },
                { id: 'recordings', label: `Recordings (${candidateRecordings.length})` },
                { id: 'info', label: 'Profile Details' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCandidateTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    candidateTab === tab.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-[#131E38] text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body / Tab Content */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-3">
              {/* Tab 1: Interviews */}
              {candidateTab === 'interviews' && (
                <div>
                  {!selectedCandidate.sessions?.length ? (
                    <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 dark:bg-[#080D1A] rounded-xl border border-slate-100 dark:border-slate-800">
                      No interview sessions recorded for this candidate yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedCandidate.sessions.map((s) => (
                        <div
                          key={s.id}
                          className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#131E38]/50 text-xs"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {s.role}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {s.difficulty}
                                </span>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                  s.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                                }`}>
                                  {s.status}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono block mt-1">
                                Session ID #{s.id} · Started {s.started_at}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 text-xs">
                                Score: {s.score}/100
                              </span>
                              <Link
                                to={`/interview/report/${s.id}`}
                                target="_blank"
                                className="btn-primary py-1 px-2.5 text-xs inline-flex items-center gap-1 shadow-2xs"
                              >
                                <span>Report</span>
                                <span>↗</span>
                              </Link>
                            </div>
                          </div>

                          {/* Candidate Questions & Answers Transcript */}
                          {s.questions?.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 space-y-2">
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">
                                📝 Interview Q&A Transcript:
                              </span>
                              {s.questions.map((q) => {
                                const ans = q.answer
                                const vid = ans?.video_url || ans?.audio_url
                                return (
                                  <div key={q.id} className="p-2 rounded-lg bg-white dark:bg-[#0D1527] border border-slate-200/60 dark:border-slate-800">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-slate-900 dark:text-white font-semibold text-[11px] leading-tight">
                                        <span className="text-blue-600 font-bold mr-1">Q{q.order}.</span>
                                        {q.question_text}
                                      </p>
                                      {ans?.overall_score !== undefined && ans?.overall_score !== null && (
                                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 shrink-0">
                                          Score: {ans.overall_score}
                                        </span>
                                      )}
                                    </div>
                                    {ans?.answer_text ? (
                                      <p className="text-slate-600 dark:text-slate-300 text-[10px] mt-1 pl-2.5 border-l-2 border-blue-400 dark:border-blue-600 italic">
                                        "{ans.answer_text}"
                                      </p>
                                    ) : (
                                      <p className="text-slate-400 text-[10px] mt-0.5 italic">No answer submitted.</p>
                                    )}
                                    {vid && (
                                      <div className="mt-1.5 flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setActivePlayback({
                                            id: `q_${q.id}`,
                                            jobRole: s.role,
                                            questionNumber: q.order,
                                            questionText: q.question_text,
                                            mode: ans?.video_url ? 'video' : 'audio',
                                            url: vid,
                                            durationSeconds: ans?.speaking_time_seconds,
                                            userEmail: selectedCandidate.email,
                                          })}
                                          className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                          <span>▶ Watch Cloud Clip ({ans?.speaking_time_seconds || 0}s)</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Resumes */}
              {candidateTab === 'resumes' && (
                <div>
                  {!selectedCandidate.resumes?.length ? (
                    <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 dark:bg-[#080D1A] rounded-xl border border-slate-100 dark:border-slate-800">
                      No resume files uploaded by this candidate yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedCandidate.resumes.map((r) => (
                        <div
                          key={r.id}
                          className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#131E38]/50 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="text-base">📄</span>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {r.filename}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Uploaded {r.uploaded_at}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {r.is_analyzed ? (
                                <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                                  r.ats_score >= 80
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                                }`}>
                                  ATS Score: {r.ats_score}%
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600">
                                  Pending Analysis
                                </span>
                              )}

                              {r.url && (
                                <a
                                  href={r.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1"
                                >
                                  <span>View File</span>
                                  <span>↗</span>
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Extracted Skills */}
                          {r.extracted_skills?.length > 0 && (
                            <div className="mb-2">
                              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">
                                Extracted Skills:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {r.extracted_skills.map((sk, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                                  >
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Missing Keywords */}
                          {r.missing_keywords?.length > 0 && (
                            <div>
                              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block mb-1">
                                Missing Keywords:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {r.missing_keywords.map((kw, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Recordings */}
              {candidateTab === 'recordings' && (
                <div>
                  {!candidateRecordings.length ? (
                    <div className="text-center py-8 px-4 text-xs bg-slate-50 dark:bg-[#080D1A] rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="text-3xl mb-1">🔒</div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        No Cloud Recordings Uploaded
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                        The candidate's video/audio was recorded locally on their system in ultra-low storage. Clips appear here only when the candidate clicks <strong>"Upload to Cloud ☁️"</strong>. All signup details and written question responses are preserved and visible under the <strong>Interviews</strong> tab.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {candidateRecordings.map((rec) => {
                        const blobUrl = rec.blob ? URL.createObjectURL(rec.blob) : (rec.url || null)
                        return (
                          <div
                            key={rec.id}
                            className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#131E38]/50 text-xs flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  Q{rec.questionNumber} ({rec.mode})
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {rec.durationSeconds}s
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mb-2">
                                {rec.questionText}
                              </p>
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                              <button
                                onClick={() => setActivePlayback({ ...rec, blobUrl })}
                                className="btn-primary py-1 px-3 text-xs flex-1 text-center"
                              >
                                Play ▶
                              </button>
                              <button
                                onClick={(e) => handleDownloadRec(rec, e)}
                                className="btn-secondary py-1 px-2.5 text-xs"
                                title="Download"
                              >
                                📥
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Info */}
              {candidateTab === 'info' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#131E38]/50 border border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                        Target Career Role
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedCandidate.target_role || 'Candidate'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                        College / Organization
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedCandidate.college_or_company || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                        Phone Number
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedCandidate.phone || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                        Account Created
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedCandidate.date_joined || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                        Last Active Date
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedCandidate.last_active_date || '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                        Last Login Timestamp
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {selectedCandidate.last_login || '—'}
                      </span>
                    </div>
                  </div>

                  {selectedCandidate.bio && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold mb-1">
                        Bio / Notes
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {selectedCandidate.bio}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="btn-secondary py-1.5 px-4 text-xs font-bold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Video & Audio Recordings Vault */}
      <div className="card p-4 sm:p-6 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800 shadow-craft rounded-2xl mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Candidate Video & Audio Recordings Vault
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                {recordings.length} Clips
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Play and review candidate answer clips. Practice answers on this device are stored in high-performance local vault.
            </p>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'all', label: `All (${recordings.length})` },
              { id: 'video', label: '📹 Video' },
              { id: 'audio', label: '🎙️ Audio' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRecFilter(tab.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  recFilter === tab.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white dark:bg-[#131E38] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loadingRecs ? (
          <Loader label="Loading candidate recordings..." />
        ) : recordings.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-[#080D1A] rounded-xl border border-slate-200/60 dark:border-slate-800/80">
            <span className="text-3xl block mb-2">📼</span>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              No Video Recordings Found in Local Storage
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Recordings take place in browser-safe client storage. Full question-by-question candidate answers, scores, and evaluations across all devices (including mobile phones) are tracked in the <strong>Recent Mock Interview Activity</strong> below.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {recordings
              .filter((r) => recFilter === 'all' || r.mode === recFilter)
              .map((rec) => {
                const blobUrl = rec.blob ? URL.createObjectURL(rec.blob) : (rec.url || null)
                const dateStr = new Date(rec.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })

                return (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0A0F1D] flex flex-col justify-between hover:border-blue-400/60 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                        <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[190px] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          <span className="truncate">{rec.userEmail || (rec.userId ? `User #${rec.userId}` : 'Candidate')}</span>
                        </span>
                        {rec.sessionId && rec.sessionId !== 'practice' && (
                          <Link
                            to={`/interview/report/${rec.sessionId}`}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold text-[10px] hover:underline shrink-0"
                          >
                            Report ↗
                          </Link>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {rec.jobRole}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider shrink-0 ${
                            rec.mode === 'video'
                              ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                              : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                          }`}
                        >
                          {rec.mode === 'video' ? '📹 Video' : '🎙️ Audio'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium line-clamp-2 mb-2.5 leading-snug">
                        <strong className="text-blue-600 dark:text-blue-400 mr-1">Q{rec.questionNumber}:</strong>
                        {rec.questionText || 'Practice Answer Clip'}
                      </p>

                      <div className="w-full h-28 bg-slate-900 dark:bg-black rounded-lg overflow-hidden mb-2.5 relative flex items-center justify-center group/preview">
                        {rec.mode === 'video' && blobUrl ? (
                          <video src={blobUrl} className="w-full h-full object-cover" preload="metadata" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-1 text-center">
                            <span className="text-2xl">🎙️</span>
                            <span className="text-[10px] font-bold">Audio Clip</span>
                          </div>
                        )}

                        <button
                          onClick={() => setActivePlayback({ ...rec, blobUrl })}
                          className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-all cursor-pointer"
                          title="Play Video"
                        >
                          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm shadow-md group-hover/preview:scale-110 transition-transform">
                            ▶
                          </div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono mb-2 bg-slate-50 dark:bg-[#131E38] px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                        <span>💾 {formatBytes(rec.sizeBytes)}</span>
                        <span>⏱️ {rec.durationSeconds || 0}s</span>
                        <span>📅 {dateStr}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setActivePlayback({ ...rec, blobUrl })}
                        className="flex-1 py-1 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-colors text-center cursor-pointer shadow-2xs"
                      >
                        Play ▶
                      </button>
                      <button
                        onClick={(e) => handleDownloadRec(rec, e)}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                        title="Download (.webm)"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleDeleteRec(rec.id, e)}
                        className="p-1 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Delete"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Recent Mock Interviews Activity Feed */}
      {stats?.recent_sessions?.length > 0 && (
        <div className="card p-4 sm:p-6 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800 shadow-craft rounded-2xl mb-6">
          <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-1">
            Recent Mock Interview Activity
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Latest candidate practice sessions and score outputs across the platform.
          </p>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {stats.recent_sessions.map((s) => (
              <div
                key={s.id}
                className="py-3 flex items-center justify-between gap-3 flex-wrap text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {s.candidate} <span className="text-slate-400 font-normal">({s.email})</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {s.role} · {s.difficulty} · {s.date}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                    Score: {s.score}/100
                  </span>
                  <Link
                    to={`/interview/report/${s.id}`}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1 shadow-2xs"
                    title="Inspect full candidate report & answers"
                  >
                    <span>View Report ↗</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Leadership Info */}
      <div className="card p-4 rounded-xl bg-slate-50 dark:bg-[#080D1A] border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-bold text-slate-700 dark:text-slate-300">
            Skillzo Project Leadership · © 2026
          </p>
          <p className="text-[11px] mt-0.5">
            Led by <strong>Abhishek Kushwaha</strong> (Project Leader)
          </p>
        </div>
        <div className="font-mono text-[11px] text-blue-500">
          Superuser Clearance: Active
        </div>
      </div>

      {/* Video Playback Modal */}
      {activePlayback && (
        <div
          className="fixed inset-0 bg-slate-900/80 dark:bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5"
          onClick={() => setActivePlayback(null)}
        >
          <div
            className="bg-white dark:bg-[#0D1527] rounded-2xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="eyebrow mb-0.5">Candidate Recording Playback</span>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  {activePlayback.jobRole} · Q{activePlayback.questionNumber} ({activePlayback.userEmail || 'Candidate'})
                </h3>
              </div>
              <button
                onClick={() => setActivePlayback(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#131E38] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#131E38] p-2 rounded-xl border border-slate-100 dark:border-slate-800">
              <strong className="text-blue-600 dark:text-blue-400 mr-1">Question:</strong>
              {activePlayback.questionText || 'Practice Answer'}
            </p>

            <div className="w-full bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center shadow-inner">
              {activePlayback.mode === 'video' ? (
                <video src={activePlayback.blobUrl || activePlayback.url} controls autoPlay className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 w-full p-4 text-center">
                  <span className="text-3xl">🎙️</span>
                  <audio src={activePlayback.blobUrl || activePlayback.url} controls autoPlay className="w-full max-w-sm" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>Size: {formatBytes(activePlayback.sizeBytes)} · Duration: {activePlayback.durationSeconds}s</span>
              <div className="flex gap-2">
                <button
                  onClick={(e) => handleDownloadRec(activePlayback, e)}
                  className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 cursor-pointer"
                >
                  Download 📥
                </button>
                <button
                  onClick={() => setActivePlayback(null)}
                  className="btn-primary py-1 px-3 text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

export default LeaderPortal
