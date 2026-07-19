import './Analytics.css'

const statSummary = [
  {
    label: 'Total Applications',
    value: '245',
    sub: '+12 this week',
    trend: 'up' as const,
  },
  {
    label: 'Response Rate',
    value: '38%',
    sub: '+5% vs last month',
    trend: 'up' as const,
  },
  {
    label: 'Interview Rate',
    value: '18%',
    sub: '-2% vs last month',
    trend: 'down' as const,
  },
  {
    label: 'Avg. Response Time',
    value: '6 days',
    sub: '-1 day vs last month',
    trend: 'up' as const,
  },
]

export default function Analytics() {
  return (
    <div className="analytics-page">
      <h1 className="analytics-page-title">Analytics</h1>

      {/* Stat Summary Cards */}
      <div className="analytics-stat-cards">
        {statSummary.map((stat) => (
          <div className="analytics-stat-card" key={stat.label}>
            <span className="analytics-stat-label">{stat.label}</span>
            <span className="analytics-stat-value">{stat.value}</span>
            <span className={`analytics-stat-sub analytics-stat-sub--${stat.trend}`}>
              {stat.trend === 'up' ? '↑' : '↓'} {stat.sub}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
