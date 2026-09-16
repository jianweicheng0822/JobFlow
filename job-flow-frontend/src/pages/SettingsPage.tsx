import { useRef, useState, useEffect } from 'react'
import { Camera, User, Lock, Bell, Palette, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import * as authApi from '../api/auth'
import './SettingsPage.css'

const AVATAR_STORAGE_KEY = 'jobflow-avatar'

type SettingsTab = 'profile' | 'account' | 'notifications' | 'appearance'

const tabs: { key: SettingsTab; label: string; icon: typeof User }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'account', label: 'Account', icon: Lock },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'appearance', label: 'Appearance', icon: Palette },
]

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  const [avatar, setAvatar] = useState<string | null>(() => {
    return localStorage.getItem(AVATAR_STORAGE_KEY)
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile fields
  const [fullName, setFullName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [interviewReminders, setInterviewReminders] = useState(true)
  const [weeklySummary, setWeeklySummary] = useState(false)

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('jobflow-theme') as 'light' | 'dark') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('jobflow-theme', theme)
  }, [theme])

  // Sync form when user changes
  useEffect(() => {
    if (user) {
      setFullName(user.name || '')
      setEmail(user.email || '')
      setJobTitle(user.jobTitle || '')
      setBio(user.bio || '')
    }
  }, [user])

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

  async function handleSaveProfile() {
    setProfileLoading(true)
    setProfileMsg(null)
    try {
      const res = await authApi.updateProfile({
        name: fullName.trim(),
        email: email.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        bio: bio.trim() || undefined,
      })
      updateUser({
        name: res.data.name,
        email: res.data.email,
        avatarUrl: res.data.avatarUrl,
        jobTitle: res.data.jobTitle,
        bio: res.data.bio,
      })
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.'
      setProfileMsg({ type: 'error', text: msg })
    } finally {
      setProfileLoading(false)
    }
  }

  function handleCancelProfile() {
    setFullName(user?.name || '')
    setEmail(user?.email || '')
    setJobTitle(user?.jobTitle || '')
    setBio(user?.bio || '')
    setProfileMsg(null)
  }

  async function handleChangePassword() {
    setPasswordMsg(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'All fields are required.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' })
      return
    }

    setPasswordLoading(true)
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMsg({ type: 'success', text: 'Password updated successfully.' })
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      const msg = error.response?.data?.message || 'Failed to change password.'
      setPasswordMsg({ type: 'error', text: msg })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="settings-page">
      <h1 className="settings-page-title">Settings</h1>

      <div className="settings-layout">
        {/* Left Side Nav */}
        <nav className="settings-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                className={`settings-nav-item ${activeTab === tab.key ? 'settings-nav-item--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Right Content */}
        <div className="settings-content">
      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="settings-section">
          <div className="settings-profile-header">
            <div className="settings-avatar" onClick={handleAvatarClick}>
              {user?.avatarUrl || avatar ? (
                <img src={user?.avatarUrl || avatar!} alt="Avatar" />
              ) : (
                (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
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
            {profileMsg && (
              <div className={`settings-msg settings-msg--${profileMsg.type}`}>
                {profileMsg.text}
              </div>
            )}
            <div className="settings-actions">
              <button className="settings-btn-secondary" onClick={handleCancelProfile}>Cancel</button>
              <button className="settings-btn-primary" onClick={handleSaveProfile} disabled={profileLoading}>
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="settings-section">
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
            {passwordMsg && (
              <div className={`settings-msg settings-msg--${passwordMsg.type}`}>
                {passwordMsg.text}
              </div>
            )}
            <div className="settings-actions">
              <button className="settings-btn-primary" onClick={handleChangePassword} disabled={passwordLoading}>
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="settings-section">
          <div className="settings-toggle-list">
            <div className="settings-toggle-item">
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">Email Notifications</span>
                <span className="settings-toggle-desc">Receive emails when your application status changes</span>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>
            <div className="settings-toggle-item">
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">Interview Reminders</span>
                <span className="settings-toggle-desc">Get notified before upcoming interviews</span>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={interviewReminders}
                  onChange={(e) => setInterviewReminders(e.target.checked)}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>
            <div className="settings-toggle-item">
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">Weekly Summary</span>
                <span className="settings-toggle-desc">Receive a weekly report of your job search activity</span>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={weeklySummary}
                  onChange={(e) => setWeeklySummary(e.target.checked)}
                />
                <span className="settings-toggle-slider" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="settings-section">
          <div className="settings-form">
            <div className="settings-field">
              <label className="settings-label">Theme</label>
              <span className="settings-toggle-desc">Choose your preferred appearance</span>
            </div>
            <div className="settings-theme-options">
              <button
                className={`settings-theme-card ${theme === 'light' ? 'settings-theme-card--active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <div className="settings-theme-preview settings-theme-preview--light">
                  <div className="settings-theme-preview-sidebar" />
                  <div className="settings-theme-preview-content">
                    <div className="settings-theme-preview-bar" />
                    <div className="settings-theme-preview-block" />
                    <div className="settings-theme-preview-block" />
                  </div>
                </div>
                <div className="settings-theme-label">
                  <Sun size={16} />
                  Light
                </div>
              </button>
              <button
                className={`settings-theme-card ${theme === 'dark' ? 'settings-theme-card--active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <div className="settings-theme-preview settings-theme-preview--dark">
                  <div className="settings-theme-preview-sidebar" />
                  <div className="settings-theme-preview-content">
                    <div className="settings-theme-preview-bar" />
                    <div className="settings-theme-preview-block" />
                    <div className="settings-theme-preview-block" />
                  </div>
                </div>
                <div className="settings-theme-label">
                  <Moon size={16} />
                  Dark
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}
