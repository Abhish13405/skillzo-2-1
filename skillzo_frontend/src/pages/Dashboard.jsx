import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import AppShell from '../components/AppShell'
import ReadinessDial from '../components/ReadinessDial'
import { getDashboardSummary } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'

// ─── Skeleton Components ─────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`bg-surface-raised rounded animate-pulse ${className}`} />
)

const DashboardSkeleton = () => (
  <AppShell>
    <div className="mb-8 flex items-start justify-between">
      <div>
        <Skeleton className="w-24 h-3 mb-2" />
        <Skeleton className="w-56 h-8" />
      </div>
      <Skeleton className="w-32 h-10 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
    <Skeleton className="mt-6 h-48 rounded-xl" />
  </AppShell>
)

// ─── Streak Badge ─────────────────────────────────────────────────────────────
const StreakBadge = ({ streak }) => {
  if (!streak || streak < 2) return null
  const celebrate = streak >= 7
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-mono ${
      celebrate
        ? 'bg-amber/15 border-amber/40 text-amber'
        : 'bg-surface border-surface-border text-ink_text-muted'
    }`}>
      🔥 {streak} day streak{celebrate ? ' 🎉' : ''}
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
const Dashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    getDashboardSummary()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />

  const goalDone = data.daily_goal.completed_today >= data.daily_goal.target

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Readiness Overview</p>
          <h1 className="text-3xl font-display font-semibold">
            Welcome back, {user?.username?.split(' ')[0]} 👋
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge streak={data.daily_goal.current_streak} />
          <Link to="/interview/setup" className="btn-primary">Start Interview</Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card flex flex-col items-center justify-center">
          <ReadinessDial score={data.average_score} size={96} label="Average Score" />
        </div>
        <div className="card flex flex-col items-center justify-center">
          <ReadinessDial score={data.best_score} size={96} label="Best Score" />
        </div>
        <div className="card flex flex-col justify-center">
          <p className="text-3xl font-mono font-bold text-ink_text">{data.total_interviews}</p>
          <p className="text-xs text-ink_text-muted font-mono uppercase tracking-wide mt-1">Total Interviews</p>
        </div>
        <div className="card flex flex-col justify-center">
          <p className={`text-3xl font-mono font-bold ${goalDone ? 'text-cyan' : 'text-amber'}`}>
            {data.daily_goal.completed_today}/{data.daily_goal.target}
          </p>
          <p className="text-xs text-ink_text-muted font-mono uppercase tracking-wide mt-1">
            Daily Goal · 🔥 {data.daily_goal.current_streak}d streak
          </p>
        </div>
      </div>

      {/* Progress + AI Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-2">
          <h3 className="font-display font-semibold mb-4">Progress Over Time</h3>
          {data.progress_chart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-3xl mb-3">📈</p>
              <p className="text-sm text-ink_text-muted">
                No interviews yet. Complete your first one to see your trend.
              </p>
              <Link to="/interview/setup" className="btn-secondary mt-4 text-sm">Start Interview</Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.progress_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A3650" />
                <XAxis dataKey="date" stroke="#8A95A5" fontSize={11} />
                <YAxis stroke="#8A95A5" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#1D2740', border: '1px solid #2A3650', borderRadius: 8 }}
                  labelStyle={{ color: '#E8ECF1' }}
                />
                <Line type="monotone" dataKey="score" stroke="#4FD1C5" strokeWidth={2.5}
                  dot={{ fill: '#4FD1C5', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#F5A623' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 className="font-display font-semibold mb-4">AI Suggestions</h3>
          {data.ai_suggestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-3">🤖</p>
              <p className="text-sm text-ink_text-muted">Suggestions appear after your first completed interview.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.ai_suggestions.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink_text">
                  <span className="text-amber font-mono shrink-0 mt-0.5">→</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link to="/interview/setup" className="card border-cyan/20 hover:border-cyan/50 hover:shadow-cyanGlow transition-all group">
          <div className="text-2xl mb-2">🎯</div>
          <p className="font-display font-semibold group-hover:text-cyan transition-colors">Start AI Interview</p>
          <p className="text-xs text-ink_text-muted mt-1">Text or Audio mode</p>
        </Link>
        <Link to="/resume" className="card hover:border-amber/30 transition-all group">
          <div className="text-2xl mb-2">📄</div>
          <p className="font-display font-semibold group-hover:text-amber transition-colors">Resume Analysis</p>
          <p className="text-xs text-ink_text-muted mt-1">Get your ATS score</p>
        </Link>
        <Link to="/leaderboard" className="card hover:border-amber/30 transition-all group">
          <div className="text-2xl mb-2">🏆</div>
          <p className="font-display font-semibold group-hover:text-amber transition-colors">Leaderboard</p>
          <p className="text-xs text-ink_text-muted mt-1">Your best scores</p>
        </Link>
      </div>

      {/* Recent reports */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display font-semibold">Recent Reports</h3>
          <Link to="/history" className="text-sm text-cyan hover:underline">View all</Link>
        </div>
        {data.recent_reports.length === 0 ? (
          <p className="text-sm text-ink_text-muted py-6 text-center">
            No reports yet — your first interview report will show up here.
          </p>
        ) : (
          <div className="divide-y divide-surface-border">
            {data.recent_reports.map((r) => {
              const scoreColor = r.overall_score >= 75 ? 'text-cyan' : r.overall_score >= 40 ? 'text-amber' : 'text-danger'
              return (
                <Link
                  to={`/interview/${r.id}/report`}
                  key={r.id}
                  className="flex items-center justify-between py-3 hover:bg-ink-light/40 -mx-2 px-2 rounded transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{r.job_role}</p>
                    <p className="text-xs text-ink_text-muted font-mono">{r.difficulty} · {r.mode}</p>
                  </div>
                  <span className={`font-mono font-semibold text-lg ${scoreColor}`}>{r.overall_score}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default Dashboard
