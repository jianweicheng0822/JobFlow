import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import './LoginPage.css'
import './StatusPage.css'

// Shown for any URL that doesn't match a route. "/" sends signed-in users to the
// dashboard and everyone else on to the login page.
export default function NotFoundPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">JF</div>
          <span className="auth-logo-text">{t.appName}</span>
        </div>

        <h1 className="auth-title">{t.notFoundTitle}</h1>
        <p className="auth-subtitle">{t.notFoundMessage}</p>

        <div className="status-actions">
          <button className="auth-btn" onClick={() => navigate('/', { replace: true })}>
            {t.backToHome}
          </button>
        </div>
      </div>
    </div>
  )
}
