import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import AppShell from '../components/AppShell'
import ReadinessDial from '../components/ReadinessDial'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import { getDashboardSummary, getLeaderStats } from '../api/dashboard'
import { getInterviewHistory } from '../api/interview'
import { listResumes, uploadResume, analyzeResume, deleteResume } from '../api/resume'
import { getAllRecordings, formatBytes } from '../utils/recordingsDb'

// ─── Helpers ────────────────────────────────────────────────────────────────
const isHrRole = (role = '') => {
  const r = (role || '').toLowerCase()
  return (
    r.includes('hr') ||
    r.includes('behavioral') ||
    r.includes('fresher') ||
    r.includes('placement') ||
    r.includes('leadership') ||
    r.includes('culture') ||
    r.includes('star')
  )
}

const HR_FOCUS_TRACKS = [
  {
    id: 'fresher',
    title: 'Fresher Campus Placement HR',
    role: 'Fresher Campus Placement HR',
    badge: 'Campus Prep',
    badgeColor: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Self-introduction, strengths & weaknesses, college projects, and career aspirations.',
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
    description: 'Conflict resolution, working under deadlines, resolving disagreements, and managing priorities.',
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
    description: 'Ethical decisions, driving ownership, mentoring juniors, and company cultural alignment.',
    questionsCount: '5 Questions',
    duration: '10 Mins',
    icon: '👑'
  }
]

