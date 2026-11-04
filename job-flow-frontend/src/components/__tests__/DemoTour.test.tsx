import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import DemoTour from '../DemoTour'
import { LanguageProvider } from '../../context/LanguageProvider'

// A tiny board, enough for the drag hint to find a card and a second column
function Board() {
  return (
    <div className="pipeline-section">
      <div className="pipeline-column"><div className="pipeline-card">Card</div></div>
      <div className="pipeline-column" />
    </div>
  )
}

function renderTour(moveCount = 0, onClose = vi.fn()) {
  const ui = (count: number) => (
    <MemoryRouter>
      <LanguageProvider>
        <Routes>
          <Route path="/" element={<><Board /><DemoTour moveCount={count} onClose={onClose} /></>} />
          <Route path="/register" element={<div>register page</div>} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>
  )
  const result = render(ui(moveCount))
  return { ...result, setMoves: (n: number) => result.rerender(ui(n)), onClose }
}

describe('DemoTour', () => {
  beforeEach(() => localStorage.setItem('language', 'en'))
  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('lets you say no right away', () => {
    const { onClose } = renderTour()
    fireEvent.click(screen.getByRole('button', { name: 'No thanks' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows how to drag and waits until you do', () => {
    const { setMoves } = renderTour()
    fireEvent.click(screen.getByRole('button', { name: 'Show me around' }))

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByTestId('drag-hint')).toBeInTheDocument()
    expect(screen.queryByText(/Step \d of/)).not.toBeInTheDocument() // only one counted step

    setMoves(1)
    expect(screen.getByRole('dialog', { name: "Nice, that's all it takes" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    expect(screen.queryByTestId('drag-hint')).not.toBeInTheDocument()
  })

  it("doesn't count moves made before the drag step", () => {
    const { setMoves } = renderTour(3)
    setMoves(4) // dragged while the welcome card was up
    fireEvent.click(screen.getByRole('button', { name: 'Show me around' }))

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('sends you to sign up from the last step', () => {
    const { setMoves, onClose } = renderTour()
    fireEvent.click(screen.getByRole('button', { name: 'Show me around' }))
    setMoves(1)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign up free' }))

    expect(screen.getByText('register page')).toBeInTheDocument()
    expect(onClose).toHaveBeenCalled()
  })

  it("doesn't ask for a drag on a touch screen", () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(pointer: coarse)' }))
    renderTour()
    fireEvent.click(screen.getByRole('button', { name: 'Show me around' }))

    expect(screen.getByText(/tap a card and change its status/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    expect(screen.queryByTestId('drag-hint')).not.toBeInTheDocument()
  })
})
