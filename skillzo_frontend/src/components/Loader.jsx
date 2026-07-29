import React from 'react'

const Loader = ({ label = 'Loading' }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-6">
    {/* Animated Skillzo logo mark */}
    <div className="relative w-16 h-16">
      {/* Outer ring - spinning */}
      <svg className="absolute inset-0 animate-spin" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" stroke="#2A3650" strokeWidth="3" />
        <path
          d="M32 4 A28 28 0 0 1 60 32"
          stroke="#F5A623" strokeWidth="3" strokeLinecap="round"
        />
      </svg>
      {/* Inner ring - counter-spinning */}
      <svg className="absolute inset-0 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="18" stroke="#1D2740" strokeWidth="3" />
        <path
          d="M32 14 A18 18 0 0 1 50 32"
          stroke="#4FD1C5" strokeWidth="3" strokeLinecap="round"
        />
      </svg>
      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-amber animate-pulse" />
      </div>
    </div>

    {/* Label */}
    <div className="text-center">
      <p className="text-sm font-mono text-ink_text-muted tracking-widest uppercase">{label}</p>
      <div className="flex gap-1 justify-center mt-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1 h-1 rounded-full bg-amber"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  </div>
)

export default Loader
