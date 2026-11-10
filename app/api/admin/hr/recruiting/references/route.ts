import { NextRequest, NextResponse } from 'next/server'
import { cleanHrEnum, cleanHrOptionalText, cleanHrText, cleanHrUuid, referenceOutcomes, values } from '@/lib/hr'
import { isClosedStage, referenceQuestions, type ReferenceAnswers } from '@/lib/hr-recruiting'
import { fail, logHr, readJson, recordEvent, recruitingContext, serverError, type HrDatabase } from '../shared'

// Reference checks: admin only, including the answers (referee comments are
// given in confidence). Taken after the decision to hire, with the
// candidate's consent recorded before any referee is contacted.
async function application(database: HrDatabase, id: string | null) {
  if (!id) return null
  const { data } = await database.from('hr_applications').select('id,stage,decision,candidate:hr_candidates(full_name)').eq('id', id).maybeSingle()
  return data
}
function details(body: Record<string, unknown>) {
  return {
    referee_name: cleanHrText(body.referee_name, 160), referee_relationship: cleanHrOptionalText(body.referee_relationship, 160), referee_organisation: cleanHrOptionalText(body.referee_organisation, 160),
    referee_contact: cleanHrOptionalText(body.referee_contact, 254), is_current_employer: body.is_current_employer === true,
  }
}

export async function POST(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  const body = await readJson(request); if (!body) return fail('Invalid request.')
  try {
    const app = await application(database, cleanHrUuid(body.application_id))
    if (!app || isClosedStage(app.stage)) return fail('References can be added only to open applications.')
    if (app.decision !== 'hire') return fail('Take references only after the decision to hire.')
    const clean = details(body); if (!clean.referee_name) return fail('Enter the referee name.')
    const { data, error } = await database.from('hr_reference_checks').insert({ ...clean, application_id: app.id, candidate_consent_at: body.candidate_consent === true ? new Date().toISOString() : null }).select('*').single()
    if (error) throw error
    await recordEvent(database, { application_id: app.id, note: `Referee added: ${clean.referee_name}.`, changed_by: user.id })
    await logHr(context, { action: 'create', entityType: 'hr_reference_check', entityId: data.id, description: 'Added a referee' })
    return NextResponse.json({ reference: data }, { status: 201 })
  } catch (error) { return serverError(error, 'adding reference', 'Failed to add the reference.') }
}

export async function PATCH(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  const body = await readJson(request); const id = cleanHrUuid(body?.id); if (!body || !id) return fail('A valid reference is required.')
  try {
    const { data: reference } = await database.from('hr_reference_checks').select('*').eq('id', id).maybeSingle()
    const app = reference && await application(database, reference.application_id)
    if (!reference || !app || isClosedStage(app.stage)) return fail('Reference not found on an open application.', 404)
    const clean = details({ ...reference, ...body }); if (!clean.referee_name) return fail('Enter the referee name.')
    const consentAt = reference.candidate_consent_at || (body.candidate_consent === true ? new Date().toISOString() : null)
    const answers: ReferenceAnswers = {}; const raw = body.answers && typeof body.answers === 'object' ? body.answers as Record<string, unknown> : reference.answers || {}
    for (const question of referenceQuestions) { const value = cleanHrText(raw[question.key], 2000); if (value) answers[question.key] = value }
    const outcome = cleanHrEnum(body.outcome, values(referenceOutcomes))
    if ((outcome || Object.keys(answers).length) && !consentAt) return fail('Record the candidate’s consent before contacting the referee.')
    const { data, error } = await database.from('hr_reference_checks').update({
      ...clean, candidate_consent_at: consentAt, answers, dates_confirmed: typeof body.dates_confirmed === 'boolean' ? body.dates_confirmed : reference.dates_confirmed,
      outcome, checked_by: outcome ? user.id : null, checked_at: outcome ? reference.checked_at || new Date().toISOString() : null,
    }).eq('id', id).select('*').single()
    if (error) throw error
    if (outcome && outcome !== reference.outcome) await recordEvent(database, { application_id: app.id, note: `Reference from ${clean.referee_name}: ${outcome.replace(/_/g, ' ')}.`, changed_by: user.id })
    await logHr(context, { action: 'update', entityType: 'hr_reference_check', entityId: id, description: 'Updated a reference check', metadata: { outcome } })
    return NextResponse.json({ reference: data })
  } catch (error) { return serverError(error, 'updating reference', 'Failed to update the reference.') }
}

export async function DELETE(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database } = context
  if (!admin) return fail('Admin access required', 403)
  const id = cleanHrUuid(new URL(request.url).searchParams.get('id')); if (!id) return fail('A valid reference is required.')
  try {
    const { error } = await database.from('hr_reference_checks').delete().eq('id', id); if (error) throw error
    await logHr(context, { action: 'delete', entityType: 'hr_reference_check', entityId: id, description: 'Deleted a reference check' })
    return NextResponse.json({ success: true })
  } catch (error) { return serverError(error, 'deleting reference', 'Failed to delete the reference.') }
}
