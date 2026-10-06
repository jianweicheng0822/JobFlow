import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../api/auth'
import { resetMockData } from '../api/mockData'
import type { AuthResponse, LoginRequest, RegisterRequest } from '../api/auth'
import { AuthContext, type AuthUser } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount, verify existing token
  useEffect(() => {
    const token = localStorage.getItem('jobflow-token')
    if (!token) {
      setLoading(false)
      return
    }

    authApi.getMe()
      .then((res) => setUser(toUser(res.data)))
      .catch(() => localStorage.removeItem('jobflow-token'))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (data: LoginRequest) => {
    const res = await authApi.login(data)
    localStorage.setItem('jobflow-token', res.data.token!)
    setUser(toUser(res.data))
  }, [])

  const register = useCallback(async (data: RegisterRequest) => {
    const res = await authApi.register(data)
    localStorage.setItem('jobflow-token', res.data.token!)
    setUser(toUser(res.data))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('jobflow-token')
    setUser(null)
  }, [])

  const tryDemo = useCallback(() => {
    resetMockData()
    localStorage.setItem('jobflow-token', 'demo-token')
    setUser({ name: 'Demo User', email: 'demo@jobflow.com', avatarUrl: null, jobTitle: null, bio: null, hasPassword: true, gmailConnected: false })
  }, [])

  const updateUser = useCallback((updated: AuthUser) => {
    setUser(updated)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, tryDemo, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

function toUser(data: AuthResponse): AuthUser {
  return { name: data.name, email: data.email, avatarUrl: data.avatarUrl, jobTitle: data.jobTitle, bio: data.bio, hasPassword: data.hasPassword, gmailConnected: data.gmailConnected }
}
