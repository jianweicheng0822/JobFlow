import { Link } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { isDemoMode } from '../api/mockData'
import './DemoBanner.css'

// Demo data only lives in memory, so tell people up front that a refresh
// starts over, and give them a way to make a real account instead. The
// register page ends the demo session itself (see useLeaveDemo).
export default function DemoBanner() {
  const { user } = useAuth()
  const { t } = useLanguage()

  if (!user || !isDemoMode()) return null

  return (
    <div className="demo-banner" role="status">
      <FlaskConical className="demo-banner-icon" aria-hidden="true" />
      <span>{t.demoBannerMessage}</span>
      {/* The tour lives on the dashboard; the state asks it to open even if you've seen it */}
      <Link to="/" state={{ tour: true }} className="demo-banner-link">
        {t.demoBannerTour}
      </Link>
      <span className="demo-banner-sep" aria-hidden="true">·</span>
      <Link to="/register" className="demo-banner-link">
        {t.demoBannerSignUp}
      </Link>
    </div>
  )
}
