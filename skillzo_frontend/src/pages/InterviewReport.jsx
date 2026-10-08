import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import AppShell from '../components/AppShell'
import Loader from '../components/Loader'
import ReadinessDial from '../components/ReadinessDial'
import { getInterviewDetail } from '../api/interview'
import { useAuth } from '../context/AuthContext'
import { downloadInterviewReportPdf } from '../utils/generatePdfReport'

// ─── Certificate print component ────────────────────────────────────────────
const Certificate = React.forwardRef(({ session, user }, ref) => {
  const date = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div ref={ref} id="skillzo-certificate" style={{ display: 'none' }}>
      <style>{`
        @media print {
          body.printing-certificate * { visibility: hidden !important; }
          body.printing-certificate #skillzo-certificate, body.printing-certificate #skillzo-certificate * { visibility: visible !important; }
          body.printing-certificate #skillzo-certificate {
            display: flex !important;
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: #FFFFFF; color: #0F172A;
            font-family: 'Plus Jakarta Sans', sans-serif;
            flex-direction: column; align-items: center; justify-content: center;
          }
        }
      `}</style>

      <div style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FAFAF9 100%)',
        border: '3px solid #2563EB',
        borderRadius: '16px',
        padding: '60px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justify: 'center',
        textAlign: 'center', gap: '24px',
        boxShadow: '0 0 60px rgba(37,99,235,0.1)'
      }}>
        {/* Top border decoration */}
        <div style={{ width: '80px', height: '4px', background: 'linear-gradient(90deg, #2563EB, #60A5FA)', borderRadius: '2px' }} />

        {/* Brand */}
        <div>
          <div style={{ fontSize: '16px', fontFamily: 'JetBrains Mono, monospace', color: '#2563EB', letterSpacing: '6px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>
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
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#2563EB' }}>
          {session.job_role}
        </div>

        {/* Score */}
        <div style={{
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '12px',
          padding: '20px 40px',
          display: 'flex', gap: '60px', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#1E3A8A', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px', textTransform: 'uppercase' }}>Overall Score</div>
            <div style={{ fontSize: '48px', fontWeight: '800', color: '#2563EB', fontFamily: 'JetBrains Mono, monospace' }}>{session.overall_score}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#1E3A8A', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px', textTransform: 'uppercase' }}>Difficulty</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#0F172A' }}>{session.difficulty}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#1E3A8A', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px', textTransform: 'uppercase' }}>Date</div>
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
        <div style={{ width: '80px', height: '4px', background: 'linear-gradient(90deg, #60A5FA, #2563EB)', borderRadius: '2px' }} />

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
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const certRef = useRef(null)

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    getInterviewDetail(sessionId).then((res) => setSession(res.data))
  }, [sessionId])

  const handleDownloadPdf = () => {
    if (!session) return
    setDownloadingPdf(true)
    try {
      downloadInterviewReportPdf({ session, user })
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Could not download PDF. Please try again.')
    } finally {
      setTimeout(() => setDownloadingPdf(false), 500)
    }
  }

  const handleDownloadCertificate = () => {
    document.body.classList.add('printing-certificate')
    const el = document.getElementById('skillzo-certificate')
    if (el) {
      el.style.display = 'flex'
      setTimeout(() => {
        window.print()
        el.style.display = 'none'
        document.body.classList.remove('printing-certificate')
      }, 150)
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

      <div className="mb-4 sm:mb-5 border-b border-slate-200/60 dark:border-slate-800 pb-3 sm:pb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className="eyebrow mb-1">Performance Analytics</span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            {session.job_role} · {session.difficulty}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="btn-secondary flex items-center gap-2 py-2 px-3.5 text-xs sm:text-sm cursor-pointer shadow-2xs"
            title="Download PDF"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>{downloadingPdf ? 'Downloading...' : 'Download PDF'}</span>
          </button>
          <Link to="/interview/setup" className="btn-primary flex items-center gap-2 py-2 px-3.5 text-xs sm:text-sm shadow-sm">
            <span>Start Another Session →</span>
          </Link>
        </div>
      </div>

      {/* Top row: Dial + Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div className="card flex flex-col items-center justify-center md:col-span-1 shadow-craft border border-slate-200/80 dark:border-slate-800/80 dark:bg-[#0D1527] p-3.5 sm:p-4">
          <ReadinessDial score={session.overall_score} size={110} label="Overall Score" />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-mono font-semibold bg-slate-100 dark:bg-[#131E38] px-3 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
            Confidence Trend: <span className="text-blue-600 dark:text-blue-400 font-bold">{session.confidence_trend || 'Steady'}</span>
          </p>
          {session.verdict && (
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 text-center italic px-2 bg-brand-50/50 dark:bg-blue-950/30 p-2 rounded-xl border border-brand-100/60 dark:border-blue-800/40">
              "{session.verdict}"
            </p>
          )}
        </div>

        <div className="card md:col-span-2 shadow-craft border border-slate-200/80 dark:border-slate-800/80 dark:bg-[#0D1527] p-3.5 sm:p-4">
          <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-2">Competency Score Breakdown</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#0D1527', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 12, color: '#F1F5F9', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }} />
              <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Certificate Banner */}
      {qualifiesForCertificate && (
        <div className="card mb-4 sm:mb-5 border-brand-200 dark:border-blue-900/60 bg-gradient-to-r from-brand-50 to-blue-50/60 dark:from-blue-950/40 dark:to-slate-900/60 dark:bg-[#0D1527] flex flex-wrap items-center justify-between gap-4 p-4 shadow-craft">
          <div>
            <p className="font-display font-extrabold text-base sm:text-lg text-brand-900 dark:text-blue-300 flex items-center gap-2">
              <span>🏆</span> Certificate Unlocked!
            </p>
            <p className="text-xs text-brand-700 dark:text-blue-400 mt-0.5">
              Overall score {session.overall_score}/100 — you've earned your official readiness certificate.
            </p>
          </div>
          <button onClick={handleDownloadCertificate} className="btn-primary shrink-0 shadow-sm py-2 px-3.5 text-xs sm:text-sm">
            Download Certificate 📄
          </button>
        </div>
      )}

      {/* AI Suggestions */}
      <div className="card mb-6 shadow-craft border border-slate-200/80 dark:border-slate-800/80 dark:bg-[#0D1527]">
        <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-4">AI Recommendations</h3>
        {session.ai_suggestions?.length > 0 ? (
          <ul className="space-y-2.5">
            {session.ai_suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#131E38]/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                <span className="text-blue-500 font-mono font-bold shrink-0">✦</span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No suggestions recorded for this session.</p>
        )}
      </div>

      {/* Question-by-Question */}
      <div className="card shadow-craft border border-slate-200/80 dark:border-slate-800/80 dark:bg-[#0D1527]">
        <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mb-4">Question-by-Question Evaluation</h3>
        <div className="space-y-6">
          {session.questions.map((q, i) => (
            <div key={q.id} className="border-b border-slate-100 dark:border-slate-800/80 last:border-0 pb-6 last:pb-0">
              <div className="flex items-start gap-3 mb-3">
                <span className="font-mono text-blue-500 font-bold shrink-0 text-sm mt-0.5">{i + 1}.</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{q.question_text}</p>
              </div>
              {(() => {
                const ans = q.answer || (q.answers && q.answers[0]) || null
                const isBlankOrTimeout = !ans?.answer_text ||
                  ans.answer_text.includes('Time expired') ||
                  ans.answer_text.includes('Passed without verbal')

                if (!ans) {
                  return (
                    <div className="ml-6 p-3 bg-slate-50 dark:bg-[#131E38]/50 border border-slate-200/60 dark:border-slate-800 rounded-xl text-xs text-slate-400 dark:text-slate-500 italic">
                      Question skipped or left blank.
                    </div>
                  )
                }

                return (
                  <div className="ml-6 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        ['Overall', ans.overall_score],
                        ['Technical', ans.technical_knowledge],
                        ['Communication', ans.communication],
                      ].map(([label, val]) => (
                        <span key={label} className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#131E38] border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400">{label}: </span>
                          <span className={val >= 75 ? 'text-emerald-500' : val >= 40 ? 'text-amber-500' : 'text-blue-500'}>{val}</span>
                        </span>
                      ))}
                    </div>

                    {isBlankOrTimeout ? (
                      <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200/70 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        <strong className="text-amber-900 dark:text-amber-200 block mb-1">⚠️ No verbal response recorded:</strong>
                        {ans.answer_text}
                      </div>
                    ) : (
                      <div className="bg-slate-50 dark:bg-[#131E38]/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 leading-relaxed font-sans">
                        <strong className="text-blue-600 dark:text-blue-400 block mb-1.5 text-[11px] font-mono uppercase tracking-wider">
                          Your Answer:
                        </strong>
                        <p className="whitespace-pre-wrap">{ans.answer_text}</p>
                      </div>
                    )}

                    {ans.strengths?.length > 0 && (
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs">
                        <strong className="text-emerald-700 dark:text-emerald-300 block mb-1 font-semibold">✓ Key Strengths:</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300">
                          {ans.strengths.map((str, sIdx) => (
                            <li key={sIdx}>{str}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {ans.improvements?.length > 0 && (
                      <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/40 text-xs">
                        <strong className="text-amber-700 dark:text-amber-300 block mb-1 font-semibold">↗ Recommendations for Improvement:</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300">
                          {ans.improvements.map((imp, iIdx) => (
                            <li key={iIdx}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {ans.ideal_answer_summary && (
                      <div className="bg-brand-50/50 dark:bg-blue-950/30 p-3.5 rounded-xl border border-brand-100 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        <strong className="text-blue-600 dark:text-blue-300 block mb-1">💡 Ideal Answer Structure:</strong>
                        {ans.ideal_answer_summary}
                      </div>
                    )}
                  </div>
                )
              })()}
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

