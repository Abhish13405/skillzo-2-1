import React from 'react'

/**
 * Signature visual element of Skillzo: radial readiness dial gauge.
 * Whitish & Reddish/Coral themed score indicator.
 */
const ReadinessDial = ({ score = 0, size = 120, label }) => {
  const pct = Math.max(0, Math.min(100, score))
  let color = '#38BDF8' // Low / Sky cyan
  if (pct >= 40) color = '#F59E0B' // Mid: Amber
  if (pct >= 75) color = '#3B82F6' // High: Antigravity Electric Blue

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="readiness-dial transition-all duration-300 hover:scale-105"
        style={{ '--pct': pct, '--dial-color': color, width: size, height: size }}
      >
        <div className="readiness-dial-value flex flex-col items-center">
          <span className="text-2xl font-extrabold font-display tracking-tight" style={{ color }}>
            {Math.round(pct)}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-semibold -mt-1">/ 100</span>
        </div>
      </div>
      {label && (
        <span className="text-xs text-slate-500 dark:text-slate-300 font-mono font-semibold uppercase tracking-wider bg-slate-100 dark:bg-[#131E38] px-2.5 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-800">
          {label}
        </span>
      )}
    </div>
  )
}

export default ReadinessDial

