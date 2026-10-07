import { useMemo, useState } from 'react'
import { Clock } from 'lucide-react'
import * as authApi from '../api/auth'
import { getErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { browserTimeZone } from '../utils/date'
import AutocompleteInput from './AutocompleteInput'

// Every IANA zone the browser knows; empty on very old browsers (then any typed id is sent)
function allTimeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return []
  }
}

// Current time in a zone, e.g. "8:45 PM", so people can sanity-check their pick
function timeIn(zone: string, locale: string): string {
  try {
    return new Date().toLocaleTimeString(locale, { timeZone: zone, hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Settings > Appearance: the zone the backend uses for "today", upcoming
// interviews and reminder timing. Set automatically on first sign-in.
export default function TimeZoneSetting() {
  const { user, updateUser } = useAuth()
  const { t, lang } = useLanguage()
  const { showToast } = useToast()
  const zones = useMemo(allTimeZones, [])
  const deviceZone = browserTimeZone()
  const saved = user?.timeZone ?? null

  const [input, setInput] = useState(saved ?? '')
  const [saving, setSaving] = useState(false)

  const picked = input.trim()
  const isKnownZone = zones.length === 0 ? picked !== '' : zones.includes(picked)
  const canSave = isKnownZone && picked !== saved && !saving

  async function save(zone: string) {
    if (!user) return
    setSaving(true)
    try {
      const res = await authApi.updateTimeZone(zone)
      const updated = res.data.timeZone ?? zone
      updateUser({ ...user, timeZone: updated })
      setInput(updated)
      showToast(t.timeZoneUpdated, 'success')
    } catch (err) {
      showToast(getErrorMessage(err, t.timeZoneUpdateFailed), 'error')
    } finally {
      setSaving(false)
    }
  }

  const locale = lang === 'zh' ? 'zh-CN' : 'en-US'

  return (
    <>
      <div className="settings-field" style={{ marginTop: 24 }}>
        <label className="settings-label">{t.timeZone}</label>
        <span className="settings-toggle-desc">{t.timeZoneDesc}</span>
      </div>

      <div className="settings-timezone-current">
        <Clock size={16} />
        {saved ? (
          <span>
            <strong>{saved}</strong> · {timeIn(saved, locale)}
          </span>
        ) : (
          <span>{t.timeZoneNotSet}</span>
        )}
      </div>

      <div className="settings-timezone-row">
        <AutocompleteInput
          value={input}
          onChange={setInput}
          suggestions={zones}
          placeholder={t.timeZoneSearch}
          className="settings-input"
        />
        <button className="settings-btn-primary" disabled={!canSave} onClick={() => save(picked)}>
          {saving ? t.saving : t.save}
        </button>
      </div>

      {deviceZone && deviceZone !== saved && (
        <div className="settings-timezone-hint">
          <span>{t.timeZoneMismatch.replace('{zone}', deviceZone)}</span>
          <button className="settings-btn-secondary" disabled={saving} onClick={() => save(deviceZone)}>
            {t.useDeviceTimeZone.replace('{zone}', deviceZone)}
          </button>
        </div>
      )}
    </>
  )
}
