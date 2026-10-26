import { useEffect, useRef } from 'react'
import type { JobApplicationDTO } from '../api/types'
import { useLanguage } from '../context/LanguageContext'
import { dailyGrid, heatLevel } from '../utils/dailyGrid'
import { localeFor } from '../utils/date'
import './ActivityHeatmap.css'

interface ActivityHeatmapProps {
  applications: Pick<JobApplicationDTO, 'appliedDate' | 'createdAt'>[]
  weeks: number
}

// Mon, Wed and Fri get a label, like most calendar heatmaps
const LABELED_WEEKDAYS = new Set([0, 2, 4])

function toDate(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// One square per day, darker blue for more applications. Shows rhythm (busy
// weeks, quiet stretches) that the monthly bars smooth over.
export default function ActivityHeatmap({ applications, weeks }: ActivityHeatmapProps) {
  const { t, lang } = useLanguage()
  const locale = localeFor(lang)
  const grid = dailyGrid(applications, weeks)
  const scrollRef = useRef<HTMLDivElement>(null)

  // On narrow screens the grid scrolls sideways; start at the recent end
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  const days = grid.flat().filter((cell) => !cell.future)
  const total = days.reduce((sum, cell) => sum + cell.count, 0)
  const activeDays = days.filter((cell) => cell.count > 0).length
  const summary = t.heatmapSummary
    .replace('{count}', String(total))
    .replace('{days}', String(activeDays))
    .replace('{weeks}', String(weeks))

  const weekdayLabels = grid[0].map((cell, i) =>
    LABELED_WEEKDAYS.has(i) ? toDate(cell.date).toLocaleDateString(locale, { weekday: 'short' }) : '')

  // Name the month above the week its 1st falls in
  const monthLabels = grid.map((week) => {
    const first = week.find((cell) => cell.date.endsWith('-01'))
    return first ? toDate(first.date).toLocaleDateString(locale, { month: 'short' }) : ''
  })

  const dayTitle = (date: string, count: number) =>
    t.heatmapDay
      .replace('{date}', toDate(date).toLocaleDateString(locale, { month: 'short', day: 'numeric' }))
      .replace('{count}', String(count))

  return (
    <div className="heatmap">
      <div className="heatmap-scroll" ref={scrollRef}>
        <div
          className="heatmap-grid"
          style={{ gridTemplateColumns: `auto repeat(${weeks}, 1fr)` }}
          role="img"
          aria-label={summary}
        >
          <span />
          {monthLabels.map((label, i) => (
            <span className="heatmap-month" key={`m${i}`}>{label}</span>
          ))}
          {weekdayLabels.map((label, row) => [
            <span className="heatmap-weekday" key={`w${row}`}>{label}</span>,
            ...grid.map((week) => {
              const cell = week[row]
              if (cell.future) return <span key={cell.date} />
              return (
                <span
                  key={cell.date}
                  className={`heatmap-cell heatmap-cell--${heatLevel(cell.count)}`}
                  title={dayTitle(cell.date, cell.count)}
                />
              )
            }),
          ])}
        </div>
      </div>
      <div className="heatmap-legend" aria-hidden="true">
        <span>{t.heatmapLess}</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className={`heatmap-cell heatmap-cell--${level}`} />
        ))}
        <span>{t.heatmapMore}</span>
      </div>
    </div>
  )
}
