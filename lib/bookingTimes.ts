// When telemedicine calls and home visits can be booked. Shared by the booking
// forms, the appointments API and Zara, so they always agree. The clinic runs
// on Lagos time (WAT, UTC+1 all year).

export type ConsultationType = 'telemedicine' | 'home-visit'

/** A day, or the hour starting at `time` on a day, that staff have closed to bookings. */
export type BookingClosure = { date: string; time: string | null }

/** Telemedicine calls run from 9am to 5pm. A call lasts 45 minutes, so the last one starts at 4pm. */
export const CALL_FIRST_START = 9 * 60
export const CALL_LAST_START = 16 * 60
/** Calls and visits must be booked at least this long before they start. */
export const NOTICE_HOURS = 24
/** The start times offered in the booking forms. */
export const BOOKING_TIMES: Record<ConsultationType, string[]> = {
  telemedicine: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'],
  'home-visit': ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
}
/** Every start time any booking form offers: the times staff can close. */
export const CLOSABLE_TIMES = BOOKING_TIMES['home-visit']
  .concat(BOOKING_TIMES.telemedicine)
  .filter((time, index, times) => times.indexOf(time) === index)
  .sort()

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
/** Calls and visits last 45 minutes. */
const BOOKING_MINUTES = 45
export const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const lagosDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' })
/** "2026-11-01", the date in Lagos. */
export const lagosToday = (now = Date.now()) => lagosDay.format(new Date(now))
const nextDay = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10)
const lagosLong = new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const noun = (type: ConsultationType) => type === 'telemedicine' ? 'call' : 'visit'

/** Minutes after midnight for "09:00", "9am", "2:30 PM" and the like; null when it is not a time. */
export function parseTime(value: string): number | null {
  const match = value.trim().toLowerCase().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*([ap])?\.?\s*m?\.?\s*(?:wat)?$/)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2] || 0)
  if (minute > 59) return null
  if (match[3]) {
    if (hour < 1 || hour > 12) return null
    hour = (hour % 12) + (match[3] === 'p' ? 12 : 0)
  } else if (hour > 23 || !match[2]) {
    // A bare number such as "10" is too vague to book.
    return null
  }
  return hour * 60 + minute
}

/** "14:00" for 2pm. */
export function clockTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** "2:00 PM" for "14:00"; anything that is not a time is returned as it is. */
export function displayTime(value: string) {
  const minutes = parseTime(value)
  if (minutes === null) return value
  const hour = Math.floor(minutes / 60)
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}

/** "Saturday, 1 November 2026" for "2026-11-01". */
export function displayDate(date: string) {
  return isDate(date) ? lagosLong.format(new Date(`${date}T12:00:00+01:00`)) : date
}

/** When a booking on this date and at this time starts, in milliseconds. */
export function bookingStart(date: string, time: string): number | null {
  const minutes = parseTime(time)
  if (minutes === null || !isDate(date)) return null
  return Date.parse(`${date}T${clockTime(minutes)}:00+01:00`)
}

/**
 * Whether a booking starting at this many minutes after midnight would fall on
 * a closed day or run into a closed hour.
 */
export function isClosed(closures: BookingClosure[], date: string, minutes: number) {
  return closures.some(closure => {
    if (closure.date !== date) return false
    if (!closure.time) return true
    const closedStart = parseTime(closure.time)
    return closedStart !== null && minutes < closedStart + 60 && minutes + BOOKING_MINUTES > closedStart
  })
}

/** The start times still open on a date. */
export function openTimes(type: ConsultationType, date: string, now = Date.now(), closures: BookingClosure[] = []) {
  if (!isDate(date)) return []
  return BOOKING_TIMES[type].filter(time =>
    (bookingStart(date, time) ?? 0) >= now + NOTICE_HOURS * HOUR_MS && !isClosed(closures, date, parseTime(time) ?? 0))
}

/** The first date on or after `from` with a start time still open, looking up to a year ahead. */
export function nextOpenDate(type: ConsultationType, from: string, now = Date.now(), closures: BookingClosure[] = []): string | null {
  if (!isDate(from)) return null
  let day = from
  for (let i = 0; i < 366; i++) {
    if (openTimes(type, day, now, closures).length) return day
    day = nextDay(day)
  }
  return null
}

