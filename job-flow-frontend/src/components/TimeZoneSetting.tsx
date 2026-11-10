import { useState } from 'react'
import { Clock } from 'lucide-react'
import * as authApi from '../api/auth'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { browserTimeZone, localeFor } from '../utils/date'
import TimeZoneSelect from './TimeZoneSelect'

// Current time in a zone, e.g. "8:45 PM", so people can sanity-check their pick
function timeIn(zone: string, locale: string): string {
  try {
    return new Date().toLocaleTimeString(locale, { timeZone: zone, hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Settings > Profile: the zone the backend uses for "today", upcoming interviews
// and reminder timing. Set automatically on first sign-in; picking one saves it.
export default function TimeZoneSetting() {
  const { user, updateUser } = useAuth()
  const { t, lang } = useLanguage()
  const { showToast } = useToast()
  const deviceZone = browserTimeZone()
  const saved = user?.timeZone ?? null

  const [value, setValue] = useState(saved ?? '')
  const [saving, setSaving] = useState(false)

  async function save(zone: string) {
    if (!user || zone === saved) return
    setValue(zone)
    setSaving(true)
    try {
      const res = await authApi.updateTimeZone(zone)
      const updated = res.data.timeZone ?? zone
      updateUser({ ...user, timeZone: updated })
      setValue(updated)
      showToast(t.timeZoneUpdated, 'success')
    } catch (err) {
      setValue(saved ?? '')
      showToast(getErrorMessage(err, t.timeZoneUpdateFailed), 'error')
    } finally {
      setSaving(false)
    }
  }

  const locale = localeFor(lang)

  return (
    <div className="settings-timezone">
      <div className="settings-field">
        <label className="settings-label" htmlFor="settings-time-zone">{t.timeZone}</label>
        <span className="settings-toggle-desc">{t.timeZoneDesc}</span>
      </div>

      <TimeZoneSelect
        id="settings-time-zone"
        className="settings-input settings-timezone-select"
        value={value}
        onChange={save}
        disabled={saving}
        placeholder={t.timeZoneChoose}
      />

      <div className="settings-timezone-current">
        <Clock size={16} aria-hidden="true" />
        <span>{saved ? t.timeZoneNow.replace('{time}', timeIn(saved, locale)) : t.timeZoneNotSet}</span>
      </div>

      {deviceZone && deviceZone !== saved && (
        <div className="settings-timezone-hint">
          <span>{t.timeZoneMismatch.replace('{zone}', deviceZone)}</span>
          <button className="settings-btn-secondary" disabled={saving} onClick={() => save(deviceZone)}>
            {t.useDeviceTimeZone.replace('{zone}', deviceZone)}
          </button>
        </div>
      )}
    </div>
  )
}
