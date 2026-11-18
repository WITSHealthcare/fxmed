import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminRole } from './admin-auth'
import { lagosDate } from './follow-ups'
import { MAX_AGE_DAYS, type Notification } from './admin-notifications'

const LIMIT = 20

/**
 * Overdue training for the notification bell: everyone's for admins, only the
 * caller's own for other roles. Kept apart from notificationSources because it
 * is filtered per person, not per tab.
 */
export async function loadOverdueTraining(supabase: SupabaseClient, role: AdminRole, userId: string) {
  const since = new Date(Date.now() - MAX_AGE_DAYS * 86400000).toISOString()
  let query = supabase.from('training_enrolments')
    .select('id, user_id, due_at, program:training_programs(title)')
    .eq('status', 'active').lt('due_at', new Date().toISOString()).gte('due_at', since)
    .order('due_at', { ascending: false }).limit(LIMIT)
  if (role !== 'admin') query = query.eq('user_id', userId)
  const { data, error } = await query
  if (error) {
    console.error('Notifications: training_enrolments query failed:', error.message)
    return { failed: true, items: [] as Notification[] }
  }

  const names = new Map<string, string>()
  if (role === 'admin' && data?.length) {
    const ids = Array.from(new Set(data.map((row) => row.user_id as string)))
    const [{ data: learners }, ...lookups] = await Promise.all([
      supabase.from('training_learner_accounts').select('user_id, full_name').in('user_id', ids),
      ...ids.map((id) => supabase.auth.admin.getUserById(id)),
    ])
    for (const lookup of lookups) { const found = lookup.data.user; if (found) names.set(found.id, found.user_metadata?.full_name || found.email || 'A learner') }
    for (const learner of learners || []) names.set(learner.user_id, learner.full_name)
  }

  const items: Notification[] = (data || []).map((row) => {
    const program = row.program as { title?: string } | { title?: string }[] | null
    const course = (Array.isArray(program) ? program[0] : program)?.title || 'a course'
    return {
      id: `training_overdue:${row.id}`, kind: 'training_overdue',
      title: role === 'admin' ? `${names.get(row.user_id) || 'A learner'} is overdue on ${course}` : `Overdue: ${course}`,
      detail: `Was due ${lagosDate(new Date(row.due_at))}`,
      timestamp: row.due_at, link: '/admin?tab=training', dismissable: false,
    }
  })
  return { failed: false, items }
}
