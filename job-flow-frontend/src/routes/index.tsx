import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import RootLayout from '../components/RootLayout'
import Layout from '../components/Layout'
import ProtectedRoute from '../components/ProtectedRoute'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import OAuthCallback from '../pages/OAuthCallback'
import PrivacyPage from '../pages/PrivacyPage'
import NotFoundPage from '../pages/NotFoundPage'
import ErrorPage from '../pages/ErrorPage'
import { Dashboard, Jobs, Interviews, Analytics, SettingsPage } from './lazyPages'

// Exported on its own so tests can mount the same tree in a memory router
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        // Sits inside RootLayout so the error page still has language and auth
        errorElement: <ErrorPage />,
        children: [
          // Public routes
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/oauth/callback', element: <OAuthCallback /> },
          // Google requires a public privacy policy for apps that use its sign-in and APIs
          { path: '/privacy', element: <PrivacyPage /> },

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
                  // Companies used to have their own page; keep old links working
                  { path: '/companies', element: <Navigate to="/jobs" replace /> },
                  { path: '/analytics', element: <Analytics /> },
                  { path: '/settings', element: <SettingsPage /> },
                ],
              },
            ],
          },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
