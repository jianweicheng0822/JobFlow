import { useState, useEffect } from 'react'
import './Dashboard.css'
import { getStats, getApplications, getRecentApplications } from '../api/applications'
import { getUpcomingInterviews } from '../api/interviews'
import type { DashboardStatsDTO, JobApplicationDTO, InterviewDTO, ApplicationStatus } from '../api/types'

// ===== Types =====
interface PipelineCard {
  id: number
  title: string
  company: string
  location: string
  salary: string
  date: string
  tag?: string
}

interface PipelineColumn {
  stage: string
  count: number
  color: string
  cards: PipelineCard[]
}

// ===== Helpers =====
const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  APPLIED: { label: 'Applied', color: 'var(--status-applied)' },
  IN_REVIEW: { label: 'In Review', color: 'var(--status-applied)' },
  PHONE_SCREEN: { label: 'Phone Screen', color: 'var(--status-phone-screen)' },
  INTERVIEW: { label: 'Interview', color: 'var(--status-interview)' },
  OFFER: { label: 'Offer', color: 'var(--status-offer)' },
  REJECTED: { label: 'Rejection', color: 'var(--status-rejected)' },
}

const COMPANY_COLORS: Record<string, string> = {
  'TechCorp Inc.': '#4f6ef7',
  'Spotify': '#1DB954',
  'Google': '#4285F4',
  'Meta': '#0668E1',
  'Amazon': '#FF9900',
}

function getCompanyColor(name: string): string {
  return COMPANY_COLORS[name] || '#6b7280'
}

const AVATAR_COLORS = ['#4f6ef7', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899']

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatInterviewTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function buildPipelineColumns(applications: JobApplicationDTO[]): PipelineColumn[] {
  const stages: ApplicationStatus[] = ['APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER', 'REJECTED']

  return stages.map((status) => {
    const matching = applications.filter((app) => app.status === status)
    const config = STATUS_CONFIG[status]

    return {
      stage: config.label,
      count: matching.length,
      color: config.color,
      cards: matching.map((app) => ({
        id: app.id,
        title: app.positionTitle,
        company: app.company.name,
        location: app.location || '',
        salary: app.salary || '',
        date: formatDate(app.appliedDate),
      })),
    }
  })
}

// Simple inline SVG icons for each stat card
function StatIcon({ type }: { type: string }) {
  switch (type) {
    case 'total':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    case 'review':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'interview':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'offer':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
    case 'rejected':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )
    default:
      return null
  }
}

