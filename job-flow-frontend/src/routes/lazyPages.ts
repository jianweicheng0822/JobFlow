import { lazy } from 'react'

// The signed-in pages load on demand so the login screen doesn't pay for
// charts and tables it never shows. Analytics pulls in recharts, the biggest piece.
const loaders = {
  dashboard: () => import('../pages/Dashboard'),
  jobs: () => import('../pages/Jobs'),
  interviews: () => import('../pages/Interviews'),
  analytics: () => import('../pages/Analytics'),
  settings: () => import('../pages/SettingsPage'),
}

export const Dashboard = lazy(loaders.dashboard)
export const Jobs = lazy(loaders.jobs)
export const Interviews = lazy(loaders.interviews)
export const Analytics = lazy(loaders.analytics)
export const SettingsPage = lazy(loaders.settings)

// Fetch the rest in the background once someone is in the app,
// so the first click on a sidebar link doesn't wait on the network
export function preloadPages() {
  Object.values(loaders).forEach((load) => load().catch(() => {}))
}
