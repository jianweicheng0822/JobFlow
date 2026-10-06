import type { JobApplicationDTO } from '../api/types'

// Starred applications go first; everything else keeps its original order
// (Array.prototype.sort is stable, so ties stay where they were).
export function sortStarredFirst<T extends Pick<JobApplicationDTO, 'starred'>>(apps: T[]): T[] {
  return [...apps].sort((a, b) => Number(b.starred) - Number(a.starred))
}
