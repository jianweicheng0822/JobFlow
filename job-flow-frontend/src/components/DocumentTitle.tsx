import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { documentTitle } from '../utils/documentTitle'

// Renders nothing; keeps the browser tab title in step with the route and language
export default function DocumentTitle() {
  const { pathname } = useLocation()
  const { t } = useLanguage()

  useEffect(() => {
    document.title = documentTitle(pathname, t)
  }, [pathname, t])

  return null
}
