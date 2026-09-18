import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  CalendarCheck,
  Building2,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import './Sidebar.css'

const navItems = [
  { to: '/', labelKey: 'dashboard', icon: LayoutDashboard },
  { to: '/jobs', labelKey: 'jobs', icon: Briefcase },
  { to: '/interviews', labelKey: 'interviews', icon: CalendarCheck },
  { to: '/companies', labelKey: 'companies', icon: Building2 },
  { to: '/analytics', labelKey: 'analytics', icon: BarChart3 },
  { to: '/settings', labelKey: 'settings', icon: Settings },
] as const

export default function Sidebar() {
  const { t } = useLanguage()

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
    </aside>
  )
}
