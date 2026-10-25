import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import './LoginPage.css'
import './StatusPage.css'

// Catches anything a page throws while rendering. The details only go to the
// console; users get a plain message and a way out.
export default function ErrorPage() {
  const error = useRouteError()
  const { t } = useLanguage()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">JF</div>
          <span className="auth-logo-text">{t.appName}</span>
        </div>

        <h1 className="auth-title">{t.errorPageTitle}</h1>
        <p className="auth-subtitle">{t.errorPageMessage}</p>

        <div className="status-actions">
          <button className="auth-btn" onClick={() => window.location.reload()}>
            {t.reloadPage}
          </button>
          {/* A full page load, so whatever state broke the page is gone */}
          <button className="status-secondary-btn" onClick={() => window.location.assign('/')}>
            {t.backToHome}
          </button>
        </div>
      </div>
    </div>
  )
}
