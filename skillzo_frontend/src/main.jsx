import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import './index.css'

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Global Error Event:', event)
    const el = document.getElementById('debug-error-banner') || document.createElement('div')
    el.id = 'debug-error-banner'
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#b91c1c;color:#fff;padding:16px;z-index:999999;font-family:monospace;font-size:13px;border-bottom:2px solid #fff;box-shadow:0 10px 30px rgba(0,0,0,0.5);'
    el.innerHTML = `<strong>Runtime Error:</strong> ${event.message}<br/><pre style="margin-top:8px;font-size:11px;overflow:auto;max-height:200px;">${event.error?.stack || event.filename + ':' + event.lineno}</pre>`
    document.body.appendChild(el)
  })
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason)
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

