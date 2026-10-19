import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import AppShell from '../components/AppShell'
import ReadinessDial from '../components/ReadinessDial'
import { getDashboardSummary } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'

const Skeleton = ({ className = '' }) => (
  <div className={`bg-slate-200/70 dark:bg-slate-800/60 rounded-2xl animate-pulse ${className}`} />
)

const TechnicalStudioSkeleton = () => (
  <AppShell hideSidebar={false}>
    <div className="max-w-5xl mx-auto py-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-72 h-4" />
        </div>
        <Skeleton className="w-36 h-10 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Skeleton className="lg:col-span-2 h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-44" />
    </div>
  </AppShell>
)

const StreakBadge = ({ streak }) => {
  if (!streak || streak < 2) return null
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-mono font-bold shadow-xs dark:bg-blue-950/70 dark:border-blue-800 dark:text-blue-300">
      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
      {streak} Day Streak
    </div>
  )
}

const defaultData = {
  average_score: 0,
  best_score: 0,
  total_interviews: 0,
  daily_goal: { completed_today: 0, target: 1, current_streak: 0 },
  progress_chart: [],
  ai_suggestions: [
    'Start your first Technical AI mock interview to generate algorithmic feedback.',
    'Practice Python, System Design, or Full Stack roles to test core technical depth.'
  ],
  recent_reports: []
}

const TechnicalStudio = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    getDashboardSummary()
      .then((res) => setData(res.data))
      .catch(() => setData(defaultData))
      .finally(() => setLoading(false))
  }, [user])

  if (loading || !data) return <TechnicalStudioSkeleton />

  const goalDone = data.daily_goal.completed_today >= data.daily_goal.target

  return (
    <AppShell hideSidebar={false}>
      <div className="max-w-5xl mx-auto py-4 sm:py-6">
        {/* Header (Clean, purposeful, strictly without "Readiness Studio" or promotional boxes) */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap border-b border-slate-200/60 dark:border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/dashboard"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>←</span>
                <span>Main Hub</span>
              </Link>
              <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
              <span className="text-[11px] font-mono uppercase font-semibold text-slate-500 dark:text-slate-400">
                Technical Studio
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
              Technical Mock Practice
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Personal interview performance metrics, real-time code evaluation, and past scorecards.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <StreakBadge streak={data.daily_goal.current_streak} />
            <button
              onClick={() => navigate('/interview/setup', { state: { role: 'Python Developer' } })}
              className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Start Technical Mock</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards: Average, High Score, Low Score, Kitne Diye */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5">
          <div className="card flex flex-col items-center justify-center py-3.5 px-3">
            <ReadinessDial score={data.average_score} size={76} label="Technical Avg" />
          </div>
          <div className="card flex flex-col items-center justify-center py-3.5 px-3">
            <ReadinessDial score={data.best_score} size={76} label="High Score" />
          </div>
          <div className="card flex flex-col justify-between p-3.5 sm:p-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Low Score
                </span>
                <span className="text-sm">📉</span>
              </div>
              <p className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-1">
                {(() => {
                  const scs = (data.progress_chart || []).map((p) => p.score).filter((s) => typeof s === 'number' && s >= 0)
                  return scs.length > 0 ? Math.min(...scs) : 0
                })()}
                <span className="text-xs text-slate-400 font-mono font-normal"> / 100</span>
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-2">
              Baseline practice round
            </p>
          </div>
          <div className="card flex flex-col justify-between p-3.5 sm:p-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Kitne Interview Diye
                </span>
                <span className="text-sm">📋</span>
              </div>
              <p className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-1">
                {data.total_interviews}
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Daily Target</span>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {data.daily_goal?.completed_today || 0}/{data.daily_goal?.target || 1}
              </span>
            </div>
          </div>
        </div>

        {/* Growth Trend Chart and AI Coach Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <div className="card lg:col-span-2 p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Score Growth Trend</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your historical score trajectory across technical rounds</p>
              </div>
              <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-neutral-900 px-2 py-0.5 rounded-md border border-blue-200 dark:border-neutral-800">
                Last {data.progress_chart.length} rounds
              </span>
            </div>
            {data.progress_chart.length === 0 ? (
              <div className="h-44 flex items-center justify-center bg-slate-50/50 dark:bg-[#121212] rounded-xl border border-dashed border-slate-200 dark:border-neutral-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">Complete your first technical mock to visualize score trends.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data.progress_chart} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333333" opacity={0.35} />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: '#121212', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '12px', color: '#F8FAFC' }}
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
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Core Strengths & AI Insights</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Verified competencies & recommendations</p>
            </div>

            {/* Strengths Pills */}
            {(data.strengths || []).length > 0 && (
              <div className="mb-3 pb-3 border-b border-slate-100 dark:border-neutral-800">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1.5">
                  Verified Strengths
                </span>
                <div className="space-y-1">
                  {data.strengths.slice(0, 3).map((st, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-200/50 dark:border-emerald-900/40 font-medium">
                      <span className="text-emerald-600 font-bold shrink-0">✓</span>
                      <span className="leading-tight">{st}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.ai_suggestions.length === 0 ? (
              <div className="text-center py-6 my-auto bg-slate-50/50 dark:bg-[#121212] rounded-xl border border-dashed border-slate-200 dark:border-neutral-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">Suggestions will generate based on your interview answers.</p>
              </div>
            ) : (
              <ul className="space-y-2 my-auto">
                {data.ai_suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#1A1A1A] p-2.5 rounded-xl border border-slate-100 dark:border-neutral-800">
                    <span className="text-blue-600 dark:text-blue-400 font-mono font-bold shrink-0">•</span>
                    <span className="leading-snug font-medium">{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Technical Reports */}
        <div className="card p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Recent Interview Reports</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Review your past answer scorecards, recordings, and feedback</p>
            </div>
            <Link 
              to="/history" 
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-neutral-900 hover:bg-blue-100 dark:hover:bg-neutral-800 px-3 py-1 rounded-lg border border-blue-200 dark:border-neutral-800 transition-colors"
            >
              View All History
            </Link>
          </div>
          {data.recent_reports.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center bg-slate-50/50 dark:bg-[#121212] rounded-xl border border-dashed border-slate-200 dark:border-neutral-800">
              No technical reports recorded yet — start an interview to receive a full scorecard.
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
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {r.job_role}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        Difficulty: {r.difficulty} · Mode: {r.mode}
                      </p>
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
    </AppShell>
  )
}

export default TechnicalStudio
