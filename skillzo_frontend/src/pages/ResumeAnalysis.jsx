import React, { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import Loader from '../components/Loader'
import ReadinessDial from '../components/ReadinessDial'
import { listResumes, uploadResume, analyzeResume } from '../api/resume'

const ResumeAnalysis = () => {
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(null)
  const [error, setError] = useState('')

  const load = () => listResumes().then((res) => setResumes(res.data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const res = await uploadResume(file)
      setResumes([res.data, ...resumes])
    } catch {
      setError('Upload failed. Only PDF and DOCX files are supported.')
    } finally {
      setUploading(false)
      e.target.value = null
    }
  }

  const handleAnalyze = async (id) => {
    setAnalyzing(id)
    setError('')
    try {
      const res = await analyzeResume(id)
      setResumes(resumes.map((r) => (r.id === id ? res.data : r)))
    } catch {
      setError('Analysis failed. Check the Groq API key on the backend.')
    } finally {
      setAnalyzing(null)
    }
  }

  if (loading) return <AppShell><Loader label="Loading resume files" /></AppShell>

  const getFilename = (url) => {
    if (!url) return 'Unknown File'
    const parts = url.split('/')
    return parts[parts.length - 1]
  }

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-5 gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-3 sm:pb-4">
        <div>
          <span className="eyebrow mb-1">Resume Intelligence</span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">ATS Resume Scanner</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Upload your resume to calculate ATS compatibility & key gaps.</p>
        </div>
        <label className="btn-primary cursor-pointer text-center inline-block shadow-sm py-2 px-3.5 text-xs sm:text-sm">
          {uploading ? 'Uploading...' : '+ Upload Resume'}
          <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-xs font-medium">{error}</div>}

      {resumes.length === 0 ? (
        <div className="card border border-dashed border-slate-300 dark:border-slate-700 text-center py-12 flex flex-col items-center shadow-xs rounded-2xl dark:bg-[#0D1527]">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-blue-950/60 border border-brand-100 dark:border-blue-900/60 flex items-center justify-center text-brand-600 dark:text-blue-400 text-2xl mb-3 shadow-sm">
            📄
          </div>
          <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">No resumes uploaded yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mb-4 mt-1">Upload a PDF or DOCX file to run an instant AI-powered ATS scan.</p>
          <label className="btn-primary cursor-pointer text-center inline-block shadow-sm py-2 px-3.5 text-xs sm:text-sm">
            {uploading ? 'Uploading...' : 'Select PDF / DOCX File'}
            <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {resumes.map((r) => (
            <div key={r.id} className="card border border-slate-200/80 dark:border-slate-800/80 dark:bg-[#0D1527] shadow-craft relative overflow-hidden p-3.5 sm:p-4 rounded-2xl">
              {r.is_analyzed && r.ats_score >= 80 && (
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="text-blue-600 dark:text-blue-400 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{getFilename(r.file)}</p>
                  </div>
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-500">
                    Uploaded {new Date(r.uploaded_at).toLocaleDateString()}
                  </p>
                </div>

                {!r.is_analyzed && (
                  <button onClick={() => handleAnalyze(r.id)} disabled={analyzing === r.id} className="btn-secondary text-xs font-bold">
                    {analyzing === r.id ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>
                        Analyzing ATS Score...
                      </span>
                    ) : 'Run ATS Analysis →'}
                  </button>
                )}
              </div>

              {r.is_analyzed ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="flex flex-col items-center justify-center md:col-span-1 p-4 bg-slate-50 dark:bg-[#131E38]/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <ReadinessDial score={r.ats_score} size={110} label="ATS Score" />
                  </div>
                  
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths & Skills */}
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                          <span className="text-emerald-500">✓</span> Extracted Skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.extracted_skills?.length > 0 ? (
                            r.extracted_skills.map((s, i) => (
                              <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">{s}</span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">No skills extracted</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                          <span className="text-blue-500">⭐</span> Suggested Matching Roles
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.suggested_job_roles?.length > 0 ? (
                            r.suggested_job_roles.map((role, i) => (
                              <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#131E38] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300">{role}</span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">None</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Feedback & Weaknesses */}
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                          <span className="text-blue-500 font-bold">!</span> Missing Keywords
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.missing_keywords?.length > 0 ? (
                            r.missing_keywords.map((k, i) => (
                              <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-blue-950/40 text-brand-700 dark:text-blue-400 border border-brand-200 dark:border-blue-900/50">{k}</span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">Looking good! No major missing keywords.</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                          <span className="text-amber-500">→</span> Actionable Recommendations
                        </p>
                        <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
                          {r.feedback?.length > 0 ? (
                            r.feedback.map((f, i) => (
                              <li key={i} className="flex items-start gap-2 bg-slate-50 dark:bg-[#131E38]/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
                                <span className="text-blue-500 font-bold shrink-0">•</span>
                                <span className="leading-relaxed">{f}</span>
                              </li>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">No additional feedback provided.</span>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-slate-50/50 dark:bg-[#131E38]/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Resume uploaded successfully but not analyzed yet.</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Click "Run ATS Analysis" to extract skills & missing keywords.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}

export default ResumeAnalysis

