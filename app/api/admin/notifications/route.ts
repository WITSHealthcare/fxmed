import { NextRequest, NextResponse } from 'next/server'
import { syncReviewFollowUps } from '@/lib/reviewFollowUps'
import { createClient } from '@supabase/supabase-js'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { canAccessTab, getUserAdminRole } from '@/lib/admin-auth'
import { hasEmrPermission } from '@/lib/emr-permissions'
import { loadNotifications, notificationSources } from '@/lib/admin-notifications'
import { loadOverdueTraining } from '@/lib/training-notifications'

export type { NotificationKind } from '@/lib/admin-notifications'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function GET(request: NextRequest) {
  const user = await getRequestAdminUser(request)
  const role = getUserAdminRole(user)
  if (!role) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const visible = notificationSources.filter(source => canAccessTab(role, source.tab) && (!source.permission || hasEmrPermission(role, source.permission)))
  // Due review follow-ups are raised automatically; make sure they exist first.
  if (visible.some(source => source.kind === 'follow_up')) await syncReviewFollowUps(supabase)

  const [loaded, training] = await Promise.all([
    loadNotifications(supabase, visible),
    canAccessTab(role, 'training') ? loadOverdueTraining(supabase, role, user!.id) : null,
  ])
  const notifications = training ? [...loaded.notifications, ...training.items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : loaded.notifications
  const counts = training ? { ...loaded.counts, training_overdue: training.items.length } : loaded.counts
  const degraded = training?.failed ? [...loaded.degraded, 'training_overdue'] : loaded.degraded
  return NextResponse.json({
    notifications,
    total: notifications.length,
    counts,
    // Lets the client say "some sources could not be read" instead of silently
    // showing an undercount, which is the failure the bell had before.
    degraded,
  })
}
