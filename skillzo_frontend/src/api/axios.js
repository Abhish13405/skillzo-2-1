import axios from 'axios'

const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://127.0.0.1:8000/api'
  const hostname = window.location.hostname
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)

  if (isLocal) {
    return `http://${hostname}:8000/api`
  }
  return 'https://skillzo-2-1-2.onrender.com/api'
}

export const API_BASE_URL = getApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const access = localStorage.getItem('skillzo_access')
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

// Auto-refresh access token on 401, retry original request once
let isRefreshing = false
let queue = []

const processQueue = (error, token = null) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  queue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const url = originalRequest?.url || ''

    // DO NOT intercept login, signup, or refresh endpoints to avoid page refresh loops
    if (
      url.includes('/auth/login') ||
      url.includes('/auth/signup') ||
      url.includes('/auth/token/refresh')
    ) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refresh = localStorage.getItem('skillzo_refresh')
      if (!refresh) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh })
        const newAccess = res.data.access
        localStorage.setItem('skillzo_access', newAccess)
        processQueue(null, newAccess)
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api
