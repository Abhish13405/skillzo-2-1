import React, { useState } from 'react'
import AppShell from '../components/AppShell'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../api/auth'

const Profile = () => {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({
    phone: user?.phone || '',
    college_or_company: user?.college_or_company || '',
    target_role: user?.target_role || '',
    bio: user?.bio || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await updateProfile(form)
      await refreshUser()
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="mb-4 sm:mb-5 border-b border-slate-200/60 dark:border-slate-800 pb-3 sm:pb-4">
        <span className="eyebrow mb-1">User Settings</span>
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">Candidate Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Manage your candidate details and career target roles.</p>
      </div>

      <div className="card border border-slate-200/80 dark:border-slate-800/80 dark:bg-[#0D1527] shadow-craft max-w-xl p-4 sm:p-6 rounded-2xl">
        <div className="flex items-center gap-3.5 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 border border-blue-200 dark:border-blue-500/40 flex items-center justify-center font-display font-extrabold text-white text-lg shadow-sm">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">{user?.username}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{user?.email}</p>
            <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 text-blue-700 dark:text-blue-400 text-[11px] font-mono font-bold">
               {user?.current_streak || 0} Day Streak
            </div>
          </div>
        </div>

        {saved && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-sm font-semibold">
            ✓ Profile details updated successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Phone Number</label>
            <input name="phone" className="input-field" value={form.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" />
          </div>
          <div>
            <label className="label">College / Company</label>
            <input name="college_or_company" className="input-field" value={form.college_or_company} onChange={handleChange} placeholder="Your college or current company" />
          </div>
          <div>
            <label className="label">Target Job Role</label>
            <input name="target_role" className="input-field" value={form.target_role} onChange={handleChange} placeholder="e.g. Python Developer / Data Engineer" />
          </div>
          <div>
            <label className="label">Bio & Career Statement</label>
            <textarea name="bio" className="input-field min-h-[100px] resize-none" value={form.bio} onChange={handleChange} placeholder="A short line about your background and experience" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full shadow-md shadow-brand-500/20 py-3 mt-2">
            {saving ? 'Saving changes...' : 'Save Profile Changes →'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}

export default Profile

