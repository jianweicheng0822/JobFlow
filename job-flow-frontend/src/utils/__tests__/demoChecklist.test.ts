import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DEMO_PROGRESS_EVENT,
  getDoneDemoTasks,
  markDemoTask,
  dismissDemoChecklist,
  isDemoChecklistDismissed,
} from '../demoChecklist'
import { createApplication, toggleStar } from '../../api/applications'

describe('demoChecklist', () => {
  beforeEach(() => localStorage.setItem('jobflow-token', 'demo-token'))
  afterEach(() => localStorage.clear())

  it('remembers each task once and tells the checklist', () => {
    const listener = vi.fn()
    window.addEventListener(DEMO_PROGRESS_EVENT, listener)

    markDemoTask('analytics')
    markDemoTask('add')
    markDemoTask('analytics')

    // Always in list order, whatever order they were done in
    expect(getDoneDemoTasks()).toEqual(['add', 'analytics'])
    expect(listener).toHaveBeenCalledTimes(2)
    window.removeEventListener(DEMO_PROGRESS_EVENT, listener)
  })

  it("ignores everything outside the demo", () => {
    localStorage.setItem('jobflow-token', 'a-real-jwt')
    markDemoTask('add')
    expect(getDoneDemoTasks()).toEqual([])
  })

  it('shrugs off junk in storage', () => {
    localStorage.setItem('jobflow-demo-checklist', '{not json')
    expect(getDoneDemoTasks()).toEqual([])
    localStorage.setItem('jobflow-demo-checklist', '["add","hack"]')
    expect(getDoneDemoTasks()).toEqual(['add'])
  })

  it('stays hidden once dismissed', () => {
    expect(isDemoChecklistDismissed()).toBe(false)
    dismissDemoChecklist()
    expect(isDemoChecklistDismissed()).toBe(true)
  })

  it('ticks off adding and starring from the demo API calls', async () => {
    await createApplication({ positionTitle: 'Engineer', companyName: 'Acme', status: 'APPLIED' } as never)
    expect(getDoneDemoTasks()).toEqual(['add'])

    await toggleStar(1)
    expect(getDoneDemoTasks()).toEqual(['add', 'organize'])
  })
})
