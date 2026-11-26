import { NextRequest, NextResponse } from 'next/server'
import { getEmrDatabase } from '@/lib/emr'
import { checkRateLimit } from '@/lib/request-security'
import { isOnlinePaymentReference, settleOnlinePayment } from '@/lib/online-payments'

// The booking payment page calls this when Paystack sends the visitor back.
// It reports only whether the payment went through: no names or amounts.
export async function POST(request: NextRequest) {
  const limit = checkRateLimit(request, 'payment-verify', 30, 10 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  const body = await request.json().catch(() => ({})) as { reference?: string }
  const reference = String(body.reference || '')
  if (!reference.startsWith('fxbk_') || !isOnlinePaymentReference(reference)) return NextResponse.json({ status: 'unknown' }, { status: 400 })
  const database = getEmrDatabase()
  if (!database) return NextResponse.json({ status: 'pending' })
  try {
    const result = await settleOnlinePayment(database, reference)
    return NextResponse.json({ status: result.ok ? 'paid' : result.reason === 'unknown_reference' ? 'unknown' : ['failed', 'abandoned', 'reversed', 'amount_mismatch'].includes(result.reason) ? 'failed' : 'pending' })
  } catch (error) {
    console.error('Could not verify booking payment:', error)
    return NextResponse.json({ status: 'pending' })
  }
}
