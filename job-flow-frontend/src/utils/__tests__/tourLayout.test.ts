import { describe, it, expect } from 'vitest'
import {
  placeCard, unionRect, padRect, isVisible, holesPath,
  CARD_GAP, SCREEN_MARGIN, type Rect,
} from '../tourLayout'

const screen = { width: 1200, height: 800 }
const card = { width: 380, height: 200 }
const rect = (left: number, top: number, right: number, bottom: number): Rect => ({ left, top, right, bottom })

describe('placeCard', () => {
  it('centers the card when there is nothing to point at', () => {
    expect(placeCard(null, card, screen)).toEqual({ x: 410, y: 300, placement: 'center' })
  })

  it('puts the card below the target, lined up with its middle', () => {
    const pos = placeCard(rect(400, 100, 800, 200), card, screen)
    expect(pos.placement).toBe('below')
    expect(pos.y).toBe(200 + CARD_GAP)
    expect(pos.x).toBe(410)
    expect(pos.tipOffset).toBe(190) // arrow under the target's middle
  })

  it('goes above when there is no room below', () => {
    const pos = placeCard(rect(400, 500, 800, 700), card, screen)
    expect(pos.placement).toBe('above')
    expect(pos.y).toBe(500 - CARD_GAP - card.height)
  })

  it('goes to the side of a tall target, like the sidebar', () => {
    const pos = placeCard(rect(0, 80, 200, 780), card, screen)
    expect(pos.placement).toBe('right')
    expect(pos.x).toBe(200 + CARD_GAP)
    expect(pos.y).toBe(80)
  })

  it('goes left when the tall target is on the right', () => {
    const pos = placeCard(rect(900, 80, 1190, 780), card, screen)
    expect(pos.placement).toBe('left')
    expect(pos.x).toBe(900 - CARD_GAP - card.width)
  })

  it('sits inside a target that fills the screen, in its bottom-right corner', () => {
    const pos = placeCard(rect(220, 200, 1180, 1400), card, screen)
    expect(pos.placement).toBe('inside')
    expect(pos.x).toBe(1180 - card.width - SCREEN_MARGIN)
    expect(pos.y).toBe(800 - card.height - SCREEN_MARGIN) // bottom of the visible part, not of the target
  })

  it('never pushes the card off screen near an edge', () => {
    const pos = placeCard(rect(1100, 100, 1190, 150), card, screen)
    expect(pos.x + card.width).toBeLessThanOrEqual(screen.width - SCREEN_MARGIN)
    expect(pos.tipOffset).toBeLessThanOrEqual(card.width - 24) // arrow stays on the card
  })

  it('keeps the card on a phone screen narrower than it would like', () => {
    const phone = { width: 390, height: 844 }
    const pos = placeCard(rect(16, 100, 374, 300), { width: 358, height: 220 }, phone)
    expect(pos.placement).toBe('below')
    expect(pos.x).toBe(SCREEN_MARGIN)
  })
})

describe('rect helpers', () => {
  it('unions rects and returns null for none', () => {
    expect(unionRect([])).toBeNull()
    expect(unionRect([rect(10, 20, 30, 40), rect(0, 50, 20, 60)])).toEqual(rect(0, 20, 30, 60))
  })

  it('pads a rect on every side', () => {
    expect(padRect(rect(10, 10, 20, 20), 5)).toEqual(rect(5, 5, 25, 25))
  })

  it('treats a zero-size rect as hidden', () => {
    expect(isVisible(rect(0, 0, 0, 0))).toBe(false)
    expect(isVisible(rect(0, 0, 10, 10))).toBe(true)
  })
})

describe('holesPath', () => {
  it('is just the screen when there are no holes', () => {
    expect(holesPath([], screen)).toBe('M0 0H1200V800H0Z')
  })

  it('adds one closed sub-path per hole', () => {
    const path = holesPath([rect(10, 10, 110, 60), rect(200, 10, 300, 60)], screen)
    expect(path.match(/Z/g)).toHaveLength(3)
    expect(path).toContain('M22 10H98') // corners rounded by 12px
  })

  it('shrinks the corner radius for small holes', () => {
    expect(holesPath([rect(0, 0, 10, 10)], screen)).toContain('M5 0H5A5 5')
  })
})
