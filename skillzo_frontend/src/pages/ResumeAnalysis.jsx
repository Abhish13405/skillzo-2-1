import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import Loader from '../components/Loader'
import ReadinessDial from '../components/ReadinessDial'
import { listResumes, uploadResume, analyzeResume, deleteResume } from '../api/resume'
import { startInterview } from '../api/interview'
import { useAuth } from '../context/AuthContext'
import SubscriptionModal from '../components/SubscriptionModal'

const MODES = [
  {
    id: 'video',
    icon: '📹',
    label: 'Video Interview',
    tag: 'Recommended',
    description: 'Sophia AI avatar + live camera & mic dialogue.',
  },
  {
    id: 'audio',
    icon: '🎙️',
    label: 'Audio Interview',
    tag: 'Voice Only',
    description: 'Spoken dialogue using microphone. No webcam.',
  },
  {
    id: 'text',
    icon: '📝',
    label: 'Text Interview',
    tag: 'Typed Code/Answers',
    description: 'Type responses directly. Zero mic or webcam required.',
  },
]

const DIFFICULTIES = [
  {
    id: 'Beginner',
    label: 'Beginner',
    desc: 'Project walkthrough, core tech stack rationale, and fundamentals.',
  },
  {
    id: 'Intermediate',
    label: 'Intermediate',
    desc: 'Architecture, database schemas, API design, and trade-offs.',
  },
  {
    id: 'Advanced',
    label: 'Advanced',
    desc: 'Scalability, performance bottlenecks, caching, and concurrency.',
  },
]

