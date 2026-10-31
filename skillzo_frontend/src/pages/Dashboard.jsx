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
  const [selectedTrack, setSelectedTrack] = useState('hr')

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
        console.warn('Dashboard counts load error:', err)
      }
    }

    fetchCounts()
    return () => { isMounted = false }
  }, [user, isLeader])

  return (
    <AppShell hideSidebar={true}>
      <div className="w-full max-w-5xl mx-auto min-h-[calc(100vh-80px)] flex flex-col justify-center py-6 sm:py-10 px-4">
        {/* Leader student view return banner */}
        {isLeader && (
          <div className="mb-4 flex justify-center">
            <Link
              to="/leader"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold shadow-xs hover:bg-amber-500/20 transition-colors"
            >
              <span>👑 Student View Preview Mode (Leader ID Active)</span>
              <span>·</span>
              <span className="underline">← Return to Leader Console</span>
            </Link>
          </div>
        )}

        {/* Top Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-display font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Welcome to Skillzo
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-slate-600 dark:text-slate-400 mt-2.5 max-w-xl mx-auto leading-relaxed">
            Pick a workspace to start practicing mock interviews.
          </p>
        </div>

        {/* 2-Box Workspace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch w-full">
          {/* BOX 1: Practice */}
          <div className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
            <div>
              {/* Top Row: Icon & Badge */}
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-[#181a26] border border-indigo-100 dark:border-slate-800 flex items-center justify-center text-[#5848e5] dark:text-[#7c6ff6]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <span className="px-3 py-1 rounded-full border border-[#4f46e5]/40 bg-[#4f46e5]/10 text-[#5848e5] dark:text-[#a5b4fc] text-[11px] font-mono font-bold tracking-wider uppercase">
                  BOX 1
                </span>
              </div>

              {/* Subtitle & Title */}
              <span className="text-[11px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mt-5">
                AI MOCK INTERVIEWS
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
                Practice
              </h2>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Practice with the AI interviewer. Choose a track below and get a scorecard with feedback after every round.
              </p>

              {/* Selectable Tracks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {/* Track 1: HR & Behavioral */}
                <button
                  type="button"
                  onClick={() => setSelectedTrack('hr')}
                  className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
                    selectedTrack === 'hr'
                      ? 'bg-indigo-50/70 dark:bg-[#16182c] border-[#5848e5] shadow-[0_0_20px_rgba(88,72,229,0.2)]'
                      : 'bg-slate-50 dark:bg-[#131520] border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    HR & Behavioral
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    STAR answers, leadership, communication
                  </div>
                </button>

                {/* Track 2: Technical */}
                <button
                  type="button"
                  onClick={() => setSelectedTrack('technical')}
                  className={`p-3.5 rounded-xl text-left transition-all cursor-pointer border ${
                    selectedTrack === 'technical'
                      ? 'bg-indigo-50/70 dark:bg-[#16182c] border-[#5848e5] shadow-[0_0_20px_rgba(88,72,229,0.2)]'
                      : 'bg-slate-50 dark:bg-[#131520] border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    Technical
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Coding, Python, Java, AI roles
                  </div>
                </button>
              </div>
            </div>

            {/* Bottom Footer Row */}
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {selectedTrack === 'hr'
                  ? (hrCount > 0 ? `${hrCount} rounds taken` : 'No rounds yet')
                  : (techCount > 0 ? `${techCount} rounds taken` : 'No rounds yet')}
              </span>
              <button
                type="button"
                onClick={() => navigate(selectedTrack === 'hr' ? '/hr' : '/technical')}
                className="bg-[#5848e5] hover:bg-[#4b3dcf] text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Start Practice</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* BOX 2: Live HR Interview Room */}
          <div className="bg-white dark:bg-[#10121a] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
            <div>
              {/* Top Row: Icon & Badge */}
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-[#181a26] border border-indigo-100 dark:border-slate-800 flex items-center justify-center text-[#5848e5] dark:text-[#7c6ff6]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <span className="px-3 py-1 rounded-full border border-[#4f46e5]/40 bg-[#4f46e5]/10 text-[#5848e5] dark:text-[#a5b4fc] text-[11px] font-mono font-bold tracking-wider uppercase">
                  BOX 2
                </span>
              </div>

              {/* Subtitle & Title */}
              <span className="text-[11px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mt-5">
                REAL-TIME 1:1 VIDEO CALL
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
                Live HR Interview Room
              </h2>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Connect face-to-face with your HR recruiter or interviewer in a real-time video room with audio and video controls.
              </p>

              {/* Status Banner */}
              <div className="mt-6 bg-slate-50 dark:bg-[#151624] border border-slate-200 dark:border-indigo-950/70 rounded-xl p-3.5 flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                </span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug">
                  Camera and mic check runs before you enter the room.
                </span>
              </div>
            </div>

            {/* Bottom Footer Row */}
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                Live video ready
              </span>
              <button
                type="button"
                onClick={() => navigate('/live-room')}
                className="bg-[#5848e5] hover:bg-[#4b3dcf] text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Join Live Room</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default Dashboard
