import { createBrowserRouter } from 'react-router-dom'
import Layout from '../components/Layout'
import Dashboard from '../pages/Dashboard'
import Jobs from '../pages/Jobs'
import Companies from '../pages/Companies'
import Analytics from '../pages/Analytics'
import SettingsPage from '../pages/SettingsPage'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/jobs', element: <Jobs /> },
      { path: '/companies', element: <Companies /> },
      { path: '/analytics', element: <Analytics /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])
