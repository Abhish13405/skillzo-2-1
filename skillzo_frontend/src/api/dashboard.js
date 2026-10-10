import api from './axios'

export const getDashboardSummary = () => api.get('/dashboard/summary/')
export const getLeaderStats = () => api.get('/dashboard/leader-stats/')
