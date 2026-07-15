import { Search } from 'lucide-react'
import './TopBar.css'

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-greeting">
        <h1>Good morning, Alex!</h1>
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
