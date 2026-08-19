import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      const loginUrl = `${import.meta.env.BASE_URL}login`
      if (window.location.pathname !== loginUrl) {
        window.location.href = loginUrl
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
