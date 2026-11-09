import type { NextRequest } from 'next/server'
import { cleanHrDate, cleanHrEnum, cleanHrNumber, cleanHrText, cleanHrUuid, displayName, goalStatuses, values } from '@/lib/hr'
import { forbiddenGoalTerm, goalTermError, type HrGoal } from '@/lib/hr-performance'
import { denied, employeeFor, failure, invalid, isAdmin, json, log, performanceContext, readBody } from '../shared'

const goalStatusValues = values(goalStatuses)
function goalFields(body: Record<string, unknown>) {
  return {
    title: cleanHrText(body.title, 300), measure: cleanHrText(body.measure, 2000), target: cleanHrText(body.target, 1000), data_source: cleanHrText(body.data_source, 500),
    is_development_goal: body.is_development_goal === true, due_date: cleanHrDate(body.due_date),
  }
}

// Goals and KPIs per year. The employee drafts and updates progress; the line
// manager agrees, tracks and rates. Test, supplement, diagnosis and upgrade targets are refused.
export async function POST(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  try {
    const body = await readBody(request); if (!body) return invalid('A goal is required.')
    const found = await employeeFor(context, body.employee_id, 'review', 'write'); if ('response' in found) return found.response
    const { employee, relation } = found; const manager = isAdmin(context) || relation === 'report'
    const fields = goalFields(body); if (!fields.title) return invalid('Give the goal a title.')
    const term = forbiddenGoalTerm(fields.title, fields.measure, fields.target); if (term) return invalid(goalTermError(term))
    const year = cleanHrNumber(body.review_year, 2020, 2100) ?? Number(context.today.slice(0, 4))
    const status = manager ? cleanHrEnum(body.status, goalStatusValues) || 'draft' : 'draft'
    const { data, error } = await context.database.from('hr_goals').insert({ ...fields, employee_id: employee.id, review_year: Math.round(year), status, agreed_at: status === 'agreed' ? new Date().toISOString() : null, created_by: context.user.id }).select('*').single()
    if (error) throw error
    await log(context, employee, { action: 'create_goal', description: `Added goal “${fields.title}” for ${displayName(employee)}`, entityType: 'hr_goal', entityId: data.id })
    return json({ goal: data }, 201)
  } catch (error) { return failure(error, 'Failed to add the goal') }
}

export async function PATCH(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  try {
    const body = await readBody(request); const id = cleanHrUuid(body?.id); if (!body || !id) return invalid('A valid goal is required.')
    const { data: goal, error: loadError } = await context.database.from('hr_goals').select('*').eq('id', id).maybeSingle(); if (loadError) throw loadError
    if (!goal) return json({ error: 'Goal not found.' }, 404)
    const current = goal as HrGoal
    const found = await employeeFor(context, current.employee_id, 'review', 'write'); if ('response' in found) return found.response
    const { employee, relation } = found; const manager = isAdmin(context) || relation === 'report'
    let update: Record<string, unknown> = { progress_notes: cleanHrText(body.progress_notes, 4000) }
    if (manager || current.status === 'draft') {
      const fields = goalFields(body); if (!fields.title) return invalid('Give the goal a title.')
      const term = forbiddenGoalTerm(fields.title, fields.measure, fields.target); if (term) return invalid(goalTermError(term))
      update = { ...update, ...fields }
    }
    if (manager) {
      const status = cleanHrEnum(body.status, goalStatusValues) || current.status; const rating = cleanHrNumber(body.rating, 1, 5)
      update = { ...update, status, rating: rating === null ? null : Math.round(rating), agreed_at: current.agreed_at || (status !== 'draft' && status !== 'dropped' ? new Date().toISOString() : null) }
    } else if (body.status !== undefined && body.status !== current.status) return denied('Your line manager agrees and closes goals.')
    const { data, error } = await context.database.from('hr_goals').update(update).eq('id', id).select('*').single(); if (error) throw error
    await log(context, employee, { action: 'update_goal', description: `Updated goal “${data.title}” for ${displayName(employee)}`, entityType: 'hr_goal', entityId: id, metadata: { status: data.status } })
    return json({ goal: data })
  } catch (error) { return failure(error, 'Failed to update the goal') }
}

export async function DELETE(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  try {
    const id = cleanHrUuid(new URL(request.url).searchParams.get('id')); if (!id) return invalid('A valid goal is required.')
    const { data: goal } = await context.database.from('hr_goals').select('id,employee_id,title,status').eq('id', id).maybeSingle()
    if (!goal) return json({ error: 'Goal not found.' }, 404)
    const found = await employeeFor(context, goal.employee_id, 'review', 'write'); if ('response' in found) return found.response
    if (!isAdmin(context) && !(found.relation === 'report' || goal.status === 'draft')) return denied('Agreed goals are dropped by your line manager, not deleted.')
    const { error } = await context.database.from('hr_goals').delete().eq('id', id); if (error) throw error
    await log(context, found.employee, { action: 'delete_goal', description: `Deleted goal “${goal.title}” for ${displayName(found.employee)}`, entityType: 'hr_goal', entityId: id })
    return json({ success: true })
  } catch (error) { return failure(error, 'Failed to delete the goal') }
}
