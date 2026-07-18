import { Search } from 'lucide-react'
import './TopBar.css'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-greeting">
        <h1>{getGreeting()}, Alex!</h1>
        <p>Current job applications status</p>
      </div>

      <div className="topbar-right">
        <div className="topbar-search">
          <Search size={16} />
          <input type="text" placeholder="Search..." />
        </div>

        <div className="topbar-avatar">
          <div className="topbar-avatar-img">AR</div>
          <div className="topbar-avatar-info">
            <span className="topbar-avatar-name">Alex R.</span>
            <span className="topbar-avatar-role">Recruiter</span>
          </div>
        </div>
      </div>
    </header>
  )
}
