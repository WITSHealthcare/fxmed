import type { NextRequest } from 'next/server'
import { checklistOwners, cleanHrDate, cleanHrEnum, cleanHrNumber, cleanHrOptionalText, cleanHrText, cleanHrTimestamp, cleanHrUuid, displayName, exitTypes, hrDepartments, hrEmployeeWorkColumns, hrEmploymentTypes, labelOf, offboardingItemStatuses, offboardingStatuses, values } from '@/lib/hr'
import { addDays, defaultOffboardingItems, exitInterviewQuestions, offboardingCategories, type FinalPayItem, type HrOffboardingCase, type OffboardingTemplateItem } from '@/lib/hr-performance'
import { denied, employeeFor, failure, invalid, isAdmin, json, loadEmployee, log, performanceContext, readBody, type PerformanceContext } from '../shared'

const categoryValues = offboardingCategories.map((item) => item.value)
const ownerValues = values(checklistOwners)

function cleanTemplateItems(value: unknown): OffboardingTemplateItem[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 60).flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Record<string, unknown>; const text = cleanHrText(item.item, 300)
    return text ? [{ category: cleanHrEnum(item.category, categoryValues) || 'other', item: text, owner: cleanHrEnum(item.owner, ownerValues) || 'hr', due_offset_days: Math.round(cleanHrNumber(item.due_offset_days, -90, 90) ?? 0) }] : []
  })
}
function cleanFinalPay(value: unknown): FinalPayItem[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 30).flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Record<string, unknown>; const label = cleanHrText(item.label, 200); const amount = cleanHrNumber(item.amount_ngn, -1_000_000_000, 1_000_000_000)
    return label && amount !== null ? [{ label, amount_ngn: amount }] : []
  })
}
function cleanExitInterview(value: unknown) {
  if (!value || typeof value !== 'object') return {}
  const answers = value as Record<string, unknown>
  return Object.fromEntries(exitInterviewQuestions.flatMap(({ key }) => { const text = cleanHrText(answers[key], 4000); return text ? [[key, text]] : [] }))
}

// The real deactivation lives in Users & Roles; this only reads its activity log.
async function portalDeactivation(context: PerformanceContext, authUserId: string | null) {
  if (!authUserId) return { hasAccount: false, deactivatedAt: null as string | null }
  const { data } = await context.database.from('admin_activity_logs').select('action,created_at').eq('subject_user_id', authUserId).in('action', ['deactivate_user', 'reactivate_user']).order('created_at', { ascending: false }).limit(1)
  const latest = data?.[0]
  return { hasAccount: true, deactivatedAt: latest?.action === 'deactivate_user' ? latest.created_at as string : null }
}

export async function GET(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  if (!isAdmin(context)) return denied('Offboarding cases are managed by People Ops.')
  try {
    const id = cleanHrUuid(new URL(request.url).searchParams.get('id'))
    if (id) {
      const { data: found, error } = await context.database.from('hr_offboarding_cases').select('*').eq('id', id).maybeSingle(); if (error) throw error
      if (!found) return json({ error: 'Case not found.' }, 404)
      const [employee, items] = await Promise.all([loadEmployee(context, found.employee_id), context.database.from('hr_offboarding_items').select('*').eq('case_id', id).order('sort_order')])
      if (items.error) throw items.error
      const portal = await portalDeactivation(context, employee?.auth_user_id || null)
      await log(context, employee, { action: 'view_offboarding_case', description: `Viewed the offboarding case of ${employee ? displayName(employee) : 'an employee'}`, entityType: 'hr_offboarding_case', entityId: id })
      return json({ case: { ...found, items: items.data || [] }, employee, portal })
    }
    const [cases, templates, employees] = await Promise.all([
      context.database.from('hr_offboarding_cases').select('id,employee_id,exit_type,notice_received_at,last_working_day,status,portal_access_removed_at,re_employable,created_at').order('created_at', { ascending: false }).limit(200),
      context.database.from('hr_checklist_templates').select('id,title,departments,employment_types,items,active').eq('kind', 'offboarding').order('title'),
      context.database.from('hr_employees').select(hrEmployeeWorkColumns).order('legal_name'),
    ])
    const error = cases.error || templates.error || employees.error; if (error) throw error
    return json({ cases: cases.data || [], templates: templates.data || [], employees: employees.data || [] })
  } catch (error) { return failure(error, 'Failed to load offboarding') }
}

