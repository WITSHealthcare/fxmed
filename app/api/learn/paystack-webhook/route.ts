import { NextRequest, NextResponse } from 'next/server'
import { validWebhookSignature } from '@/lib/paystack'
import { getTrainingDatabase } from '@/lib/training'
import { settleCoursePayment } from '@/lib/training-payments'
import { getEmrDatabase } from '@/lib/emr'
import { isOnlinePaymentReference, settleOnlinePayment } from '@/lib/online-payments'

// Paystack calls this when a charge succeeds. It is the one webhook URL set in
// the Paystack dashboard, so it handles every kind of payment by reference
// prefix: fxmc_ courses, fxinv_ invoices, fxbk_ bookings. The body is signed
// with our secret key, and each payment is re-verified with Paystack before
// anything is granted or recorded, so a replayed or forged event does nothing.
export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (!validWebhookSignature(raw, request.headers.get('x-paystack-signature'))) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  const event = JSON.parse(raw || '{}') as { event?: string; data?: { reference?: string } }
  const reference = event.data?.reference || ''
  if (event.event !== 'charge.success') return NextResponse.json({ received: true })
  if (isOnlinePaymentReference(reference)) {
    const emr = getEmrDatabase()
    if (!emr) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    try {
      const result = await settleOnlinePayment(emr, reference)
      if (!result.ok) console.error('Online payment not settled:', reference, result.reason)
      return NextResponse.json({ received: true })
    } catch (error) {
      console.error('Online payment webhook failed:', error)
      return NextResponse.json({ error: 'Could not process the payment' }, { status: 500 })
    }
  }
  if (!reference.startsWith('fxmc_')) return NextResponse.json({ received: true })
  const database = getTrainingDatabase()
  if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  try {
    const result = await settleCoursePayment(database, reference)
    if (!result.ok) console.error('Course payment not settled:', reference, result.reason)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Course payment webhook failed:', error)
    // A 5xx makes Paystack retry later.
    return NextResponse.json({ error: 'Could not process the payment' }, { status: 500 })
  }
}
