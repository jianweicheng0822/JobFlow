import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { deleteAccount } from '../api/auth'
import { getErrorMessage } from '../api/client'
import { isDemoMode } from '../api/mockData'
import { removeStoredAvatar } from '../utils/avatar'
import Modal from './Modal'

// Settings > Account. Asks for the password, or the email for accounts that never set one.
export default function DeleteAccountSection() {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  if (!user) return null
  // The demo user has no real password to type
  const byPassword = user.hasPassword && !isDemoMode()
  const ready = byPassword ? value.length > 0 : value.trim().toLowerCase() === user.email.toLowerCase()

  function close() {
    setOpen(false)
    setValue('')
    setError('')
  }

  async function handleDelete() {
    if (!user) return
    setDeleting(true)
    setError('')
    try {
      await deleteAccount(byPassword ? { password: value } : { confirmEmail: value.trim() })
      removeStoredAvatar(user.email)
      showToast(t.accountDeleted, 'success')
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, t.deleteAccountFailed))
      setDeleting(false)
    }
  }

  return (
    <div className="settings-danger">
      <h3 className="settings-danger-title">{t.deleteAccount}</h3>
      <p className="settings-danger-text">{t.deleteAccountDescription}</p>
      <div className="settings-actions settings-actions--start">
        <button className="settings-btn-danger" onClick={() => setOpen(true)}>
          {t.deleteAccount}
        </button>
      </div>

      {open && (
        <Modal title={t.deleteAccount} onClose={close}>
          <form
            className="app-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (ready && !deleting) handleDelete()
            }}
          >
            <p className="settings-danger-text">{t.deleteAccountWarning}</p>
            <div className="app-form-field">
              <label className="app-form-label" htmlFor="delete-account-confirm">
                {byPassword ? t.deleteAccountPasswordLabel : t.deleteAccountEmailLabel.replace('{email}', user.email)}
              </label>
              <input
                id="delete-account-confirm"
                className="app-form-input"
                type={byPassword ? 'password' : 'email'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoComplete={byPassword ? 'current-password' : 'off'}
                autoFocus
              />
            </div>
            {error && <span className="app-form-error">{error}</span>}
            <div className="app-form-actions">
              <button type="button" className="app-form-btn app-form-btn--cancel" onClick={close}>
                {t.cancel}
              </button>
              <button
                type="submit"
                className="app-form-btn app-form-btn--submit"
                style={{ background: 'var(--status-rejected)' }}
                disabled={!ready || deleting}
              >
                {deleting ? t.deleting : t.deleteAccountConfirm}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
