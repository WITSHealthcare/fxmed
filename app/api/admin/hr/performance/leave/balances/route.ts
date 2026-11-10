import type { NextRequest } from 'next/server'
import { cleanHrEnum, cleanHrNumber, cleanHrOptionalText, cleanHrUuid, defaultLeaveEntitlements, displayName, hrEmployeeWorkColumns, labelOf, leaveTypes } from '@/lib/hr'
import { balanceLeaveTypes, carryOverDays, carryOverExpiry, defaultEntitlement, leaveBalance, proRataFactor, proRatedLeave, type BalanceLeaveType, type HrLeaveBalance, type HrLeaveRequest } from '@/lib/hr-performance'
import { denied, failure, invalid, isAdmin, json, loadEmployee, log, performanceContext, readBody, type EmployeeRow } from '../../shared'

// People Ops sets up each leave year: default entitlements, pro-rata for joiners
// and leavers, and up to 5 days of annual leave carried over to 31 March.
export async function POST(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  if (!isAdmin(context)) return denied('People Ops sets up leave balances.')
  try {
    const body = await readBody(request); const year = Math.round(cleanHrNumber(body?.year, 2020, 2100) ?? Number(context.today.slice(0, 4)))
    let query = context.database.from('hr_employees').select(hrEmployeeWorkColumns).neq('status', 'exited')
    const only = cleanHrUuid(body?.employee_id); if (only) query = query.eq('id', only)
    const { data: employees, error } = await query; if (error) throw error
    const people = (employees || []) as unknown as EmployeeRow[]
    if (!people.length) return invalid('No current employees to set up.')
    const ids = people.map((employee) => employee.id)
    const [{ data: existing, error: existingError }, { data: previousRows, error: previousError }, { data: previousRequests, error: requestsError }] = await Promise.all([
      context.database.from('hr_leave_balances').select('employee_id,leave_type').eq('leave_year', year).in('employee_id', ids),
      context.database.from('hr_leave_balances').select('*').eq('leave_year', year - 1).eq('leave_type', 'annual').in('employee_id', ids),
      context.database.from('hr_leave_requests').select('employee_id,leave_type,start_date,working_days,status').eq('leave_type', 'annual').gte('start_date', `${year - 1}-01-01`).lte('start_date', `${year - 1}-12-31`).in('employee_id', ids),
    ])
    if (existingError || previousError || requestsError) throw existingError || previousError || requestsError
    const have = new Set((existing || []).map((row) => `${row.employee_id}:${row.leave_type}`))
    const types = balanceLeaveTypes.filter((type) => defaultLeaveEntitlements[type])
    const rows = people.flatMap((employee) => types.filter((type) => !have.has(`${employee.id}:${type}`)).map((type) => {
      let carried = 0
      if (type === 'annual' && employee.start_date && employee.start_date < `${year}-01-01`) {
        const previous = leaveBalance('annual', year - 1, ((previousRows || []) as HrLeaveBalance[]).find((row) => row.employee_id === employee.id) || null, ((previousRequests || []) as (HrLeaveRequest & { employee_id: string })[]).filter((row) => row.employee_id === employee.id), employee, `${year - 1}-12-31`)
        carried = carryOverDays(previous)
      }
      return {
        employee_id: employee.id, leave_year: year, leave_type: type, entitled_days: defaultEntitlement(type, year, employee.start_date),
        pro_rata_factor: proRatedLeave.includes(type) ? Number(proRataFactor(year, employee.start_date, employee.end_date).toFixed(3)) : 1,
        carried_over_days: carried, carry_over_expires_on: carried ? carryOverExpiry(year) : null, updated_by: context.user.id,
      }
    }))
    if (rows.length) { const { error: insertError } = await context.database.from('hr_leave_balances').insert(rows); if (insertError) throw insertError }
    await log(context, only ? people[0] : null, { action: 'setup_leave_year', description: `Set up ${year} leave balances (${rows.length} new)`, entityType: 'hr_leave_balances', entityId: only || String(year), metadata: { year, employees: people.length, rows: rows.length } })
    return json({ created: rows.length, year }, 201)
  } catch (error) { return failure(error, 'Failed to set up leave balances') }
}

// Adjust one balance (entitlement, carry-over or a manual adjustment with a reason).
export async function PATCH(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  if (!isAdmin(context)) return denied('People Ops adjusts leave balances.')
  try {
    const body = await readBody(request); if (!body) return invalid('A balance is required.')
    const employee = await loadEmployee(context, cleanHrUuid(body.employee_id)); if (!employee) return json({ error: 'Employee not found.' }, 404)
    const type = cleanHrEnum(body.leave_type, balanceLeaveTypes) as BalanceLeaveType | null; const year = cleanHrNumber(body.leave_year, 2020, 2100)
    if (!type || !year) return invalid('Choose the leave type and year.')
    const adjustment = cleanHrNumber(body.adjustment_days, -365, 365) ?? 0; const reason = cleanHrOptionalText(body.adjustment_reason, 1000)
    if (adjustment && !reason) return invalid('Give a reason for the adjustment.')
    const carried = Math.min(cleanHrNumber(body.carried_over_days, 0, 365) ?? 0, 365)
    const row = {
      employee_id: employee.id, leave_year: Math.round(year), leave_type: type, entitled_days: cleanHrNumber(body.entitled_days, 0, 365) ?? defaultEntitlement(type, year, employee.start_date),
      pro_rata_factor: cleanHrNumber(body.pro_rata_factor, 0, 1) ?? 1, carried_over_days: carried, carry_over_expires_on: carried ? carryOverExpiry(Math.round(year)) : null,
      adjustment_days: adjustment, adjustment_reason: reason, updated_by: context.user.id,
    }
    const { data, error } = await context.database.from('hr_leave_balances').upsert(row, { onConflict: 'employee_id,leave_year,leave_type' }).select('*').single(); if (error) throw error
    await log(context, employee, { action: 'adjust_leave_balance', description: `Adjusted ${year} ${labelOf(leaveTypes, type).toLowerCase()} leave for ${displayName(employee)}`, entityType: 'hr_leave_balance', entityId: data.id, metadata: { entitled: row.entitled_days, carried, adjustment, reason } })
    return json({ balance: data })
  } catch (error) { return failure(error, 'Failed to adjust the balance') }
}
