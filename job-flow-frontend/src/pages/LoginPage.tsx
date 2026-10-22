import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import OAuthButtons from '../components/OAuthButtons'
import './LoginPage.css'
import { getErrorMessage } from '../api/client'

export default function LoginPage() {
  const { login, tryDemo } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Set when an OAuth sign-in bounced back here (e.g. an expired code)
  const [error, setError] = useState<string>(() => (location.state as { error?: string } | null)?.error ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email, password })
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, t.loginFailed))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">JF</div>
          <span className="auth-logo-text">{t.appName}</span>
        </div>

        <h1 className="auth-title">{t.welcomeBack}</h1>
        <p className="auth-subtitle">{t.signInSubtitle}</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">{t.email}</label>
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">{t.password}</label>
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              required
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? t.signingIn : t.signIn}
          </button>
        </form>

        <OAuthButtons />

        <p className="auth-footer">
          {t.noAccount}<Link to="/register">{t.signUp}</Link>
        </p>

        <button
          className="auth-demo-btn"
          onClick={() => { tryDemo(); navigate('/', { replace: true }) }}
        >
          {t.tryDemo}
        </button>

        <p className="auth-footer">
          <Link to="/privacy">{t.privacyPolicy}</Link>
        </p>
      </div>
    </div>
  )
}
