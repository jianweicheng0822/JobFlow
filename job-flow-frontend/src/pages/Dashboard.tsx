import './Dashboard.css'

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

// ===== Mock Data =====
const pipelineColumns: PipelineColumn[] = [
  {
    stage: 'Applied',
    count: 11,
    color: 'var(--status-applied)',
    cards: [
      { id: 1, title: 'Senior UX Designer', company: 'TechCorp Inc.', location: 'Seattle, WA', salary: '$145,000', date: 'Aug 16, 2023', tag: 'Applied' },
      { id: 2, title: 'Senior UX Designer', company: 'Company Inc.', location: 'Seattle, WA', salary: '$130,000', date: 'Aug 14, 2023' },
    ],
  },
  {
    stage: 'Phone Screen',
    count: 7,
    color: 'var(--status-phone-screen)',
    cards: [
      { id: 3, title: 'Job Title', company: 'Company Name', location: 'Seattle, WA', salary: '$145,000', date: 'Aug 16, 2023' },
      { id: 4, title: 'Senior Frontend Engineer', company: 'Company Name', location: 'Seattle, WA', salary: '$155,000', date: 'Aug 12, 2023' },
    ],
  },
  {
    stage: 'Interview',
    count: 5,
    color: 'var(--status-interview)',
    cards: [
      { id: 5, title: 'Senior Frontend Engineer', company: 'TechCorp Inc.', location: 'Seattle, WA', salary: '$150,000', date: 'Aug 11, 2023', tag: 'Interview' },
    ],
  },
  {
    stage: 'Offer',
    count: 3,
    color: 'var(--status-offer)',
    cards: [
      { id: 6, title: 'Job Title', company: 'Company Name', location: 'Seattle, WA', salary: '$140,000', date: 'Aug 10, 2023' },
    ],
  },
  {
    stage: 'Rejection',
    count: 8,
    color: 'var(--status-rejected)',
    cards: [
      { id: 7, title: 'Job Title', company: 'Company Name', location: 'Seattle, WA', salary: '$135,000', date: 'Aug 9, 2023' },
    ],
  },
]

interface RecentApplication {
  id: number
  position: string
  company: string
  companyInitial: string
  companyColor: string
  location: string
  lastAction: string
  status: string
  statusColor: string
}

const recentApplications: RecentApplication[] = [
  {
    id: 1,
    position: 'Senior UX Designer',
    company: 'Spotify',
    companyInitial: 'S',
    companyColor: '#1DB954',
    location: 'Stockholm',
    lastAction: 'Interview Scheduled',
    status: 'Interview',
    statusColor: 'var(--status-interview)',
  },
  {
    id: 2,
    position: 'Senior UX Designer',
    company: 'Spotify',
    companyInitial: 'S',
    companyColor: '#1DB954',
    location: 'Stockholm',
    lastAction: 'Interview Scheduled',
    status: 'Applied',
    statusColor: 'var(--status-applied)',
  },
  {
    id: 3,
    position: 'Senior UX Designer',
    company: 'Spotify',
    companyInitial: 'S',
    companyColor: '#1DB954',
    location: 'Stockholm',
    lastAction: 'Interview Scheduled',
    status: 'Rejected',
    statusColor: 'var(--status-rejected)',
  },
  {
    id: 4,
    position: 'Frontend Engineer',
    company: 'Google',
    companyInitial: 'G',
    companyColor: '#4285F4',
    location: 'Mountain View',
    lastAction: 'Phone Screen',
    status: 'Phone Screen',
    statusColor: 'var(--status-phone-screen)',
  },
]

const statCards = [
  {
    label: 'Total Applications',
    value: 245,
    icon: 'total' as const,
    trend: 'up' as const,
  },
  {
    label: 'In Review',
    value: 88,
    icon: 'review' as const,
    trend: 'up' as const,
  },
  {
    label: 'Interviews',
    value: 19,
    icon: 'interview' as const,
    trend: 'up' as const,
  },
  {
    label: 'Offers',
    value: 4,
    icon: 'offer' as const,
    trend: 'down' as const,
  },
  {
    label: 'Rejections',
    value: 134,
    icon: 'rejected' as const,
    trend: 'up' as const,
  },
]

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
                      <span>💰 {card.salary}</span>
                    </div>
                    <div className="pipeline-card-footer">
                      <span className="pipeline-card-date">Date Applied: {card.date}</span>
                      {card.tag && (
                        <span
                          className="pipeline-card-tag"
                          style={{ background: col.color }}
                        >
                          {card.tag}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row: Recent Applications + Activity Chart (Step 4) */}
      <div className="dashboard-bottom-row">
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
                {recentApplications.map((app) => (
                  <tr key={app.id}>
                    <td className="recent-position">{app.position}</td>
                    <td>
                      <div className="recent-company">
                        <span
                          className="recent-company-logo"
                          style={{ background: app.companyColor }}
                        >
                          {app.companyInitial}
                        </span>
                        {app.company}
                      </div>
                    </td>
                    <td>{app.location}</td>
                    <td>{app.lastAction}</td>
                    <td>
                      <span
                        className="recent-status-badge"
                        style={{ background: app.statusColor }}
                      >
                        {app.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Application Activity chart placeholder for Step 4 */}
      </div>
    </div>
  )
}
