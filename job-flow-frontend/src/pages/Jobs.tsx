import { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import './Jobs.css'
import { getApplications, deleteApplication } from '../api/applications'
import type { JobApplicationDTO, ApplicationStatus } from '../api/types'
import Modal from '../components/Modal'
import ApplicationForm from '../components/ApplicationForm'

// ===== Helpers =====
const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  APPLIED: { label: 'Applied', color: 'var(--status-applied)' },
  IN_REVIEW: { label: 'In Review', color: '#f59e0b' },
  PHONE_SCREEN: { label: 'Phone Screen', color: 'var(--status-phone-screen)' },
  INTERVIEW: { label: 'Interview', color: 'var(--status-interview)' },
  OFFER: { label: 'Offer', color: 'var(--status-offer)' },
  REJECTED: { label: 'Rejected', color: 'var(--status-rejected)' },
}

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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface TopEmployer {
  company: string
  initial: string
  color: string
  jobsApplied: number
}

function buildTopEmployers(apps: JobApplicationDTO[]): TopEmployer[] {
  const counts: Record<string, number> = {}
  apps.forEach((app) => {
    const name = app.company.name
    counts[name] = (counts[name] || 0) + 1
  })
  return Object.entries(counts)
    .map(([name, count]) => ({
      company: name,
      initial: name.charAt(0),
      color: getCompanyColor(name),
      jobsApplied: count,
    }))
    .sort((a, b) => b.jobsApplied - a.jobsApplied)
}

function JobsStatIcon({ type }: { type: string }) {
  switch (type) {
    case 'active':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case 'saved':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'closed':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )
    default:
      return null
  }
}

