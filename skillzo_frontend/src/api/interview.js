import api from './axios'

export const startInterview = (data) => api.post('/interview/start/', data)

export const submitAnswer = (sessionId, data) => {
  if (data instanceof FormData) {
    return api.post(`/interview/${sessionId}/answer/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }
  if (data && (data.video_file || data.audio_file)) {
    const fd = new FormData()
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null) {
        if (key === 'video_file') {
          fd.append('video_file', data[key], `video_${sessionId}_${Date.now()}.webm`)
        } else if (key === 'audio_file') {
          fd.append('audio_file', data[key], `audio_${sessionId}_${Date.now()}.webm`)
        } else {
          fd.append(key, data[key])
        }
      }
    })
    return api.post(`/interview/${sessionId}/answer/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }
  return api.post(`/interview/${sessionId}/answer/`, data)
}

export const uploadInterviewRecording = (sessionId, formData) =>
  api.post(`/interview/${sessionId}/upload-recording/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })

export const completeInterview = (sessionId) => api.post(`/interview/${sessionId}/complete/`)

export const getInterviewHistory = () => api.get('/interview/history/')

export const getInterviewDetail = (sessionId) => api.get(`/interview/${sessionId}/`)
