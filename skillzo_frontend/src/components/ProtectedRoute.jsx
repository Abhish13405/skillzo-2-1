import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from './Loader'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) return <Loader full />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default ProtectedRoute
