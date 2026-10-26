import { useEffect, useState } from 'react'
import { getAuthProviders, type AuthProviders } from '../api/auth'

const NONE: AuthProviders = { google: false, github: false, gmail: false, emailReminders: false }

/**
 * Which OAuth sign-in options and integrations this server supports.
 * Null while loading. If the request fails everything counts as off, so the
 * page still works with plain email/password.
 */
export function useAuthProviders(): AuthProviders | null {
  const [providers, setProviders] = useState<AuthProviders | null>(null)

  useEffect(() => {
    let cancelled = false
    getAuthProviders()
      .then(({ data }) => { if (!cancelled) setProviders(data) })
      .catch(() => { if (!cancelled) setProviders(NONE) })
    return () => { cancelled = true }
  }, [])

  return providers
}
