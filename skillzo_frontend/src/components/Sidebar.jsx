import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Interview: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Resume: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  History: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Leaderboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 20 18 10"/><polyline points="12 20 12 4"/><polyline points="6 20 6 14"/>
    </svg>
  ),
  Recordings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  Profile: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Logout: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  LeaderPortal: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
}

const navItems = [
  { to: '/dashboard',       label: 'Dashboard',       Icon: Icons.Dashboard },
  { to: '/interview/setup', label: 'AI Interview',     Icon: Icons.Interview },
  { to: '/resume',          label: 'Resume Analysis',  Icon: Icons.Resume },
  { to: '/history',         label: 'Reports',          Icon: Icons.History },
  { to: '/recordings',      label: 'Recordings',       Icon: Icons.Recordings },
  { to: '/leaderboard',     label: 'Leaderboard',      Icon: Icons.Leaderboard },
  { to: '/profile',         label: 'Profile',          Icon: Icons.Profile },
]

const SidebarContent = ({ onClose }) => {
  const { user, logout, openAuthModal } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const isLeader = Boolean(
    user?.is_staff ||
    user?.is_superuser ||
    (user?.email && user.email.toLowerCase().includes('abhish')) ||
    (user?.username && user.username.toLowerCase().includes('abhish'))
  )

  const visibleNavItems = isLeader
    ? [
        ...navItems,
        { to: '/leader', label: 'Leader Portal', Icon: Icons.LeaderPortal },
      ]
    : navItems

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavClick = (e, to, label) => {
    if (onClose) onClose()
    if (!user && to !== '/dashboard') {
      e.preventDefault()
      openAuthModal(label)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Logo Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-display font-extrabold text-base shadow-sm dark:shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            S
          </div>
          <div>
            <span className="font-display font-extrabold text-base text-slate-900 dark:text-white tracking-tight block leading-tight">Skillzo</span>
            <span className="block text-[9px] font-semibold uppercase tracking-wider text-brand-600 dark:text-blue-400 font-mono">AI Interview Studio</span>
          </div>
        </div>
        {/* Close button for mobile */}
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={(e) => handleNavClick(e, to, label)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-brand-50 dark:bg-blue-950/60 text-brand-700 dark:text-blue-400 border border-brand-200/80 dark:border-blue-500/30 shadow-2xs dark:shadow-[0_0_15px_rgba(37,99,235,0.2)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-brand-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600'}>
                  <Icon />
                </span>
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-3.5 bg-brand-600 dark:bg-blue-400 rounded-full dark:shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Theme Toggle & User Footer */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#080D1A]/80">
        {/* Dark Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-2.5 py-1.5 mb-2 rounded-xl bg-white dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:border-brand-300 dark:hover:border-blue-500/60 transition-all shadow-2xs"
        >
          <span className="flex items-center gap-1.5">
            <span>{theme === 'dark' ? '🌙 Antigravity Dark' : '☀️ Studio Light'}</span>
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#131E38] text-slate-500 dark:text-blue-400 border border-transparent dark:border-slate-700">
            {theme === 'dark' ? 'ACTIVE' : 'OFF'}
          </span>
        </button>

        {user ? (
          <>
            <div className="flex items-center gap-2.5 mb-2 p-1.5 rounded-xl bg-white dark:bg-[#0D1527] border border-slate-200/60 dark:border-slate-800 shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-blue-950 text-brand-700 dark:text-blue-400 border border-brand-200 dark:border-blue-800 flex items-center justify-center font-display font-bold text-xs shrink-0">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">{user?.username || 'User'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email || 'user@skillzo.ai'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-blue-400 hover:bg-brand-50 dark:hover:bg-[#131E38] py-1.5 rounded-lg transition-all duration-150 border border-transparent hover:border-brand-100 dark:hover:border-slate-800"
            >
              <Icons.Logout />
              Sign out
            </button>
          </>
        ) : (
          <div className="p-2 rounded-xl bg-white dark:bg-[#0D1527] border border-slate-200/60 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#131E38] text-slate-600 dark:text-slate-300 flex items-center justify-center font-display font-bold text-xs shrink-0">
                G
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Guest Mode</p>
                <p className="text-[10px] text-slate-400 truncate">Sign up to save prep data</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => navigate('/login')}
                className="py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-[#131E38] hover:bg-slate-200 dark:hover:bg-[#1C2C50] text-slate-800 dark:text-slate-200 text-xs font-bold text-center transition-colors border border-transparent dark:border-slate-800"
              >
                Log In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold text-center transition-colors shadow-xs dark:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


const Sidebar = ({ open, onClose }) => {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 xl:w-60 shrink-0 bg-white dark:bg-[#0A0F1D] border-r border-slate-200/80 dark:border-slate-800/80 min-h-screen flex-col shadow-xs sticky top-0 h-screen transition-colors duration-200">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
          {/* Drawer */}
          <aside className="relative z-50 w-72 bg-white dark:bg-[#0A0F1D] border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-2xl transition-colors duration-200">
            <SidebarContent onClose={onClose} />
          </aside>
        </div>
      )}
    </>
  )
}

export default Sidebar

