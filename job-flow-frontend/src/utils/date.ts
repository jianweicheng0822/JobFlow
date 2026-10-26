// Helpers for date-only values ("YYYY-MM-DD", like appliedDate).
//
// Don't use toISOString() or new Date("YYYY-MM-DD") for these: both work in UTC,
// so west of UTC "today" becomes tomorrow in the evening and a stored Oct 15
// shows up as Oct 14. Date-times without a zone ("2026-10-08T14:00:00") are
// already read as local time by new Date() and don't need these.

import type { Language } from '../context/LanguageContext'

const pad = (n: number) => String(n).padStart(2, '0')

// Browser locale for the app language: "Oct 15, 2026" vs "2026年10月15日"
export function localeFor(lang: Language): string {
  return lang === 'zh' ? 'zh-CN' : 'en-US'
}

// The device's IANA time zone, e.g. "America/Denver" (null if the browser won't say)
export function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

// Today's date in the user's own timezone, as YYYY-MM-DD
export function todayLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// "2026-10-15" -> "Oct 15, 2026", read as a local calendar date
export function formatDateOnly(dateStr: string | null | undefined, lang: Language = 'en'): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Date(year, month - 1, day)
    .toLocaleDateString(localeFor(lang), { month: 'short', day: 'numeric', year: 'numeric' })
}

// Date part of a date-time: "Oct 26, 2026" / "2026年10月26日"
export function formatDateOf(dateTime: string, lang: Language = 'en'): string {
  return new Date(dateTime).toLocaleDateString(localeFor(lang), { month: 'short', day: 'numeric', year: 'numeric' })
}

// "Oct 26" / "10月26日"
export function formatMonthDay(date: Date, lang: Language = 'en'): string {
  return date.toLocaleDateString(localeFor(lang), { month: 'short', day: 'numeric' })
}

// Time part of a date-time: "2:00 PM" / "14:00"
export function formatTimeOf(dateTime: string, lang: Language = 'en'): string {
  return new Date(dateTime).toLocaleTimeString(localeFor(lang), { hour: 'numeric', minute: '2-digit' })
}
