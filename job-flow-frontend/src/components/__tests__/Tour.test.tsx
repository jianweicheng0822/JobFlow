import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useState } from 'react'
import Tour, { type TourStep, type TourCloseReason } from '../Tour'
import { LanguageProvider } from '../../context/LanguageProvider'

const STEPS: TourStep[] = [
  { title: 'Welcome', body: 'Hello there', counted: false, primaryLabel: 'Start tour', secondaryLabel: 'No thanks' },
  { title: 'Stats', body: 'Your numbers', targets: ['#stats'] },
  { title: 'Two things', body: 'Settings and feedback', targets: ['.pair'], separate: true },
  { title: 'All done', body: 'Bye', counted: false, secondaryLabel: 'Keep exploring' },
]

// jsdom has no layout, so give the targets a size by hand
function placeTarget(el: Element, left: number, top: number, width: number, height: number) {
  el.getBoundingClientRect = () => ({
    left, top, right: left + width, bottom: top + height, width, height, x: left, y: top, toJSON: () => ({}),
  })
}

function Harness({ steps = STEPS, start = 0, onClose = vi.fn() }: {
  steps?: TourStep[]; start?: number; onClose?: (r: TourCloseReason) => void
}) {
  const [step, setStep] = useState(start)
  return <Tour steps={steps} step={step} onStepChange={setStep} onClose={onClose} />
}

function renderTour(props: Parameters<typeof Harness>[0] = {}) {
  return render(<LanguageProvider><Harness {...props} /></LanguageProvider>)
}

describe('Tour', () => {
  // The page the tour points at, kept apart from what React renders
  let page: HTMLDivElement
  beforeEach(() => {
    localStorage.clear()
    page = document.createElement('div')
    page.innerHTML = `
      <div id="stats"></div>
      <button class="pair">Settings</button>
      <button class="pair">Feedback</button>`
    document.body.appendChild(page)
    placeTarget(document.getElementById('stats')!, 100, 100, 600, 120)
    const [a, b] = document.querySelectorAll('.pair')
    placeTarget(a, 10, 300, 180, 40)
    placeTarget(b, 10, 700, 180, 40)
  })
  afterEach(() => {
    cleanup()
    page.remove()
    document.querySelectorAll('input, .modal-overlay').forEach((el) => el.remove())
  })

  it('opens with a centered welcome card that is not counted as a step', () => {
    renderTour()
    const card = screen.getByRole('dialog', { name: 'Welcome' })
    expect(card).toHaveClass('tour-card--center')
    expect(card).toHaveAccessibleDescription('Hello there')
    expect(screen.queryByText(/Step \d of/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    expect(document.querySelectorAll('.tour-ring')).toHaveLength(0)
  })

  it('moves forward and back, numbering only the counted steps', () => {
    renderTour()
    fireEvent.click(screen.getByRole('button', { name: 'Start tour' }))
    expect(screen.getByRole('dialog', { name: 'Stats' })).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('dialog', { name: 'Stats' })).toBeInTheDocument()
  })

  it('draws one highlight around a target and places the card beside it', () => {
    renderTour({ start: 1 })
    const rings = document.querySelectorAll<HTMLElement>('.tour-ring')
    expect(rings).toHaveLength(1)
    // 8px of padding around the 600x120 target
    expect(rings[0].style).toMatchObject({ left: '92px', top: '92px', width: '616px', height: '136px' })
    expect(screen.getByRole('dialog')).toHaveClass('tour-card--below')
    expect(document.querySelector<HTMLElement>('.tour-dim')!.style.clipPath).toContain('evenodd')
  })

  it('gives each target its own highlight when asked to', () => {
    renderTour({ start: 2 })
    expect(document.querySelectorAll('.tour-ring')).toHaveLength(2)
  })

  it('falls back to a centered card when the targets are hidden, like the sidebar on phones', () => {
    placeTarget(document.getElementById('stats')!, 0, 0, 0, 0)
    renderTour({ start: 1 })
    expect(screen.getByRole('dialog')).toHaveClass('tour-card--center')
    expect(document.querySelectorAll('.tour-ring')).toHaveLength(0)
  })

  it('skips with the secondary button or Escape', () => {
    const onClose = vi.fn()
    renderTour({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'No thanks' }))
    expect(onClose).toHaveBeenLastCalledWith('skip')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenLastCalledWith('skip')
  })

  it('finishes from the last step and runs its action', () => {
    const onClose = vi.fn()
    const onPrimary = vi.fn()
    const steps = STEPS.map((s, i) => i === STEPS.length - 1 ? { ...s, primaryLabel: 'Sign up free', onPrimary } : s)
    renderTour({ steps, start: steps.length - 1, onClose })

    fireEvent.click(screen.getByRole('button', { name: 'Sign up free' }))
    expect(onPrimary).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledWith('done')

    fireEvent.click(screen.getByRole('button', { name: 'Keep exploring' }))
    expect(onClose).toHaveBeenLastCalledWith('done')
  })

  it('waits on a step until the user has done what it asks', () => {
    const steps = STEPS.map((s, i) => i === 1 ? { ...s, canAdvance: false } : s)
    renderTour({ steps, start: 1 })

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByRole('dialog', { name: 'Stats' })).toBeInTheDocument()
  })

  it('steps with the arrow keys, but not while typing', () => {
    renderTour({ start: 1 })
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByRole('dialog', { name: 'Two things' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(screen.getByRole('dialog', { name: 'Stats' })).toBeInTheDocument()

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByRole('dialog', { name: 'Stats' })).toBeInTheDocument()
  })

  it('leaves Escape to a dialog opened on top of the tour', () => {
    const onClose = vi.fn()
    renderTour({ start: 1, onClose })
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    document.body.appendChild(modal)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('moves focus to the card, and back to where it was when the tour closes', () => {
    const before = document.querySelector<HTMLButtonElement>('.pair')!
    before.focus()
    const { unmount } = renderTour()
    expect(screen.getByRole('dialog')).toHaveFocus()

    unmount()
    expect(before).toHaveFocus()
  })

  it('speaks Chinese when the app does', () => {
    localStorage.setItem('language', 'zh')
    renderTour({ start: 1 })
    expect(screen.getByText('第 1 步，共 2 步')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '下一步' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '跳过引导' })).toBeInTheDocument()
  })
})
