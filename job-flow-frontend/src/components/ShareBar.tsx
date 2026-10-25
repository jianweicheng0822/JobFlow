import { useLanguage } from '../context/LanguageContext'
import './ShareBar.css'

// Below this, a share like "50%" is mostly noise and can look alarming
export const MIN_APPS_FOR_SHARE = 5

interface ShareBarProps {
  count: number
  total: number
  color: string
}

// How much of the whole one group is: a bar plus "20% of all applications".
// With only a few applications it shows a short hint instead of a percentage.
export default function ShareBar({ count, total, color }: ShareBarProps) {
  const { t } = useLanguage()

  if (total < MIN_APPS_FOR_SHARE) {
    return <div className="share-bar-caption">{t.shareNeedsMore.replace('{n}', String(MIN_APPS_FOR_SHARE))}</div>
  }

  const percent = Math.round((count / total) * 100)
  return (
    <div className="share-bar">
      <div
        className="share-bar-track"
        style={{ background: `color-mix(in srgb, ${color} 18%, var(--card-bg))` }}
        aria-hidden="true"
      >
        <div className="share-bar-fill" style={{ width: `${percent}%`, background: color }} />
      </div>
      <div className="share-bar-caption">{t.shareOfAll.replace('{percent}', String(percent))}</div>
    </div>
  )
}
