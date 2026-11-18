import { NextRequest, NextResponse } from 'next/server'
import { getRequestLearner } from '@/lib/training-learner'
import { settleCoursePayment } from '@/lib/training-payments'

// Called when Paystack sends the learner back, so access does not wait on the webhook.
export async function POST(request: NextRequest) {
  try {
    const context = await getRequestLearner(request)
    if (!context) return NextResponse.json({ error: 'Learner sign-in required' }, { status: 403 })
    const { database, learner } = context
    const body = await request.json().catch(() => null) as { reference?: unknown } | null
    const reference = typeof body?.reference === 'string' && /^fxmc_[a-z0-9_]{6,60}$/.test(body.reference) ? body.reference : ''
    if (!reference) return NextResponse.json({ error: 'A valid payment reference is required.' }, { status: 400 })
    const { data: payment } = await database.from('training_payments').select('user_id').eq('reference', reference).maybeSingle()
    if (!payment || payment.user_id !== learner.id) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 })
    const result = await settleCoursePayment(database, reference)
    return result.ok
      ? NextResponse.json({ enrolled: true })
      : NextResponse.json({ enrolled: false, error: result.reason === 'abandoned' || result.reason === 'ongoing' ? 'The payment was not completed.' : 'We could not confirm this payment yet. If you were charged, it will be applied shortly.' }, { status: 402 })
  } catch (error) { console.error('Error verifying course payment:', error); return NextResponse.json({ error: 'We could not confirm the payment right now. Please refresh in a moment.' }, { status: 500 }) }
}
