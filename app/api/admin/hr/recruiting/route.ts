import { NextRequest, NextResponse } from 'next/server'
import { lagosDate } from '@/lib/follow-ups'
import { candidatePrivacyNoticeVersion, candidateSources, cleanHrEmail, cleanHrEnum, cleanHrNumber, cleanHrOptionalText, cleanHrText, cleanHrUuid, values, type RoleFamily } from '@/lib/hr'
import { addMonths, unsuccessfulRetentionMonths } from '@/lib/hr-recruiting'
import { fail, logHr, readJson, recordEvent, recruitingContext, refreshCandidateRetention, serverError, staffDirectory, stageDueAt } from './shared'

const roleFamilyValues: RoleFamily[] = ['A', 'B', 'C', 'D', 'E', 'F']

// Admin: the whole pipeline. Everyone else (and admin with ?mine=1): "My
// interviews" — only the interviews they are assigned to on open
// applications, the candidate summary and their own scorecard.
export async function GET(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  try {
    if (!admin || new URL(request.url).searchParams.get('mine') === '1') {
      const { data: cards, error } = await database.from('hr_scorecards').select('*, interview:hr_interviews(*), application:hr_applications(id,opening_title,department,role_family,stage,cover_note,cv_path,candidate:hr_candidates(full_name,location))').eq('interviewer_id', user.id).order('created_at', { ascending: false })
      if (error) throw error
      const open = (cards || []).filter((card) => card.application && !['hired', 'rejected', 'withdrawn'].includes(card.application.stage))
      const templateIds = Array.from(new Set(open.map((card) => card.template_id).filter(Boolean)))
      const { data: templates } = templateIds.length ? await database.from('hr_scorecard_templates').select('*').in('id', templateIds) : { data: [] }
      const assignments = open.map(({ application, interview, ...scorecard }) => ({
        scorecard, interview, template: (templates || []).find((template) => template.id === scorecard.template_id) || null,
        application: { id: application.id, opening_title: application.opening_title, department: application.department, role_family: application.role_family, stage: application.stage, cover_note: application.cover_note, has_cv: !!application.cv_path, candidate_name: application.candidate?.full_name || 'Candidate', candidate_location: application.candidate?.location || null },
      }))
      return NextResponse.json({ assignments })
    }
    const [applications, scorecards, openings, templates, requisitions, staff] = await Promise.all([
      database.from('hr_applications').select('*, candidate:hr_candidates(id,full_name,email,phone,location,source,talent_pool_consent,anonymised_at,retention_delete_after)').order('created_at', { ascending: false }).limit(1000),
      database.from('hr_scorecards').select('application_id,status,conflict_declared'),
      database.from('career_openings').select('id,title,department,employment_type,location,status').order('created_at', { ascending: false }),
      database.from('hr_scorecard_templates').select('*').order('role_family').order('version', { ascending: false }),
      database.from('hr_requisitions').select('*').order('created_at', { ascending: false }),
      staffDirectory(database),
    ])
    if (applications.error) throw applications.error
    if (requisitions.error) console.error('Requisitions unavailable (migration 042?):', requisitions.error.message)
    const progress = new Map<string, { assigned: number; submitted: number; conflicts: number }>()
    for (const card of scorecards.data || []) { const row = progress.get(card.application_id) || { assigned: 0, submitted: 0, conflicts: 0 }; row.assigned += 1; if (card.status === 'submitted') row.submitted += 1; if (card.conflict_declared) row.conflicts += 1; progress.set(card.application_id, row) }
    return NextResponse.json({
      applications: (applications.data || []).map((row) => ({ ...row, scorecards: progress.get(row.id) || { assigned: 0, submitted: 0, conflicts: 0 } })),
      openings: openings.data || [], templates: templates.data || [], requisitions: requisitions.data || [], requisitionsReady: !requisitions.error, staff, today: lagosDate(),
    })
  } catch (error) { return serverError(error, 'loading recruiting', 'Failed to load recruiting.') }
}

// Admin adds an application received another way (referral, agency, an old
// emailed CV being moved out of an inbox). The CV is uploaded next via /checks.
export async function POST(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  const body = await readJson(request); if (!body) return fail('Invalid request.')
  const fullName = cleanHrText(body.full_name, 160); const email = cleanHrEmail(body.email); const openingId = cleanHrUuid(body.opening_id)
  if (!fullName || !email || !openingId) return fail('Enter the candidate name, a valid email and the opening.')
  if (body.privacy_notice_sent !== true) return fail('Send the candidate the privacy notice before adding them, then tick the box.')
  const source = cleanHrEnum(body.source, values(candidateSources)) || 'other'
  try {
    const { data: opening, error: openingError } = await database.from('career_openings').select('id,title,department').eq('id', openingId).maybeSingle()
    if (openingError) throw openingError
    if (!opening) return fail('That opening no longer exists.')
    const now = new Date().toISOString()
    const { data: existing, error: lookupError } = await database.from('hr_candidates').select('id').eq('email', email).is('anonymised_at', null).maybeSingle()
    if (lookupError) throw lookupError
    let candidateId = existing?.id as string | undefined
    if (!candidateId) {
      const { data, error } = await database.from('hr_candidates').insert({ full_name: fullName, email, phone: cleanHrOptionalText(body.phone, 40), location: cleanHrOptionalText(body.location, 160), source, referrer_employee_id: cleanHrUuid(body.referrer_employee_id), privacy_notice_version: candidatePrivacyNoticeVersion, privacy_acknowledged_at: now, retention_delete_after: addMonths(lagosDate(), unsuccessfulRetentionMonths) }).select('id').single()
      if (error) throw error
      candidateId = data.id
    }
    const { data: requisitions } = await database.from('hr_requisitions').select('id,role_family,hiring_manager_id,status').eq('career_opening_id', opening.id).in('status', ['approved', 'on_hold', 'pending_approval', 'draft'])
    const requisition = (requisitions || []).find((row) => row.status === 'approved') || (requisitions || [])[0]
    const roleFamily = cleanHrEnum(body.role_family, roleFamilyValues) || requisition?.role_family || null
    const { data: application, error } = await database.from('hr_applications').insert({
      candidate_id: candidateId, career_opening_id: opening.id, opening_title: opening.title, department: opening.department, role_family: roleFamily,
      ...(requisition ? { requisition_id: requisition.id, hiring_manager_id: requisition.hiring_manager_id } : {}),
      cover_note: cleanHrText(body.cover_note, 5000), salary_expectation_ngn: cleanHrNumber(body.salary_expectation_ngn, 0, 1e11), notice_period: cleanHrOptionalText(body.notice_period, 120),
      stage: 'applied', stage_due_at: await stageDueAt(database, 'applied'),
    }).select('*').single()
    if (error) return error.code === '23505' ? fail('This candidate already has an application for that opening.', 409) : serverError(error, 'adding application', 'Failed to add the application.')
    await recordEvent(database, { application_id: application.id, to_stage: 'applied', note: `Added by People Ops (source: ${source}).`, changed_by: user.id })
    await refreshCandidateRetention(database, candidateId!)
    await logHr(context, { action: 'create', entityType: 'hr_application', entityId: application.id, description: `Added ${fullName} to ${opening.title}` })
    return NextResponse.json({ application }, { status: 201 })
  } catch (error) { return serverError(error, 'adding application', 'Failed to add the application.') }
}
