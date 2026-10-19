import api from './axios'

export const getDashboardSummary = (params) => api.get('/dashboard/summary/', { params })
export const getLeaderStats = () => api.get('/dashboard/leader-stats/')
