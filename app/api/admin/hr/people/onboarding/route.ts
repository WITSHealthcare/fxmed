import { NextRequest, NextResponse } from 'next/server'
import { checklistItemStatuses, checklistOwners, cleanHrDate, cleanHrEnum, cleanHrNumber, cleanHrText, cleanHrUuid, onboardingCategories, onboardingStages, values } from '@/lib/hr'
import { addDays, onboardingOwnerFor, type ChecklistTemplateItem, type HrOnboardingItem } from '@/lib/hr-people'
import { bad, deny, employeeFor, failure, isAdmin, logHr, peopleContext } from '../shared'

// Onboarding checklist items for one employee. Admin generates them from a
// template and manages them; the employee ticks items owned by 'employee',
// the line manager ticks items owned by 'manager'; only admin approves
// exceptions or marks items not applicable.

function itemPayload(raw: Record<string, unknown>) {
  const item = cleanHrText(raw.item, 300); if (!item) return null
  return {
    item, stage: cleanHrEnum(raw.stage, values(onboardingStages)) || 'pre_start', category: cleanHrEnum(raw.category, values(onboardingCategories)) || 'other',
    owner: cleanHrEnum(raw.owner, values(checklistOwners)) || 'hr', due_date: cleanHrDate(raw.due_date),
  }
}

export async function POST(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const access = await employeeFor(context, cleanHrUuid(body?.employee_id), 'onboarding', 'write')
    if (!body || !access) return bad('A valid employee is required.')
    const { employee } = access; const { database } = context
    const { data: existing, error: existingError } = await database.from('hr_onboarding_items').select('item,sort_order').eq('employee_id', employee.id); if (existingError) throw existingError
    let order = Math.max(0, ...(existing || []).map((row) => row.sort_order)) + 1
    if (body.template_id) {
      const { data: template, error } = await database.from('hr_checklist_templates').select('*').eq('id', cleanHrUuid(body.template_id) || '').eq('kind', 'onboarding').maybeSingle(); if (error) throw error
      if (!template) return bad('Choose an onboarding template.')
      // Skip items already on the checklist so a template can be re-applied safely.
      const have = new Set((existing || []).map((row) => row.item.toLowerCase()))
      const rows = (template.items as ChecklistTemplateItem[]).filter((item) => item.item && !have.has(item.item.toLowerCase())).map((item) => ({
        employee_id: employee.id, stage: item.stage, category: item.category, item: item.item.slice(0, 300), owner: item.owner,
        due_date: employee.start_date && Number.isFinite(item.due_offset_days) ? addDays(employee.start_date, item.due_offset_days) : null, sort_order: order++,
      }))
      if (rows.length) { const { error: insertError } = await database.from('hr_onboarding_items').insert(rows); if (insertError) throw insertError }
      await logHr(context, 'generate_onboarding', `Applied onboarding template "${template.title}" for ${employee.legal_name}`, { type: 'hr_employee', id: employee.id, employee }, { template_id: template.id, added: rows.length })
      return NextResponse.json({ added: rows.length }, { status: 201 })
    }
    const clean = itemPayload(body); if (!clean) return bad('Describe the checklist item.')
    const { data, error } = await database.from('hr_onboarding_items').insert({ ...clean, employee_id: employee.id, sort_order: order }).select('*').single(); if (error) throw error
    await logHr(context, 'add_onboarding_item', `Added onboarding item for ${employee.legal_name}`, { type: 'hr_onboarding_item', id: data.id, employee })
    return NextResponse.json({ item: data }, { status: 201 })
  } catch (error) { return failure(error, 'add onboarding items') }
}

export async function PATCH(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null; const id = cleanHrUuid(body?.id)
    const { data: row, error: loadError } = id ? await context.database.from('hr_onboarding_items').select('*').eq('id', id).maybeSingle() : { data: null, error: null }
    if (loadError) throw loadError
    const item = row as HrOnboardingItem | null
    if (!body || !item) return NextResponse.json({ error: 'Checklist item not found.' }, { status: 404 })
    const access = await employeeFor(context, item.employee_id, 'onboarding', 'write')
    if (!access) return deny()
    const status = cleanHrEnum(body.status, values(checklistItemStatuses)); const now = new Date().toISOString(); const me = context.user.id
    let changes: Record<string, unknown>
    if (!isAdmin(context)) {
      // Staff tick only the items their relation owns, and only done/pending.
      if (onboardingOwnerFor[access.relation] !== item.owner) return deny(`Only ${item.owner === 'employee' ? 'the new starter' : item.owner === 'manager' ? 'the line manager' : 'People Ops'} can tick this item.`)
      if (status !== 'done' && status !== 'pending') return deny('Only People Ops can approve exceptions or mark items not applicable.')
      if (item.status !== 'pending' && item.status !== 'done') return deny('People Ops has closed this item.')
      changes = status === 'done' ? { status, completed_at: now, completed_by: me } : { status, completed_at: null, completed_by: null }
    } else if (status) {
      if (status === 'exception_approved') {
        const reason = cleanHrText(body.exception_reason, 1000); if (!reason) return bad('A written reason is required for an exception.')
        changes = { status, exception_reason: reason, exception_approved_by: me, exception_approved_at: now, completed_at: null, completed_by: null }
      } else changes = { status, completed_at: status === 'pending' ? null : now, completed_by: status === 'pending' ? null : me, ...(status === 'pending' ? { exception_reason: null, exception_approved_by: null, exception_approved_at: null } : {}) }
    } else {
      const clean = itemPayload(body); if (!clean) return bad('Describe the checklist item.')
      changes = { ...clean, sort_order: cleanHrNumber(body.sort_order, 0, 10000) ?? item.sort_order, evidence_document_id: body.evidence_document_id === undefined ? item.evidence_document_id : cleanHrUuid(body.evidence_document_id) }
    }
    const { data, error } = await context.database.from('hr_onboarding_items').update(changes).eq('id', item.id).select('*').single(); if (error) throw error
    await logHr(context, status ? 'update_onboarding_status' : 'edit_onboarding_item', `${status ? `Marked "${item.item.slice(0, 80)}" ${status.replace(/_/g, ' ')}` : 'Edited an onboarding item'} for ${access.employee.legal_name}`, { type: 'hr_onboarding_item', id: item.id, employee: access.employee }, { from: item.status, to: status, relation: access.relation })
    return NextResponse.json({ item: data })
  } catch (error) { return failure(error, 'update the checklist item') }
}

export async function DELETE(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try {
    const id = cleanHrUuid(new URL(request.url).searchParams.get('id'))
    const { data: item } = id ? await context.database.from('hr_onboarding_items').select('id,employee_id,item').eq('id', id).maybeSingle() : { data: null }
    if (!item) return NextResponse.json({ error: 'Checklist item not found.' }, { status: 404 })
    const { error } = await context.database.from('hr_onboarding_items').delete().eq('id', item.id); if (error) throw error
    const access = await employeeFor(context, item.employee_id, 'onboarding')
    await logHr(context, 'remove_onboarding_item', `Removed onboarding item "${item.item.slice(0, 80)}"`, { type: 'hr_onboarding_item', id: item.id, employee: access?.employee })
    return NextResponse.json({ success: true })
  } catch (error) { return failure(error, 'remove the checklist item') }
}
