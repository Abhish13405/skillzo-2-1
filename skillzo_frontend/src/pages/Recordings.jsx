import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import {
  getAllRecordings,
  deleteRecording,
  clearAllRecordings,
  getTotalStorageUsed,
  formatBytes,
} from '../utils/recordingsDb'

const Recordings = () => {
  const { user } = useAuth()
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState('all') // 'all', 'video', 'audio'
  const [search, setSearch] = useState('')
  const [storageInfo, setStorageInfo] = useState({ totalBytes: 0, formatted: '0 KB', count: 0 })
  const [activePlayback, setActivePlayback] = useState(null) // Recording object being played in modal

  // Load recordings from IndexedDB for logged-in user
  const loadData = async () => {
    setLoading(true)
    try {
      const all = await getAllRecordings(user)
      setRecordings(all)
      const storage = await getTotalStorageUsed(user)
      setStorageInfo(storage)
    } catch (err) {
      console.error('Error loading recordings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

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

  // Clear all recordings for this user
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete your recordings? This cannot be undone.')) return
    await clearAllRecordings(user)
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
    a.download = `Skillzo_${rec.mode}_Q${rec.questionNumber}_${safeRole}_${Date.now()}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  // Filter recordings
  const filtered = recordings.filter((r) => {
    const matchMode = filterMode === 'all' || r.mode === filterMode
    const matchSearch =
      r.jobRole.toLowerCase().includes(search.toLowerCase()) ||
      r.questionText.toLowerCase().includes(search.toLowerCase())
    return matchMode && matchSearch
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
            placeholder="Search by role or question keyword..."
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
                      {rec.mode === 'video' ? '📹 Video' : '🎙️ Audio'}
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
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => setActivePlayback({ ...rec, blobUrl })}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors text-center cursor-pointer shadow-2xs"
                  >
                    Play ▶️
                  </button>
                  <button
                    onClick={(e) => handleDownload(rec, e)}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
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
            <div className="w-full bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center shadow-inner">
              {activePlayback.mode === 'video' ? (
                <video
                  src={activePlayback.blobUrl}
                  controls
                  autoPlay
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
                    className="w-full max-w-md"
                  />
                </div>
              )}
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