export async function POST(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  if (!isAdmin(context)) return denied('Offboarding cases are opened by People Ops.')
  try {
    const body = await readBody(request); if (!body) return invalid('Details are required.')
    if (body.kind === 'template') {
      const title = cleanHrText(body.title, 160); const items = cleanTemplateItems(body.items)
      if (!title || !items.length) return invalid('Give the template a title and at least one item.')
      const { data, error } = await context.database.from('hr_checklist_templates').insert({
        kind: 'offboarding', title, items, departments: Array.isArray(body.departments) ? body.departments.filter((item) => cleanHrEnum(item, hrDepartments)) : [],
        employment_types: Array.isArray(body.employment_types) ? body.employment_types.filter((item) => cleanHrEnum(item, hrEmploymentTypes)) : [], active: body.active !== false, created_by: context.user.id,
      }).select('*').single()
      if (error) throw error
      await log(context, null, { action: 'create_offboarding_template', description: `Added offboarding template “${title}”`, entityType: 'hr_checklist_template', entityId: data.id })
      return json({ template: data }, 201)
    }
    const employee = await loadEmployee(context, cleanHrUuid(body.employee_id)); if (!employee) return json({ error: 'Employee not found.' }, 404)
    if (employee.status === 'exited') return invalid('This person has already left.')
    const exitType = cleanHrEnum(body.exit_type, values(exitTypes)); if (!exitType) return invalid('Choose how the person is leaving.')
    const lastDay = cleanHrDate(body.last_working_day)
    let items = defaultOffboardingItems; const templateId = cleanHrUuid(body.template_id)
    if (templateId) {
      const { data: template } = await context.database.from('hr_checklist_templates').select('items').eq('id', templateId).eq('kind', 'offboarding').maybeSingle()
      if (!template) return invalid('That template no longer exists.')
      items = cleanTemplateItems(template.items)
    }
    const { data, error } = await context.database.from('hr_offboarding_cases').insert({
      employee_id: employee.id, exit_type: exitType, notice_received_at: cleanHrDate(body.notice_received_at) || context.today, notice_period_text: cleanHrOptionalText(body.notice_period_text, 200),
      last_working_day: lastDay, garden_leave: body.garden_leave === true, pay_in_lieu: body.pay_in_lieu === true, handover_plan: cleanHrText(body.handover_plan, 8000), created_by: context.user.id,
    }).select('*').single()
    if (error) throw error
    const { error: itemsError } = await context.database.from('hr_offboarding_items').insert(items.map((item, index) => ({ case_id: data.id, category: item.category, item: item.item, owner: item.owner, due_date: lastDay ? addDays(lastDay, item.due_offset_days) : null, sort_order: index })))
    if (itemsError) throw itemsError
    if (employee.status !== 'notice') { const { error: statusError } = await context.database.from('hr_employees').update({ status: 'notice' }).eq('id', employee.id); if (statusError) throw statusError }
    await log(context, employee, { action: 'open_offboarding_case', description: `Opened an offboarding case for ${displayName(employee)} (${labelOf(exitTypes, exitType)})`, entityType: 'hr_offboarding_case', entityId: data.id, metadata: { last_working_day: lastDay } })
    return json({ case: data }, 201)
  } catch (error) { return failure(error, 'Failed to open the offboarding case') }
}

