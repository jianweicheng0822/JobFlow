import { useRef, useState, useEffect } from 'react'
import { Camera, User, Lock, Bell, Palette, Sun, Moon, Link } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import * as authApi from '../api/auth'
import * as gmailApi from '../api/gmail'
import GmailImportModal from '../components/GmailImportModal'
import './SettingsPage.css'

const AVATAR_STORAGE_KEY = 'jobflow-avatar'

type SettingsTab = 'profile' | 'account' | 'notifications' | 'appearance' | 'integrations'

const tabs: { key: SettingsTab; label: string; icon: typeof User }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'account', label: 'Account', icon: Lock },
  { key: 'integrations', label: 'Integrations', icon: Link },
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

  // Integrations
  const [gmailStatus, setGmailStatus] = useState<{ gmailConnected: boolean; provider: string } | null>(null)
  const [gmailLoading, setGmailLoading] = useState(false)
  const [gmailLinkLoading, setGmailLinkLoading] = useState(false)
  const [showGmailModal, setShowGmailModal] = useState(false)
  const [gmailPreviews, setGmailPreviews] = useState<gmailApi.GmailImportPreview[]>([])
  const [scanError, setScanError] = useState<string | null>(null)
  const [gmailLinkMsg, setGmailLinkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  // Handle Gmail link callback from Google redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gmailLinked = params.get('gmailLinked')
    if (gmailLinked === 'true') {
      setActiveTab('integrations')
      setGmailLinkMsg({ type: 'success', text: 'Google account linked successfully! You can now scan Gmail.' })
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (gmailLinked === 'false') {
      setActiveTab('integrations')
      const error = params.get('error') || 'unknown'
      setGmailLinkMsg({ type: 'error', text: `Failed to link Google account (${error}). Please try again.` })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Fetch Gmail connection status when integrations tab is active
  useEffect(() => {
    if (activeTab === 'integrations') {
      gmailApi.getGmailStatus()
        .then((res) => setGmailStatus(res.data))
        .catch(() => setGmailStatus(null))
    }
  }, [activeTab])

  async function handleLinkGmail() {
    setGmailLinkLoading(true)
    setGmailLinkMsg(null)
    try {
      const res = await gmailApi.getGmailLinkUrl()
      window.location.href = res.data.authUrl
    } catch {
      setGmailLinkMsg({ type: 'error', text: 'Failed to start Google linking. Please try again.' })
      setGmailLinkLoading(false)
    }
  }

  async function handleScanGmail() {
    setGmailLoading(true)
    setScanError(null)
    try {
      const res = await gmailApi.scanGmail()
      setGmailPreviews(res.data)
      setShowGmailModal(true)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setScanError(error.response?.data?.message || 'Failed to scan Gmail. Please try again.')
    } finally {
      setGmailLoading(false)
    }
  }

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
        hasPassword: res.data.hasPassword,
        gmailConnected: res.data.gmailConnected,
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

  const needsCurrentPassword = user?.hasPassword ?? true

  async function handleChangePassword() {
    setPasswordMsg(null)

    if (needsCurrentPassword && !currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Current password is required.' })
      return
    }
    if (!newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Please fill in all required fields.' })
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
        currentPassword: needsCurrentPassword ? currentPassword : '',
        newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMsg({ type: 'success', text: 'Password updated successfully.' })
      if (user) updateUser({ ...user, hasPassword: true, gmailConnected: user.gmailConnected })
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
          {!needsCurrentPassword && (
            <div className="settings-msg settings-msg--info">
              You signed in with an external provider. Set a password to also log in with email.
            </div>
          )}
          <div className="settings-form">
            {needsCurrentPassword && (
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
            )}
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

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="settings-section">
          <h3 className="settings-section-title">Gmail Integration</h3>
          <div className="settings-integration-card">
            <div className="settings-integration-info">
              <div className="settings-integration-icon">
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
              </div>
              <div>
                <span className="settings-integration-name">Gmail</span>
                <span className="settings-toggle-desc">
                  {gmailStatus?.gmailConnected
                    ? 'Connected — scan your inbox for job application emails'
                    : 'Connect your Google account to enable Gmail scanning'}
                </span>
              </div>
            </div>
            <div className="settings-integration-actions">
              {gmailStatus?.gmailConnected ? (
                <>
                  <span className="settings-integration-badge settings-integration-badge--connected">Connected</span>
                  <button
                    className="settings-btn-primary"
                    onClick={handleScanGmail}
                    disabled={gmailLoading}
                  >
                    {gmailLoading ? 'Scanning...' : 'Scan Gmail'}
                  </button>
                </>
              ) : (
                <button
                  className="settings-btn-primary"
                  onClick={handleLinkGmail}
                  disabled={gmailLinkLoading}
                >
                  {gmailLinkLoading ? 'Connecting...' : 'Connect Google Account'}
                </button>
              )}
            </div>
          </div>
          {gmailLinkMsg && (
            <div className={`settings-msg settings-msg--${gmailLinkMsg.type}`} style={{ marginTop: 12 }}>
              {gmailLinkMsg.text}
            </div>
          )}
          {scanError && (
            <div className="settings-msg settings-msg--error" style={{ marginTop: 12 }}>
              {scanError}
            </div>
          )}
        </div>
      )}

      {showGmailModal && (
        <GmailImportModal
          previews={gmailPreviews}
          onClose={() => setShowGmailModal(false)}
        />
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
