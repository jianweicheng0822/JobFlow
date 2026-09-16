import axios from 'axios'
import { isDemoMode, resolveMock } from './mockData'

const client = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('jobflow-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercept requests in demo mode and return mock data
client.interceptors.request.use((config) => {
  if (!isDemoMode()) return config

  const url = config.url || ''
  const method = (config.method || 'get').toLowerCase()
  const data = resolveMock(url, method)

  if (data !== undefined) {
    // Cancel the real request and return mock data via adapter
    config.adapter = () =>
      Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
  }
  return config
})

// Redirect to login on 401
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('jobflow-token')
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

/**
 * Extracts a human-readable error message from an axios error.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || fallback
  }
  if (err instanceof Error) {
    return err.message
  }
  return fallback
}

export default client
