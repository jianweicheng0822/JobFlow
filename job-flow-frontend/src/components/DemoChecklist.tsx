import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, CircleCheck, Circle, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { isDemoMode } from '../api/mockData'
import { hasSeenDemoTour } from '../utils/demoTour'
import {
  DEMO_TASKS,
  DEMO_PROGRESS_EVENT,
  getDoneDemoTasks,
  isDemoChecklistDismissed,
  dismissDemoChecklist,
  type DemoTask,
} from '../utils/demoChecklist'
import FlashNumber from './FlashNumber'
import './DemoChecklist.css'

const COLLAPSED_KEY = 'jobflow-demo-checklist-collapsed'

// Where each task can be done, so the items double as shortcuts
const TASK_LINKS: Record<DemoTask, { to: string; state?: { tab: string } }> = {
  add: { to: '/jobs' },
  organize: { to: '/jobs' },
  analytics: { to: '/analytics' },
  personalize: { to: '/settings', state: { tab: 'appearance' } },
}

function readState() {
  return {
    done: getDoneDemoTasks(),
    visible: isDemoMode() && hasSeenDemoTour() && !isDemoChecklistDismissed(),
  }
}

// Phones start collapsed so the list doesn't sit on top of the page
function startCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(COLLAPSED_KEY)
    if (saved !== null) return saved === '1'
  } catch {
    // Fall through to the screen-size default
  }
  return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 768px)').matches
}

// A short list of things to try after the tour. Each item ticks itself off
// when you do it anywhere in the app; finishing them all ends on sign up.
export default function DemoChecklist() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [{ done, visible }, setState] = useState(readState)
  const [collapsed, setCollapsed] = useState(startCollapsed)

  useEffect(() => {
    const refresh = () => setState(readState())
    window.addEventListener(DEMO_PROGRESS_EVENT, refresh)
    return () => window.removeEventListener(DEMO_PROGRESS_EVENT, refresh)
  }, [])

  const allDone = done.length === DEMO_TASKS.length

  // Open up once everything is ticked, so the finish line doesn't go unseen
  useEffect(() => {
    if (allDone) setCollapsed(false)
  }, [allDone])

  if (!user || !visible) return null

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      // Just not remembered
    }
  }

  const labels: Record<DemoTask, string> = {
    add: t.demoChecklistAdd,
    organize: t.demoChecklistOrganize,
    analytics: t.demoChecklistAnalytics,
    personalize: t.demoChecklistPersonalize,
  }

  return (
    <aside className={`demo-checklist${collapsed ? ' demo-checklist--collapsed' : ''}`} aria-label={t.demoChecklistTitle}>
      <div className="demo-checklist-header">
        <button
          type="button"
          className="demo-checklist-toggle"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="demo-checklist-body"
          aria-label={`${t.demoChecklistTitle} ${done.length}/${DEMO_TASKS.length}`}
          title={collapsed ? t.demoChecklistShow : t.demoChecklistCollapse}
        >
          <span className="demo-checklist-title">{t.demoChecklistTitle}</span>
          <span className="demo-checklist-count">
            <FlashNumber value={done.length} />/{DEMO_TASKS.length}
          </span>
          {collapsed ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="demo-checklist-close"
          onClick={dismissDemoChecklist}
          aria-label={t.demoChecklistHide}
          title={t.demoChecklistHide}
        >
          <X size={16} />
        </button>
      </div>

      <div className="demo-checklist-progress" aria-hidden="true">
        <div className="demo-checklist-progress-bar" style={{ width: `${(done.length / DEMO_TASKS.length) * 100}%` }} />
      </div>

      {!collapsed && (
        <div id="demo-checklist-body" className="demo-checklist-body">
          {allDone ? (
            <div className="demo-checklist-finish">
              <p className="demo-checklist-finish-title">{t.demoChecklistDoneTitle}</p>
              <p className="demo-checklist-finish-body">{t.demoChecklistDoneBody}</p>
              <button type="button" className="demo-checklist-signup" onClick={() => navigate('/register')}>
                {t.demoTourSignUp}
              </button>
            </div>
          ) : (
            <ul className="demo-checklist-items">
              {DEMO_TASKS.map((task) => {
                const isDone = done.includes(task)
                return (
                  <li key={task}>
                    <Link
                      to={TASK_LINKS[task].to}
                      state={TASK_LINKS[task].state}
                      className={`demo-checklist-item${isDone ? ' demo-checklist-item--done' : ''}`}
                    >
                      {isDone
                        ? <CircleCheck size={18} className="demo-checklist-check" aria-hidden="true" />
                        : <Circle size={18} className="demo-checklist-check" aria-hidden="true" />}
                      <span>{labels[task]}</span>
                      {isDone && <span className="demo-checklist-sr"> ✓</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </aside>
  )
}
