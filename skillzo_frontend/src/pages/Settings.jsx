import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import SubscriptionModal from '../components/SubscriptionModal'

const Settings = () => {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [subModalOpen, setSubModalOpen] = useState(false)
  const [savedNotice, setSavedNotice] = useState('')

  // Interview Audio & Voice Preferences
  const [voiceAccent, setVoiceAccent] = useState(
    () => localStorage.getItem('skillzo_voice_accent') || 'en-IN'
  )
  const [speechRate, setSpeechRate] = useState(
    () => localStorage.getItem('skillzo_speech_rate') || '1.0'
  )
  const [autoMic, setAutoMic] = useState(
    () => localStorage.getItem('skillzo_auto_mic') !== 'false'
  )
  const [soundEffects, setSoundEffects] = useState(
    () => localStorage.getItem('skillzo_sound_effects') !== 'false'
  )

  useEffect(() => {
    localStorage.setItem('skillzo_voice_accent', voiceAccent)
  }, [voiceAccent])

  useEffect(() => {
    localStorage.setItem('skillzo_speech_rate', speechRate)
  }, [speechRate])

  useEffect(() => {
    localStorage.setItem('skillzo_auto_mic', autoMic.toString())
  }, [autoMic])

  useEffect(() => {
    localStorage.setItem('skillzo_sound_effects', soundEffects.toString())
  }, [soundEffects])

  const showSavedToast = (msg) => {
    setSavedNotice(msg)
    setTimeout(() => setSavedNotice(''), 3000)
  }

  const handleClearCache = () => {
    try {
      // Clear temporary audio blobs/history caches if any
      sessionStorage.clear()
      showSavedToast('✓ Temporary interview cache and audio buffers cleared.')
    } catch {
      showSavedToast('✓ Cache reset complete.')
    }
  }

  const quota = user?.interview_quota

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-2 sm:py-4 space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200/70 dark:border-neutral-800 pb-4">
          <span className="text-[11px] font-mono uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
            Preferences & Configuration
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Customize your AI interviewer experience, voice accents, theme appearance, and account preferences.
          </p>
        </div>

        {/* Toast Alert */}
        {savedNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs">
            <span>{savedNotice}</span>
            <button
              onClick={() => setSavedNotice('')}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:opacity-80"
            >
              ✕
            </button>
          </div>
        )}

        {/* Section 1: AI Interviewer & Voice Experience */}
        <div className="card p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D0D0D] border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-neutral-800/70">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                AI Interviewer Voice & Audio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tune the AI interviewer speech synthesis and microphone detection behavior.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Voice Accent */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-200/70 dark:border-neutral-800/80 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                AI Voice Accent / Region
              </label>
              <select
                value={voiceAccent}
                onChange={(e) => {
                  setVoiceAccent(e.target.value)
                  showSavedToast('✓ AI Voice Accent preference saved.')
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en-IN">🇮🇳 English (India) - Recommended</option>
                <option value="en-US">🇺🇸 English (United States)</option>
                <option value="en-GB">🇬🇧 English (United Kingdom)</option>
              </select>
              <p className="text-[11px] text-slate-400">
                Sets default speech synthesis voice tone during interview questions.
              </p>
            </div>

            {/* Speaking Rate */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-200/70 dark:border-neutral-800/80 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Speaking Pace (Speed)
              </label>
              <select
                value={speechRate}
                onChange={(e) => {
                  setSpeechRate(e.target.value)
                  showSavedToast('✓ AI Speaking Pace saved.')
                }}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#1E1E1E] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="0.9">0.9x — Relaxed & Clear</option>
                <option value="1.0">1.0x — Normal Speed (Standard)</option>
                <option value="1.15">1.15x — Fast Pace</option>
              </select>
              <p className="text-[11px] text-slate-400">
                Adjust how quickly the interviewer reads question prompts.
              </p>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-200/70 dark:border-neutral-800/80">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Automatic Microphone Detection
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Automatically listen when the interviewer finishes speaking.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAutoMic(!autoMic)
                  showSavedToast(`✓ Auto-mic detection ${!autoMic ? 'enabled' : 'disabled'}.`)
                }}
                className={`w-11 h-6 rounded-full transition-colors p-1 flex items-center cursor-pointer ${
                  autoMic ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-neutral-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-200/70 dark:border-neutral-800/80">
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Interactive Sound Cues & Chimes
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Play subtle audio tones on answer submission and scorecard generation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSoundEffects(!soundEffects)
                  showSavedToast(`✓ Sound cues ${!soundEffects ? 'enabled' : 'disabled'}.`)
                }}
                className={`w-11 h-6 rounded-full transition-colors p-1 flex items-center cursor-pointer ${
                  soundEffects ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-neutral-700 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Appearance & Theme */}
        <div className="card p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D0D0D] border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-neutral-800/70">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Appearance & Theme
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Switch between Dark obsidian and Light interface mode.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                if (theme !== 'light') toggleTheme()
                showSavedToast('✓ Switched to Light theme.')
              }}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                theme === 'light'
                  ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                  : 'bg-slate-50 dark:bg-[#141414] border-slate-200 dark:border-neutral-800 hover:border-slate-300'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-amber-500 shadow-xs">
                ☀️
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Light Mode
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Crisp white</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (theme !== 'dark') toggleTheme()
                showSavedToast('✓ Switched to Dark mode.')
              }}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                theme === 'dark'
                  ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30'
                  : 'bg-slate-50 dark:bg-[#141414] border-slate-200 dark:border-neutral-800 hover:border-slate-300'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-[#1F1F1F] border border-neutral-700 flex items-center justify-center text-blue-400 shadow-xs">
                🌙
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Dark Mode
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Obsidian night</div>
              </div>
            </button>
          </div>
        </div>

        {/* Section 3: Account & Subscription */}
        <div className="card p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D0D0D] border border-slate-200/80 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-neutral-800/70">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Account & Membership Plan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage your credentials, interview quota, and candidate profile.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#141414] border border-slate-200/70 dark:border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {user?.username || 'Candidate'}
                </span>
                <span className="text-xs text-slate-400 font-mono">({user?.email})</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Plan: <span className="font-bold text-emerald-600 dark:text-emerald-400">{user?.is_subscribed ? '👑 Pro Unlimited' : `🎯 Free Tier (${quota?.remaining ?? 10}/${quota?.total_limit ?? 10} interviews remaining)`}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSubModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                View Plans / Quota
              </button>
              <Link
                to="/profile"
                className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-xs font-bold transition shadow-2xs"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Change or Reset Password →
            </Link>

            <button
              type="button"
              onClick={handleClearCache}
              className="text-xs text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
              title="Clear cached temporary interview session data"
            >
              Clear Temporary Cache
            </button>
          </div>
        </div>
      </div>

      {subModalOpen && (
        <SubscriptionModal open={subModalOpen} onClose={() => setSubModalOpen(false)} />
      )}
    </AppShell>
  )
}

export default Settings
