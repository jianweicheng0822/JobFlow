import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage, type Translations } from '../context/LanguageContext'
import OAuthButtons from '../components/OAuthButtons'
import { useLeaveDemo } from '../hooks/useLeaveDemo'
import './LoginPage.css'
import { getErrorMessage } from '../api/client'

export default function LoginPage() {
  useLeaveDemo()
  const { login, tryDemo } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const oauthError = searchParams.get('oauthError')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Set when an OAuth sign-in bounced back here: the backend sends ?oauthError=<code>,
  // OAuthCallback passes a message in state (e.g. an expired code)
  const [error, setError] = useState<string>(() =>
    oauthErrorMessage(oauthError, t) ?? (location.state as { error?: string } | null)?.error ?? '')
  const [loading, setLoading] = useState(false)

  // Drop the code from the address bar so a reload doesn't show the message again
  useEffect(() => {
    if (oauthError) setSearchParams({}, { replace: true })
  }, [oauthError, setSearchParams])

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
    <div className="auth-page auth-page--split">
      {/* A first-time visitor (or an interviewer) should see what this is and get
          to the demo without reading a sign-in form first */}
      <section className="auth-pitch">
        <div className="auth-logo auth-logo--light">
          <div className="auth-logo-icon">JF</div>
          <span className="auth-logo-text">{t.appName}</span>
        </div>
        <h2 className="auth-pitch-title">{t.pitchTitle}</h2>
        <p className="auth-pitch-text">{t.pitchText}</p>
        <ul className="auth-pitch-list">
          <li>{t.pitchPoint1}</li>
          <li>{t.pitchPoint2}</li>
          <li>{t.pitchPoint3}</li>
          <li>{t.pitchPoint4}</li>
        </ul>
        <button
          className="auth-pitch-demo"
          onClick={() => { tryDemo(); navigate('/', { replace: true }) }}
        >
          {t.tryDemo}
        </button>
        <p className="auth-pitch-note">{t.pitchDemoNote}</p>
      </section>

      <div className="auth-card">
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

        <p className="auth-footer">
          <Link to="/privacy">{t.privacyPolicy}</Link>
        </p>
      </div>
    </div>
  )
}

function oauthErrorMessage(code: string | null, t: Translations): string | null {
  switch (code) {
    case null: return null
    case 'cancelled': return t.oauthCancelled
    case 'email_in_use': return t.oauthEmailInUse
    default: return t.oauthFailed
  }
}
