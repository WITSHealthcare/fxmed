import type { NextRequest } from 'next/server'
import { cleanHrDate, cleanHrEnum, cleanHrNumber, cleanHrOptionalText, cleanHrText, cleanHrTimestamp, cleanHrUuid, displayName, ethicsOverrideMaxRating, labelOf, reviewTypes, values, type ReviewType } from '@/lib/hr'
import { addMonths, addWorkingDays, defaultOffboardingItems, isRated, probationCheckIns, addDays, secondReviewWindowDays, type HrReview } from '@/lib/hr-performance'
import { lagosDate } from '@/lib/follow-ups'
import { denied, employeeFor, failure, holidayDates, invalid, isAdmin, json, log, performanceContext, readBody, type PerformanceContext, type EmployeeRow } from '../shared'

const reviewTypeValues = values(reviewTypes)
const staffCreatable: ReviewType[] = ['week_1', 'day_30', 'day_60', 'day_90', 'mid_year', 'annual']
const signoffPattern = /^training:[0-9a-f-]{36}:[A-Za-z0-9_-]{1,80}$/

// 1–5 scores keyed by area; anything else is dropped.
function cleanScores(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 30).flatMap(([key, score]) => {
    const name = cleanHrText(key, 80); const number = cleanHrNumber(score, 1, 5)
    return name && name !== 'self' && number !== null ? [[name, Math.round(number)]] : []
  }))
}
const cleanRating = (value: unknown) => { const number = cleanHrNumber(value, 1, 5); return number === null ? null : Math.round(number) }

async function managerUserId(context: PerformanceContext, employee: EmployeeRow) {
  if (!employee.line_manager_id) return null
  const { data } = await context.database.from('hr_employees').select('auth_user_id').eq('id', employee.line_manager_id).maybeSingle()
  return (data?.auth_user_id as string | null) || null
}

// Schedule a review, or the four probation check-ins plus the decision.
export async function POST(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  try {
    const body = await readBody(request); if (!body) return invalid('A review is required.')
    const found = await employeeFor(context, body.employee_id, 'review', 'write'); if ('response' in found) return found.response
    const { employee, relation } = found; const admin = isAdmin(context)
    if (!admin && relation !== 'report') return denied('Reviews are scheduled by the line manager or People Ops.')
    const reviewer = relation === 'report' ? context.user.id : await managerUserId(context, employee)
    if (body.action === 'schedule_probation') {
      if (!admin) return denied('People Ops schedules probation reviews.')
      if (!employee.start_date) return invalid('Add a start date to the employee record first.')
      const { data: existing, error } = await context.database.from('hr_reviews').select('review_type').eq('employee_id', employee.id).in('review_type', ['week_1', 'day_30', 'day_60', 'day_90', 'probation_decision']).neq('status', 'cancelled')
      if (error) throw error
      const have = new Set((existing || []).map((row) => row.review_type))
      const rows = [...probationCheckIns.map(({ type, offset }) => ({ type, date: addDays(employee.start_date!, offset) })), { type: 'probation_decision' as ReviewType, date: employee.probation_end_date || addDays(employee.start_date, 90) }]
        .filter((row) => !have.has(row.type)).map((row) => ({ employee_id: employee.id, review_type: row.type, scheduled_date: row.date, review_year: Number(row.date.slice(0, 4)), reviewer_id: reviewer, created_by: context.user.id }))
      if (!rows.length) return invalid('Probation reviews are already scheduled.')
      const { data, error: insertError } = await context.database.from('hr_reviews').insert(rows).select('*'); if (insertError) throw insertError
      await log(context, employee, { action: 'schedule_probation_reviews', description: `Scheduled probation reviews for ${displayName(employee)}`, entityType: 'hr_employee', entityId: employee.id, metadata: { types: rows.map((row) => row.review_type) } })
      return json({ reviews: data }, 201)
    }
    const type = cleanHrEnum(body.review_type, reviewTypeValues); if (!type) return invalid('Choose a review type.')
    if (!admin && !staffCreatable.includes(type)) return denied('The probation decision is recorded by People Ops.')
    const scheduled = cleanHrDate(body.scheduled_date) || context.today
    const { data, error } = await context.database.from('hr_reviews').insert({
      employee_id: employee.id, review_type: type, scheduled_date: scheduled, review_year: cleanHrNumber(body.review_year, 2020, 2100) ?? Number(scheduled.slice(0, 4)), reviewer_id: reviewer, created_by: context.user.id,
    }).select('*').single()
    if (error) throw error
    await log(context, employee, { action: 'schedule_review', description: `Scheduled a ${labelOf(reviewTypes, type).toLowerCase()} for ${displayName(employee)}`, entityType: 'hr_review', entityId: data.id })
    return json({ review: data }, 201)
  } catch (error) { return failure(error, 'Failed to schedule the review') }
}

