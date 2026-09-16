import { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import './Companies.css'
import { getCompanies, deleteCompany } from '../api/companies'
import { getApplications } from '../api/applications'
import type { CompanyDTO, JobApplicationDTO } from '../api/types'
import Modal from '../components/Modal'
import CompanyForm from '../components/CompanyForm'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../api/client'

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
  logoUrl: string | null
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
    logoUrl: c.logoUrl,
    jobsApplied: counts[c.id] || 0,
  }))
}

export default function Companies() {
  const [companies, setCompanies] = useState<CompanyDTO[]>([])
  const [applications, setApplications] = useState<JobApplicationDTO[]>([])
  const [companyViews, setCompanyViews] = useState<CompanyView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  // CRUD modal state
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<CompanyDTO | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<CompanyView | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const { showToast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [companiesRes, appsRes] = await Promise.all([
        getCompanies(),
        getApplications(),
      ])
      setCompanies(companiesRes.data)
      setApplications(appsRes.data)
      setCompanyViews(buildCompanyViews(companiesRes.data, appsRes.data))
      setError(null)
    } catch (err) {
      console.error('Failed to load companies:', err)
      setError('Failed to load data. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function openCreate() {
    setEditingCompany(undefined)
    setShowModal(true)
  }

  function openEdit(view: CompanyView) {
    const dto = companies.find((c) => c.id === view.id)
    setEditingCompany(dto)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingCompany(undefined)
  }

  function handleFormSuccess() {
    closeModal()
    fetchData()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteCompany(deleteTarget.id)
      showToast('Company deleted', 'success')
      fetchData()
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete company'), 'error')
    } finally {
      setDeleteTarget(null)
      setDeleteLoading(false)
    }
  }

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
      <div className="companies-page-header">
        <h1 className="companies-page-title">Companies</h1>
        <button className="companies-filter-btn" onClick={openCreate}>
          <Plus size={14} />
          New Company
        </button>
      </div>

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
                <div className="company-card-actions">
                  <button className="company-card-action-btn company-card-action-btn--edit" title="Edit" onClick={() => openEdit(company)}>
                    <Pencil size={14} />
                  </button>
                  <button className="company-card-action-btn company-card-action-btn--delete" title="Delete" onClick={() => setDeleteTarget(company)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="company-card-meta">
                <span className="company-card-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {company.location || 'No location'}
                </span>
                <span className="company-card-jobs-badge">
                  {company.jobsApplied} jobs applied
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal title={editingCompany ? 'Edit Company' : 'New Company'} onClose={closeModal}>
          <CompanyForm
            company={editingCompany}
            onSuccess={handleFormSuccess}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal title="Delete Company" onClose={() => setDeleteTarget(null)}>
          <p style={{ marginBottom: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
            {deleteTarget.jobsApplied > 0 && (
              <span style={{ display: 'block', marginTop: 8, color: 'var(--status-rejected)' }}>
                This will also delete {deleteTarget.jobsApplied} associated application{deleteTarget.jobsApplied > 1 ? 's' : ''} and their interviews.
              </span>
            )}
          </p>
          <div className="app-form-actions">
            <button className="app-form-btn app-form-btn--cancel" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button className="app-form-btn app-form-btn--submit" style={{ background: 'var(--status-rejected)' }} onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