// Mini sparkline SVG for trend indicator
function TrendLine({ direction }: { direction: 'up' | 'down' }) {
  return (
    <div className={`stat-card-trend stat-card-trend--${direction}`}>
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

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null)
  const [pipelineColumns, setPipelineColumns] = useState<PipelineColumn[]>([])
  const [recentApps, setRecentApps] = useState<JobApplicationDTO[]>([])
  const [interviews, setInterviews] = useState<InterviewDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, appsRes, recentRes, interviewsRes] = await Promise.all([
          getStats(),
          getApplications(),
          getRecentApplications(),
          getUpcomingInterviews(),
        ])
        setStats(statsRes.data)
        setPipelineColumns(buildPipelineColumns(appsRes.data))
        setRecentApps(recentRes.data)
        setInterviews(interviewsRes.data)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
        setError('Failed to load data. Make sure the backend is running.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="dashboard"><div className="dashboard-loading">Loading...</div></div>
  }

  if (error) {
    return <div className="dashboard"><div className="dashboard-error">{error}</div></div>
  }

  const statCards = [
    { label: 'Total Applications', value: stats?.totalApplications ?? 0, icon: 'total' as const, trend: 'up' as const },
    { label: 'In Review', value: stats?.inReview ?? 0, icon: 'review' as const, trend: 'up' as const },
    { label: 'Interviews', value: stats?.interviews ?? 0, icon: 'interview' as const, trend: 'up' as const },
    { label: 'Offers', value: stats?.offers ?? 0, icon: 'offer' as const, trend: 'down' as const },
    { label: 'Rejections', value: stats?.rejections ?? 0, icon: 'rejected' as const, trend: 'up' as const },
  ]

  const quickStats = [
    { label: 'Total Offers', value: stats?.offers ?? 0, color: 'var(--status-offer)' },
    { label: 'Total Rejections', value: stats?.rejections ?? 0, color: 'var(--status-rejected)' },
  ]

  return (
    <div className="dashboard">
      {/* Stat Cards */}
      <div className="stat-cards">
        {statCards.map((card) => (
          <div className="stat-card" key={card.label}>
            <div className={`stat-card-icon stat-card-icon--${card.icon}`}>
              <StatIcon type={card.icon} />
            </div>
            <div className="stat-card-info">
              <div className="stat-card-label">{card.label}</div>
              <div className="stat-card-value">{card.value}</div>
            </div>
            <TrendLine direction={card.trend} />
          </div>
        ))}
      </div>

      {/* Main content + right sidebar */}
      <div className="dashboard-main">
        <div className="dashboard-content">
          {/* Application Pipeline */}
          <div className="pipeline-section">
            <div className="section-header">
              <h2 className="section-title">Application Pipeline</h2>
              <a href="#" className="section-link">View All ▾</a>
            </div>
            <div className="pipeline-board">
              {pipelineColumns.map((col) => (
                <div className="pipeline-column" key={col.stage}>
                  <div className="pipeline-column-header">
                    <span
                      className="pipeline-column-title"
                      style={{ '--col-color': col.color } as React.CSSProperties}
                    >
                      {col.stage}
                    </span>
                    <span
                      className="pipeline-column-badge"
                      style={{ background: col.color }}
                    >
                      {col.count}
                    </span>
                  </div>
                  <div className="pipeline-column-body">
                    {col.cards.map((card) => (
                      <div className="pipeline-card" key={card.id}>
                        <div className="pipeline-card-title">{card.title}</div>
                        <div className="pipeline-card-company">{card.company}</div>
                        <div className="pipeline-card-meta">
                          <span>📍 {card.location}</span>
                          {card.salary && <span>💰 {card.salary}</span>}
                        </div>
                        <div className="pipeline-card-footer">
                          <span className="pipeline-card-date">Date Applied: {card.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Updated Applications */}
          <div className="recent-section">
            <div className="section-header">
              <h2 className="section-title">Recently Updated Applications</h2>
            </div>
            <div className="recent-table-wrapper">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Last Action</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApps.map((app) => {
                    const statusCfg = STATUS_CONFIG[app.status]
                    const companyColor = getCompanyColor(app.company.name)
                    return (
                      <tr key={app.id}>
                        <td className="recent-position">{app.positionTitle}</td>
                        <td>
                          <div className="recent-company">
                            <span
                              className="recent-company-logo"
                              style={{ background: companyColor }}
                            >
                              {app.company.name.charAt(0)}
                            </span>
                            {app.company.name}
                          </div>
                        </td>
                        <td>{app.location || ''}</td>
                        <td>{app.lastAction || ''}</td>
                        <td>
                          <span
                            className="recent-status-badge"
                            style={{ background: statusCfg.color }}
                          >
                            {statusCfg.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="dashboard-sidebar">
          {/* Upcoming Interviews */}
          <div className="upcoming-section">
            <h3 className="sidebar-section-title">Upcoming Interviews</h3>
            <div className="upcoming-list">
              {interviews.map((interview, idx) => (
                <div className="upcoming-item" key={interview.id}>
                  <span
                    className="upcoming-avatar"
                    style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                  >
                    {interview.positionTitle.charAt(0)}
                  </span>
                  <div className="upcoming-info">
                    <div className="upcoming-name">{interview.positionTitle}</div>
                    <div className="upcoming-company">{interview.companyName}</div>
                  </div>
                  <div className="upcoming-time">{formatInterviewTime(interview.interviewDate)}</div>
                </div>
              ))}
              {interviews.length === 0 && (
                <div className="upcoming-empty">No upcoming interviews</div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats-section">
            <h3 className="sidebar-section-title">Quick Stats</h3>
            <div className="quick-stats-list">
              {quickStats.map((stat) => (
                <div className="quick-stat-item" key={stat.label}>
                  <span
                    className="quick-stat-dot"
                    style={{ background: stat.color }}
                  />
                  <span className="quick-stat-label">{stat.label}</span>
                  <span className="quick-stat-value">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
