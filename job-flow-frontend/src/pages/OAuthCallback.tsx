import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { exchangeOAuthCode } from '../api/auth'
import { getErrorMessage } from '../api/client'

export default function OAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useLanguage()
  // The code works only once, and StrictMode runs effects twice in dev
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const code = searchParams.get('code')
    if (!code) {
      navigate('/login', { replace: true })
      return
    }
    // Keep the code out of history even though it's single use
    window.history.replaceState(null, '', window.location.pathname)

    exchangeOAuthCode(code)
      .then(({ data }) => {
        if (!data.token) throw new Error(t.oauthFailed)
        localStorage.setItem('jobflow-token', data.token)
        // Full reload so AuthProvider starts fresh with the new token
        window.location.replace('/')
      })
      .catch((err) => {
        navigate('/login', { replace: true, state: { error: getErrorMessage(err, t.oauthFailed) } })
      })
  }, [searchParams, navigate, t])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      color: 'var(--text-secondary)',
      fontSize: 14,
    }}>
      {t.signingYouIn}
    </div>
  )
}
