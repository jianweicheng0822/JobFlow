import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../api/auth'
import type { AuthResponse, LoginRequest, RegisterRequest } from '../api/auth'

interface AuthUser {
  name: string
  email: string
  avatarUrl: string | null
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function toUser(data: AuthResponse): AuthUser {
  return { name: data.name, email: data.email, avatarUrl: data.avatarUrl }
}
