import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import './Dashboard.css'
import { getStats, getApplications, getRecentApplications } from '../api/applications'
import { getUpcomingInterviews } from '../api/interviews'
import type { DashboardStatsDTO, JobApplicationDTO, InterviewDTO, ApplicationStatus } from '../api/types'
import { sortStarredFirst } from '../utils/sortStarredFirst'
import { formatLastAction } from '../utils/formatLastAction'
import { formatDateOnly } from '../utils/date'
import { weeklyApplicationCounts, weeklyWindows } from '../utils/weeklyCounts'
import Sparkline from '../components/Sparkline'
import ShareBar from '../components/ShareBar'

// ===== Types =====
interface PipelineCard {
  id: number
  title: string
  company: string
  location: string
  salary: string
  date: string
  starred: boolean
  tag?: string
}

interface PipelineColumn {
  stage: string
  count: number
  color: string
  cards: PipelineCard[]
}

// ===== Helpers =====
const STATUS_COLORS: Record<ApplicationStatus, string> = {
  APPLIED: 'var(--status-applied)',
  IN_REVIEW: 'var(--status-applied)',
  PHONE_SCREEN: 'var(--status-phone-screen)',
  INTERVIEW: 'var(--status-interview)',
  OFFER: 'var(--status-offer)',
  REJECTED: 'var(--status-declined)',
}

