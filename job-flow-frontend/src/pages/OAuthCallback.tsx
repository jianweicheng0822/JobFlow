import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

export default function OAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useLanguage()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      localStorage.setItem('jobflow-token', token)
      window.location.href = '/'
    } else {
      navigate('/login', { replace: true })
    }
  }, [searchParams, navigate])

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
