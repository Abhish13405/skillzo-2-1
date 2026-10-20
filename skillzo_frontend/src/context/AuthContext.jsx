import React, { createContext, useContext, useState, useEffect } from 'react'
import * as authApi from '../api/auth'
import AuthPromptModal from '../components/AuthPromptModal'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalFeature, setAuthModalFeature] = useState('this feature')

  const loadUser = async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const queryToken = urlParams.get('auth_token')
    if (queryToken) {
      localStorage.setItem('skillzo_access', queryToken)
      localStorage.removeItem('skillzo_logged_out')
    }

    const access = localStorage.getItem('skillzo_access')
    if (!access) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const res = await authApi.getProfile()
      const isGuestStorage = localStorage.getItem('skillzo_is_guest') === 'true'
      if (isGuestStorage) {
        setUser({
          ...res.data,
          username: 'Guest Candidate',
          email: 'guest@skillzo.ai',
          is_guest: true,
          is_staff: false,
          is_superuser: false,
          is_leader: false,
        })
      } else {
        setUser(res.data)
      }
    } catch {
      localStorage.removeItem('skillzo_access')
      localStorage.removeItem('skillzo_refresh')
      localStorage.removeItem('skillzo_is_guest')
      setUser(null)
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
    setUser(res.data.user)
    return res.data
  }

  const signup = async (data) => {
    const res = await authApi.signup(data)
    localStorage.removeItem('skillzo_logged_out')
    localStorage.setItem('skillzo_access', res.data.tokens.access)
    localStorage.setItem('skillzo_refresh', res.data.tokens.refresh)
    localStorage.removeItem('skillzo_is_guest')
    setUser(res.data.user)
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
    setUser(guestUser)
    return { ...res.data, user: guestUser }
  }

  const logout = () => {
    localStorage.clear()
    localStorage.setItem('skillzo_logged_out', 'true')
    setUser(null)
  }

  const refreshUser = async () => {
    const res = await authApi.getProfile()
    setUser(res.data)
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

  const userEmail = (user?.email || '').toLowerCase().trim()
  const userName = (user?.username || '').toLowerCase().trim()
  const isLeader = Boolean(
    user && !user.is_guest && (
      user?.is_leader ||
      user?.is_staff ||
      user?.is_superuser ||
      userEmail === 'abhishekkushwaha13405@gmail.com' ||
      userEmail === 'abhish@gmail.com' ||
      userEmail === 'abhishekkushwaha31387@bbdu.ac.in' ||
      userName === 'abhishek13405' ||
      userName === 'abhish' ||
      userName === 'abhishekkushwaha31387' ||
      userEmail.includes('abhishek') ||
      userName.includes('abhishek')
    )
  )

  return (
    <AuthContext.Provider value={{
      isLeader, 
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
