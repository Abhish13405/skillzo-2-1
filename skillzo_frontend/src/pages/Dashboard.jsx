import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
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
      userName === 'abhishekkushwaha31387'
    ))
  )

  const [techCount, setTechCount] = useState(0)
  const [hrCount, setHrCount] = useState(0)
  const [resumeCount, setResumeCount] = useState(0)
  const [candidateCount, setCandidateCount] = useState(0)

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
    {
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

  return (
    <AppShell hideSidebar={true} noScroll={true}>
      <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-between py-1 sm:py-2">
        {/* Top Header */}
        <div className="mb-2 sm:mb-2.5 text-center max-w-2xl mx-auto shrink-0">
          {isLeader && (
            <div className="mb-2 flex justify-center">
              <Link
                to="/leader"
                className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-xs hover:bg-amber-100 transition-colors"
              >
                <span>👑 Student View Preview Mode (Leader ID Active)</span>
                <span>·</span>
                <span className="underline">← Return to Leader Console</span>
              </Link>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-display font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Welcome to Skillzo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl mx-auto">
            Select a workspace below to enter its specialized dashboard, practice mock interviews, view past scores, and access AI tools.
          </p>
        </div>

        {/* Exactly the 4 Workspace Boxes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 lg:gap-4 flex-1 min-h-0 items-stretch">
          {workspaces.map((box) => (
            <div
              key={box.id}
              onClick={() => navigate(box.route)}
              className={`group relative bg-white dark:bg-[#121212] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-neutral-800 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer hover:-translate-y-0.5 ${box.borderHover}`}
            >
              <div>
                {/* Top Row: Icon & Box Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${box.iconBg} border flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}>
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
                <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {box.title}
                </h2>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                  {box.description}
                </p>
              </div>

              {/* Bottom CTA Row */}
              <div className="mt-2.5 pt-2 sm:pt-2.5 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
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
    </AppShell>
  )
}

export default Dashboard
