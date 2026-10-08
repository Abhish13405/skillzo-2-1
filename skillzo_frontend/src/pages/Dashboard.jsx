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
  const { user, requireAuth } = useAuth()
  const navigate = useNavigate()

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

  const handleFeatureClick = (e, featureName, targetPath) => {
    e.preventDefault()
    requireAuth(featureName, () => navigate(targetPath))
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3 flex-wrap border-b border-slate-200/60 dark:border-slate-800/80 pb-3 sm:pb-4">
        <div>
          <span className="eyebrow mb-1">Readiness Studio</span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            {user ? `Welcome back, ${user.username?.split(' ')[0]}!` : 'Welcome, Candidate! 👋'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            {user 
              ? 'Here is your AI interview prep metrics and active performance trends.'
              : 'Explore Skillzo AI mock interview studio & ATS resume evaluation.'}
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

      {/* Project Leader Overview (Only visible to Abhish / Superusers) */}
      {data.leader_stats && (
        <div className="card mb-4 sm:mb-5 border-blue-500/40 dark:border-blue-500/30 bg-gradient-to-br from-blue-950/20 via-[#0D1527] to-[#0A0F1D] p-4 sm:p-5 rounded-2xl shadow-craft">
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-200/40 dark:border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">👑</span>
              <div>
                <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Project Leader Control Center</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold uppercase">Superuser Access</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live platform metrics & candidate registration monitoring.</p>
              </div>
            </div>
            <a
              href="https://skillzo-2-1-6.onrender.com/admin"
              target="_blank"
              rel="noreferrer"
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
            >
              <span>Open Django Admin Portal ↗</span>
            </a>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-3">
            <div className="p-3 rounded-xl bg-white/50 dark:bg-[#131E38]/80 border border-slate-200/60 dark:border-slate-800 text-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Total Candidates</span>
              <p className="text-xl sm:text-2xl font-display font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{data.leader_stats.total_users}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/50 dark:bg-[#131E38]/80 border border-slate-200/60 dark:border-slate-800 text-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">All Mock Sessions</span>
              <p className="text-xl sm:text-2xl font-display font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{data.leader_stats.total_all_interviews}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/50 dark:bg-[#131E38]/80 border border-slate-200/60 dark:border-slate-800 text-center">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Resumes Scanned</span>
              <p className="text-xl sm:text-2xl font-display font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{data.leader_stats.total_all_resumes}</p>
            </div>
          </div>

          {data.leader_stats.all_users?.length > 0 && (
            <div>
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2">Recent Registered Users:</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {data.leader_stats.all_users.map(u => (
                  <span key={u.id} className="text-[11px] font-mono px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#131E38] border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    👤 <strong>{u.username}</strong> ({u.email})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
          href="/leaderboard"
          onClick={(e) => handleFeatureClick(e, 'Global Leaderboard', '/leaderboard')} 
          className="card hover:border-amber-300 dark:hover:border-amber-500/50 shadow-craft hover:shadow-craftHover transition-all group p-3.5 sm:p-4 cursor-pointer"
        >
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Rankings</span>
          <p className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mt-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center justify-between">
            <span>Global Leaderboard</span>
            <span>→</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Compare your readiness metrics against top candidates</p>
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
