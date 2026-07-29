import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const ToastContext = createContext(null)

export const useToast = () => useContext(ToastContext)

// ─── Individual Toast ────────────────────────────────────────────────────────
const Toast = ({ id, type, message, onClose }) => {
  const colors = {
    success: { border: 'border-cyan/40', bg: 'bg-cyan/10', text: 'text-cyan', icon: '✓' },
    error:   { border: 'border-danger/40', bg: 'bg-danger/10', text: 'text-danger', icon: '✕' },
    info:    { border: 'border-amber/40', bg: 'bg-amber/10', text: 'text-amber', icon: '→' },
  }
  const c = colors[type] || colors.info

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${c.border} ${c.bg} shadow-lg backdrop-blur-sm max-w-sm`}
    >
      <span className={`font-mono font-bold ${c.text} shrink-0 mt-0.5`}>{c.icon}</span>
      <p className="text-sm text-ink_text flex-1">{message}</p>
      <button onClick={() => onClose(id)} className="text-ink_text-muted hover:text-ink_text transition-colors shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </motion.div>
  )
}

// ─── Provider ────────────────────────────────────────────────────────────────
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)

  const remove = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++counter.current
    setToasts(t => [...t, { id, type, message }])
    setTimeout(() => remove(id), duration)
  }, [remove])

  // Convenience methods
  toast.success = (msg, dur) => toast(msg, 'success', dur)
  toast.error   = (msg, dur) => toast(msg, 'error', dur)
  toast.info    = (msg, dur) => toast(msg, 'info', dur)

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => (
            <Toast key={t.id} {...t} onClose={remove} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
