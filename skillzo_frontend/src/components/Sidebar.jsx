import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
}

const navItems = [
  { to: '/dashboard',       label: 'Dashboard',       Icon: Icons.Dashboard },
  { to: '/interview/setup', label: 'AI Interview',     Icon: Icons.Interview },
  { to: '/resume',          label: 'Resume Analysis',  Icon: Icons.Resume },
  { to: '/history',         label: 'Reports',          Icon: Icons.History },
  { to: '/leaderboard',     label: 'Leaderboard',      Icon: Icons.Leaderboard },
  { to: '/profile',         label: 'Profile',          Icon: Icons.Profile },
]

const SidebarContent = ({ onClose }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-surface-border flex items-center justify-between">
        <div>
          <span className="font-display font-bold text-xl text-ink_text">Skillzo</span>
          <span className="block eyebrow mt-0.5">Interview Readiness</span>
        </div>
        {/* Close button for mobile */}
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-ink_text-muted hover:text-ink_text">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-amber/10 text-amber border border-amber/20 shadow-glow'
                  : 'text-ink_text-muted hover:text-ink_text hover:bg-ink-light/60 border border-transparent'
              }`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-surface-border">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-9 h-9 rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center font-display font-semibold text-cyan text-sm shrink-0">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink_text truncate">{user?.username}</p>
            <p className="text-xs text-ink_text-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-sm text-ink_text-muted hover:text-danger px-2 py-1.5 rounded transition-colors"
        >
          <Icons.Logout />
          Log out
        </button>
      </div>
    </div>
  )
}

const Sidebar = ({ open, onClose }) => {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-surface border-r border-surface-border min-h-screen flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" onClick={onClose} />
          {/* Drawer */}
          <aside className="relative z-50 w-72 bg-surface border-r border-surface-border flex flex-col h-full animate-slide-in">
            <SidebarContent onClose={onClose} />
          </aside>
        </div>
      )}
    </>
  )
}

export default Sidebar
