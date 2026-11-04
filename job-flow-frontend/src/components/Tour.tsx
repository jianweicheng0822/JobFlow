import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '../context/LanguageContext'
import {
  holesPath, isVisible, padRect, placeCard, unionRect,
  type CardPosition, type Rect,
} from '../utils/tourLayout'
import './Tour.css'

export interface TourStep {
  title: string
  body: React.ReactNode
  // CSS selectors; every match is highlighted. None (or nothing visible) shows a centered card.
  targets?: string[]
  // One highlight per match instead of a single box around all of them
  separate?: boolean
  // Welcome and closing cards don't count towards "Step 2 of 4"
  counted?: boolean
  // False while the step waits for the user to do something (Next is disabled)
  canAdvance?: boolean
  primaryLabel?: string
  secondaryLabel?: string
  // Runs before moving on, e.g. to navigate from the last step
  onPrimary?: () => void
}

export type TourCloseReason = 'skip' | 'done'

interface TourProps {
  steps: TourStep[]
  step: number
  onStepChange: (step: number) => void
  onClose: (reason: TourCloseReason) => void
}

interface Layout {
  holes: Rect[]
  rings: Rect[]
  card: CardPosition
  screen: { width: number; height: number }
}

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect()
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
}

const isTyping = (el: Element | null) =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
  || (el instanceof HTMLElement && el.isContentEditable)

/**
 * Spotlight tour: dims the page, cuts a hole around each target and shows a step card next
 * to it. The holes stay interactive (you can drag a card inside one), the rest of the page
 * doesn't take clicks until the tour closes. The parent owns the step number, so a step can
 * move on by itself once the user has done what it asks.
 */
export default function Tour({ steps, step, onStepChange, onClose }: TourProps) {
  const { t } = useLanguage()
  const current = steps[step]
  const cardRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<Layout | null>(null)
  const titleId = useId()
  const bodyId = useId()

  const isLast = step === steps.length - 1
  const canAdvance = current.canAdvance ?? true
  const counted = steps.filter((s) => s.counted ?? true)
  // "Step 1 of 1" says nothing, so a lone step goes without a counter
  const countedIndex = (current.counted ?? true) && counted.length > 1 ? counted.indexOf(current) : -1

  const findTargets = useCallback(
    () => (current.targets ?? []).flatMap((sel) => [...document.querySelectorAll(sel)]),
    [current],
  )

  const measure = useCallback(() => {
    const screen = { width: window.innerWidth, height: window.innerHeight }
    const rects = findTargets().map(rectOf).filter(isVisible).map((r) => padRect(r))
    const union = unionRect(rects)
    const holes = current.separate ? rects : union ? [union] : []
    const card = cardRef.current
    const size = { width: card?.offsetWidth ?? 0, height: card?.offsetHeight ?? 0 }
    // Keep the card clear of fixed bars at the bottom (the phone tab bar sets this)
    const inset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tour-inset-bottom')) || 0
    const cardArea = { width: screen.width, height: screen.height - inset }
    setLayout({ holes, rings: holes, card: placeCard(union, size, cardArea), screen })
  }, [current, findTargets])

  // New step: bring the targets on screen, then measure
  useLayoutEffect(() => {
    const els = findTargets().filter((el) => isVisible(rectOf(el)))
    const union = unionRect(els.map(rectOf))
    if (union && (union.top < 0 || union.bottom > window.innerHeight)) {
      const tooTall = union.bottom - union.top > window.innerHeight
      const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      els[0].scrollIntoView?.({ block: tooTall ? 'start' : 'center', behavior: smooth ? 'smooth' : 'auto' })
    }
    measure()
  }, [findTargets, measure])

  // Follow the page: scrolling, resizing, and targets changing size (a card dragged to another column)
  useEffect(() => {
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
    findTargets().forEach((el) => observer?.observe(el))
    if (cardRef.current) observer?.observe(cardRef.current)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
      observer?.disconnect()
    }
  }, [findTargets, measure])

  // Keyboard users go back where they were once the tour closes...
  // (declared first so it grabs the focus before the card takes it)
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    return () => before?.focus?.({ preventScroll: true })
  }, [])
  // ...and land on the card at every step
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true })
  }, [step])

  const next = useCallback(() => {
    if (!canAdvance) return
    current.onPrimary?.()
    if (isLast) onClose('done')
    else onStepChange(step + 1)
  }, [canAdvance, current, isLast, onClose, onStepChange, step])

  const back = useCallback(() => {
    if (step > 0) onStepChange(step - 1)
  }, [onStepChange, step])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // A dialog opened from inside a hole (e.g. editing a card) gets the keys first
      if (e.defaultPrevented || document.querySelector('.modal-overlay')) return
      if (e.key === 'Escape') onClose(isLast ? 'done' : 'skip')
      else if (isTyping(document.activeElement)) return
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') back()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [back, isLast, next, onClose])

  const pos = layout?.card
  const tipStyle: React.CSSProperties | undefined = pos?.tipOffset === undefined ? undefined
    : pos.placement === 'below' || pos.placement === 'above' ? { left: pos.tipOffset } : { top: pos.tipOffset }

  return createPortal(
    <div className="tour" data-placement={pos?.placement ?? 'center'}>
      <div
        className="tour-dim"
        style={layout ? { clipPath: `path(evenodd, '${holesPath(layout.holes, layout.screen)}')` } : undefined}
        aria-hidden="true"
      />
      {layout?.rings.map((r, i) => (
        <div
          key={i}
          className="tour-ring"
          style={{ left: r.left, top: r.top, width: r.right - r.left, height: r.bottom - r.top }}
          aria-hidden="true"
        />
      ))}
      <div
        ref={cardRef}
        key={step}
        className={`tour-card tour-card--${pos?.placement ?? 'center'}`}
        style={pos ? { left: pos.x, top: pos.y } : { visibility: 'hidden' }}
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
      >
        {tipStyle && <span className="tour-card-tip" style={tipStyle} aria-hidden="true" />}
        {countedIndex >= 0 && (
          <div className="tour-card-step">
            {t.tourStepOf.replace('{n}', String(countedIndex + 1)).replace('{total}', String(counted.length))}
          </div>
        )}
        <h2 id={titleId} className="tour-card-title">{current.title}</h2>
        {/* Polite live region: a step can change its text once the user does what it asks */}
        <div id={bodyId} className="tour-card-body" aria-live="polite">{current.body}</div>
        {countedIndex >= 0 && (
          <div className="tour-card-dots" aria-hidden="true">
            {counted.map((_, i) => <span key={i} className={i === countedIndex ? 'is-current' : undefined} />)}
          </div>
        )}
        <div className="tour-card-actions">
          <button type="button" className="tour-btn tour-btn--link" onClick={() => onClose(isLast ? 'done' : 'skip')}>
            {current.secondaryLabel ?? t.tourSkip}
          </button>
          <div className="tour-card-nav">
            {step > 0 && (
              <button type="button" className="tour-btn" onClick={back}>{t.tourBack}</button>
            )}
            <button type="button" className="tour-btn tour-btn--primary" onClick={next} disabled={!canAdvance}>
              {current.primaryLabel ?? (isLast ? t.tourDone : t.tourNext)}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
