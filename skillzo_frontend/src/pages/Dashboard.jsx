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
    <div className="mb-8 flex items-start justify-between">
      <div>
        <Skeleton className="w-28 h-4 mb-2" />
        <Skeleton className="w-64 h-9" />
      </div>
      <Skeleton className="w-36 h-11 rounded-xl" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Skeleton className="lg:col-span-2 h-72" />
      <Skeleton className="h-72" />
    </div>
    <Skeleton className="mt-6 h-48" />
  </AppShell>
)

// ─── Streak Badge ─────────────────────────────────────────────────────────────
const StreakBadge = ({ streak }) => {
  if (!streak || streak < 2) return null
  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-brand-200 bg-brand-50 text-brand-700 text-xs font-mono font-bold shadow-xs">
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
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap border-b border-slate-200/60 pb-6">
        <div>
          <span className="eyebrow mb-2">Readiness Studio</span>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight mt-1">
            {user ? `Welcome back, ${user.username?.split(' ')[0]}!` : 'Welcome, Candidate! 👋'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {user 
              ? 'Here is your AI interview prep metrics and active performance trends.'
              : 'Explore Skillzo AI mock interview studio & ATS resume evaluation.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge streak={data.daily_goal.current_streak} />
          <button 
            onClick={(e) => handleFeatureClick(e, 'AI Interview Studio', '/interview/setup')}
            className="btn-primary flex items-center gap-2 shadow-md shadow-brand-500/20"
          >
            <span>Start AI Interview</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card flex flex-col items-center justify-center py-5 bg-white border border-slate-200/80 shadow-craft">
          <ReadinessDial score={data.average_score} size={92} label="Average Score" />
        </div>
        <div className="card flex flex-col items-center justify-center py-5 bg-white border border-slate-200/80 shadow-craft">
          <ReadinessDial score={data.best_score} size={92} label="Best Score" />
        </div>
        <div className="card flex flex-col justify-between p-6 bg-white border border-slate-200/80 shadow-craft">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Total Practice</span>
            <p className="text-3xl font-display font-extrabold text-slate-900 mt-2">{data.total_interviews}</p>
          </div>
          <p className="text-xs text-slate-500 font-medium border-t border-slate-100 pt-3 mt-4">
            Sessions completed
          </p>
        </div>
        <div className="card flex flex-col justify-between p-6 bg-white border border-slate-200/80 shadow-craft">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Daily Target</span>
            <p className={`text-3xl font-display font-extrabold mt-2 ${goalDone ? 'text-brand-600' : 'text-amber-600'}`}>
              {data.daily_goal.completed_today}/{data.daily_goal.target}
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
            <span className="text-xs text-slate-500 font-medium">Goal Status</span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${goalDone ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
              {goalDone ? 'Achieved' : 'In Progress'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress + AI Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-2 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900">Score Growth Trend</h3>
              <p className="text-xs text-slate-500">Historical performance timeline</p>
            </div>
            <span className="text-xs font-mono font-bold bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full border border-brand-100">
              Live Chart
            </span>
          </div>
          {data.progress_chart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 font-bold mb-3">
                📈
              </div>
              <p className="text-sm font-semibold text-slate-700">No session analytics yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">Complete your first AI interview session to plot your progress chart.</p>
              <button 
                onClick={(e) => handleFeatureClick(e, 'AI Interview Studio', '/interview/setup')} 
                className="btn-secondary mt-4 text-xs font-bold"
              >
                Start First Session
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.progress_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
                  labelStyle={{ color: '#0F172A', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="score" stroke="#E11D48" strokeWidth={3}
                  dot={{ fill: '#E11D48', r: 4, strokeWidth: 2, stroke: '#FFF' }}
                  activeDot={{ r: 6, fill: '#F43F5E' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card bg-white flex flex-col">
          <div className="mb-4">
            <h3 className="font-display font-bold text-lg text-slate-900">AI Coach Advice</h3>
            <p className="text-xs text-slate-500">Personalized feedback</p>
          </div>
          {data.ai_suggestions.length === 0 ? (
            <div className="text-center py-10 my-auto bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-500">Suggestions appear after your first completed interview.</p>
            </div>
          ) : (
            <ul className="space-y-3 my-auto">
              {data.ai_suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-brand-600 font-mono font-bold shrink-0">✦</span>
                  <span className="leading-relaxed font-medium">{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <a 
          href="/interview/setup"
          onClick={(e) => handleFeatureClick(e, 'AI Interview Studio', '/interview/setup')} 
          className="card bg-gradient-to-br from-brand-600 to-brand-700 text-white border-none shadow-md shadow-brand-600/20 hover:shadow-lg transition-all group p-6 cursor-pointer"
        >
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-200">Mock Session</span>
          <p className="font-display font-extrabold text-xl text-white mt-1 group-hover:translate-x-1 transition-transform flex items-center justify-between">
            <span>AI Interview Studio</span>
            <span>→</span>
          </p>
          <p className="text-xs text-brand-100 mt-2">Practice tech & behavioral questions in real-time mode</p>
        </a>
        
        <a 
          href="/resume"
          onClick={(e) => handleFeatureClick(e, 'ATS Resume Analysis', '/resume')} 
          className="card bg-white border border-slate-200/80 hover:border-brand-300 shadow-craft hover:shadow-craftHover transition-all group p-6 cursor-pointer"
        >
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-600">Resume Checker</span>
          <p className="font-display font-extrabold text-xl text-slate-900 mt-1 group-hover:text-brand-600 transition-colors flex items-center justify-between">
            <span>ATS Resume Analysis</span>
            <span>→</span>
          </p>
          <p className="text-xs text-slate-500 mt-2">Score your resume against targeted job descriptions</p>
        </a>

        <a 
          href="/leaderboard"
          onClick={(e) => handleFeatureClick(e, 'Global Leaderboard', '/leaderboard')} 
          className="card bg-white border border-slate-200/80 hover:border-brand-300 shadow-craft hover:shadow-craftHover transition-all group p-6 cursor-pointer"
        >
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">Rankings</span>
          <p className="font-display font-extrabold text-xl text-slate-900 mt-1 group-hover:text-amber-600 transition-colors flex items-center justify-between">
            <span>Global Leaderboard</span>
            <span>→</span>
          </p>
          <p className="text-xs text-slate-500 mt-2">Compare your readiness metrics against top candidates</p>
        </a>
      </div>

      {/* Recent reports */}
      <div className="card bg-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900">Recent Interview Reports</h3>
            <p className="text-xs text-slate-500">Your latest practice performance scorecards</p>
          </div>
          <button 
            onClick={(e) => handleFeatureClick(e, 'Reports & History', '/history')} 
            className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg border border-brand-100 transition-colors"
          >
            View All Reports
          </button>
        </div>
        {data.recent_reports.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            No reports yet — complete your first AI interview to view score breakdown.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.recent_reports.map((r) => {
              const isHigh = r.overall_score >= 75
              const isMid = r.overall_score >= 40
              const scoreBadge = isHigh 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : isMid 
                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                : 'bg-brand-50 text-brand-700 border-brand-200'
              return (
                <a
                  href={`/interview/${r.id}/report`}
                  onClick={(e) => handleFeatureClick(e, 'Interview Report', `/interview/${r.id}/report`)}
                  key={r.id}
                  className="flex items-center justify-between py-3.5 hover:bg-slate-50 -mx-2 px-4 rounded-xl transition-all group cursor-pointer"
                >
                  <div>
                    <p className="font-bold text-sm text-slate-800 group-hover:text-brand-600 transition-colors">{r.job_role}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Difficulty: {r.difficulty} · Mode: {r.mode}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-bold text-sm px-3 py-1 rounded-full border ${scoreBadge}`}>
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
