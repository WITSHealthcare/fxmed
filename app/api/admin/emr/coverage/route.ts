import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cleanDate, cleanText, emrErrorMessage, getEmrContext, isUuid, writeEmrAudit } from '@/lib/emr'
import { coverageSchemes, membershipTypes, values, verificationMethods, verificationOutcomes } from '@/lib/coverage'

export const runtime = 'nodejs'

// A patient's health insurance cover and the eligibility checks made on it.
// See migration 038.

const editableText: Record<string, number> = {
  scheme_name: 160, enrollee_id: 60, hmo_name: 160, primary_facility: 240,
  benefit_package: 160, principal_enrollee_id: 60, notes: 2000,
}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function serverError(error: unknown) {
  console.error('EMR coverage error:', error)
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
  if (code === '42P01' || emrErrorMessage(error).includes('migration')) return fail('The coverage and referrals migration (038) has not been applied yet.', 500)
  if (code === '23505') return fail('Another active patient record already holds this enrollee number under the same scheme. Check for a duplicate record before continuing.', 409)
  if (code === '23514') return fail('Coverage end date cannot be before its start date.')
  return fail(emrErrorMessage(error), 500)
}

async function patientExists(database: SupabaseClient, patientId: unknown) {
  if (!isUuid(patientId)) return false
  const { data } = await database.from('emr_patients').select('id').eq('id', patientId).maybeSingle()
  return Boolean(data)
}

function pick(value: unknown, allowed: string[]) {
  return typeof value === 'string' && allowed.includes(value) ? value : null
}

// Enrollee numbers are compared without regard to case or stray spaces.
function enrolleeId(value: unknown) {
  return cleanText(value, 60)?.replace(/\s+/g, '').toUpperCase() || null
}

function coverageFields(body: Record<string, any>, partial: boolean) {
  const record: Record<string, unknown> = {}
  for (const [field, max] of Object.entries(editableText)) {
    if (partial && !(field in body)) continue
    record[field] = field.endsWith('enrollee_id') ? enrolleeId(body[field]) : cleanText(body[field], max)
  }
  if (!partial || 'scheme' in body) record.scheme = pick(body.scheme, values(coverageSchemes))
  if (!partial || 'membership_type' in body) record.membership_type = pick(body.membership_type, values(membershipTypes)) || 'principal'
  if (!partial || 'coverage_start' in body) record.coverage_start = cleanDate(body.coverage_start)
  if (!partial || 'coverage_end' in body) record.coverage_end = cleanDate(body.coverage_end)
  if ('status' in body) record.status = pick(body.status, ['active', 'inactive']) || 'active'
  return record
}

