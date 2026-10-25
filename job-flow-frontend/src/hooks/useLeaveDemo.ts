import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { isDemoMode } from '../api/mockData'

/**
 * Ends a demo session when the login or register page opens. While the demo
 * token is stored, every request is answered by the mock data, so signing in
 * or signing up would never reach the real server.
 *
 * Only checked once on open (logout is stable), so clicking "Try Demo" on the
 * login page afterwards still works.
 */
export function useLeaveDemo(): void {
  const { logout } = useAuth()

  useEffect(() => {
    if (isDemoMode()) logout()
  }, [logout])
}
