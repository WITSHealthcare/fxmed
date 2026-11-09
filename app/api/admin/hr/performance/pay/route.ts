import type { NextRequest } from 'next/server'
import { cleanHrDate, cleanHrEnum, cleanHrNumber, cleanHrOptionalText, cleanHrText, cleanHrUuid, compensationReasons, displayName, formatNaira, hrDepartments, hrEmployeeWorkColumns, hrLevels, payBases, values } from '@/lib/hr'
import { bandFor, nationalMinimumWage, type HrSalaryBand } from '@/lib/hr-performance'
import { denied, failure, invalid, isAdmin, json, loadEmployee, log, performanceContext, readBody, type PerformanceContext } from '../shared'

// Pay is admin only. Employees read their own compensation history through the
// employee file route; line managers never see pay.
const money = (value: unknown) => cleanHrNumber(value, 0, 1_000_000_000)

function bandFields(body: Record<string, unknown>) {
  const min = money(body.min_ngn); const mid = money(body.midpoint_ngn); const max = money(body.max_ngn)
  return {
    code: cleanHrText(body.code, 20).toUpperCase(), label: cleanHrText(body.label, 160), level: cleanHrEnum(body.level, hrLevels), department: cleanHrEnum(body.department, hrDepartments),
    pay_basis: cleanHrEnum(body.pay_basis, values(payBases)) || 'monthly', min_ngn: min, midpoint_ngn: mid ?? (min !== null && max !== null ? Math.round((min + max) / 2) : null), max_ngn: max,
    effective_from: cleanHrDate(body.effective_from), notes: cleanHrText(body.notes, 2000), confirmed: body.confirmed === true,
  }
}
function bandError(band: ReturnType<typeof bandFields>) {
  if (!band.code || !band.label) return 'Give the band a code and a label.'
  if (band.min_ngn === null || band.max_ngn === null || band.midpoint_ngn === null) return 'Enter the minimum, midpoint and maximum.'
  if (!(band.min_ngn <= band.midpoint_ngn && band.midpoint_ngn <= band.max_ngn)) return 'The minimum must be at or below the midpoint, and the midpoint at or below the maximum.'
  return null
}
function compensationFields(body: Record<string, unknown>) {
  return {
    effective_date: cleanHrDate(body.effective_date), level: cleanHrEnum(body.level, hrLevels), band_code: cleanHrOptionalText(body.band_code, 20), basic_ngn: money(body.basic_ngn) ?? 0, housing_ngn: money(body.housing_ngn) ?? 0,
    transport_ngn: money(body.transport_ngn) ?? 0, other_ngn: money(body.other_ngn) ?? 0, locum_session_rate_ngn: money(body.locum_session_rate_ngn), reason: cleanHrEnum(body.reason, values(compensationReasons)) || 'adjustment',
    review_id: cleanHrUuid(body.review_id), notes: cleanHrText(body.notes, 2000),
  }
}
async function compensationWarnings(context: PerformanceContext, fields: ReturnType<typeof compensationFields>, department: string) {
  const gross = fields.basic_ngn + fields.housing_ngn + fields.transport_ngn + fields.other_ngn; const warnings: string[] = []
  if (gross > 0 && gross < nationalMinimumWage) warnings.push(`Monthly gross ${formatNaira(gross)} is below the national minimum wage (${formatNaira(nationalMinimumWage)}).`)
  const { data: bands } = await context.database.from('hr_salary_bands').select('*')
  const band = bandFor((bands || []) as HrSalaryBand[], fields.level, department as HrSalaryBand['department'], fields.effective_date || context.today)
  if (band && gross && band.pay_basis === 'monthly' && (gross < Number(band.min_ngn) || gross > Number(band.max_ngn))) warnings.push(`Outside band ${band.code} (${formatNaira(band.min_ngn)} – ${formatNaira(band.max_ngn)}).`)
  if (band && !band.confirmed) warnings.push(`Band ${band.code} is still a placeholder; confirm it with the accountant.`)
  if (fields.review_id && fields.reason === 'annual_review') {
    const { data: review } = await context.database.from('hr_reviews').select('ethics_override').eq('id', fields.review_id).maybeSingle()
    if (review?.ethics_override) warnings.push('The linked appraisal has an ethics override: no merit raise that year.')
  }
  return warnings
}

export async function GET(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  if (!isAdmin(context)) return denied('Pay records are admin only.')
  try {
    const [bands, compensation, employees] = await Promise.all([
      context.database.from('hr_salary_bands').select('*').order('level').order('department').order('effective_from', { ascending: false }),
      context.database.from('hr_compensation').select('*').order('effective_date', { ascending: false }),
      context.database.from('hr_employees').select(hrEmployeeWorkColumns).order('legal_name'),
    ])
    const error = bands.error || compensation.error || employees.error; if (error) throw error
    await log(context, null, { action: 'view_pay', description: 'Viewed salary bands and compensation', entityType: 'hr_compensation', entityId: 'all' })
    return json({ bands: bands.data || [], compensation: compensation.data || [], employees: employees.data || [] })
  } catch (error) { return failure(error, 'Failed to load pay') }
}

