import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'
import { writeRequestAdminActivity } from '@/lib/admin-activity'
import { festiveOffer, festiveOfferPhase, visitTimes, wellnessPackages } from '@/lib/festive-offer'
import { checkRateLimit, cleanPublicString, isEmail } from '@/lib/request-security'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

const unavailable = () => NextResponse.json({ error: 'Bookings are temporarily unavailable. Please contact FXMed on WhatsApp.' }, { status: 503 })

function isPhone(value: string) {
  return /^\+?[\d\s()-]+$/.test(value) && value.replace(/\D/g, '').length >= 7
}

// Visits are booked at least a day ahead, counted in Lagos time.
function earliestVisitDate() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date())
  const tomorrow = new Date(`${today}T00:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  return tomorrow.toISOString().slice(0, 10)
}

// POST - A visitor books a festive package
export async function POST(request: NextRequest) {
  if (!supabase) return unavailable()

  // A page cached just before the offer closed can still show the Book buttons.
  const phase = festiveOfferPhase()
  if (phase !== 'live') {
    return NextResponse.json({ error: phase === 'upcoming' ? 'Festive package bookings open on 16 October 2026.' : 'The festive wellness offer has ended. Contact FXMed on WhatsApp to ask about our current packages.' }, { status: 403 })
  }

  const rateLimit = checkRateLimit(request, 'festive-booking-create', 8, 15 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many booking attempts. Please try again shortly.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'The booking details could not be read. Please try again.' }, { status: 400 })
  }

  // The price always comes from the package, never from the browser.
  const pkg = wellnessPackages.find((item) => item.name === body.packageName)
  if (!pkg) return NextResponse.json({ error: 'Please choose a package.' }, { status: 400 })

  const bookedFor = body.bookedFor === 'gift' ? 'gift' : body.bookedFor === 'self' ? 'self' : null
  const buyerFirstName = cleanPublicString(body.buyerFirstName, 100)
  const buyerLastName = cleanPublicString(body.buyerLastName, 100)
  const buyerEmail = cleanPublicString(body.buyerEmail, 180)?.toLowerCase()
  const buyerPhone = cleanPublicString(body.buyerPhone, 40)
  const visitAddress = cleanPublicString(body.visitAddress, 500)
  const recipientName = bookedFor === 'gift' ? cleanPublicString(body.recipientName, 200) : [buyerFirstName, buyerLastName].join(' ')
  const recipientPhone = bookedFor === 'gift' ? cleanPublicString(body.recipientPhone, 40) : buyerPhone
  const giftMessage = bookedFor === 'gift' ? cleanPublicString(body.giftMessage, 1000) : null
  const preferredDate = cleanPublicString(body.preferredDate, 10)
  const preferredTime = cleanPublicString(body.preferredTime, 5)

  if (!bookedFor) return NextResponse.json({ error: 'Please say who the package is for.' }, { status: 400 })
  if (!buyerFirstName || !buyerLastName) return NextResponse.json({ error: 'Please enter your first and last name.' }, { status: 400 })
  if (!buyerEmail || !isEmail(buyerEmail)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  if (!buyerPhone || !isPhone(buyerPhone)) return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 })
  if (!recipientName) return NextResponse.json({ error: 'Please enter the name of the person receiving the gift.' }, { status: 400 })
  if (!recipientPhone || !isPhone(recipientPhone)) return NextResponse.json({ error: 'Please enter a valid phone number for the person receiving the gift.' }, { status: 400 })
  if (!visitAddress) return NextResponse.json({ error: 'Please enter the address for the home visit.' }, { status: 400 })

  // No date means FXMed arranges the visit, so a date and time come together or not at all.
  if (preferredDate || preferredTime) {
    if (!preferredDate || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || Number.isNaN(Date.parse(`${preferredDate}T00:00:00Z`))) {
      return NextResponse.json({ error: 'Please choose a valid visit date.' }, { status: 400 })
    }
    if (preferredDate < earliestVisitDate()) {
      return NextResponse.json({ error: 'Visits must be booked at least a day in advance.' }, { status: 400 })
    }
    if (!visitTimes.some((slot) => slot.value === preferredTime)) {
      return NextResponse.json({ error: 'Please choose a visit time.' }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('festive_bookings')
    .insert({
      offer_id: festiveOffer.id,
      package_name: pkg.name,
      package_price: pkg.amount,
      booked_for: bookedFor,
      buyer_first_name: buyerFirstName,
      buyer_last_name: buyerLastName,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      visit_address: visitAddress,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      gift_message: giftMessage,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating festive booking:', error)
    return NextResponse.json({ error: 'Your booking could not be saved. Please try again, or contact FXMed on WhatsApp.' }, { status: 500 })
  }

  return NextResponse.json({ booking: data, paymentUrl: pkg.paymentUrl || null }, { status: 201 })
}

// GET - Staff list festive bookings
export async function GET(request: NextRequest) {
  if (!await getAuthorizedAdminRole(request, 'requests')) return NextResponse.json({ error: 'Requests access required' }, { status: 403 })
  if (!supabase) return unavailable()

  const { data, error } = await supabase
    .from('festive_bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('Error fetching festive bookings:', error)
    return NextResponse.json({ error: 'Festive bookings could not be loaded.' }, { status: 500 })
  }
  return NextResponse.json({ bookings: data || [] })
}

// PATCH - Staff update a booking's status or payment status
export async function PATCH(request: NextRequest) {
  if (!await getAuthorizedAdminRole(request, 'requests')) return NextResponse.json({ error: 'Requests access required' }, { status: 403 })
  if (!supabase) return unavailable()

  const body = await request.json().catch(() => ({}))
  if (typeof body.id !== 'string' || !body.id) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 })

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status !== undefined) {
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(body.status)) {
      return NextResponse.json({ error: 'A valid booking status is required' }, { status: 400 })
    }
    updateData.status = body.status
  }
  if (body.payment_status !== undefined) {
    if (!['pending', 'paid', 'failed'].includes(body.payment_status)) {
      return NextResponse.json({ error: 'A valid payment status is required' }, { status: 400 })
    }
    updateData.payment_status = body.payment_status
  }
  if (Object.keys(updateData).length === 1) return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })

  const { data, error } = await supabase
    .from('festive_bookings')
    .update(updateData)
    .eq('id', body.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating festive booking:', error)
    return NextResponse.json({ error: 'The booking could not be updated.' }, { status: 500 })
  }

  await writeRequestAdminActivity(supabase, request, {
    action: 'update_festive_booking',
    module: 'Requests',
    description: `Updated ${data.package_name} booking from ${data.buyer_first_name} ${data.buyer_last_name}`,
    entityType: 'festive_booking',
    entityId: data.id,
    metadata: { status: data.status, payment_status: data.payment_status },
  })

  return NextResponse.json({ booking: data })
}