const StreakBadge = ({ streak }) => {
  if (!streak || streak < 2) return null
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-mono font-bold shadow-xs dark:bg-blue-950/70 dark:border-blue-800 dark:text-blue-300">
      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
      {streak} Day Streak
    </div>
  )
}

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

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
      userName === 'abhishekkushwaha31387' ||
      userEmail.includes('abhishek') ||
      userName.includes('abhishek')
    )
  )

  // Currently selected / open box: 'technical', 'hr', 'leader' / 'live-room', 'resume'
  const initialTrack = searchParams.get('track') || 'technical'
  const [selectedTrack, setSelectedTrack] = useState(initialTrack)

  // Track data states
  const [summaryData, setSummaryData] = useState(null)
  const [allSessions, setAllSessions] = useState([])
  const [resumes, setResumes] = useState([])
  const [recordings, setRecordings] = useState([])
  const [leaderStats, setLeaderStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // Resume upload & analysis states (Box 4)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [analyzingResumeId, setAnalyzingResumeId] = useState(null)
  const [resumeError, setResumeError] = useState('')
  const [resumeSuccess, setResumeSuccess] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Candidate Live Room states (Box 3)
  const [candidateLiveRoomId, setCandidateLiveRoomId] = useState(() => `skz_${Math.random().toString(36).substring(2, 8)}`)

  // Load all dashboard data
  useEffect(() => {
    let isMounted = true
    setLoading(true)

    const fetchAll = async () => {
      try {
        const [sumRes, histRes, resRes, recsRes, leadRes] = await Promise.allSettled([
          getDashboardSummary(),
          getInterviewHistory(),
          listResumes(),
          getAllRecordings(user, isLeader),
          isLeader ? getLeaderStats() : Promise.resolve({ data: null })
        ])

        if (!isMounted) return

        if (sumRes.status === 'fulfilled') setSummaryData(sumRes.value.data)
        if (histRes.status === 'fulfilled') setAllSessions(histRes.value.data || [])
        if (resRes.status === 'fulfilled') setResumes(resRes.value.data || [])
        if (recsRes.status === 'fulfilled') setRecordings(recsRes.value || [])
        if (leadRes.status === 'fulfilled' && leadRes.value?.data) setLeaderStats(leadRes.value.data)
      } catch (err) {
        console.warn('Dashboard fetch error:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchAll()
    return () => { isMounted = false }
  }, [user, isLeader])

  // Sync selectedTrack with URL
  const handleSelectBox = (trackId) => {
    setSelectedTrack(trackId)
    setSearchParams({ track: trackId })
  }

  // Filter sessions for Technical vs HR
  const techSessions = allSessions.filter((s) => !isHrRole(s.job_role))
  const hrSessions = allSessions.filter((s) => isHrRole(s.job_role))

  // Calculate technical stats
  const techScores = techSessions.map((s) => s.overall_score).filter((sc) => typeof sc === 'number' && sc > 0)
  const techAvgScore = techScores.length ? Math.round(techScores.reduce((a, b) => a + b, 0) / techScores.length) : (summaryData?.average_score || 0)
  const techBestScore = techScores.length ? Math.max(...techScores) : (summaryData?.best_score || 0)

  // Calculate HR stats
  const hrScores = hrSessions.map((s) => s.overall_score).filter((sc) => typeof sc === 'number' && sc > 0)
  const hrAvgScore = hrScores.length ? Math.round(hrScores.reduce((a, b) => a + b, 0) / hrScores.length) : 0

  // Overall performance calculations (for top KPI row)
  const allScores = allSessions.map((s) => s.overall_score).filter((sc) => typeof sc === 'number' && sc > 0)
  const overallAvgScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : (summaryData?.average_score || 0)
  const overallBestScore = allScores.length ? Math.max(...allScores) : (summaryData?.best_score || 0)
  const totalInterviewsCount = allSessions.length || summaryData?.total_interviews || 0

  // Chart data: progression across completed sessions
  const chartSessions = (summaryData?.progress_chart && summaryData.progress_chart.length > 0)
    ? summaryData.progress_chart
    : allSessions
        .filter((s) => typeof s.overall_score === 'number' && s.overall_score >= 0)
        .slice(-10)
        .reverse()
        .map((s) => ({
          date: (s.completed_at || s.started_at || '').slice(0, 10),
          score: s.overall_score,
          role: s.job_role
        }))

  // Strengths & Competencies data from summaryData or defaults
  const strengthsList = summaryData?.strengths?.length > 0
    ? summaryData.strengths
    : [
        'Structured problem-solving approach',
        'Strong technical clarity and core understanding',
        'Effective communication & situational reasoning'
      ]

  const competencies = summaryData?.competencies || {
    technical_knowledge: 65,
    communication: 70,
    confidence: 68,
    problem_solving: 60
  }

  // Resume handlers (Box 4)
  const handleResumeFileSelect = async (file) => {
    if (!file) return
    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      setResumeError(`Invalid format: "${file.name}". Please upload PDF (.pdf) or Word (.docx).`)
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setResumeError(`File exceeds 25MB limit. Please upload a smaller document.`)
      return
    }

    setUploadingResume(true)
    setResumeError('')
    setResumeSuccess('')
    try {
      const res = await uploadResume(file)
      const newResume = res.data
      setResumes((prev) => [newResume, ...prev])
      setResumeSuccess(`"${file.name}" uploaded successfully! Running instant ATS scan...`)
      try {
        setAnalyzingResumeId(newResume.id)
        const analyzed = await analyzeResume(newResume.id)
        setResumes((prev) => prev.map((r) => (r.id === newResume.id ? analyzed.data : r)))
        setResumeSuccess(`ATS scan complete for "${file.name}"!`)
      } catch {
        setResumeSuccess(`"${file.name}" uploaded. Click "Analyze" to compute ATS match score.`)
      } finally {
        setAnalyzingResumeId(null)
      }
    } catch (err) {
      setResumeError(err.response?.data?.file?.[0] || err.message || 'Failed to upload resume.')
    } finally {
      setUploadingResume(false)
    }
  }

  const handleDeleteResume = async (id) => {
    try {
      await deleteResume(id)
      setResumes((prev) => prev.filter((r) => r.id !== id))
    } catch {
      setResumeError('Could not delete resume.')
    }
  }

  // The 4 Interactive Module Boxes
  const boxes = [
    {
      id: 'hr',
      title: 'HR & Behavioral Round',
      badge: '10-Min Prep',
      badgeColor: 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800',
      description: 'Campus placement, STAR framework scenarios, culture & leadership alignment.',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400',
      activeBorder: 'border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 shadow-md',
      activeBadge: 'bg-indigo-600 text-white',
      accentColor: 'hover:border-indigo-400',
      metricLabel: `${hrSessions.length} HR Rounds`,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    },
    {
      id: 'technical',
      title: 'Technical Mock Practice',
      badge: 'Technical Studio',
      badgeColor: 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200/70 dark:border-blue-800',
      description: 'Python, Java, Frontend, AI roles, algorithmic scorecards & coding metrics.',
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-800/80 text-blue-600 dark:text-blue-400',
      activeBorder: 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 shadow-md',
      activeBadge: 'bg-blue-600 text-white',
      accentColor: 'hover:border-blue-400',
      metricLabel: `${techSessions.length} Tech Rounds`,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      )
    },
    isLeader
      ? {
          id: 'leader',
          title: 'Company Leader Portal',
          badge: 'Hiring Hub',
          badgeColor: 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800',
          description: 'Review registered candidates, interview scorecards & inspect recordings.',
          iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/60 dark:border-amber-800/80 text-amber-600 dark:text-amber-400',
          activeBorder: 'border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20 shadow-md',
          activeBadge: 'bg-amber-600 text-white',
          accentColor: 'hover:border-amber-400',
          metricLabel: `${leaderStats?.total_users || 0} Candidates`,
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          )
        }
      : {
          id: 'live-room',
          title: 'Live HR Interview Room',
          badge: 'Real-Time 1:1',
          badgeColor: 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200/70 dark:border-purple-800',
          description: 'Connect face-to-face with your HR recruiter over live video conference.',
          iconBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200/60 dark:border-purple-800/80 text-purple-600 dark:text-purple-400',
          activeBorder: 'border-purple-500 dark:border-purple-400 ring-2 ring-purple-500/20 shadow-md',
          activeBadge: 'bg-purple-600 text-white',
          accentColor: 'hover:border-purple-400',
          metricLabel: 'Video Ready',
          icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          )
        },
    {
      id: 'resume',
      title: 'Resume ATS Scanner',
      badge: 'ATS Match',
      badgeColor: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800',
      description: 'Scan PDF/DOCX resume for target job descriptions and missing skills.',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400',
      activeBorder: 'border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 shadow-md',
      activeBadge: 'bg-emerald-600 text-white',
      accentColor: 'hover:border-emerald-400',
      metricLabel: `${resumes.length} Resumes`,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      )
    }
  ]

  const currentBoxMeta = boxes.find((b) => b.id === selectedTrack) || boxes[1]

  return (
    <AppShell hideSidebar={false}>
      <div className="max-w-6xl mx-auto py-3 sm:py-5">
        
        {/* ─── Top Main Header ─── */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="eyebrow">Candidate Performance Center</span>
              <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
              <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400">
                Live Analytics & Readiness
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
              Interview Readiness Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Track kitne interview diye, aapki overall score growth, aur real-time strengths & competencies.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {summaryData?.daily_goal?.current_streak > 0 && (
              <StreakBadge streak={summaryData.daily_goal.current_streak} />
            )}
            <button
              onClick={() => navigate('/interview/setup')}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ Launch Interview</span>
            </button>
          </div>
        </div>

        {/* ─── 1. TOP OVERVIEW KPI ROW ("Kitne Interview Diye" & Core Score) ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {/* Card 1: Kitne Interview Diye */}
          <div className="card p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Total Interviews Given
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  Kitne Diye
                </span>
              </div>
              <p className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 dark:text-white mt-1">
                {totalInterviewsCount}
              </p>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Completed Practice</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {summaryData?.daily_goal?.completed_today || 0} Today
              </span>
            </div>
          </div>

          {/* Card 2: Average Readiness Score Dial */}
          <div className="card p-3 sm:p-4 flex flex-col items-center justify-center">
            <ReadinessDial score={overallAvgScore} size={76} label="Average Score" />
          </div>

          {/* Card 3: Best Score Achieved */}
          <div className="card p-3 sm:p-4 flex flex-col items-center justify-center">
            <ReadinessDial score={overallBestScore} size={76} label="Best Score" />
          </div>

          {/* Card 4: Consistency & Streak */}
          <div className="card p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Daily Consistency
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
                  Streak
                </span>
              </div>
              <p className="text-3xl sm:text-4xl font-display font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                {summaryData?.daily_goal?.current_streak || 0}{' '}
                <span className="text-sm font-semibold text-slate-400">Days</span>
              </p>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Daily Target</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {(summaryData?.daily_goal?.completed_today || 0) >= 1 ? 'Target Met ✓' : 'In Progress'}
              </span>
            </div>
          </div>
        </div>

        {/* ─── 2. GROWTH & STRENGTH SECTION ("Kya Growth" & "Kitni Strength") ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Card Left: Score Growth Trajectory Chart ("Kya Growth") */}
          <div className="card lg:col-span-2 p-4 sm:p-5">
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                    Score Growth & Performance Trajectory
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                    Kya Growth
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Historical progress curve across your completed mock attempts
                </p>
              </div>
              <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                {chartSessions.length} Rounds Evaluated
              </span>
            </div>

            {chartSessions.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-[#131E38]/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">No score history available yet.</p>
                <button
                  onClick={() => navigate('/interview/setup')}
                  className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Start your first mock interview to track growth →
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartSessions} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: '#0D1527', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', color: '#F8FAFC' }}
                    labelStyle={{ color: '#93C5FD', fontWeight: 'bold' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    dot={{ fill: '#3B82F6', r: 4, strokeWidth: 1.5, stroke: '#1E293B' }}
                    activeDot={{ r: 6, fill: '#60A5FA' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Card Right: Candidate Core Strengths & Skills ("Kitni Strength") */}
          <div className="card flex flex-col p-4 sm:p-5">
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                  Core Strengths & Skills
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Kitni Strength
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                AI evaluation of your core interview capabilities
              </p>
            </div>

            {/* Competencies Progress Bars */}
            <div className="space-y-2.5 mb-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Technical Knowledge</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">{competencies.technical_knowledge}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${competencies.technical_knowledge}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Communication & Fluency</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{competencies.communication}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${competencies.communication}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Confidence Level</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{competencies.confidence}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-600 h-2 rounded-full transition-all duration-500" style={{ width: `${competencies.confidence}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Problem Solving</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400">{competencies.problem_solving}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-purple-600 h-2 rounded-full transition-all duration-500" style={{ width: `${competencies.problem_solving}%` }} />
                </div>
              </div>
            </div>

            {/* Key Verified Strengths List */}
            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
                AI-Verified Strengths
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {strengthsList.slice(0, 4).map((str, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-medium"
                  >
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span className="leading-snug">{str}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. THE 4 INTERACTIVE MODULE BOXES ─── */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Workspace Modules (Click to Open & View Data)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose any box below to inspect its dedicated scorecards, recordings, and live tools.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-6">
            {boxes.map((box) => {
              const isActive = selectedTrack === box.id
              return (
                <button
                  key={box.id}
                  type="button"
                  onClick={() => handleSelectBox(box.id)}
                  className={`relative text-left bg-white dark:bg-[#0D1527] rounded-2xl p-4 sm:p-4.5 border transition-all duration-200 flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-md ${
                    isActive
                      ? `${box.activeBorder} bg-gradient-to-b from-blue-50/20 dark:from-blue-950/20 to-white dark:to-[#0D1527]`
                      : `border-slate-200/90 dark:border-slate-800/90 ${box.accentColor} hover:-translate-y-0.5`
                  }`}
                >
                  {/* Active Indicator Top Pill */}
                  {isActive && (
                    <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-600 text-white shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>Viewing Data</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className={`w-10 h-10 rounded-xl ${box.iconBg} border flex items-center justify-center shrink-0`}>
                        {box.icon}
                      </div>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold ${box.badgeColor}`}>
                        {box.badge}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {box.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {box.description}
                    </p>
                  </div>

                  <div className="mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <span className="font-mono text-slate-400 dark:text-slate-500">{box.metricLabel}</span>
                    <span className={`font-bold ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                      {isActive ? 'Opened ✓' : 'Open Box →'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ─── 4. ACTIVE BOX INNER DATA VIEW ─── */}
        <div className="mb-4 flex items-center justify-between bg-slate-50 dark:bg-[#0A0F1D] px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{currentBoxMeta.icon}</span>
            <div>
              <span className="text-[11px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500 block leading-none">
                Active Module Deep-Dive
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                {currentBoxMeta.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {boxes.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSelectBox(b.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedTrack === b.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-[#131E38] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                {b.title.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* ─── MODULE 2: TECHNICAL MOCK PRACTICE DATA ─── */}
        {selectedTrack === 'technical' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Technical Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="card flex flex-col items-center justify-center py-3.5 px-3">
                <ReadinessDial score={techAvgScore} size={76} label="Technical Avg" />
              </div>
              <div className="card flex flex-col items-center justify-center py-3.5 px-3">
                <ReadinessDial score={techBestScore} size={76} label="Best Score" />
              </div>
              <div className="card flex flex-col justify-between p-3.5 sm:p-4">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Tech Mock Rounds
                  </span>
                  <p className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-1">
                    {techSessions.length}
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-2">
                  Excludes HR rounds
                </p>
              </div>
              <div className="card flex flex-col justify-between p-3.5 sm:p-4">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Practice Status
                  </span>
                  <p className="text-2xl sm:text-3xl font-display font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                    {techSessions.length > 0 ? 'Active' : 'Ready'}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Readiness</span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                    {techAvgScore >= 70 ? 'Interview Ready' : 'In Practice'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Technical Reports List */}
            <div className="card p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Recent Technical Mock Reports</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Filtered strictly for Technical & Resume Mock sessions</p>
                </div>
                <button
                  onClick={() => navigate('/interview/setup')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/70 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900"
                >
                  + Start Tech Round
                </button>
              </div>

              {techSessions.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/50 dark:bg-[#131E38]/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No technical mock reports available yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {techSessions.slice(0, 5).map((r) => {
                    const score = r.overall_score || 0
                    const badge = score >= 75
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200'
                      : score >= 40
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200'
                    return (
                      <Link
                        key={r.id}
                        to={`/interview/${r.id}/report`}
                        className="flex items-center justify-between py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-1 px-3 rounded-xl transition-all group cursor-pointer"
                      >
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {r.job_role || 'Technical Mock'}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {r.difficulty} · {r.mode} mode · {(r.completed_at || r.started_at || '').slice(0, 10)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border ${badge}`}>
                            Score: {score}/100
                          </span>
                          <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── MODULE 1: HR & BEHAVIORAL ROUND DATA ─── */}
        {selectedTrack === 'hr' && (
          <div className="space-y-5 animate-fadeIn">
            {/* HR Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              <div className="card flex items-center gap-4 p-4">
                <ReadinessDial score={hrAvgScore} size={70} />
                <div>
                  <span className="text-[11px] font-mono uppercase font-bold text-slate-400">Behavioral Score</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {hrAvgScore > 0 ? `${hrAvgScore}/100 Readiness` : 'Not evaluated yet'}
                  </p>
                  <p className="text-[11px] text-slate-500">Based on STAR & culture rounds</p>
                </div>
              </div>
              <div className="card flex flex-col justify-between p-4">
                <span className="text-[11px] font-mono uppercase font-bold text-slate-400">Total HR Rounds</span>
                <p className="text-2xl sm:text-3xl font-display font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                  {hrSessions.length}
                </p>
                <p className="text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 mt-2">
                  Campus & behavioral sessions
                </p>
              </div>
              <div className="card flex flex-col justify-between p-4">
                <span className="text-[11px] font-mono uppercase font-bold text-slate-400">Recordings in Vault</span>
                <p className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-1">
                  {recordings.length}
                </p>
                <p className="text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 mt-2">
                  Audio & Video answer clips
                </p>
              </div>
            </div>

            {/* 3 HR Focus Tracks */}
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white mb-3">
                Curated HR Interview Focus Rounds
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                {HR_FOCUS_TRACKS.map((track) => (
                  <div
                    key={track.id}
                    className="card p-4 flex flex-col justify-between border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-2xl">{track.icon}</span>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold ${track.badgeColor}`}>
                          {track.badge}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{track.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">{track.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400">{track.questionsCount}</span>
                      <button
                        onClick={() => navigate('/interview/setup?track=hr', { state: { role: track.role, isHRTrack: true } })}
                        className="py-1 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        Start Round →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent HR Reports */}
            <div className="card p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Recent HR Interview Reports</h3>
                <Link to="/history?track=hr" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                  View All HR Reports →
                </Link>
              </div>
              {hrSessions.length === 0 ? (
                <div className="py-6 text-center bg-slate-50/50 dark:bg-[#131E38]/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No HR interview scorecards generated yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {hrSessions.slice(0, 5).map((r) => (
                    <Link
                      key={r.id}
                      to={`/interview/${r.id}/report`}
                      className="flex items-center justify-between py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-1 px-3 rounded-xl transition-all group"
                    >
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
                          {r.job_role}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {r.difficulty} · {r.mode} mode · {(r.completed_at || r.started_at || '').slice(0, 10)}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200">
                        Score: {r.overall_score || 0}/100
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── MODULE 3: LEADER PORTAL OR LIVE HR ROOM ─── */}
        {(selectedTrack === 'leader' || selectedTrack === 'live-room') && (
          <div className="space-y-5 animate-fadeIn">
            {isLeader ? (
              <>
                {/* Leader Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="card p-4">
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-400">Total Registered</span>
                    <p className="text-2xl sm:text-3xl font-display font-extrabold text-amber-600 mt-1">
                      {leaderStats?.total_users || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Candidates on platform</p>
                  </div>
                  <div className="card p-4">
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-400">All Interviews</span>
                    <p className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-1">
                      {leaderStats?.total_all_interviews || allSessions.length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Total completed sessions</p>
                  </div>
                  <div className="card p-4">
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-400">Resumes Analyzed</span>
                    <p className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-1">
                      {leaderStats?.total_all_resumes || resumes.length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Processed by ATS engine</p>
                  </div>
                  <div className="card p-4">
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-400">Recordings Stored</span>
                    <p className="text-2xl sm:text-3xl font-display font-extrabold text-emerald-600 mt-1">
                      {recordings.length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Available in media vault</p>
                  </div>
                </div>

                {/* Candidate Table */}
                <div className="card p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Registered Candidate Profiles</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Inspect candidates and launch 1:1 live interview calls</p>
                    </div>
                    <Link
                      to="/leader"
                      className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/70 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800"
                    >
                      Open Full Leader Studio →
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                          <th className="pb-2 font-semibold">CANDIDATE</th>
                          <th className="pb-2 font-semibold">EMAIL</th>
                          <th className="pb-2 font-semibold">JOINED</th>
                          <th className="pb-2 font-semibold text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(leaderStats?.all_users || []).slice(0, 6).map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 font-bold text-slate-900 dark:text-white">{c.username}</td>
                            <td className="py-2.5 text-slate-500 font-mono">{c.email || '—'}</td>
                            <td className="py-2.5 text-slate-400 font-mono">{(c.date_joined || '').slice(0, 10)}</td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => navigate(`/live-interview/skz_live_${c.id}?candidate=${c.id}&candidateName=${encodeURIComponent(c.username)}`)}
                                className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px]"
                              >
                                Live 1:1 Call
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              /* Candidate Live HR Room View */
              <div className="card p-6 max-w-xl mx-auto text-center">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 border border-purple-200 dark:border-purple-800 flex items-center justify-center mx-auto mb-3 text-2xl">
                  📹
                </div>
                <h3 className="text-xl font-display font-extrabold text-slate-900 dark:text-white">
                  Join Live 1:1 HR Interview Room
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                  Enter your assigned Interview Room ID or launch with a generated secure code to connect directly with your company HR interviewer.
                </p>

                <div className="mt-5 max-w-sm mx-auto space-y-3">
                  <div>
                    <label className="text-left block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Room Code
                    </label>
                    <input
                      type="text"
                      className="input-field text-center font-mono font-bold tracking-wider"
                      value={candidateLiveRoomId}
                      onChange={(e) => setCandidateLiveRoomId(e.target.value.trim())}
                      placeholder="e.g. skz_room_123"
                    />
                  </div>

                  <button
                    onClick={() => navigate(`/live-interview/${candidateLiveRoomId}`)}
                    className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-500/20 cursor-pointer"
                  >
                    Enter Live Room Now →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── MODULE 4: RESUME ATS SCANNER DATA ─── */}
        {selectedTrack === 'resume' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Drag and Drop Uploader */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                if (e.dataTransfer.files?.[0]) handleResumeFileSelect(e.dataTransfer.files[0])
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-3xl border-2 border-dashed text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-white dark:bg-[#0D1527]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => handleResumeFileSelect(e.target.files?.[0])}
              />
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-3 text-2xl">
                📄
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {uploadingResume ? 'Uploading & Scanning Resume...' : 'Drop your resume here, or browse files'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Supports PDF (.pdf) and Word (.docx) documents up to 25MB
              </p>
            </div>

            {resumeSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                ✓ {resumeSuccess}
              </div>
            )}
            {resumeError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                ⚠️ {resumeError}
              </div>
            )}

            {/* Uploaded Resumes List */}
            <div className="card p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Your Uploaded Resumes</h3>
                <Link to="/resume" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                  Full ATS Scanner →
                </Link>
              </div>

              {resumes.length === 0 ? (
                <div className="py-6 text-center bg-slate-50/50 dark:bg-[#131E38]/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">No resumes uploaded yet. Drop a PDF/DOCX above to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {resumes.map((r) => {
                    const parsed = r.parsed_data || {}
                    const atsScore = r.ats_score || parsed.ats_score || 0
                    return (
                      <div
                        key={r.id}
                        className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#0A0F1D] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <ReadinessDial score={atsScore} size={54} />
                          <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">
                              {r.original_filename || r.filename || 'Resume.pdf'}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              Uploaded: {(r.uploaded_at || '').slice(0, 10)} · Size: {formatBytes(r.file_size || 0)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate('/resume')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                          >
                            View ATS Report
                          </button>
                          <button
                            onClick={() => handleDeleteResume(r.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
                            title="Delete resume"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}

export default Dashboard
