import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cleanDate, cleanText, emrErrorMessage, getEmrContext, isUuid, writeEmrAudit } from '@/lib/emr'
import {
  addLagosDays, authorizationStatuses, openReferralStatuses, referralExpectedDays, referralLevels,
  referralStatusTimestamps, referralStatuses, referralUrgencies, unsuccessfulReferralStatuses, values,
} from '@/lib/coverage'
import { followUpDueAt, lagosDate } from '@/lib/follow-ups'

export const runtime = 'nodejs'

// Referrals to secondary, tertiary and specialist care, tracked from the
// letter being sent until the receiving facility's feedback comes back.
// See migration 038.

const PATIENT_COLUMNS = 'id,mrn,first_name,middle_name,last_name,phone,date_of_birth,sex'
// The details of the referral letter. Once it has been sent these are what
// the receiving facility has, so they are fixed.
const letterText: Record<string, number> = {
  receiving_facility: 240, receiving_specialty: 160, reason: 4000, clinical_summary: 12000,
  provisional_diagnosis: 400, icd10_code: 30, investigations_summary: 8000, treatment_given: 8000,
}
// Kept up to date while the referral is followed.
const trackingText: Record<string, number> = { receiving_contact: 240, authorization_code: 80, feedback: 12000, closed_reason: 2000 }

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function serverError(error: unknown) {
  console.error('EMR referrals error:', error)
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
  if (code === '42P01' || code === '42703' || emrErrorMessage(error).includes('migration')) return fail('The coverage and referrals migration (038) has not been applied yet.', 500)
  return fail(emrErrorMessage(error), 500)
}

function pick(value: unknown, allowed: string[]) {
  return typeof value === 'string' && allowed.includes(value) ? value : null
}

export async function GET(request: NextRequest) {
  const context = await getEmrContext(request, 'view_patients')
  if (!context) return fail('Clinical access required.', 403)
  const { database, user } = context
  const params = new URL(request.url).searchParams
  const patientId = params.get('patientId')

  try {
    if (patientId) {
      if (!isUuid(patientId)) return fail('A valid patient is required.')
      const { data, error } = await database.from('emr_referrals').select('*').eq('patient_id', patientId).order('created_at', { ascending: false })
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'view_referrals', entityType: 'emr_referrals', patientId })
      return NextResponse.json({ referrals: data || [] })
    }

    // The team worklist, and how referrals made in the period turned out.
    const days = Math.min(365, Math.max(7, Number(params.get('days')) || 90))
    const since = new Date(Date.now() - days * 86_400_000).toISOString()
    const [open, recent] = await Promise.all([
      database.from('emr_referrals').select(`*,patient:emr_patients(${PATIENT_COLUMNS})`).in('status', ['draft', ...openReferralStatuses]).order('expected_by', { ascending: true, nullsFirst: false }).limit(500),
      database.from('emr_referrals').select(`*,patient:emr_patients(${PATIENT_COLUMNS})`).gte('created_at', since).order('created_at', { ascending: false }).limit(1000),
    ])
    if (open.error || recent.error) throw open.error || recent.error
    await writeEmrAudit(database, user, { action: 'view_referral_worklist', entityType: 'emr_referrals' })
    return NextResponse.json({ open: open.data || [], recent: recent.data || [], summary: summarise(recent.data || []), days })
  } catch (error) {
    return serverError(error)
  }
}

// Completion counts referrals the patient is known to have attended,
// against every referral that was actually sent.
function summarise(referrals: any[]) {
  const sent = referrals.filter(item => item.sent_at)
  const attended = sent.filter(item => item.attended_at || item.status === 'completed')
  const daysToAttend = attended.filter(item => item.attended_at).map(item => (Date.parse(item.attended_at) - Date.parse(item.sent_at)) / 86_400_000)
  const today = lagosDate()
  return {
    sent: sent.length,
    attended: attended.length,
    feedbackReceived: sent.filter(item => item.feedback_received_at).length,
    unsuccessful: sent.filter(item => unsuccessfulReferralStatuses.includes(item.status)).length,
    open: sent.filter(item => openReferralStatuses.includes(item.status)).length,
    overdue: sent.filter(item => openReferralStatuses.includes(item.status) && item.status !== 'attended' && item.expected_by && item.expected_by < today).length,
    emergency: sent.filter(item => item.urgency === 'emergency').length,
    completionRate: sent.length ? Math.round((attended.length / sent.length) * 100) : null,
    medianDaysToAttend: daysToAttend.length ? Number(median(daysToAttend).toFixed(1)) : null,
  }
}