const ResumeAnalysis = () => {
  const navigate = useNavigate()
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingFileName, setUploadingFileName] = useState('')
  const [analyzing, setAnalyzing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  // Resume-Based Interview Modal States
  const [selectedResumeForInterview, setSelectedResumeForInterview] = useState(null)
  const [interviewRole, setInterviewRole] = useState('')
  const [interviewMode, setInterviewMode] = useState('video')
  const [interviewDifficulty, setInterviewDifficulty] = useState('Intermediate')
  const [interviewQuestionCount, setInterviewQuestionCount] = useState(5)
  const [interviewLanguage, setInterviewLanguage] = useState('en')
  const { user } = useAuth()
  const [showSubModal, setShowSubModal] = useState(false)
  const [startingInterview, setStartingInterview] = useState(false)
  const [interviewError, setInterviewError] = useState('')

  const fileInputRef = useRef(null)
  const emptyFileInputRef = useRef(null)

  const load = () =>
    listResumes()
      .then((res) => setResumes(res.data))
      .catch((err) => {
        console.error('Failed to load resumes:', err)
        setError(err.response?.data?.detail || err.message || 'Could not load resumes.')
      })
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const processFile = async (file) => {
    if (!file) return

    // Client-side file extension check
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.pdf') && !fileName.endsWith('.docx')) {
      setError(`Invalid file format: "${file.name}". Only PDF (.pdf) and Word (.docx) documents are supported.`)
      return
    }

    // Client-side file size check (max 25MB)
    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 25MB.`)
      return
    }

    setUploading(true)
    setUploadingFileName(file.name)
    setError('')
    setSuccessMsg('')

    try {
      const res = await uploadResume(file)
      const newResume = res.data
      setResumes((prev) => [newResume, ...prev])
      setSuccessMsg(`"${file.name}" uploaded successfully! Running instant ATS scan...`)

      // Auto-trigger analysis for seamless user experience
      try {
        setAnalyzing(newResume.id)
        const analyzedRes = await analyzeResume(newResume.id)
        setResumes((prev) => prev.map((r) => (r.id === newResume.id ? analyzedRes.data : r)))
        setSuccessMsg(`ATS scan completed for "${file.name}"! You can now start a project-based AI interview.`)
      } catch (analyzeErr) {
        console.warn('Auto-analysis skipped or failed:', analyzeErr)
        setSuccessMsg(`"${file.name}" uploaded. Click "Run ATS Analysis" below to calculate your ATS score.`)
      } finally {
        setAnalyzing(null)
      }
    } catch (err) {
      console.error('Resume upload error:', err)
      const serverMsg =
        err.response?.data?.file?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Upload failed. Please ensure the file is a valid PDF or DOCX under 25MB.'
      setError(serverMsg)
    } finally {
      setUploading(false)
      setUploadingFileName('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (emptyFileInputRef.current) emptyFileInputRef.current.value = ''
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleAnalyze = async (id) => {
    setAnalyzing(id)
    setError('')
    setSuccessMsg('')
    try {
      const res = await analyzeResume(id)
      setResumes(resumes.map((r) => (r.id === id ? res.data : r)))
      setSuccessMsg('ATS analysis completed successfully!')
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        'Analysis failed. Please verify that the file contains readable text.'
      setError(msg)
    } finally {
      setAnalyzing(null)
    }
  }

  const handleDelete = async (id, fileName) => {
    if (!window.confirm(`Are you sure you want to delete this resume?`)) return
    setDeleting(id)
    setError('')
    try {
      await deleteResume(id)
      setResumes((prev) => prev.filter((r) => r.id !== id))
      setSuccessMsg('Resume deleted.')
    } catch (err) {
      console.error('Failed to delete resume:', err)
      setError('Failed to delete resume.')
    } finally {
      setDeleting(null)
    }
  }

  const getFilename = (url) => {
    if (!url) return 'Unknown File'
    const cleanUrl = url.split('?')[0]
    const parts = cleanUrl.split('/')
    return decodeURIComponent(parts[parts.length - 1])
  }

  // Open interview modal pre-configured for this specific resume
  const handleOpenInterviewModal = (resume) => {
    setSelectedResumeForInterview(resume)
    const topRole = resume.suggested_job_roles?.[0] || 'Full Stack Developer'
    setInterviewRole(topRole)
    setInterviewMode('video')
    setInterviewDifficulty('Intermediate')
    setInterviewQuestionCount(5)
    setInterviewLanguage('en')
    setInterviewError('')
  }

  const handleCloseInterviewModal = () => {
    if (startingInterview) return
    setSelectedResumeForInterview(null)
    setInterviewError('')
  }

  const handleStartResumeInterview = async () => {
    if (!selectedResumeForInterview) return
    const isGuest = user?.is_guest || localStorage.getItem('skillzo_is_guest') === 'true'
    const guestCount = parseInt(localStorage.getItem('skillzo_guest_interviews_used') || '0', 10)
    if (isGuest && guestCount >= 5) {
      setShowSubModal(true)
      return
    }

    setStartingInterview(true)
    setInterviewError('')

    const finalRole = interviewRole.trim() || 'Software Engineer'

    try {
      const res = await startInterview({
        resume_id: selectedResumeForInterview.id,
        job_role: finalRole,
        difficulty: interviewDifficulty,
        mode: interviewMode,
        question_count: interviewQuestionCount,
        language: interviewLanguage,
        guest_count: guestCount,
        is_guest: isGuest,
      })

      if (isGuest) {
        localStorage.setItem('skillzo_guest_interviews_used', String(guestCount + 1))
      }

      navigate(`/interview/${res.data.id}/session?track=resume&lang=${interviewLanguage}`, {
        state: {
          isResumeTrack: true,
          role: finalRole,
          resumeId: selectedResumeForInterview.id,
          language: interviewLanguage,
        },
      })
    } catch (err) {
      console.error('Failed to start resume interview:', err)
      if (err.response?.status === 403 && (err.response?.data?.requires_subscription || err.response?.data?.error === 'LIMIT_REACHED' || err.response?.data?.error === 'GUEST_LIMIT_REACHED')) {
        setShowSubModal(true)
      } else {
        const msg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.response?.data?.detail ||
          err.message ||
          'Could not generate interview questions. Please verify Groq API key and try again.'
        setInterviewError(msg)
      }
      setStartingInterview(false)
    }
  }

  if (loading) return <AppShell><Loader label="Loading resume files" /></AppShell>

  return (
    <AppShell>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-5 gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="eyebrow">Resume Intelligence · Box 4</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30">
              Project & Tech Interview Ready
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            ATS Scanner & Resume AI Interview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            Upload your resume to calculate ATS scores, extract skills, and take an AI mock interview tailored directly to your projects and technologies.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary cursor-pointer text-center inline-flex items-center gap-2 shadow-sm py-2 px-3.5 text-xs sm:text-sm disabled:opacity-60"
          >
            {uploading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Uploading {uploadingFileName ? `(${uploadingFileName.slice(0, 15)}...)` : '...'}</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Upload Resume</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-xs font-medium flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700 dark:text-red-400 font-bold text-sm px-1.5"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Success Banner */}
      {successMsg && (
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-sm">✓</span>
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 font-bold text-sm px-1.5"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Highlight Unlocked Action Banner (when at least 1 resume exists) */}
      {resumes.length > 0 && (
        <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-indigo-500/10 border border-emerald-500/20 dark:border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Resume Project & Tech Interview Feature Unlocked
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30">
                  Box 4
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-xl leading-relaxed">
                Skillzo AI analyzes the exact projects, architecture, database choices, and technology stack listed on your resume to conduct a personalized technical mock interview.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenInterviewModal(resumes[0])}
            className="btn-primary shrink-0 py-2.5 px-4 text-xs sm:text-sm font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
          >
            <span>🎯 Take Interview on Latest Resume</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* Upload Drag & Drop Dropzone / Empty State */}
      {resumes.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`card border-2 border-dashed transition-all duration-200 text-center py-12 px-4 flex flex-col items-center shadow-xs rounded-2xl dark:bg-[#0D0D0D] ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]'
              : 'border-slate-300 dark:border-neutral-800 hover:border-slate-400'
          }`}
        >
          {/* Lock notice for interview */}
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5 max-w-md mx-auto text-left">
            <span className="text-base shrink-0">🔒</span>
            <div>
              <p className="font-bold">Project & Tech Interview Locked</p>
              <p className="text-[11px] text-amber-600/90 dark:text-amber-400 mt-0.5">
                In Box 4, an interview can <strong>only</strong> take place after you upload your resume. The AI will extract your projects and technologies to formulate custom interview questions.
              </p>
            </div>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-blue-950/60 border border-brand-100 dark:border-blue-900/60 flex items-center justify-center text-brand-600 dark:text-blue-400 text-2xl mb-3 shadow-sm">
            📄
          </div>
          <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
            {isDragging ? 'Drop your resume file here' : 'Upload your resume to begin'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mb-4 mt-1">
            Drag & drop your PDF or DOCX resume here, or click below to select a file from your computer.
          </p>

          <input
            type="file"
            ref={emptyFileInputRef}
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button
            type="button"
            onClick={() => emptyFileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary cursor-pointer text-center inline-flex items-center gap-2 shadow-sm py-2 px-4 text-xs sm:text-sm disabled:opacity-60"
          >
            {uploading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              'Select PDF / DOCX Resume'
            )}
          </button>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-mono">
            Supported formats: PDF, DOCX (up to 25MB)
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Drop Zone for Existing Resumes */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-3 text-center transition-all duration-200 text-xs font-medium cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            {isDragging
              ? '📥 Drop file to upload immediately'
              : '+ Drag & drop another resume here, or click to browse'}
          </div>

          {resumes.map((r) => (
            <div
              key={r.id}
              className="card border border-slate-200/80 dark:border-neutral-800 dark:bg-[#0D0D0D] shadow-craft relative overflow-hidden p-3.5 sm:p-4 rounded-2xl transition-all"
            >
              {r.is_analyzed && r.ats_score >= 80 && (
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-emerald-500" />
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                        {getFilename(r.file)}
                      </p>
                      {r.is_analyzed ? (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          r.ats_score >= 80
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : r.ats_score >= 60
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}>
                          ATS {r.ats_score}%
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Pending Scan
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400 dark:text-slate-500">
                      <span>Uploaded {new Date(r.uploaded_at).toLocaleDateString()}</span>
                      {r.file && (
                        <a
                          href={r.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>View file</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                  {/* Primary Action Button: Start Resume Interview */}
                  <button
                    type="button"
                    onClick={() => handleOpenInterviewModal(r)}
                    className="btn-primary text-xs font-bold py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                    title="Take AI Mock Interview focused on projects and tech stack from this resume"
                  >
                    <span>🎯 Take Project Interview</span>
                  </button>

                  {!r.is_analyzed && (
                    <button
                      type="button"
                      onClick={() => handleAnalyze(r.id)}
                      disabled={analyzing === r.id}
                      className="btn-secondary text-xs font-bold py-1.5 px-3 flex items-center gap-2"
                    >
                      {analyzing === r.id ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          <span>Scanning...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡ ATS Scan</span>
                        </>
                      )}
                    </button>
                  )}

                  {r.is_analyzed && (
                    <button
                      type="button"
                      onClick={() => handleAnalyze(r.id)}
                      disabled={analyzing === r.id}
                      title="Re-run ATS Scan"
                      className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      {analyzing === r.id ? 'Re-scanning...' : '🔄 Re-scan'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(r.id, getFilename(r.file))}
                    disabled={deleting === r.id}
                    title="Delete Resume"
                    className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-50"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {r.is_analyzed ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
                    <div className="flex flex-col items-center justify-center md:col-span-1 p-4 bg-slate-50 dark:bg-[#131E38]/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
                      <ReadinessDial score={r.ats_score} size={110} label="ATS Score" />
                    </div>

                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Strengths & Skills */}
                      <div className="space-y-5">
                        <div>
                          <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                            <span className="text-emerald-500 font-bold">✓</span> Extracted Skills
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {r.extracted_skills?.length > 0 ? (
                              r.extracted_skills.map((s, i) => (
                                <span
                                  key={i}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                                >
                                  {s}
                                </span>
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
                                <span
                                  key={i}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#131E38] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300"
                                >
                                  {role}
                                </span>
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
                                <span
                                  key={i}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-blue-950/40 text-brand-700 dark:text-blue-400 border border-brand-200 dark:border-blue-900/50"
                                >
                                  {k}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                                Looking good! No major missing keywords.
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                            <span className="text-amber-500 font-bold">→</span> Actionable Recommendations
                          </p>
                          <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
                            {r.feedback?.length > 0 ? (
                              r.feedback.map((f, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 bg-slate-50 dark:bg-[#131E38]/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60"
                                >
                                  <span className="text-blue-500 font-bold shrink-0">•</span>
                                  <span className="leading-relaxed">{f}</span>
                                </li>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                                No additional feedback provided.
                              </span>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom CTA Banner: Launch Interview */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">💡</span>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Ready to practice with questions on your actual projects?
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          AI will ask in-depth questions regarding your architecture, code decisions, and listed technologies.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenInterviewModal(r)}
                      className="btn-primary text-xs font-bold py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>🎯 Start Project & Tech Interview</span>
                      <span>→</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-6 sm:py-8 text-center bg-slate-50/50 dark:bg-[#131E38]/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Resume uploaded successfully!
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mb-3">
                    You can extract ATS scores or take an immediate AI interview based directly on this resume.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAnalyze(r.id)}
                      disabled={analyzing === r.id}
                      className="btn-secondary text-xs font-bold py-1.5 px-4 inline-flex items-center gap-2"
                    >
                      {analyzing === r.id ? (
                        <>
                          <span className="w-2.5 h-2.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                          <span>Analyzing ATS Score...</span>
                        </>
                      ) : (
                        '⚡ Run ATS Analysis'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenInterviewModal(r)}
                      className="btn-primary text-xs font-bold py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <span>🎯 Take Project Interview</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL: Launch Resume-Based Project & Tech Interview ─── */}
      {selectedResumeForInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-xl bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 overflow-hidden relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-center text-xl shrink-0">
                  🎯
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                      AI Project & Tech Mock Interview
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                      Box 4 Exclusive
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-sm sm:max-w-md">
                    Based on: <strong className="text-slate-700 dark:text-slate-300">{getFilename(selectedResumeForInterview.file)}</strong>
                    {selectedResumeForInterview.ats_score > 0 && ` · ATS ${selectedResumeForInterview.ats_score}%`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseInterviewModal}
                disabled={startingInterview}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg text-lg leading-none cursor-pointer disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {/* Error in Modal */}
            {interviewError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
                <span>{interviewError}</span>
                <button onClick={() => setInterviewError('')} className="text-rose-500 font-bold text-sm ml-2">×</button>
              </div>
            )}

            {/* Target Role Field */}
            <div className="mb-4">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Target Role / Technology Focus
              </label>
              <input
                type="text"
                value={interviewRole}
                onChange={(e) => setInterviewRole(e.target.value)}
                placeholder="e.g. Full Stack Developer, Python Engineer, Frontend Specialist"
                disabled={startingInterview}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-60"
              />
              {selectedResumeForInterview.suggested_job_roles?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] text-slate-400 font-mono">Suggested from resume:</span>
                  {selectedResumeForInterview.suggested_job_roles.slice(0, 3).map((rRole, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInterviewRole(rRole)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer"
                    >
                      {rRole}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Interview Language Selector */}
            <div className="mb-4">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Interview Language
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'en', label: '🇬🇧 English', tag: 'Global Standard', desc: 'Standard tech English' },
                  { id: 'hinglish', label: '🇮🇳 Hinglish', tag: 'Conversational', desc: 'Hindi + English mix' },
                  { id: 'hi', label: '🇮🇳 Hindi', tag: 'हिंदी Mock', desc: 'Hindi questions & speech' },
                ].map((l) => {
                  const isSelected = interviewLanguage === l.id
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setInterviewLanguage(l.id)}
                      disabled={startingInterview}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{l.label}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          isSelected ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'text-slate-400'
                        }`}>{l.tag}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{l.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>
            {/* Interview Format / Mode Selector */}
            <div className="mb-4">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Interview Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {MODES.map((m) => {
                  const isSelected = interviewMode === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setInterviewMode(m.id)}
                      disabled={startingInterview}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">{m.icon}</span>
                        {m.tag && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            {m.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {m.label}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal line-clamp-2">
                        {m.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Difficulty Tier Selector */}
            <div className="mb-4">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Technical Depth
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DIFFICULTIES.map((d) => {
                  const isSelected = interviewDifficulty === d.id
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setInterviewDifficulty(d.id)}
                      disabled={startingInterview}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {d.label}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {d.desc}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Question Count Selector */}
            <div className="mb-5 flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Number of Interview Questions
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Includes personalized project intro, project deep-dive, and tech stack questions.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {[5, 10].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setInterviewQuestionCount(cnt)}
                    disabled={startingInterview}
                    className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                      interviewQuestionCount === cnt
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {cnt} Qs
                  </button>
                ))}
              </div>
            </div>

            {/* AI Explanation Callout */}
            <div className="mb-5 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 text-blue-900 dark:text-blue-300 text-xs flex items-start gap-2.5">
              <span className="text-base shrink-0">💡</span>
              <p className="leading-relaxed text-[11px]">
                <strong>How it works:</strong> Our AI extracts the actual projects and frameworks from this resume. It formulates questions testing your design decisions, database architecture, debugging bottlenecks, and hands-on tool usage.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseInterviewModal}
                disabled={startingInterview}
                className="btn-secondary text-xs font-bold py-2 px-4 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartResumeInterview}
                disabled={startingInterview}
                className="btn-primary text-xs font-bold py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 inline-flex items-center gap-2 cursor-pointer disabled:opacity-60 transition-all hover:scale-[1.01]"
              >
                {startingInterview ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing Projects & Formulating Questions...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 Launch Project Interview</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <SubscriptionModal
        isOpen={showSubModal}
        onClose={() => setShowSubModal(false)}
        quota={user?.interview_quota}
      />
    </AppShell>
  )
}

export default ResumeAnalysis
