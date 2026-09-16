import { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Phone, Video, MapPin } from 'lucide-react'
import './Interviews.css'
import { getInterviews, deleteInterview } from '../api/interviews'
import type { InterviewDTO, InterviewType } from '../api/types'
import Modal from '../components/Modal'
import InterviewForm from '../components/InterviewForm'

// ===== Helpers =====
const TYPE_CONFIG: Record<InterviewType, { label: string; color: string; icon: typeof Phone }> = {
  PHONE: { label: 'Phone', color: '#f59e0b', icon: Phone },
  VIDEO: { label: 'Video', color: '#3b82f6', icon: Video },
  ONSITE: { label: 'Onsite', color: '#10b981', icon: MapPin },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function isUpcoming(dateStr: string): boolean {
  return new Date(dateStr) > new Date()
}

function InterviewsStatIcon({ type }: { type: string }) {
  switch (type) {
    case 'total':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    case 'upcoming':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'completed':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    default:
      return null
  }
}

export default function Interviews() {
  const [interviews, setInterviews] = useState<InterviewDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // CRUD modal state
  const [showModal, setShowModal] = useState(false)
  const [editingInterview, setEditingInterview] = useState<InterviewDTO | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<InterviewDTO | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getInterviews()
      setInterviews(res.data)
      setError(null)
    } catch (err) {
      console.error('Failed to load interviews:', err)
      setError('Failed to load data. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function openCreate() {
    setEditingInterview(undefined)
    setShowModal(true)
  }

  function openEdit(interview: InterviewDTO) {
    setEditingInterview(interview)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingInterview(undefined)
  }

  function handleFormSuccess() {
    closeModal()
    fetchData()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteInterview(deleteTarget.id)
      setDeleteTarget(null)
      fetchData()
    } catch (err) {
      console.error('Failed to delete interview:', err)
    }
  }

  const filteredInterviews = useMemo(() => {
    return interviews.filter((iv) => {
      const q = search.toLowerCase()
      const matchesSearch = !q
        || iv.positionTitle.toLowerCase().includes(q)
        || iv.companyName.toLowerCase().includes(q)
      const matchesType = !typeFilter || iv.interviewType === typeFilter
      return matchesSearch && matchesType
    })
  }, [interviews, search, typeFilter])

  // Sort: upcoming first (by date asc), then past (by date desc)
  const sortedInterviews = useMemo(() => {
    return [...filteredInterviews].sort((a, b) => {
      const aUp = isUpcoming(a.interviewDate)
      const bUp = isUpcoming(b.interviewDate)
      if (aUp && !bUp) return -1
      if (!aUp && bUp) return 1
      if (aUp && bUp) return new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime()
      return new Date(b.interviewDate).getTime() - new Date(a.interviewDate).getTime()
    })
  }, [filteredInterviews])

  const totalCount = interviews.length
  const upcomingCount = interviews.filter((iv) => isUpcoming(iv.interviewDate)).length
  const completedCount = totalCount - upcomingCount

  const statCards = [
    { label: 'Total Interviews', value: totalCount, icon: 'total' as const, colorClass: 'total' },
    { label: 'Upcoming', value: upcomingCount, icon: 'upcoming' as const, colorClass: 'upcoming' },
    { label: 'Completed', value: completedCount, icon: 'completed' as const, colorClass: 'completed' },
  ]

  const handleReset = () => {
    setSearch('')
    setTypeFilter('')
  }

  if (loading) {
    return <div className="interviews-page"><div className="interviews-loading">Loading...</div></div>
  }

  if (error) {
    return <div className="interviews-page"><div className="interviews-error">{error}</div></div>
  }

  return (
    <div className="interviews-page">
      {/* Stat Cards */}
      <div className="interviews-stat-cards">
        {statCards.map((card) => (
          <div className="interviews-stat-card" key={card.label}>
            <div className={`interviews-stat-card-icon interviews-stat-card-icon--${card.colorClass}`}>
              <InterviewsStatIcon type={card.icon} />
            </div>
            <div className="interviews-stat-card-info">
              <div className="interviews-stat-card-label">{card.label}</div>
              <div className="interviews-stat-card-value">{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Interview Table */}
      <div className="interviews-table-section">
        <div className="interviews-section-header">
          <h2 className="interviews-section-title">All Interviews</h2>
          <button className="interviews-add-btn" onClick={openCreate}>
            <Plus size={14} />
            New Interview
          </button>
        </div>

        {/* Filter Bar */}
        <div className="interviews-filter-bar">
          <div className="interviews-filter-dropdowns">
            <select
              className="interviews-filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="PHONE">Phone</option>
              <option value="VIDEO">Video</option>
              <option value="ONSITE">Onsite</option>
            </select>
          </div>
          <div className="interviews-filter-right">
            <div className="interviews-search-box">
              <svg className="interviews-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="interviews-search-input"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="interviews-add-btn" onClick={handleReset}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filter
            </button>
          </div>
        </div>

        <div className="interviews-table-wrapper">
          <table className="interviews-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Company</th>
                <th>Date</th>
                <th>Time</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedInterviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="interviews-table-empty">No interviews found.</td>
                </tr>
              ) : (
                sortedInterviews.map((iv) => {
                  const typeCfg = TYPE_CONFIG[iv.interviewType]
                  const upcoming = isUpcoming(iv.interviewDate)
                  const TypeIcon = typeCfg.icon
                  return (
                    <tr key={iv.id} className={upcoming ? '' : 'interviews-row--past'}>
                      <td>
                        <span className="interviews-position">{iv.positionTitle}</span>
                      </td>
                      <td>
                        <div className="interviews-company-cell">
                          <span
                            className="interviews-company-logo"
                            style={{ background: typeCfg.color }}
                          >
                            {iv.companyName.charAt(0)}
                          </span>
                          {iv.companyName}
                        </div>
                      </td>
                      <td>{formatDate(iv.interviewDate)}</td>
                      <td>{formatTime(iv.interviewDate)}</td>
                      <td>
                        <span className="interviews-type-badge" style={{ background: typeCfg.color }}>
                          <TypeIcon size={12} />
                          {typeCfg.label}
                        </span>
                      </td>
                      <td>
                        <span className={`interviews-status-badge interviews-status-badge--${upcoming ? 'upcoming' : 'completed'}`}>
                          {upcoming ? 'Upcoming' : 'Completed'}
                        </span>
                      </td>
                      <td>
                        <div className="interviews-actions">
                          <button className="interviews-action-btn interviews-action-btn--edit" title="Edit" onClick={() => openEdit(iv)}>
                            <Pencil size={14} />
                          </button>
                          <button className="interviews-action-btn interviews-action-btn--delete" title="Delete" onClick={() => setDeleteTarget(iv)}>
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

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal title={editingInterview ? 'Edit Interview' : 'Schedule Interview'} onClose={closeModal}>
          <InterviewForm
            interview={editingInterview}
            onSuccess={handleFormSuccess}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal title="Delete Interview" onClose={() => setDeleteTarget(null)}>
          <p style={{ marginBottom: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
            Are you sure you want to delete the interview for <strong>{deleteTarget.positionTitle}</strong> at <strong>{deleteTarget.companyName}</strong>? This action cannot be undone.
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
