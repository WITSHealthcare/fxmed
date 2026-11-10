import { NextRequest, NextResponse } from 'next/server'
import { cleanHrDate, cleanHrEnum, cleanHrNumber, cleanHrOptionalText, cleanHrText, cleanHrUuid, hrDepartments, hrEmploymentTypes, type RoleFamily } from '@/lib/hr'
import { missingApprovals, offerApprovalRoles, requiredRequisitionApprovals, type HrRequisition, type OfferApproval } from '@/lib/hr-recruiting'
import { fail, logHr, readJson, recruitingContext, serverError, staffDirectory, type HrDatabase } from '../shared'

// Requisitions (migration 042): stage 0 of the pipeline. Hiring manager's
// trigger evidence, band, panel and role family, approved by the MD (plus the
// Medical Director for clinical roles) before the opening is published.
const families: RoleFamily[] = ['A', 'B', 'C', 'D', 'E', 'F']
async function fields(database: HrDatabase, body: Record<string, unknown>) {
  const staff = new Set((await staffDirectory(database)).map((member) => member.id))
  const manager = cleanHrUuid(body.hiring_manager_id)
  const roleCode = cleanHrText(body.role_code, 3).toUpperCase()
  return {
    role_code: /^[RLT][0-9]{2}$/.test(roleCode) ? roleCode : null, title: cleanHrText(body.title, 160), department: cleanHrEnum(body.department, hrDepartments), employment_type: cleanHrEnum(body.employment_type, hrEmploymentTypes) || 'Full-time',
    role_family: cleanHrEnum(body.role_family, families), band_code: cleanHrOptionalText(body.band_code, 20), headcount: Math.trunc(cleanHrNumber(body.headcount, 1, 20) ?? 1), plan_year: cleanHrNumber(body.plan_year, 2020, 2100),
    career_opening_id: cleanHrUuid(body.career_opening_id), hiring_manager_id: manager && staff.has(manager) ? manager : null,
    panel_user_ids: Array.isArray(body.panel_user_ids) ? Array.from(new Set(body.panel_user_ids.map(cleanHrUuid).filter((id): id is string => !!id && staff.has(id)))).slice(0, 8) : [],
    trigger_evidence: cleanHrText(body.trigger_evidence, 3000), pause_condition: cleanHrText(body.pause_condition, 1000), budget_note: cleanHrText(body.budget_note, 1000), target_start_date: cleanHrDate(body.target_start_date),
  }
}
// Back-fill applications already received for the linked opening.
async function linkApplications(database: HrDatabase, requisition: HrRequisition) {
  if (!requisition.career_opening_id) return
  await database.from('hr_applications').update({ requisition_id: requisition.id }).eq('career_opening_id', requisition.career_opening_id).is('requisition_id', null)
  await database.from('hr_applications').update({ role_family: requisition.role_family }).eq('requisition_id', requisition.id).is('role_family', null)
  if (requisition.hiring_manager_id) await database.from('hr_applications').update({ hiring_manager_id: requisition.hiring_manager_id }).eq('requisition_id', requisition.id).is('hiring_manager_id', null)
}

export async function POST(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  const body = await readJson(request); if (!body) return fail('Invalid request.')
  try {
    const clean = await fields(database, body)
    if (!clean.title || !clean.department || !clean.role_family) return fail('Enter the role title, department and role family.')
    const { data, error } = await database.from('hr_requisitions').insert({ ...clean, created_by: user.id }).select('*').single()
    if (error) return error.code === '23505' ? fail('That opening already has a live requisition.', 409) : serverError(error, 'creating requisition', 'Failed to create the requisition.')
    await linkApplications(database, data)
    await logHr(context, { action: 'create', entityType: 'hr_requisition', entityId: data.id, description: `Raised requisition ${clean.role_code || ''} ${clean.title}`.replace(/\s+/g, ' ') })
    return NextResponse.json({ requisition: data }, { status: 201 })
  } catch (error) { return serverError(error, 'creating requisition', 'Failed to create the requisition.') }
}

