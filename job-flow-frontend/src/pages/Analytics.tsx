import { useState, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts'
import { LayoutDashboard, TrendingUp, PieChart as PieIcon, BarChart3 } from 'lucide-react'
import './Analytics.css'
import { getStats, getActivity, getApplications } from '../api/applications'
import type { DashboardStatsDTO, ApplicationActivityDTO, JobApplicationDTO } from '../api/types'

type AnalyticsTab = 'overview' | 'trends' | 'status' | 'company'

const TAB_ICONS: Record<AnalyticsTab, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  trends: TrendingUp,
  status: PieIcon,
  company: BarChart3,
}

const TAB_KEYS: AnalyticsTab[] = ['overview', 'trends', 'status', 'company']

function buildCompanyData(apps: JobApplicationDTO[]) {
  const counts: Record<string, number> = {}
  apps.forEach((app) => {
    const name = app.company.name
    counts[name] = (counts[name] || 0) + 1
  })
  return Object.entries(counts)
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
}

const tooltipStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  fontSize: '13px',
}

const TAB_LABEL_KEYS: Record<AnalyticsTab, string> = {
  overview: 'overview',
  trends: 'trends',
  status: 'statusDistribution',
  company: 'company',
}

export default function Analytics() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview')
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null)
  const [activityData, setActivityData] = useState<ApplicationActivityDTO[]>([])
  const [companyData, setCompanyData] = useState<{ company: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, activityRes, appsRes] = await Promise.all([
          getStats(),
          getActivity(),
          getApplications(),
        ])
        setStats(statsRes.data)
        setActivityData(activityRes.data)
        setCompanyData(buildCompanyData(appsRes.data))
      } catch (err) {
        console.error('Failed to load analytics:', err)
        setError(t.backendError)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [t])

  if (loading) {
    return <div className="analytics-page"><div className="analytics-loading">{t.loading}...</div></div>
  }

  if (error) {
    return <div className="analytics-page"><div className="analytics-error">{error}</div></div>
  }

  const total = stats?.totalApplications ?? 0
  const interviewCount = stats?.interviews ?? 0
  const responseCount = total - (stats?.rejections ?? 0)
  const responseRate = total > 0 ? Math.round((responseCount / total) * 100) : 0
  const interviewRate = total > 0 ? Math.round((interviewCount / total) * 100) : 0

  const statSummary = [
    { label: t.totalApplications, value: String(total), trend: 'up' as const },
    { label: t.responseRate, value: `${responseRate}%`, trend: 'up' as const },
    { label: t.interviewRate, value: `${interviewRate}%`, trend: interviewRate > 0 ? 'up' as const : 'down' as const },
    { label: t.offers, value: String(stats?.offers ?? 0), trend: 'up' as const },
  ]

  const statusData = [
    { name: t.statusApplied, value: (stats?.totalApplications ?? 0) - (stats?.inReview ?? 0) - (stats?.interviews ?? 0) - (stats?.offers ?? 0) - (stats?.rejections ?? 0), color: '#4f6ef7' },
    { name: t.statusInReview, value: stats?.inReview ?? 0, color: '#f59e0b' },
    { name: t.statusInterview, value: stats?.interviews ?? 0, color: '#10b981' },
    { name: t.statusOffer, value: stats?.offers ?? 0, color: '#8b5cf6' },
    { name: t.statusRejected, value: stats?.rejections ?? 0, color: '#ef4444' },
  ].filter((d) => d.value > 0)

  const trendData = activityData.map((d) => ({
    month: d.month.charAt(0) + d.month.slice(1).toLowerCase(),
    applications: d.count,
  }))

  return (
    <div className="analytics-page">
      <h1 className="analytics-page-title">{t.analytics}</h1>

      <div className="analytics-layout">
        {/* Left Side Nav */}
        <nav className="analytics-nav">
          {TAB_KEYS.map((key) => {
            const Icon = TAB_ICONS[key]
            const label = (t as any)[TAB_LABEL_KEYS[key]] || key
            return (
              <button
                key={key}
                className={`analytics-nav-item ${activeTab === key ? 'analytics-nav-item--active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                <Icon size={18} />
                {label}
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
                    {stat.trend === 'up' ? '↑' : '↓'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <div className="analytics-chart-card">
              <h2 className="analytics-chart-title">{t.applicationTrend}</h2>
              <div className="analytics-chart-wrapper">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trendData}>
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
              <h2 className="analytics-chart-title">{t.statusDistribution}</h2>
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

          {/* Company Tab */}
          {activeTab === 'company' && (
            <div className="analytics-chart-card">
              <h2 className="analytics-chart-title">{t.applicationsByCompany}</h2>
              <div className="analytics-chart-wrapper">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={companyData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                    <YAxis
                      type="category"
                      dataKey="company"
                      tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                      width={120}
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
