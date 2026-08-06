import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

const ProtectedRoute = ({ children, featureName = 'this feature' }) => {
  const { user, loading, openAuthModal } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      openAuthModal(featureName)
    }
  }, [loading, user, openAuthModal, featureName])

  if (loading) return <Loader full />
  if (!user) return <Navigate to="/dashboard" replace />
  return children
}

export default ProtectedRoute

