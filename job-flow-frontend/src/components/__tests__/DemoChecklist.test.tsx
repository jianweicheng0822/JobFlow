import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DemoChecklist from '../DemoChecklist'
import { AuthContext, type AuthUser } from '../../context/AuthContext'
import { LanguageProvider } from '../../context/LanguageProvider'
import { markDemoTask, DEMO_TASKS } from '../../utils/demoChecklist'
import { markDemoTourSeen } from '../../utils/demoTour'

const user: AuthUser = {
  name: 'Demo User', email: 'demo@jobflow.com', avatarUrl: null, jobTitle: null, bio: null,
  hasPassword: true, gmailConnected: false, timeZone: null,
}

function renderChecklist() {
  const auth = {
    user, loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(),
    tryDemo: vi.fn(), updateUser: vi.fn(),
  }
  return render(
    <AuthContext.Provider value={auth}>
      <LanguageProvider>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<DemoChecklist />} />
            <Route path="/register" element={<div>register page</div>} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </AuthContext.Provider>
  )
}

const checklist = () => screen.queryByRole('complementary', { name: 'Things to try' })

describe('DemoChecklist', () => {
  beforeEach(() => {
    localStorage.setItem('language', 'en')
    localStorage.setItem('jobflow-token', 'demo-token')
  })
  afterEach(() => localStorage.clear())

  it('waits for the tour to be done, then shows up', () => {
    renderChecklist()
    expect(checklist()).not.toBeInTheDocument()

    act(() => markDemoTourSeen())
    expect(checklist()).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(4)
  })

  it('stays out of the way for real accounts', () => {
    localStorage.setItem('jobflow-token', 'a-real-jwt')
    markDemoTourSeen()
    renderChecklist()
    expect(checklist()).not.toBeInTheDocument()
  })

  it('ticks items off as you do them anywhere in the app', () => {
    markDemoTourSeen()
    renderChecklist()
    expect(screen.getByRole('button', { name: /Things to try 0\/4/ })).toBeInTheDocument()

    act(() => markDemoTask('analytics'))
    expect(screen.getByRole('button', { name: /Things to try 1\/4/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Open Analytics\s*✓$/ })).toHaveClass('demo-checklist-item--done')
    expect(screen.getByRole('link', { name: 'Add an application' })).toHaveAttribute('href', '/jobs')
  })

  it('ends on sign up once everything is done', () => {
    markDemoTourSeen()
    renderChecklist()
    act(() => DEMO_TASKS.forEach(markDemoTask))

    expect(screen.getByText(/You've tried the essentials/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sign up free' }))
    expect(screen.getByText('register page')).toBeInTheDocument()
  })

  it('collapses, and remembers that', () => {
    markDemoTourSeen()
    const { unmount } = renderChecklist()
    const toggle = screen.getByRole('button', { name: /Things to try/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryAllByRole('link')).toHaveLength(0)

    unmount()
    renderChecklist()
    expect(screen.getByRole('button', { name: /Things to try/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('pops open by itself when the last item is done', () => {
    markDemoTourSeen()
    localStorage.setItem('jobflow-demo-checklist-collapsed', '1')
    renderChecklist()
    act(() => DEMO_TASKS.forEach(markDemoTask))
    expect(screen.getByRole('button', { name: 'Sign up free' })).toBeInTheDocument()
  })

  it('can be hidden for good', () => {
    markDemoTourSeen()
    const { unmount } = renderChecklist()
    fireEvent.click(screen.getByRole('button', { name: 'Hide the checklist' }))
    expect(checklist()).not.toBeInTheDocument()

    unmount()
    renderChecklist()
    expect(checklist()).not.toBeInTheDocument()
  })
})
