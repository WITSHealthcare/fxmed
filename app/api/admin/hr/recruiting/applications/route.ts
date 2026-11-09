import { NextRequest, NextResponse } from 'next/server'
import { lagosDate } from '@/lib/follow-ups'
import { applicationStages, cleanHrEnum, cleanHrNumber, cleanHrOptionalText, cleanHrText, cleanHrUuid, hrDocumentBucket, labelOf, type ApplicationStage, type EmployeeStatus, type RoleFamily } from '@/lib/hr'
import { addMonths, checkDecisionRules, communicationChannels, isClosedStage, manualStageTargets, offerApprovalRules, type HrApplication, type HrOffer } from '@/lib/hr-recruiting'
import { activeTemplate, currentBand, fail, liveScorecards, logHr, moveStage, readJson, recordEvent, recruitingContext, refreshCandidateRetention, serverError, staffDirectory, talentPoolExpiry, type RecruitingContext } from '../shared'
import { anonymiseCandidate } from '../retention/rules'

const roleFamilyValues: RoleFamily[] = ['A', 'B', 'C', 'D', 'E', 'F']
const channelValues = communicationChannels.map((item) => item.value)
const offerStages: ApplicationStage[] = ['offer_approval', 'offer_extended', 'accepted', 'pre_boarding']

// Full application file for admin (People Ops / MD). Interviewers use the
// main GET, which returns only their own assignments.
export async function GET(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database } = context
  if (!admin) return fail('Admin access required', 403)
  const id = cleanHrUuid(new URL(request.url).searchParams.get('id')); if (!id) return fail('A valid application is required.')
  try {
    const { data: application, error } = await database.from('hr_applications').select('*, candidate:hr_candidates(*)').eq('id', id).maybeSingle()
    if (error) throw error
    if (!application) return fail('Application not found.', 404)
    const [events, interviews, scorecards, references, offers, credentials, documents, staff, template, requisition] = await Promise.all([
      database.from('hr_application_events').select('*').eq('application_id', id).order('changed_at', { ascending: false }),
      database.from('hr_interviews').select('*').eq('application_id', id).order('scheduled_at', { ascending: true }),
      database.from('hr_scorecards').select('*').eq('application_id', id).order('created_at'),
      database.from('hr_reference_checks').select('*').eq('application_id', id).order('created_at'),
      database.from('hr_offers').select('*').eq('application_id', id).order('created_at', { ascending: false }),
      database.from('hr_credentials').select('*').eq('application_id', id).order('created_at'),
      database.from('hr_documents').select('id,document_type,title,mime_type,size_bytes,is_restricted,status,original_seen_at,verified_at,verification_method,employee_id,created_at').eq('application_id', id).neq('status', 'deleted').order('created_at'),
      staffDirectory(database), activeTemplate(database, application.role_family),
      application.requisition_id ? database.from('hr_requisitions').select('*').eq('id', application.requisition_id).maybeSingle() : Promise.resolve({ data: null }),
    ])
    for (const result of [events, interviews, scorecards, references, offers, credentials, documents]) if (result.error) throw result.error
    const emails = new Map(staff.map((member) => [member.id, member.name || member.email]))
    const bands = new Map<string, Awaited<ReturnType<typeof currentBand>>>()
    for (const offer of offers.data || []) if (offer.band_code && !bands.has(offer.band_code)) bands.set(offer.band_code, await currentBand(database, offer.band_code))
    await logHr(context, { action: 'view', entityType: 'hr_application', entityId: id, description: `Viewed application ${application.opening_title} — ${application.candidate?.full_name || 'candidate'}` })
    return NextResponse.json({
      application, events: events.data, interviews: interviews.data, template, requisition: requisition.data || null, staff,
      scorecards: (scorecards.data || []).map((card) => ({ ...card, interviewer_email: emails.get(card.interviewer_id) || 'Former staff' })),
      decision: checkDecisionRules(await liveScorecards(database, id), template), references: references.data, credentials: credentials.data, documents: documents.data,
      offers: (offers.data || []).map((offer: HrOffer) => { const band = offer.band_code ? bands.get(offer.band_code) || null : null; return { ...offer, band, rules: offerApprovalRules(offer, application.department, band) } }),
    })
  } catch (error) { return serverError(error, 'loading application', 'Failed to load the application.') }
}

