import { NextRequest, NextResponse } from 'next/server'
import { lagosDate } from '@/lib/follow-ups'
import { cleanHrDate, cleanHrEnum, cleanHrNumber, cleanHrOptionalText, cleanHrText, cleanHrUuid, hrEmploymentTypes } from '@/lib/hr'
import { addWorkingDays, endOfLagosDay, isClosedStage, liveOfferStatuses, missingApprovals, offerApprovalRoles, offerApprovalRules, offerResponseWorkingDays, type HrApplication, type HrOffer, type OfferApproval } from '@/lib/hr-recruiting'
import { currentBand, fail, loadHolidays, logHr, moveStage, readJson, recordEvent, recruitingContext, serverError, type HrDatabase } from '../shared'

// Offers (admin only: pay and band are never shown to other staff). Draft →
// submitted for approval once references and credentials are clear →
// approved by the MD (and Medical Director where section 6 requires) → sent
// → accepted or declined. Offer actions move the application through the
// offer stages and write the stage events.
const roleValues = offerApprovalRoles.map((item) => item.value)
function terms(body: Record<string, unknown>) {
  const money = (value: unknown) => cleanHrNumber(value, 0, 1e11) ?? 0
  return {
    job_title: cleanHrText(body.job_title, 160), employment_type: cleanHrEnum(body.employment_type, hrEmploymentTypes) || 'Full-time', band_code: cleanHrOptionalText(body.band_code, 20),
    basic_ngn: money(body.basic_ngn), housing_ngn: money(body.housing_ngn), transport_ngn: money(body.transport_ngn), other_allowances_ngn: money(body.other_allowances_ngn),
    locum_session_rate_ngn: cleanHrNumber(body.locum_session_rate_ngn, 0, 1e11), commission_terms: cleanHrOptionalText(body.commission_terms, 2000), sign_on_bonus_ngn: cleanHrNumber(body.sign_on_bonus_ngn, 0, 1e11),
    above_midpoint_reason: cleanHrOptionalText(body.above_midpoint_reason, 2000), start_date: cleanHrDate(body.start_date), probation_months: Math.trunc(cleanHrNumber(body.probation_months, 0, 12) ?? 3),
    notice_terms: cleanHrOptionalText(body.notice_terms, 1000), contract_type: body.contract_type === 'services_agreement' ? 'services_agreement' : 'employment', conditions: cleanHrOptionalText(body.conditions, 3000),
  }
}
async function loadApplication(database: HrDatabase, id: string) {
  const { data } = await database.from('hr_applications').select('*, candidate:hr_candidates(full_name)').eq('id', id).maybeSingle()
  return data as HrApplication | null
}
// References: two clear and none of concern. Credentials: at least one, all verified current.
async function checksClear(database: HrDatabase, applicationId: string) {
  const [{ data: references }, { data: credentials }] = await Promise.all([
    database.from('hr_reference_checks').select('outcome').eq('application_id', applicationId),
    database.from('hr_credentials').select('status').eq('application_id', applicationId).neq('status', 'superseded'),
  ])
  const refs = references || []; const creds = credentials || []
  return { references: refs.filter((row) => row.outcome === 'clear').length >= 2 && !refs.some((row) => row.outcome === 'concern'), credentials: creds.length > 0 && creds.every((row) => row.status === 'current') }
}

