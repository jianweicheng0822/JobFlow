export type Theme = 'light' | 'dark'

// index.html reads the same key before the app loads, so keep them in sync
const THEME_STORAGE_KEY = 'jobflow-theme'

// Storage can be blocked (some private modes), so fall back to light
export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Still applied for this visit, just not remembered
  }
}
