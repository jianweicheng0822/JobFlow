import type { JobApplicationDTO } from '../api/types'

export type SortDirection = 'asc' | 'desc'

// Sorts by applied date in the given direction. Jobs without a date always go
// last, and ties fall back to when the job was added (same direction).
// Dates are ISO strings, so plain string comparison orders them correctly.
export function sortByAppliedDate<T extends Pick<JobApplicationDTO, 'appliedDate' | 'createdAt'>>(
  apps: T[],
  direction: SortDirection,
): T[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...apps].sort((a, b) => {
    if (!a.appliedDate || !b.appliedDate) {
      if (a.appliedDate === b.appliedDate) return sign * a.createdAt.localeCompare(b.createdAt)
      return a.appliedDate ? -1 : 1
    }
    return sign * (a.appliedDate.localeCompare(b.appliedDate) || a.createdAt.localeCompare(b.createdAt))
  })
}
