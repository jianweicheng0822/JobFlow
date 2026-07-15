import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  BarChart3,
  Settings,
  Zap,
} from 'lucide-react'
import './Sidebar.css'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={18} />
        </div>
        <span className="sidebar-logo-text">JobFlow</span>
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
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
