import type { NextRequest } from 'next/server'
import { hrEmployeeWorkColumns, hrReadableEmployeeIds } from '@/lib/hr'
import { addDays, leaveOpenStatuses, type HrLeaveRequest } from '@/lib/hr-performance'
import { failure, isAdmin, json, performanceContext } from './shared'

// Overview for the Performance, Leave & Pay tab: the people the viewer may see,
// leave waiting for a decision, open reviews, who is off soon, holidays.
export async function GET(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  try {
    const { database, viewer, today } = context; const admin = isAdmin(context)
    const employeeIds = hrReadableEmployeeIds(viewer, 'employee')
    // Non-admins see only themselves and their direct reports; an empty list matches nothing.
    const none = ['00000000-0000-0000-0000-000000000000']
    const leaveIds = hrReadableEmployeeIds(viewer, 'leave'); const reviewIds = hrReadableEmployeeIds(viewer, 'review')
    let pendingQuery = database.from('hr_leave_requests').select('id,employee_id,leave_type,start_date,end_date,working_days,reason,approval_level,pay_treatment,status,handover_notes,cover_employee_id,created_at').eq('status', 'submitted').order('start_date')
    let upcomingQuery = database.from('hr_leave_requests').select('id,employee_id,leave_type,start_date,end_date,working_days,status').in('status', leaveOpenStatuses.filter((status) => status !== 'submitted')).gte('end_date', today).lte('start_date', addDays(today, 45)).order('start_date')
    let reviewsQuery = database.from('hr_reviews').select('id,employee_id,review_type,review_year,scheduled_date,status,second_review_requested_at,second_review_outcome').not('status', 'in', '(final,cancelled)').order('scheduled_date', { ascending: true, nullsFirst: false }).limit(200)
    if (leaveIds) { pendingQuery = pendingQuery.in('employee_id', leaveIds.length ? leaveIds : none); upcomingQuery = upcomingQuery.in('employee_id', leaveIds.length ? leaveIds : none) }
    if (reviewIds) reviewsQuery = reviewsQuery.in('employee_id', reviewIds.length ? reviewIds : none)
    let employeesQuery = database.from('hr_employees').select(hrEmployeeWorkColumns).order('legal_name')
    if (employeeIds) employeesQuery = employeesQuery.in('id', employeeIds.length ? employeeIds : none)
    const year = Number(today.slice(0, 4))
    const [employees, holidays, pendingLeave, upcomingLeave, reviews, cases] = await Promise.all([
      employeesQuery,
      database.from('hr_public_holidays').select('holiday_date,name,confirmed,source').gte('holiday_date', `${year - 1}-01-01`).lte('holiday_date', `${year + 1}-12-31`).order('holiday_date'),
      pendingQuery, upcomingQuery, reviewsQuery,
      admin ? database.from('hr_offboarding_cases').select('id,employee_id,exit_type,last_working_day,status,portal_access_removed_at').not('status', 'in', '(closed,cancelled)').order('last_working_day') : Promise.resolve({ data: [], error: null }),
    ])
    const error = employees.error || holidays.error || pendingLeave.error || upcomingLeave.error || reviews.error || cases.error
    if (error) throw error
    // Sick-leave reasons stay with the employee and admin (canHr 'leave_private').
    const pending = ((pendingLeave.data || []) as HrLeaveRequest[]).filter((item) => admin || item.employee_id !== viewer.employeeId).map((item) => ({
      ...item, reason: admin || item.leave_type !== 'sick' ? item.reason : '',
      can_decide: admin || (item.approval_level === 'manager' && viewer.reportIds.includes(item.employee_id)),
    }))
    const secondReviews = admin ? await database.from('hr_reviews').select('id,employee_id,review_type,review_year,scheduled_date,status,second_review_requested_at,second_review_outcome').not('second_review_requested_at', 'is', null).is('second_review_outcome', null) : { data: [] }
    return json({
      viewer: { role: viewer.role, employeeId: viewer.employeeId, reportIds: viewer.reportIds }, today, year,
      employees: employees.data || [], holidays: holidays.data || [], pendingLeave: pending, upcomingLeave: upcomingLeave.data || [],
      reviews: [...(reviews.data || []), ...(secondReviews.data || []).filter((row) => !(reviews.data || []).some((open) => open.id === row.id))], offboarding: cases.data || [],
    })
  } catch (error) { return failure(error, 'Failed to load performance overview') }
}
