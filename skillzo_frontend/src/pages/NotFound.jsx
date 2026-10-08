import React from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'

const NotFound = () => {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="w-24 h-24 rounded-3xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-4xl mb-6 shadow-craft">
          🔍
        </div>
        <span className="eyebrow mb-2">Error 404</span>
        <h1 className="text-4xl font-display font-extrabold mb-3 text-slate-900 dark:text-white">Page Not Found</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
          The page you are looking for does not exist or has been relocated.
        </p>
        <Link to="/dashboard" className="btn-primary shadow-md shadow-blue-500/20">
          Return to Dashboard →
        </Link>
      </div>
    </AppShell>
  )
}

export default NotFound
