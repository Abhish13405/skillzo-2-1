import React, { useState } from 'react'
import Sidebar from './Sidebar'

const AppShell = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar with hamburger */}
        <div className="lg:hidden flex items-center gap-4 px-4 py-4 border-b border-surface-border bg-surface sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-ink_text-muted hover:text-ink_text transition-colors"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="font-display font-bold text-lg text-ink_text">Skillzo</span>
        </div>

        {/* Main content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppShell
