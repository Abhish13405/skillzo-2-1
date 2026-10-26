import React, { useState } from 'react'

import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom'

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

  LiveRoom: () => (

    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">

      <polygon points="23 7 16 12 23 17 23 7" />

      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />

    </svg>

  ),

}



const SunIcon = () => (

  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">

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



const MoonIcon = () => (

  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">

    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />

  </svg>

)



const navItems = [

  { to: '/dashboard',       label: 'Dashboard',       Icon: Icons.Dashboard },

  { to: '/interview/setup', label: 'AI Interview',     Icon: Icons.Interview },

  { to: '/resume',          label: 'Resume Analysis',  Icon: Icons.Resume },

  { to: '/history',         label: 'Reports',          Icon: Icons.History },

  { to: '/recordings',      label: 'Recordings',       Icon: Icons.Recordings },

  { to: '/profile',         label: 'Profile',          Icon: Icons.Profile },

]



const SidebarContent = ({ onClose }) => {

  const { user, logout, loginAsGuest, openAuthModal } = useAuth()

  const { theme, toggleTheme } = useTheme()

  const [guestActivating, setGuestActivating] = useState(false)

  const navigate = useNavigate()

  const location = useLocation()



  const isHrWorkspace = location.pathname.startsWith('/hr') ||

                        location.search.includes('track=hr') ||

                        Boolean(location.state?.isHRTrack)



  const baseItems = isHrWorkspace

    ? [

        { to: '/hr',                      label: 'Dashboard',        Icon: Icons.Dashboard },

        { to: '/interview/setup?track=hr', label: 'HR Interview',     Icon: Icons.Interview },

        { to: '/resume',                  label: 'Resume Analysis',  Icon: Icons.Resume },

        { to: '/history?track=hr',        label: 'Reports',          Icon: Icons.History },

        { to: '/recordings?track=hr',     label: 'Recordings',       Icon: Icons.Recordings },

        { to: '/profile',                 label: 'Profile',          Icon: Icons.Profile },

      ]

    : [

        { to: '/technical',           label: 'Dashboard',        Icon: Icons.Dashboard },

        { to: '/interview/setup',     label: 'Tech Interview',   Icon: Icons.Interview },

        { to: '/resume',              label: 'Resume Analysis',  Icon: Icons.Resume },

        { to: '/history',             label: 'Reports',          Icon: Icons.History },

        { to: '/recordings',          label: 'Recordings',       Icon: Icons.Recordings },

        { to: '/profile',             label: 'Profile',          Icon: Icons.Profile },

      ]



  const handleEnterGuest = async () => {

    setGuestActivating(true)

    try {

      await loginAsGuest()

      if (onClose) onClose()

      navigate('/interview/setup')

    } catch (err) {

      console.error('Guest activation error:', err)

      if (onClose) onClose()

      navigate('/interview/setup')

    } finally {

      setGuestActivating(false)

    }

  }



  const userEmail = (user?.email || '').toLowerCase().trim()

  const userName = (user?.username || '').toLowerCase().trim()

  const isLeader = Boolean(

    user && !user.is_guest && (

      user?.is_leader ||

      user?.is_staff ||

      user?.is_superuser ||

      userEmail === 'abhishekkushwaha13405@gmail.com' ||

      userEmail === 'abhish@gmail.com' ||

      userEmail === 'abhishekkushwaha31387@bbdu.ac.in' ||

      userName === 'abhishek13405' ||

      userName === 'abhish' ||

      userName === 'abhishekkushwaha31387'

    )

  )



  const visibleNavItems = baseItems



  const handleLogout = () => {

    logout()

    navigate('/login')

  }



  const handleNavClick = async (e, to, label) => {

    if (onClose) onClose()

    if (!user) {

      e.preventDefault()

      navigate('/login')

    }

  }



  return (

    <div className="flex flex-col h-full bg-white dark:bg-[#0A0A0A] text-slate-900 dark:text-slate-100 transition-colors duration-200">

      {/* Logo Header */}

      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">

        <div className="flex items-center gap-2.5">

          <img src="/logo-icon.png" alt="Skillzo Logo" className="w-8 h-8 object-contain shrink-0 drop-shadow-sm" />

          <div>

            <div className="flex items-center gap-1.5 leading-tight">
              <span className="font-display font-extrabold text-base text-slate-900 dark:text-white tracking-tight">Skillzo</span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 tracking-wider">
                AI
              </span>
            </div>

            <span className="block text-[9px] font-semibold uppercase tracking-wider text-brand-600 dark:text-blue-400 font-mono">

              {isHrWorkspace ? 'HR Interview Studio' : 'AI Interview Studio'}

            </span>

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



      {/* Main Hub Switcher Banner */}

      <div className="px-3 pt-2.5 pb-1">

        <Link

          to="/dashboard"

          onClick={onClose}

          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-2xs ${

            location.pathname === '/dashboard'

              ? 'bg-blue-50 dark:bg-neutral-900 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-neutral-700 font-extrabold ring-1 ring-blue-500/20'

              : 'bg-slate-100 dark:bg-[#121212] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-neutral-800 hover:border-neutral-700 hover:bg-slate-200/70'

          }`}

          title="Return to Main Hub (4 Workspaces)"

        >

          <span className="flex items-center gap-2">

            <span>🏠</span>

            <span className="font-display font-bold">Main Hub</span>

          </span>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white dark:bg-[#1A1A1A] text-blue-600 dark:text-blue-400 font-semibold border border-slate-200 dark:border-neutral-800">

            Workspaces ⇄

          </span>

        </Link>

      </div>



      {/* Navigation Links */}

      <nav className="flex-1 px-2.5 py-2 space-y-1 overflow-y-auto">

        {visibleNavItems.map(({ to, label, Icon }) => (

          <NavLink

            key={to}

            to={to}

            onClick={(e) => handleNavClick(e, to, label)}

            className={({ isActive }) =>

              `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-all duration-200 ${

                isActive

                  ? 'bg-brand-50 dark:bg-neutral-900 text-brand-700 dark:text-blue-400 border border-brand-200/80 dark:border-neutral-700 shadow-2xs'

                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#161616] border border-transparent'

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

      <div className="p-3 border-t border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-[#0A0A0A]">

        {/* Modern Theme Toggle Switch */}

        <button

          onClick={toggleTheme}

          className="w-full flex items-center justify-between px-3 py-2 mb-2 rounded-xl bg-white dark:bg-[#121212] border border-slate-200/80 dark:border-neutral-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-neutral-700 transition-all shadow-2xs cursor-pointer group"

          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}

        >

          <div className="flex items-center gap-2">

            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-neutral-700 shadow-2xs group-hover:scale-105 transition-transform">

              {theme === 'dark' ? <MoonIcon /> : <SunIcon />}

            </div>

            <span className="text-xs font-medium">

              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}

            </span>

          </div>

          <div className="w-7 h-4 rounded-full bg-slate-200 dark:bg-neutral-800 p-0.5 flex items-center transition-colors">

            <div className={`w-3 h-3 rounded-full bg-blue-600 transition-transform ${theme === 'dark' ? 'translate-x-3' : 'translate-x-0'}`} />

          </div>

        </button>



        {user && !user.is_guest ? (

          <>

            <div className="flex items-center gap-2.5 mb-2 p-1.5 rounded-xl bg-white dark:bg-[#121212] border border-slate-200/60 dark:border-neutral-800 shadow-2xs">

              <div className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-neutral-800 text-brand-700 dark:text-blue-400 border border-brand-200 dark:border-neutral-700 flex items-center justify-center font-display font-bold text-xs shrink-0">

                {user?.username?.[0]?.toUpperCase() || 'U'}

              </div>

              <div className="min-w-0 flex-1">

                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">{user?.username || 'User'}</p>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email || 'user@skillzo.ai'}</p>

              </div>

            </div>

            <button

              onClick={handleLogout}

              className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-blue-400 hover:bg-brand-50 dark:hover:bg-[#1A1A1A] py-1.5 rounded-lg transition-all duration-150 border border-transparent hover:border-brand-100 dark:hover:border-neutral-800 cursor-pointer"

            >

              <Icons.Logout />

              Sign out

            </button>

          </>

        ) : user?.is_guest ? (

          <div className="p-2 rounded-xl bg-slate-100/80 dark:bg-[#121212] border border-slate-200/60 dark:border-neutral-800">

            <div className="flex items-center gap-2 mb-2 px-1">

              <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-neutral-800 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">

                G

              </div>

              <div className="min-w-0 flex-1">

                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Guest Candidate</p>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Practice Session</p>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-1.5">

              <button

                onClick={() => { if (onClose) onClose(); navigate('/login') }}

                className="py-1 px-1.5 rounded-lg bg-white dark:bg-[#131E38] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-[10px] font-semibold text-center cursor-pointer transition-colors"

              >

                Sign In

              </button>

              <button

                onClick={() => { if (onClose) onClose(); navigate('/signup') }}

                className="py-1 px-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold text-center shadow-xs cursor-pointer transition-colors"

              >

                Sign Up

              </button>

            </div>

          </div>

        ) : (

          <div className="grid grid-cols-2 gap-1.5">

            <button

              onClick={() => { if (onClose) onClose(); navigate('/login') }}

              className="py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-[#131E38] hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-semibold text-center transition-colors border border-transparent dark:border-slate-800 cursor-pointer"

            >

              Sign In

            </button>

            <button

              onClick={() => { if (onClose) onClose(); navigate('/signup') }}

              className="py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold text-center transition-colors shadow-xs cursor-pointer"

            >

              Sign Up

            </button>

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



