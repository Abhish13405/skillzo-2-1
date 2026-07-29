import api from './axios'

export const listResumes = () => api.get('/resume/')

export const uploadResume = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/resume/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const analyzeResume = (id) => api.post(`/resume/${id}/analyze/`)
