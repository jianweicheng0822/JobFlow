import { useState, useMemo } from 'react'
import './Companies.css'

// ===== Types =====
interface Company {
  id: number
  name: string
  initial: string
  color: string
  industry: string
  location: string
  description: string
  jobsApplied: number
}

// ===== Mock Data =====
const companies: Company[] = [
  {
    id: 1,
    name: 'Spotify',
    initial: 'S',
    color: '#1DB954',
    industry: 'Music & Entertainment',
    location: 'Stockholm, Sweden',
    description: 'Spotify is a digital music, podcast, and video service that gives you access to millions of songs and other content from creators all over the world.',
    jobsApplied: 5,
  },
  {
    id: 2,
    name: 'Google',
    initial: 'G',
    color: '#4285F4',
    industry: 'Technology',
    location: 'Mountain View, USA',
    description: 'Google is a multinational technology company specializing in search engine technology, online advertising, cloud computing, and AI-driven products.',
    jobsApplied: 3,
  },
  {
    id: 3,
    name: 'TechCorp',
    initial: 'T',
    color: '#10b981',
    industry: 'Software',
    location: 'Stockholm, Sweden',
    description: 'TechCorp is an innovative software company focused on building enterprise solutions for modern businesses, spanning cloud infrastructure and SaaS platforms.',
    jobsApplied: 4,
  },
  {
    id: 4,
    name: 'Meta',
    initial: 'M',
    color: '#0668E1',
    industry: 'Social Media',
    location: 'London, UK',
    description: 'Meta builds technologies that help people connect, find communities, and grow businesses. Known for Facebook, Instagram, WhatsApp, and its metaverse vision.',
    jobsApplied: 1,
  },
  {
    id: 5,
    name: 'Amazon',
    initial: 'A',
    color: '#ff9900',
    industry: 'E-Commerce & Cloud',
    location: 'Seattle, USA',
    description: 'Amazon is a global leader in e-commerce, cloud computing (AWS), digital streaming, and artificial intelligence, serving millions of customers worldwide.',
    jobsApplied: 2,
  },
  {
    id: 6,
    name: 'Acme Corp',
    initial: 'A',
    color: '#4f6ef7',
    industry: 'Consulting',
    location: 'Stockholm, Sweden',
    description: 'Acme Corp is a management consulting firm that partners with organizations to drive strategic growth, operational efficiency, and digital transformation.',
    jobsApplied: 3,
  },
]

export default function Companies() {
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  const industries = useMemo(() => [...new Set(companies.map((c) => c.industry))], [])
  const locations = useMemo(() => [...new Set(companies.map((c) => c.location))], [])

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      const q = search.toLowerCase()
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)
      const matchesIndustry = !industryFilter || c.industry === industryFilter
      const matchesLocation = !locationFilter || c.location === locationFilter
      return matchesSearch && matchesIndustry && matchesLocation
    })
  }, [search, industryFilter, locationFilter])

  const handleReset = () => {
    setSearch('')
    setIndustryFilter('')
    setLocationFilter('')
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
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
          >
            <option value="">Industry</option>
            {industries.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
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
                  <div className="company-card-industry">{company.industry}</div>
                </div>
              </div>
              <p className="company-card-desc">{company.description}</p>
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
