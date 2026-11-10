// Medical outreach attendees: shared by the EMR Outreaches view and its API.
// Client-safe: no server imports.
import { formatAnswerText, type FormAnswers, type FormDefinition } from './forms'

export type OutreachStatus = 'awaiting_vitals' | 'signed_off' | 'booked' | 'no_follow_up' | 'left'
export const outreachStatuses: { value: OutreachStatus; label: string }[] = [
  { value: 'awaiting_vitals', label: 'Awaiting vitals' }, { value: 'signed_off', label: 'Signed off' },
  { value: 'booked', label: 'Follow-up booked' }, { value: 'no_follow_up', label: 'No follow-up' }, { value: 'left', label: 'Left early' },
]

// The vital signs a health worker logs, with the ranges migration 044 accepts.
export const vitalFields = [
  { name: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg', min: 40, max: 300, integer: true },
  { name: 'diastolic_bp', label: 'Diastolic BP', unit: 'mmHg', min: 20, max: 200, integer: true },
  { name: 'heart_rate', label: 'Pulse', unit: 'bpm', min: 20, max: 250, integer: true },
  { name: 'temperature_c', label: 'Temperature', unit: '°C', min: 30, max: 45 },
  { name: 'spo2', label: 'Oxygen saturation', unit: '%', min: 50, max: 100, integer: true },
  { name: 'weight_kg', label: 'Weight', unit: 'kg', min: 1, max: 400 },
  { name: 'height_cm', label: 'Height', unit: 'cm', min: 30, max: 250 },
  { name: 'waist_cm', label: 'Waist', unit: 'cm', min: 20, max: 250 },
  { name: 'blood_glucose', label: 'Blood glucose', unit: '', min: 0.1, max: 2000 },
] as const
export type VitalName = typeof vitalFields[number]['name']
export type OutreachVitals = Partial<Record<VitalName, number | null>> & {
  glucose_unit?: 'mg/dL' | 'mmol/L'; glucose_timing?: 'fasting' | 'random' | null; bmi?: number | null; vitals_notes?: string | null
}

export type OutreachAttendee = OutreachVitals & {
  id: string; form_id: string; form_response_id: string; full_name: string; phone: string | null; email: string | null
  date_of_birth: string | null; sex: string | null; address: string | null; status: OutreachStatus
  recorded_by: string | null; recorded_at: string | null; signed_by: string | null; signed_at: string | null
  patient_id: string | null; appointment_id: string | null; promoted_at: string | null; created_at: string
  // Added by the API:
  answers?: FormAnswers; follow_up_wish?: FollowUpWish | null; recorder?: string | null; signer?: string | null
  duplicates?: { id: string; mrn: string; first_name: string; last_name: string; date_of_birth: string | null; phone: string | null }[]
  patient_mrn?: string | null
}

// Readings that need the outreach lead straight away.
export function outreachAlerts(v: OutreachVitals) {
  const alerts: string[] = []
  if ((v.systolic_bp ?? 0) >= 180 || (v.diastolic_bp ?? 0) >= 120) alerts.push(`Blood pressure ${v.systolic_bp ?? '?'}/${v.diastolic_bp ?? '?'} is in the crisis range (180/120 or higher).`)
  if (v.blood_glucose != null) {
    const mgdl = v.glucose_unit === 'mmol/L' ? v.blood_glucose * 18 : v.blood_glucose
    if (mgdl < 70) alerts.push('Blood glucose is low (below 70 mg/dL, 3.9 mmol/L).')
    if (mgdl > 300) alerts.push('Blood glucose is very high (above 300 mg/dL, 16.7 mmol/L).')
  }
  if (v.spo2 != null && v.spo2 < 92) alerts.push(`Oxygen saturation ${v.spo2}% is below 92%.`)
  if (v.temperature_c != null && v.temperature_c >= 38) alerts.push(`Temperature ${v.temperature_c} °C is a fever (38 °C or higher).`)
  return alerts
}

// Out of range but not urgent: worth mentioning when offering a follow-up.
export function outreachConcerns(v: OutreachVitals) {
  const concerns: string[] = []
  if ((v.systolic_bp ?? 0) >= 140 || (v.diastolic_bp ?? 0) >= 90) concerns.push('Raised blood pressure')
  if (v.blood_glucose != null) { const mgdl = v.glucose_unit === 'mmol/L' ? v.blood_glucose * 18 : v.blood_glucose; if (mgdl >= (v.glucose_timing === 'fasting' ? 126 : 200)) concerns.push('Raised blood glucose') }
  if (v.bmi != null && v.bmi >= 30) concerns.push('BMI 30 or more')
  return concerns
}

export type FollowUpWish = 'home-visit' | 'telemedicine' | 'call' | 'not_now'
// The attendee's answer to the form's follow-up question, recognised by its wording.
export function followUpWish(definition: FormDefinition, answers: FormAnswers): FollowUpWish | null {
  for (const q of definition.questions) {
    if (q.type !== 'single_choice' && q.type !== 'dropdown') continue
    if (!q.options.some((o) => /home visit|telehealth|telemedicine/i.test(o))) continue
    const answer = answers[q.id]; if (typeof answer !== 'string') return null
    if (/home visit/i.test(answer)) return 'home-visit'
    if (/telehealth|telemedicine|video/i.test(answer)) return 'telemedicine'
    if (/call me|explain/i.test(answer)) return 'call'
    return 'not_now'
  }
  return null
}
export const followUpWishLabels: Record<FollowUpWish, string> = { 'home-visit': 'Wants a home visit', telemedicine: 'Wants telehealth', call: 'Call to explain options', not_now: 'Not right now' }

// The intake note written into the chart when a follow-up is booked: every
// answered question by section, leaving out details already on the patient record.
export function intakeNote(title: string, definition: FormDefinition, answers: FormAnswers, submittedAt: string) {
  const blocks: { heading: string; lines: string[] }[] = [{ heading: '', lines: [] }]
  for (const q of definition.questions) {
    if (q.type === 'section') { blocks.push({ heading: q.label, lines: [] }); continue }
    if (q.patientField || answers[q.id] === undefined) continue
    blocks[blocks.length - 1].lines.push(`${q.label}: ${formatAnswerText(answers[q.id], q)}`)
  }
  const registered = new Date(submittedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' })
  return [`Outreach intake: ${title}`, `Registered ${registered}.`, ...blocks.filter((b) => b.lines.length).map((b) => [b.heading && `\n${b.heading.toUpperCase()}`, ...b.lines].filter(Boolean).join('\n'))].join('\n')
}

export function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  return parts.length < 2 ? { first: parts[0] || '', last: '' } : { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] }
}
