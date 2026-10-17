import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../context/AuthContext'

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

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

  const tracks = [
    {
      id: 'hr',
      title: 'HR & Behavioral Round',
      badge: '10-Min Prep',
      badgeColor: 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800',
      description: 'Self-introduction, behavioral questions, strengths & cultural alignment.',
      actionText: 'Open HR Workspace',
      targetPath: '/interview/setup',
      state: { role: 'HR Interview' },
      accentColor: 'hover:border-indigo-500/80 dark:hover:border-indigo-400/80',
      textColor: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      description: 'Python, Java, Frontend, AI roles with 3 difficulty tiers & live evaluation.',
      actionText: 'Open Technical Studio',
      targetPath: '/technical',
      state: null,
      accentColor: 'hover:border-blue-500/80 dark:hover:border-blue-400/80',
      textColor: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-800/80 text-blue-600 dark:text-blue-400',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          description: 'Inspect registered candidates, review interview scores & watch recordings.',
          actionText: 'Open Leader Portal',
          targetPath: '/leader',
          state: null,
          accentColor: 'hover:border-amber-500/80 dark:hover:border-amber-400/80',
          textColor: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
          iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/60 dark:border-amber-800/80 text-amber-600 dark:text-amber-400',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          description: 'Connect face-to-face with your company HR recruiter over secure live video.',
          actionText: 'Join Live HR Room',
          targetPath: '/live-room',
          state: null,
          accentColor: 'hover:border-purple-500/80 dark:hover:border-purple-400/80',
          textColor: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
          iconBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200/60 dark:border-purple-800/80 text-purple-600 dark:text-purple-400',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      description: 'Scan PDF/DOCX resume against target job requirements for match scores.',
      actionText: 'Open Resume Scanner',
      targetPath: '/resume',
      state: null,
      accentColor: 'hover:border-emerald-500/80 dark:hover:border-emerald-400/80',
      textColor: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      )
    }
  ]

  return (
    <AppShell hideSidebar={true}>
      <div className="max-w-5xl mx-auto py-2 sm:py-5 flex flex-col justify-center min-h-[calc(100vh-76px)]">
        {/* Header (Workspace Mode badge removed, shifted up for single-viewport fit) */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
            Select Your Track
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Choose a workspace to launch your session. Everything else runs inside your selected module.
          </p>
        </div>

        {/* The 4 Big Track Boxes (Optimized height to fit completely on one screen) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          {tracks.map((track) => (
            <Link
              key={track.id}
              to={track.targetPath}
              state={track.state}
              className={`group relative bg-white dark:bg-[#0D1527] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800/90 ${track.accentColor} transition-all duration-200 flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-lg hover:-translate-y-0.5 block no-underline`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${track.iconBg} border flex items-center justify-center`}>
                    {track.icon}
                  </div>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold ${track.badgeColor}`}>
                    {track.badge}
                  </span>
                </div>
                <h3 className={`text-base sm:text-lg font-bold text-slate-900 dark:text-white ${track.textColor} transition-colors`}>
                  {track.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                  {track.description}
                </p>
              </div>
              <div className={`mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold ${track.textColor}`}>
                <span>{track.actionText}</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  )
}

export default Dashboard
