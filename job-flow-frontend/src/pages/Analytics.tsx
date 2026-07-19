import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './Analytics.css'

const monthlyData = [
  { month: 'Jan', applications: 12 },
  { month: 'Feb', applications: 19 },
  { month: 'Mar', applications: 28 },
  { month: 'Apr', applications: 22 },
  { month: 'May', applications: 35 },
  { month: 'Jun', applications: 40 },
  { month: 'Jul', applications: 32 },
  { month: 'Aug', applications: 45 },
  { month: 'Sep', applications: 38 },
  { month: 'Oct', applications: 30 },
  { month: 'Nov', applications: 25 },
  { month: 'Dec', applications: 18 },
]

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
      {/* Application Trend Chart */}
      <div className="analytics-chart-card">
        <h2 className="analytics-chart-title">Application Trend</h2>
        <div className="analytics-chart-wrapper">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              />
              <Line
                type="monotone"
                dataKey="applications"
                stroke="#4f6ef7"
                strokeWidth={2}
                dot={{ r: 4, fill: '#4f6ef7' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
