import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { writeAdminActivity, type AdminActivityDetails } from '@/lib/admin-activity'
import { lagosDate } from '@/lib/follow-ups'
import { canHr, hrEmployeeWorkColumns, hrRelation, type HrAction, type HrEmployee, type HrRelation, type HrResource, type HrViewer } from '@/lib/hr'
import { getHrContext } from '@/lib/hr-server'
import { hrPerformanceMigrationError } from '@/lib/hr-performance'

// Server helpers for /api/admin/hr/performance/*. Not a route.

export type PerformanceContext = { user: User; viewer: HrViewer; database: SupabaseClient; today: string }

export async function performanceContext(request: NextRequest): Promise<PerformanceContext | NextResponse> {
  const context = await getHrContext(request)
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status })
  return { user: context.user, viewer: context.viewer, database: context.database, today: lagosDate() }
}

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status })
export const denied = (message = 'You do not have access to this record.') => json({ error: message }, 403)
export const invalid = (message: string) => json({ error: message }, 400)
export async function readBody(request: NextRequest) {
  const body = await request.json().catch(() => null)
  return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null
}

const missingTableCodes = ['42P01', 'PGRST205', '42703', 'PGRST204']
export function failure(error: unknown, message: string) {
  const code = (error as { code?: string } | null)?.code
  console.error(`${message}:`, error)
  if (code && missingTableCodes.includes(code)) return json({ error: hrPerformanceMigrationError }, 503)
  if (code === '23505') return json({ error: 'That record already exists.' }, 409)
  if (code === '23514') return json({ error: 'Those values are not allowed. Check the dates, ratings and required reasons.' }, 400)
  return json({ error: `${message}.` }, 500)
}

export type EmployeeRow = HrEmployee & { leaving_reason?: string | null }
export async function loadEmployee(context: PerformanceContext, id: string | null) {
  if (!id) return null
  const { data, error } = await context.database.from('hr_employees').select(hrEmployeeWorkColumns).eq('id', id).maybeSingle()
  if (error) throw error
  return (data as unknown as EmployeeRow) || null
}
export const relationTo = (context: PerformanceContext, employee: Pick<HrEmployee, 'id' | 'auth_user_id' | 'line_manager_id'>): HrRelation => hrRelation(context.viewer, employee)
export const allowed = (context: PerformanceContext, resource: HrResource, relation: HrRelation, action: HrAction = 'read') => canHr(context.viewer.role, resource, relation, action)
export const isAdmin = (context: PerformanceContext) => context.viewer.role === 'admin'

export async function log(context: PerformanceContext, employee: Pick<HrEmployee, 'auth_user_id' | 'legal_name'> | null, details: Omit<AdminActivityDetails, 'module' | 'subjectUserId'>) {
  await writeAdminActivity(context.database, context.user, { ...details, module: 'hr', subjectUserId: employee?.auth_user_id || null, metadata: { ...(details.metadata || {}), area: 'performance' } })
}

export async function holidayDates(context: PerformanceContext, start: string, end: string) {
  const { data, error } = await context.database.from('hr_public_holidays').select('holiday_date').gte('holiday_date', start).lte('holiday_date', end)
  if (error) throw error
  return (data || []).map((row) => row.holiday_date as string)
}

// Keys a record to an employee the viewer may touch, or explains why not.
export async function employeeFor(context: PerformanceContext, employeeId: unknown, resource: HrResource, action: HrAction) {
  const employee = await loadEmployee(context, typeof employeeId === 'string' ? employeeId : null)
  if (!employee) return { response: json({ error: 'Employee not found.' }, 404) } as const
  const relation = relationTo(context, employee)
  if (!allowed(context, resource, relation, action)) return { response: denied() } as const
  return { employee, relation } as const
}
