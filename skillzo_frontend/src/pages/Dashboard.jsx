import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import AppShell from '../components/AppShell'
import ReadinessDial from '../components/ReadinessDial'
import { getDashboardSummary } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'

// ─── Skeleton Components ─────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`bg-slate-200/70 rounded-2xl animate-pulse ${className}`} />
)

const DashboardSkeleton = () => (
  <AppShell>
    <div className="mb-4 sm:mb-5 flex items-start justify-between">
      <div>
        <Skeleton className="w-24 h-3.5 mb-1.5" />
        <Skeleton className="w-56 h-8" />
      </div>
      <Skeleton className="w-32 h-9 rounded-xl" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-5">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-5">
      <Skeleton className="lg:col-span-2 h-56" />
      <Skeleton className="h-56" />
    </div>
    <Skeleton className="h-36" />
  </AppShell>
)

// ─── Streak Badge ─────────────────────────────────────────────────────────────
const StreakBadge = ({ streak }) => {
  if (!streak || streak < 2) return null
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-brand-200 bg-brand-50 text-brand-700 text-xs font-mono font-bold shadow-xs">
      <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
      {streak} Day Streak
    </div>
  )
}

const defaultGuestData = {
  average_score: 0,
  best_score: 0,
  total_interviews: 0,
  daily_goal: { completed_today: 0, target: 1, current_streak: 0 },
  progress_chart: [],
  ai_suggestions: [
    'Welcome to Skillzo! Create an account to start your first AI mock interview.',
    'Upload your resume to receive ATS matching feedback & AI skill recommendations.'
  ],
  recent_reports: []
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
const Dashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user, requireAuth, loginAsGuest } = useAuth()
  const [guestActivating, setGuestActivating] = useState(false)
  const navigate = useNavigate()

  const handleActivateGuest = async () => {
    setGuestActivating(true)
    try {
      if (!user) await loginAsGuest()
      navigate('/interview/setup')
    } catch {
      setGuestActivating(false)
    }
  }

  useEffect(() => {
    if (!user) {
      setData(defaultGuestData)
      setLoading(false)
      return
    }
    getDashboardSummary()
      .then((res) => setData(res.data))
      .catch(() => setData(defaultGuestData))
      .finally(() => setLoading(false))
  }, [user])

  if (loading || !data) return <DashboardSkeleton />

  const goalDone = data.daily_goal.completed_today >= data.daily_goal.target

  const handleFeatureClick = async (e, featureName, targetPath, state = null) => {
    e.preventDefault()
    if (!user) {
      try {
        await loginAsGuest()
      } catch {
        // proceed anyway
      }
    }
    navigate(targetPath, { state })
  }

  return (
    <AppShell>
      {!user ? (
        <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Guest Mode: Practice AI Mock Interviews & ATS Resumes without Sign Up!
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                1-click instant access to all candidate practice features.
              </p>
            </div>
          </div>
          <button
            onClick={handleActivateGuest}
            disabled={guestActivating}
            className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>⚡</span>
            <span>{guestActivating ? 'Activating...' : 'Continue as Guest →'}</span>
          </button>
        </div>
      ) : user.is_guest ? (
        <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Guest Mode Active: Practice AI Interviews & ATS Resumes (No Account Needed)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                You have instant access to mock interviews, ATS resume scoring, recordings, and AI feedback.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/interview/setup')}
            className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>⚡ Start AI Interview</span>
            <span>→</span>
          </button>
        </div>
      ) : null}

      {/* Header */}
      <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3 flex-wrap border-b border-slate-200/60 dark:border-slate-800/80 pb-3 sm:pb-4">
        <div>
          <span className="eyebrow mb-1">Readiness Studio</span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            {user ? `Welcome back, ${user.username?.split(' ')[0]}!` : 'Welcome, Candidate!'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            {user 
              ? 'Select an assessment track below or continue from your performance metrics.'
              : 'Explore Skillzo AI mock interview tracks and ATS resume evaluation.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <StreakBadge streak={data.daily_goal.current_streak} />
          <button 
            onClick={(e) => handleFeatureClick(e, 'AI Interview Studio', '/interview/setup')}
            className="btn-primary flex items-center gap-2 shadow-sm py-2 px-3.5 text-xs sm:text-sm"
          >
            <span>Start AI Interview</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ─── 4 Professional Action Cards (Track Launcher) ─── */}
      <div className="mb-5 sm:mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Select Your Track
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            1-Click Launch
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {/* Card 1: HR & Behavioral Round */}
          <div
            onClick={(e) => handleFeatureClick(e, 'HR Round', '/interview/setup', { role: 'HR Interview' })}
            className="group relative bg-white dark:bg-[#131E38] rounded-xl p-4 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500/70 dark:hover:border-indigo-400/70 transition-all duration-200 flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800 font-semibold">
                  10-Min Prep
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                HR & Behavioral Round
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Self-introduction, situational responses, strengths, weaknesses and cultural alignment.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>Launch HR Round</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Card 2: Technical Mock Practice */}
          <div
            onClick={(e) => handleFeatureClick(e, 'Technical Mock', '/interview/setup', { role: 'Python Developer' })}
            className="group relative bg-white dark:bg-[#131E38] rounded-xl p-4 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500/70 dark:hover:border-blue-400/70 transition-all duration-200 flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6"/>
                    <polyline points="8 6 2 12 8 18"/>
                  </svg>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800 font-semibold">
                  Technical
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Technical Mock Practice
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Python, Java, Frontend, AI and Data roles with 3 difficulty tiers and live evaluation.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span>Start Technical Practice</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Card 3: Company Leader / Hiring Portal */}
          <div
            onClick={(e) => handleFeatureClick(e, 'Leader Portal', '/leader-portal')}
            className="group relative bg-white dark:bg-[#131E38] rounded-xl p-4 border border-slate-200/90 dark:border-slate-800 hover:border-amber-500/70 dark:hover:border-amber-400/70 transition-all duration-200 flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800 font-semibold">
                  Hiring Hub
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Company Leader Portal
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Inspect registered candidates, review interview scores, and watch candidate recordings.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span>Open Leader Portal</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Card 4: Resume ATS Scanner */}
          <div
            onClick={(e) => handleFeatureClick(e, 'Resume Analysis', '/resume')}
            className="group relative bg-white dark:bg-[#131E38] rounded-xl p-4 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/70 dark:hover:border-emerald-400/70 transition-all duration-200 flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800 font-semibold">
                  ATS Match
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Resume ATS Scanner
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Scan your PDF/DOCX resume against target job requirements for match score and keyword gaps.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Scan Resume Now</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div className="card flex flex-col items-center justify-center py-3.5 px-3">
          <ReadinessDial score={data.average_score} size={76} label="Average Score" />
        </div>
        <div className="card flex flex-col items-center justify-center py-3.5 px-3">
          <ReadinessDial score={data.best_score} size={76} label="Best Score" />
        </div>
        <div className="card flex flex-col justify-between p-3.5 sm:p-4">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Practice</span>
            <p className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-1">{data.total_interviews}</p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-2">
            Sessions completed
          </p>
        </div>
        <div className="card flex flex-col justify-between p-3.5 sm:p-4">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Daily Target</span>
            <p className={`text-2xl sm:text-3xl font-display font-extrabold mt-1 ${goalDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {data.daily_goal.completed_today}/{data.daily_goal.target}
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Goal Status</span>
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${goalDone ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900'}`}>
              {goalDone ? 'Achieved' : 'In Progress'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress + AI Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div className="card lg:col-span-2 p-3.5 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">Score Growth Trend</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Historical performance timeline</p>
            </div>
            <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/80">
              Live Chart
            </span>
          </div>
          {data.progress_chart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50/50 dark:bg-[#131E38]/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold mb-2 text-base">
                📈
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">No session analytics yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs">Complete your first AI interview session to plot your progress chart.</p>
              <button 
                onClick={(e) => handleFeatureClick(e, 'AI Interview Studio', '/interview/setup')} 
                className="btn-secondary mt-3 text-xs font-bold py-1.5 px-3"
              >
                Start First Session
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={175}>
              <LineChart data={data.progress_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#0D1527', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', color: '#F8FAFC' }}
                  labelStyle={{ color: '#93C5FD', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2.5}
                  dot={{ fill: '#3B82F6', r: 3.5, strokeWidth: 1.5, stroke: '#1E293B' }}
                  activeDot={{ r: 5, fill: '#60A5FA' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card flex flex-col p-3.5 sm:p-4">
          <div className="mb-2 sm:mb-3">
            <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">AI Coach Advice</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Personalized feedback</p>
          </div>
          {data.ai_suggestions.length === 0 ? (
            <div className="text-center py-6 my-auto bg-slate-50/50 dark:bg-[#131E38]/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Suggestions appear after your first completed interview.</p>
            </div>
          ) : (
            <ul className="space-y-2 my-auto">
              {data.ai_suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#131E38] p-2 sm:p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-blue-600 dark:text-blue-400 font-mono font-bold shrink-0">✦</span>
                  <span className="leading-snug font-medium">{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-5">
        <a 
          href="/interview/setup"
          onClick={(e) => handleFeatureClick(e, 'AI Interview Studio', '/interview/setup')} 
          className="card bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-md shadow-blue-600/20 dark:shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-lg transition-all group p-3.5 sm:p-4 cursor-pointer"
        >
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-200">Mock Session</span>
          <p className="font-display font-extrabold text-base sm:text-lg text-white mt-1 group-hover:translate-x-1 transition-transform flex items-center justify-between">
            <span>AI Interview Studio</span>
            <span>→</span>
          </p>
          <p className="text-xs text-blue-100 mt-1">Practice tech & behavioral questions in real-time mode</p>
        </a>
        
        <a 
          href="/resume"
          onClick={(e) => handleFeatureClick(e, 'ATS Resume Analysis', '/resume')} 
          className="card hover:border-blue-300 dark:hover:border-blue-500/50 shadow-craft hover:shadow-craftHover transition-all group p-3.5 sm:p-4 cursor-pointer"
        >
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Resume Checker</span>
          <p className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center justify-between">
            <span>ATS Resume Analysis</span>
            <span>→</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Score your resume against targeted job descriptions</p>
        </a>

        <a 
          href="/recordings"
          onClick={(e) => handleFeatureClick(e, 'Interview Recordings', '/recordings')} 
          className="card hover:border-emerald-300 dark:hover:border-emerald-500/50 shadow-craft hover:shadow-craftHover transition-all group p-3.5 sm:p-4 cursor-pointer"
        >
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Vault & Clips</span>
          <p className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center justify-between">
            <span>Interview Recordings</span>
            <span>→</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review and replay your recorded video & audio answers</p>
        </a>
      </div>

      {/* Recent reports */}
      <div className="card p-3.5 sm:p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">Recent Interview Reports</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Your latest practice performance scorecards</p>
          </div>
          <button 
            onClick={(e) => handleFeatureClick(e, 'Reports & History', '/history')} 
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-900 transition-colors"
          >
            View All Reports
          </button>
        </div>
        {data.recent_reports.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center bg-slate-50/50 dark:bg-[#131E38]/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            No reports yet — complete your first AI interview to view score breakdown.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {data.recent_reports.map((r) => {
              const isHigh = r.overall_score >= 75
              const isMid = r.overall_score >= 40
              const scoreBadge = isHigh 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900' 
                : isMid 
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' 
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900'
              return (
                <a
                  href={`/interview/${r.id}/report`}
                  onClick={(e) => handleFeatureClick(e, 'Interview Report', `/interview/${r.id}/report`)}
                  key={r.id}
                  className="flex items-center justify-between py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 -mx-1 px-3 rounded-xl transition-all group cursor-pointer"
                >
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{r.job_role}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">Difficulty: {r.difficulty} · Mode: {r.mode}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border ${scoreBadge}`}>
                      Score: {r.overall_score}/100
                    </span>
                    <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default Dashboard