export async function PATCH(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  const body = await readJson(request); const id = cleanHrUuid(body?.id)
  if (!body || !id) return fail('A valid application is required.')
  try {
    const { data: found, error: loadError } = await database.from('hr_applications').select('*, candidate:hr_candidates(*)').eq('id', id).maybeSingle()
    if (loadError) throw loadError
    if (!found) return fail('Application not found.', 404)
    const application = found as HrApplication
    const name = application.candidate?.full_name || 'candidate'
    const channel = cleanHrEnum(body.channel, channelValues)

    if (body.action === 'message') {
      const note = cleanHrText(body.note, 2000); if (!note || !channel) return fail('Record what was said and how.')
      await recordEvent(database, { application_id: id, note, communication_sent: true, communication_channel: channel, changed_by: user.id })
      await database.from('hr_applications').update({ last_candidate_contact_at: new Date().toISOString() }).eq('id', id)
      await logHr(context, { action: 'message', entityType: 'hr_application', entityId: id, description: `Logged ${channel} contact with ${name}` })
      return NextResponse.json({ success: true })
    }

    if (body.action === 'talent_pool') {
      const candidate = application.candidate; if (!candidate || candidate.anonymised_at) return fail('This candidate has been anonymised.')
      const consent = body.consent === true; const now = new Date().toISOString(); const consentAt = candidate.talent_pool_consent_at || now
      const { error } = await database.from('hr_candidates').update(consent ? { talent_pool_consent: true, talent_pool_consent_at: consentAt, talent_pool_expires_at: talentPoolExpiry(consentAt) } : { talent_pool_consent: false, talent_pool_expires_at: null }).eq('id', candidate.id)
      if (error) throw error
      await refreshCandidateRetention(database, candidate.id)
      await recordEvent(database, { application_id: id, note: consent ? (candidate.talent_pool_consent ? 'Talent-pool consent renewed by the candidate.' : 'Candidate gave talent-pool consent.') : 'Candidate withdrew talent-pool consent.', changed_by: user.id })
      await logHr(context, { action: 'consent', entityType: 'hr_candidate', entityId: candidate.id, description: `${consent ? 'Recorded' : 'Withdrew'} talent-pool consent for ${name}` })
      return NextResponse.json({ success: true })
    }

    if (body.action === 'anonymise') {
      const reason = cleanHrText(body.reason, 300); if (!reason) return fail('Record why (for example, an erasure request).')
      if (!application.candidate) return fail('Candidate not found.')
      const result = await anonymiseCandidate(database, application.candidate.id, `Erasure on request: ${reason}`, user.id)
      if (!result.ok) return fail(result.reason)
      await logHr(context, { action: 'anonymise', entityType: 'hr_candidate', entityId: application.candidate.id, description: `Anonymised candidate on request` })
      return NextResponse.json({ success: true })
    }

    if (isClosedStage(application.stage)) return fail('This application is closed.')

    if (body.action === 'update') {
      const hiringManager = body.hiring_manager_id === null ? null : cleanHrUuid(body.hiring_manager_id)
      if (hiringManager && !(await staffDirectory(database)).some((member) => member.id === hiringManager)) return fail('Choose a hiring manager from the staff list.')
      const update = {
        role_family: cleanHrEnum(body.role_family, roleFamilyValues), hiring_manager_id: hiringManager, notice_period: cleanHrOptionalText(body.notice_period, 120),
        right_to_work_status: cleanHrOptionalText(body.right_to_work_status, 120), salary_expectation_ngn: cleanHrNumber(body.salary_expectation_ngn, 0, 1e11),
      }
      const { data, error } = await database.from('hr_applications').update(update).eq('id', id).select('*').single(); if (error) throw error
      if (application.candidate && !application.candidate.anonymised_at) await database.from('hr_candidates').update({ phone: cleanHrOptionalText(body.phone, 40), location: cleanHrOptionalText(body.location, 160) }).eq('id', application.candidate.id)
      await logHr(context, { action: 'update', entityType: 'hr_application', entityId: id, description: `Updated application details for ${name}` })
      return NextResponse.json({ application: data })
    }

    if (body.action === 'decision') {
      if (application.stage !== 'debrief') return fail('Record the decision at the debrief stage.')
      const decision = body.decision === 'hire' || body.decision === 'no_hire' ? body.decision : null; const reason = cleanHrText(body.reason, 3000)
      if (!decision || !reason) return fail('Record hire or no hire with the reasons.')
      const check = checkDecisionRules(await liveScorecards(database, id), await activeTemplate(database, application.role_family))
      if (check.pending) return fail('Every interviewer must submit their scorecard before the decision.')
      // Hiring against the decision rules needs a written override (split panel / Approver in writing).
      const override = cleanHrText(body.override_reason, 2000)
      if (decision === 'hire' && !check.passes && !override) return fail(`The scorecards do not meet the decision rules: ${check.reasons.join(' ')} Write the override reason to hire anyway.`)
      const note = `Decision: ${decision === 'hire' ? 'hire' : 'no hire'}. ${reason}${decision === 'hire' && !check.passes ? ` Override of decision rules: ${override}` : ''} (average ${check.average ?? '—'}, ${check.twos} rating(s) of 2${check.knockouts.length ? `, knockout: ${check.knockouts.join(', ')}` : ''})`
      const { error } = await database.from('hr_applications').update({ decision, decision_reason: note.slice(0, 4000), decided_by: user.id, decided_at: new Date().toISOString() }).eq('id', id); if (error) throw error
      await recordEvent(database, { application_id: id, note, changed_by: user.id })
      await logHr(context, { action: 'decision', entityType: 'hr_application', entityId: id, description: `Recorded ${decision} for ${name}`, metadata: { passes: check.passes, average: check.average } })
      return NextResponse.json({ success: true })
    }

    if (body.action === 'stage') {
      const to = cleanHrEnum(body.to, manualStageTargets); const note = cleanHrText(body.note, 2000); const reason = cleanHrText(body.reason, 1000)
      if (!to || to === application.stage) return fail('Choose a new stage.')
      if (offerStages.includes(application.stage) && !['rejected', 'withdrawn'].includes(to) && !(to === 'pre_boarding' && application.stage === 'accepted')) return fail('Offer stages follow the offer. Use the offer actions, or reject or withdraw.')
      if ((to === 'rejected' || to === 'withdrawn') && !reason) return fail(`Record the reason the application was ${to}.`)
      if (to === 'pre_boarding' && application.stage !== 'accepted') return fail('Pre-boarding starts after the offer is accepted.')
      if (to === 'references_credentials' && application.decision !== 'hire') return fail('References and credentials start after a hire decision at the debrief.')
      if (to === 'debrief') {
        const live = (await liveScorecards(database, id)).filter((card) => !card.conflict_declared)
        if (!live.length) return fail('Schedule the interview loop and assign interviewers first.')
        if (live.some((card) => card.status !== 'submitted')) return fail('Every interviewer must submit their scorecard before the debrief.')
      }
      const extra: Record<string, unknown> = to === 'rejected' ? { rejection_reason: reason } : to === 'withdrawn' ? { withdrawal_reason: reason } : {}
      if (channel) extra.last_candidate_contact_at = new Date().toISOString()
      const moved = await moveStage(database, application, to, user.id, [reason, note].filter(Boolean).join(' — '), extra)
      if (!moved) return fail('The application changed while you were editing. Reload and try again.', 409)
      if (channel) await recordEvent(database, { application_id: id, note: `Candidate told: moved to ${labelOf(applicationStages, to)}.`, communication_sent: true, communication_channel: channel, changed_by: user.id })
      if (to === 'rejected' || to === 'withdrawn') await database.from('hr_offers').update({ status: 'withdrawn' }).eq('application_id', id).in('status', ['draft', 'pending_approval', 'approved', 'sent'])
      await logHr(context, { action: 'stage', entityType: 'hr_application', entityId: id, description: `Moved ${name} to ${labelOf(applicationStages, to)}` })
      return NextResponse.json({ application: moved })
    }

    if (body.action === 'hire') return hire(context, application)
    return fail('Unknown action.')
  } catch (error) { return serverError(error, 'updating application', 'Failed to update the application.') }
}

