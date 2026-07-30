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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <span className="eyebrow mb-2">Resume Intelligence</span>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight">ATS Resume Scanner</h1>
          <p className="text-slate-500 text-sm mt-1">Upload your resume to calculate ATS compatibility & key gaps.</p>
        </div>
        <label className="btn-primary cursor-pointer text-center inline-block shadow-md shadow-brand-500/20">
          {uploading ? 'Uploading...' : '+ Upload Resume'}
          <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && <div className="mb-6 px-4 py-3.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-sm font-medium">{error}</div>}

      {resumes.length === 0 ? (
        <div className="card bg-white border border-dashed border-slate-300 text-center py-16 flex flex-col items-center shadow-xs rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 text-2xl mb-4 shadow-sm">
            📄
          </div>
          <h3 className="font-display font-bold text-lg text-slate-900">No resumes uploaded yet</h3>
          <p className="text-slate-500 text-xs max-w-sm mb-6 mt-1">Upload a PDF or DOCX file to run an instant AI-powered ATS scan.</p>
          <label className="btn-primary cursor-pointer text-center inline-block shadow-md shadow-brand-500/20">
            {uploading ? 'Uploading...' : 'Select PDF / DOCX File'}
            <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          {resumes.map((r) => (
            <div key={r.id} className="card bg-white border border-slate-200/80 shadow-craft relative overflow-hidden p-6 rounded-2xl">
              {r.is_analyzed && r.ats_score >= 80 && (
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="text-brand-600 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <p className="font-bold text-slate-900 truncate max-w-xs">{getFilename(r.file)}</p>
                  </div>
                  <p className="text-xs font-mono text-slate-400">
                    Uploaded {new Date(r.uploaded_at).toLocaleDateString()}
                  </p>
                </div>

                {!r.is_analyzed && (
                  <button onClick={() => handleAnalyze(r.id)} disabled={analyzing === r.id} className="btn-secondary text-xs font-bold">
                    {analyzing === r.id ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse"/>
                        Analyzing ATS Score...
                      </span>
                    ) : 'Run ATS Analysis →'}
                  </button>
                )}
              </div>

              {r.is_analyzed ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="flex flex-col items-center justify-center md:col-span-1 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <ReadinessDial score={r.ats_score} size={110} label="ATS Score" />
                  </div>
                  
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths & Skills */}
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                          <span className="text-emerald-600">✓</span> Extracted Skills
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.extracted_skills?.length > 0 ? (
                            r.extracted_skills.map((s, i) => (
                              <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">{s}</span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">No skills extracted</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                          <span className="text-brand-600">⭐</span> Suggested Matching Roles
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.suggested_job_roles?.length > 0 ? (
                            r.suggested_job_roles.map((role, i) => (
                              <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800">{role}</span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">None</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Feedback & Weaknesses */}
                    <div className="space-y-5">
                      <div>
                        <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                          <span className="text-brand-600 font-bold">!</span> Missing Keywords
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.missing_keywords?.length > 0 ? (
                            r.missing_keywords.map((k, i) => (
                              <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-200">{k}</span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">Looking good! No major missing keywords.</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                          <span className="text-amber-600">→</span> Actionable Recommendations
                        </p>
                        <ul className="text-xs space-y-1.5 text-slate-700">
                          {r.feedback?.length > 0 ? (
                            r.feedback.map((f, i) => (
                              <li key={i} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="text-brand-600 font-bold shrink-0">•</span>
                                <span className="leading-relaxed">{f}</span>
                              </li>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">No additional feedback provided.</span>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Resume uploaded successfully but not analyzed yet.</p>
                  <p className="text-[11px] text-slate-400 font-mono">Click "Run ATS Analysis" to extract skills & missing keywords.</p>
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

