// Logo colors for company initials. Well-known names get their brand color;
// anything else gets a color picked from its name, so it stays the same on
// every page and every visit. No grays or reds here: gray means "rejected"
// and red means errors elsewhere in the app.
const BRAND_COLORS: Record<string, string> = {
  Google: '#4285F4',
  Spotify: '#1DB954',
  Meta: '#0668E1',
  Amazon: '#FF9900',
  Apple: '#1f2937',
  Netflix: '#B20710',
  Microsoft: '#00A4EF',
  Stripe: '#635BFF',
  Airbnb: '#FF5A5F',
  Shopify: '#5E8E3E',
  Datadog: '#632CA6',
  Figma: '#A259FF',
  Uber: '#111827',
  LinkedIn: '#0A66C2',
  Salesforce: '#00A1E0',
}

const FALLBACK_COLORS = ['#4f6ef7', '#0ea5e9', '#14b8a6', '#8b5cf6', '#ec4899', '#f97316', '#0891b2', '#a855f7']

export function companyColor(name: string): string {
  if (BRAND_COLORS[name]) return BRAND_COLORS[name]
  let hash = 0
  for (const ch of name.trim().toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length]
}
