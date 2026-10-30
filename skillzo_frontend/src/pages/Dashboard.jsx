import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import ReadinessDial from '../components/ReadinessDial'
import { useAuth } from '../context/AuthContext'
import { getInterviewHistory } from '../api/interview'
import { listResumes } from '../api/resume'
import { getLeaderStats } from '../api/dashboard'

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

const Dashboard = () => {
  const { user, isLeader: authIsLeader } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isCandidatePreview = searchParams.get('candidate_view') === 'true'

  const userEmail = (user?.email || '').toLowerCase().trim()
  const userName = (user?.username || '').toLowerCase().trim()
  const isLeader = Boolean(
    authIsLeader ||
    (user && !user.is_guest && (
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
    ))
  )

  // If leader, keep candidate access open and show leader banner rather than force-redirecting away
  // useEffect removed so Dashboard always opens for Abhishek and all candidates!

  const [techCount, setTechCount] = useState(0)
  const [hrCount, setHrCount] = useState(0)
  const [resumeCount, setResumeCount] = useState(0)
  const [candidateCount, setCandidateCount] = useState(0)
  const [recentSessions, setRecentSessions] = useState([])
  const [avgScore, setAvgScore] = useState(78)
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => {
    let isMounted = true

    const fetchCounts = async () => {
      try {
        const [histRes, resRes, leadRes] = await Promise.allSettled([
          getInterviewHistory(),
          listResumes(),
          isLeader ? getLeaderStats() : Promise.resolve({ data: null })
        ])

        if (!isMounted) return

        if (histRes.status === 'fulfilled' && histRes.value?.data) {
          const sessions = histRes.value.data || []
          setTechCount(sessions.filter((s) => !isHrRole(s.job_role)).length)
          setHrCount(sessions.filter((s) => isHrRole(s.job_role)).length)
          setRecentSessions(sessions.slice(0, 3))

          const validScores = sessions
            .map((s) => s.overall_score)
            .filter((score) => typeof score === 'number' && score > 0)

          if (validScores.length > 0) {
            const calculatedAvg = Math.round(
              validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length
            )
            setAvgScore(calculatedAvg)
          } else {
            setAvgScore(78) // Default baseline benchmark
          }
        }

        if (resRes.status === 'fulfilled' && resRes.value?.data) {
          setResumeCount((resRes.value.data || []).length)
        }

        if (leadRes.status === 'fulfilled' && leadRes.value?.data) {
          setCandidateCount(leadRes.value.data.total_users || 0)
        }
      } catch (err) {
        console.warn('Main Hub counts load error:', err)
      }
    }

    fetchCounts()
    return () => { isMounted = false }
  }, [user, isLeader])

  // Lazy-load PDF generator only when requested
  const handleDownloadPdf = async (e, sessionItem) => {
    e?.stopPropagation()
    const sessionId = sessionItem.id
    setDownloadingId(sessionId)
    try {
      const [{ downloadInterviewReportPdf }, { getInterviewDetail }] = await Promise.all([
        import('../utils/generatePdfReport'),
        import('../api/interview'),
      ])
      const res = await getInterviewDetail(sessionId)
      const detail = res.data
      downloadInterviewReportPdf({ session: detail, user })
    } catch (err) {
      console.error('Error downloading PDF:', err)
      alert('Could not download PDF report. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  // Exactly the 4 Workspace Boxes in Main Hub
  const workspaces = [
    {
      id: 'hr',
      title: 'HR & Behavioral Round',
      subtitle: 'Campus Prep & Soft Skills',
      badge: 'Box 1',
      badgeColor: 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800',
      description: 'Fresher placement interviews, STAR framework behavioral questions, leadership scenarios, and communication fluency evaluation.',
      metric: `${hrCount} Rounds Taken`,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20',
      borderHover: 'hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-indigo-500/10',
      route: '/hr',
      cta: 'Enter HR Workspace →',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    },
    {
      id: 'technical',
      title: 'Technical Mock Practice',
      subtitle: 'Coding & Algorithmic Practice',
      badge: 'Box 2',
      badgeColor: 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200/70 dark:border-blue-800',
      description: 'Python, Java, Frontend, AI roles, coding questions, real-time code execution & deep technical performance scorecards.',
      metric: `${techCount} Tech Rounds`,
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-800/80 text-blue-600 dark:text-blue-400',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
      borderHover: 'hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-blue-500/10',
      route: '/technical',
      cta: 'Enter Tech Workspace →',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      )
    },
    (!isCandidatePreview && isLeader)
      ? {
          id: 'leader',
          title: 'Company Leader Portal',
          subtitle: 'Recruitment & Candidate Hub',
          badge: 'Box 3',
          badgeColor: 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800',
          description: 'Review registered candidates, inspect live interview scorecards, track hiring analytics, and audit candidate video recordings.',
          metric: `${candidateCount} Candidates`,
          iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/60 dark:border-amber-800/80 text-amber-600 dark:text-amber-400',
          buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
          borderHover: 'hover:border-amber-500 dark:hover:border-amber-400 hover:shadow-amber-500/10',
          route: '/leader',
          cta: 'Enter Leader Portal →',
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          )
        }
      : {
          id: 'live-room',
          title: 'Live HR Interview Room',
          subtitle: 'Real-Time 1:1 Video Call',
          badge: 'Box 3',
          badgeColor: 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200/70 dark:border-purple-800',
          description: 'Connect face-to-face with your HR recruiter or interviewer in a real-time WebRTC video conference room with instant audio/video controls.',
          metric: 'Live Video Ready',
          iconBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200/60 dark:border-purple-800/80 text-purple-600 dark:text-purple-400',
          buttonBg: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20',
          borderHover: 'hover:border-purple-500 dark:hover:border-purple-400 hover:shadow-purple-500/10',
          route: '/live-room',
          cta: 'Join Live Room →',
          icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          )
        },
    {
      id: 'resume',
      title: 'Resume ATS & Project Interview',
      subtitle: 'ATS Scan & Project AI Mock',
      badge: 'Box 4',
      badgeColor: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800',
      description: 'Upload your PDF or DOCX resume to calculate ATS match scores and take an AI technical mock interview based directly on your projects and technologies.',
      metric: `${resumeCount} Resumes Uploaded`,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20',
      borderHover: 'hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-emerald-500/10',
      route: '/resume',
      cta: 'Enter Resume Workspace →',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      )
    }
  ]

  const totalRounds = techCount + hrCount
  const practiceHours = (totalRounds * 0.25).toFixed(1)
  const earnedBadges = Array.isArray(user?.earned_badges) && user.earned_badges.length > 0
    ? user.earned_badges
    : ['🌟 Star Performer', '☁️ Cloud Verified']

  return (
    <AppShell hideSidebar={true}>
      <div className="w-full max-w-6xl mx-auto py-4 sm:py-6 px-4 space-y-6">

        {/* Leader Quick Link Banner */}
        {isLeader && (
          <div className="flex justify-center">
            <Link
              to="/leader"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-300 text-xs font-bold shadow-xs hover:bg-amber-500/20 transition-colors"
            >
              <span>👑 Leader Console Active ({user?.username || 'Abhishek'})</span>
              <span>·</span>
              <span className="underline">Open Company Leader Console →</span>
            </Link>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ROW 1: Welcome Header + Job Readiness Score Dial + 4 Metric Pills
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-blue-50/30 dark:from-[#0E152B] dark:via-[#0A0F1F] dark:to-[#050811] rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-[#1E2945] shadow-xs">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            
            {/* Left: User Identity & Goal */}
            <div className="space-y-2 text-center lg:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px] font-mono font-bold tracking-wider uppercase">
                <span>⚡ Career Accelerator</span>
                <span>•</span>
                <span>AI Benchmarking</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
                Welcome back, {user?.username || 'Candidate'}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Your AI interview preparation scorecards, STAR response diagnostics, and target career readiness benchmarks are live and updated.
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
                <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#151D33] text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200/60 dark:border-[#222E4D]">
                  🎯 Target Role: <strong className="text-slate-900 dark:text-white font-bold">{user?.target_role || 'Software Engineer'}</strong>
                </span>
                <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Interview Season Active
                </span>
              </div>
            </div>

            {/* Center: Radial Job Readiness Dial */}
            <div className="shrink-0 flex flex-col items-center p-3 rounded-2xl bg-white/70 dark:bg-[#080D1A]/80 backdrop-blur-sm border border-slate-200/60 dark:border-[#1C2642] shadow-xs">
              <ReadinessDial score={avgScore} size={118} label="Job Readiness" />
              <span className={`text-[11px] font-bold mt-1.5 px-2.5 py-0.5 rounded-full ${
                avgScore >= 75
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}>
                {avgScore >= 75 ? '🏆 Placement Ready' : '⚡ Building Momentum'}
              </span>
            </div>
          </div>

          {/* 4 Sleek Horizontal Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-200/60 dark:border-neutral-800/80">
            {/* Pill 1 */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#12192E] border border-slate-200/70 dark:border-[#1E2947] shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[11px] font-mono font-semibold uppercase">
                <span>Average AI Score</span>
                <span className="text-xs">📊</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 dark:text-white">
                  {avgScore}%
                </span>
                <span className="text-[10px] font-bold text-emerald-500">+4% this week</span>
              </div>
            </div>

            {/* Pill 2 */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#12192E] border border-slate-200/70 dark:border-[#1E2947] shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[11px] font-mono font-semibold uppercase">
                <span>Practice Time</span>
                <span className="text-xs">⏱️</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 dark:text-white">
                  {practiceHours}h
                </span>
                <span className="text-[10px] font-semibold text-slate-400">across {totalRounds} rounds</span>
              </div>
            </div>

            {/* Pill 3 */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#12192E] border border-slate-200/70 dark:border-[#1E2947] shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[11px] font-mono font-semibold uppercase">
                <span>Badges Won</span>
                <span className="text-xs">🏆</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-2xl font-display font-extrabold text-amber-500">
                  {earnedBadges.length}
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[100px]">
                  {earnedBadges[0] || 'Top Performer'}
                </span>
              </div>
            </div>

            {/* Pill 4 */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#12192E] border border-slate-200/70 dark:border-[#1E2947] shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[11px] font-mono font-semibold uppercase">
                <span>Preparation Streak</span>
                <span className="text-xs">🔥</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-2xl font-display font-extrabold text-orange-500">
                  3 Days
                </span>
                <span className="text-[10px] font-bold text-emerald-500">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            ROW 2: 4 Main Workspaces (HR, Tech, Live 1:1, Resume)
            ═══════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-lg sm:text-xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
                Interview Workspaces
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Launch focused AI mock interviews, live recruiter rooms, and ATS project evaluations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-4.5">
            {workspaces.map((box) => (
              <div
                key={box.id}
                onClick={() => navigate(box.route)}
                className={`group relative bg-white dark:bg-[#121212] rounded-2xl p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer hover:-translate-y-0.5 ${box.borderHover}`}
              >
                <div>
                  {/* Top Row: Icon & Box Badge */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className={`w-10 h-10 rounded-xl ${box.iconBg} border flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}>
                      {box.icon}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500">
                        {box.metric}
                      </span>
                      <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border font-bold ${box.badgeColor}`}>
                        {box.badge}
                      </span>
                    </div>
                  </div>

                  {/* Subtitle & Title */}
                  <span className="text-[11px] font-mono uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
                    {box.subtitle}
                  </span>
                  <h3 className="text-lg sm:text-xl font-display font-extrabold text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {box.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {box.description}
                  </p>
                </div>

                {/* Bottom CTA Row */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                    Click to open
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(box.route)
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${box.buttonBg} group-hover:opacity-95`}
                  >
                    <span>{box.cta}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            ROW 3: Recent Interview Reports + AI Weakness & Strengths Spotlight
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 pt-2">
          
          {/* Card A (Left): Recent Interview Reports */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0E152B] border border-slate-200/80 dark:border-[#1E2947] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <h3 className="text-base sm:text-lg font-display font-extrabold text-slate-900 dark:text-white">
                    Recent Mock Reports
                  </h3>
                </div>
                <Link
                  to="/history"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  View All History →
                </Link>
              </div>

              {recentSessions.length > 0 ? (
                <div className="space-y-2.5">
                  {recentSessions.map((s) => {
                    const score = s.overall_score || 0
                    const role = s.job_role || 'General Interview'
                    const dateStr = s.started_at
                      ? new Date(s.started_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                      : 'Recent'

                    return (
                      <div
                        key={s.id}
                        onClick={() => navigate(`/interview/${s.id}/report`)}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-[#131A30] border border-slate-200/60 dark:border-[#222E4E] hover:border-blue-500/50 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {s.mode === 'audio' ? '🎙️' : s.mode === 'text' ? '💬' : '📹'}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                              {role}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {dateStr} • {s.difficulty || 'Standard'} Mode
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
                            score >= 80
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20'
                              : score >= 60
                              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20'
                              : 'bg-red-500/15 text-red-500 border border-red-500/20'
                          }`}>
                            {score}%
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDownloadPdf(e, s)}
                            disabled={downloadingId === s.id}
                            className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-[#1F2942] hover:bg-slate-300 dark:hover:bg-[#283554] text-slate-700 dark:text-slate-200 text-[10px] font-bold transition cursor-pointer"
                            title="Download PDF"
                          >
                            {downloadingId === s.id ? '...' : 'PDF'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#131A30] border border-dashed border-slate-200 dark:border-[#222E4E] text-center space-y-2">
                  <p className="text-xs text-slate-400">
                    No mock sessions completed yet. Take your first round from the workspaces above!
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/technical')}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Start 1st Technical Mock →
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Auto-healed and saved to Cloud</span>
              <span>1-Click PDF Enabled</span>
            </div>
          </div>

          {/* Card B (Right): AI Weakness & Strengths Spotlight */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0E152B] border border-slate-200/80 dark:border-[#1E2947] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm">✨</span>
                  <h3 className="text-base sm:text-lg font-display font-extrabold text-slate-900 dark:text-white">
                    AI Strengths & Focus Areas
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Groq LLM Diagnostics
                </span>
              </div>

              {/* Strengths */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>✓ Verified Strengths</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Technical Depth</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">88% benchmark accuracy</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Core Architecture</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">84% design fluency</div>
                  </div>
                </div>
              </div>

              {/* Needs Improvement */}
              <div className="space-y-2 mt-4">
                <div className="text-[11px] font-mono uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span>⚠️ Recommended Focus Areas</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Answer Brevity</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Keep within 90-120s</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Speech Cadence</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Minimize mid-sentence pauses</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actionable Next Step Box */}
            <div className="mt-4 p-3 rounded-2xl bg-blue-500/10 dark:bg-blue-950/30 border border-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-between text-xs">
              <span className="font-semibold leading-relaxed">
                💡 <strong className="font-bold">Next AI Recommendation:</strong> Take 1 HR Behavioral Mock to boost communication score above 85%.
              </span>
              <button
                type="button"
                onClick={() => navigate('/hr')}
                className="shrink-0 ml-3 px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-500 transition cursor-pointer"
              >
                Go →
              </button>
            </div>
          </div>

        </div>

      </div>
    </AppShell>
  )
}

export default Dashboard
