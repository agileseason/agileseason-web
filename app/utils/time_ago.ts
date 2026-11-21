// app/utils/timeAgo.ts
const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86400],
  ['month', 30 * 86400],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

// «2 часа назад», «вчера», «35 минут назад»
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000) // в прошлом — отрицательное
  if (Math.abs(seconds) < 60) return 'только что'
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.trunc(seconds / size), unit)
  }
  return 'только что'
}

// Сколько полных суток прошло с даты
export function daysSince(iso: string, now = Date.now()): number {
  return Math.floor((now - new Date(iso).getTime()) / 86400000)
}
