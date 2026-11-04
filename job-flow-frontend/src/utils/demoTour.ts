import { notifyDemoProgress } from './demoChecklist'

// Whether this browser has already seen the demo tour, so it only opens by itself once.
// Storage can be blocked (private mode, strict settings); then the tour just shows again.

const SEEN_KEY = 'jobflow-demo-tour-seen'

export function hasSeenDemoTour(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markDemoTourSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Nothing to do: worst case the tour offers itself again next visit
  }
  // The checklist waits for the tour to be done before showing up
  notifyDemoProgress()
}
