import type en from '../i18n/en'

type Strings = Record<keyof typeof en, string>

// The page's name in the browser tab, so several open tabs are easy to tell apart
const TITLE_KEYS: Record<string, keyof typeof en | null> = {
  '/': 'dashboard',
  '/jobs': 'jobs',
  '/interviews': 'interviews',
  '/analytics': 'analytics',
  '/settings': 'settings',
  '/login': 'signIn',
  '/register': 'signUp',
  '/privacy': 'privacyPolicy',
  // Pass through on the way somewhere else; no page of their own
  '/oauth/callback': null,
  '/companies': null,
}

export function documentTitle(pathname: string, t: Strings): string {
  const path = pathname.replace(/\/+$/, '') || '/'
  // Anything not listed lands on the catch-all "not found" route
  const key = path in TITLE_KEYS ? TITLE_KEYS[path] : 'notFoundTitle'
  return key ? `${t[key]} · ${t.appName}` : t.appName
}