export async function PATCH(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  try {
    const body = await readBody(request); const id = cleanHrUuid(body?.id); if (!body || !id) return invalid('A valid review is required.')
    const { data: review, error: loadError } = await context.database.from('hr_reviews').select('*').eq('id', id).maybeSingle(); if (loadError) throw loadError
    if (!review) return json({ error: 'Review not found.' }, 404)
    const current = review as HrReview
    const found = await employeeFor(context, current.employee_id, 'review', 'write'); if ('response' in found) return found.response
    const { employee, relation } = found; const admin = isAdmin(context); const self = relation === 'self'; const manager = relation === 'report' || admin
    const closed = current.status === 'final' || current.status === 'cancelled'
    const now = new Date().toISOString(); let update: Record<string, unknown> = {}; let description = ''
    const action = cleanHrText(body.action, 40)

    if (action === 'self_review') {
      if (!self) return denied('Only the employee writes their self-review.')
      if (!['scheduled', 'self_review'].includes(current.status)) return invalid('The self-review is closed for this review.')
      update = { self_review: cleanHrText(body.self_review, 8000), scores: { ...current.scores, self: cleanScores(body.self_scores) }, status: body.submit ? 'manager_review' : 'self_review' }
      description = body.submit ? 'Submitted a self-review' : 'Saved a self-review draft'
    } else if (action === 'manager_review') {
      if (!manager || (self && !admin)) return denied('Only the line manager or People Ops writes the manager review.')
      if (closed || (current.status === 'calibration' && !admin)) return invalid('This review is with People Ops for calibration or already final.')
      if (current.review_type === 'probation_decision') return invalid('Record the probation decision with the decision form.')
      const rating = isRated(current.review_type) ? cleanRating(body.overall_rating) : null
      const ethics = admin ? body.ethics_override === true : current.ethics_override
      const ethicsReason = admin ? cleanHrOptionalText(body.ethics_override_reason, 2000) : current.ethics_override_reason
      if (ethics && !ethicsReason) return invalid('Give the substantiated breach that triggers the ethics override.')
      const signoff = cleanHrOptionalText(body.clinical_signoff_ref, 200)
      if (signoff && (current.review_type !== 'day_90' || !signoffPattern.test(signoff))) return invalid('Choose the training sign-off response for the 90-day review.')
      if (body.submit && isRated(current.review_type) && !rating) return invalid('Choose an overall rating before sending for calibration.')
      if (body.submit && !cleanHrText(body.manager_summary, 8000)) return invalid('Write the review summary before signing it off.')
      update = {
        manager_summary: cleanHrText(body.manager_summary, 8000), improvement_actions: cleanHrText(body.improvement_actions, 8000), scores: { ...cleanScores(body.scores), ...(current.scores.self ? { self: current.scores.self } : {}) },
        overall_rating: rating !== null && ethics ? Math.min(rating, ethicsOverrideMaxRating) : rating, ethics_override: ethics, ethics_override_reason: ethics ? ethicsReason : null,
        calibrated_rating: ethics && current.calibrated_rating ? Math.min(current.calibrated_rating, ethicsOverrideMaxRating) : current.calibrated_rating,
        held_at: cleanHrTimestamp(body.held_at) || current.held_at, scheduled_date: cleanHrDate(body.scheduled_date) || current.scheduled_date,
        ...(current.review_type === 'day_90' ? { clinical_signoff_ref: signoff } : {}), reviewer_id: current.reviewer_id || context.user.id,
        status: body.submit ? (current.review_type === 'annual' ? 'calibration' : 'final') : 'manager_review',
        ...(body.submit && current.review_type !== 'annual' ? { manager_signed_at: now } : {}),
      }
      description = body.submit ? (current.review_type === 'annual' ? 'Sent an appraisal for calibration' : 'Signed off a review') : 'Saved a manager review draft'
    } else if (action === 'finalise') {
      if (!admin) return denied('Calibration and final ratings are confirmed by People Ops.')
      if (current.review_type !== 'annual' || !['calibration', 'manager_review'].includes(current.status)) return invalid('Only an appraisal in calibration can be finalised.')
      const calibrated = cleanRating(body.calibrated_rating) ?? current.overall_rating
      if (!calibrated) return invalid('Choose the calibrated rating.')
      update = { calibrated_rating: current.ethics_override ? Math.min(calibrated, ethicsOverrideMaxRating) : calibrated, status: 'final', manager_signed_at: now }
      description = 'Finalised an appraisal rating'
    } else if (action === 'comment') {
      if (!self) return denied('Only the employee comments on their review.')
      if (current.status === 'cancelled') return invalid('This review was cancelled.')
      update = { employee_comment: cleanHrText(body.employee_comment, 4000) }; description = 'Added an employee comment to a review'
    } else if (action === 'acknowledge') {
      if (!self) return denied('Only the employee acknowledges their review.')
      if (current.status !== 'final') return invalid('Reviews are acknowledged once final.')
      update = { employee_acknowledged_at: now, ...(typeof body.employee_comment === 'string' ? { employee_comment: cleanHrText(body.employee_comment, 4000) } : {}) }; description = 'Acknowledged a review'
    } else if (action === 'request_second_review') {
      if (!self) return denied('Only the employee can ask for a second review.')
      if (current.review_type !== 'annual' || current.status !== 'final' || !current.manager_signed_at) return invalid('A second review can be requested on a final appraisal rating.')
      if (current.second_review_requested_at) return invalid('A second review has already been requested.')
      const final = lagosDate(current.manager_signed_at); const holidays = await holidayDates(context, final, addDays(final, 30))
      if (context.today > addWorkingDays(final, secondReviewWindowDays, holidays)) return invalid(`Second reviews must be requested within ${secondReviewWindowDays} working days of the final rating.`)
      const reason = cleanHrText(body.employee_comment, 4000); if (!reason) return invalid('Say why you disagree with the rating.')
      update = { second_review_requested_at: now, employee_comment: reason }; description = 'Requested a second review of an appraisal rating'
    } else if (action === 'second_review') {
      if (!admin) return denied('Second reviews are decided by the Admin.')
      if (!current.second_review_requested_at) return invalid('No second review was requested.')
      const outcome = cleanHrText(body.second_review_outcome, 4000); if (!outcome) return invalid('Record the outcome of the second review.')
      const rating = cleanRating(body.calibrated_rating)
      update = { second_review_outcome: outcome, ...(rating ? { calibrated_rating: current.ethics_override ? Math.min(rating, ethicsOverrideMaxRating) : rating } : {}) }; description = 'Decided a second review'
    } else if (action === 'probation_decision') {
      if (!admin) return denied('Probation outcomes are confirmed by People Ops.')
      if (current.review_type !== 'probation_decision' || closed) return invalid('This is not an open probation decision.')
      return decideProbation(context, current, employee, body)
    } else if (action === 'cancel') {
      if (!admin) return denied('Only People Ops cancels reviews.')
      if (closed) return invalid('This review is already closed.')
      update = { status: 'cancelled' }; description = 'Cancelled a review'
    } else return invalid('Unknown review action.')

    const { data, error } = await context.database.from('hr_reviews').update(update).eq('id', id).select('*').single(); if (error) throw error
    await log(context, employee, { action: `review_${action}`, description: `${description} (${labelOf(reviewTypes, current.review_type)}, ${displayName(employee)})`, entityType: 'hr_review', entityId: id })
    return json({ review: data })
  } catch (error) { return failure(error, 'Failed to update the review') }
}

