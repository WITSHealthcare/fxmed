import type { NextRequest } from 'next/server'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { canAccessTab, getUserAdminRole } from '@/lib/admin-auth'
import { getHrDatabase, type HrViewer } from '@/lib/hr'

// Resolves the signed-in dashboard user for /api/admin/hr/* routes: role, own
// employee record (if any) and direct reports. Use canHr / hrRelation from
// lib/hr.ts on the result; never trust ids sent by the browser for "self".
export async function getHrContext(request: NextRequest) {
  const user = await getRequestAdminUser(request); const role = getUserAdminRole(user)
  if (!user || !role || !canAccessTab(role, 'hr')) return { error: 'HR access required', status: 403 } as const
  const database = getHrDatabase()
  if (!database) return { error: 'Database unavailable', status: 503 } as const
  const { data: self, error } = await database.from('hr_employees').select('id').eq('auth_user_id', user.id).maybeSingle()
  // Before migration 041 is applied the lookup fails; admins still get through.
  if (error) console.error('Error resolving HR viewer:', error.message)
  const employeeId: string | null = self?.id || null
  let reportIds: string[] = []
  if (employeeId) {
    const { data: reports } = await database.from('hr_employees').select('id').eq('line_manager_id', employeeId)
    reportIds = (reports || []).map((row) => row.id as string)
  }
  const viewer: HrViewer = { userId: user.id, email: user.email?.toLowerCase() || '', role, employeeId, reportIds }
  return { user, viewer, database } as const
}
