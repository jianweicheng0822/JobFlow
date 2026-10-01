import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Camera, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { getApplications } from '../api/applications'
import { getCompanies } from '../api/companies'
import type { JobApplicationDTO, CompanyDTO } from '../api/types'
import './TopBar.css'

const AVATAR_STORAGE_KEY = 'jobflow-avatar'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getGreeting(t: { goodMorning: string; goodAfternoon: string; goodEvening: string }): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return t.goodMorning
  if (hour >= 12 && hour < 18) return t.goodAfternoon
  return t.goodEvening
}

export default function TopBar() {
  const { user, logout, updateUser } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [avatar, setAvatar] = useState<string | null>(() => {
    return localStorage.getItem(AVATAR_STORAGE_KEY)
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Search state
  const [query, setQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [applications, setApplications] = useState<JobApplicationDTO[]>([])
  const [companies, setCompanies] = useState<CompanyDTO[]>([])
  const [loaded, setLoaded] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const displayName = user?.name || 'User'
  const initials = getInitials(displayName)
  const avatarSrc = user?.avatarUrl || avatar

  // Fetch data on first focus
  const handleSearchFocus = async () => {
    setShowResults(true)
    if (!loaded) {
      try {
        const [appsRes, compsRes] = await Promise.all([
          getApplications(),
          getCompanies(),
        ])
        setApplications(appsRes.data)
        setCompanies(compsRes.data)
        setLoaded(true)
      } catch {
        // Silently fail — search just won't show results
      }
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowResults(false)
    }
  }

  // Filter results
  const lowerQuery = query.toLowerCase().trim()

  const filteredApps = lowerQuery
    ? applications
        .filter(
          (app) =>
            app.positionTitle.toLowerCase().includes(lowerQuery) ||
            app.company.name.toLowerCase().includes(lowerQuery) ||
            (app.location && app.location.toLowerCase().includes(lowerQuery)),
        )
        .slice(0, 5)
    : []

  const filteredCompanies = lowerQuery
    ? companies
        .filter(
          (c) =>
            c.name.toLowerCase().includes(lowerQuery) ||
            (c.location && c.location.toLowerCase().includes(lowerQuery)),
        )
        .slice(0, 5)
    : []

  const hasResults = filteredApps.length > 0 || filteredCompanies.length > 0

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl)
      setAvatar(dataUrl)
      if (user) {
        updateUser({ ...user, avatarUrl: dataUrl })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <div className="topbar-greeting">
        <h1>{getGreeting(t)}, {displayName.split(' ')[0]}!</h1>
      </div>

      <div className="topbar-right">
        <div className="topbar-search" ref={searchRef}>
          <Search size={16} />
          <input
            type="text"
            placeholder={t.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleSearchFocus}
            onKeyDown={handleKeyDown}
          />

          {showResults && lowerQuery && (
            <div className="topbar-search-results">
              {hasResults ? (
                <>
                  {filteredApps.length > 0 && (
                    <div>
                      <div className="topbar-search-section">{t.jobs}</div>
                      {filteredApps.map((app) => (
                        <div
                          key={app.id}
                          className="topbar-search-item"
                          onClick={() => {
                            setShowResults(false)
                            setQuery('')
                            navigate('/jobs')
                          }}
                        >
                          <div className="topbar-search-item-title">{app.positionTitle}</div>
                          <div className="topbar-search-item-subtitle">
                            {app.company.name}{app.location ? ` · ${app.location}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {filteredCompanies.length > 0 && (
                    <div>
                      <div className="topbar-search-section">{t.companies}</div>
                      {filteredCompanies.map((c) => (
                        <div
                          key={c.id}
                          className="topbar-search-item"
                          onClick={() => {
                            setShowResults(false)
                            setQuery('')
                            navigate('/companies')
                          }}
                        >
                          <div className="topbar-search-item-title">{c.name}</div>
                          <div className="topbar-search-item-subtitle">
                            {c.location || t.noLocation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="topbar-search-empty">{t.noSearchResults}</div>
              )}
            </div>
          )}
        </div>

        <div className="topbar-avatar">
          <div className="topbar-avatar-img" onClick={handleAvatarClick}>
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="topbar-avatar-photo" />
            ) : (
              initials
            )}
            <div className="topbar-avatar-overlay">
              <Camera size={14} />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              hidden
            />
          </div>
          <div className="topbar-avatar-info">
            <span className="topbar-avatar-name">{displayName}</span>
          </div>
        </div>

        <button className="topbar-logout" onClick={handleLogout} title={t.signOut}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
