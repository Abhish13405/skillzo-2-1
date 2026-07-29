import React from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'

const NotFound = () => {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="w-24 h-24 rounded-full bg-surface-raised border border-surface-border flex items-center justify-center text-4xl mb-6 shadow-glow">
          🛸
        </div>
        <p className="eyebrow mb-2">Error 404</p>
        <h1 className="text-4xl font-display font-semibold mb-4 text-ink_text">Page not found</h1>
        <p className="text-ink_text-muted mb-8 leading-relaxed">
          Looks like you've wandered into uncharted territory. The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/dashboard" className="btn-primary">
          Return to Dashboard
        </Link>
      </div>
    </AppShell>
  )
}

export default NotFound
