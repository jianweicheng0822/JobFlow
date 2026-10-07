import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../api/auth'
import { resetMockData, isDemoMode } from '../api/mockData'
import { browserTimeZone } from '../utils/date'
import type { AuthResponse, LoginRequest, RegisterRequest } from '../api/auth'
import { AuthContext, type AuthUser } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Show the user right away, then fill in their time zone in the background if
  // it's missing. Only swap the user in if they're still the one logged in.
  const signIn = useCallback((loggedIn: AuthUser) => {
    setUser(loggedIn)
    fillTimeZoneIfMissing(loggedIn).then((synced) => {
      if (synced !== loggedIn) {
        setUser((current) => (current?.email === synced.email ? synced : current))
      }
    })
  }, [])

  // On mount, verify existing token
  useEffect(() => {
    const token = localStorage.getItem('jobflow-token')
    if (!token) {
      setLoading(false)
      return
    }

    authApi.getMe()
      .then((res) => signIn(toUser(res.data)))
      .catch(() => localStorage.removeItem('jobflow-token'))
      .finally(() => setLoading(false))
  }, [signIn])

  const login = useCallback(async (data: LoginRequest) => {
    const res = await authApi.login(data)
    localStorage.setItem('jobflow-token', res.data.token!)
    signIn(toUser(res.data))
  }, [signIn])

  const register = useCallback(async (data: RegisterRequest) => {
    const res = await authApi.register(data)
    localStorage.setItem('jobflow-token', res.data.token!)
    signIn(toUser(res.data))
  }, [signIn])

  const logout = useCallback(() => {
    localStorage.removeItem('jobflow-token')
    setUser(null)
  }, [])

  const tryDemo = useCallback(() => {
    resetMockData()
    localStorage.setItem('jobflow-token', 'demo-token')
    setUser({ name: 'Demo User', email: 'demo@jobflow.com', avatarUrl: null, jobTitle: null, bio: null, hasPassword: true, gmailConnected: false, timeZone: browserTimeZone() })
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
  return { name: data.name, email: data.email, avatarUrl: data.avatarUrl, jobTitle: data.jobTitle, bio: data.bio, hasPassword: data.hasPassword, gmailConnected: data.gmailConnected, timeZone: data.timeZone ?? null }
}

// First sign-in on an account: save this device's zone so the backend can use the
// user's own "today" and send reminders on their clock. After that only Settings
// changes it, so travelling doesn't quietly move reminders. Never blocks sign-in.
async function fillTimeZoneIfMissing(user: AuthUser): Promise<AuthUser> {
  // Demo mode has no real backend to save to
  if (user.timeZone || isDemoMode()) return user
  const zone = browserTimeZone()
  if (!zone) return user
  try {
    const res = await authApi.updateTimeZone(zone)
    return { ...user, timeZone: res.data.timeZone ?? zone }
  } catch (err) {
    console.warn('Could not save the time zone, will try again next sign-in', err)
    return user
  }
}
