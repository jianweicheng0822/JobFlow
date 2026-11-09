import type { Language } from '../context/LanguageContext'

// Currencies the salary field offers. The text stays free-form ("150,000/yr",
// "30k×15"); this only says which money it is.
export const SALARY_CURRENCIES = [
  { code: 'CNY', symbol: '¥' },
  { code: 'USD', symbol: '$' },
] as const

const SYMBOLS: Record<string, string> = { USD: '$', CNY: '¥' }

// A guess for salaries saved before the currency could be picked: "$150,000" is USD
export function currencyFromText(salary: string | null | undefined): string | null {
  const text = salary?.trim() ?? ''
  if (text.startsWith('$')) return 'USD'
  if (/^[¥￥]/.test(text) || /^(RMB|CNY)/i.test(text) || /[元万]/.test(text)) return 'CNY'
  return null
}

// The currency the form starts on: what's saved, else what the text says,
// else the usual one for the app's language
export function defaultCurrency(salary: string | null | undefined, saved: string | null | undefined, lang: Language): string {
  return saved ?? currencyFromText(salary) ?? (lang === 'zh' ? 'CNY' : 'USD')
}

// "¥30k×15" for display; text that already names its money is left alone
export function formatSalary(salary: string | null | undefined, currency: string | null | undefined): string {
  const text = salary?.trim() ?? ''
  if (!text || !currency) return text
  if (/^[$¥￥€£]/.test(text) || /^[A-Z]{3}\b/.test(text)) return text
  const symbol = SYMBOLS[currency]
  return symbol ? `${symbol}${text}` : `${currency} ${text}`
}
