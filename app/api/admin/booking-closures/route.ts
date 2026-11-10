import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'
import { writeRequestAdminActivity } from '@/lib/admin-activity'
import { isMissingTable } from '@/lib/bookingClosures'
import { CLOSABLE_TIMES, displayDate, displayTime, isDate } from '@/lib/bookingTimes'
import { cleanPublicString } from '@/lib/request-security'

// Staff close days, or single times on a day, to new bookings from the
// Requests calendar. See migration 044.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

const columns = 'id, closed_date, closed_time, reason, created_at'
const forbidden = () => NextResponse.json({ error: 'Requests access required' }, { status: 403 })
const unavailable = () => NextResponse.json({ error: 'Database connection not available' }, { status: 503 })
const notSetUp = () => NextResponse.json({ error: 'Closing days and times needs database migration 044 to be run first.' }, { status: 503 })

async function allClosures() {
  const { data, error } = await supabase!
    .from('booking_closures')
    .select(columns)
    .order('closed_date', { ascending: true })
    .order('closed_time', { ascending: true, nullsFirst: true })
  if (error) throw error
  return data || []
}

function failed(error: unknown, action: string) {
  if (isMissingTable(error as { code?: string })) return notSetUp()
  console.error(`Error ${action} booking closures:`, error)
  return NextResponse.json({ error: `Booking availability could not be ${action === 'loading' ? 'loaded' : 'saved'}. Please try again.` }, { status: 500 })
}

// GET - Every closed day and time, with staff notes
export async function GET(request: NextRequest) {
  if (!await getAuthorizedAdminRole(request, 'requests')) return forbidden()
  if (!supabase) return unavailable()
  try {
    return NextResponse.json({ closures: await allClosures() })
  } catch (error) {
    // Before the migration is run, nothing is closed.
    if (isMissingTable(error as { code?: string })) return NextResponse.json({ closures: [], needsMigration: true })
    return failed(error, 'loading')
  }
}

// POST - Close a whole day ({ date }) or one time on it ({ date, time })
export async function POST(request: NextRequest) {
  if (!await getAuthorizedAdminRole(request, 'requests')) return forbidden()
  if (!supabase) return unavailable()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 })
  }
  const date = typeof body.date === 'string' ? body.date : ''
  const time = typeof body.time === 'string' && body.time ? body.time : null
  const reason = cleanPublicString(body.reason, 200) || null
  if (!isDate(date)) return NextResponse.json({ error: 'A valid date is required.' }, { status: 400 })
  if (time && !CLOSABLE_TIMES.includes(time)) return NextResponse.json({ error: 'A valid booking time is required.' }, { status: 400 })

  try {
    const { data: dayClosure, error: dayError } = await supabase
      .from('booking_closures').select('id').eq('closed_date', date).is('closed_time', null).maybeSingle()
    if (dayError) throw dayError
    if (time && dayClosure) return NextResponse.json({ error: 'The whole day is already closed.' }, { status: 409 })

    const { error } = await supabase.from('booking_closures').insert({ closed_date: date, closed_time: time, reason })
    // Already closed, say by someone else a moment ago.
    if (error && error.code !== '23505') throw error

    // A closed day covers every time, so its single-time closures go.
    if (!time) {
      const { error: tidyError } = await supabase.from('booking_closures').delete().eq('closed_date', date).not('closed_time', 'is', null)
      if (tidyError) throw tidyError
    }

    await writeRequestAdminActivity(supabase, request, {
      action: 'close_booking_time',
      module: 'Requests',
      description: time ? `Closed ${displayTime(time)} on ${displayDate(date)} to bookings` : `Closed ${displayDate(date)} to bookings`,
      entityType: 'booking_closure',
      metadata: { date, time, reason },
    })
    return NextResponse.json({ closures: await allClosures() })
  } catch (error) {
    return failed(error, 'saving')
  }
}

// DELETE - Reopen a closed day or time (?id=)
export async function DELETE(request: NextRequest) {
  if (!await getAuthorizedAdminRole(request, 'requests')) return forbidden()
  if (!supabase) return unavailable()

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'A closure ID is required.' }, { status: 400 })

  try {
    const { data, error } = await supabase.from('booking_closures').delete().eq('id', id).select('closed_date, closed_time')
    if (error) throw error
    const removed = data?.[0]
    if (removed) {
      await writeRequestAdminActivity(supabase, request, {
        action: 'reopen_booking_time',
        module: 'Requests',
        description: removed.closed_time
          ? `Reopened ${displayTime(removed.closed_time)} on ${displayDate(removed.closed_date)} for bookings`
          : `Reopened ${displayDate(removed.closed_date)} for bookings`,
        entityType: 'booking_closure',
        entityId: id,
        metadata: { date: removed.closed_date, time: removed.closed_time },
      })
    }
    return NextResponse.json({ closures: await allClosures() })
  } catch (error) {
    return failed(error, 'saving')
  }
}