export async function GET(request: NextRequest) {
  const context = await getEmrContext(request, 'view_patients')
  if (!context) return fail('Clinical access required.', 403)
  const { database, user } = context
  const patientId = new URL(request.url).searchParams.get('patientId')
  if (!isUuid(patientId)) return fail('A valid patient is required.')
  try {
    const [coverage, verifications] = await Promise.all([
      database.from('emr_patient_coverage').select('*').eq('patient_id', patientId).order('status').order('created_at', { ascending: false }),
      database.from('emr_coverage_verifications').select('*').eq('patient_id', patientId).order('verified_at', { ascending: false }).limit(100),
    ])
    if (coverage.error || verifications.error) throw coverage.error || verifications.error
    await writeEmrAudit(database, user, { action: 'view_coverage', entityType: 'emr_patient_coverage', patientId })
    return NextResponse.json({ coverage: coverage.data || [], verifications: verifications.data || [] })
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(request: NextRequest) {
  const context = await getEmrContext(request, 'manage_coverage')
  if (!context) return fail('Coverage access required.', 403)
  const { database, user } = context
  const body = await request.json().catch(() => null) as Record<string, any> | null
  if (!body) return fail('A coverage request is required.')

  try {
    if (body.action === 'verify') return verify(database, user, body)

    if (!await patientExists(database, body.patient_id)) return fail('A valid patient is required.')
    const record: Record<string, unknown> = { ...coverageFields(body, false), patient_id: body.patient_id, status: 'active', created_by: user.id }
    if (!record.scheme) return fail('Choose the scheme the patient is covered by.')
    if (!record.enrollee_id) return fail('Enter the enrollee number from the patient’s card.')
    if (record.membership_type !== 'principal' && !record.principal_enrollee_id) return fail('Enter the principal’s enrollee number for a dependant.')
    const { data, error } = await database.from('emr_patient_coverage').insert(record).select('*').single()
    if (error) throw error
    await writeEmrAudit(database, user, { action: 'create_coverage', entityType: 'emr_patient_coverage', entityId: data.id, patientId: data.patient_id, metadata: { scheme: data.scheme } })
    return NextResponse.json({ record: data }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}

export async function PATCH(request: NextRequest) {
  const context = await getEmrContext(request, 'manage_coverage')
  if (!context) return fail('Coverage access required.', 403)
  const { database, user } = context
  const body = await request.json().catch(() => null) as Record<string, any> | null
  if (!body || !isUuid(body.id)) return fail('A valid coverage record is required.')

  try {
    const updates: Record<string, unknown> = { ...coverageFields(body, true), updated_at: new Date().toISOString() }
    if ('scheme' in updates && !updates.scheme) return fail('Choose the scheme the patient is covered by.')
    if ('enrollee_id' in updates && !updates.enrollee_id) return fail('Enter the enrollee number from the patient’s card.')
    // A changed enrollee number or scheme has not been checked yet.
    if ('enrollee_id' in updates || 'scheme' in updates) {
      const { data: current } = await database.from('emr_patient_coverage').select('scheme,enrollee_id').eq('id', body.id).maybeSingle()
      if (current && ((updates.enrollee_id && updates.enrollee_id !== current.enrollee_id) || (updates.scheme && updates.scheme !== current.scheme))) {
        Object.assign(updates, { verification_status: 'unverified', last_verified_at: null, last_verified_by: null })
      }
    }
    const { data, error } = await database.from('emr_patient_coverage').update(updates).eq('id', body.id).select('*').single()
    if (error) throw error
    await writeEmrAudit(database, user, { action: 'update_coverage', entityType: 'emr_patient_coverage', entityId: data.id, patientId: data.patient_id, metadata: { status: data.status, fields: Object.keys(updates).filter(key => key !== 'updated_at') } })
    return NextResponse.json({ record: data })
  } catch (error) {
    return serverError(error)
  }
}

// Records an eligibility check with the HMO or scheme, and makes it the
// coverage's current status.
async function verify(database: SupabaseClient, user: any, body: Record<string, any>) {
  if (!isUuid(body.coverage_id)) return fail('A valid coverage record is required.')
  const outcome = pick(body.outcome, values(verificationOutcomes))
  const method = pick(body.method, values(verificationMethods))
  if (!outcome || !method) return fail('Choose how eligibility was checked and what the result was.')
  const notes = cleanText(body.notes, 2000)
  if (outcome !== 'verified' && !notes) return fail('Note what the HMO or scheme said, so the patient can be advised.')
  const { data: coverage, error: findError } = await database.from('emr_patient_coverage').select('id,patient_id,status').eq('id', body.coverage_id).maybeSingle()
  if (findError) throw findError
  if (!coverage) return fail('Coverage record not found.', 404)
  if (coverage.status !== 'active') return fail('Reactivate this coverage before checking eligibility.')

  const verifiedAt = new Date().toISOString()
  const { data, error } = await database.from('emr_coverage_verifications').insert({
    coverage_id: coverage.id, patient_id: coverage.patient_id,
    encounter_id: isUuid(body.encounter_id) ? body.encounter_id : null,
    outcome, method, reference: cleanText(body.reference, 120), notes,
    verified_by: user.id, verified_at: verifiedAt,
  }).select('*').single()
  if (error) throw error
  const { error: updateError } = await database.from('emr_patient_coverage').update({
    verification_status: outcome, last_verified_at: verifiedAt, last_verified_by: user.id, updated_at: verifiedAt,
  }).eq('id', coverage.id)
  if (updateError) throw updateError
  await writeEmrAudit(database, user, { action: 'verify_coverage', entityType: 'emr_coverage_verifications', entityId: data.id, patientId: coverage.patient_id, metadata: { outcome, method } })
  return NextResponse.json({ record: data }, { status: 201 })
}