// Maps status keys to translation keys
const STATUS_LABEL_KEYS: Record<ApplicationStatus, string> = {
  APPLIED: 'statusApplied',
  IN_REVIEW: 'statusInReview',
  PHONE_SCREEN: 'statusPhoneScreen',
  INTERVIEW: 'statusInterview',
  OFFER: 'statusOffer',
  REJECTED: 'statusRejected',
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


function formatInterviewTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function buildPipelineColumns(applications: JobApplicationDTO[], t: Record<string, string>): PipelineColumn[] {
  const stages: ApplicationStatus[] = ['APPLIED', 'IN_REVIEW', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER', 'REJECTED']

  return stages.map((status) => {
    const matching = sortStarredFirst(applications.filter((app) => app.status === status))
    const labelKey = STATUS_LABEL_KEYS[status]

    return {
      stage: (t as any)[labelKey] || status,
      count: matching.length,
      color: STATUS_COLORS[status],
      cards: matching.map((app) => ({
        id: app.id,
        title: app.positionTitle,
        company: app.company.name,
        location: app.location || '',
        salary: app.salary || '',
        date: formatDateOnly(app.appliedDate),
        starred: app.starred,
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
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )
    default:
      return null
  }
}

const TREND_WEEKS = 8

// "2026-10-18" -> "Oct 18"
function shortDate(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const { t } = useLanguage()
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null)
  const [applications, setApplications] = useState<JobApplicationDTO[]>([])
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
        setApplications(appsRes.data)
        setPipelineColumns(buildPipelineColumns(appsRes.data, t))
        // Keep the "recently updated" set from the API, just bump starred ones up
        setRecentApps(sortStarredFirst(recentRes.data))
        setInterviews(interviewsRes.data)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
        setError(t.backendError)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [t])

  if (loading) {
    return <div className="dashboard"><div className="dashboard-loading">{t.loading}...</div></div>
  }

  if (error) {
    return <div className="dashboard"><div className="dashboard-error">{error}</div></div>
  }

  const total = stats?.totalApplications ?? 0

  // Real weekly counts for the total card; the last value is the last 7 days
  const weekly = weeklyApplicationCounts(applications, TREND_WEEKS)
  const lastWeek = weekly[weekly.length - 1]
  const weekTitles = weeklyWindows(TREND_WEEKS).map((w, i) =>
    t.weekPointTitle
      .replace('{start}', shortDate(w.start))
      .replace('{end}', shortDate(w.end))
      .replace('{count}', String(weekly[i])),
  )

  // No history of status changes is stored, so these show each status's share
  // of all applications right now, and open the matching list in Jobs
  const statusCards = [
    { label: t.inReview, value: stats?.inReview ?? 0, icon: 'review' as const, status: 'IN_REVIEW', color: 'var(--status-phone-screen)' },
    { label: t.interviews, value: stats?.interviews ?? 0, icon: 'interview' as const, status: 'INTERVIEW', color: 'var(--status-interview)' },
    { label: t.offers, value: stats?.offers ?? 0, icon: 'offer' as const, status: 'OFFER', color: 'var(--status-offer)' },
    { label: t.rejections, value: stats?.rejections ?? 0, icon: 'rejected' as const, status: 'REJECTED', color: 'var(--status-declined)' },
  ]

  const quickStats = [
    { label: t.totalOffers, value: stats?.offers ?? 0, color: 'var(--status-offer)' },
    { label: t.totalRejections, value: stats?.rejections ?? 0, color: 'var(--status-declined)' },
  ]

  return (
    <div className="dashboard">
      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-card-icon stat-card-icon--total">
              <StatIcon type="total" />
            </div>
            <div className="stat-card-info">
              <div className="stat-card-label">{t.totalApplications}</div>
              <div className="stat-card-value">{total}</div>
            </div>
          </div>
          <div className="stat-card-footer">
            <Sparkline
              values={weekly}
              label={t.weeklyTrendLabel.replace('{values}', weekly.join(', '))}
              pointTitles={weekTitles}
            />
            <div className="stat-card-caption">
              {lastWeek > 0 ? t.appliedLast7Days.replace('{count}', String(lastWeek)) : t.noneLast7Days}
            </div>
          </div>
        </div>
        {statusCards.map((card) => (
          <Link to={`/jobs?status=${card.status}`} className="stat-card stat-card--link" key={card.status}>
            <div className="stat-card-top">
              <div className={`stat-card-icon stat-card-icon--${card.icon}`}>
                <StatIcon type={card.icon} />
              </div>
              <div className="stat-card-info">
                <div className="stat-card-label">{card.label}</div>
                <div className="stat-card-value">{card.value}</div>
              </div>
            </div>
            <div className="stat-card-footer">
              <ShareBar count={card.value} total={total} color={card.color} />
            </div>
          </Link>
        ))}
      </div>

      {/* Main content + right sidebar */}
      <div className="dashboard-main">
        <div className="dashboard-content">
          {/* Application Pipeline */}
          <div className="pipeline-section">
            <div className="section-header">
              <h2 className="section-title">{t.applicationPipeline}</h2>
              <a href="#" className="section-link">{t.viewAll} ▾</a>
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
                        <div className="pipeline-card-title">
                          {card.starred && <Star className="dashboard-star-icon" size={12} fill="currentColor" aria-label={t.starApplication} />}
                          {card.title}
                        </div>
                        <div className="pipeline-card-company">{card.company}</div>
                        <div className="pipeline-card-meta">
                          <span>📍 {card.location}</span>
                          {card.salary && <span>💰 {card.salary}</span>}
                        </div>
                        <div className="pipeline-card-footer">
                          <span className="pipeline-card-date">{t.dateApplied}: {card.date}</span>
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
              <h2 className="section-title">{t.recentlyUpdated}</h2>
            </div>
            <div className="recent-table-wrapper">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>{t.position}</th>
                    <th>{t.company}</th>
                    <th>{t.location}</th>
                    <th>{t.lastAction}</th>
                    <th>{t.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentApps.map((app) => {
                    const statusColor = STATUS_COLORS[app.status]
                    const statusLabel = (t as any)[STATUS_LABEL_KEYS[app.status]] || app.status
                    const companyColor = getCompanyColor(app.company.name)
                    return (
                      <tr key={app.id}>
                        <td className="recent-position">
                          {app.starred && <Star className="dashboard-star-icon" size={12} fill="currentColor" aria-label={t.starApplication} />}
                          {app.positionTitle}
                        </td>
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
                        <td>{formatLastAction(app.lastAction, t)}</td>
                        <td>
                          <span
                            className="recent-status-badge"
                            style={{ background: statusColor }}
                          >
                            {statusLabel}
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
            <h3 className="sidebar-section-title">{t.upcomingInterviews}</h3>
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
                <div className="upcoming-empty">{t.noUpcomingInterviews}</div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats-section">
            <h3 className="sidebar-section-title">{t.quickStats}</h3>
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
