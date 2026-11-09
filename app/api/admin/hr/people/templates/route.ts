import { NextRequest, NextResponse } from 'next/server'
import { canHr, checklistOwners, cleanHrEnum, cleanHrNumber, cleanHrText, cleanHrUuid, hrDepartments, hrEmploymentTypes, onboardingCategories, onboardingStages, values } from '@/lib/hr'
import type { ChecklistTemplateItem } from '@/lib/hr-people'
import { bad, deny, failure, isAdmin, logHr, peopleContext } from '../shared'

// Onboarding checklist templates (kind = 'onboarding'). Offboarding templates
// belong to the Performance area and are never read or written here.

function cleanItems(value: unknown): ChecklistTemplateItem[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 150).flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const row = raw as Record<string, unknown>; const item = cleanHrText(row.item, 300); if (!item) return []
    return [{ item, stage: cleanHrEnum(row.stage, values(onboardingStages)) || 'pre_start', category: cleanHrEnum(row.category, values(onboardingCategories)) || 'other', owner: cleanHrEnum(row.owner, values(checklistOwners)) || 'hr', due_offset_days: Math.trunc(cleanHrNumber(row.due_offset_days, -90, 365) ?? 0) }]
  })
}
function payload(body: Record<string, unknown>) {
  const title = cleanHrText(body.title, 160); const items = cleanItems(body.items)
  if (!title || !items.length) return null
  const pick = (value: unknown, allowed: readonly string[]) => Array.isArray(value) ? Array.from(new Set(value.filter((v): v is string => typeof v === 'string' && allowed.includes(v)))) : []
  return { kind: 'onboarding' as const, title, items, departments: pick(body.departments, hrDepartments), employment_types: pick(body.employment_types, hrEmploymentTypes), active: body.active !== false }
}

export async function GET(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!canHr(context.viewer.role, 'settings', 'other')) return deny()
  try {
    let query = context.database.from('hr_checklist_templates').select('*').eq('kind', 'onboarding').order('title')
    if (!isAdmin(context)) query = query.eq('active', true)
    const { data, error } = await query; if (error) throw error
    return NextResponse.json({ templates: data || [] })
  } catch (error) { return failure(error, 'load checklist templates') }
}

export async function POST(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null; const clean = body && payload(body)
    if (!clean) return bad('Add a title and at least one item.')
    const { data, error } = await context.database.from('hr_checklist_templates').insert({ ...clean, created_by: context.user.id }).select('*').single(); if (error) throw error
    await logHr(context, 'create_checklist_template', `Created onboarding template "${data.title}"`, { type: 'hr_checklist_template', id: data.id })
    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) { return failure(error, 'create the template') }
}

export async function PATCH(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null; const id = cleanHrUuid(body?.id); const clean = body && payload(body)
    if (!id) return bad('A valid template is required.')
    if (!clean) return bad('Add a title and at least one item.')
    const { data, error } = await context.database.from('hr_checklist_templates').update(clean).eq('id', id).eq('kind', 'onboarding').select('*').maybeSingle(); if (error) throw error
    if (!data) return NextResponse.json({ error: 'Template not found.' }, { status: 404 })
    await logHr(context, 'update_checklist_template', `Updated onboarding template "${data.title}"`, { type: 'hr_checklist_template', id })
    return NextResponse.json({ template: data })
  } catch (error) { return failure(error, 'update the template') }
}

export async function DELETE(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try {
    const id = cleanHrUuid(new URL(request.url).searchParams.get('id')); if (!id) return bad('A valid template is required.')
    // Items already generated for employees are copies, so they stay.
    const { error } = await context.database.from('hr_checklist_templates').delete().eq('id', id).eq('kind', 'onboarding'); if (error) throw error
    await logHr(context, 'delete_checklist_template', 'Deleted an onboarding template', { type: 'hr_checklist_template', id })
    return NextResponse.json({ success: true })
  } catch (error) { return failure(error, 'delete the template') }
}
