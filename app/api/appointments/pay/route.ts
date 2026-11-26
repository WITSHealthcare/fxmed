import { NextRequest, NextResponse } from 'next/server'
import { isUuid, getEmrDatabase } from '@/lib/emr'
import { checkRateLimit } from '@/lib/request-security'
import { PaymentProblem, startBookingPayment } from '@/lib/online-payments'
import { paystackConfigured } from '@/lib/paystack'

// Starts a Paystack checkout for a booking just made on the website. The price
// is the booking's own (lib/bookingTimes), never one sent by the browser.
// Answers { fallback: true } when online checkout is unavailable, so the
// booking form can use the clinic's Paystack payment page instead.
export async function POST(request: NextRequest) {
  const limit = checkRateLimit(request, 'booking-payment', 10, 10 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  const body = await request.json().catch(() => ({})) as { appointmentId?: string }
  if (!isUuid(body.appointmentId)) return NextResponse.json({ error: 'Booking not found.' }, { status: 400 })
  const database = getEmrDatabase()
  if (!database || !paystackConfigured()) return NextResponse.json({ fallback: true })
  try {
    return NextResponse.json(await startBookingPayment(database, { appointmentId: body.appointmentId as string, origin: request.nextUrl.origin }))
  } catch (error) {
    if (error instanceof PaymentProblem) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('Could not start booking payment:', error)
    return NextResponse.json({ fallback: true })
  }
}
