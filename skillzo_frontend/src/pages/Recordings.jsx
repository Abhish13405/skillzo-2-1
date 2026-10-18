import React, { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AppShell from '../components/AppShell'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import {
  getAllRecordings,
  deleteRecording,
  clearAllRecordings,
  getTotalStorageUsed,
  formatBytes,
  markRecordingUploaded,
} from '../utils/recordingsDb'
import { uploadInterviewRecording } from '../api/interview'

const Recordings = () => {
  const { user } = useAuth()
  const location = useLocation()
  const videoPlayerRef = useRef(null)

  const userEmail = (user?.email || '').toLowerCase().trim()
  const isLeader = Boolean(
    user && (
      user.is_leader ||
      user.is_staff ||
      user.is_superuser ||
      userEmail === 'abhishekkushwaha13405@gmail.com' ||
      userEmail === 'abhish@gmail.com'
    )
  )

  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState('all') // 'all', 'video', 'audio'
  const [filterTrack, setFilterTrack] = useState(() => {
    const params = new URLSearchParams(location.search)
    return params.get('track') || 'all'
  })
  const [search, setSearch] = useState('')
  const [storageInfo, setStorageInfo] = useState({ totalBytes: 0, formatted: '0 KB', count: 0 })
  const [activePlayback, setActivePlayback] = useState(null) // Recording object being played in modal
  const [uploadingId, setUploadingId] = useState(null)
  const [uploadAllLoading, setUploadAllLoading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [viewScope, setViewScope] = useState(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('view') === 'all' && isLeader) return 'all'
    return isLeader ? 'all' : 'mine'
  })

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const t = params.get('track')
    if (t) setFilterTrack(t)
  }, [location.search])

  // Load recordings from IndexedDB
  const loadData = async () => {
    setLoading(true)
    try {
      const showAll = isLeader && viewScope === 'all'
      const all = await getAllRecordings(user, showAll)
      setRecordings(all)
      const storage = await getTotalStorageUsed(user, showAll)
      setStorageInfo(storage)
    } catch (err) {
      console.error('Error loading recordings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user, viewScope])

  // Delete single recording
  const handleDelete = async (id, e) => {
    e?.stopPropagation()
    if (!window.confirm('Delete this recording?')) return
    await deleteRecording(id)
    if (activePlayback?.id === id) {
      setActivePlayback(null)
    }
    await loadData()
  }

  // Clear recordings
  const handleClearAll = async () => {
    const promptMsg = isLeader && viewScope === 'all'
      ? 'Delete all stored recordings across all candidates on this device? This cannot be undone.'
      : 'Are you sure you want to delete your recordings? This cannot be undone.'
    if (!window.confirm(promptMsg)) return
    const targetUser = isLeader && viewScope === 'all' ? null : user
    await clearAllRecordings(targetUser)
    setActivePlayback(null)
    await loadData()
  }

  // Download recording file
  const handleDownload = (rec, e) => {
    e?.stopPropagation()
    if (!rec?.blob) return
    const url = URL.createObjectURL(rec.blob)
    const a = document.createElement('a')
    a.href = url
    const ext = rec.mode === 'audio' ? 'webm' : 'webm'
    const safeRole = String(rec.jobRole || 'interview').replace(/[^a-zA-Z0-9_-]/g, '_')
    const userTag = rec.userEmail ? `_${rec.userEmail.split('@')[0]}` : ''
    a.download = `Skillzo_${rec.mode}_Q${rec.questionNumber}${userTag}_${safeRole}_${Date.now()}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  // Upload single recording to Cloudinary
  const handleUploadToCloud = async (rec, e) => {
    e?.stopPropagation()
    if (!rec?.blob || !rec?.sessionId) {
      alert('Cannot upload: Recording clip or session is missing.')
      return
    }
    setUploadingId(rec.id)
    setUploadMsg('')
    try {
      const fd = new FormData()
      fd.append('file', rec.blob, `${rec.mode || 'video'}_${rec.sessionId}_Q${rec.questionNumber}.webm`)
      fd.append('order', rec.questionNumber)
      fd.append('mode', rec.mode || 'video')
      if (rec.durationSeconds) fd.append('speaking_time_seconds', rec.durationSeconds)

      const res = await uploadInterviewRecording(rec.sessionId, fd)
      const cloudUrl = res.data?.cloud_url || res.data?.cloud_video_url || res.data?.cloud_audio_url
      if (cloudUrl) {
        await markRecordingUploaded(rec.id, cloudUrl)
      }
      setUploadMsg(`✓ Question ${rec.questionNumber} clip uploaded to Cloudinary! Visible now on Project Leader Portal.`)
      await loadData()
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Upload to cloud failed. Please check your internet connection or verify the interview session.')
    } finally {
      setUploadingId(null)
    }
  }

  // Upload all un-uploaded recordings to Cloudinary in batch
  const handleUploadAllToCloud = async () => {
    const unuploaded = recordings.filter((r) => !r.uploadedToCloud && !r.cloudUrl && r.blob && r.sessionId && r.sessionId !== 'practice')
    if (unuploaded.length === 0) {
      alert('All recordings are already uploaded to Cloudinary!')
      return
    }
    if (!window.confirm(`Upload ${unuploaded.length} recording(s) to Cloudinary for Project Leader access?`)) return

    setUploadAllLoading(true)
    setUploadMsg('')
    let count = 0
    try {
      for (const rec of unuploaded) {
        const fd = new FormData()
        fd.append('file', rec.blob, `${rec.mode || 'video'}_${rec.sessionId}_Q${rec.questionNumber}.webm`)
        fd.append('order', rec.questionNumber)
        fd.append('mode', rec.mode || 'video')
        if (rec.durationSeconds) fd.append('speaking_time_seconds', rec.durationSeconds)

        const res = await uploadInterviewRecording(rec.sessionId, fd)
        const cloudUrl = res.data?.cloud_url || res.data?.cloud_video_url || res.data?.cloud_audio_url
        if (cloudUrl) {
          await markRecordingUploaded(rec.id, cloudUrl)
          count++
        }
      }
      setUploadMsg(`✓ Successfully uploaded ${count} recording(s) to Cloudinary! Visible now on Leader Portal.`)
      await loadData()
    } catch (err) {
      console.error('Batch upload error:', err)
      alert(`Uploaded ${count} clips before encountering an issue.`)
    } finally {
      setUploadAllLoading(false)
    }
  }

  // Filter recordings
  const filtered = recordings.filter((r) => {
    const matchMode = filterMode === 'all' || r.mode === filterMode
    const q = search.toLowerCase()
    const matchSearch =
      (r.jobRole || '').toLowerCase().includes(q) ||
      (r.questionText || '').toLowerCase().includes(q) ||
      (r.userEmail || '').toLowerCase().includes(q)

    const isHr = (r.jobRole || '').toLowerCase().includes('hr') ||
                 (r.jobRole || '').toLowerCase().includes('behavioral') ||
                 (r.jobRole || '').toLowerCase().includes('placement') ||
                 (r.jobRole || '').toLowerCase().includes('culture')
    const matchTrack = filterTrack === 'all'
      ? true
      : filterTrack === 'hr'
      ? isHr
      : !isHr

    return matchMode && matchSearch && matchTrack
  })

  return (
    <AppShell>
      {/* ─── Top Header ─── */}
      <div className="mb-4 sm:mb-5 border-b border-slate-200/60 dark:border-slate-800/80 pb-3 sm:pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="eyebrow mb-1">Vault & Playback</span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Interview Recordings 📼
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            Review your recorded video & audio answers. Ultra-compact storage preserves device space.
          </p>
        </div>

        {/* Right side storage summary & Clear All */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/80 text-emerald-800 dark:text-emerald-400 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Space: {storageInfo.formatted}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400/80 font-sans font-medium">({storageInfo.count} clips)</span>
          </div>

          {recordings.some((r) => !r.uploadedToCloud && !r.cloudUrl && r.blob && r.sessionId && r.sessionId !== 'practice') && (
            <button
              onClick={handleUploadAllToCloud}
              disabled={uploadAllLoading}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-3 py-1.5 rounded-xl transition-all border border-emerald-300 dark:border-emerald-800 cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              title="Upload all local interview clips to Cloudinary so Project Leader can watch them"
            >
              {uploadAllLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Uploading to Cloud...</span>
                </>
              ) : (
                <>
                  <span>☁️ Upload All to Cloud</span>
                </>
              )}
            </button>
          )}

          {recordings.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1.5 rounded-xl transition-colors border border-rose-200 dark:border-rose-900/60 cursor-pointer"
              title="Delete all stored recordings to free up space"
            >
              Clear All 🗑️
            </button>
          )}

          <Link to="/interview/setup" className="btn-primary py-1.5 px-3.5 text-xs sm:text-sm shadow-sm">
            + New Interview
          </Link>
        </div>
      </div>

      {uploadMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs">
          <span>{uploadMsg}</span>
          <button onClick={() => setUploadMsg('')} className="text-emerald-600 hover:text-emerald-800 font-bold px-1.5 cursor-pointer">✕</button>
        </div>
      )}

      {/* ─── Leader View Toggle Bar ─── */}
      {isLeader && (
        <div className="flex items-center justify-between gap-3 p-2 sm:p-2.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5 px-1.5">
              <span>🛡️ Leader Clearance:</span>
            </span>
            <div className="flex gap-1 bg-white dark:bg-[#0D1527] p-1 rounded-xl border border-blue-200/60 dark:border-blue-900/40">
              <button
                onClick={() => setViewScope('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewScope === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Candidates' Recordings ({storageInfo.count})
              </button>
              <button
                onClick={() => setViewScope('mine')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewScope === 'mine'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Only My Recordings
              </button>
            </div>
          </div>

          <Link
            to="/leader"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline px-2 flex items-center gap-1"
          >
            <span>Leader Control Center ↗</span>
          </Link>
        </div>
      )}

      {/* ─── Track Scope Tabs (All Tracks vs HR vs Technical) ─── */}
      <div className="flex gap-2 mb-3.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterTrack('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            filterTrack === 'all'
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-extrabold'
              : 'bg-white dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
          }`}
        >
          All Clips ({recordings.length})
        </button>
        <button
          onClick={() => setFilterTrack('hr')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
            filterTrack === 'hr'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-extrabold'
              : 'bg-white dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50/50'
          }`}
        >
          <span>👔</span>
          <span>HR Clips ({recordings.filter(r => (r.jobRole || '').toLowerCase().includes('hr') || (r.jobRole || '').toLowerCase().includes('behavioral')).length})</span>
        </button>
        <button
          onClick={() => setFilterTrack('technical')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
            filterTrack === 'technical'
              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-extrabold'
              : 'bg-white dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50/50'
          }`}
        >
          <span>💻</span>
          <span>Technical ({recordings.filter(r => !(r.jobRole || '').toLowerCase().includes('hr') && !(r.jobRole || '').toLowerCase().includes('behavioral')).length})</span>
        </button>
      </div>

      {/* ─── Search & Mode Filter Tabs ─── */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
        {/* Search Input */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="input-field pl-9 py-1.5"
            placeholder={
              isLeader && viewScope === 'all'
                ? "Search by candidate email, role or question keyword..."
                : "Search by role or question keyword..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'All Clips' },
            { id: 'video', label: '📹 Video (Face & Speech)' },
            { id: 'audio', label: '🎙️ Audio Only' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                filterMode === tab.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs dark:shadow-[0_0_15px_rgba(37,99,235,0.35)]'
                  : 'bg-white dark:bg-[#0D1527] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content Grid ─── */}
      {loading ? (
        <Loader label="Loading interview recordings vault" />
      ) : recordings.length === 0 ? (
        <div className="card text-center py-14 rounded-2xl max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner border border-transparent dark:border-blue-900/50">
            🎥
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">No Recordings Yet</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-5 max-w-sm mx-auto leading-relaxed">
            When you take a Video or Audio mock interview, your practice answers are automatically compressed in ultra-low storage here for review.
          </p>
          <Link to="/interview/setup" className="btn-primary shadow-sm py-2 px-4 text-xs sm:text-sm">
            Launch Video / Audio Interview →
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10 rounded-2xl">
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">No recordings match your filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rec) => {
            const blobUrl = rec.blob ? URL.createObjectURL(rec.blob) : null
            const dateStr = new Date(rec.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })

            return (
              <div
                key={rec.id}
                className="card p-4 flex flex-col justify-between group"
              >
                <div>
                  {/* Candidate Identity (shown in Leader mode or if user is tagged) */}
                  {(isLeader || rec.userEmail) && (
                    <div className="flex items-center justify-between text-[11px] mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                      <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold truncate max-w-[190px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="truncate">{rec.userEmail || (rec.userId ? `User #${rec.userId}` : 'Candidate')}</span>
                      </span>
                      {rec.sessionId && rec.sessionId !== 'practice' && (
                        <Link
                          to={`/interview/report/${rec.sessionId}`}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold text-[10px] hover:underline shrink-0"
                          title="Open full AI interview evaluation report"
                        >
                          Report ↗
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Card Header: Role & Mode Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {rec.jobRole}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider shrink-0 ${
                        rec.mode === 'video'
                          ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                          : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      {rec.mode === 'video' ? '📹 Video + Audio' : '🎙️ Audio'}
                    </span>
                  </div>

                  {/* Question Text */}
                  <div className="mb-3">
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block mb-0.5">
                      Question {rec.questionNumber}:
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2 leading-snug">
                      {rec.questionText || 'Interview question answer response'}
                    </p>
                  </div>

                  {/* Video / Audio Preview or Player */}
                  <div className="w-full h-36 bg-slate-900 dark:bg-black/90 rounded-xl overflow-hidden mb-3 relative flex items-center justify-center group/preview border border-transparent dark:border-slate-800">
                    {rec.mode === 'video' && blobUrl ? (
                      <video
                        src={blobUrl}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1.5 p-3 text-center">
                        <span className="text-3xl">🎙️</span>
                        <span className="text-[11px] font-bold text-slate-300">Audio Response Clip</span>
                      </div>
                    )}

                    {/* Play Overlay Button */}
                    <button
                      onClick={() => setActivePlayback({ ...rec, blobUrl })}
                      className="absolute inset-0 bg-black/40 hover:bg-black/25 flex items-center justify-center transition-all cursor-pointer"
                      title="Play Recording"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg shadow-lg group-hover/preview:scale-110 transition-transform">
                        ▶
                      </div>
                    </button>
                  </div>

                  {/* Metadata Row: Space, Duration, Date */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono mb-3 bg-slate-50 dark:bg-[#131E38] px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      💾 {formatBytes(rec.sizeBytes)}
                    </span>
                    <span>⏱️ {rec.durationSeconds || 0}s</span>
                    <span>📅 {dateStr}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
                  <button
                    onClick={() => setActivePlayback({ ...rec, blobUrl })}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors text-center cursor-pointer shadow-2xs"
                  >
                    Play ▶️
                  </button>

                  {rec.uploadedToCloud || rec.cloudUrl ? (
                    <span
                      className="px-2 py-1.5 rounded-xl text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shrink-0"
                      title="Uploaded to Cloudinary and visible on Project Leader Portal"
                    >
                      <span>☁️</span> Cloud
                    </span>
                  ) : rec.sessionId && rec.sessionId !== 'practice' ? (
                    <button
                      onClick={(e) => handleUploadToCloud(rec, e)}
                      disabled={uploadingId === rec.id}
                      className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50 shrink-0"
                      title="Upload clip to Cloudinary so Project Leader can watch it"
                    >
                      {uploadingId === rec.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>☁️ Upload</span>
                      )}
                    </button>
                  ) : null}

                  <button
                    onClick={(e) => handleDownload(rec, e)}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                    title="Download Video/Audio File (.webm)"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDelete(rec.id, e)}
                    className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete Recording"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Video/Audio Playback Modal ─── */}
      {activePlayback && (
        <div
          className="fixed inset-0 bg-slate-900/80 dark:bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5"
          onClick={() => setActivePlayback(null)}
        >
          <div
            className="bg-white dark:bg-[#0D1527] rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800/90 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="eyebrow mb-0.5">Recording Playback</span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                  {activePlayback.jobRole} · Q{activePlayback.questionNumber}
                </h3>
              </div>
              <button
                onClick={() => setActivePlayback(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#131E38] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer border border-transparent dark:border-slate-700/60"
              >
                ✕
              </button>
            </div>

            {/* Question description */}
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#131E38] p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 font-medium leading-relaxed">
              <strong className="text-blue-600 dark:text-blue-400 mr-1.5">Question:</strong>
              {activePlayback.questionText || 'Practice Answer'}
            </p>

            {/* Media Player */}
            <div className="w-full bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center shadow-inner relative">
              {activePlayback.mode === 'video' ? (
                <video
                  ref={videoPlayerRef}
                  src={activePlayback.blobUrl}
                  controls
                  playsInline
                  onPlay={(e) => {
                    try {
                      e.target.muted = false
                      e.target.volume = 1.0
                    } catch {}
                  }}
                  onLoadedMetadata={(e) => {
                    try {
                      e.target.muted = false
                      e.target.volume = 1.0
                    } catch {}
                  }}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 w-full p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-3xl">
                    🎙️
                  </div>
                  <audio
                    src={activePlayback.blobUrl}
                    controls
                    autoPlay
                    onPlay={(e) => {
                      try {
                        e.target.muted = false
                        e.target.volume = 1.0
                      } catch {}
                    }}
                    className="w-full max-w-md"
                  />
                </div>
              )}
            </div>

            {/* Audio & Volume Quick Controls for Mobile / Desktop */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-[#131E38] p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (videoPlayerRef.current) {
                      videoPlayerRef.current.muted = false
                      videoPlayerRef.current.volume = 1.0
                      videoPlayerRef.current.play().catch(() => {})
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Unmute video to 100% volume"
                >
                  <span>🔊 Unmute / Sound 100%</span>
                </button>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mobile browser me aawaj na aaye toh ye button dabayein
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Duration: ⏱️ {activePlayback.durationSeconds || 0}s
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>Space Used: {formatBytes(activePlayback.sizeBytes)}</span>
              <div className="flex gap-2">
                <button
                  onClick={(e) => handleDownload(activePlayback, e)}
                  className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Download File 📥</span>
                </button>
                <button
                  onClick={() => setActivePlayback(null)}
                  className="btn-primary py-1.5 px-4 text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

export default Recordings
