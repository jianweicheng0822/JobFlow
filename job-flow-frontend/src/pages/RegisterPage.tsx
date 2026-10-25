import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import OAuthButtons from '../components/OAuthButtons'
import { useLeaveDemo } from '../hooks/useLeaveDemo'
import './LoginPage.css'
import { getErrorMessage } from '../api/client'

export default function RegisterPage() {
  useLeaveDemo()
  const { register } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t.passwordMismatch)
      return
    }

    setLoading(true)
    try {
      await register({ name, email, password })
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, t.registerFailed))
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

        <h1 className="auth-title">{t.createAccount}</h1>
        <p className="auth-subtitle">{t.registerSubtitle}</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">{t.fullName}</label>
            <input
              type="text"
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.fullNamePlaceholder}
              required
            />
          </div>
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
              placeholder={t.passwordHint}
              required
              minLength={6}
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">{t.confirmPassword}</label>
            <input
              type="password"
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.confirmPasswordPlaceholder}
              required
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? t.creatingAccount : t.createAccountBtn}
          </button>
        </form>

        <OAuthButtons />

        <p className="auth-footer">
          {t.haveAccount}<Link to="/login">{t.signIn}</Link>
        </p>
        <p className="auth-footer">
          <Link to="/privacy">{t.privacyPolicy}</Link>
        </p>
      </div>
    </div>
  )
}
