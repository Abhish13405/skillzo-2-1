import React, { useState } from 'react'
import Sidebar from './Sidebar'
import { useTheme } from '../context/ThemeContext'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const SunIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const MoonIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

const AppShell = ({ children, hideSidebar = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen lg:h-screen lg:max-h-screen bg-surface-soft dark:bg-[#050505] text-slate-900 dark:text-slate-100 font-body transition-colors duration-200 lg:overflow-hidden">
      {!hideSidebar && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 lg:h-full lg:overflow-hidden">
        {hideSidebar ? (
          <header className="border-b border-slate-200/80 dark:border-neutral-800 bg-white/80 dark:bg-[#0A0A0A]/85 backdrop-blur-md sticky top-0 z-30 shrink-0">
            <div className="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-2.5 max-w-6xl mx-auto w-full">
              <div className="flex items-center gap-2.5">
                <img src="/logo-icon.png" alt="Skillzo Logo" className="w-8 h-8 object-contain shrink-0 drop-shadow-sm" />
                <div>
                  <span className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight block leading-tight">
                    Skillzo AI
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold block leading-none">
                    AI Interview Platform
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {user && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#121212] border border-slate-200/80 dark:border-neutral-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{user.username || user.email?.split('@')[0] || 'Candidate'}</span>
                  </div>
                )}

                {/* Professional Theme Toggle Switch */}
                <button
                  onClick={toggleTheme}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#121212] text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer flex items-center gap-2 shadow-2xs group"
                  aria-label="Toggle theme"
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  <div className="w-5 h-5 rounded-lg flex items-center justify-center bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-neutral-700 text-amber-500 dark:text-blue-400 shadow-2xs">
                    {theme === 'dark' ? <MoonIcon className="w-3.5 h-3.5" /> : <SunIcon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider font-bold">
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-900/50 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                  title="Sign out of your session"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </header>
        ) : (
          /* Mobile top header bar when sidebar is enabled */
          <div className="lg:hidden flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Open menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <img src="/logo-icon.png" alt="Skillzo Logo" className="w-7 h-7 object-contain shrink-0" />
                <span className="font-display font-bold text-lg text-slate-900 dark:text-white">Skillzo</span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#121212] border border-slate-200 dark:border-neutral-800 hover:border-neutral-700 flex items-center justify-center text-amber-500 dark:text-blue-400 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Main content viewport */}
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-2 sm:py-3 max-w-[1380px] mx-auto w-full flex flex-col min-h-0 overflow-y-auto lg:overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppShell
