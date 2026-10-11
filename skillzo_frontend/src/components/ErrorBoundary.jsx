import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080D1A] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-2xl bg-red-950/80 text-red-400 border border-red-800 flex items-center justify-center text-3xl mb-4">
            ⚠️
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-xs text-slate-400 max-w-md mb-4">
            {this.state.error?.message || 'An unexpected error occurred while rendering the page.'}
          </p>
          <pre className="text-left bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-red-300 max-w-xl max-h-48 overflow-auto mb-6">
            {this.state.error?.stack}
          </pre>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
            >
              🔄 Refresh Page
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
