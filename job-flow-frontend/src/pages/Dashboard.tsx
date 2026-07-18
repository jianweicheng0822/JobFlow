import './Dashboard.css'

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

      {/* More sections will be added in subsequent steps */}
    </div>
  )
}
