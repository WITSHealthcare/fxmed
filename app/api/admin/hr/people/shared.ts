import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { writeAdminActivity } from '@/lib/admin-activity'
import { lagosDate } from '@/lib/follow-ups'
import { canHr, hrEmployeeWorkColumns, hrRelation, type HrAction, type HrEmployee, type HrRelation, type HrResource, type HrViewer } from '@/lib/hr'
import { getHrContext } from '@/lib/hr-server'
import { credentialReminderDue, credentialStatusOn, dayDiff, type HrCredential, type HrCredentialView } from '@/lib/hr-people'

// Server helpers for /api/admin/hr/people/*. Not a route.

export type PeopleContext = { user: User; viewer: HrViewer; database: SupabaseClient }

export async function peopleContext(request: NextRequest): Promise<PeopleContext | NextResponse> {
  const context = await getHrContext(request)
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status })
  return context as PeopleContext
}
export const isAdmin = (context: PeopleContext) => context.viewer.role === 'admin'
export const deny = (message = 'You do not have access to this record.') => NextResponse.json({ error: message }, { status: 403 })
export const bad = (message: string) => NextResponse.json({ error: message }, { status: 400 })

const missingTable = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code
  return code === '42P01' || code === 'PGRST205' || code === '42703'
}
export function failure(error: unknown, label: string) {
  console.error(`HR people: ${label}:`, error)
  if (missingTable(error)) return NextResponse.json({ error: 'HR tables are missing. Has migration 041 been applied?' }, { status: 500 })
  const code = (error as { code?: string } | null)?.code
  if (code === '23505') return NextResponse.json({ error: 'That would duplicate an existing record (staff number or linked portal account already in use).' }, { status: 409 })
  if (code === '23514') return NextResponse.json({ error: 'One of the values is not allowed. Check the dates and formats.' }, { status: 400 })
  return NextResponse.json({ error: `Failed to ${label}.` }, { status: 500 })
}

// Every view or change of a staff file goes to admin_activity_logs (module 'hr').
export async function logHr(context: PeopleContext, action: string, description: string, entity: { type: string; id: string | null; employee?: Pick<HrEmployee, 'auth_user_id'> | null }, metadata: Record<string, unknown> = {}) {
  await writeAdminActivity(context.database, context.user, { action, module: 'hr', description, entityType: entity.type, entityId: entity.id, subjectUserId: entity.employee?.auth_user_id || null, metadata })
}

// Loads one employee's work columns and the viewer's relation to them, and
// checks canHr for the resource. Returns null when missing or not allowed.
export async function employeeFor(context: PeopleContext, id: unknown, resource: HrResource, action: HrAction = 'read'): Promise<{ employee: HrEmployee; relation: HrRelation } | null> {
  if (typeof id !== 'string') return null
  const { data, error } = await context.database.from('hr_employees').select(hrEmployeeWorkColumns).eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const employee = data as unknown as HrEmployee; const relation = hrRelation(context.viewer, employee)
  return canHr(context.viewer.role, resource, relation, action) ? { employee, relation } : null
}
// Restricted documents are admin only (canHr 'restricted'), except that the
// employee may open their own health records and other restricted documents
// about them; reference responses and guarantor forms stay with People Ops
// (employee-records.md section 2: own consent forms and the outcome only).
const confidentialToEmployee = ['reference', 'guarantor']
export function canOpenDocument(context: PeopleContext, relation: HrRelation, document: { is_restricted: boolean; document_type: string }) {
  if (!canHr(context.viewer.role, 'document', relation)) return false
  if (!document.is_restricted || canHr(context.viewer.role, 'restricted', relation)) return true
  return relation === 'self' && !confidentialToEmployee.includes(document.document_type)
}
// The signed-in user's own employee id, never taken from the browser.
export const selfEmployeeId = (context: PeopleContext) => context.viewer.employeeId

export const today = () => lagosDate()

// Adds expiry status, days left, the reminder due and whether a renewal is
// waiting. With persist (admin loads), stored statuses that have moved with the
// date are saved and reached reminders are stamped as raised, until a cron exists.
export async function viewCredentials(database: SupabaseClient, rows: HrCredential[], persist: boolean): Promise<HrCredentialView[]> {
  const day = today(); const renewals = new Set(rows.filter((row) => row.supersedes_id && row.status === 'pending_verification').map((row) => row.supersedes_id))
  const views = rows.map((row) => {
    const status = credentialStatusOn(row, day)
    return { ...row, status, days_to_expiry: row.expires_on ? dayDiff(day, row.expires_on) : null, reminder_due: credentialReminderDue({ ...row, status }, day), renewal_pending: renewals.has(row.id) }
  })
  if (persist) {
    const now = new Date().toISOString()
    await Promise.all(views.flatMap((view, index) => {
      const changes: Record<string, string> = {}
      if (view.status !== rows[index].status) changes.status = view.status
      if (view.reminder_due) for (const threshold of [90, 60, 30, 7] as const) if (threshold >= view.reminder_due && !view[`reminder_${threshold}_sent_at`]) changes[`reminder_${threshold}_sent_at`] = now
      if (!Object.keys(changes).length) return []
      return [database.from('hr_credentials').update(changes).eq('id', view.id).then(({ error }) => { if (error) console.error('Error saving credential status:', error.message) })]
    }))
  }
  return views
}