/** The first date with a start time still open. */
export function firstOpenDate(type: ConsultationType, now = Date.now(), closures: BookingClosure[] = []) {
  return nextOpenDate(type, lagosToday(now + NOTICE_HOURS * HOUR_MS), now, closures)
}

/** "Saturday, 1 November 2026 at 9:00 AM", or null when nothing is open in the coming year. */
export function firstOpenTime(type: ConsultationType, now = Date.now(), closures: BookingClosure[] = []) {
  const day = firstOpenDate(type, now, closures)
  return day ? `${displayDate(day)} at ${displayTime(openTimes(type, day, now, closures)[0])}` : null
}

/** Why this date and time cannot be booked, or null when it can. */
export function bookingProblem(type: ConsultationType, date: string, time: string, now = Date.now(), closures: BookingClosure[] = []): string | null {
  const minutes = parseTime(time)
  if (minutes === null) return `Please choose a start time for the ${noun(type)}.`
  if (type === 'telemedicine' && (minutes < CALL_FIRST_START || minutes > CALL_LAST_START)) {
    return 'Telemedicine calls run from 9:00 AM to 5:00 PM (Lagos time), so please choose a start time between 9:00 AM and 4:00 PM.'
  }
  const start = bookingStart(date, time)
  if (start === null) return `Please choose a valid date for the ${noun(type)}.`
  if (start < now + NOTICE_HOURS * HOUR_MS) {
    const what = type === 'telemedicine' ? 'Telemedicine calls' : 'Home visits'
    const earliest = firstOpenTime(type, now, closures)
    return `${what} must be booked at least 24 hours ahead.${earliest ? ` The earliest time you can book is ${earliest}.` : ''}`
  }
  if (isClosed(closures, date, minutes)) {
    const open = openTimes(type, date, now, closures)
    if (open.length) return `${displayTime(time)} on ${displayDate(date)} is not available. Times still open that day: ${open.map(displayTime).join(', ')}.`
    const next = nextOpenDate(type, nextDay(date), now, closures)
    return `We are not taking ${noun(type)}s on ${displayDate(date)}.${next ? ` The next date you can book is ${displayDate(next)}.` : ''}`
  }
  return null
}

/** "Saturday, 1 November 2026: all day" and "…: 10:00 AM, 2:00 PM", one line per date. */
function describeClosures(closures: BookingClosure[]) {
  const byDate = new Map<string, string[] | 'all day'>()
  for (const closure of [...closures].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))) {
    const times = byDate.get(closure.date)
    if (times === 'all day') continue
    if (!closure.time) byDate.set(closure.date, 'all day')
    else byDate.set(closure.date, [...(times || []), displayTime(closure.time)])
  }
  return Array.from(byDate).map(([date, times]) => `${displayDate(date)}: ${times === 'all day' ? times : times.join(', ')}`)
}

/** The rules as Zara should explain them, with the current Lagos time and the closures over the next 60 days. */
export function bookingRulesForZara(now = Date.now(), closures: BookingClosure[] = []) {
  const current = new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(now))
  const today = lagosToday(now)
  const horizon = lagosToday(now + 60 * DAY_MS)
  const closed = describeClosures(closures.filter(closure => closure.date >= today && closure.date <= horizon))
  const earliest = (type: ConsultationType) => firstOpenTime(type, now, closures) ?? 'not available yet'
  return `## Booking rules
It is now ${current} in Lagos.
- Telemedicine calls can only be booked between 9:00 AM and 5:00 PM Lagos time, any day of the week. Each call lasts 45 minutes, so the last call starts at 4:00 PM.
- Telemedicine calls and home visits must both be booked at least 24 hours ahead. The earliest telemedicine call that can be booked is ${earliest('telemedicine')}, and the earliest home visit is ${earliest('home-visit')}.
- Agree a specific start time (such as 10:00 AM), not just morning or afternoon, and pass the date as YYYY-MM-DD.
- If the patient asks for a time outside these rules, explain kindly and offer the nearest time that works.${closed.length ? `
- Our team is not taking calls or visits at these times, so do not offer them:
${closed.map(line => `  - ${line}`).join('\n')}` : ''}`
}