// Confirmed, extended once by up to 3 months, or not confirmed (performance-management.md section 1).
async function decideProbation(context: PerformanceContext, review: HrReview, employee: EmployeeRow, body: Record<string, unknown>) {
  const outcome = cleanHrEnum(body.probation_outcome, ['confirmed', 'extended', 'not_confirmed'] as const); if (!outcome) return invalid('Choose the probation outcome.')
  const summary = cleanHrText(body.manager_summary, 8000); const actions = cleanHrText(body.improvement_actions, 8000)
  if (!summary) return invalid('Write the reasons for the decision; they go in the letter to the employee.')
  let newEnd: string | null = null
  if (outcome === 'extended') {
    newEnd = cleanHrDate(body.probation_new_end_date); const currentEnd = employee.probation_end_date || (employee.start_date ? addDays(employee.start_date, 90) : context.today)
    if (!newEnd || newEnd <= currentEnd) return invalid('Choose a new probation end date after the current one.')
    if (newEnd > addMonths(currentEnd, 3)) return invalid('Probation can be extended by up to 3 months.')
    if (!actions) return invalid('List what must improve and by when.')
    const { data: earlier } = await context.database.from('hr_reviews').select('id').eq('employee_id', employee.id).eq('probation_outcome', 'extended').limit(1)
    if (earlier?.length || employee.status === 'probation_extended') return invalid('Probation has already been extended once.')
  }
  const now = new Date().toISOString()
  const { data, error } = await context.database.from('hr_reviews').update({
    probation_outcome: outcome, probation_new_end_date: newEnd, manager_summary: summary, improvement_actions: actions, held_at: cleanHrTimestamp(body.held_at) || now,
    clinical_signoff_ref: cleanHrOptionalText(body.clinical_signoff_ref, 200), status: 'final', manager_signed_at: now, reviewer_id: review.reviewer_id || context.user.id,
  }).eq('id', review.id).select('*').single()
  if (error) throw error
  // Narrow update of hr_employees: probation fields and status only.
  const employeeUpdate = outcome === 'confirmed' ? { status: 'active', confirmed_at: now } : outcome === 'extended' ? { status: 'probation_extended', probation_end_date: newEnd } : { status: 'notice', leaving_reason: 'Probation not confirmed' }
  const { error: employeeError } = await context.database.from('hr_employees').update(employeeUpdate).eq('id', employee.id); if (employeeError) throw employeeError
  let caseId: string | null = null
  if (outcome === 'not_confirmed') {
    const { data: open } = await context.database.from('hr_offboarding_cases').select('id').eq('employee_id', employee.id).not('status', 'in', '(closed,cancelled)').maybeSingle()
    if (!open) {
      const { data: created, error: caseError } = await context.database.from('hr_offboarding_cases').insert({ employee_id: employee.id, exit_type: 'probation_not_confirmed', notice_received_at: context.today, created_by: context.user.id }).select('id').single()
      if (caseError) throw caseError
      caseId = created.id
      const { error: itemsError } = await context.database.from('hr_offboarding_items').insert(defaultOffboardingItems.map((item, index) => ({ case_id: created.id, category: item.category, item: item.item, owner: item.owner, sort_order: index })))
      if (itemsError) throw itemsError
    } else caseId = open.id
  }
  await log(context, employee, { action: 'probation_decision', description: `Probation ${outcome.replace('_', ' ')} for ${displayName(employee)}`, entityType: 'hr_review', entityId: review.id, metadata: { outcome, new_end_date: newEnd, offboarding_case_id: caseId } })
  return json({ review: data, offboardingCaseId: caseId, letterDue: addWorkingDays(context.today, 5, await holidayDates(context, context.today, addDays(context.today, 20))) })
}
