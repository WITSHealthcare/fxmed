import { NextRequest, NextResponse } from 'next/server'
import { cleanHrDate, cleanHrNumber, cleanHrOptionalText, cleanHrUuid } from '@/lib/hr'
import { bad, deny, employeeFor, failure, isAdmin, logHr, peopleContext } from '../shared'

// Bank and statutory identifiers. Admin edits; the employee reads their own
// through the file detail. Values are never written to the activity log.

const digits = (value: unknown, length: number) => {
  const text = cleanHrOptionalText(value, 40)?.replace(/\s+/g, '') || null
  return text === null ? { ok: true, value: null } : { ok: new RegExp(`^[0-9]{${length}}$`).test(text), value: text }
}

export async function PUT(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const access = await employeeFor(context, cleanHrUuid(body?.employee_id), 'employee_private', 'write')
    if (!body || !access) return bad('A valid employee is required.')
    const { employee } = access
    // Bank details and BVN are erased at final pay + 3 months (employee-records.md section 3).
    if (body.erase_bank === true) {
      const { data, error } = await context.database.from('hr_payroll_profiles').update({ bank_name: null, account_number: null, account_name: null, bvn: null, updated_by: context.user.id }).eq('employee_id', employee.id).select('*').maybeSingle()
      if (error) throw error
      await context.database.from('hr_retention_log').insert({ entity_type: 'hr_payroll_profiles.bank', record_id: employee.id, action: 'deleted', retention_rule: 'Bank details and BVN: final pay + 3 months', performed_by: context.user.id })
      await logHr(context, 'erase_bank_details', `Erased bank details and BVN for ${employee.legal_name}`, { type: 'hr_payroll_profile', id: employee.id, employee })
      return NextResponse.json({ payroll: data })
    }
    const account = digits(body.account_number, 10); const bvn = digits(body.bvn, 11)
    if (!account.ok) return bad('The account number must be 10 digits (NUBAN).')
    if (!bvn.ok) return bad('The BVN must be 11 digits.')
    const payload = {
      employee_id: employee.id, bank_name: cleanHrOptionalText(body.bank_name, 120), account_number: account.value, account_name: cleanHrOptionalText(body.account_name, 160), bvn: bvn.value,
      tin: cleanHrOptionalText(body.tin, 40), paye_state: cleanHrOptionalText(body.paye_state, 60) || 'Lagos', pfa_name: cleanHrOptionalText(body.pfa_name, 120), rsa_pin: cleanHrOptionalText(body.rsa_pin, 40),
      nhf_number: cleanHrOptionalText(body.nhf_number, 40), pension_employee_rate: cleanHrNumber(body.pension_employee_rate, 0, 100) ?? 8, pension_employer_rate: cleanHrNumber(body.pension_employer_rate, 0, 100) ?? 10,
      group_life_enrolled_at: cleanHrDate(body.group_life_enrolled_at), hmo_enrolled_at: cleanHrDate(body.hmo_enrolled_at), updated_by: context.user.id,
    }
    const { data, error } = await context.database.from('hr_payroll_profiles').upsert(payload).select('*').single(); if (error) throw error
    await logHr(context, 'update_payroll_profile', `Updated payroll details for ${employee.legal_name}`, { type: 'hr_payroll_profile', id: employee.id, employee }, { fields: Object.keys(payload).filter((key) => key !== 'employee_id' && key !== 'updated_by') })
    return NextResponse.json({ payroll: data })
  } catch (error) { return failure(error, 'save payroll details') }
}
