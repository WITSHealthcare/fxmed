// A patient's whole record written out as text, for the AI assistant on the
// patient record to answer questions from. Server-only: it reads the EMR with
// the service-role client after the route has checked the user's access.
//
// Sections run from the most to the least clinically important, each newest
// first, so a record too long to send whole loses its least important parts.

import type { SupabaseClient } from '@supabase/supabase-js'
import { ORDER_COLUMNS, REPORT_COLUMNS, mapOrderRow, mapReportRow, type InvestigationOrder, type InvestigationReport } from '@/lib/investigations'

const MAX_FIELD_CHARS = 6000
const MAX_RECORD_CHARS = 150_000

const day = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
const dayAndTime = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' })

function when(value: unknown, withTime = false) {
  if (!value) return 'date not recorded'
  // Plain dates (YYYY-MM-DD) are calendar days, not instants in UTC.
  const text = String(value)
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00Z` : text)
  return Number.isNaN(parsed.getTime()) ? text : (withTime ? dayAndTime : day).format(parsed)
}

const words = (value: unknown) => String(value || '').replace(/_/g, ' ')
function clip(value: unknown, max = MAX_FIELD_CHARS) {
  const text = String(value ?? '').trim()
  return text.length > max ? `${text.slice(0, max)} [shortened]` : text
}
const cell = (value: unknown) => clip(value, 400).replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ') || '—'
const money = (amount: unknown, currency = 'NGN') => {
  try { return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(Number(amount || 0)) }
  catch { return `${currency} ${Number(amount || 0).toFixed(2)}` }
}

function ageFrom(dob: string) {
  const birth = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return ''
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) years--
  return years >= 0 ? `${years} years` : ''
}

function section(title: string, lines: string[]) {
  return `\n## ${title}\n${lines.length ? lines.join('\n') : 'None recorded.'}\n`
}

export type PatientRecord = {
  patient: Record<string, any>
  staff: Record<string, string>
  encounters: any[]; notes: any[]; vitals: any[]; diagnoses: any[]; allergies: any[]; medications: any[]
  legacyOrders: any[]; legacyResults: any[]
  orders: InvestigationOrder[]; reports: InvestigationReport[]
  imaging: any[]; documents: any[]; carePlans: any[]; tasks: any[]; appointments: any[]; assessments: any[]
  bills: any[]; payments: any[]
}

// Clinicians are named by who they are, not by an id.
async function staffNames(database: SupabaseClient): Promise<Record<string, string>> {
  const { data, error } = await database.auth.admin.listUsers({ perPage: 1000 })
  if (error) { console.error('Patient record: could not list staff:', error.message); return {} }
  return Object.fromEntries((data?.users || []).map(member => [member.id, member.user_metadata?.full_name || member.email || 'Staff member']))
}

/** Loads everything on a patient's record. Returns null if there is no such patient. */
export async function loadPatientRecord(database: SupabaseClient, patientId: string): Promise<PatientRecord | null> {
  const newest = { ascending: false }
  const [patient, encounters, notes, vitals, diagnoses, allergies, medications, legacyOrders, legacyResults, orders, reports, imaging, documents, carePlans, tasks, appointments, assessments, bills, payments, staff] = await Promise.all([
    database.from('emr_patients').select('*').eq('id', patientId).maybeSingle(),
    database.from('emr_encounters').select('*').eq('patient_id', patientId).order('created_at', newest),
    database.from('emr_clinical_notes').select('*').eq('patient_id', patientId).order('created_at', newest),
    database.from('emr_vitals').select('*').eq('patient_id', patientId).order('recorded_at', newest).limit(40),
    database.from('emr_diagnoses').select('*').eq('patient_id', patientId).order('diagnosed_at', newest),
    database.from('emr_allergies').select('*').eq('patient_id', patientId).order('created_at', newest),
    database.from('emr_medications').select('*').eq('patient_id', patientId).order('created_at', newest),
    database.from('emr_investigation_orders').select('*').eq('patient_id', patientId).order('ordered_at', newest),
    database.from('emr_investigation_results').select('*').eq('patient_id', patientId).order('result_date', newest),
    database.from('investigation_forms').select(ORDER_COLUMNS).eq('emr_patient_id', patientId).order('created_at', newest),
    database.from('investigation_results').select(REPORT_COLUMNS).eq('emr_patient_id', patientId).order('created_at', newest),
    database.from('emr_imaging_records').select('*').eq('patient_id', patientId).order('created_at', newest),
    database.from('emr_documents').select('id,title,category,mime_type,notes,created_at').eq('patient_id', patientId).order('created_at', newest),
    database.from('emr_care_plans').select('*,items:emr_care_plan_items(*)').eq('patient_id', patientId).order('created_at', newest),
    database.from('emr_clinical_tasks').select('*,contacts:emr_task_contacts(*)').eq('patient_id', patientId).order('created_at', newest),
    database.from('appointments').select('*').eq('patient_id', patientId).order('preferred_date', newest),
    database.from('emr_health_assessments').select('*').eq('patient_id', patientId).order('submitted_at', newest),
    database.from('emr_financial_records').select('*').eq('patient_id', patientId).order('service_date', newest),
    database.from('emr_financial_payments').select('*').eq('patient_id', patientId).order('payment_date', newest),
    staffNames(database),
  ])
  if (patient.error) throw patient.error
  if (!patient.data) return null
  // A part of the record that fails to load is left out rather than failing
  // the answer; the gap is logged.
  const rows = (result: { data: any[] | null; error: any }, name: string) => {
    if (result.error) console.error(`Patient record: ${name} could not be loaded:`, result.error.message)
    return result.data || []
  }
  return {
    patient: patient.data,
    staff,
    encounters: rows(encounters, 'encounters'), notes: rows(notes, 'notes'), vitals: rows(vitals, 'vitals'),
    diagnoses: rows(diagnoses, 'diagnoses'), allergies: rows(allergies, 'allergies'), medications: rows(medications, 'medications'),
    legacyOrders: rows(legacyOrders, 'legacy orders'), legacyResults: rows(legacyResults, 'legacy results'),
    orders: rows(orders, 'investigation orders').map(mapOrderRow), reports: rows(reports, 'investigation results').map(mapReportRow),
    imaging: rows(imaging, 'imaging'), documents: rows(documents, 'documents'), carePlans: rows(carePlans, 'care plans'),
    tasks: rows(tasks, 'follow-ups'), appointments: rows(appointments, 'appointments'), assessments: rows(assessments, 'assessments'),
    bills: rows(bills, 'bills'), payments: rows(payments, 'payments'),
  }
}

