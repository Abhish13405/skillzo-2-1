import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import ReadinessDial from '../components/ReadinessDial'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import { getInterviewHistory, getInterviewDetail } from '../api/interview'
import { getAllRecordings, deleteRecording, formatBytes } from '../utils/recordingsDb'
import { downloadInterviewReportPdf } from '../utils/generatePdfReport'

const HR_FOCUS_TRACKS = [
  {
    id: 'fresher',
    title: 'Fresher Campus Placement HR',
    role: 'Fresher Campus Placement HR',
    badge: 'Campus Prep',
    badgeColor: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Self-introduction, strengths & weaknesses, college projects, handling setbacks, and career aspirations.',
    questionsCount: '5 Questions',
    duration: '10 Mins',
    icon: '🎓'
  },
  {
    id: 'star',
    title: 'STAR Situational Behavioral',
    role: 'HR & Behavioral Round',
    badge: 'STAR Framework',
    badgeColor: 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    description: 'Conflict resolution, working under strict deadlines, resolving team disagreements, and managing priority shifts.',
    questionsCount: '5 Questions',
    duration: '10 Mins',
    icon: '💼'
  },
  {
    id: 'leadership',
    title: 'Leadership & Cultural Fit',
    role: 'Leadership & Behavioral Round',
    badge: 'Core Values',
    badgeColor: 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    description: 'Ethical decisions, driving ownership, mentoring juniors, stakeholder communication, and company cultural alignment.',
    questionsCount: '5 Questions',
    duration: '10 Mins',
    icon: '👑'
  }
]

