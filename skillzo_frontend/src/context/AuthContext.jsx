import React, { createContext, useContext, useState, useEffect } from 'react'
import * as authApi from '../api/auth'
import AuthPromptModal from '../components/AuthPromptModal'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export const isUserLeader = (u) => {
  if (!u || u.is_guest) return false
  const userEmail = (u?.email || '').toLowerCase().trim()
  const userName = (u?.username || '').toLowerCase().trim()
  return Boolean(
    u?.is_leader ||
    u?.is_staff ||
    u?.is_superuser ||
    userEmail === 'abhishekkushwaha13405@gmail.com' ||
    userEmail === 'abhish@gmail.com' ||
    userEmail === 'abhishekkushwaha31387@bbdu.ac.in' ||
    userName === 'abhishek13405' ||
    userName === 'abhish' ||
    userName === 'abhishekkushwaha31387'
  )
}

export const AuthProvider = ({ children }) => {
  // Synchronous cache read for 0ms instant first render
  const getInitialUser = () => {
    try {
      const raw = localStorage.getItem('skillzo_user')
      if (raw) return JSON.parse(raw)
    } catch {
      // ignore JSON parse error
    }
    return null
  }

  const initialUser = getInitialUser()
  const [user, setUser] = useState(initialUser)
  // If cached user exists, loading is FALSE immediately for instant page render
  const [loading, setLoading] = useState(() => {
    if (initialUser) return false
    return Boolean(localStorage.getItem('skillzo_access'))
  })
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalFeature, setAuthModalFeature] = useState('this feature')

  const updateStoredUser = (userData) => {
    setUser(userData)
    try {
      if (userData) {
        localStorage.setItem('skillzo_user', JSON.stringify(userData))
      } else {
        localStorage.removeItem('skillzo_user')
      }
    } catch {
      // ignore storage errors
    }
  }

  const loadUser = async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const queryToken = urlParams.get('auth_token')
    if (queryToken) {
      localStorage.setItem('skillzo_access', queryToken)
      localStorage.removeItem('skillzo_logged_out')
    }

    const access = localStorage.getItem('skillzo_access')
    if (!access) {
      updateStoredUser(null)
      setLoading(false)
      return
    }

    // Safety timeout: Never let a cold server block the browser indefinitely
    const fetchPromise = authApi.getProfile()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Profile fetch timed out')), 5000)
    )

    try {
      const res = await Promise.race([fetchPromise, timeoutPromise])
      const isGuestStorage = localStorage.getItem('skillzo_is_guest') === 'true'
      if (isGuestStorage) {
        const guestData = {
          ...res.data,
          username: 'Guest Candidate',
          email: 'guest@skillzo.ai',
          is_guest: true,
          is_staff: false,
          is_superuser: false,
          is_leader: false,
        }
        updateStoredUser(guestData)
      } else {
        updateStoredUser(res.data)
      }
    } catch (err) {
      // If server explicitly returned 401 Unauthorized, token is expired: clear session
      if (err.response?.status === 401) {
        localStorage.removeItem('skillzo_access')
        localStorage.removeItem('skillzo_refresh')
        localStorage.removeItem('skillzo_is_guest')
        updateStoredUser(null)
      }
      // Otherwise, keep cached user intact so user is never blocked by a slow network
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  const login = async (email, password) => {
    const trimmed = (email || '').trim()
    const res = await authApi.login({ email: trimmed, password })
    localStorage.removeItem('skillzo_logged_out')
    localStorage.setItem('skillzo_access', res.data.tokens.access)
    localStorage.setItem('skillzo_refresh', res.data.tokens.refresh)
    localStorage.removeItem('skillzo_is_guest')
    updateStoredUser(res.data.user)
    return res.data
  }

  const signup = async (data) => {
    const res = await authApi.signup(data)
    localStorage.removeItem('skillzo_logged_out')
    localStorage.setItem('skillzo_access', res.data.tokens.access)
    localStorage.setItem('skillzo_refresh', res.data.tokens.refresh)
    localStorage.removeItem('skillzo_is_guest')
    updateStoredUser(res.data.user)
    return res.data
  }

  const loginAsGuest = async () => {
    // Instant 1-click candidate login with zero delay (no signup/email required)
    const res = await authApi.login({ email: 'asti@gmail.com', password: 'Skillzo@2026' })
    localStorage.removeItem('skillzo_logged_out')
    localStorage.setItem('skillzo_access', res.data.tokens.access)
    localStorage.setItem('skillzo_refresh', res.data.tokens.refresh)
    localStorage.setItem('skillzo_is_guest', 'true')
    const guestUser = {
      ...res.data.user,
      username: 'Guest Candidate',
      email: 'guest@skillzo.ai',
      is_guest: true,
      is_staff: false,
      is_superuser: false,
      is_leader: false,
    }
    updateStoredUser(guestUser)
    return { ...res.data, user: guestUser }
  }

  const logout = () => {
    localStorage.clear()
    localStorage.setItem('skillzo_logged_out', 'true')
    updateStoredUser(null)
  }

  const refreshUser = async () => {
    try {
      const res = await authApi.getProfile()
      updateStoredUser(res.data)
    } catch {
      // ignore refresh errors
    }
  }

  const openAuthModal = (featureName = 'this feature') => {
    setAuthModalFeature(featureName)
    setIsAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
  }

  const requireAuth = (featureName = 'this feature', callback = null) => {
    if (user) {
      if (callback) callback()
      return true
    }
    openAuthModal(featureName)
    return false
  }

  const isLeader = isUserLeader(user)

  return (
    <AuthContext.Provider value={{
      isLeader,
      isUserLeader, 
      user, 
      loading, 
      login, 
      signup, 
      loginAsGuest,
      logout, 
      refreshUser,
      isAuthModalOpen,
      authModalFeature,
      openAuthModal,
      closeAuthModal,
      requireAuth
    }}>
      {children}
      <AuthPromptModal 
        isOpen={isAuthModalOpen} 
        onClose={closeAuthModal} 
        featureName={authModalFeature} 
      />
    </AuthContext.Provider>
  )
}
