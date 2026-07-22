import { useState, useMemo, useEffect } from 'react'
import './Companies.css'
import { getCompanies } from '../api/companies'
import { getApplications } from '../api/applications'
import type { CompanyDTO, JobApplicationDTO } from '../api/types'

// ===== Helpers =====
const COMPANY_COLORS: Record<string, string> = {
  'TechCorp Inc.': '#10b981',
  'Spotify': '#1DB954',
  'Google': '#4285F4',
  'Meta': '#0668E1',
  'Amazon': '#ff9900',
}

function getCompanyColor(name: string): string {
  return COMPANY_COLORS[name] || '#6b7280'
}

interface CompanyView {
  id: number
  name: string
  initial: string
  color: string
  location: string
  website: string
  jobsApplied: number
}

function buildCompanyViews(companies: CompanyDTO[], applications: JobApplicationDTO[]): CompanyView[] {
  const counts: Record<number, number> = {}
  applications.forEach((app) => {
    counts[app.company.id] = (counts[app.company.id] || 0) + 1
  })

  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    initial: c.name.charAt(0),
    color: getCompanyColor(c.name),
    location: c.location || '',
    website: c.website || '',
    jobsApplied: counts[c.id] || 0,
  }))
}

export default function Companies() {
  const [companyViews, setCompanyViews] = useState<CompanyView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const [companiesRes, appsRes] = await Promise.all([
          getCompanies(),
          getApplications(),
        ])
        setCompanyViews(buildCompanyViews(companiesRes.data, appsRes.data))
      } catch (err) {
        console.error('Failed to load companies:', err)
        setError('Failed to load data. Make sure the backend is running.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const locations = useMemo(() => [...new Set(companyViews.map((c) => c.location).filter(Boolean))], [companyViews])

  const filtered = useMemo(() => {
    return companyViews.filter((c) => {
      const q = search.toLowerCase()
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q)
      const matchesLocation = !locationFilter || c.location === locationFilter
      return matchesSearch && matchesLocation
    })
  }, [companyViews, search, locationFilter])

  const handleReset = () => {
    setSearch('')
    setLocationFilter('')
  }

  if (loading) {
    return <div className="companies-page"><div className="companies-loading">Loading...</div></div>
  }

  if (error) {
    return <div className="companies-page"><div className="companies-error">{error}</div></div>
  }

  return (
    <div className="companies-page">
      <h1 className="companies-page-title">Companies</h1>

      {/* Search & Filter Bar */}
      <div className="companies-filter-bar">
        <div className="companies-filter-left">
          <div className="companies-search-box">
            <svg className="companies-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="companies-search-input"
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="companies-filter-select"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="">Location</option>
            {locations.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <button className="companies-filter-btn" onClick={handleReset}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Reset
        </button>
      </div>

      {/* Company Cards */}
      <div className="companies-grid">
        {filtered.length === 0 ? (
          <div className="companies-empty">No companies found.</div>
        ) : (
          filtered.map((company) => (
            <div className="company-card" key={company.id}>
              <div className="company-card-header">
                <div
                  className="company-card-logo"
                  style={{ background: company.color }}
                >
                  {company.initial}
                </div>
                <div className="company-card-title">
                  <div className="company-card-name">{company.name}</div>
                  {company.website && (
                    <a className="company-card-website" href={company.website} target="_blank" rel="noopener noreferrer">
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>
              <div className="company-card-meta">
                <span className="company-card-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {company.location}
                </span>
                <span className="company-card-jobs-badge">
                  {company.jobsApplied} jobs applied
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
