// Shared by the EMR API, the follow-up worklist and the notification bell, so
// "overdue" means the same thing everywhere. The clinic runs on Lagos time.

const lagosDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' })

export function lagosDate(value: Date | string = new Date()) {
  return lagosDay.format(new Date(value))
}

// A follow-up is due on a day rather than at a time, stored as 9am Lagos time.
export function followUpDueAt(day: string) {
  return `${day}T09:00:00+01:00`
}

// Accepts a date from a date picker or a full date-time, and returns the
// timestamp to store, or null when the value is not a date.
export function parseFollowUpDue(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return followUpDueAt(value)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

// Whole days from today until the due day; negative when overdue.
export function daysUntilDue(dueAt: string, today = lagosDate()) {
  return Math.round((Date.parse(`${lagosDate(dueAt)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
}

export function dueLabel(dueAt: string | null | undefined, today = lagosDate()) {
  if (!dueAt) return 'No due date'
  const days = daysUntilDue(dueAt, today)
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days === -1) return '1 day overdue'
  return days < 0 ? `${-days} days overdue` : `Due in ${days} days`
}

export const followUpTypes = ['follow_up', 'investigation', 'call', 'review', 'care_plan'] as const

export const contactChannels = [
  { value: 'call', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'In person' },
  { value: 'other', label: 'Other' },
] as const

export const contactOutcomes = [
  { value: 'reached', label: 'Reached the patient' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'left_message', label: 'Left a message' },
  { value: 'wrong_number', label: 'Wrong number' },
  { value: 'other', label: 'Other' },
] as const

// wa.me needs the number in international form without a plus. Nigerian
// numbers are often written locally, as 0803 123 4567.
export function whatsappNumber(phone: string | null | undefined) {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0') && digits.length === 11) return `234${digits.slice(1)}`
  return digits.length >= 10 ? digits : null
}

// The task title is written for staff, so the message to the patient is a
// neutral template they can edit in WhatsApp before sending.
export function reminderMessage(firstName: string | null | undefined, taskType: string) {
  const greeting = `Hello${firstName ? ` ${firstName}` : ''}, this is FXMed.`
  if (taskType === 'investigation') return `${greeting} We are checking in on the investigations we sent you. Have you been able to do them? Let us know if you need any help.`
  if (taskType === 'review') return `${greeting} It is time for your review. Please let us know when you are available.`
  return `${greeting} We are following up on your care. Please let us know a good time to talk.`
}
