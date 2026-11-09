import { NextRequest, NextResponse } from 'next/server'
import { cleanHrEnum, cleanHrNumber, cleanHrOptionalText, cleanHrText, cleanHrTimestamp, cleanHrUuid, interviewFormats, interviewStatuses, values } from '@/lib/hr'
import { interviewLoops, isClosedStage, loopStep } from '@/lib/hr-recruiting'
import { activeTemplate, fail, logHr, readJson, recordEvent, recruitingContext, serverError, staffDirectory, type HrDatabase } from '../shared'

// Interviews and interviewer assignment (admin). Each interviewer gets their
// own hr_scorecards row, which is what lets them see the candidate summary.
// Interviewers declare conflicts on their scorecard before scoring.
async function validInterviewers(database: HrDatabase, value: unknown) {
  const ids = Array.isArray(value) ? Array.from(new Set(value.map(cleanHrUuid).filter((id): id is string => !!id))) : []
  const staff = new Set((await staffDirectory(database)).map((member) => member.id))
  return ids.every((id) => staff.has(id)) ? ids.slice(0, 6) : null
}
function fields(body: Record<string, unknown>, roleFamily: string | null) {
  const steps = roleFamily ? interviewLoops[roleFamily as keyof typeof interviewLoops].map((step) => step.code) : []
  const code = cleanHrText(body.loop_step_code, 10)
  return {
    loop_step_code: code && steps.includes(code) ? code : '', title: cleanHrText(body.title, 160), format: cleanHrEnum(body.format, values(interviewFormats)) || 'in_person',
    scheduled_at: cleanHrTimestamp(body.scheduled_at), duration_min: cleanHrNumber(body.duration_min, 5, 600), location_or_link: cleanHrOptionalText(body.location_or_link, 1000), adjustments_requested: cleanHrOptionalText(body.adjustments_requested, 1000),
  }
}

export async function POST(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  const body = await readJson(request); const applicationId = cleanHrUuid(body?.application_id)
  if (!body || !applicationId) return fail('A valid application is required.')
  try {
    const { data: application, error } = await database.from('hr_applications').select('id,stage,role_family,opening_title').eq('id', applicationId).maybeSingle()
    if (error) throw error
    if (!application || isClosedStage(application.stage)) return fail('Interviews can be scheduled only on open applications.')
    const interviewers = await validInterviewers(database, body.interviewer_ids)
    if (!interviewers?.length) return fail('Assign at least one interviewer from the staff list.')
    const clean = fields(body, application.role_family); const step = loopStep(application.role_family, clean.loop_step_code)
    const title = clean.title || step?.title || ''; if (!title) return fail('Give the interview a title or choose a loop step.')
    const template = await activeTemplate(database, application.role_family)
    const { data: interview, error: insertError } = await database.from('hr_interviews').insert({ ...clean, application_id: applicationId, title, duration_min: clean.duration_min ?? step?.minutes ?? null, created_by: user.id }).select('*').single()
    if (insertError) throw insertError
    const { error: cardError } = await database.from('hr_scorecards').insert(interviewers.map((id) => ({ interview_id: interview.id, application_id: applicationId, interviewer_id: id, template_id: template?.id || null })))
    if (cardError) { await database.from('hr_interviews').delete().eq('id', interview.id); throw cardError }
    await recordEvent(database, { application_id: applicationId, note: `Interview scheduled: ${title} (${interviewers.length} interviewer${interviewers.length === 1 ? '' : 's'}).`, changed_by: user.id })
    await logHr(context, { action: 'create', entityType: 'hr_interview', entityId: interview.id, description: `Scheduled ${title} for ${application.opening_title}`, metadata: { interviewers } })
    return NextResponse.json({ interview }, { status: 201 })
  } catch (error) { return serverError(error, 'scheduling interview', 'Failed to schedule the interview.') }
}

