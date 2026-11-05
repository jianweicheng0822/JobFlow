import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MousePointer2 } from 'lucide-react'
import Tour, { type TourStep } from './Tour'
import { useLanguage } from '../context/LanguageContext'
import './DemoTour.css'

interface DemoTourProps {
  // Goes up every time a card changes stage on the board
  moveCount: number
  onClose: () => void
}

const DRAG_STEP = 1

// Phones and tablets: HTML5 drag and drop doesn't work with touch, so don't ask for it
const isTouchOnly = () => window.matchMedia?.('(pointer: coarse)').matches ?? false

/**
 * The short tour that opens with the demo. Its one real step asks you to drag a card to
 * another stage and waits until you have, so the first thing you learn is by doing it.
 */
export default function DemoTour({ moveCount, onClose }: DemoTourProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  // The move count when the drag step opened; any move after that counts
  const [movesBefore, setMovesBefore] = useState<number | null>(null)
  const [touchOnly] = useState(isTouchOnly)

  const dragged = movesBefore !== null && moveCount > movesBefore

  function goTo(next: number) {
    if (next === DRAG_STEP && movesBefore === null) setMovesBefore(moveCount)
    setStep(next)
  }

  const steps: TourStep[] = [
    {
      title: t.demoTourWelcomeTitle,
      body: t.demoTourWelcomeBody,
      counted: false,
      primaryLabel: t.demoTourStart,
      secondaryLabel: t.demoTourNoThanks,
    },
    {
      title: dragged ? t.demoTourDragDoneTitle : t.demoTourDragTitle,
      body: dragged ? t.demoTourDragDoneBody : touchOnly ? t.demoTourDragBodyTouch : t.demoTourDragBody,
      targets: ['.pipeline-section'],
      canAdvance: dragged || touchOnly,
    },
    {
      title: t.demoTourFinishTitle,
      body: t.demoTourFinishBody,
      counted: false,
      primaryLabel: t.demoTourSignUp,
      secondaryLabel: t.demoTourKeepExploring,
      onPrimary: () => navigate('/register'),
    },
  ]

  return (
    <>
      <Tour steps={steps} step={step} onStepChange={goTo} onClose={onClose} />
      {step === DRAG_STEP && !dragged && !touchOnly && <DragHint />}
    </>
  )
}

interface HintPath {
  // the card being suggested, so it can be outlined and copied into the ghost
  card: { left: number; top: number; width: number; height: number }
  title: string
  company: string
  dx: number
}

/**
 * Lights up the first card and keeps "dragging" a copy of it into the next column until
 * you do it yourself. Purely decorative: it ignores the mouse and screen readers skip it.
 */
function DragHint() {
  const [path, setPath] = useState<HintPath | null>(null)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      const columns = document.querySelectorAll('.pipeline-column')
      const card = columns[0]?.querySelector('.pipeline-card')
      if (!card || columns.length < 2) {
        setPath(null)
        return
      }
      const from = card.getBoundingClientRect()
      const to = columns[1].getBoundingClientRect()
      setPath({
        card: { left: from.left, top: from.top, width: from.width, height: from.height },
        title: card.querySelector('.pipeline-card-title')?.textContent?.trim() ?? '',
        company: card.querySelector('.pipeline-card-company')?.textContent?.trim() ?? '',
        dx: to.left + to.width / 2 - (from.left + from.width / 2),
      })
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
    }
  }, [])

  if (!path) return null
  const { card } = path
  return (
    <div aria-hidden="true" data-testid="drag-hint">
      {/* An outline drawn over the card rather than a class on it, so the board's own render can't wipe it */}
      <span className="demo-drag-source" style={{ left: card.left, top: card.top, width: card.width, height: card.height }} />
      <div
        className="demo-drag-hint"
        style={{ left: card.left + card.width / 2, top: card.top + card.height / 2, '--hint-dx': `${path.dx}px` } as React.CSSProperties}
      >
        <span className="demo-drag-hint-ghost">
          <span className="demo-drag-hint-title">{path.title}</span>
          {path.company && <span className="demo-drag-hint-company">{path.company}</span>}
        </span>
        <MousePointer2 className="demo-drag-hint-pointer" size={26} fill="currentColor" />
      </div>
    </div>
  )
}
