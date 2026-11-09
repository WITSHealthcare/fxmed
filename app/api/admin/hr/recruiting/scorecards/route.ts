import { NextRequest, NextResponse } from 'next/server'
import { canHr, cleanHrEnum, cleanHrText, cleanHrUuid, recommendations, values } from '@/lib/hr'
import { competenciesForStep, defaultScorecardCompetencies, isClosedStage, type HrScorecardTemplate, type ScorecardRating } from '@/lib/hr-recruiting'
import { fail, logHr, readJson, recordEvent, recruitingContext, serverError } from '../shared'

// Scorecards. The interviewer (and only they) declares conflicts, drafts and
// submits their own card; "self" is always the signed-in user, never an id
// from the browser. Once submitted only admin can unlock it.
export async function PATCH(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user, viewer } = context
  const body = await readJson(request); const id = cleanHrUuid(body?.id)
  if (!body || !id) return fail('A valid scorecard is required.')
  try {
    const { data: card, error } = await database.from('hr_scorecards').select('*, interview:hr_interviews(title,loop_step_code,status), application:hr_applications(id,stage,role_family,opening_title)').eq('id', id).maybeSingle()
    if (error) throw error
    const own = card?.interviewer_id === user.id
    if (!card || (!own && !admin)) return fail('Scorecard not found.', 404)
    if (!card.application || isClosedStage(card.application.stage)) return fail('This application is closed.')

    if (body.action === 'unlock') {
      if (!admin) return fail('Only People Ops can unlock a submitted scorecard.', 403)
      const reason = cleanHrText(body.reason, 500); if (card.status !== 'submitted' || !reason) return fail('Give the reason for unlocking this submitted scorecard.')
      const { error: unlockError } = await database.from('hr_scorecards').update({ status: 'draft', submitted_at: null }).eq('id', id); if (unlockError) throw unlockError
      await recordEvent(database, { application_id: card.application_id, note: `Scorecard for ${card.interview?.title || 'interview'} unlocked: ${reason}`, changed_by: user.id })
      await logHr(context, { action: 'unlock', entityType: 'hr_scorecard', entityId: id, subjectUserId: card.interviewer_id, description: `Unlocked a submitted scorecard for ${card.application.opening_title}`, metadata: { reason } })
      return NextResponse.json({ success: true })
    }
    // Writing a scorecard is for its interviewer only (canHr 'scorecard' as interviewer).
    if (!own || !canHr(viewer.role, 'scorecard', 'interviewer', 'write')) return fail('Only the assigned interviewer can fill in this scorecard.', 403)
    if (card.status === 'submitted') return fail('This scorecard is submitted. Ask People Ops to unlock it if it needs a change.')
    if (card.interview?.status === 'cancelled') return fail('This interview was cancelled.')

    if (body.action === 'declare') {
      const conflict = body.conflict === true; const note = cleanHrText(body.note, 1000)
      if (conflict && !note) return fail('Describe the relationship so People Ops can reassign the interview.')
      const { error: declareError } = await database.from('hr_scorecards').update({ conflict_declared: conflict, conflict_note: conflict ? note : null, conflict_checked_at: new Date().toISOString() }).eq('id', id); if (declareError) throw declareError
      if (conflict) await recordEvent(database, { application_id: card.application_id, note: `An interviewer declared a conflict for ${card.interview?.title || 'an interview'}; reassign the panel.`, changed_by: user.id })
      await logHr(context, { action: 'declare_conflict', entityType: 'hr_scorecard', entityId: id, description: conflict ? 'Declared a conflict of interest' : 'Declared no conflict of interest' })
      return NextResponse.json({ success: true })
    }

    if (body.action !== 'save' && body.action !== 'submit') return fail('Unknown action.')
    if (!card.conflict_checked_at) return fail('Declare any conflict of interest before scoring.')
    if (card.conflict_declared) return fail('You declared a conflict, so you cannot score this candidate.')
    const { data: template } = card.template_id ? await database.from('hr_scorecard_templates').select('*').eq('id', card.template_id).maybeSingle() : { data: null }
    const competencies = competenciesForStep((template as HrScorecardTemplate | null)?.competencies || (card.application.role_family ? defaultScorecardCompetencies(card.application.role_family) : []), card.interview?.loop_step_code)
    const codes = new Set(competencies.map((item) => item.code))
    const ratings: ScorecardRating[] = (Array.isArray(body.ratings) ? body.ratings : []).flatMap((raw: unknown) => {
      if (!raw || typeof raw !== 'object') return []
      const item = raw as Record<string, unknown>; const code = cleanHrText(item.competency_code, 60); const rating = Math.trunc(Number(item.rating))
      return codes.has(code) && rating >= 1 && rating <= 4 ? [{ competency_code: code, rating, evidence: cleanHrText(item.evidence, 2000) }] : []
    }).filter((item: ScorecardRating, index: number, list: ScorecardRating[]) => list.findIndex((other) => other.competency_code === item.competency_code) === index)
    const recommendation = cleanHrEnum(body.overall_recommendation, values(recommendations)); const notes = cleanHrText(body.notes, 5000)
    if (body.action === 'submit') {
      const missing = competencies.filter((item) => !ratings.some((rating) => rating.competency_code === item.code && rating.evidence.length >= 10))
      if (missing.length) return fail(`Rate every competency with the evidence (what the candidate said or did): ${missing.map((item) => item.name).join(', ')}.`)
      if (!recommendation) return fail('Choose your overall recommendation.')
    }
    const submit = body.action === 'submit'
    const { data, error: saveError } = await database.from('hr_scorecards').update({ ratings, overall_recommendation: recommendation, notes, status: submit ? 'submitted' : 'draft', submitted_at: submit ? new Date().toISOString() : null }).eq('id', id).eq('interviewer_id', user.id).neq('status', 'submitted').select('*').maybeSingle()
    if (saveError) throw saveError
    if (!data) return fail('This scorecard changed while you were editing. Reload and try again.', 409)
    if (submit) await recordEvent(database, { application_id: card.application_id, note: `Scorecard submitted for ${card.interview?.title || 'interview'}.`, changed_by: user.id })
    await logHr(context, { action: submit ? 'submit' : 'save', entityType: 'hr_scorecard', entityId: id, description: `${submit ? 'Submitted' : 'Saved'} a scorecard for ${card.application.opening_title}` })
    return NextResponse.json({ scorecard: data })
  } catch (error) { return serverError(error, 'saving scorecard', 'Failed to save the scorecard.') }
}
