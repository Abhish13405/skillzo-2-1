import api from './axios'

export const startInterview = (data) => api.post('/interview/start/', data)

export const submitAnswer = (sessionId, data) => api.post(`/interview/${sessionId}/answer/`, data)

export const completeInterview = (sessionId) => api.post(`/interview/${sessionId}/complete/`)

export const getInterviewHistory = () => api.get('/interview/history/')

export const getInterviewDetail = (sessionId) => api.get(`/interview/${sessionId}/`)
