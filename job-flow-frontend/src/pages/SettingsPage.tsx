import { useRef, useState, useEffect } from 'react'
import { Camera, User, Lock, Bell, Palette, Sun, Moon, Link, Globe } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import { getErrorMessage } from '../api/client'
import * as authApi from '../api/auth'
import * as gmailApi from '../api/gmail'
import GmailImportModal from '../components/GmailImportModal'
import './SettingsPage.css'

const AVATAR_STORAGE_KEY = 'jobflow-avatar'

type SettingsTab = 'profile' | 'account' | 'notifications' | 'appearance' | 'integrations'

const tabDefs: { key: SettingsTab; labelKey: string; icon: typeof User }[] = [
  { key: 'profile', labelKey: 'profile', icon: User },
  { key: 'account', labelKey: 'account', icon: Lock },
  { key: 'integrations', labelKey: 'integrations', icon: Link },
  { key: 'notifications', labelKey: 'notifications', icon: Bell },
  { key: 'appearance', labelKey: 'appearance', icon: Palette },
]

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const { t, lang, setLanguage } = useLanguage()
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
      showToast(t.googleLinked, 'success')
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (gmailLinked === 'false') {
      setActiveTab('integrations')
      const error = params.get('error') || 'unknown'
      showToast(`${t.googleLinkFailed} (${error})`, 'error')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [showToast])

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
    try {
      const res = await gmailApi.getGmailLinkUrl()
      window.location.href = res.data.authUrl
    } catch {
      showToast(t.googleLinkStartFailed, 'error')
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
      showToast(t.profileUpdated, 'success')
    } catch (err) {
      showToast(getErrorMessage(err, t.profileUpdateFailed), 'error')
    } finally {
      setProfileLoading(false)
    }
  }

  function handleCancelProfile() {
    setFullName(user?.name || '')
    setEmail(user?.email || '')
    setJobTitle(user?.jobTitle || '')
    setBio(user?.bio || '')
  }

  const needsCurrentPassword = user?.hasPassword ?? true

  async function handleChangePassword() {
    setPasswordMsg(null)

    if (needsCurrentPassword && !currentPassword) {
      setPasswordMsg({ type: 'error', text: t.currentPasswordRequired })
      return
    }
    if (!newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: t.fillAllFields })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: t.newPasswordMismatch })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: t.passwordMinLength })
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
      showToast(t.passwordUpdated, 'success')
      if (user) updateUser({ ...user, hasPassword: true, gmailConnected: user.gmailConnected })
    } catch (err) {
      showToast(getErrorMessage(err, t.passwordChangeFailed), 'error')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="settings-page">
      <h1 className="settings-page-title">{t.settings}</h1>

      <div className="settings-layout">
        {/* Left Side Nav */}
        <nav className="settings-nav">
          {tabDefs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                className={`settings-nav-item ${activeTab === tab.key ? 'settings-nav-item--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={18} />
                {t[tab.labelKey as keyof typeof t]}
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
              <span className="settings-avatar-hint">{t.clickAvatarToChange}</span>
            </div>
          </div>

          <div className="settings-form">
            <div className="settings-field-row">
              <div className="settings-field">
                <label className="settings-label">{t.fullName}</label>
                <input
                  type="text"
                  className="settings-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">{t.email}</label>
                <input
                  type="email"
                  className="settings-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="settings-field">
              <label className="settings-label">{t.jobTitleLabel}</label>
              <input
                type="text"
                className="settings-input"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">{t.bio}</label>
              <textarea
                className="settings-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t.bioPlaceholder}
              />
            </div>
            <div className="settings-actions">
              <button className="settings-btn-secondary" onClick={handleCancelProfile}>{t.cancel}</button>
              <button className="settings-btn-primary" onClick={handleSaveProfile} disabled={profileLoading}>
                {profileLoading ? t.saving : t.save}
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
              {t.oauthPasswordHint}
            </div>
          )}
          <div className="settings-form">
            {needsCurrentPassword && (
              <div className="settings-field">
                <label className="settings-label">{t.currentPassword}</label>
                <input
                  type="password"
                  className="settings-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t.currentPasswordPlaceholder}
                />
              </div>
            )}
            <div className="settings-field-row">
              <div className="settings-field">
                <label className="settings-label">{t.newPassword}</label>
                <input
                  type="password"
                  className="settings-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.newPasswordPlaceholder}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">{t.confirmPassword}</label>
                <input
                  type="password"
                  className="settings-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.confirmNewPasswordPlaceholder}
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
                {passwordLoading ? t.updating : t.updatePassword}
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
                <span className="settings-toggle-label">{t.emailNotifications}</span>
                <span className="settings-toggle-desc">{t.emailNotificationsDesc}</span>
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
                <span className="settings-toggle-label">{t.interviewReminders}</span>
                <span className="settings-toggle-desc">{t.interviewRemindersDesc}</span>
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
                <span className="settings-toggle-label">{t.weeklySummary}</span>
                <span className="settings-toggle-desc">{t.weeklySummaryDesc}</span>
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
          <h3 className="settings-section-title">{t.gmailIntegration}</h3>
          <div className="settings-integration-card">
            <div className="settings-integration-info">
              <div className="settings-integration-icon">
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
              </div>
              <div>
                <span className="settings-integration-name">{t.gmail}</span>
                <span className="settings-toggle-desc">
                  {gmailStatus?.gmailConnected
                    ? t.gmailConnected
                    : t.gmailDisconnected}
                </span>
              </div>
            </div>
            <div className="settings-integration-actions">
              {gmailStatus?.gmailConnected ? (
                <>
                  <span className="settings-integration-badge settings-integration-badge--connected">{t.connected}</span>
                  <button
                    className="settings-btn-primary"
                    onClick={handleScanGmail}
                    disabled={gmailLoading}
                  >
                    {gmailLoading ? t.scanning : t.scanGmail}
                  </button>
                </>
              ) : (
                <button
                  className="settings-btn-primary"
                  onClick={handleLinkGmail}
                  disabled={gmailLinkLoading}
                >
                  {gmailLinkLoading ? t.connecting : t.connectGoogleAccount}
                </button>
              )}
            </div>
          </div>
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
              <label className="settings-label">{t.theme}</label>
              <span className="settings-toggle-desc">{t.themeDesc}</span>
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
                  {t.light}
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
                  {t.dark}
                </div>
              </button>
            </div>

            <div className="settings-field" style={{ marginTop: 24 }}>
              <label className="settings-label">{t.language}</label>
              <span className="settings-toggle-desc">{t.languageDesc}</span>
            </div>
            <div className="settings-theme-options">
              <button
                className={`settings-theme-card ${lang === 'en' ? 'settings-theme-card--active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                <div className="settings-theme-preview settings-theme-preview--light" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                  EN
                </div>
                <div className="settings-theme-label">
                  <Globe size={16} />
                  English
                </div>
              </button>
              <button
                className={`settings-theme-card ${lang === 'zh' ? 'settings-theme-card--active' : ''}`}
                onClick={() => setLanguage('zh')}
              >
                <div className="settings-theme-preview settings-theme-preview--light" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                  中
                </div>
                <div className="settings-theme-label">
                  <Globe size={16} />
                  中文
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
