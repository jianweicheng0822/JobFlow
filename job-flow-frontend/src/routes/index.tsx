import { createBrowserRouter, Outlet } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import { LanguageProvider } from '../context/LanguageContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import Dashboard from '../pages/Dashboard'
import Jobs from '../pages/Jobs'
import Companies from '../pages/Companies'
import Interviews from '../pages/Interviews'
import Analytics from '../pages/Analytics'
import SettingsPage from '../pages/SettingsPage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import OAuthCallback from '../pages/OAuthCallback'

// Root wrapper that provides AuthContext to the entire router tree
function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public routes
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/oauth/callback', element: <OAuthCallback /> },

      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <Layout />,
            children: [
              { path: '/', element: <Dashboard /> },
              { path: '/jobs', element: <Jobs /> },
              { path: '/interviews', element: <Interviews /> },
              { path: '/companies', element: <Companies /> },
              { path: '/analytics', element: <Analytics /> },
              { path: '/settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
])
