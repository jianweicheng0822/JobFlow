import { createBrowserRouter, Outlet } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import Dashboard from '../pages/Dashboard'
import Jobs from '../pages/Jobs'
import Companies from '../pages/Companies'
import Analytics from '../pages/Analytics'
import SettingsPage from '../pages/SettingsPage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'

// Root wrapper that provides AuthContext to the entire router tree
function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public routes
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },

      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
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
        ],
      },
    ],
  },
])