export async function PATCH(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  try {
    const body = await readBody(request); const id = cleanHrUuid(body?.id); if (!body || !id) return invalid('A valid record is required.')
    const admin = isAdmin(context); const now = new Date().toISOString()
    if (body.kind === 'item') {
      const { data: item } = await context.database.from('hr_offboarding_items').select('id,case_id,owner,item').eq('id', id).maybeSingle(); if (!item) return json({ error: 'Item not found.' }, 404)
      const { data: parent } = await context.database.from('hr_offboarding_cases').select('employee_id,status').eq('id', item.case_id).maybeSingle(); if (!parent) return json({ error: 'Case not found.' }, 404)
      const found = await employeeFor(context, parent.employee_id, 'offboarding', 'write'); if ('response' in found) return found.response
      // Leavers tick only their own items (data deletion, returning records).
      if (!admin && !(found.relation === 'self' && item.owner === 'employee')) return denied('People Ops records this item.')
      if (['closed', 'cancelled'].includes(parent.status)) return invalid('This case is closed.')
      const status = cleanHrEnum(body.status, values(offboardingItemStatuses)) || 'pending'
      if (!admin && status !== 'done' && status !== 'pending') return denied('Only People Ops marks an item not applicable or missing.')
      const { data, error } = await context.database.from('hr_offboarding_items').update({ status, notes: cleanHrText(body.notes, 2000), done_at: status === 'done' ? now : null, done_by: status === 'done' ? context.user.id : null, ...(admin && body.due_date !== undefined ? { due_date: cleanHrDate(body.due_date) } : {}) }).eq('id', id).select('*').single()
      if (error) throw error
      await log(context, found.employee, { action: 'update_offboarding_item', description: `Marked “${item.item.slice(0, 80)}” ${status.replace('_', ' ')} for ${displayName(found.employee)}`, entityType: 'hr_offboarding_item', entityId: id })
      return json({ item: data })
    }
    if (!admin) return denied('Offboarding cases are managed by People Ops.')
    if (body.kind === 'template') {
      const title = cleanHrText(body.title, 160); const items = cleanTemplateItems(body.items); if (!title || !items.length) return invalid('Give the template a title and at least one item.')
      const { data, error } = await context.database.from('hr_checklist_templates').update({ title, items, active: body.active !== false }).eq('id', id).eq('kind', 'offboarding').select('*').single(); if (error) throw error
      await log(context, null, { action: 'update_offboarding_template', description: `Updated offboarding template “${title}”`, entityType: 'hr_checklist_template', entityId: id })
      return json({ template: data })
    }
    const { data: found, error: loadError } = await context.database.from('hr_offboarding_cases').select('*').eq('id', id).maybeSingle(); if (loadError) throw loadError
    if (!found) return json({ error: 'Case not found.' }, 404)
    const current = found as HrOffboardingCase; const employee = await loadEmployee(context, current.employee_id); if (!employee) return json({ error: 'Employee not found.' }, 404)
    if (['closed', 'cancelled'].includes(current.status)) return invalid('This case is closed.')
    if (body.kind === 'add_item') {
      const text = cleanHrText(body.item, 300); if (!text) return invalid('Describe the item.')
      const { data, error } = await context.database.from('hr_offboarding_items').insert({ case_id: id, item: text, category: cleanHrEnum(body.category, categoryValues) || 'other', owner: cleanHrEnum(body.owner, ownerValues) || 'hr', due_date: cleanHrDate(body.due_date), sort_order: 999 }).select('*').single()
      if (error) throw error
      return json({ item: data }, 201)
    }
    const portal = await portalDeactivation(context, employee.auth_user_id)
    if (body.kind === 'sync_access') {
      if (portal.hasAccount && !portal.deactivatedAt) return invalid('The portal account is still active. Deactivate it in Users & Roles first.')
      const { data, error } = await context.database.from('hr_offboarding_cases').update({ portal_access_removed_at: portal.deactivatedAt || now }).eq('id', id).select('*').single(); if (error) throw error
      await log(context, employee, { action: 'record_access_removed', description: `Recorded portal access removal for ${displayName(employee)}`, entityType: 'hr_offboarding_case', entityId: id, metadata: { from_log: !!portal.deactivatedAt } })
      return json({ case: data, portal })
    }
    const stamp = (value: unknown, existing: string | null) => value === true ? existing || now : value === false ? null : cleanHrTimestamp(value) ?? existing
    const status = cleanHrEnum(body.status, values(offboardingStatuses)) || current.status
    const lastDay = cleanHrDate(body.last_working_day) || current.last_working_day
    const update = {
      exit_type: cleanHrEnum(body.exit_type, values(exitTypes)) || current.exit_type, notice_received_at: cleanHrDate(body.notice_received_at) || current.notice_received_at, notice_period_text: cleanHrOptionalText(body.notice_period_text, 200),
      last_working_day: lastDay, garden_leave: body.garden_leave === true, pay_in_lieu: body.pay_in_lieu === true, handover_plan: cleanHrText(body.handover_plan, 8000),
      patients_reassigned_at: stamp(body.patients_reassigned, current.patients_reassigned_at), leads_reassigned_at: stamp(body.leads_reassigned, current.leads_reassigned_at), equipment_returned_at: stamp(body.equipment_returned, current.equipment_returned_at),
      certificate_of_service_issued_at: stamp(body.certificate_issued, current.certificate_of_service_issued_at), final_pay_date: cleanHrDate(body.final_pay_date), final_pay_items: cleanFinalPay(body.final_pay_items),
      exit_interview: cleanExitInterview(body.exit_interview), pressure_flag: body.pressure_flag === true, reference_consent: body.reference_consent === true ? true : body.reference_consent === false ? false : null,
      re_employable: cleanHrEnum(body.re_employable, ['yes', 'no', 'with_conditions'] as const), status,
    }
    if (['access_removed', 'final_pay_pending', 'closed'].includes(status) && portal.hasAccount && !current.portal_access_removed_at) return invalid('Deactivate the portal account in Users & Roles, then record it here before moving on.')
    if (status === 'closed') {
      if (!lastDay) return invalid('Set the last working day before closing.')
      if (!update.re_employable) return invalid('Record whether the person is re-employable.')
      const { data: pending } = await context.database.from('hr_offboarding_items').select('id').eq('case_id', id).eq('status', 'pending')
      if (pending?.length) return invalid(`${pending.length} checklist item(s) are still pending.`)
    }
    const { data, error } = await context.database.from('hr_offboarding_cases').update(update).eq('id', id).select('*').single(); if (error) throw error
    // Offboarding owns the leaving fields on hr_employees.
    if (status === 'closed') { const { error: employeeError } = await context.database.from('hr_employees').update({ status: 'exited', end_date: lastDay, leaving_reason: labelOf(exitTypes, update.exit_type) }).eq('id', employee.id); if (employeeError) throw employeeError }
    if (status === 'cancelled' && employee.status === 'notice') { const { error: employeeError } = await context.database.from('hr_employees').update({ status: employee.confirmed_at ? 'active' : 'probation' }).eq('id', employee.id); if (employeeError) throw employeeError }
    await log(context, employee, { action: status !== current.status ? `offboarding_${status}` : 'update_offboarding_case', description: `${status !== current.status ? `Moved offboarding to ${labelOf(offboardingStatuses, status).toLowerCase()}` : 'Updated the offboarding case'} for ${displayName(employee)}`, entityType: 'hr_offboarding_case', entityId: id, metadata: { status, exit_interview_recorded: Object.keys(update.exit_interview).length > 0 } })
    return json({ case: data, portal })
  } catch (error) { return failure(error, 'Failed to update offboarding') }
}
