import { createContext, useContext } from 'react'
import type { LoginRequest, RegisterRequest } from '../api/auth'

// The provider lives in AuthProvider.tsx so this file has no components (keeps fast refresh happy)

export interface AuthUser {
  name: string
  email: string
  avatarUrl: string | null
  jobTitle: string | null
  bio: string | null
  hasPassword: boolean
  gmailConnected: boolean
  timeZone: string | null
}

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  tryDemo: () => void
  updateUser: (user: AuthUser) => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
