import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts'
import { LayoutDashboard, TrendingUp, PieChart as PieIcon, BarChart3 } from 'lucide-react'
import './Analytics.css'

type AnalyticsTab = 'overview' | 'trends' | 'status' | 'industry'

const tabs: { key: AnalyticsTab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'trends', label: 'Trends', icon: TrendingUp },
  { key: 'status', label: 'Status', icon: PieIcon },
  { key: 'industry', label: 'Industry', icon: BarChart3 },
]

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

const statusData = [
  { name: 'Applied', value: 98, color: '#4f6ef7' },
  { name: 'Interview', value: 45, color: '#10b981' },
  { name: 'Offer', value: 12, color: '#8b5cf6' },
  { name: 'Rejected', value: 90, color: '#ef4444' },
]

const industryData = [
  { industry: 'Technology', count: 82 },
  { industry: 'E-Commerce', count: 45 },
  { industry: 'Entertainment', count: 38 },
  { industry: 'Social Media', count: 30 },
  { industry: 'Consulting', count: 28 },
  { industry: 'Finance', count: 22 },
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

const tooltipStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  fontSize: '13px',
}

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview')

  return (
    <div className="analytics-page">
      <h1 className="analytics-page-title">Analytics</h1>

      <div className="analytics-layout">
        {/* Left Side Nav */}
        <nav className="analytics-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                className={`analytics-nav-item ${activeTab === tab.key ? 'analytics-nav-item--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Right Content */}
        <div className="analytics-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
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
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <div className="analytics-chart-card">
              <h2 className="analytics-chart-title">Application Trend</h2>
              <div className="analytics-chart-wrapper">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={tooltipStyle} />
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
          )}

          {/* Status Tab */}
          {activeTab === 'status' && (
            <div className="analytics-chart-card">
              <h2 className="analytics-chart-title">Status Distribution</h2>
              <div className="analytics-chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="analytics-legend">
                {statusData.map((item) => (
                  <div className="analytics-legend-item" key={item.name}>
                    <span className="analytics-legend-dot" style={{ background: item.color }} />
                    <span className="analytics-legend-label">{item.name}</span>
                    <span className="analytics-legend-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Industry Tab */}
          {activeTab === 'industry' && (
            <div className="analytics-chart-card">
              <h2 className="analytics-chart-title">Applications by Industry</h2>
              <div className="analytics-chart-wrapper">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={industryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                    <YAxis
                      type="category"
                      dataKey="industry"
                      tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                      width={100}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#4f6ef7" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
