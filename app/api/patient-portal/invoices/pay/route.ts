import { NextRequest, NextResponse } from 'next/server'
import { isUuid } from '@/lib/emr'
import { getRequestPatient } from '@/lib/patient-portal'
import { PaymentProblem, startInvoicePayment } from '@/lib/online-payments'

// "Pay now" in the patient portal: starts a Paystack checkout for the balance
// of one of the signed-in patient's own invoices.
export async function POST(request: NextRequest) {
  const context = await getRequestPatient(request)
  if (!context) return NextResponse.json({ error: 'Patient portal access required' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { invoiceId?: string }
  if (!isUuid(body.invoiceId)) return NextResponse.json({ error: 'Choose an invoice to pay.' }, { status: 400 })
  try {
    const { data: patient } = await context.database.from('emr_patients').select('email').eq('id', context.patientId).maybeSingle()
    const email = context.user.email || patient?.email
    if (!email) return NextResponse.json({ error: 'Add an email address to your account to pay online.' }, { status: 400 })
    const checkout = await startInvoicePayment(context.database, { invoiceId: body.invoiceId as string, patientId: context.patientId, email, origin: request.nextUrl.origin })
    return NextResponse.json(checkout)
  } catch (error) {
    if (error instanceof PaymentProblem) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('Could not start invoice payment:', error)
    return NextResponse.json({ error: 'Online payment is not available right now. Please try again later or pay by bank transfer.' }, { status: 500 })
  }
}
