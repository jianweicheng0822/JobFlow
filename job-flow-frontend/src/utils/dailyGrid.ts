import type { JobApplicationDTO } from '../api/types'
import { todayLocal } from './date'
import { applicationDay } from './weeklyCounts'

export interface DayCell {
  date: string // "YYYY-MM-DD"
  count: number
  // Later this week, so nothing could have happened yet
  future: boolean
}

/**
 * Applications per day for a calendar heatmap: one column per week (Monday
 * first), oldest week first, ending with the week that holds today.
 */
export function dailyGrid(
  apps: Pick<JobApplicationDTO, 'appliedDate' | 'createdAt'>[],
  weeks: number,
  today: string = todayLocal(),
): DayCell[][] {
  const counts = new Map<string, number>()
  for (const app of apps) {
    const day = applicationDay(app)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }

  const [y, m, d] = today.split('-').map(Number)
  const daysSinceMonday = (new Date(y, m - 1, d).getDay() + 6) % 7
  const firstMonday = d - daysSinceMonday - (weeks - 1) * 7

  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = todayLocal(new Date(y, m - 1, firstMonday + week * 7 + weekday))
      return { date, count: counts.get(date) ?? 0, future: date > today }
    }),
  )
}

// Shade step for a day: 0 is empty, 4 is "4 or more"
export function heatLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  return Math.min(count, 4) as 0 | 1 | 2 | 3 | 4
}
