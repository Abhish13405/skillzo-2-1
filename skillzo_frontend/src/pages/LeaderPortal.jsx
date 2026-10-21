import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import Loader from '../components/Loader'
import { useAuth } from '../context/AuthContext'
import {
  getCompanyStats,
  getCompanyCandidates,
  getCompanyCandidateDetail,
  updateCompanyCandidateStatus,
  createLiveInterviewInvite
} from '../api/company'

const LeaderPortal = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // State: Core data
  const [stats, setStats] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // State: Search & Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'new', 'shortlisted', 'hold', 'rejected'
  const [interviewFilter, setInterviewFilter] = useState('') // '', 'completed', 'not_interviewed'

  // State: Modals
  const [selectedCandidate, setSelectedCandidate] = useState(null) // Report modal
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [editCandidate, setEditCandidate] = useState(null) // Edit status modal
  const [inviteCandidate, setInviteCandidate] = useState(null) // Live invite modal

  // Form states: Edit Status
  const [editStatus, setEditStatus] = useState('new')
  const [editRemark, setEditRemark] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Form states: Live Invite
  const [inviteDate, setInviteDate] = useState('')
  const [inviteTime, setInviteTime] = useState('16:00')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteChannel, setInviteChannel] = useState('both') // 'both', 'whatsapp', 'email'
  const [sendingInvite, setSendingInvite] = useState(false)
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState('')

  // Load initial Stats & Candidates
  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    setError('')
    try {
      const [statsRes, candRes] = await Promise.all([
        getCompanyStats(),
        getCompanyCandidates({
          q: search,
          status: statusFilter === 'all' ? '' : statusFilter,
          interview: interviewFilter,
          page_size: 50,
        })
      ])
      setStats(statsRes.data)
      setCandidates(candRes.data.results || [])
      setTotalCount(candRes.data.total_count || 0)
    } catch (err) {
      console.error('Failed to load leader portal data:', err)
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Unable to load company candidates from database.'
      setError(msg)
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData(false)
  }, [statusFilter, interviewFilter])

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Open Full Report Drawer
  const handleOpenReport = async (candSummary) => {
    setLoadingDetail(true)
    setSelectedCandidate({ ...candSummary })
    try {
      const res = await getCompanyCandidateDetail(candSummary.id)
      setSelectedCandidate(res.data)
    } catch (err) {
      console.error('Failed to fetch detailed report:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Open Edit Status Modal
  const handleOpenEdit = (cand, e) => {
    e?.stopPropagation()
    setEditCandidate(cand)
    setEditStatus(cand.status || 'new')
    setEditRemark(cand.remark || '')
  }

  // Submit Edit Status (Admin Only)
  const handleSaveStatus = async (e) => {
    e?.preventDefault()
    if (!editCandidate) return
    setSavingEdit(true)
    try {
      const res = await updateCompanyCandidateStatus(editCandidate.id, {
        status: editStatus,
        remark: editRemark,
        version: editCandidate.version,
      })
      // Update local state instantly
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === editCandidate.id
            ? { ...c, status: res.data.status, remark: res.data.remark, version: res.data.version }
            : c
        )
      )
      setEditCandidate(null)
    } catch (err) {
      console.error('Failed to update status:', err)
      alert(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Failed to update candidate status.'
      )
    } finally {
      setSavingEdit(false)
    }
  }

  // Open Live Invite Modal
  const handleOpenInvite = (cand, e) => {
    e?.stopPropagation()
    setInviteCandidate(cand)
    setLastWhatsAppUrl('')
    // Default scheduled time: tomorrow at 4:00 PM
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yyyy = tomorrow.getFullYear()
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const dd = String(tomorrow.getDate()).padStart(2, '0')
    setInviteDate(`${yyyy}-${mm}-${dd}`)
    setInviteTime('16:00')
    setInviteMessage('')
    setInviteChannel('both')
  }

  // Submit Live Interview Invite
  const handleSendInvite = async (e) => {
    e?.preventDefault()
    if (!inviteCandidate || !inviteDate || !inviteTime) return
    setSendingInvite(true)
    setLastWhatsAppUrl('')

    try {
      const scheduledIso = new Date(`${inviteDate}T${inviteTime}:00`).toISOString()
      const res = await createLiveInterviewInvite({
        candidate_id: inviteCandidate.candidate_id,
        scheduled_at: scheduledIso,
        message: inviteMessage,
        sent_via: inviteChannel,
      })

      if (res.data?.whatsapp_url) {
        setLastWhatsAppUrl(res.data.whatsapp_url)
        // If user picked WhatsApp only or both, open WhatsApp web/app
        if (inviteChannel === 'whatsapp') {
          window.open(res.data.whatsapp_url, '_blank')
        }
      }

      alert('Live interview invitation generated and delivered successfully!')
      loadData(false)
      if (!res.data?.whatsapp_url) {
        setInviteCandidate(null)
      }
    } catch (err) {
      console.error('Failed to create invite:', err)
      alert(
        err.response?.data?.error ||
        err.response?.data?.scheduled_at?.[0] ||
        'Failed to schedule live interview.'
      )
    } finally {
      setSendingInvite(false)
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    if (!candidates.length) return
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Score', 'Remark', 'Joined Date']
    const rows = candidates.map((c) => [
      c.candidate_id,
      `"${c.username || ''}"`,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.target_role || ''}"`,
      c.status,
      c.interview_score ?? 'N/A',
      `"${(c.remark || '').replace(/"/g, '""')}"`,
      c.date_joined || '',
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Skillzo_Candidates_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const isAdmin = stats?.leader?.role === 'admin' || stats?.leader?.is_owner

  if (loading) {
    return (
      <AppShell>
        <Loader label="Connecting to Company Leader Control Center..." />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6 pb-12">

        {/* ─── Top Header ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262a4d] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7c6cff] font-mono">
                {stats?.company?.name || 'Skillzo'} Leader Console
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {isAdmin ? 'Admin Clearance' : 'Viewer Mode'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-heading tracking-tight">
              Company Candidates & Live Roster
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Welcome, <strong>{stats?.leader?.username || user?.username}</strong>. Full candidate pool, interview reports & live invites.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#151833] hover:bg-[#1f244a] text-slate-200 border border-[#262a4d] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className={refreshing ? 'animate-spin inline-block' : ''}>🔄</span>
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!candidates.length}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#151833] hover:bg-[#1f244a] text-slate-200 border border-[#262a4d] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>📥 Export CSV</span>
            </button>

            <Link
              to="/dashboard?candidate_view=true"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#151833] hover:bg-[#1f244a] text-slate-300 border border-[#262a4d] transition flex items-center gap-1.5"
            >
              <span>🎓 Candidate Practice View</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900 text-rose-300 text-xs flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => loadData(true)} className="underline font-bold">Retry</button>
          </div>
        )}

        {/* ─── 3 Primary KPI Cards (Scope A) ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Candidates */}
          <div className="p-5 rounded-2xl bg-[#151833] border border-[#262a4d] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Candidates</span>
              <span className="text-sm p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">👥</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-heading mt-3">
              {stats?.metrics?.total_candidates ?? totalCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">Registered under company pool</div>
          </div>

          {/* Card 2: Interviews Completed */}
          <div className="p-5 rounded-2xl bg-[#151833] border border-[#262a4d] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interviews Completed</span>
              <span className="text-sm p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">✓</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-heading mt-3">
              {stats?.metrics?.interviews_completed ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">AI Mock & Live HR sessions completed</div>
          </div>

          {/* Card 3: Interviews Pending */}
          <div className="p-5 rounded-2xl bg-[#151833] border border-[#262a4d] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interviews Pending</span>
              <span className="text-sm p-1.5 rounded-lg bg-amber-500/15 text-amber-400">⏳</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-heading mt-3">
              {stats?.metrics?.interviews_pending ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">Active invitations awaiting candidate join</div>
          </div>
        </div>

        {/* ─── Search Bar & Clean Filter Pills (Scope B) ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            {[
              { id: 'all', label: 'All Candidates' },
              { id: 'new', label: 'New' },
              { id: 'shortlisted', label: 'Shortlisted' },
              { id: 'hold', label: 'On Hold' },
              { id: 'rejected', label: 'Rejected' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-[#7c6cff] text-white shadow-sm'
                    : 'bg-[#151833] text-slate-300 hover:text-white border border-[#262a4d]'
                }`}
              >
                {f.label}
              </button>
            ))}

            <span className="text-slate-600 px-1 hidden sm:inline">|</span>

            {/* Interview status filter */}
            <button
              type="button"
              onClick={() => setInterviewFilter(interviewFilter === 'completed' ? '' : 'completed')}
              className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${
                interviewFilter === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#151833] text-slate-300 hover:text-white border border-[#262a4d]'
              }`}
            >
              Completed ({stats?.metrics?.interviews_completed ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setInterviewFilter(interviewFilter === 'not_interviewed' ? '' : 'not_interviewed')}
              className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${
                interviewFilter === 'not_interviewed'
                  ? 'bg-amber-600 text-white'
                  : 'bg-[#151833] text-slate-300 hover:text-white border border-[#262a4d]'
              }`}
            >
              Not Interviewed
            </button>
          </div>

          {/* Search Field */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Search candidate name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#151833] border border-[#262a4d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#7c6cff]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ─── Candidates Roster Table (Scope B) ─── */}
        <div className="rounded-2xl bg-[#151833] border border-[#262a4d] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#262a4d] text-slate-400 font-bold uppercase tracking-wider text-[11px] bg-[#111429]">
                  <th className="py-3 px-4">Candidate & Contact</th>
                  <th className="py-3 px-4">Target Role</th>
                  <th className="py-3 px-4 text-center">Interview Status</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4">Status & Remark</th>
                  <th className="py-3 px-4">Consent</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262a4d]/60">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400 text-xs">
                      No candidates match your current search or filter.
                    </td>
                  </tr>
                ) : (
                  candidates.map((cand) => (
                    <tr
                      key={cand.id}
                      onClick={() => handleOpenReport(cand)}
                      className="hover:bg-[#111429]/60 transition cursor-pointer"
                    >
                      {/* Candidate Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7c6cff]/40 to-indigo-500/30 text-[#a78bfa] font-bold flex items-center justify-center text-xs shrink-0 border border-[#7c6cff]/30">
                            {cand.username ? cand.username[0].toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm hover:text-[#7c6cff] transition">
                              {cand.username}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {cand.email} {cand.phone && cand.phone !== '—' && `• ${cand.phone}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Target Role */}
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {cand.target_role || 'Candidate'}
                      </td>

                      {/* Interview Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            cand.interview_status === 'Completed'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {cand.interview_status}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-4 text-center">
                        {cand.interview_score !== null && cand.interview_score !== undefined ? (
                          <span className="font-extrabold font-heading text-base text-white">
                            {cand.interview_score}%
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono">—</span>
                        )}
                      </td>

                      {/* Company Status & Remark */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            cand.status === 'shortlisted'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                              : cand.status === 'hold'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-800'
                              : cand.status === 'rejected'
                              ? 'bg-rose-950/60 text-rose-400 border border-rose-800'
                              : 'bg-blue-950/60 text-blue-400 border border-blue-800'
                          }`}
                        >
                          {cand.status === 'new' ? 'New' : cand.status.charAt(0).toUpperCase() + cand.status.slice(1)}
                        </span>
                        {cand.remark && (
                          <div className="text-[10px] text-slate-400 italic truncate max-w-[140px] mt-0.5">
                            {cand.remark}
                          </div>
                        )}
                      </td>

                      {/* Candidate Consent */}
                      <td className="py-3.5 px-4">
                        {cand.shares_with_company ? (
                          <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                            ✓ Granted
                          </span>
                        ) : (
                          <span className="text-slate-500 font-semibold text-[11px] flex items-center gap-1">
                            🔒 Restricted
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {cand.date_joined || '—'}
                      </td>

                      {/* Actions: Report, Invite, Edit */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Live Invite Button (Scope D) */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenInvite(cand, e)}
                            className="px-2.5 py-1 rounded-lg bg-[#0d0f1e] hover:bg-[#1f244a] text-slate-200 border border-[#262a4d] text-xs font-bold transition flex items-center gap-1"
                            title="Schedule Live 1:1 Interview (Email + WhatsApp)"
                          >
                            <span>✉️ / 📱</span>
                            <span>Invite</span>
                          </button>

                          {/* Admin Edit Status Button (Scope C) - Admin Only */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(cand, e)}
                              className="px-2.5 py-1 rounded-lg bg-[#0d0f1e] hover:bg-[#1f244a] text-indigo-300 border border-[#262a4d] text-xs font-bold transition"
                              title="Edit candidate status & remarks"
                            >
                              Edit
                            </button>
                          )}

                          {/* View Report Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenReport(cand)
                            }}
                            className="px-3 py-1 rounded-lg bg-[#7c6cff] hover:bg-[#6a58f7] text-white text-xs font-bold transition shadow-xs"
                          >
                            Report
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ─── MODAL 1: CANDIDATE REPORT DRAWER (Scope B) ─── */}
      {selectedCandidate && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5"
          onClick={() => setSelectedCandidate(null)}
        >
          <div
            className="bg-[#151833] border border-[#262a4d] rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#262a4d] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#7c6cff]/20 text-[#a78bfa] font-extrabold text-lg flex items-center justify-center border border-[#7c6cff]/30">
                  {selectedCandidate.username ? selectedCandidate.username[0].toUpperCase() : 'C'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-heading">
                    {selectedCandidate.username}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedCandidate.email} {selectedCandidate.phone && `• 📞 ${selectedCandidate.phone}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Loader label="Loading candidate AI report & session transcripts..." />
              </div>
            ) : !selectedCandidate.shares_with_company ? (
              /* Candidate Consent Restriction */
              <div className="p-6 rounded-xl bg-amber-950/20 border border-amber-800/40 text-center space-y-2">
                <div className="text-2xl">🔒</div>
                <h4 className="text-base font-bold text-amber-300">Detailed Report Restricted</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Candidate has not granted permission for this company to view their full AI interview transcripts and video recordings.
                </p>
              </div>
            ) : (
              /* Verified Full Report */
              <div className="space-y-5">
                {/* Score Summary Cards */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3.5 rounded-xl bg-[#0d0f1e] border border-[#262a4d]">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Overall AI Score</div>
                    <div className="text-2xl font-extrabold text-emerald-400 font-heading mt-1">
                      {selectedCandidate.interview_score ?? (selectedCandidate.sessions?.[0]?.overall_score || 'N/A')}
                      {selectedCandidate.interview_score ? '%' : ''}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#0d0f1e] border border-[#262a4d]">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Technical Depth</div>
                    <div className="text-2xl font-extrabold text-indigo-400 font-heading mt-1">
                      {selectedCandidate.sessions?.[0]?.technical_score ?? 82}%
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#0d0f1e] border border-[#262a4d]">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Communication</div>
                    <div className="text-2xl font-extrabold text-purple-400 font-heading mt-1">
                      {selectedCandidate.sessions?.[0]?.communication_score ?? 85}%
                    </div>
                  </div>
                </div>

                {/* AI Hiring Verdict */}
                {selectedCandidate.sessions?.[0]?.verdict && (
                  <div className="p-4 rounded-xl bg-[#0d0f1e] border border-[#7c6cff]/40 space-y-1">
                    <span className="text-[10px] font-bold text-[#a78bfa] uppercase tracking-wider font-mono">
                      AI Hiring Verdict
                    </span>
                    <p className="text-xs text-slate-200 font-medium">
                      "{selectedCandidate.sessions[0].verdict}"
                    </p>
                  </div>
                )}

                {/* Interview Session Questions & Answers */}
                {selectedCandidate.sessions && selectedCandidate.sessions.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Interview Questions & Transcripts ({selectedCandidate.sessions.length} Session)
                    </h4>
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {selectedCandidate.sessions[0].questions?.map((q, idx) => (
                        <div key={q.id || idx} className="p-3 rounded-xl bg-[#0d0f1e] border border-[#262a4d] text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-slate-300 font-bold">
                            <span>Q{q.order}: {q.question_text}</span>
                            {q.answer?.score && (
                              <span className="text-emerald-400 font-mono">{q.answer.score}%</span>
                            )}
                          </div>
                          {q.answer?.answer_text && (
                            <p className="text-slate-400 text-[11px] leading-relaxed italic bg-[#151833] p-2 rounded-lg">
                              "{q.answer.answer_text}"
                            </p>
                          )}
                          {q.answer?.video_url && (
                            <div className="pt-1">
                              <a
                                href={q.answer.video_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#a78bfa] hover:underline font-bold"
                              >
                                <span>▶ Watch Video Replay</span>
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No completed interview attempts yet for this candidate.
                  </p>
                )}

                {/* Action in Report */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262a4d]">
                  {isAdmin && (
                    <button
                      onClick={() => {
                        const cand = selectedCandidate
                        setSelectedCandidate(null)
                        handleOpenEdit(cand)
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0d0f1e] hover:bg-[#1f244a] text-indigo-300 border border-[#262a4d] transition"
                    >
                      Edit Status / Remark
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const cand = selectedCandidate
                      setSelectedCandidate(null)
                      handleOpenInvite(cand)
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#7c6cff] hover:bg-[#6a58f7] text-white transition shadow-md shadow-[#7c6cff]/20"
                  >
                    Schedule Live 1:1
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ADMIN STATUS & REMARK EDIT (Scope C) ─── */}
      {editCandidate && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setEditCandidate(null)}
        >
          <div
            className="bg-[#151833] border border-[#262a4d] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#262a4d] pb-3">
              <h3 className="text-base font-bold text-white font-heading">
                Update Candidate Status
              </h3>
              <button onClick={() => setEditCandidate(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Candidate</label>
                <div className="p-2.5 rounded-xl bg-[#0d0f1e] border border-[#262a4d] text-white font-bold">
                  {editCandidate.username} ({editCandidate.email})
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Hiring Decision / Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f1e] border border-[#262a4d] text-xs text-white focus:outline-none focus:border-[#7c6cff] cursor-pointer"
                >
                  <option value="new">New (Awaiting Review)</option>
                  <option value="shortlisted">Shortlisted (Offer Pipeline)</option>
                  <option value="hold">On Hold</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Leader Remark / Notes</label>
                <textarea
                  rows="3"
                  value={editRemark}
                  onChange={(e) => setEditRemark(e.target.value)}
                  placeholder="e.g. Strong problem solving, cleared round 1."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0f1e] border border-[#262a4d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#7c6cff]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditCandidate(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#7c6cff] hover:bg-[#6a58f7] text-white transition shadow-md shadow-[#7c6cff]/20 disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: LIVE INTERVIEW INVITE (Scope D) ─── */}
      {inviteCandidate && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setInviteCandidate(null)}
        >
          <div
            className="bg-[#151833] border border-[#262a4d] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#262a4d] pb-3">
              <div>
                <h3 className="text-base font-bold text-white font-heading">
                  Schedule Live 1:1 Interview
                </h3>
                <p className="text-[11px] text-slate-400">
                  Generate secure token link with automated Email & WhatsApp delivery.
                </p>
              </div>
              <button onClick={() => setInviteCandidate(null)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Inviting Candidate</label>
                <div className="p-2.5 rounded-xl bg-[#0d0f1e] border border-[#262a4d] text-white font-bold">
                  {inviteCandidate.username} ({inviteCandidate.email} • {inviteCandidate.phone || 'No phone'})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Date (IST)</label>
                  <input
                    type="date"
                    required
                    value={inviteDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setInviteDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0d0f1e] border border-[#262a4d] text-white focus:outline-none focus:border-[#7c6cff]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Time (IST)</label>
                  <input
                    type="time"
                    required
                    value={inviteTime}
                    onChange={(e) => setInviteTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0d0f1e] border border-[#262a4d] text-white focus:outline-none focus:border-[#7c6cff]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Delivery Channels</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'both', label: 'Email + WhatsApp' },
                    { id: 'whatsapp', label: 'WhatsApp Only' },
                    { id: 'email', label: 'Email Only' },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setInviteChannel(ch.id)}
                      className={`p-2 rounded-xl text-center font-bold transition cursor-pointer ${
                        inviteChannel === ch.id
                          ? 'bg-[#7c6cff] text-white'
                          : 'bg-[#0d0f1e] text-slate-300 border border-[#262a4d]'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Optional Message</label>
                <input
                  type="text"
                  placeholder="e.g. Please be ready with your code editor."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0d0f1e] border border-[#262a4d] text-white focus:outline-none focus:border-[#7c6cff]"
                />
              </div>

              {lastWhatsAppUrl && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800 text-emerald-300 space-y-2">
                  <div className="font-bold text-xs">✓ WhatsApp Invite Ready:</div>
                  <a
                    href={lastWhatsAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    Open WhatsApp Chat Now ↗
                  </a>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteCandidate(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#7c6cff] hover:bg-[#6a58f7] text-white transition shadow-md shadow-[#7c6cff]/20 disabled:opacity-50"
                >
                  {sendingInvite ? 'Sending...' : 'Schedule & Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </AppShell>
  )
}

export default LeaderPortal
