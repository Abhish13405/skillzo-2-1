import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import AppShell from '../components/AppShell'
import Loader from '../components/Loader'
import ReadinessDial from '../components/ReadinessDial'
import { getInterviewDetail } from '../api/interview'
import { useAuth } from '../context/AuthContext'

// ─── Certificate print component ────────────────────────────────────────────
const Certificate = React.forwardRef(({ session, user }, ref) => {
  const date = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div ref={ref} id="skillzo-certificate" style={{ display: 'none' }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #skillzo-certificate, #skillzo-certificate * { visibility: visible !important; }
          #skillzo-certificate {
            display: block !important;
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: #FFFFFF; color: #0F172A;
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
          }
        }
      `}</style>

      <div style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFAF9 100%)',
        border: '3px solid #E11D48',
        borderRadius: '16px',
        padding: '60px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center',
        textAlign: 'center', gap: '24px',
        boxShadow: '0 0 60px rgba(225,29,72,0.1)'
      }}>
        {/* Top border decoration */}
        <div style={{ width: '80px', height: '4px', background: 'linear-gradient(90deg, #E11D48, #F43F5E)', borderRadius: '2px' }} />

        {/* Brand */}
        <div>
          <div style={{ fontSize: '16px', fontFamily: 'JetBrains Mono, monospace', color: '#E11D48', letterSpacing: '6px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
            SKILLZO AI STUDIO
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '3px', textTransform: 'uppercase' }}>
            Interview Readiness Platform
          </div>
        </div>

        {/* Title */}
        <div>
          <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '12px' }}>
            Certificate of Achievement
          </div>
          <div style={{ fontSize: '14px', color: '#475569' }}>This certifies that</div>
        </div>

        {/* Name */}
        <div style={{ fontSize: '42px', fontWeight: '800', color: '#0F172A', letterSpacing: '-1px' }}>
          {user?.username || 'Candidate'}
        </div>

        <div style={{ fontSize: '14px', color: '#64748B', maxWidth: '500px', lineHeight: '1.6' }}>
          has successfully completed an AI-powered mock interview on the Skillzo platform, demonstrating readiness for the role of
        </div>

        {/* Role */}
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#E11D48' }}>
          {session.job_role}
        </div>

        {/* Score */}
        <div style={{
          background: '#FFF1F2',
          border: '1px solid #FECDD3',
          borderRadius: '12px',
          padding: '20px 40px',
          display: 'flex', gap: '60px', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#881337', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px', textTransform: 'uppercase' }}>Overall Score</div>
            <div style={{ fontSize: '48px', fontWeight: '800', color: '#E11D48', fontFamily: 'JetBrains Mono, monospace' }}>{session.overall_score}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#881337', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px', textTransform: 'uppercase' }}>Difficulty</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#0F172A' }}>{session.difficulty}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#881337', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px', textTransform: 'uppercase' }}>Date</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', fontFamily: 'JetBrains Mono, monospace' }}>{date}</div>
          </div>
        </div>

        {/* Verdict */}
        {session.verdict && (
          <div style={{ fontSize: '14px', color: '#475569', fontStyle: 'italic', maxWidth: '500px' }}>
            "{session.verdict}"
          </div>
        )}

        {/* Bottom decoration */}
        <div style={{ width: '80px', height: '4px', background: 'linear-gradient(90deg, #F43F5E, #E11D48)', borderRadius: '2px' }} />

        <div style={{ fontSize: '10px', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px' }}>
          SKILLZO.AI · INTERVIEW READINESS · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
})
Certificate.displayName = 'Certificate'

// ─── Main Report Component ───────────────────────────────────────────────────
const InterviewReport = () => {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const certRef = useRef(null)

  useEffect(() => {
    getInterviewDetail(sessionId).then((res) => setSession(res.data))
  }, [sessionId])

  const handleDownloadCertificate = () => {
    const el = document.getElementById('skillzo-certificate')
    if (el) {
      el.style.display = 'flex'
      setTimeout(() => {
        window.print()
        el.style.display = 'none'
      }, 100)
    }
  }

  if (!session) return <AppShell><Loader label="Building report analytics" /></AppShell>

  const chartData = [
    { label: 'Technical', value: session.technical_score },
    { label: 'Communication', value: session.communication_score },
    { label: 'Overall', value: session.overall_score },
  ]

  const qualifiesForCertificate = session.overall_score >= 60

  return (
    <AppShell>
      {/* Hidden certificate for print */}
      <Certificate ref={certRef} session={session} user={user} />

      <span className="eyebrow mb-2">Performance Analytics</span>
      <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight mb-8">
        {session.job_role} · {session.difficulty}
      </h1>

      {/* Top row: Dial + Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card bg-white flex flex-col items-center justify-center md:col-span-1 shadow-craft border border-slate-200/80 p-6">
          <ReadinessDial score={session.overall_score} size={150} label="Overall Score" />
          <p className="text-xs text-slate-500 mt-4 font-mono font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Confidence Trend: <span className="text-brand-600 font-bold">{session.confidence_trend || 'Steady'}</span>
          </p>
          {session.verdict && (
            <p className="text-xs text-slate-600 mt-3 text-center italic px-2 bg-brand-50/50 p-2.5 rounded-xl border border-brand-100/60">
              "{session.verdict}"
            </p>
          )}
        </div>

        <div className="card bg-white md:col-span-2 shadow-craft border border-slate-200/80 p-6">
          <h3 className="font-display font-bold text-lg text-slate-900 mb-4">Competency Score Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="label" stroke="#94A3B8" fontSize={12} />
              <YAxis stroke="#94A3B8" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
              <Bar dataKey="value" fill="#E11D48" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Certificate Banner */}
      {qualifiesForCertificate && (
        <div className="card mb-6 border-brand-200 bg-gradient-to-r from-brand-50 to-rose-50 flex flex-wrap items-center justify-between gap-4 p-6 shadow-craft">
          <div>
            <p className="font-display font-extrabold text-lg text-brand-900 flex items-center gap-2">
              <span>🏆</span> Certificate Unlocked!
            </p>
            <p className="text-xs text-brand-700 mt-1">
              Overall score {session.overall_score}/100 — you've earned your official readiness certificate.
            </p>
          </div>
          <button onClick={handleDownloadCertificate} className="btn-primary shrink-0 shadow-md shadow-brand-500/20">
            Download Certificate 📄
          </button>
        </div>
      )}

      {/* AI Suggestions */}
      <div className="card bg-white mb-6 shadow-craft border border-slate-200/80">
        <h3 className="font-display font-bold text-lg text-slate-900 mb-4">AI Recommendations</h3>
        {session.ai_suggestions?.length > 0 ? (
          <ul className="space-y-2.5">
            {session.ai_suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-brand-600 font-mono font-bold shrink-0">✦</span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No suggestions recorded for this session.</p>
        )}
      </div>

      {/* Question-by-Question */}
      <div className="card bg-white shadow-craft border border-slate-200/80">
        <h3 className="font-display font-bold text-lg text-slate-900 mb-4">Question-by-Question Evaluation</h3>
        <div className="space-y-6">
          {session.questions.map((q, i) => (
            <div key={q.id} className="border-b border-slate-100 last:border-0 pb-6 last:pb-0">
              <div className="flex items-start gap-3 mb-3">
                <span className="font-mono text-brand-600 font-bold shrink-0 text-sm mt-0.5">{i + 1}.</span>
                <p className="text-sm font-bold text-slate-900">{q.question_text}</p>
              </div>
              {q.answer ? (
                <div className="ml-6 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      ['Overall', q.answer.overall_score],
                      ['Technical', q.answer.technical_knowledge],
                      ['Communication', q.answer.communication],
                    ].map(([label, val]) => (
                      <span key={label} className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                        <span className="text-slate-500">{label}: </span>
                        <span className={val >= 75 ? 'text-emerald-600' : val >= 40 ? 'text-amber-600' : 'text-brand-600'}>{val}</span>
                      </span>
                    ))}
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-900 block mb-1">Your Response:</strong>
                    {q.answer.answer_text}
                  </div>
                  {q.answer.ideal_answer_summary && (
                    <div className="bg-brand-50/50 p-3.5 rounded-xl border border-brand-100 text-xs text-slate-700 leading-relaxed">
                      <strong className="text-brand-800 block mb-1">💡 Ideal Answer Structure:</strong>
                      {q.answer.ideal_answer_summary}
                    </div>
                  )}
                </div>
              ) : (
                <p className="ml-6 text-xs text-slate-400 italic">Question skipped or left blank.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Link to="/dashboard" className="btn-secondary">← Back to Dashboard</Link>
        <Link to="/interview/setup" className="btn-primary shadow-md shadow-brand-500/20">Start Another Session →</Link>
      </div>
    </AppShell>
  )
}

export default InterviewReport

