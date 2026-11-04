// Geometry for the demo tour: where the highlight holes go and where the step card fits.
// Kept free of React and the DOM so it can be tested on plain numbers.

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

export interface Size {
  width: number
  height: number
}

export type Placement = 'center' | 'below' | 'above' | 'right' | 'left' | 'inside'

export interface CardPosition {
  x: number
  y: number
  placement: Placement
  // Where the little arrow sits along the card edge facing the target (px from the edge start)
  tipOffset?: number
}

// Space around a highlighted element, between highlight and card, and to the screen edge
export const HOLE_PADDING = 8
export const CARD_GAP = 16
export const SCREEN_MARGIN = 16
export const HOLE_RADIUS = 12

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)))

export function padRect(r: Rect, pad = HOLE_PADDING): Rect {
  return { left: r.left - pad, top: r.top - pad, right: r.right + pad, bottom: r.bottom + pad }
}

export function unionRect(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null
  return rects.reduce((u, r) => ({
    left: Math.min(u.left, r.left),
    top: Math.min(u.top, r.top),
    right: Math.max(u.right, r.right),
    bottom: Math.max(u.bottom, r.bottom),
  }))
}

// Hidden elements (display: none, or the sidebar on phones) measure as 0x0
export function isVisible(r: Rect): boolean {
  return r.right - r.left > 0 && r.bottom - r.top > 0
}

/**
 * Picks a spot for the card next to the highlighted area: below, above, right, then left,
 * whichever fits first. When nothing fits (the highlight fills the screen) the card goes
 * inside it, in the bottom-right corner. No target means a centered card.
 */
export function placeCard(target: Rect | null, card: Size, screen: Size): CardPosition {
  const maxX = screen.width - card.width - SCREEN_MARGIN
  const maxY = screen.height - card.height - SCREEN_MARGIN

  if (!target) {
    return {
      x: Math.max(SCREEN_MARGIN, (screen.width - card.width) / 2),
      y: Math.max(SCREEN_MARGIN, (screen.height - card.height) / 2),
      placement: 'center',
    }
  }

  // Only the part of the target that's on screen matters for lining things up
  const visibleTop = Math.max(target.top, 0)
  const visibleBottom = Math.min(target.bottom, screen.height)
  const centerX = (target.left + target.right) / 2
  const centerY = (visibleTop + visibleBottom) / 2
  const needH = card.height + CARD_GAP + SCREEN_MARGIN
  const needW = card.width + CARD_GAP + SCREEN_MARGIN

  const alongX = () => clamp(centerX - card.width / 2, SCREEN_MARGIN, maxX)
  const alongY = () => clamp(visibleTop, SCREEN_MARGIN, maxY)
  const tipX = (x: number) => clamp(centerX - x, 24, card.width - 24)
  const tipY = (y: number) => clamp(centerY - y, 24, card.height - 24)

  if (screen.height - target.bottom >= needH) {
    const x = alongX()
    return { x, y: target.bottom + CARD_GAP, placement: 'below', tipOffset: tipX(x) }
  }
  if (target.top >= needH) {
    const x = alongX()
    return { x, y: target.top - CARD_GAP - card.height, placement: 'above', tipOffset: tipX(x) }
  }
  if (screen.width - target.right >= needW) {
    const y = alongY()
    return { x: target.right + CARD_GAP, y, placement: 'right', tipOffset: tipY(y) }
  }
  if (target.left >= needW) {
    const y = alongY()
    return { x: target.left - CARD_GAP - card.width, y, placement: 'left', tipOffset: tipY(y) }
  }
  return {
    x: clamp(Math.min(target.right, screen.width) - card.width - SCREEN_MARGIN, SCREEN_MARGIN, maxX),
    y: clamp(visibleBottom - card.height - SCREEN_MARGIN, SCREEN_MARGIN, maxY),
    placement: 'inside',
  }
}

function roundedRectPath(r: Rect, radius = HOLE_RADIUS): string {
  const w = r.right - r.left
  const h = r.bottom - r.top
  const k = Math.min(radius, w / 2, h / 2)
  const { left: x, top: y } = r
  return `M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}`
    + `V${y + h - k}A${k} ${k} 0 0 1 ${x + w - k} ${y + h}`
    + `H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}`
    + `V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}Z`
}

/**
 * A path covering the whole screen with a rounded hole per rect, for
 * `clip-path: path(evenodd, ...)`. Clipping also stops clicks, so the dim layer blocks the
 * page while the holes stay usable. Holes must not overlap: evenodd would fill the overlap.
 */
export function holesPath(holes: Rect[], screen: Size): string {
  const outer = `M0 0H${screen.width}V${screen.height}H0Z`
  return [outer, ...holes.map((h) => roundedRectPath(h))].join('')
}
