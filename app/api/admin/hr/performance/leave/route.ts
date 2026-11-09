import type { NextRequest } from 'next/server'
import { cleanHrDate, cleanHrEnum, defaultLeaveEntitlements, cleanHrText, cleanHrTimestamp, cleanHrUuid, displayName, labelOf, leaveTypes, managerMaxLeaveDays, values, type LeaveType } from '@/lib/hr'
import { addDays, balanceLeaveTypes, countWorkingDays, leaveApprovalLevel, leaveBalance, leaveNoticeWarning, leaveOpenStatuses, yearOf, type BalanceLeaveType, type HrLeaveBalance, type HrLeaveRequest } from '@/lib/hr-performance'
import { denied, employeeFor, failure, holidayDates, invalid, isAdmin, json, log, performanceContext, readBody, type EmployeeRow, type PerformanceContext } from '../shared'

const leaveTypeValues = values(leaveTypes)
const hasBalance = (type: LeaveType): type is BalanceLeaveType => (balanceLeaveTypes as string[]).includes(type) && type !== 'unpaid'

async function remainingFor(context: PerformanceContext, employee: EmployeeRow, type: LeaveType, year: number, excludeId?: string) {
  if (!hasBalance(type)) return null
  const [{ data: row, error }, { data: requests, error: requestsError }] = await Promise.all([
    context.database.from('hr_leave_balances').select('*').eq('employee_id', employee.id).eq('leave_year', year).eq('leave_type', type).maybeSingle(),
    context.database.from('hr_leave_requests').select('id,leave_type,start_date,working_days,status').eq('employee_id', employee.id).eq('leave_type', type).gte('start_date', `${year}-01-01`).lte('start_date', `${year}-12-31`),
  ])
  if (error || requestsError) throw error || requestsError
  // Types with no entitlement (adoption, TOIL) are only checked once People Ops sets a balance.
  if (!row && !defaultLeaveEntitlements[type]) return null
  return leaveBalance(type, year, row as HrLeaveBalance | null, (requests || []).filter((item) => item.id !== excludeId) as HrLeaveRequest[], employee, context.today).remaining
}

async function checkDates(context: PerformanceContext, employee: EmployeeRow, start: string | null, end: string | null, excludeId?: string) {
  if (!start || !end || end < start) return { error: 'Choose a start date and an end date on or after it.' } as const
  if (yearOf(start) !== yearOf(end)) return { error: 'Leave runs 1 January to 31 December; split requests that cross the new year.' } as const
  if (end > addDays(start, 200)) return { error: 'That request is too long; split it or speak to People Ops.' } as const
  const days = countWorkingDays(start, end, await holidayDates(context, start, end))
  if (!days) return { error: 'Those dates are all weekends or public holidays.' } as const
  let overlap = context.database.from('hr_leave_requests').select('id').eq('employee_id', employee.id).in('status', leaveOpenStatuses).lte('start_date', end).gte('end_date', start)
  if (excludeId) overlap = overlap.neq('id', excludeId)
  const { data, error } = await overlap; if (error) throw error
  if (data?.length) return { error: 'This overlaps another leave request.' } as const
  return { days } as const
}

// Employees request their own leave; People Ops may record leave for anyone
// (for example sick leave reported by phone).
export async function POST(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  try {
    const body = await readBody(request); if (!body) return invalid('A leave request is required.')
    const admin = isAdmin(context)
    const found = await employeeFor(context, admin && body.employee_id ? body.employee_id : context.viewer.employeeId, 'leave', 'write'); if ('response' in found) return found.response
    const { employee, relation } = found
    if (!admin && relation !== 'self') return denied('Request leave for yourself only.')
    if (['exited'].includes(employee.status)) return invalid('This person has left.')
    const type = cleanHrEnum(body.leave_type, leaveTypeValues); if (!type) return invalid('Choose a leave type.')
    const start = cleanHrDate(body.start_date); const end = cleanHrDate(body.end_date)
    if (start && start < addDays(context.today, -30) && !admin) return invalid('Leave more than 30 days ago is recorded by People Ops.')
    const dates = await checkDates(context, employee, start, end); if ('error' in dates) return invalid(dates.error!)
    const reason = cleanHrText(body.reason, 2000)
    if (['compassionate', 'study', 'unpaid'].includes(type) && !reason) return invalid('Give a short reason for this type of leave.')
    const cover = cleanHrUuid(body.cover_employee_id)
    if (cover) { const { data } = await context.database.from('hr_employees').select('id').eq('id', cover).maybeSingle(); if (!data) return invalid('Choose a colleague for cover from the staff list.') }
    const remaining = await remainingFor(context, employee, type, yearOf(start!))
    const overBalance = remaining !== null && dates.days > remaining
    // Supervisors' own leave is approved by the Managing Director (leave-policy.md 10.2).
    const { count: reportCount } = await context.database.from('hr_employees').select('id', { count: 'exact', head: true }).eq('line_manager_id', employee.id).neq('status', 'exited')
    const level = reportCount ? 'md' : leaveApprovalLevel(type, dates.days, ['probation', 'probation_extended'].includes(employee.status), overBalance)
    const { data, error } = await context.database.from('hr_leave_requests').insert({
      employee_id: employee.id, leave_type: type, start_date: start, end_date: end, working_days: dates.days, reason, cover_employee_id: cover, handover_notes: cleanHrText(body.handover_notes, 4000),
      approval_level: level, pay_treatment: type === 'unpaid' ? 'unpaid' : 'full', status: 'submitted', created_by: context.user.id,
    }).select('*').single()
    if (error) throw error
    await log(context, employee, { action: 'request_leave', description: `${relation === 'self' ? 'Requested' : 'Recorded'} ${dates.days} day(s) of ${labelOf(leaveTypes, type).toLowerCase()} leave for ${displayName(employee)}`, entityType: 'hr_leave_request', entityId: data.id, metadata: { approval_level: level } })
    const warnings = [leaveNoticeWarning(type, start!, dates.days, context.today), overBalance ? `This is more than the ${remaining} day(s) left, so the Managing Director decides.` : null, level === 'md' && !overBalance ? 'This request goes to the Managing Director.' : null].filter(Boolean)
    return json({ request: data, warnings }, 201)
  } catch (error) { return failure(error, 'Failed to submit the leave request') }
}

