// Loading the days and times staff have closed to bookings (migration 038).
// Server only: the table is read with the service role.
import type { SupabaseClient } from '@supabase/supabase-js'
import { lagosToday, type BookingClosure } from '@/lib/bookingTimes'

/** The table does not exist until migration 038 has been run. */
export const isMissingTable = (error: { code?: string } | null) => error?.code === '42P01' || error?.code === 'PGRST205'

/** Closures from today on, Lagos time. Until the table exists nothing is closed. */
export async function upcomingClosures(database: SupabaseClient): Promise<BookingClosure[]> {
  const { data, error } = await database
    .from('booking_closures')
    .select('closed_date, closed_time')
    .gte('closed_date', lagosToday())
  if (isMissingTable(error)) return []
  if (error) throw error
  return (data || []).map(row => ({ date: row.closed_date, time: row.closed_time }))
}
