import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import './SettingsPage.css'

const AVATAR_STORAGE_KEY = 'jobflow-avatar'

export default function SettingsPage() {
  const [avatar, setAvatar] = useState<string | null>(() => {
    return localStorage.getItem(AVATAR_STORAGE_KEY)
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState('Alex R.')
  const [email, setEmail] = useState('alex.r@example.com')
  const [jobTitle, setJobTitle] = useState('Recruiter')
  const [bio, setBio] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

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
    <div className="settings-page">
      <h1 className="settings-page-title">Settings</h1>

      {/* Profile Section */}
      <div className="settings-section">
        <h2 className="settings-section-title">Profile</h2>

        <div className="settings-profile-header">
          <div className="settings-avatar" onClick={handleAvatarClick}>
            {avatar ? (
              <img src={avatar} alt="Avatar" />
            ) : (
              'AR'
            )}
            <div className="settings-avatar-overlay">
              <Camera size={20} />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              hidden
            />
          </div>
          <div className="settings-avatar-text">
            <span className="settings-avatar-name">{fullName}</span>
            <span className="settings-avatar-hint">Click avatar to change photo</span>
          </div>
        </div>

        <div className="settings-form">
          <div className="settings-field-row">
            <div className="settings-field">
              <label className="settings-label">Full Name</label>
              <input
                type="text"
                className="settings-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">Email</label>
              <input
                type="email"
                className="settings-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="settings-field">
            <label className="settings-label">Job Title</label>
            <input
              type="text"
              className="settings-input"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <div className="settings-field">
            <label className="settings-label">Bio</label>
            <textarea
              className="settings-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
            />
          </div>
          <div className="settings-actions">
            <button className="settings-btn-secondary">Cancel</button>
            <button className="settings-btn-primary">Save Changes</button>
          </div>
        </div>
      </div>
      {/* Account Section */}
      <div className="settings-section">
        <h2 className="settings-section-title">Account</h2>
        <div className="settings-form">
          <div className="settings-field">
            <label className="settings-label">Current Password</label>
            <input
              type="password"
              className="settings-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <div className="settings-field-row">
            <div className="settings-field">
              <label className="settings-label">New Password</label>
              <input
                type="password"
                className="settings-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">Confirm Password</label>
              <input
                type="password"
                className="settings-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <div className="settings-actions">
            <button className="settings-btn-primary">Update Password</button>
          </div>
        </div>
      </div>
    </div>
  )
}
