import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import AppShell from '../components/AppShell'
import ReadinessDial from '../components/ReadinessDial'
import { getDashboardSummary } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'

// ─── Skeleton Components ─────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`bg-slate-200/70 dark:bg-slate-800/60 rounded-2xl animate-pulse ${className}`} />
)

const DashboardSkeleton = () => (
  <AppShell hideSidebar={true}>
    <div className="max-w-5xl mx-auto py-8 sm:py-12">
      <div className="text-center mb-8 flex flex-col items-center">
        <Skeleton className="w-28 h-5 mb-3 rounded-full" />
        <Skeleton className="w-64 h-9 mb-2" />
        <Skeleton className="w-80 h-4" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
      </div>
    </div>
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

  const isAdmin = Boolean(
    user?.is_staff ||
    user?.is_superuser ||
    (user?.email && [
      'abhishekkushwaha13405@gmail.com',
      'abhish@gmail.com',
      'abhishekkushwaha31387@bbdu.ac.in',
      'abhishekkushwaha965@gmail.com'
    ].includes(user.email.toLowerCase().trim())) ||
    (user?.username && [
      'abhishek13405',
      'abhish',
      'abhishek'
    ].includes(user.username.toLowerCase().trim()))
  )

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
    <AppShell hideSidebar={!isAdmin}>
      <div className={`max-w-5xl mx-auto py-6 sm:py-10 ${isAdmin ? '' : 'min-h-[75vh] flex flex-col justify-center'}`}>
        <div className="text-center mb-8 sm:mb-10">
          <span className="text-[11px] font-mono uppercase font-bold text-blue-600 dark:text-blue-400 tracking-widest px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/60">
            Workspace Mode
          </span>
          <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">
            Select Your Track
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            Choose a workspace to launch your session. Everything else runs inside your selected module.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Card 1: HR & Behavioral Round */}
          <div
            onClick={(e) => handleFeatureClick(e, 'HR Round', '/interview/setup', { role: 'HR Interview' })}
            className="group relative bg-white dark:bg-[#0D1527] rounded-2xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800/90 hover:border-indigo-500/80 dark:hover:border-indigo-400/80 transition-all duration-200 flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-0.5"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800 font-semibold">
                  10-Min Prep
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                HR & Behavioral Round
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Self-introduction, situational responses, strengths, weaknesses and cultural alignment.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              <span>Open HR Workspace</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Card 2: Technical Mock Practice */}
          <div
            onClick={(e) => handleFeatureClick(e, 'Technical Mock', '/interview/setup', { role: 'Python Developer' })}
            className="group relative bg-white dark:bg-[#0D1527] rounded-2xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800/90 hover:border-blue-500/80 dark:hover:border-blue-400/80 transition-all duration-200 flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-0.5"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6"/>
                    <polyline points="8 6 2 12 8 18"/>
                  </svg>
                </div>
                <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800 font-semibold">
                  Technical
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Technical Mock Practice
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Python, Java, Frontend, AI and Data roles with 3 difficulty tiers and live evaluation.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400">
              <span>Open Technical Studio</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Card 3: Company Leader / Hiring Portal */}
          <div
            onClick={(e) => handleFeatureClick(e, 'Leader Portal', '/leader-portal')}
            className="group relative bg-white dark:bg-[#0D1527] rounded-2xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800/90 hover:border-amber-500/80 dark:hover:border-amber-400/80 transition-all duration-200 flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-0.5"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                </div>
                <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800 font-semibold">
                  Hiring Hub
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Company Leader Portal
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Inspect registered candidates, review interview scores, and watch candidate recordings.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400">
              <span>Open Leader Portal</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Card 4: Resume ATS Scanner */}
          <div
            onClick={(e) => handleFeatureClick(e, 'Resume Analysis', '/resume')}
            className="group relative bg-white dark:bg-[#0D1527] rounded-2xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800/90 hover:border-emerald-500/80 dark:hover:border-emerald-400/80 transition-all duration-200 flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-0.5"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800 font-semibold">
                  ATS Match
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Resume ATS Scanner
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Scan your PDF/DOCX resume against target job requirements for match score and keyword gaps.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Open Resume Scanner</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-12 pt-8 border-t border-slate-200/80 dark:border-slate-800">
            <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Admin Executive Hub
                  </span>
                  <StreakBadge streak={data.daily_goal.current_streak} />
                </div>
                <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 dark:text-white mt-1.5">
                  Platform Analytics & Candidate Performance
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Full system diagnostics, readiness dials, and practice metrics visible exclusively to administrator ({user?.email || user?.username}).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/leaderboard"
                  className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Leaderboard
                </Link>
                <Link
                  to="/leader-portal"
                  className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-xl transition-colors shadow-xs"
                >
                  Candidate Portal
                </Link>
              </div>
            </div>

            {/* Stat dials & Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5">
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

            {/* Growth chart and AI suggestions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
              <div className="card lg:col-span-2 p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Score Growth Trend</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Historical performance across practice rounds</p>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                    Last {data.progress_chart.length} rounds
                  </span>
                </div>
                {data.progress_chart.length === 0 ? (
                  <div className="h-44 flex items-center justify-center bg-slate-50/50 dark:bg-[#131E38]/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">No chart data yet — complete interviews to track trends.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={data.progress_chart} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ background: '#0D1527', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', color: '#F8FAFC' }}
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

              <div className="card flex flex-col p-4">
                <div className="mb-3">
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">AI Coach Insights</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Algorithmic recommendations</p>
                </div>
                {data.ai_suggestions.length === 0 ? (
                  <div className="text-center py-6 my-auto bg-slate-50/50 dark:bg-[#131E38]/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Suggestions appear after completed interviews.</p>
                  </div>
                ) : (
                  <ul className="space-y-2 my-auto">
                    {data.ai_suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#131E38] p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-blue-600 dark:text-blue-400 font-mono font-bold shrink-0">•</span>
                        <span className="leading-snug font-medium">{s}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Recent interview reports */}
            <div className="card p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Recent Interview Reports</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Completed session scorecards & candidate answers</p>
                </div>
                <Link 
                  to="/history" 
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-900 transition-colors"
                >
                  View All History
                </Link>
              </div>
              {data.recent_reports.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center bg-slate-50/50 dark:bg-[#131E38]/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No reports recorded yet.
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
                      <Link
                        to={`/interview/${r.id}/report`}
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
                      </Link>
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
