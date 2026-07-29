import React, { createContext, useContext, useState, useEffect } from 'react'
import * as authApi from '../api/auth'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

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
    const res = await authApi.login({ email, password })
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

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  const refreshUser = async () => {
    const res = await authApi.getProfile()
    setUser(res.data)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