export async function PATCH(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  const body = await readJson(request); const id = cleanHrUuid(body?.id); if (!body || !id) return fail('A valid requisition is required.')
  try {
    const { data: found, error: loadError } = await database.from('hr_requisitions').select('*').eq('id', id).maybeSingle(); if (loadError) throw loadError
    const requisition = found as HrRequisition | null; if (!requisition) return fail('Requisition not found.', 404)
    const save = async (values: Record<string, unknown>, description: string) => {
      const { data, error } = await database.from('hr_requisitions').update(values).eq('id', id).select('*').single()
      if (error) return error.code === '23505' ? fail('That opening already has a live requisition.', 409) : serverError(error, 'updating requisition', 'Failed to update the requisition.')
      await linkApplications(database, data)
      await logHr(context, { action: `requisition_${String(body.action || 'save')}`, entityType: 'hr_requisition', entityId: id, description: `${description}: ${requisition.title}` })
      return NextResponse.json({ requisition: data })
    }
    switch (body.action) {
      case 'submit':
        if (requisition.status !== 'draft') return fail('Only a draft can be sent for approval.')
        if (!requisition.trigger_evidence || !requisition.hiring_manager_id) return fail('Add the trigger evidence and hiring manager before approval.')
        return save({ status: 'pending_approval', approvals: [] }, 'Sent requisition for approval')
      case 'approve': {
        const role = cleanHrEnum(body.role, offerApprovalRoles.map((item) => item.value)); const required = requiredRequisitionApprovals(requisition)
        if (requisition.status !== 'pending_approval' || !role || !required.includes(role)) return fail('This approval is not needed.')
        if (requisition.approvals.some((item) => item.role === role)) return fail('Already approved in that capacity.')
        const approvals: OfferApproval[] = [...requisition.approvals, { approver_id: user.id, approver_email: user.email || null, role, approved_at: new Date().toISOString() }]
        return save({ approvals, status: missingApprovals(required, approvals).length ? 'pending_approval' : 'approved' }, `Approved requisition as ${role}`)
      }
      case 'status': {
        const status = cleanHrEnum(body.status, ['draft', 'on_hold', 'approved', 'filled', 'cancelled'] as const); if (!status) return fail('Choose a status.')
        if (status === 'approved' && (requisition.status !== 'on_hold' || missingApprovals(requiredRequisitionApprovals(requisition), requisition.approvals).length)) return fail('Only an approved requisition on hold can be resumed.')
        return save(status === 'draft' ? { status, approvals: [] } : { status }, `Set requisition ${status.replace('_', ' ')}`)
      }
      default: {
        const clean = await fields(database, { ...requisition, ...body })
        if (!clean.title || !clean.department || !clean.role_family) return fail('Enter the role title, department and role family.')
        // Changing what was approved sends it back for approval.
        const material = ['title', 'department', 'employment_type', 'role_family', 'band_code', 'headcount'].some((key) => String(clean[key as keyof typeof clean] ?? '') !== String(requisition[key as keyof HrRequisition] ?? ''))
        return save({ ...clean, ...(material && requisition.status !== 'draft' ? { status: 'draft', approvals: [] } : {}) }, 'Edited requisition')
      }
    }
  } catch (error) { return serverError(error, 'updating requisition', 'Failed to update the requisition.') }
}

export async function DELETE(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database } = context
  if (!admin) return fail('Admin access required', 403)
  const id = cleanHrUuid(new URL(request.url).searchParams.get('id')); if (!id) return fail('A valid requisition is required.')
  try {
    const { data, error } = await database.from('hr_requisitions').delete().eq('id', id).eq('status', 'draft').select('id'); if (error) throw error
    if (!data?.length) return fail('Only a draft requisition can be deleted; cancel it instead.')
    await logHr(context, { action: 'delete', entityType: 'hr_requisition', entityId: id, description: 'Deleted a draft requisition' })
    return NextResponse.json({ success: true })
  } catch (error) { return serverError(error, 'deleting requisition', 'Failed to delete the requisition.') }
}