// The 'hired' handover: create the employee record with the minimum fields,
// link it to the application, and move the application's credentials and
// documents onto the employee file (logged in hr_retention_log). People Ops
// completes the rest of the file, the portal account and the onboarding list.
async function hire(context: RecruitingContext, application: HrApplication) {
  const { database, user } = context
  if (!['accepted', 'pre_boarding'].includes(application.stage)) return fail('Hire after the offer is accepted.')
  if (application.employee_id) return fail('This application is already linked to an employee.')
  const candidate = application.candidate; if (!candidate || candidate.anonymised_at) return fail('Candidate not found.')
  if (!application.department) return fail('Set the department on the opening before hiring.')
  const { data: offer } = await database.from('hr_offers').select('*').eq('application_id', application.id).eq('status', 'accepted').order('responded_at', { ascending: false }).limit(1).maybeSingle()
  if (!offer) return fail('Record the accepted offer first.')
  const [{ data: opening }, { data: manager }, { data: byPersonal }, { data: byWork }] = await Promise.all([
    application.career_opening_id ? database.from('career_openings').select('location').eq('id', application.career_opening_id).maybeSingle() : Promise.resolve({ data: null }),
    application.hiring_manager_id ? database.from('hr_employees').select('id').eq('auth_user_id', application.hiring_manager_id).maybeSingle() : Promise.resolve({ data: null }),
    database.from('hr_employees').select('id,status').eq('personal_email', candidate.email).neq('status', 'exited').limit(1),
    database.from('hr_employees').select('id,status').eq('work_email', candidate.email).neq('status', 'exited').limit(1),
  ])
  // An existing current employee (internal move) is linked, not duplicated; People owns their file.
  let employeeId: string | null = byPersonal?.[0]?.id || byWork?.[0]?.id || null; const linked = !!employeeId
  if (!employeeId) {
    const today = lagosDate(); const start = offer.start_date as string | null
    const status: EmployeeStatus = !start || start > today ? 'pre_start' : offer.probation_months > 0 ? 'probation' : 'active'
    const { data: employee, error } = await database.from('hr_employees').insert({
      legal_name: candidate.full_name, personal_email: candidate.email, phone: candidate.phone, job_title: offer.job_title, department: application.department,
      employment_type: offer.employment_type, location: opening?.location || null, line_manager_id: manager?.id || null, career_opening_id: application.career_opening_id,
      start_date: start, probation_end_date: start && offer.probation_months ? addMonths(start, offer.probation_months) : null, status, created_by: user.id,
    }).select('id').single()
    if (error) throw error
    employeeId = employee.id
  }
  const moved = await moveStage(database, application, 'hired', user.id, linked ? 'Hired: linked to the existing employee record.' : 'Hired: employee record created; application evidence moved to the employee file.', { employee_id: employeeId })
  if (!moved) { if (!linked) await database.from('hr_employees').delete().eq('id', employeeId); return fail('The application changed while you were editing. Reload and try again.', 409) }

  const rule = 'Hired: licence, qualification and identity evidence moves to the employee file (recruiting-process.md 8)'; const log: Record<string, unknown>[] = []
  const { data: credentials, error: credentialError } = await database.from('hr_credentials').update({ employee_id: employeeId }).eq('application_id', application.id).is('employee_id', null).select('id')
  if (credentialError) throw credentialError
  for (const row of credentials || []) log.push({ entity_type: 'hr_credentials', record_id: row.id, action: 'moved_to_employee_file', retention_rule: rule, performed_by: user.id })
  const { data: documents, error: documentError } = await database.from('hr_documents').select('id,storage_path').eq('application_id', application.id).is('employee_id', null).neq('status', 'deleted')
  if (documentError) throw documentError
  for (const document of documents || []) {
    const target = `employees/${employeeId}/${document.storage_path.split('/').pop()}`
    const { error: moveError } = await database.storage.from(hrDocumentBucket).move(document.storage_path, target)
    if (moveError) console.error('Could not move HR document file:', moveError.message)
    await database.from('hr_documents').update({ employee_id: employeeId, ...(moveError ? {} : { storage_path: target }) }).eq('id', document.id)
    if (!moveError && application.cv_path === document.storage_path) await database.from('hr_applications').update({ cv_path: target }).eq('id', application.id)
    log.push({ entity_type: 'hr_documents', record_id: document.id, action: 'moved_to_employee_file', retention_rule: rule, performed_by: user.id })
  }
  if (log.length) { const { error } = await database.from('hr_retention_log').insert(log); if (error) console.error('Error writing retention log:', error.message) }
  await refreshCandidateRetention(database, candidate.id)
  if (application.requisition_id) {
    const [{ data: requisition }, { count }] = await Promise.all([
      database.from('hr_requisitions').select('headcount').eq('id', application.requisition_id).maybeSingle(),
      database.from('hr_applications').select('id', { count: 'exact', head: true }).eq('requisition_id', application.requisition_id).eq('stage', 'hired'),
    ])
    if (requisition && (count || 0) >= requisition.headcount) await database.from('hr_requisitions').update({ status: 'filled' }).eq('id', application.requisition_id)
  }
  await logHr(context, { action: 'hire', entityType: 'hr_employee', entityId: employeeId, description: `Hired ${candidate.full_name} as ${offer.job_title}`, metadata: { applicationId: application.id, linkedExisting: linked, moved: log.length } })
  return NextResponse.json({ employee_id: employeeId, linked_existing: linked, moved: log.length })
}
