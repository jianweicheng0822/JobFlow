import { Outlet } from 'react-router-dom'
import { AuthProvider } from '../context/AuthProvider'
import { ToastProvider } from '../context/ToastProvider'
import { LanguageProvider } from '../context/LanguageProvider'

// Root wrapper that provides app-wide contexts to the entire router tree
export default function RootLayout() {
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