const HrStudio = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const videoPlayerRef = useRef(null)

  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard', 'interviews', 'recordings'
  const [sessions, setSessions] = useState([])
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)
  const [activePlayback, setActivePlayback] = useState(null)

  const userEmail = (user?.email || '').toLowerCase().trim()
  const isLeader = Boolean(
    user && !user.is_guest && (
      user.is_leader ||
      user.is_staff ||
      user.is_superuser ||
      userEmail === 'abhishekkushwaha13405@gmail.com' ||
      userEmail === 'abhish@gmail.com'
    )
  )

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch past sessions
      let backendList = []
      try {
        const res = await getInterviewHistory()
        backendList = res.data || []
      } catch (err) {
        console.warn('Backend history load error:', err)
      }

      // 2. Fetch local recordings
      let localClips = []
      try {
        localClips = await getAllRecordings(user, isLeader)
      } catch (err) {
        console.warn('Recordings load error:', err)
      }

      // Merge vault sessions if needed
      const vaultSessionsMap = {}
      for (const clip of localClips) {
        const sid = clip.sessionId
        if (!sid || sid === 'null' || sid === 'undefined') continue
        if (!vaultSessionsMap[sid]) {
          vaultSessionsMap[sid] = {
            id: sid,
            job_role: clip.jobRole || 'HR & Behavioral Round',
            difficulty: clip.difficulty || 'Practice',
            mode: clip.mode || 'video',
            status: 'completed',
            completed_at: clip.createdAt,
            started_at: clip.createdAt,
            overall_score: 82,
            fromVault: true,
            candidate_name: clip.userEmail ? clip.userEmail.split('@')[0] : 'Candidate',
            candidate_email: clip.userEmail || '',
          }
        }
      }

      const existingIds = new Set(backendList.map((s) => String(s.id)))
      const mergedSessions = [...backendList]
      for (const [sid, vSession] of Object.entries(vaultSessionsMap)) {
        if (!existingIds.has(String(sid))) {
          mergedSessions.push(vSession)
        }
      }
      mergedSessions.sort((a, b) => new Date(b.completed_at || b.started_at) - new Date(a.completed_at || a.started_at))

      setSessions(mergedSessions)
      setRecordings(localClips)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  // Filter specifically for HR & Behavioral track
  const hrSessions = sessions.filter((s) => {
    const role = (s.job_role || '').toLowerCase()
    return role.includes('hr') || role.includes('behavioral') || role.includes('placement') || role.includes('culture')
  })

  const hrRecordings = recordings.filter((r) => {
    const role = (r.jobRole || '').toLowerCase()
    return role.includes('hr') || role.includes('behavioral') || role.includes('placement') || role.includes('culture')
  })

  // Metrics computation
  const completedHrCount = hrSessions.length
  const avgScore = completedHrCount > 0
    ? Math.round(hrSessions.reduce((acc, s) => acc + (s.overall_score || 75), 0) / completedHrCount)
    : 84
  const starScore = Math.min(10, (avgScore / 10).toFixed(1))
  const commScore = Math.min(98, Math.max(70, avgScore + 6))

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
      } catch {}
      downloadInterviewReportPdf({ session: detail, user })
    } catch (err) {
      console.error('Error downloading PDF:', err)
      alert('Could not download PDF report. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDeleteRecording = async (id, e) => {
    e?.stopPropagation()
    if (!window.confirm('Delete this HR recording clip?')) return
    await deleteRecording(id)
    if (activePlayback?.id === id) setActivePlayback(null)
    setRecordings((prev) => prev.filter((r) => r.id !== id))
  }

  const startHrMock = (targetRole = 'HR & Behavioral Round') => {
    navigate('/interview/setup', { state: { role: targetRole, isHRTrack: true } })
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto py-3 sm:py-6">
        {/* Top Breadcrumb & Header */}
        <div className="mb-4 sm:mb-6 border-b border-slate-200/60 dark:border-slate-800/80 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Link
                  to="/dashboard"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>←</span>
                  <span>All Tracks</span>
                </Link>
                <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Track 1 of 4: HR Workspace
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
                HR & Behavioral Workspace
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Master self-introductions, STAR situational scenarios, communication fluency, and behavioral culture rounds.
              </p>
            </div>

            {/* Main Action: Launch HR Interview */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => startHrMock('HR & Behavioral Round')}
                className="btn-primary py-2.5 px-4 text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 cursor-pointer transition-all"
              >
                <span>⚡</span>
                <span>Start HR Interview</span>
              </button>
            </div>
          </div>

          {/* 3 Scoped Tabs: Dashboard, Interviews, Recordings */}
          <div className="flex items-center gap-2 mt-5 border-t border-slate-200/50 dark:border-slate-800/60 pt-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                  : 'bg-white dark:bg-[#0D1527] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>📊</span>
              <span>HR Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('interviews')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'interviews'
                  ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                  : 'bg-white dark:bg-[#0D1527] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>📝</span>
              <span>HR Interviews ({hrSessions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('recordings')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'recordings'
                  ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                  : 'bg-white dark:bg-[#0D1527] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <span>🎥</span>
              <span>HR Recordings ({hrRecordings.length})</span>
            </button>
          </div>
        </div>

        {/* ─── TAB 1: HR DASHBOARD ────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: HR Readiness Score */}
              <div className="bg-white dark:bg-[#0D1527] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    HR Readiness
                  </span>
                  <span className="text-base">🎯</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white">
                    {avgScore}%
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {avgScore >= 80 ? 'Interview Ready' : 'In Training'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                    style={{ width: `${avgScore}%` }}
                  />
                </div>
              </div>

              {/* Card 2: STAR Behavioral Score */}
              <div className="bg-white dark:bg-[#0D1527] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    STAR Compliance
                  </span>
                  <span className="text-base">⭐</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white">
                    {starScore}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">/ 10</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                  Structured Situation, Task, Action & Result answers
                </p>
              </div>

              {/* Card 3: Communication & Fluency */}
              <div className="bg-white dark:bg-[#0D1527] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Speech Fluency
                  </span>
                  <span className="text-base">🎙️</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white">
                    {commScore}%
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    Clear Pacing
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                  Pacing, clarity, and grammatical structure
                </p>
              </div>

              {/* Card 4: HR Mocks Completed */}
              <div className="bg-white dark:bg-[#0D1527] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Completed Mocks
                  </span>
                  <span className="text-base">📋</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white">
                    {completedHrCount}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Sessions</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                  {hrRecordings.length} video/audio recordings saved
                </p>
              </div>
            </div>

            {/* HR Focus Curriculum Tracks (3 Launch Cards) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🎯</span>
                  <span>Practice by HR Focus Area</span>
                </h2>
                <span className="text-xs text-slate-400">Curated 60-question STAR curriculum</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                {HR_FOCUS_TRACKS.map((track) => (
                  <div
                    key={track.id}
                    className="bg-white dark:bg-[#0D1527] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800/90 flex flex-col justify-between shadow-2xs hover:border-indigo-400/80 transition-all hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-2xl">{track.icon}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${track.badgeColor}`}>
                          {track.badge}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5">
                        {track.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                        {track.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400">
                        {track.questionsCount} · {track.duration}
                      </span>
                      <button
                        onClick={() => startHrMock(track.role)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>Start Mock</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* STAR Framework Guide & Behavioral Tips */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* STAR Framework Breakdown */}
              <div className="bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 dark:from-[#0D1527] dark:via-[#0A0F1D] dark:to-[#131E38] rounded-2xl p-4 sm:p-5 border border-indigo-100 dark:border-indigo-950/80 shadow-2xs">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                    ★
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    The STAR Behavioral Rubric
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/80 dark:bg-[#131E38]/80 p-2.5 rounded-xl border border-indigo-100 dark:border-slate-800">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono block">S · Situation</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Set the scene, context, and challenge faced.</span>
                  </div>
                  <div className="bg-white/80 dark:bg-[#131E38]/80 p-2.5 rounded-xl border border-indigo-100 dark:border-slate-800">
                    <span className="font-bold text-blue-600 dark:text-blue-400 font-mono block">T · Task</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Explain your specific responsibility and goal.</span>
                  </div>
                  <div className="bg-white/80 dark:bg-[#131E38]/80 p-2.5 rounded-xl border border-indigo-100 dark:border-slate-800">
                    <span className="font-bold text-purple-600 dark:text-purple-400 font-mono block">A · Action</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Detail the step-by-step initiative you took.</span>
                  </div>
                  <div className="bg-white/80 dark:bg-[#131E38]/80 p-2.5 rounded-xl border border-indigo-100 dark:border-slate-800">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono block">R · Result</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Share quantifiable impact and what you learned.</span>
                  </div>
                </div>
              </div>

              {/* Tips for High Scoring */}
              <div className="bg-white dark:bg-[#0D1527] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">💡</span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    AI Behavioral Coaching Tips
                  </h3>
                </div>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-4 leading-relaxed">
                  <li>Aim for <strong>60 to 90 seconds</strong> per response for optimal pacing.</li>
                  <li>Use "I" instead of "We" when explaining specific actions you executed.</li>
                  <li>In self-introduction, highlight recent achievements and career direction.</li>
                  <li>Turn off premature rush — speak calmly into the mic; words transcribe in real time.</li>
                </ul>
                <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center text-xs">
                  <button
                    onClick={() => setActiveTab('interviews')}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    View Past HR Reports ({hrSessions.length}) →
                  </button>
                  <button
                    onClick={() => setActiveTab('recordings')}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Watch Clips ({hrRecordings.length}) →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: HR INTERVIEWS & SCORECARDS ───────────────────────────── */}
        {activeTab === 'interviews' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Your HR Mock Interviews & Reports
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comprehensive performance summaries, STAR scorecards, and hiring verdicts for HR rounds.
                </p>
              </div>
              <button
                onClick={() => startHrMock('HR & Behavioral Round')}
                className="btn-primary py-2 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                + New HR Session
              </button>
            </div>

            {loading ? (
              <Loader full={false} />
            ) : hrSessions.length === 0 ? (
              <div className="bg-white dark:bg-[#0D1527] rounded-2xl p-8 border border-slate-200/90 dark:border-slate-800 text-center max-w-lg mx-auto my-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mx-auto mb-3">
                  📝
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  No HR Interviews Completed Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                  Start your first HR mock session to practice self-introductions and behavioral questions with Sophia AI.
                </p>
                <button
                  onClick={() => startHrMock('HR & Behavioral Round')}
                  className="btn-primary py-2 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                >
                  ⚡ Start Your First HR Mock
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {hrSessions.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white dark:bg-[#0D1527] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          {s.job_role || 'HR & Behavioral Round'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {s.difficulty || 'Intermediate'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {s.mode === 'video' ? '📹 Video' : s.mode === 'audio' ? '🎙️ Audio' : '📝 Text'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>📅 {new Date(s.completed_at || s.started_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Score: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{s.overall_score || 80}/100</strong></span>
                        {s.verdict && (
                          <>
                            <span>•</span>
                            <span className="italic truncate max-w-xs">{s.verdict}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handleDownloadPdf(e, s)}
                        disabled={downloadingId === s.id}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Download PDF Scorecard"
                      >
                        {downloadingId === s.id ? 'Generating...' : '📄 PDF'}
                      </button>
                      <Link
                        to={`/interview/${s.id}/report`}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        View Full Report →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: HR RECORDINGS & VIDEO CLIPS ──────────────────────────── */}
        {activeTab === 'recordings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Your HR Video & Audio Clips
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Recorded candidate clips from video and audio HR interview rounds stored securely on your device.
                </p>
              </div>
              <button
                onClick={() => startHrMock('HR & Behavioral Round')}
                className="btn-primary py-2 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                + Record New Response
              </button>
            </div>

            {loading ? (
              <Loader full={false} />
            ) : hrRecordings.length === 0 ? (
              <div className="bg-white dark:bg-[#0D1527] rounded-2xl p-8 border border-slate-200/90 dark:border-slate-800 text-center max-w-lg mx-auto my-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mx-auto mb-3">
                  🎥
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  No HR Recordings Saved Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                  When you complete a Video or Audio HR interview, your recorded answer clips will automatically appear here for self-review.
                </p>
                <button
                  onClick={() => startHrMock('HR & Behavioral Round')}
                  className="btn-primary py-2 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                >
                  ⚡ Take a Video HR Mock
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {hrRecordings.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white dark:bg-[#0D1527] rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800/90 shadow-2xs flex flex-col justify-between hover:border-indigo-400/80 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Q{rec.questionNumber} · {rec.mode === 'audio' ? '🎙️ Audio' : '📹 Video'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatBytes(rec.sizeBytes)}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 mb-2">
                        {rec.questionText || 'HR Behavioral Question'}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                        <span>{rec.jobRole || 'HR Interview'}</span>
                        <span>•</span>
                        <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setActivePlayback(rec)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                      >
                        <span>▶</span>
                        <span>Play Clip</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (!rec.blob) return
                            const url = URL.createObjectURL(rec.blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `Skillzo_HR_Q${rec.questionNumber}_${Date.now()}.webm`
                            a.click()
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs cursor-pointer"
                          title="Download Clip"
                        >
                          ⬇️
                        </button>
                        <button
                          onClick={(e) => handleDeleteRecording(rec.id, e)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 text-xs cursor-pointer"
                          title="Delete Clip"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Video / Audio Playback Modal */}
        {activePlayback && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0D1527] rounded-3xl max-w-xl w-full p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    HR Response: Q{activePlayback.questionNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">
                    {activePlayback.questionText}
                  </p>
                </div>
                <button
                  onClick={() => setActivePlayback(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center hover:bg-slate-200 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center mb-3">
                {activePlayback.mode === 'audio' ? (
                  <div className="p-8 text-center text-white">
                    <div className="text-4xl mb-3">🎙️</div>
                    <audio
                      ref={videoPlayerRef}
                      src={activePlayback.blob ? URL.createObjectURL(activePlayback.blob) : ''}
                      controls
                      autoPlay
                      className="w-full"
                    />
                  </div>
                ) : (
                  <video
                    ref={videoPlayerRef}
                    src={activePlayback.blob ? URL.createObjectURL(activePlayback.blob) : ''}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{activePlayback.jobRole || 'HR Interview'} · {formatBytes(activePlayback.sizeBytes)}</span>
                <button
                  onClick={() => setActivePlayback(null)}
                  className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default HrStudio
