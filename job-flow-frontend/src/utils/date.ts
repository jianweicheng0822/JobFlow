// Helpers for date-only values ("YYYY-MM-DD", like appliedDate).
//
// Don't use toISOString() or new Date("YYYY-MM-DD") for these: both work in UTC,
// so west of UTC "today" becomes tomorrow in the evening and a stored Oct 15
// shows up as Oct 14. Date-times without a zone ("2026-10-08T14:00:00") are
// already read as local time by new Date() and don't need these.

const pad = (n: number) => String(n).padStart(2, '0')

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
export function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Date(year, month - 1, day)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
