import { apiErrorText } from '../i18n/apiErrors'

// Turns the backend's error {code, params} into a sentence in the user's language.
// The backend still sends an English "message"; callers fall back to it whenever
// a code is missing or has no translation yet.

type Lang = 'en' | 'zh'

interface ApiErrorItem {
  code?: string
  params?: Record<string, unknown>
  message?: string
}

export interface ApiErrorBody extends ApiErrorItem {
  errors?: ApiErrorItem[]
}

// The language picked in the app (LanguageProvider keeps it in localStorage)
export function currentLanguage(): Lang {
  try {
    return localStorage.getItem('language') === 'zh' ? 'zh' : 'en'
  } catch {
    return 'en'
  }
}

// "items[0].gmailMessageId" -> "gmailMessageId", then its label if we have one
function fieldLabel(field: string, lang: Lang): string {
  const name = field.split('.').pop()!.replace(/\[\d+\]$/, '')
  const labels = apiErrorText[lang].fields
  return labels[name] ?? name
}

function translateOne(item: ApiErrorItem, lang: Lang): string | null {
  if (!item.code) return null
  const template = apiErrorText[lang].errors[item.code]
  if (!template) return null
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = item.params?.[key]
    if (value === undefined || value === null) return match
    return key === 'field' ? fieldLabel(String(value), lang) : String(value)
  })
}

// Translated message, or null when there's nothing to translate (caller falls back)
export function translateApiError(body: ApiErrorBody | null | undefined, lang: Lang = currentLanguage()): string | null {
  if (!body) return null
  if (body.errors && body.errors.length > 0) {
    // Several field errors: translate each, keeping the backend's text for any we can't
    const parts = body.errors.map((e) => translateOne(e, lang) ?? e.message).filter(Boolean) as string[]
    const unique = [...new Set(parts)]
    if (unique.length > 0) return unique.join(lang === 'zh' ? '；' : '; ')
  }
  return translateOne(body, lang)
}
