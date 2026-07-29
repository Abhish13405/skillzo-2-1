import api from './axios'

export const signup = (data) => api.post('/auth/signup/', data)

export const login = (data) => api.post('/auth/login/', data)

export const forgotPassword = (email) => api.post('/auth/forgot-password/', { email })

export const resetPassword = (data) => api.post('/auth/reset-password/', data)

export const getProfile = () => api.get('/auth/profile/')

export const updateProfile = (data) => api.patch('/auth/profile/', data)