export async function POST(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  const body = await readJson(request); const applicationId = cleanHrUuid(body?.application_id)
  if (!body || !applicationId) return fail('A valid application is required.')
  try {
    const application = await loadApplication(database, applicationId)
    if (!application || isClosedStage(application.stage)) return fail('Offers can be made only on open applications.')
    if (application.decision !== 'hire') return fail('Record the hire decision at the debrief before drafting an offer.')
    const { count } = await database.from('hr_offers').select('id', { count: 'exact', head: true }).eq('application_id', applicationId).in('status', liveOfferStatuses)
    if (count) return fail('This application already has a live offer. Withdraw it before drafting another.')
    const clean = terms({ job_title: application.opening_title, ...body }); if (!clean.job_title) return fail('Enter the job title.')
    const { data, error } = await database.from('hr_offers').insert({ ...clean, application_id: applicationId, created_by: user.id }).select('*').single(); if (error) throw error
    await logHr(context, { action: 'create', entityType: 'hr_offer', entityId: data.id, description: `Drafted an offer for ${application.opening_title}` })
    return NextResponse.json({ offer: data }, { status: 201 })
  } catch (error) { return serverError(error, 'creating offer', 'Failed to create the offer.') }
}

export async function PATCH(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  const body = await readJson(request); const id = cleanHrUuid(body?.id); if (!body || !id) return fail('A valid offer is required.')
  try {
    const { data: found, error: loadError } = await database.from('hr_offers').select('*').eq('id', id).maybeSingle(); if (loadError) throw loadError
    const offer = found as HrOffer | null; const application = offer && await loadApplication(database, offer.application_id)
    if (!offer || !application) return fail('Offer not found.', 404)
    if (isClosedStage(application.stage)) return fail('This application is closed.')
    const name = application.candidate?.full_name || 'candidate'; const now = new Date().toISOString()
    const update = async (values: Record<string, unknown>, from: HrOffer['status'][]) => {
      const { data, error } = await database.from('hr_offers').update(values).eq('id', id).in('status', from).select('*').maybeSingle(); if (error) throw error
      return data as HrOffer | null
    }
    const done = async (saved: HrOffer | null, description: string) => {
      if (!saved) return fail('The offer changed while you were editing. Reload and try again.', 409)
      await logHr(context, { action: `offer_${String(body.action)}`, entityType: 'hr_offer', entityId: id, description: `${description} — ${name}` })
      return NextResponse.json({ offer: saved })
    }

    switch (body.action) {
      case 'save': {
        if (offer.status !== 'draft') return fail('Only a draft offer can be edited. Return it to draft first.')
        const clean = terms(body); if (!clean.job_title) return fail('Enter the job title.')
        return done(await update(clean, ['draft']), 'Edited offer terms')
      }
      case 'submit': {
        if (offer.status !== 'draft') return fail('Only a draft offer can be sent for approval.')
        if (!['references_credentials', 'offer_approval', 'offer_extended'].includes(application.stage)) return fail('Move the application to References and credentials first.')
        if (!offer.start_date) return fail('Set the start date.')
        if (offer.employment_type === 'Locum' ? !offer.locum_session_rate_ngn : !Number(offer.gross_monthly_ngn)) return fail(offer.employment_type === 'Locum' ? 'Enter the session rate.' : 'Enter the pay split.')
        const clear = await checksClear(database, application.id)
        if (!clear.references) return fail('References are not clear: record two clear references (one a recent line manager or supervisor) and resolve any concern.')
        if (!clear.credentials) return fail('Credentials are not clear: every identity, qualification and licence check must be verified current.')
        const rules = offerApprovalRules(offer, application.department, await currentBand(database, offer.band_code))
        if (rules.needsReason && !offer.above_midpoint_reason) return fail('This offer is above the band midpoint. Write the reason (experience, scarcity, competing offer).')
        const saved = await update({ status: 'pending_approval', approvals: [], references_clear: true, credentials_clear: true }, ['draft'])
        if (saved && ['references_credentials', 'offer_extended'].includes(application.stage)) await moveStage(database, application, 'offer_approval', user.id, `Offer sent for approval (${rules.roles.map((role) => offerApprovalRoles.find((item) => item.value === role)?.label).join(' + ')}).`)
        return done(saved, 'Sent offer for approval')
      }
      case 'approve': {
        const role = cleanHrEnum(body.role, roleValues); if (!role) return fail('Choose the capacity you approve in.')
        if (offer.status !== 'pending_approval') return fail('This offer is not awaiting approval.')
        const rules = offerApprovalRules(offer, application.department, await currentBand(database, offer.band_code))
        if (!rules.roles.includes(role)) return fail('This approval is not required for this offer.')
        if (offer.approvals.some((item) => item.role === role)) return fail('Already approved in that capacity.')
        const approvals: OfferApproval[] = [...offer.approvals, { approver_id: user.id, approver_email: user.email || null, role, approved_at: now }]
        const complete = !missingApprovals(rules.roles, approvals).length
        const saved = await update({ approvals, status: complete ? 'approved' : 'pending_approval' }, ['pending_approval'])
        if (saved) await recordEvent(database, { application_id: application.id, note: `Offer approved by ${offerApprovalRoles.find((item) => item.value === role)?.label}${complete ? '; all approvals in place.' : '.'}`, changed_by: user.id })
        return done(saved, `Approved offer as ${role}`)
      }
      case 'return': {
        const reason = cleanHrText(body.reason, 1000); if (!reason) return fail('Say what needs to change.')
        const saved = await update({ status: 'draft', approvals: [] }, ['pending_approval', 'approved'])
        if (saved) await recordEvent(database, { application_id: application.id, note: `Offer returned to draft: ${reason}`, changed_by: user.id })
        return done(saved, 'Returned offer to draft')
      }
      case 'send': {
        if (offer.status !== 'approved') return fail('The offer must be fully approved before it is sent.')
        const due = endOfLagosDay(addWorkingDays(lagosDate(), offerResponseWorkingDays, await loadHolidays(database)))
        const saved = await update({ status: 'sent', sent_at: now, response_due_at: due }, ['approved'])
        if (saved) {
          await moveStage(database, application, 'offer_extended', user.id, 'Written offer sent after a verbal call.', { last_candidate_contact_at: now })
          await recordEvent(database, { application_id: application.id, note: 'Offer sent to the candidate.', communication_sent: true, communication_channel: cleanHrEnum(body.channel, ['email', 'phone', 'whatsapp', 'in_person', 'other'] as const) || 'email', changed_by: user.id })
        }
        return done(saved, 'Sent offer')
      }
      case 'accept': {
        const saved = await update({ status: 'accepted', responded_at: now }, ['sent'])
        if (saved) await moveStage(database, application, 'accepted', user.id, 'Candidate accepted the offer.')
        return done(saved, 'Recorded offer acceptance')
      }
      case 'decline': {
        const reason = cleanHrText(body.reason, 1000); if (!reason) return fail('Record the reason the candidate gave.')
        const saved = await update({ status: 'declined', responded_at: now, decline_reason: reason }, ['sent'])
        if (saved) await recordEvent(database, { application_id: application.id, note: `Candidate declined the offer: ${reason}`, changed_by: user.id })
        return done(saved, 'Recorded offer decline')
      }
      case 'withdraw': {
        const reason = cleanHrText(body.reason, 1000); if (!reason) return fail('Record why FXMed is withdrawing the offer.')
        const saved = await update({ status: 'withdrawn', decline_reason: reason }, ['draft', 'pending_approval', 'approved', 'sent'])
        if (saved) await recordEvent(database, { application_id: application.id, note: `Offer withdrawn: ${reason}`, changed_by: user.id })
        return done(saved, 'Withdrew offer')
      }
      case 'expire': {
        if (offer.status !== 'sent' || !offer.response_due_at || Date.parse(offer.response_due_at) > Date.now()) return fail('Only a sent offer past its response date can expire.')
        const saved = await update({ status: 'expired' }, ['sent'])
        if (saved) await recordEvent(database, { application_id: application.id, note: 'Offer expired without a response.', changed_by: user.id })
        return done(saved, 'Marked offer expired')
      }
      default: return fail('Unknown action.')
    }
  } catch (error) { return serverError(error, 'updating offer', 'Failed to update the offer.') }
}
