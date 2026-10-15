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
    const access = localStorage.getItem('skillzo_access')
    if (!access) {
      setLoading(false)
      return
    }
    try {
      const res = await authApi.getProfile()
      setUser(res.data)
    } catch {
      localStorage.clear()
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
    localStorage.setItem('skillzo_access', res.data.tokens.access)
    localStorage.setItem('skillzo_refresh', res.data.tokens.refresh)
    setUser(res.data.user)
    return res.data
  }

  const signup = async (data) => {
    const res = await authApi.signup(data)
    localStorage.setItem('skillzo_access', res.data.tokens.access)
    localStorage.setItem('skillzo_refresh', res.data.tokens.refresh)
    setUser(res.data.user)
    return res.data
  }

  const loginAsGuest = async () => {
    try {
      const res = await authApi.guestLogin()
      localStorage.setItem('skillzo_access', res.data.tokens.access)
      localStorage.setItem('skillzo_refresh', res.data.tokens.refresh)
      setUser({ ...res.data.user, is_guest: true })
      return res.data
    } catch {
      // Fallback: Use standard test candidate credentials
      const res = await authApi.login({ email: 'asti@gmail.com', password: 'Skillzo@2026' })
      localStorage.setItem('skillzo_access', res.data.tokens.access)
      localStorage.setItem('skillzo_refresh', res.data.tokens.refresh)
      setUser({ ...res.data.user, is_guest: true, username: 'Guest Candidate' })
      return res.data
    }
  }

  const logout = () => {
    localStorage.clear()
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

  return (
    <AuthContext.Provider value={{ 
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
