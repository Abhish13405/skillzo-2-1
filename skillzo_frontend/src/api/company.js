import api from './axios'

export const getCompanyStats = () => api.get('/company/stats/')

export const getCompanyCandidates = (params) => api.get('/company/candidates/', { params })

export const getCompanyCandidateDetail = (id) => api.get(`/company/candidates/${id}/`)

export const updateCompanyCandidateStatus = (id, data) => api.post(`/company/candidates/${id}/status/`, data)

export const createLiveInterviewInvite = (data) => api.post('/company/invite/', data)

export const verifyInterviewToken = (token) => api.get(`/company/invite/verify/${token}/`)
