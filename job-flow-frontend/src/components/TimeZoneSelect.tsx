import { useMemo } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { COMMON_TIME_ZONES, allTimeZones } from '../data/timeZones'
import { zoneAbbreviation } from '../utils/date'

interface TimeZoneSelectProps {
  id?: string
  className?: string
  value: string
  onChange: (zone: string) => void
  disabled?: boolean
  // Shown first with a prefix, e.g. "My time zone: Denver · MST"
  pinned?: { zone: string; prefix: string }
  // Shown when value is empty, e.g. before the first sign-in saved a zone
  placeholder?: string
}

/**
 * A time zone dropdown: common China / US zones first with readable names in both
 * languages, then every other zone the browser knows. Used by the interview form
 * and the Settings profile.
 */
export default function TimeZoneSelect({ id, className, value, onChange, disabled, pinned, placeholder }: TimeZoneSelectProps) {
  const { t, lang } = useLanguage()

  const label = (zone: string) => {
    const common = COMMON_TIME_ZONES.find((z) => z.zone === zone)
    const name = common ? common[lang] : zone.replace(/_/g, ' ')
    return `${name} · ${zoneAbbreviation(zone, lang)}`
  }

  const pinnedZone = pinned?.zone
  const commonZones = COMMON_TIME_ZONES.map((z) => z.zone).filter((z) => z !== pinnedZone)
  const otherZones = useMemo(() => {
    const shown = new Set([pinnedZone, ...COMMON_TIME_ZONES.map((z) => z.zone)])
    return allTimeZones().filter((z) => !shown.has(z))
  }, [pinnedZone])
  // A saved zone this browser doesn't list stays selectable
  const unlisted = value !== '' && value !== pinnedZone && !commonZones.includes(value) && !otherZones.includes(value)

  return (
    <select id={id} className={className} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {value === '' && placeholder && <option value="" disabled>{placeholder}</option>}
      {pinned && <option value={pinned.zone}>{pinned.prefix}{lang === 'zh' ? '：' : ': '}{label(pinned.zone)}</option>}
      {unlisted && <option value={value}>{label(value)}</option>}
      {commonZones.map((z) => (
        <option key={z} value={z}>{label(z)}</option>
      ))}
      {otherZones.length > 0 && (
        <optgroup label={t.allTimeZones}>
          {otherZones.map((z) => (
            <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>
          ))}
        </optgroup>
      )}
    </select>
  )
}
