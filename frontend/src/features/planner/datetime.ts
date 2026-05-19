import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export function toApiDateTime(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX")
}

export function toDateTimeLocalValue(iso: string, timeZone: string): string {
  return formatInTimeZone(iso, timeZone, "yyyy-MM-dd'T'HH:mm")
}

export function fromDateTimeLocalValue(value: string, timeZone: string): Date {
  return fromZonedTime(value, timeZone)
}

export function toApiDate(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, 'yyyy-MM-dd')
}

export function startOfWeekMonday(date: Date, timeZone: string): Date {
  const zoned = formatInTimeZone(date, timeZone, 'yyyy-MM-dd')
  const base = new Date(`${zoned}T12:00:00`)
  const day = base.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  base.setUTCDate(base.getUTCDate() + diff)
  return base
}
