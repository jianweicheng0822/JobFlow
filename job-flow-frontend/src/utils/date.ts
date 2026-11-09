// Date helpers, all in the user's time zone.
//
// Two kinds of values come through here:
// - Calendar dates ("YYYY-MM-DD", like appliedDate). They're the same day
//   everywhere, so they're built and formatted with plain local Dates. Don't use
//   toISOString() or new Date("YYYY-MM-DD") for them: both work in UTC, so west
//   of UTC "today" becomes tomorrow in the evening and Oct 15 shows as Oct 14.
// - Moments in time (interview start, createdAt). They're shown in the zone
//   saved in Settings, which can differ from the device's when travelling.

import type { Language } from '../context/LanguageContext'

const pad = (n: number) => String(n).padStart(2, '0')

// The zone from Settings, kept here so plain helpers can use it without every
// caller passing it along. AuthProvider sets it; null means the device's zone.
let appTimeZone: string | undefined

export function setAppTimeZone(zone: string | null | undefined): void {
  appTimeZone = zone && isValidTimeZone(zone) ? zone : undefined
}

// The zone dates are shown in right now (Settings, else the device's)
export function currentTimeZone(): string {
  return appTimeZone ?? browserTimeZone() ?? 'UTC'
}

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

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

// A local calendar Date as YYYY-MM-DD, for date math like "Monday 3 weeks ago"
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// The calendar day a moment falls on in `zone`, e.g. a 1 AM Beijing time
// interview is still "yesterday" in Los Angeles
function partsIn(moment: Date, zone: string | undefined) {
  // Intl throws on an invalid date; let it come out as NaN like plain Date math does
  if (Number.isNaN(moment.getTime())) return { date: dateKey(moment), time: 'NaN:NaN:NaN' }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(moment)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}:${get('second')}` }
}

// Today (or the day of `now`) in the user's zone, as YYYY-MM-DD
export function todayLocal(now: Date = new Date()): string {
  return partsIn(now, appTimeZone).date
}

// A moment as wall-clock time in `zone`: "2026-10-08T14:00:00"
export function wallClockIn(moment: Date, zone: string): string {
  const { date, time } = partsIn(moment, zone)
  return `${date}T${time}`
}

// "2026-10-15" -> "Oct 15, 2026", read as a calendar date
export function formatDateOnly(dateStr: string | null | undefined, lang: Language = 'en'): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Date(year, month - 1, day)
    .toLocaleDateString(localeFor(lang), { month: 'short', day: 'numeric', year: 'numeric' })
}

// Date part of a moment: "Oct 26, 2026" / "2026年10月26日"
export function formatDateOf(dateTime: string, lang: Language = 'en'): string {
  return new Date(dateTime).toLocaleDateString(localeFor(lang), { timeZone: appTimeZone, month: 'short', day: 'numeric', year: 'numeric' })
}

// A calendar Date as "Oct 26" / "10月26日"
export function formatMonthDay(date: Date, lang: Language = 'en'): string {
  return date.toLocaleDateString(localeFor(lang), { month: 'short', day: 'numeric' })
}

// A moment as "Oct 26" / "10月26日"
export function formatMonthDayOf(dateTime: string, lang: Language = 'en'): string {
  return new Date(dateTime).toLocaleDateString(localeFor(lang), { timeZone: appTimeZone, month: 'short', day: 'numeric' })
}

// Time part of a moment: "2:00 PM" / "14:00". Pass a zone to show it on
// someone else's clock, e.g. the company's.
export function formatTimeOf(dateTime: string, lang: Language = 'en', zone: string | undefined = appTimeZone): string {
  return new Date(dateTime).toLocaleTimeString(localeFor(lang), { timeZone: zone, hour: 'numeric', minute: '2-digit' })
}

// The wall-clock time "2026-11-10T10:00" on `zone`'s clock as a real moment.
// Guess with UTC, see how far off that is in the zone, correct, and check once
// more in case the correction crossed a DST change.
export function wallClockToInstant(wallClock: string, zone: string): Date {
  const [date, time = '00:00'] = wallClock.split('T')
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi, s = 0] = time.split(':').map(Number)
  const target = Date.UTC(y, mo - 1, d, h, mi, s)
  const asUtc = (moment: number) => {
    const { date: dd, time: tt } = partsIn(new Date(moment), zone)
    const [yy, mm, dy] = dd.split('-').map(Number)
    const [hh, mn, ss] = tt.split(':').map(Number)
    return Date.UTC(yy, mm - 1, dy, hh, mn, ss)
  }
  let guess = target - (asUtc(target) - target)
  guess -= asUtc(guess) - target
  return new Date(guess)
}

// When an interview starts. Older responses only had the wall-clock time.
export function interviewStart(iv: { startsAt?: string; interviewDate: string }): string {
  return iv.startsAt ?? iv.interviewDate
}

// "10:00 AM PDT" if the interview was booked on a clock that reads differently
// from the user's at that moment (say the company's), otherwise null
export function bookedTimeIfDifferent(
  iv: { startsAt?: string; interviewDate: string; timeZone?: string }, lang: Language = 'en',
): string | null {
  if (!iv.timeZone || !iv.startsAt || !isValidTimeZone(iv.timeZone)) return null
  const moment = new Date(iv.startsAt)
  if (wallClockIn(moment, iv.timeZone) === wallClockIn(moment, currentTimeZone())) return null
  return `${formatTimeOf(iv.startsAt, lang, iv.timeZone)} ${zoneAbbreviation(iv.timeZone, lang, moment)}`
}

// Short name for a zone at a moment: "PST", "GMT+8"
export function zoneAbbreviation(zone: string, lang: Language = 'en', at: Date = new Date()): string {
  const part = new Intl.DateTimeFormat(localeFor(lang), { timeZone: zone, timeZoneName: 'short' })
    .formatToParts(at).find((p) => p.type === 'timeZoneName')
  return part?.value ?? zone
}
