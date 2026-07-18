import { useRef, useState } from 'react'
import { Search, Camera } from 'lucide-react'
import './TopBar.css'

const AVATAR_STORAGE_KEY = 'jobflow-avatar'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function TopBar() {
  const [avatar, setAvatar] = useState<string | null>(() => {
    return localStorage.getItem(AVATAR_STORAGE_KEY)
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          <div className="topbar-avatar-img" onClick={handleAvatarClick}>
            {avatar ? (
              <img src={avatar} alt="Avatar" className="topbar-avatar-photo" />
            ) : (
              'AR'
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
            <span className="topbar-avatar-name">Alex R.</span>
            <span className="topbar-avatar-role">Recruiter</span>
          </div>
        </div>
      </div>
    </header>
  )
}