export async function PATCH(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  const body = await readJson(request); const id = cleanHrUuid(body?.id)
  if (!body || !id) return fail('A valid interview is required.')
  try {
    const { data: interview, error } = await database.from('hr_interviews').select('*, application:hr_applications(id,stage,role_family)').eq('id', id).maybeSingle()
    if (error) throw error
    if (!interview?.application || isClosedStage(interview.application.stage)) return fail('Interview not found on an open application.', 404)
    if (body.action === 'add_interviewers') {
      const interviewers = await validInterviewers(database, body.interviewer_ids); if (!interviewers?.length) return fail('Choose interviewers from the staff list.')
      const template = await activeTemplate(database, interview.application.role_family)
      const { error: cardError } = await database.from('hr_scorecards').upsert(interviewers.map((interviewerId) => ({ interview_id: id, application_id: interview.application_id, interviewer_id: interviewerId, template_id: template?.id || null })), { onConflict: 'interview_id,interviewer_id', ignoreDuplicates: true })
      if (cardError) throw cardError
      await logHr(context, { action: 'assign', entityType: 'hr_interview', entityId: id, description: `Assigned ${interviewers.length} interviewer(s) to ${interview.title}` })
      return NextResponse.json({ success: true })
    }
    if (body.action === 'remove_interviewer') {
      const scorecardId = cleanHrUuid(body.scorecard_id); if (!scorecardId) return fail('Choose the interviewer to remove.')
      const { data: card } = await database.from('hr_scorecards').select('status,conflict_declared').eq('id', scorecardId).eq('interview_id', id).maybeSingle()
      if (!card) return fail('Scorecard not found.', 404)
      if (card.status === 'submitted' && !card.conflict_declared) return fail('A submitted scorecard cannot be removed.')
      const { error: deleteError } = await database.from('hr_scorecards').delete().eq('id', scorecardId); if (deleteError) throw deleteError
      await logHr(context, { action: 'unassign', entityType: 'hr_scorecard', entityId: scorecardId, description: `Removed an interviewer from ${interview.title}` })
      return NextResponse.json({ success: true })
    }
    const clean = fields({ ...interview, ...body }, interview.application.role_family)
    const status = cleanHrEnum(body.status, values(interviewStatuses)) || interview.status
    if (!clean.title) return fail('The interview needs a title.')
    const { data, error: updateError } = await database.from('hr_interviews').update({ ...clean, status }).eq('id', id).select('*').single(); if (updateError) throw updateError
    if (status !== interview.status || clean.scheduled_at !== interview.scheduled_at) await recordEvent(database, { application_id: interview.application_id, note: `Interview ${clean.title}: ${status}${clean.scheduled_at ? ` (${clean.scheduled_at})` : ''}.`, changed_by: user.id })
    await logHr(context, { action: 'update', entityType: 'hr_interview', entityId: id, description: `Updated interview ${clean.title}` })
    return NextResponse.json({ interview: data })
  } catch (error) { return serverError(error, 'updating interview', 'Failed to update the interview.') }
}

export async function DELETE(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  const id = cleanHrUuid(new URL(request.url).searchParams.get('id')); if (!id) return fail('A valid interview is required.')
  try {
    const { data: interview } = await database.from('hr_interviews').select('id,title,application_id').eq('id', id).maybeSingle()
    if (!interview) return fail('Interview not found.', 404)
    const { count } = await database.from('hr_scorecards').select('id', { count: 'exact', head: true }).eq('interview_id', id).eq('status', 'submitted')
    if (count) return fail('This interview has submitted scorecards; mark it cancelled instead.')
    const { error } = await database.from('hr_interviews').delete().eq('id', id); if (error) throw error
    await recordEvent(database, { application_id: interview.application_id, note: `Interview removed: ${interview.title}.`, changed_by: user.id })
    await logHr(context, { action: 'delete', entityType: 'hr_interview', entityId: id, description: `Removed interview ${interview.title}` })
    return NextResponse.json({ success: true })
  } catch (error) { return serverError(error, 'deleting interview', 'Failed to delete the interview.') }
}
