// Zones offered first in the interview form: the places JobFlow users most often
// interview with, in China and the US, plus a few hubs in between
export const COMMON_TIME_ZONES: { zone: string; en: string; zh: string }[] = [
  { zone: 'Asia/Shanghai', en: 'Beijing / Shanghai', zh: '北京 / 上海' },
  { zone: 'Asia/Hong_Kong', en: 'Hong Kong', zh: '香港' },
  { zone: 'Asia/Taipei', en: 'Taipei', zh: '台北' },
  { zone: 'Asia/Singapore', en: 'Singapore', zh: '新加坡' },
  { zone: 'Asia/Tokyo', en: 'Tokyo', zh: '东京' },
  { zone: 'Europe/London', en: 'London', zh: '伦敦' },
  { zone: 'Europe/Berlin', en: 'Berlin / Paris', zh: '柏林 / 巴黎' },
  { zone: 'America/New_York', en: 'New York (Eastern)', zh: '纽约（美东）' },
  { zone: 'America/Chicago', en: 'Chicago (Central)', zh: '芝加哥（美中）' },
  { zone: 'America/Denver', en: 'Denver (Mountain)', zh: '丹佛（山地时间）' },
  { zone: 'America/Los_Angeles', en: 'Los Angeles / Seattle (Pacific)', zh: '洛杉矶 / 西雅图（美西）' },
]

// Every IANA zone the browser knows; empty on very old browsers
export function allTimeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return []
  }
}
