import type { NextRequest } from 'next/server'
import { cleanHrUuid, displayName } from '@/lib/hr'
import { balanceLeaveTypes, leaveBalance, shownBalanceTypes, type HrLeaveBalance, type HrLeaveRequest, type HrOffboardingCase, type PerformanceFile, type SignoffOption } from '@/lib/hr-performance'
import { allowed, denied, failure, isAdmin, json, loadEmployee, log, performanceContext, relationTo } from '../shared'

// One employee's performance file. Without ?id the viewer's own file.
export async function GET(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  try {
    const params = new URL(request.url).searchParams; const { database, viewer, today } = context
    const id = params.get('id') ? cleanHrUuid(params.get('id')) : viewer.employeeId
    if (!id) return json({ error: params.get('id') ? 'A valid employee is required.' : 'No HR record is linked to your account yet. Ask People Ops to add you.' }, params.get('id') ? 400 : 404)
    const employee = await loadEmployee(context, id); if (!employee) return json({ error: 'Employee not found.' }, 404)
    const relation = relationTo(context, employee); const admin = isAdmin(context)
    if (!allowed(context, 'employee', relation)) return denied()
    const year = Math.min(2100, Math.max(2020, Number(params.get('year')) || Number(today.slice(0, 4))))
    const can = (resource: Parameters<typeof allowed>[1]) => allowed(context, resource, relation)
    const none = Promise.resolve({ data: [], error: null })
    const [reviews, goals, plans, balances, leave, compensation, cases] = await Promise.all([
      can('review') ? database.from('hr_reviews').select('*').eq('employee_id', id).order('scheduled_date', { ascending: false, nullsFirst: false }) : none,
      can('review') ? database.from('hr_goals').select('*').eq('employee_id', id).order('review_year', { ascending: false }).order('created_at') : none,
      can('review') ? database.from('hr_improvement_plans').select('*').eq('employee_id', id).order('start_date', { ascending: false }) : none,
      can('leave') ? database.from('hr_leave_balances').select('*').eq('employee_id', id).eq('leave_year', year) : none,
      can('leave') ? database.from('hr_leave_requests').select('*').eq('employee_id', id).gte('start_date', `${year - 1}-01-01`).order('start_date', { ascending: false }) : none,
      can('pay') ? database.from('hr_compensation').select('*').eq('employee_id', id).order('effective_date', { ascending: false }) : none,
      can('offboarding') ? database.from('hr_offboarding_cases').select('*').eq('employee_id', id).order('created_at', { ascending: false }).limit(1) : none,
    ])
    const error = reviews.error || goals.error || plans.error || balances.error || leave.error || compensation.error || cases.error
    if (error) throw error
    const seesPrivateLeave = can('leave_private'); const seesPay = can('pay')
    const requests = ((leave.data || []) as HrLeaveRequest[]).map((item) => seesPrivateLeave ? item : { ...item, reason: item.leave_type === 'sick' ? '' : item.reason, evidence_document_id: null })
    const rows = (balances.data || []) as HrLeaveBalance[]
    const balanceViews = can('leave') ? balanceLeaveTypes.filter((type) => shownBalanceTypes.includes(type) || rows.some((row) => row.leave_type === type) || requests.some((item) => item.leave_type === type && item.start_date.startsWith(String(year))))
      .map((type) => leaveBalance(type, year, rows.find((row) => row.leave_type === type) || null, requests, employee, today)) : []
    let offboarding: PerformanceFile['offboarding'] = null
    const latest = (cases.data || [])[0] as HrOffboardingCase | undefined
    if (latest) {
      const { data: items, error: itemsError } = await database.from('hr_offboarding_items').select('*').eq('case_id', latest.id).order('sort_order')
      if (itemsError) throw itemsError
      // Exit interviews are admin only; final pay is pay (self and admin).
      const { exit_interview, pressure_flag, final_pay_items, final_pay_date, ...rest } = latest
      offboarding = { ...rest, ...(admin ? { exit_interview, pressure_flag } : {}), ...(seesPay ? { final_pay_items, final_pay_date } : {}), items: items || [] }
    }
    let signoffOptions: SignoffOption[] = []
    if ((admin || relation === 'report') && employee.auth_user_id) {
      // Day-90 sign-off lives in the Training tab; reviews reference it rather than copying it.
      const { data: responses } = await database.from('training_form_responses').select('program_id,lesson_id,score,passed,submitted_at').eq('user_id', employee.auth_user_id).order('submitted_at', { ascending: false }).limit(50)
      const programIds = Array.from(new Set((responses || []).map((row) => row.program_id as string)))
      const { data: programs } = programIds.length ? await database.from('training_programs').select('id,title,modules').in('id', programIds) : { data: [] }
      signoffOptions = (responses || []).map((row) => {
        const program = (programs || []).find((item) => item.id === row.program_id)
        const lesson = ((program?.modules || []) as { lessons: { id: string; title: string }[] }[]).flatMap((module) => module.lessons).find((item) => item.id === row.lesson_id)
        return { ref: `training:${row.program_id}:${row.lesson_id}`, label: `${program?.title || 'Training'} · ${lesson?.title || row.lesson_id}`, submitted_at: row.submitted_at, score: row.score, passed: row.passed }
      })
    }
    await log(context, employee, { action: 'view_performance_file', description: `Viewed the performance file of ${displayName(employee)}`, entityType: 'hr_employee', entityId: id, metadata: { relation, pay: seesPay } })
    const file: PerformanceFile = {
      employee, year, access: { isAdmin: admin, isSelf: relation === 'self', isManager: relation === 'report', seesPay, seesPrivateLeave },
      reviews: reviews.data || [], goals: goals.data || [], plans: plans.data || [], balances: balanceViews, leave: requests, compensation: compensation.data || [], offboarding, signoffOptions,
    }
    return json(file)
  } catch (error) { return failure(error, 'Failed to load the performance file') }
}
