import axios from 'axios'

const api = axios.create({
  baseURL: '',
  headers: {
    Accept: 'application/ld+json',
  },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('medisecours_token')
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: any) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('medisecours_token')
      localStorage.removeItem('medisecours_user')
      document.cookie = 'medisecours_token=; path=/; max-age=0'
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
