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

  if (loading) return <AppShell><Loader label="Loading resumes" /></AppShell>

  // Helper to get filename from URL/path
  const getFilename = (url) => {
    if (!url) return 'Unknown File'
    const parts = url.split('/')
    return parts[parts.length - 1]
  }

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <p className="eyebrow mb-1">Module 3</p>
          <h1 className="text-3xl font-display font-semibold">Resume Analysis</h1>
        </div>
        <label className="btn-primary cursor-pointer text-center inline-block">
          {uploading ? 'Uploading...' : '+ Upload Resume'}
          <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && <div className="mb-6 px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>}

      {resumes.length === 0 ? (
        <div className="card text-center py-16 flex flex-col items-center">
          <p className="text-4xl mb-4">📄</p>
          <p className="text-ink_text-muted max-w-sm mb-6">No resumes uploaded yet. Upload a PDF or DOCX to get an AI-powered ATS score.</p>
          <label className="btn-primary cursor-pointer text-center inline-block">
            {uploading ? 'Uploading...' : 'Select File'}
            <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          {resumes.map((r) => (
            <div key={r.id} className="card relative overflow-hidden">
              {/* If score > 80 show a subtle glow on the left border */}
              {r.is_analyzed && r.ats_score >= 80 && (
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan" />
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 border-b border-surface-border pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="text-ink_text-muted shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <p className="font-medium text-ink_text truncate max-w-xs">{getFilename(r.file)}</p>
                  </div>
                  <p className="text-xs font-mono text-ink_text-muted">
                    Uploaded {new Date(r.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                {!r.is_analyzed && (
                  <button onClick={() => handleAnalyze(r.id)} disabled={analyzing === r.id} className="btn-secondary text-sm">
                    {analyzing === r.id ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan animate-pulse"/>
                        Analyzing...
                      </span>
                    ) : 'Run ATS Analysis'}
                  </button>
                )}
              </div>

              {r.is_analyzed ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="flex flex-col items-center justify-center md:col-span-1">
                    <ReadinessDial score={r.ats_score} size={110} label="ATS Score" />
                  </div>
                  
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths & Skills */}
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs text-ink_text-muted font-mono uppercase tracking-wider mb-2 flex items-center gap-2">
                          <span className="text-cyan">✓</span> Extracted Skills
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {r.extracted_skills?.length > 0 ? (
                            r.extracted_skills.map((s, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-cyan/10 border border-cyan/30 text-cyan">{s}</span>
                            ))
                          ) : (
                            <span className="text-sm text-ink_text-muted italic">No skills extracted</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-ink_text-muted font-mono uppercase tracking-wider mb-2 flex items-center gap-2">
                          <span className="text-cyan">⭐</span> Suggested Roles
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {r.suggested_job_roles?.length > 0 ? (
                            r.suggested_job_roles.map((role, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-surface-raised border border-surface-border text-ink_text">{role}</span>
                            ))
                          ) : (
                            <span className="text-sm text-ink_text-muted italic">None</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Feedback & Weaknesses */}
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs text-ink_text-muted font-mono uppercase tracking-wider mb-2 flex items-center gap-2">
                          <span className="text-amber">!</span> Missing Keywords
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {r.missing_keywords?.length > 0 ? (
                            r.missing_keywords.map((k, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-danger/10 border border-danger/30 text-danger">{k}</span>
                            ))
                          ) : (
                            <span className="text-sm text-ink_text-muted italic">Looking good! No major missing keywords.</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-ink_text-muted font-mono uppercase tracking-wider mb-2 flex items-center gap-2">
                          <span className="text-amber">→</span> Actionable Feedback
                        </p>
                        <ul className="text-sm space-y-1.5">
                          {r.feedback?.length > 0 ? (
                            r.feedback.map((f, i) => <li key={i} className="flex gap-2 text-ink_text"><span className="text-amber shrink-0 mt-0.5">•</span>{f}</li>)
                          ) : (
                            <span className="text-sm text-ink_text-muted italic">No feedback provided.</span>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-ink_text-muted mb-2">Resume uploaded successfully but not analyzed yet.</p>
                  <p className="text-xs text-ink_text-muted font-mono">Click "Run ATS Analysis" to generate insights.</p>
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
