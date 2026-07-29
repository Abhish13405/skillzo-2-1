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
            background: #0D1321; color: #E8ECF1;
            font-family: 'Space Grotesk', sans-serif;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
          }
        }
      `}</style>

      <div style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #0D1321 0%, #161E2E 100%)',
        border: '2px solid #F5A623',
        borderRadius: '16px',
        padding: '60px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', gap: '24px',
        boxShadow: '0 0 60px rgba(245,166,35,0.15)'
      }}>
        {/* Top border decoration */}
        <div style={{ width: '80px', height: '4px', background: 'linear-gradient(90deg, #4FD1C5, #F5A623)', borderRadius: '2px' }} />

        {/* Brand */}
        <div>
          <div style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#4FD1C5', letterSpacing: '6px', textTransform: 'uppercase', marginBottom: '8px' }}>
            SKILLZO
          </div>
          <div style={{ fontSize: '11px', color: '#8A95A5', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '3px', textTransform: 'uppercase' }}>
            Interview Readiness Platform
          </div>
        </div>

        {/* Title */}
        <div>
          <div style={{ fontSize: '11px', color: '#8A95A5', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '12px' }}>
            Certificate of Achievement
          </div>
          <div style={{ fontSize: '13px', color: '#8A95A5' }}>This certifies that</div>
        </div>

        {/* Name */}
        <div style={{ fontSize: '42px', fontWeight: '700', color: '#E8ECF1', letterSpacing: '-1px' }}>
          {user?.username || 'Candidate'}
        </div>

        <div style={{ fontSize: '14px', color: '#8A95A5', maxWidth: '500px', lineHeight: '1.6' }}>
          has successfully completed an AI-powered mock interview on the Skillzo platform, demonstrating readiness for the role of
        </div>

        {/* Role */}
        <div style={{ fontSize: '26px', fontWeight: '600', color: '#F5A623' }}>
          {session.job_role}
        </div>

        {/* Score */}
        <div style={{
          background: 'rgba(79,209,197,0.1)',
          border: '1px solid rgba(79,209,197,0.3)',
          borderRadius: '12px',
          padding: '20px 40px',
          display: 'flex', gap: '60px', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#8A95A5', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px', textTransform: 'uppercase' }}>Overall Score</div>
            <div style={{ fontSize: '48px', fontWeight: '700', color: '#4FD1C5', fontFamily: 'JetBrains Mono, monospace' }}>{session.overall_score}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#8A95A5', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px', textTransform: 'uppercase' }}>Difficulty</div>
            <div style={{ fontSize: '22px', fontWeight: '600', color: '#E8ECF1' }}>{session.difficulty}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#8A95A5', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px', textTransform: 'uppercase' }}>Date</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#E8ECF1', fontFamily: 'JetBrains Mono, monospace' }}>{date}</div>
          </div>
        </div>

        {/* Verdict */}
        {session.verdict && (
          <div style={{ fontSize: '14px', color: '#8A95A5', fontStyle: 'italic', maxWidth: '500px' }}>
            "{session.verdict}"
          </div>
        )}

        {/* Bottom decoration */}
        <div style={{ width: '80px', height: '4px', background: 'linear-gradient(90deg, #F5A623, #4FD1C5)', borderRadius: '2px' }} />

        <div style={{ fontSize: '10px', color: '#5C667A', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px' }}>
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

  if (!session) return <AppShell><Loader label="Building report" /></AppShell>

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

      <p className="eyebrow mb-1">Interview Report</p>
      <h1 className="text-3xl font-display font-semibold mb-8">{session.job_role} · {session.difficulty}</h1>

      {/* Top row: Dial + Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card flex flex-col items-center justify-center md:col-span-1">
          <ReadinessDial score={session.overall_score} size={160} label="Overall Score" />
          <p className="text-sm text-ink_text-muted mt-3 font-mono">
            Confidence: <span className="text-cyan">{session.confidence_trend}</span>
          </p>
          {session.verdict && (
            <p className="text-xs text-ink_text-muted mt-2 text-center italic px-2">"{session.verdict}"</p>
          )}
        </div>

        <div className="card md:col-span-2">
          <h3 className="font-display font-semibold mb-4">Score Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3650" />
              <XAxis dataKey="label" stroke="#8A95A5" fontSize={12} />
              <YAxis stroke="#8A95A5" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#1D2740', border: '1px solid #2A3650', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#4FD1C5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Certificate Banner */}
      {qualifiesForCertificate && (
        <div className="card mb-6 border-amber/40 bg-amber/5 flex items-center justify-between">
          <div>
            <p className="font-display font-semibold text-amber">🏆 Certificate Unlocked!</p>
            <p className="text-sm text-ink_text-muted">
              Score {session.overall_score}/100 — you've earned a certificate for this interview.
            </p>
          </div>
          <button onClick={handleDownloadCertificate} className="btn-primary shrink-0">
            Download Certificate
          </button>
        </div>
      )}

      {/* AI Suggestions */}
      <div className="card mb-6">
        <h3 className="font-display font-semibold mb-4">AI Suggestions</h3>
        {session.ai_suggestions?.length > 0 ? (
          <ul className="space-y-2">
            {session.ai_suggestions.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm"><span className="text-amber font-mono shrink-0">→</span>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink_text-muted">No suggestions available.</p>
        )}
      </div>

      {/* Question-by-Question */}
      <div className="card">
        <h3 className="font-display font-semibold mb-4">Question-by-Question Review</h3>
        <div className="space-y-5">
          {session.questions.map((q, i) => (
            <div key={q.id} className="border-b border-surface-border last:border-0 pb-5 last:pb-0">
              <div className="flex items-start gap-3 mb-2">
                <span className="font-mono text-amber shrink-0 text-sm mt-0.5">{i + 1}.</span>
                <p className="text-sm font-medium">{q.question_text}</p>
              </div>
              {q.answer ? (
                <div className="ml-6">
                  {/* Mini score row */}
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {[
                      ['Overall', q.answer.overall_score],
                      ['Technical', q.answer.technical_knowledge],
                      ['Communication', q.answer.communication],
                    ].map(([label, val]) => (
                      <span key={label} className="text-xs font-mono px-2 py-0.5 rounded-full bg-ink-light">
                        <span className="text-ink_text-muted">{label}: </span>
                        <span className={val >= 75 ? 'text-cyan' : val >= 40 ? 'text-amber' : 'text-danger'}>{val}</span>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-ink_text-muted line-clamp-2">{q.answer.answer_text}</p>
                  {q.answer.ideal_answer_summary && (
                    <p className="text-xs text-cyan/70 mt-1.5 italic line-clamp-2">
                      💡 {q.answer.ideal_answer_summary}
                    </p>
                  )}
                </div>
              ) : (
                <p className="ml-6 text-xs text-ink_text-muted">Not answered</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
        <Link to="/interview/setup" className="btn-primary">Start Another Interview</Link>
      </div>
    </AppShell>
  )
}

export default InterviewReport
