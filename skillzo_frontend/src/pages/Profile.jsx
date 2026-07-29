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
      <p className="eyebrow mb-1">Module 1</p>
      <h1 className="text-3xl font-display font-semibold mb-8">Profile</h1>

      <div className="card max-w-xl">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-surface-border">
          <div className="w-16 h-16 rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center font-display font-bold text-cyan text-2xl">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-display font-semibold text-lg">{user?.username}</p>
            <p className="text-sm text-ink_text-muted">{user?.email}</p>
            <p className="text-xs text-amber font-mono mt-1">🔥 {user?.current_streak} day streak</p>
          </div>
        </div>

        {saved && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-cyan/10 border border-cyan/30 text-cyan text-sm">
            Profile updated.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Phone</label>
            <input name="phone" className="input-field" value={form.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" />
          </div>
          <div>
            <label className="label">College / Company</label>
            <input name="college_or_company" className="input-field" value={form.college_or_company} onChange={handleChange} placeholder="Your college or current company" />
          </div>
          <div>
            <label className="label">Target Role</label>
            <input name="target_role" className="input-field" value={form.target_role} onChange={handleChange} placeholder="e.g. Python Developer" />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea name="bio" className="input-field min-h-[100px] resize-none" value={form.bio} onChange={handleChange} placeholder="A short line about yourself" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}

export default Profile
