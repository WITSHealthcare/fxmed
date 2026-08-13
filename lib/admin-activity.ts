import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { getUserAdminRole } from '@/lib/admin-auth'

export type AdminActivityDetails = {
  action: string
  module: string
  description: string
  entityType?: string | null
  entityId?: string | null
  subjectUserId?: string | null
  outcome?: 'success' | 'denied' | 'failed'
  metadata?: Record<string, unknown>
}

export async function writeAdminActivity(database: SupabaseClient, user: User, details: AdminActivityDetails) {
  const { error } = await database.from('admin_activity_logs').insert({
    user_id: user.id,
    subject_user_id: details.subjectUserId || null,
    user_email: user.email || null,
    user_role: getUserAdminRole(user),
    action: details.action,
    module: details.module,
    entity_type: details.entityType || null,
    entity_id: details.entityId || null,
    description: details.description,
    outcome: details.outcome || 'success',
    metadata: details.metadata || {},
  })

  if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
    console.error('Failed to write admin activity log:', error.message)
  }
}

export async function writeRequestAdminActivity(database: SupabaseClient, request: NextRequest, details: AdminActivityDetails) {
  const user = await getRequestAdminUser(request)
  if (user) await writeAdminActivity(database, user, details)
}
