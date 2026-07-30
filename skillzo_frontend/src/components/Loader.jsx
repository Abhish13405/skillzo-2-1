import React from 'react'

const Loader = ({ label = 'Loading' }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-6">
    {/* Animated Skillzo mark */}
    <div className="relative w-16 h-16">
      {/* Outer ring */}
      <svg className="absolute inset-0 animate-spin" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" stroke="#E2E8F0" strokeWidth="3" />
        <path
          d="M32 4 A28 28 0 0 1 60 32"
          stroke="#E11D48" strokeWidth="3.5" strokeLinecap="round"
        />
      </svg>
      {/* Inner ring */}
      <svg className="absolute inset-0 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }} viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="18" stroke="#F1F5F9" strokeWidth="3" />
        <path
          d="M32 14 A18 18 0 0 1 50 32"
          stroke="#FB7185" strokeWidth="3.5" strokeLinecap="round"
        />
      </svg>
      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-brand-600 animate-pulse shadow-sm shadow-brand-500" />
      </div>
    </div>

    {/* Label */}
    <div className="text-center">
      <p className="text-xs font-mono font-semibold text-slate-500 tracking-widest uppercase bg-slate-100 px-3 py-1 rounded-full border border-slate-200">{label}</p>
      <div className="flex gap-1.5 justify-center mt-3">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-brand-600"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  </div>
)

export default Loader