export async function POST(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  if (!isAdmin(context)) return denied('Pay records are admin only.')
  try {
    const body = await readBody(request); if (!body) return invalid('Details are required.')
    const now = new Date().toISOString()
    if (body.kind === 'band') {
      const band = bandFields(body); const problem = bandError(band); if (problem) return invalid(problem)
      const { data, error } = await context.database.from('hr_salary_bands').insert({ ...band, effective_from: band.effective_from || context.today, ...(band.confirmed ? { confirmed_by: context.user.id, confirmed_at: now } : {}) }).select('*').single()
      if (error) throw error
      await log(context, null, { action: 'create_salary_band', description: `Added salary band ${band.code}`, entityType: 'hr_salary_band', entityId: data.id, metadata: { min: band.min_ngn, max: band.max_ngn, confirmed: band.confirmed } })
      return json({ band: data }, 201)
    }
    const employee = await loadEmployee(context, cleanHrUuid(body.employee_id)); if (!employee) return json({ error: 'Employee not found.' }, 404)
    const fields = compensationFields(body); if (!fields.effective_date) return invalid('Choose the date the pay takes effect.')
    if (!fields.basic_ngn && !fields.locum_session_rate_ngn) return invalid('Enter the basic salary or a locum session rate.')
    const warnings = await compensationWarnings(context, fields, employee.department)
    const { data, error } = await context.database.from('hr_compensation').insert({ ...fields, employee_id: employee.id, approved_by: context.user.id, created_by: context.user.id }).select('*').single()
    if (error) throw error
    await log(context, employee, { action: 'create_compensation', description: `Recorded pay effective ${fields.effective_date} for ${displayName(employee)}`, entityType: 'hr_compensation', entityId: data.id, metadata: { reason: fields.reason, gross: data.monthly_gross_ngn } })
    return json({ compensation: data, warnings }, 201)
  } catch (error) { return failure(error, 'Failed to save pay') }
}

export async function PATCH(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  if (!isAdmin(context)) return denied('Pay records are admin only.')
  try {
    const body = await readBody(request); const id = cleanHrUuid(body?.id); if (!body || !id) return invalid('A valid record is required.')
    if (body.kind === 'band') {
      const { data: current } = await context.database.from('hr_salary_bands').select('confirmed,confirmed_by,confirmed_at').eq('id', id).maybeSingle(); if (!current) return json({ error: 'Band not found.' }, 404)
      const band = bandFields(body); const problem = bandError(band); if (problem) return invalid(problem)
      const confirmation = band.confirmed ? (current.confirmed ? { confirmed_by: current.confirmed_by, confirmed_at: current.confirmed_at } : { confirmed_by: context.user.id, confirmed_at: new Date().toISOString() }) : { confirmed_by: null, confirmed_at: null }
      const { data, error } = await context.database.from('hr_salary_bands').update({ ...band, effective_from: band.effective_from || context.today, ...confirmation }).eq('id', id).select('*').single(); if (error) throw error
      await log(context, null, { action: 'update_salary_band', description: `Updated salary band ${band.code}`, entityType: 'hr_salary_band', entityId: id, metadata: { min: band.min_ngn, max: band.max_ngn, confirmed: band.confirmed } })
      return json({ band: data })
    }
    const { data: current } = await context.database.from('hr_compensation').select('*').eq('id', id).maybeSingle(); if (!current) return json({ error: 'Pay record not found.' }, 404)
    const employee = await loadEmployee(context, current.employee_id); if (!employee) return json({ error: 'Employee not found.' }, 404)
    const fields = compensationFields(body); if (!fields.effective_date) return invalid('Choose the date the pay takes effect.')
    const warnings = await compensationWarnings(context, fields, employee.department)
    const { data, error } = await context.database.from('hr_compensation').update(fields).eq('id', id).select('*').single(); if (error) throw error
    await log(context, employee, { action: 'update_compensation', description: `Corrected the pay record effective ${fields.effective_date} for ${displayName(employee)}`, entityType: 'hr_compensation', entityId: id, metadata: { before: { gross: current.monthly_gross_ngn, effective_date: current.effective_date }, after: { gross: data.monthly_gross_ngn, effective_date: data.effective_date } } })
    return json({ compensation: data, warnings })
  } catch (error) { return failure(error, 'Failed to update pay') }
}

export async function DELETE(request: NextRequest) {
  const context = await performanceContext(request); if (context instanceof Response) return context
  if (!isAdmin(context)) return denied('Pay records are admin only.')
  try {
    const id = cleanHrUuid(new URL(request.url).searchParams.get('band')); if (!id) return invalid('Only salary bands can be deleted; pay history is corrected, not removed.')
    const { data, error } = await context.database.from('hr_salary_bands').delete().eq('id', id).select('code').maybeSingle(); if (error) throw error
    await log(context, null, { action: 'delete_salary_band', description: `Deleted salary band ${data?.code || id}`, entityType: 'hr_salary_band', entityId: id })
    return json({ success: true })
  } catch (error) { return failure(error, 'Failed to delete the band') }
}
