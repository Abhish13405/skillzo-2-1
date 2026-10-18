import React, { useState } from 'react'
import Sidebar from './Sidebar'
import { useTheme } from '../context/ThemeContext'

import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
    <div className="flex min-h-screen bg-surface-soft dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 font-body transition-colors duration-200">
      {!hideSidebar && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        {hideSidebar ? (
          <div className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-display font-extrabold text-sm shadow-sm">
                S
              </div>
              <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                Skillzo AI
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-100 dark:bg-[#0D1527] text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? '🌙' : '☀️'}
              </button>
              <button
                onClick={handleSignOut}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-900/50 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shadow-2xs"
                title="Sign out of your session"
              >
                Sign out 🚪
              </button>
            </div>
          </div>
        ) : (
          /* Mobile top header bar when sidebar is enabled */
          <div className="lg:hidden flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0A0F1D]/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                aria-label="Open menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <img src="/logo-icon.png" alt="Skillzo Logo" className="w-7 h-7 object-contain shrink-0" />
                <span className="font-display font-bold text-lg text-slate-900 dark:text-white">Skillzo</span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#0D1527] text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 transition-colors"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
          </div>
        )}

        {/* Main content viewport */}
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5 max-w-[1380px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppShell


