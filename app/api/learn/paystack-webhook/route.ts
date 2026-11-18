import { NextRequest, NextResponse } from 'next/server'
import { validWebhookSignature } from '@/lib/paystack'
import { getTrainingDatabase } from '@/lib/training'
import { settleCoursePayment } from '@/lib/training-payments'

// Paystack calls this when a charge succeeds. The body is signed with our
// secret key; the payment is then re-verified with Paystack before access is
// granted, so a replayed or forged event cannot enrol anyone.
export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (!validWebhookSignature(raw, request.headers.get('x-paystack-signature'))) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  const event = JSON.parse(raw || '{}') as { event?: string; data?: { reference?: string } }
  const reference = event.data?.reference || ''
  if (event.event !== 'charge.success' || !reference.startsWith('fxmc_')) return NextResponse.json({ received: true })
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
