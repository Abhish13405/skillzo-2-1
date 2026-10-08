import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

const ProtectedRoute = ({ children, featureName = 'this feature', requireLeader = false }) => {
  const { user, loading, openAuthModal } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      openAuthModal(featureName)
    }
  }, [loading, user, openAuthModal, featureName])

  if (loading) return <Loader full />
  if (!user) return <Navigate to="/dashboard" replace />

  if (requireLeader) {
    const isLeader = Boolean(
      user.is_staff ||
      user.is_superuser ||
      (user.email && user.email.toLowerCase().includes('abhish')) ||
      (user.username && user.username.toLowerCase().includes('abhish'))
    )
    if (!isLeader) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

export default ProtectedRoute

