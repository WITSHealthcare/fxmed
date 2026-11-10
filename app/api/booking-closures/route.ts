import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { upcomingClosures } from '@/lib/bookingClosures'
import { checkRateLimit } from '@/lib/request-security'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

// GET - The days and times closed to bookings from today on, so the booking
// forms only offer open times. Staff notes are not included.
export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(request, 'booking-closures', 60, 5 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
  }
  if (!supabase) return NextResponse.json({ error: 'Database connection not available' }, { status: 503 })

  try {
    const closures = await upcomingClosures(supabase)
    return NextResponse.json({ closures }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error loading booking closures:', error)
    return NextResponse.json({ error: 'Booking availability could not be loaded' }, { status: 500 })
  }
}