function median(numbers: number[]) {
  const sorted = [...numbers].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export async function POST(request: NextRequest) {
  const context = await getEmrContext(request, 'manage_referrals')
  if (!context) return fail('Referral access required.', 403)
  const { database, user } = context
  const body = await request.json().catch(() => null) as Record<string, any> | null
  if (!body || !isUuid(body.patient_id)) return fail('A valid patient is required.')

  try {
    const { data: patient } = await database.from('emr_patients').select('id').eq('id', body.patient_id).maybeSingle()
    if (!patient) return fail('A valid patient is required.')
    const record: Record<string, unknown> = {
      patient_id: body.patient_id,
      encounter_id: isUuid(body.encounter_id) ? body.encounter_id : null,
      referring_provider_id: user.id,
      referral_level: pick(body.referral_level, values(referralLevels)) || 'secondary',
      urgency: pick(body.urgency, values(referralUrgencies)) || 'routine',
      authorization_status: pick(body.authorization_status, values(authorizationStatuses)) || 'not_required',
      authorization_code: cleanText(body.authorization_code, 80),
      receiving_contact: cleanText(body.receiving_contact, 240),
      status: 'draft',
    }
    for (const [field, max] of Object.entries(letterText)) record[field] = cleanText(body[field], max)
    if (!record.receiving_facility || !record.reason) return fail('Enter the receiving facility and the reason for referral.')
    // Checked before saving, so a refused send does not leave a stray draft
    // behind for every retry.
    const sendError = body.send === true && sendBlocker(record)
    if (sendError) return fail(sendError)
    const coverageError = await attachCoverage(database, record, body.coverage_id)
    if (coverageError) return coverageError

    const { data, error } = await database.from('emr_referrals').insert(record).select('*').single()
    if (error) throw error
    await writeEmrAudit(database, user, { action: 'create_referral', entityType: 'emr_referrals', entityId: data.id, patientId: data.patient_id, metadata: { urgency: data.urgency, level: data.referral_level } })
    if (body.send === true) return transition(database, user, data, { status: 'sent', expected_by: body.expected_by }, 201)
    return NextResponse.json({ record: data }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}

export async function PATCH(request: NextRequest) {
  const context = await getEmrContext(request, 'manage_referrals')
  if (!context) return fail('Referral access required.', 403)
  const { database, user } = context
  const body = await request.json().catch(() => null) as Record<string, any> | null
  if (!body || !isUuid(body.id)) return fail('A valid referral is required.')

  try {
    const { data: referral, error } = await database.from('emr_referrals').select('*').eq('id', body.id).maybeSingle()
    if (error) throw error
    if (!referral) return fail('Referral not found.', 404)
    return transition(database, user, referral, body)
  } catch (error) {
    return serverError(error)
  }
}

// An insured referral goes out once the HMO or scheme has authorised it.
// Emergencies are transferred first and authorised afterwards.
function sendBlocker(referral: Record<string, any>) {
  if (referral.authorization_status === 'requested' && referral.urgency !== 'emergency') return 'The HMO authorisation is still pending. Record the authorisation code before sending, or mark it not required.'
  if (referral.authorization_status === 'approved' && !referral.authorization_code) return 'Enter the authorisation code the HMO or scheme gave.'
  return null
}

// Only a cover belonging to the same patient can be referred under.
async function attachCoverage(database: SupabaseClient, record: Record<string, unknown>, coverageId: unknown) {
  if (!coverageId) { record.coverage_id = null; return null }
  if (!isUuid(coverageId)) return fail('Choose a valid coverage record.')
  const { data } = await database.from('emr_patient_coverage').select('id,patient_id').eq('id', coverageId).maybeSingle()
  if (!data || data.patient_id !== record.patient_id) return fail('The selected coverage does not belong to this patient.')
  record.coverage_id = coverageId
  return null
}

async function transition(database: SupabaseClient, user: any, referral: any, body: Record<string, any>, successStatus = 200) {
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { updated_at: now }
  const isDraft = referral.status === 'draft'

  for (const [field, max] of Object.entries(trackingText)) if (field in body) updates[field] = cleanText(body[field], max)
  if ('authorization_status' in body) updates.authorization_status = pick(body.authorization_status, values(authorizationStatuses)) || referral.authorization_status
  if ('expected_by' in body && body.expected_by) updates.expected_by = cleanDate(body.expected_by)
  if (isDraft) {
    for (const [field, max] of Object.entries(letterText)) if (field in body) updates[field] = cleanText(body[field], max)
    if ('referral_level' in body) updates.referral_level = pick(body.referral_level, values(referralLevels)) || referral.referral_level
    if ('urgency' in body) updates.urgency = pick(body.urgency, values(referralUrgencies)) || referral.urgency
    if ('encounter_id' in body) updates.encounter_id = isUuid(body.encounter_id) ? body.encounter_id : null
    if ('coverage_id' in body) {
      const coverageError = await attachCoverage(database, { ...updates, patient_id: referral.patient_id }, body.coverage_id)
      if (coverageError) return coverageError
      updates.coverage_id = body.coverage_id || null
    }
    if (updates.receiving_facility === null || updates.reason === null) return fail('Enter the receiving facility and the reason for referral.')
  } else if (Object.keys(letterText).some(field => field in body && cleanText(body[field], letterText[field]) !== referral[field])) {
    return fail('This referral has been sent, so its letter can no longer be changed. Record what changed in the feedback, or cancel it and make a new referral.')
  }

  const status = 'status' in body ? pick(body.status, values(referralStatuses)) : null
  if ('status' in body && !status) return fail('Unknown referral status.')
  const merged = { ...referral, ...updates }
  if (status && status !== referral.status) {
    if (status === 'draft') return fail('A sent referral cannot go back to draft.')
    if (isDraft && status !== 'sent' && status !== 'cancelled') return fail('Send the referral before recording what happened to it.')
    if (!isDraft && ['completed', ...unsuccessfulReferralStatuses].includes(referral.status)) return fail('This referral is closed. Make a new referral if the patient needs to be referred again.')
    const authorizationError = (status === 'sent' || merged.authorization_status === 'approved') && sendBlocker(merged)
    if (authorizationError) return fail(authorizationError)
    if (unsuccessfulReferralStatuses.includes(status) && !merged.closed_reason) return fail('Note why the referral ended without the patient being seen.')
    if (status === 'completed' && !merged.feedback) return fail('Record the receiving facility’s feedback before marking the referral complete.')
    updates.status = status
    const stamp = referralStatusTimestamps[status]
    if (stamp) updates[stamp] = now
    if (status === 'sent' && !merged.expected_by) updates.expected_by = addLagosDays(referralExpectedDays[merged.urgency] ?? 14)
    // Reaching a later step implies the earlier ones.
    if (status === 'completed') { updates.attended_at = referral.attended_at || now; updates.feedback_received_at = referral.feedback_received_at || now }
  } else if ('feedback' in updates && updates.feedback && !referral.feedback_received_at) {
    updates.feedback_received_at = now
  }

  const { data, error } = await database.from('emr_referrals').update(updates).eq('id', referral.id).select('*').single()
  if (error) throw error

  let warning: string | undefined
  if (status && status !== referral.status) {
    warning = await syncReferralFollowUp(database, user, data)
    await writeEmrAudit(database, user, { action: `referral_${status}`, entityType: 'emr_referrals', entityId: data.id, patientId: data.patient_id, metadata: { from: referral.status, to: status } })
  } else {
    await writeEmrAudit(database, user, { action: 'update_referral', entityType: 'emr_referrals', entityId: data.id, patientId: data.patient_id, metadata: { fields: Object.keys(updates).filter(key => key !== 'updated_at') } })
  }
  return NextResponse.json({ record: data, warning }, { status: successStatus })
}

// A sent referral has a follow-up to confirm the patient was seen; it closes
// once they have been, or the referral ends. The referral is already saved,
// so a failure here is reported rather than thrown.
async function syncReferralFollowUp(database: SupabaseClient, user: any, referral: any) {
  const priority = referral.urgency === 'emergency' ? 'stat' : referral.urgency === 'urgent' ? 'urgent' : 'routine'
  if (referral.status === 'sent') {
    const { error } = await database.from('emr_clinical_tasks').insert({
      patient_id: referral.patient_id, encounter_id: referral.encounter_id, referral_id: referral.id,
      title: `Confirm the patient attended their referral to ${referral.receiving_facility}`,
      task_type: 'referral', priority, status: 'pending', assigned_to: user.id,
      due_at: followUpDueAt(referral.expected_by || lagosDate()), created_by: user.id,
    })
    if (error) { console.error('EMR: referral follow-up not created:', error); return 'The referral was sent, but its follow-up could not be created. Add one from the patient’s Follow-ups tab.' }
    return undefined
  }
  if (referral.status === 'accepted') return undefined
  const success = referral.status === 'attended' || referral.status === 'completed'
  const { error } = await database.from('emr_clinical_tasks').update({
    status: success ? 'completed' : 'cancelled', completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    outcome: success ? 'Patient attended the referral.' : `Referral ${referral.status.replace(/_/g, ' ')}: ${referral.closed_reason || ''}`.trim(),
  }).eq('referral_id', referral.id).in('status', ['pending', 'in_progress'])
  if (error) { console.error('EMR: referral follow-up not closed:', error); return 'The referral was updated, but its follow-up could not be closed. Close it from the Follow-ups list.' }
  return undefined
}
