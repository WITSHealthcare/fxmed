import { NextRequest, NextResponse } from 'next/server'
import { getRequestPatient } from '@/lib/patient-portal'
import { isOnlinePaymentReference, settleOnlinePayment } from '@/lib/online-payments'

// The portal calls this when Paystack sends the patient back, to confirm the
// payment straight away rather than waiting for the webhook.
export async function POST(request: NextRequest) {
  const context = await getRequestPatient(request)
  if (!context) return NextResponse.json({ error: 'Patient portal access required' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { reference?: string }
  const reference = String(body.reference || '')
  if (!reference.startsWith('fxinv_') || !isOnlinePaymentReference(reference)) return NextResponse.json({ error: 'Unknown payment.' }, { status: 400 })
  try {
    const { data: payment } = await context.database.from('online_payments').select('patient_id').eq('reference', reference).maybeSingle()
    if (!payment || payment.patient_id !== context.patientId) return NextResponse.json({ error: 'Unknown payment.' }, { status: 404 })
    const result = await settleOnlinePayment(context.database, reference)
    return NextResponse.json(result.ok ? { status: 'paid', amount: result.amountKobo / 100 } : { status: result.reason === 'failed' || result.reason === 'abandoned' ? 'failed' : 'pending' })
  } catch (error) {
    console.error('Could not verify invoice payment:', error)
    return NextResponse.json({ status: 'pending' })
  }
}