export function patientFullName(patient: Record<string, any>) {
  return [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ')
}

/** The record as Markdown-style text, for a language model to read. */
export function patientRecordText(record: PatientRecord) {
  const { patient: p, staff } = record
  const by = (id: unknown) => (typeof id === 'string' && staff[id]) ? ` by ${staff[id]}` : ''
  const out: string[] = []

  out.push(`# Patient record: ${patientFullName(p)} (MRN ${p.mrn})`)

  out.push(section('Demographics', [
    `- Sex: ${words(p.sex) || 'not recorded'}; date of birth ${when(p.date_of_birth)}${ageFrom(p.date_of_birth) ? ` (${ageFrom(p.date_of_birth)})` : ''}`,
    `- Phone: ${p.phone || 'not recorded'}; email: ${p.email || 'not recorded'}`,
    `- Address: ${[p.address, p.city, p.state, p.country].filter(Boolean).join(', ') || 'not recorded'}`,
    `- Blood group: ${p.blood_group || 'not recorded'}; genotype: ${p.genotype || 'not recorded'}; marital status: ${words(p.marital_status) || 'not recorded'}; occupation: ${p.occupation || 'not recorded'}`,
    `- Emergency contact: ${[p.emergency_contact_name, p.emergency_contact_phone, p.emergency_contact_relationship && `(${words(p.emergency_contact_relationship)})`].filter(Boolean).join(' ') || 'not recorded'}`,
    `- Record status: ${words(p.status)}; registered ${when(p.created_at)}`,
  ]))

  out.push(section('Allergies', record.allergies.map(a =>
    `- ${a.allergen}${a.reaction ? `: ${a.reaction}` : ''} (severity ${words(a.severity)}, ${words(a.status)})${a.identified_at ? `, identified ${when(a.identified_at)}` : ''}${a.notes ? `. Notes: ${clip(a.notes, 1000)}` : ''}`)))

  out.push(section('Diagnoses', record.diagnoses.map(d =>
    `- ${d.diagnosis_name}${d.icd10_code ? ` [${d.icd10_code}]` : ''}: ${words(d.status)}, diagnosed ${when(d.diagnosed_at)}${by(d.provider_id)}${d.resolved_at ? `, resolved ${when(d.resolved_at)}` : ''}${d.notes ? `. Notes: ${clip(d.notes, 1000)}` : ''}`)))

  out.push(section('Medications', record.medications.map(m =>
    `- ${[m.medication_name, m.strength].filter(Boolean).join(' ')}${m.generic_name ? ` (${m.generic_name})` : ''}: ${[m.dose, words(m.route), m.frequency, m.duration && `for ${m.duration}`, m.quantity && `quantity ${m.quantity}`].filter(Boolean).join(', ')}. Status ${words(m.status)}; prescribed ${when(m.created_at)}${by(m.prescriber_id)}${m.start_date ? `, start ${when(m.start_date)}` : ''}${m.end_date ? `, end ${when(m.end_date)}` : ''}${m.discontinued_reason ? `. Discontinued because: ${m.discontinued_reason}` : ''}${m.instructions ? `. Instructions: ${clip(m.instructions, 1000)}` : ''}`)))

  out.push(section('Encounters (newest first)', record.encounters.map(e => {
    const fields = [
      ['Chief complaint', e.chief_complaint], ['History of presenting illness', e.history_presenting_illness],
      ['Past medical history', e.past_medical_history], ['Surgical history', e.surgical_history], ['Family history', e.family_history],
      ['Social history', e.social_history], ['Review of systems', e.review_of_systems], ['Examination', e.examination],
      ['Assessment', e.clinical_assessment], ['Plan', e.treatment_plan], ['Follow-up', e.follow_up_plan],
    ].filter(([, value]) => value).map(([label, value]) => `${label}: ${clip(value)}`)
    return `### ${when(e.started_at || e.created_at, true)}: ${words(e.encounter_type)} (${words(e.status)})${by(e.provider_id)} [${e.encounter_number}]\n${fields.join('\n') || 'No details recorded.'}`
  })))

  const amendments = record.notes.filter(n => n.parent_note_id)
  out.push(section('Clinical notes (newest first)', record.notes.filter(n => !n.parent_note_id).map(n => {
    const added = amendments.filter(a => a.parent_note_id === n.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return `### ${when(n.created_at, true)}: ${words(n.note_type)} note (${words(n.status)})${by(n.author_id)}\n${clip(n.content)}${added.map(a => `\nAmendment ${when(a.created_at, true)}${by(a.author_id)}: ${clip(a.content, 3000)}`).join('')}`
  })))

  out.push(section('Vital signs (newest first)', record.vitals.map(v => {
    const readings = [
      v.systolic_bp && v.diastolic_bp && `BP ${v.systolic_bp}/${v.diastolic_bp} mmHg`, v.heart_rate && `heart rate ${v.heart_rate} bpm`,
      v.respiratory_rate && `respiratory rate ${v.respiratory_rate}/min`, v.temperature_c && `temperature ${v.temperature_c}°C`,
      v.spo2 && `SpO2 ${v.spo2}%`, v.weight_kg && `weight ${v.weight_kg} kg`, v.height_cm && `height ${v.height_cm} cm`,
      v.bmi && `BMI ${v.bmi}`, v.blood_glucose && `blood glucose ${v.blood_glucose}`, v.pain_score !== null && v.pain_score !== undefined && `pain ${v.pain_score}/10`,
    ].filter(Boolean).join(', ')
    return `- ${when(v.recorded_at, true)}${by(v.recorded_by)}: ${readings || 'no readings'}${v.notes ? `. ${clip(v.notes, 1000)}` : ''}`
  })))

  const orderStatus = (status: InvestigationOrder['status']) => status === 'awaiting_results' ? 'awaiting results' : status === 'completed' ? 'results received' : status === 'cancelled' ? 'closed without results' : 'placed before results were tracked; results not recorded against it'
  out.push(section('Investigation orders (newest first)', [
    ...record.orders.map(o => `- ${when(o.createdAt)}: ${o.panelTitle}. Tests: ${o.tests.join(', ') || 'none listed'}. Status: ${orderStatus(o.status)}${o.requestingClinician ? `. Requested by ${o.requestingClinician}` : ''}${o.clinicalDetails ? `. Clinical details: ${clip(o.clinicalDetails, 2000)}` : ''}`),
    ...record.legacyOrders.map(o => `- ${when(o.ordered_at)}: ${o.test_name} (${o.category || 'uncategorised'}, ${o.priority}). Status: ${words(o.status)}${o.clinical_indication ? `. Indication: ${clip(o.clinical_indication, 2000)}` : ''}`),
  ]))

  const orderTitle = (id: string | null) => record.orders.find(o => o.id === id)?.panelTitle
  out.push(section('Investigation results (newest first)', [
    ...record.reports.map(r => {
      const meta = r.reportMeta
      const heading = `### Results saved ${when(r.updatedAt || r.createdAt)}: ${meta.reportTitle}${orderTitle(r.orderId) ? ` for the order "${orderTitle(r.orderId)}"` : ''}`
      const details = [meta.specimen && `specimen ${meta.specimen}`, meta.collectedAt && `collected ${meta.collectedAt}`, meta.reportedAt && `reported ${meta.reportedAt}`, meta.clinician && `requesting clinician ${meta.clinician}`].filter(Boolean).join('; ')
      const table = ['| Section | Test | Result | Unit | Reference range | Flag | Remark |', '| --- | --- | --- | --- | --- | --- | --- |',
        ...r.results.map(row => `| ${cell(row.section)} | ${cell(row.test)} | ${cell(row.result)} | ${cell(row.unit)} | ${cell(row.referenceRange)} | ${cell(row.flag)} | ${cell(row.remark)} |`)].join('\n')
      return `${heading}\n${details ? `${details}\n` : ''}${table}${meta.notes ? `\nClinical notes on these results: ${clip(meta.notes, 3000)}` : ''}`
    }),
    ...record.legacyResults.map(r => `- ${when(r.result_date)}: ${r.test_name}: ${r.result}${r.unit ? ` ${r.unit}` : ''} (reference ${r.reference_range || 'not given'})${r.abnormal_flag ? ` [${r.abnormal_flag}]` : ''}${r.performing_facility ? `, ${r.performing_facility}` : ''}${r.notes ? `. ${clip(r.notes, 1000)}` : ''}`),
  ]))

  out.push(section('Imaging', record.imaging.map(i =>
    `- ${when(i.performed_at || i.created_at)}: ${words(i.modality)}${i.body_region ? `, ${i.body_region}` : ''}. Indication: ${clip(i.indication, 1000) || 'not stated'}${i.report ? `. Report: ${clip(i.report, 4000)}` : ''}`)))

  out.push(section('Care plans', record.carePlans.map(c => {
    const items = (c.items || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      .map((item: any) => `\n  - ${item.title} (${words(item.status)}${item.due_date ? `, due ${when(item.due_date)}` : ''})${item.instructions ? `: ${clip(item.instructions, 800)}` : ''}`).join('')
    return `- ${c.title} (${words(c.status)}), created ${when(c.created_at)}${c.start_date ? `, starts ${when(c.start_date)}` : ''}${c.target_date ? `, target ${when(c.target_date)}` : ''}. Goals: ${clip(c.goals, 2000) || 'not stated'}${c.description ? `. Description: ${clip(c.description, 2000)}` : ''}${items}`
  })))

  out.push(section('Follow-ups', record.tasks.map(t => {
    const contacts = (t.contacts || []).sort((a: any, b: any) => new Date(a.contacted_at).getTime() - new Date(b.contacted_at).getTime())
      .map((c: any) => `\n  - Contact attempt ${when(c.contacted_at, true)}${by(c.contacted_by)}: ${words(c.channel)}, ${words(c.outcome)}${c.notes ? `. ${clip(c.notes, 600)}` : ''}${c.rescheduled_to ? `. Moved to ${when(c.rescheduled_to)}` : ''}`).join('')
    return `- ${t.title}: ${words(t.status)}, ${words(t.task_type)}, ${t.priority} priority${t.due_at ? `, due ${when(t.due_at)}` : ''}${by(t.assigned_to) ? `, assigned to ${staff[t.assigned_to]}` : ''}${t.completed_at ? `, closed ${when(t.completed_at)}` : ''}${t.outcome ? `. Outcome: ${clip(t.outcome, 1000)}` : ''}${contacts}`
  })))

  out.push(section('Appointments', record.appointments.map(a =>
    `- ${when(a.preferred_date)}${a.preferred_time ? ` at ${a.preferred_time}` : ''}: ${words(a.consultation_type)} (${words(a.status)})${a.symptoms ? `. Reason given: ${clip(a.symptoms, 1000)}` : ''}`)))

  out.push(section('Health assessments submitted', record.assessments.map(a =>
    `- ${when(a.submitted_at)}: ${words(a.source)} (${words(a.status)}). Answers: ${clip(JSON.stringify(a.assessment_data || {}), 4000)}${Array.isArray(a.recommendations) && a.recommendations.length ? `. Recommendations given: ${clip(JSON.stringify(a.recommendations), 2000)}` : ''}`)))

  out.push(section('Documents on file (titles only; their contents are not included here)', record.documents.map(d =>
    `- ${when(d.created_at)}: ${d.title} (${words(d.category)}${d.mime_type ? `, ${d.mime_type}` : ''})${d.notes ? `. Notes: ${clip(d.notes, 500)}` : ''}`)))

  out.push(section('Billing', record.bills.map(b => {
    const paid = record.payments.filter(pay => pay.financial_record_id === b.id)
    return `- ${when(b.service_date || b.created_at)}: ${b.description}. Billed ${money(b.amount_due, b.currency)}, paid ${money(b.amount_paid, b.currency)}, balance ${money(Number(b.amount_due || 0) - Number(b.amount_paid || 0), b.currency)} (${words(b.status)})${paid.length ? `; ${paid.length} payment${paid.length === 1 ? '' : 's'}, latest ${when(paid[0].payment_date)}` : ''}`
  })))

  const text = out.join('\n')
  return text.length > MAX_RECORD_CHARS
    ? `${text.slice(0, MAX_RECORD_CHARS)}\n\n[The record is very long and was cut short here. Anything after this point, including any later sections, is missing.]`
    : text
}