function JobsTrendLine({ direction }: { direction: 'up' | 'down' }) {
  return (
    <div className={`jobs-stat-card-trend jobs-stat-card-trend--${direction}`}>
      <svg viewBox="0 0 32 20" fill="none">
        {direction === 'up' ? (
          <polyline
            points="2,16 8,12 14,14 20,8 26,4 30,2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <polyline
            points="2,4 8,6 14,8 20,14 26,16 30,18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  )
}

export default function Jobs() {
  const [applications, setApplications] = useState<JobApplicationDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  // CRUD modal state
  const [showModal, setShowModal] = useState(false)
  const [editingApp, setEditingApp] = useState<JobApplicationDTO | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<JobApplicationDTO | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getApplications()
      setApplications(res.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load jobs:', err)
      setError('Failed to load data. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function openCreate() {
    setEditingApp(undefined)
    setShowModal(true)
  }

  function openEdit(app: JobApplicationDTO) {
    setEditingApp(app)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingApp(undefined)
  }

  function handleFormSuccess() {
    closeModal()
    fetchData()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteApplication(deleteTarget.id)
      setDeleteTarget(null)
      fetchData()
    } catch (err) {
      console.error('Failed to delete application:', err)
    }
  }

  const companies = useMemo(() => [...new Set(applications.map((a) => a.company.name))], [applications])
  const roles = useMemo(() => [...new Set(applications.map((a) => a.positionTitle))], [applications])
  const locations = useMemo(() => [...new Set(applications.map((a) => a.location).filter(Boolean) as string[])], [applications])

  const filteredJobs = useMemo(() => {
    return applications.filter((app) => {
      const q = search.toLowerCase()
      const matchesSearch = !q || app.positionTitle.toLowerCase().includes(q) || app.company.name.toLowerCase().includes(q)
      const matchesCompany = !companyFilter || app.company.name === companyFilter
      const matchesRole = !roleFilter || app.positionTitle === roleFilter
      const matchesLocation = !locationFilter || app.location === locationFilter
      return matchesSearch && matchesCompany && matchesRole && matchesLocation
    })
  }, [applications, search, companyFilter, roleFilter, locationFilter])

  const topEmployers = useMemo(() => buildTopEmployers(applications), [applications])

  const activeCount = applications.filter((a) => !['OFFER', 'REJECTED'].includes(a.status)).length
  const closedCount = applications.filter((a) => ['OFFER', 'REJECTED'].includes(a.status)).length

  const jobsStatCards = [
    { label: 'Active Applications', value: activeCount, icon: 'active' as const, trend: 'up' as const },
    { label: 'Saved Jobs', value: 0, icon: 'saved' as const, trend: 'up' as const },
    { label: 'Closed', value: closedCount, icon: 'closed' as const, trend: 'down' as const },
  ]

  const handleReset = () => {
    setSearch('')
    setCompanyFilter('')
    setRoleFilter('')
    setLocationFilter('')
  }

  if (loading) {
    return <div className="jobs-page"><div className="jobs-loading">Loading...</div></div>
  }

  if (error) {
    return <div className="jobs-page"><div className="jobs-error">{error}</div></div>
  }

  return (
    <div className="jobs-page">
      {/* Stat Cards */}
      <div className="jobs-stat-cards">
        {jobsStatCards.map((card) => (
          <div className="jobs-stat-card" key={card.label}>
            <div className={`jobs-stat-card-icon jobs-stat-card-icon--${card.icon}`}>
              <JobsStatIcon type={card.icon} />
            </div>
            <div className="jobs-stat-card-info">
              <div className="jobs-stat-card-label">{card.label}</div>
              <div className="jobs-stat-card-value">{card.value}</div>
            </div>
            <JobsTrendLine direction={card.trend} />
          </div>
        ))}
      </div>

      {/* Main content + right sidebar */}
      <div className="jobs-main">
        <div className="jobs-content">
          {/* Job Positions Table */}
          <div className="jobs-table-section">
            <div className="jobs-section-header">
              <h2 className="jobs-section-title">Job Positions</h2>
              <button className="jobs-filter-btn" onClick={openCreate}>
                <Plus size={14} />
                New Application
              </button>
            </div>

            {/* Filter Bar */}
            <div className="jobs-filter-bar">
              <div className="jobs-filter-dropdowns">
                <select
                  className="jobs-filter-select"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                >
                  <option value="">By Company</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  className="jobs-filter-select"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">Role</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <select
                  className="jobs-filter-select"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                >
                  <option value="">Location</option>
                  {locations.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="jobs-filter-right">
                <div className="jobs-search-box">
                  <svg className="jobs-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="jobs-search-input"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button className="jobs-filter-btn" onClick={handleReset}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  Filter
                </button>
              </div>
            </div>

            <div className="jobs-table-wrapper">
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Company Logo</th>
                    <th>Location</th>
                    <th>Date Applied ↕</th>
                    <th>Stage</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="jobs-table-empty">No matching jobs found.</td>
                    </tr>
                  ) : (
                    filteredJobs.map((app) => {
                      const statusCfg = STATUS_CONFIG[app.status]
                      const companyColor = getCompanyColor(app.company.name)
                      return (
                        <tr key={app.id}>
                          <td>
                            <div className="jobs-title-cell">
                              <span className="jobs-title-name">{app.positionTitle}</span>
                              <span className="jobs-title-company">{app.company.name}</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className="jobs-company-logo"
                              style={{ background: companyColor }}
                            >
                              {app.company.name.charAt(0)}
                            </span>
                          </td>
                          <td>{app.location || ''}</td>
                          <td>{formatDate(app.appliedDate)}</td>
                          <td>
                            <span
                              className="jobs-stage-badge"
                              style={{ background: statusCfg.color }}
                            >
                              {statusCfg.label}
                            </span>
                          </td>
                          <td>
                            <div className="jobs-actions">
                              <button className="jobs-action-btn jobs-action-btn--edit" title="Edit" onClick={() => openEdit(app)}>
                                <Pencil size={14} />
                              </button>
                              <button className="jobs-action-btn jobs-action-btn--delete" title="Delete" onClick={() => setDeleteTarget(app)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="jobs-sidebar">
          <div className="jobs-top-employers">
            <h3 className="jobs-sidebar-title">Top Employers</h3>
            <div className="jobs-employers-list">
              {topEmployers.map((employer) => (
                <div className="jobs-employer-item" key={employer.company}>
                  <span
                    className="jobs-employer-logo"
                    style={{ background: employer.color }}
                  >
                    {employer.initial}
                  </span>
                  <div className="jobs-employer-info">
                    <div className="jobs-employer-name">{employer.company}</div>
                    <div className="jobs-employer-count">{employer.jobsApplied} jobs applied</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal title={editingApp ? 'Edit Application' : 'New Application'} onClose={closeModal}>
          <ApplicationForm
            application={editingApp}
            onSuccess={handleFormSuccess}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal title="Delete Application" onClose={() => setDeleteTarget(null)}>
          <p style={{ marginBottom: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
            Are you sure you want to delete <strong>{deleteTarget.positionTitle}</strong> at <strong>{deleteTarget.company.name}</strong>? This action cannot be undone.
          </p>
          <div className="app-form-actions">
            <button className="app-form-btn app-form-btn--cancel" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button className="app-form-btn app-form-btn--submit" style={{ background: 'var(--status-rejected)' }} onClick={handleDelete}>
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
