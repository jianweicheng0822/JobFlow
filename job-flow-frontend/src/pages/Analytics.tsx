import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts'
import { LayoutDashboard, PieChart as PieIcon, BarChart3 } from 'lucide-react'
import './Analytics.css'
import { getStats, getApplications, getActivity } from '../api/applications'
import type { ApplicationActivityDTO, DashboardStatsDTO, JobApplicationDTO } from '../api/types'
import { localeFor } from '../utils/date'
import { buildStatusDistribution } from '../utils/statusDistribution'
import { MIN_APPS_FOR_SHARE } from '../components/ShareBar'
import ActivityHeatmap from '../components/ActivityHeatmap'

const HEATMAP_WEEKS = 26
const MIN_CHART_MONTHS = 6

type AnalyticsTab = 'overview' | 'status' | 'company'

const TAB_ICONS: Record<AnalyticsTab, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  status: PieIcon,
  company: BarChart3,
}

const TAB_KEYS: AnalyticsTab[] = ['overview', 'status', 'company']

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
  status: 'statusDistribution',
  company: 'company',
}

// "{count} of {total} ..." with the numbers filled in
function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template)
}

export default function Analytics() {
  const { t, lang } = useLanguage()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview')
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null)
  const [companyData, setCompanyData] = useState<{ company: string; count: number }[]>([])
  const [applications, setApplications] = useState<JobApplicationDTO[]>([])
  const [activity, setActivity] = useState<ApplicationActivityDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, appsRes, activityRes] = await Promise.all([
          getStats(),
          getApplications(),
          getActivity(),
        ])
        setStats(statsRes.data)
        setCompanyData(buildCompanyData(appsRes.data))
        setApplications(appsRes.data)
        setActivity(activityRes.data)
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
  const responded = stats?.responded ?? 0
  const interviewed = (stats?.interviews ?? 0) + (stats?.offers ?? 0)
  const offers = stats?.offers ?? 0
  // A rate over a handful of applications says more about luck than about the search
  const showRates = total >= MIN_APPS_FOR_SHARE
  const rateValue = (rate: number, count: number) => (showRates ? `${Math.round(rate)}%` : `${count} / ${total}`)
  const rateNeedsMore = fill(t.rateNeedsMore, { n: MIN_APPS_FOR_SHARE })

  const statSummary = [
    { label: t.totalApplications, value: String(total), sub: null },
    {
      label: t.responseRate,
      value: rateValue(stats?.responseRate ?? 0, responded),
      sub: showRates ? fill(t.respondedOf, { count: responded, total }) : rateNeedsMore,
    },
    {
      label: t.interviewRate,
      value: rateValue(stats?.interviewRate ?? 0, interviewed),
      sub: showRates ? fill(t.interviewedOf, { count: interviewed, total }) : rateNeedsMore,
    },
    { label: t.offers, value: String(offers), sub: total > 0 ? fill(t.offeredOf, { count: offers, total }) : null },
  ]

  const statusData = buildStatusDistribution(applications, t)

  // "2026-10" -> "Oct" / "10月" on the axis, "October 2026" / "2026年10月" in the tooltip
  const locale = localeFor(lang)
  // Skip the empty months before the search started, but keep at least half a
  // year so a brand-new search doesn't get two fat bars
  const firstActive = activity.findIndex((a) => a.count > 0)
  const start = firstActive === -1 ? 0 : Math.min(firstActive, Math.max(0, activity.length - MIN_CHART_MONTHS))
  const monthlyData = activity.slice(start).map(({ yearMonth, count }) => {
    const [y, m] = yearMonth.split('-').map(Number)
    const date = new Date(y, m - 1, 1)
    return {
      label: date.toLocaleDateString(locale, { month: 'short' }),
      full: date.toLocaleDateString(locale, { year: 'numeric', month: 'long' }),
      count,
    }
  })
  const monthlyChartLabel = fill(t.monthlyChartLabel, {
    values: monthlyData.map((d) => `${d.full} ${d.count}`).join(', '),
  })

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
            <div className="analytics-overview">
              <div className="analytics-stat-cards">
                {statSummary.map((stat) => (
                  <div className="analytics-stat-card" key={stat.label}>
                    <span className="analytics-stat-label">{stat.label}</span>
                    <span className="analytics-stat-value">{stat.value}</span>
                    {stat.sub && <span className="analytics-stat-sub">{stat.sub}</span>}
                  </div>
                ))}
              </div>

              <div className="analytics-chart-card">
                <h2 className="analytics-chart-title">{t.monthlyApplications}</h2>
                <div className="analytics-chart-wrapper" role="img" aria-label={monthlyChartLabel}>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: 'var(--content-bg)' }}
                        separator=""
                        labelFormatter={(_, payload) => payload?.[0]?.payload.full ?? ''}
                        formatter={(value) => [fill(t.monthApplied, { count: Number(value) }), '']}
                      />
                      <Bar dataKey="count" fill="#4f6ef7" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <h2 className="analytics-chart-title">{t.dailyActivity}</h2>
                  <span className="analytics-chart-meta">{fill(t.lastWeeks, { weeks: HEATMAP_WEEKS })}</span>
                </div>
                <ActivityHeatmap applications={applications} weeks={HEATMAP_WEEKS} />
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
                        <Cell
                          key={entry.status}
                          fill={entry.color}
                          cursor="pointer"
                          onClick={() => navigate(`/jobs?status=${entry.status}`)}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="analytics-legend">
                {/* Legend entries double as keyboard-friendly links for the slices */}
                {statusData.map((item) => (
                  <Link
                    className="analytics-legend-item"
                    key={item.status}
                    to={`/jobs?status=${item.status}`}
                    aria-label={`${fill(t.showStatusJobs, { status: item.name })} (${item.value})`}
                  >
                    <span className="analytics-legend-dot" style={{ background: item.color }} />
                    <span className="analytics-legend-label">{item.name}</span>
                    <span className="analytics-legend-value">{item.value}</span>
                  </Link>
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
