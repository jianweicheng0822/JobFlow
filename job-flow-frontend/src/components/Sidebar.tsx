import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  CalendarCheck,
  BarChart3,
  Settings,
  MessageSquare,
  Zap,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import FeedbackForm from './FeedbackForm'
import './Sidebar.css'

const navItems = [
  { to: '/', labelKey: 'dashboard', icon: LayoutDashboard },
  { to: '/jobs', labelKey: 'jobs', icon: Briefcase },
  { to: '/interviews', labelKey: 'interviews', icon: CalendarCheck },
  { to: '/analytics', labelKey: 'analytics', icon: BarChart3 },
  { to: '/settings', labelKey: 'settings', icon: Settings },
] as const

export default function Sidebar() {
  const { t } = useLanguage()
  const [showFeedback, setShowFeedback] = useState(false)

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={18} />
        </div>
        <span className="sidebar-logo-text">{t.appName}</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-nav-item${isActive ? ' active' : ''}`
            }
            end={item.to === '/'}
          >
            <item.icon />
            {t[item.labelKey]}
          </NavLink>
        ))}
      </nav>

      {/* Pinned to the bottom on desktop. Phones have no room in the tab bar, so they get it in Settings */}
      <button type="button" className="sidebar-nav-item sidebar-feedback" onClick={() => setShowFeedback(true)}>
        <MessageSquare />
        {t.feedback}
      </button>

      {showFeedback && <FeedbackForm onClose={() => setShowFeedback(false)} />}
    </aside>
  )
}
