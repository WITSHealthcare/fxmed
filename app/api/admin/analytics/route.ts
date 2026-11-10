import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { canAccessTab, getUserAdminRole } from '@/lib/admin-auth'
import { lagosToday } from '@/lib/bookingTimes'

// GET - Website analytics for the SEO Analytics tab (?range=today|7d|30d|90d).
// The period runs from the start of its first Lagos day until now; the
// comparison is the same stretch of time just before it, so "today" is
// compared with yesterday up to this time, not with all of yesterday.

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ranges: Record<string, number> = { today: 1, '7d': 7, '30d': 30, '90d': 90 }
const DAY_MS = 86400000
const addDays = (day: string, count: number) => new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10)
const lagosMidnight = (day: string) => new Date(`${day}T00:00:00+01:00`)
const missing = (error: { code?: string } | null) => ['42P01', 'PGRST205', 'PGRST202', '42883'].includes(error?.code || '')

export async function GET(request: NextRequest) {
  const role = getUserAdminRole(await getRequestAdminUser(request))
  if (!canAccessTab(role, 'seo')) return NextResponse.json({ error: 'SEO access required' }, { status: 403 })

  const key = request.nextUrl.searchParams.get('range') || '7d'
  const days = ranges[key] || 7
  const today = lagosToday()
  const firstDay = addDays(today, -(days - 1))
  const from = lagosMidnight(firstDay)
  const now = new Date()
  const previousFrom = new Date(from.getTime() - days * DAY_MS)
  const previousTo = new Date(now.getTime() - days * DAY_MS)
  const inPeriod = (table: string) => supabase.from(table).select('id', { count: 'exact', head: true }).gte('created_at', from.toISOString()).lte('created_at', now.toISOString())

  try {
    const [current, previous, live, first, bookings, festive, messages] = await Promise.all([
      supabase.rpc('site_analytics', { p_from: from.toISOString(), p_to: now.toISOString() }),
      supabase.rpc('site_analytics', { p_from: previousFrom.toISOString(), p_to: previousTo.toISOString(), p_limit: 1 }),
      supabase.from('site_page_views').select('session_id').gte('created_at', new Date(now.getTime() - 5 * 60 * 1000).toISOString()).limit(2000),
      supabase.from('site_page_views').select('created_at').order('created_at', { ascending: true }).limit(1),
      inPeriod('appointments'),
      inPeriod('festive_bookings'),
      inPeriod('messages'),
    ])
    if (missing(current.error)) return NextResponse.json({ needsMigration: true })
    if (current.error) throw current.error

    return NextResponse.json({
      range: { key, days, from: firstDay, to: today },
      ...current.data,
      previous: previous.data?.totals || null,
      liveVisitors: new Set((live.data || []).map(row => row.session_id)).size,
      trackingSince: first.data?.[0]?.created_at || null,
      bookings: (bookings.count || 0) + (festive.count || 0),
      messages: messages.count || 0,
    })
  } catch (error) {
    console.error('Error loading website analytics:', error)
    return NextResponse.json({ error: 'Website analytics could not be loaded. Please try again.' }, { status: 500 })
  }
}
