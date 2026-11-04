import { isDemoMode } from '../api/mockData'

// The "things to try" list demo users see after the tour. Pages call
// markDemoTask() when someone does one of these, and the checklist listens
// for the change event. Progress is kept in storage so a refresh (which resets
// the demo data) doesn't also wipe what you've already explored.

export const DEMO_TASKS = ['add', 'organize', 'analytics', 'personalize'] as const
export type DemoTask = (typeof DEMO_TASKS)[number]

const DONE_KEY = 'jobflow-demo-checklist'
const DISMISSED_KEY = 'jobflow-demo-checklist-dismissed'
export const DEMO_PROGRESS_EVENT = 'jobflow-demo-progress'

export function notifyDemoProgress() {
  window.dispatchEvent(new Event(DEMO_PROGRESS_EVENT))
}

export function getDoneDemoTasks(): DemoTask[] {
  try {
    const saved = JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]')
    return Array.isArray(saved) ? DEMO_TASKS.filter((task) => saved.includes(task)) : []
  } catch {
    return []
  }
}

export function markDemoTask(task: DemoTask): void {
  if (!isDemoMode()) return
  const done = getDoneDemoTasks()
  if (done.includes(task)) return
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify([...done, task]))
  } catch {
    return // Can't remember it, so don't pretend it's checked
  }
  notifyDemoProgress()
}

export function isDemoChecklistDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissDemoChecklist(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // Hidden for this visit anyway
  }
  notifyDemoProgress()
}
