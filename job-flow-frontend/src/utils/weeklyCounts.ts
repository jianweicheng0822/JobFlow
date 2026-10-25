import type { JobApplicationDTO } from '../api/types'
import { todayLocal } from './date'

// Whole days between two "YYYY-MM-DD" dates. Done in UTC so DST can't skew it.
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000)
}

// The day a job was applied for, or the local day it was added if no date was given
function applicationDay(app: Pick<JobApplicationDTO, 'appliedDate' | 'createdAt'>): string {
  return app.appliedDate ? app.appliedDate.slice(0, 10) : todayLocal(new Date(app.createdAt))
}

/**
 * Applications per week for the last `weeks` weeks, oldest first. Weeks are
 * rolling 7-day windows ending today, so the last value is "the last 7 days"
 * no matter which weekday it is. Future dates and older jobs are left out.
 */
export function weeklyApplicationCounts(
  apps: Pick<JobApplicationDTO, 'appliedDate' | 'createdAt'>[],
  weeks: number,
  today: string = todayLocal(),
): number[] {
  const counts = new Array<number>(weeks).fill(0)
  for (const app of apps) {
    const daysAgo = daysBetween(applicationDay(app), today)
    if (daysAgo < 0) continue
    const weeksAgo = Math.floor(daysAgo / 7)
    if (weeksAgo < weeks) counts[weeks - 1 - weeksAgo]++
  }
  return counts
}

// First and last day of each window used above, oldest first ("YYYY-MM-DD")
export function weeklyWindows(weeks: number, today: string = todayLocal()): { start: string; end: string }[] {
  const [y, m, d] = today.split('-').map(Number)
  return Array.from({ length: weeks }, (_, i) => {
    const weeksAgo = weeks - 1 - i
    return {
      start: todayLocal(new Date(y, m - 1, d - weeksAgo * 7 - 6)),
      end: todayLocal(new Date(y, m - 1, d - weeksAgo * 7)),
    }
  })
}
