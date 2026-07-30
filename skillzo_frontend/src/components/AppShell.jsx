import React, { useState } from 'react'
import Sidebar from './Sidebar'
import { useTheme } from '../context/ThemeContext'

const AppShell = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex min-h-screen bg-surface-soft dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-body transition-colors duration-200">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top header bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white font-display font-extrabold text-sm shadow-sm">
                S
              </div>
              <span className="font-display font-bold text-lg text-slate-900 dark:text-white">Skillzo</span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>

        {/* Main content viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppShell


