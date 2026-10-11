import api from './axios'

export const listResumes = () => api.get('/resume/')

export const uploadResume = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  // Do not set Content-Type header manually - Axios and browser will set multipart/form-data with boundary
  return api.post('/resume/', formData)
}

export const analyzeResume = (id) => api.post(`/resume/${id}/analyze/`)

export const deleteResume = (id) => api.delete(`/resume/${id}/`)
