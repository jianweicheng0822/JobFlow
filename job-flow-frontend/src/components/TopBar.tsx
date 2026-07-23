import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Camera, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './TopBar.css'

const AVATAR_STORAGE_KEY = 'jobflow-avatar'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function TopBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [avatar, setAvatar] = useState<string | null>(() => {
    return localStorage.getItem(AVATAR_STORAGE_KEY)
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayName = user?.name || 'User'
  const initials = getInitials(displayName)
  const avatarSrc = user?.avatarUrl || avatar

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl)
      setAvatar(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <div className="topbar-greeting">
        <h1>{getGreeting()}, {displayName.split(' ')[0]}!</h1>
        <p>Current job applications status</p>
      </div>

      <div className="topbar-right">
        <div className="topbar-search">
          <Search size={16} />
          <input type="text" placeholder="Search..." />
        </div>

        <div className="topbar-avatar">
          <div className="topbar-avatar-img" onClick={handleAvatarClick}>
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="topbar-avatar-photo" />
            ) : (
              initials
            )}
            <div className="topbar-avatar-overlay">
              <Camera size={14} />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              hidden
            />
          </div>
          <div className="topbar-avatar-info">
            <span className="topbar-avatar-name">{displayName}</span>
            <span className="topbar-avatar-role">{user?.email}</span>
          </div>
        </div>

        <button className="topbar-logout" onClick={handleLogout} title="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
