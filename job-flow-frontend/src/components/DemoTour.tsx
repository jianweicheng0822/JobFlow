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
  x: number
  y: number
  dx: number
}

/**
 * A pointer that keeps "dragging" the first card into the next column until you do it
 * yourself. Purely decorative: it ignores the mouse and screen readers skip it.
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
      const x = from.left + from.width / 2
      setPath({ x, y: from.top + from.height / 2, dx: to.left + to.width / 2 - x })
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
  return (
    <div
      className="demo-drag-hint"
      style={{ left: path.x, top: path.y, '--hint-dx': `${path.dx}px` } as React.CSSProperties}
      aria-hidden="true"
      data-testid="drag-hint"
    >
      <span className="demo-drag-hint-ghost" />
      <MousePointer2 className="demo-drag-hint-pointer" size={26} fill="currentColor" />
    </div>
  )
}
