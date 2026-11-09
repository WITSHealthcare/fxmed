import type { NextRequest } from 'next/server'
import { cleanHrDate, cleanHrEnum, cleanHrText, cleanHrUuid, displayName, improvementPlanStatuses, labelOf, values } from '@/lib/hr'
import { addDays, type HrImprovementPlan, type PlanGap } from '@/lib/hr-performance'
import { denied, employeeFor, failure, invalid, isAdmin, json, log, performanceContext, readBody } from '../shared'

const planStatusValues = values(improvementPlanStatuses)
function cleanGaps(value: unknown): PlanGap[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 6).flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const gap = raw as Record<string, unknown>; const area = cleanHrText(gap.area, 300)
    return area ? [{ area, standard: cleanHrText(gap.standard, 1000), measure: cleanHrText(gap.measure, 1000), support: cleanHrText(gap.support, 1000) }] : []
  })
}

// Capability plans (performance-management.md section 6): 2–4 gaps, 60 days by
// default, weekly written check-ins, outcome decided by People Ops.
export async function POST(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  try {
    const body = await readBody(request); if (!body) return invalid('A plan is required.')
    const found = await employeeFor(context, body.employee_id, 'review', 'write'); if ('response' in found) return found.response
    const { employee, relation } = found
    if (!isAdmin(context) && relation !== 'report') return denied('Improvement plans are set by the line manager or People Ops.')
    const start = cleanHrDate(body.start_date) || context.today; const end = cleanHrDate(body.end_date) || addDays(start, 60)
    if (end < addDays(start, 30) || end > addDays(start, 90)) return invalid('A plan runs for 30 to 90 days.')
    const gaps = cleanGaps(body.gaps); const status = cleanHrEnum(body.status, ['informal_support', 'active'] as const) || 'active'
    if (status === 'active' && (gaps.length < 2 || gaps.length > 4)) return invalid('A formal plan lists 2 to 4 specific gaps.')
    if (!gaps.length) return invalid('Describe at least one gap.')
    const { data, error } = await context.database.from('hr_improvement_plans').insert({ employee_id: employee.id, manager_id: context.user.id, start_date: start, end_date: end, gaps, status }).select('*').single()
    if (error) throw error
    await log(context, employee, { action: 'create_improvement_plan', description: `Started ${labelOf(improvementPlanStatuses, status).toLowerCase()} for ${displayName(employee)}`, entityType: 'hr_improvement_plan', entityId: data.id })
    return json({ plan: data }, 201)
  } catch (error) { return failure(error, 'Failed to create the plan') }
}

export async function PATCH(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  try {
    const body = await readBody(request); const id = cleanHrUuid(body?.id); if (!body || !id) return invalid('A valid plan is required.')
    const { data: plan, error: loadError } = await context.database.from('hr_improvement_plans').select('*').eq('id', id).maybeSingle(); if (loadError) throw loadError
    if (!plan) return json({ error: 'Plan not found.' }, 404)
    const current = plan as HrImprovementPlan
    const found = await employeeFor(context, current.employee_id, 'review', 'write'); if ('response' in found) return found.response
    const { employee, relation } = found; const admin = isAdmin(context)
    if (!admin && relation !== 'report') return denied('The employee receives every check-in note; the manager writes them.')
    const open = ['informal_support', 'active', 'extended'].includes(current.status); const action = cleanHrText(body.action, 20)
    let update: Record<string, unknown>; let description: string
    if (action === 'check_in') {
      if (!open) return invalid('This plan is closed.')
      const note = cleanHrText(body.note, 4000); if (!note) return invalid('Write the check-in note.')
      const onTrack = body.on_track === true ? true : body.on_track === false ? false : null
      update = { check_ins: [...current.check_ins, { date: cleanHrDate(body.date) || context.today, note, by: context.user.email || 'Manager', on_track: onTrack }] }
      description = 'Recorded a plan check-in'
    } else if (action === 'update') {
      if (!open) return invalid('This plan is closed.')
      const gaps = cleanGaps(body.gaps); if (!gaps.length) return invalid('Describe at least one gap.')
      update = { gaps }; description = 'Updated plan gaps'
    } else if (action === 'outcome') {
      if (!admin) return denied('Plan outcomes are confirmed by People Ops.')
      const status = cleanHrEnum(body.status, planStatusValues); if (!status) return invalid('Choose the plan status.')
      update = { status, outcome_notes: cleanHrText(body.outcome_notes, 4000) }
      if (status === 'extended') {
        const to = cleanHrDate(body.extended_to)
        if (current.extended_to) return invalid('A plan can be extended once.')
        if (!to || to <= current.end_date || to > addDays(current.end_date, 30)) return invalid('Extend by up to 30 days after the current end date.')
        update.extended_to = to
      }
      if (['passed', 'not_passed'].includes(status) && !cleanHrText(body.outcome_notes, 4000)) return invalid('Record the outcome and reasons.')
      description = `Set plan to ${labelOf(improvementPlanStatuses, status).toLowerCase()}`
    } else return invalid('Unknown plan action.')
    const { data, error } = await context.database.from('hr_improvement_plans').update(update).eq('id', id).select('*').single(); if (error) throw error
    await log(context, employee, { action: `improvement_plan_${action}`, description: `${description} for ${displayName(employee)}`, entityType: 'hr_improvement_plan', entityId: id })
    return json({ plan: data })
  } catch (error) { return failure(error, 'Failed to update the plan') }
}
