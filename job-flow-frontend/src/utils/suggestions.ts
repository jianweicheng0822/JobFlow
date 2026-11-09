import type { Language } from '../context/LanguageContext'

// Suggestion list for a form field: what the user typed before comes first,
// then the list for the app's language, then the other market's. Repeats are
// dropped, ignoring case.
export function mergeSuggestions(
  history: (string | null | undefined)[],
  lang: Language,
  lists: { en: string[]; zh: string[] },
): string[] {
  const ordered = [...history, ...(lang === 'zh' ? lists.zh : lists.en), ...(lang === 'zh' ? lists.en : lists.zh)]
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of ordered) {
    const value = item?.trim()
    if (!value || seen.has(value.toLowerCase())) continue
    seen.add(value.toLowerCase())
    out.push(value)
  }
  return out
}

// Matches the text itself or any of its aliases, ignoring case
export function matchesSuggestion(item: string, query: string, aliases?: Record<string, string[]>): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (item.toLowerCase().includes(q)) return true
  return aliases?.[item]?.some((alias) => alias.toLowerCase().includes(q)) ?? false
}
