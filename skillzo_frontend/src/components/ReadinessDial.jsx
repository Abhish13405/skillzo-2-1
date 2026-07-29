import React from 'react'

/**
 * The signature visual element of Skillzo: a radial "readiness dial".
 * Used everywhere a score appears -- Dashboard, Reports, Interview summary.
 * Color shifts red -> amber -> cyan as the score climbs, like an instrument gauge.
 */
const ReadinessDial = ({ score = 0, size = 120, label }) => {
  const pct = Math.max(0, Math.min(100, score))
  let color = '#F0654B' // low
  if (pct >= 40) color = '#F5A623' // mid
  if (pct >= 75) color = '#4FD1C5' // high

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="readiness-dial"
        style={{ '--pct': pct, '--dial-color': color, width: size, height: size }}
      >
        <div className="readiness-dial-value flex flex-col items-center">
          <span className="text-2xl font-bold" style={{ color }}>{Math.round(pct)}</span>
          <span className="text-[10px] text-ink_text-muted font-mono -mt-1">/ 100</span>
        </div>
      </div>
      {label && <span className="text-xs text-ink_text-muted font-mono uppercase tracking-wide">{label}</span>}
    </div>
  )
}

export default ReadinessDial
