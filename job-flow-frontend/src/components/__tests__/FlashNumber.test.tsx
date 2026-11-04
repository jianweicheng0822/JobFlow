import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import FlashNumber from '../FlashNumber'

describe('FlashNumber', () => {
  it("doesn't pop on the first render", () => {
    render(<FlashNumber value={4} />)
    expect(screen.getByText('4')).not.toHaveClass('flash-number--changed')
  })

  it('pops when the number changes, and again on the next change', () => {
    const { rerender } = render(<FlashNumber value={4} />)
    rerender(<FlashNumber value={5} />)
    const first = screen.getByText('5')
    expect(first).toHaveClass('flash-number--changed')

    rerender(<FlashNumber value={6} />)
    // A fresh element, so the animation starts over
    expect(screen.getByText('6')).not.toBe(first)
  })

  it('stays still when re-rendered with the same number', () => {
    const { rerender } = render(<FlashNumber value={4} />)
    rerender(<FlashNumber value={4} />)
    expect(screen.getByText('4')).not.toHaveClass('flash-number--changed')
  })
})