export async function PATCH(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  try {
    const body = await readBody(request); const id = cleanHrUuid(body?.id); if (!body || !id) return invalid('A valid leave request is required.')
    const { data: row, error: loadError } = await context.database.from('hr_leave_requests').select('*').eq('id', id).maybeSingle(); if (loadError) throw loadError
    if (!row) return json({ error: 'Leave request not found.' }, 404)
    const current = row as HrLeaveRequest
    const found = await employeeFor(context, current.employee_id, 'leave', 'write'); if ('response' in found) return found.response
    const { employee, relation } = found; const admin = isAdmin(context); const action = cleanHrText(body.action, 30)
    const now = new Date().toISOString(); let update: Record<string, unknown>; let description: string
    if (action === 'cancel') {
      if (relation !== 'self' && !admin) return denied('Only the employee cancels their own request.')
      const future = current.start_date > context.today
      if (!(current.status === 'submitted' || (['approved', 'approved_with_changes'].includes(current.status) && future))) return invalid('Only pending requests or approved leave that has not started can be cancelled.')
      update = { status: 'cancelled' }; description = 'Cancelled a leave request'
    } else if (action === 'decide') {
      if (current.status !== 'submitted') return invalid('This request has already been decided.')
      // Line managers decide their reports' manager-level leave; the MD (admin) decides the rest, including managers' own leave.
      if (!admin && !(relation === 'report' && current.approval_level === 'manager')) return denied(current.approval_level === 'md' ? 'This request goes to the Managing Director.' : 'Only the line manager or the Managing Director decides this request.')
      const decision = cleanHrEnum(body.decision, ['approved', 'approved_with_changes', 'declined'] as const); if (!decision) return invalid('Choose approve, approve with changes or decline.')
      const reason = cleanHrText(body.decision_reason, 2000)
      if (decision !== 'approved' && !reason) return invalid(decision === 'declined' ? 'Give the reason for declining.' : 'Explain the changes.')
      update = { status: decision, decision_reason: reason || null, decided_by: context.user.id, decided_at: now }
      if (decision === 'approved_with_changes') {
        const start = cleanHrDate(body.start_date) || current.start_date; const end = cleanHrDate(body.end_date) || current.end_date
        const dates = await checkDates(context, employee, start, end, id); if ('error' in dates) return invalid(dates.error!)
        if (!admin && dates.days > managerMaxLeaveDays) return denied(`Over ${managerMaxLeaveDays} working days goes to the Managing Director.`)
        update = { ...update, start_date: start, end_date: end, working_days: dates.days }
      }
      if (admin) { const pay = cleanHrEnum(body.pay_treatment, ['full', 'half', 'unpaid'] as const); if (pay) update.pay_treatment = pay }
      description = `${decision === 'declined' ? 'Declined' : 'Approved'} ${labelOf(leaveTypes, current.leave_type).toLowerCase()} leave`
    } else if (action === 'cancel_by_employer') {
      if (!admin) return denied('Only the Managing Director cancels approved leave.')
      if (!['approved', 'approved_with_changes'].includes(current.status)) return invalid('Only approved leave can be cancelled by FXMed.')
      const reason = cleanHrText(body.decision_reason, 2000); if (!reason) return invalid('Give the business reason; non-refundable costs are reimbursed.')
      update = { status: 'cancelled_by_employer', decision_reason: reason, decided_by: context.user.id, decided_at: now }; description = 'Cancelled approved leave for business reasons'
    } else if (action === 'return') {
      if (!admin && relation !== 'report') return denied('The line manager confirms the return.')
      if (!['approved', 'approved_with_changes', 'taken'].includes(current.status)) return invalid('Only approved leave can be marked as taken.')
      update = { status: 'taken', returned_on: cleanHrDate(body.returned_on) || context.today, return_meeting_at: cleanHrTimestamp(body.return_meeting_at) }; description = 'Confirmed return from leave'
    } else if (action === 'evidence') {
      if (relation !== 'self' && !admin) return denied('Evidence is added by the employee or People Ops.')
      const documentId = cleanHrUuid(body.evidence_document_id)
      if (documentId) { const { data } = await context.database.from('hr_documents').select('id').eq('id', documentId).eq('employee_id', employee.id).maybeSingle(); if (!data) return invalid('Upload the document to your HR file first, then choose it here.') }
      update = { evidence_document_id: documentId }; description = 'Attached leave evidence'
    } else return invalid('Unknown leave action.')
    const { data, error } = await context.database.from('hr_leave_requests').update(update).eq('id', id).select('*').single(); if (error) throw error
    await log(context, employee, { action: `leave_${action}`, description: `${description} for ${displayName(employee)}`, entityType: 'hr_leave_request', entityId: id, metadata: { status: data.status } })
    const redacted = admin || relation === 'self' ? data : { ...data, reason: data.leave_type === 'sick' ? '' : data.reason, evidence_document_id: null }
    return json({ request: redacted })
  } catch (error) { return failure(error, 'Failed to update the leave request') }
}
