import { NextRequest, NextResponse } from 'next/server'
import { initializeTransaction, newPaymentReference, paystackConfigured } from '@/lib/paystack'
import { portalUrl } from '@/lib/portal-url'
import { checkRateLimit } from '@/lib/request-security'
import { canSelfEnrol, enrol, getEnrolment, loadProgram, trainingErrorMessage } from '@/lib/training-access'
import { getRequestLearner } from '@/lib/training-learner'

// Join a public course. Free courses enrol at once; paid courses return a
// Paystack checkout link and enrol only after the payment is verified.
export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(request, 'learn-enrol', 20, 60 * 60 * 1000)
    if (!limit.allowed) return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    const context = await getRequestLearner(request)
    if (!context) return NextResponse.json({ error: 'Sign in to enrol.' }, { status: 403 })
    const { database, learner } = context
    const body = await request.json().catch(() => null) as { slug?: unknown } | null
    const program = typeof body?.slug === 'string' ? await loadProgram(database, { slug: body.slug }) : null
    if (!program || !canSelfEnrol(program, learner)) return NextResponse.json({ error: 'This course is not open for enrolment.' }, { status: 404 })

    const existing = await getEnrolment(database, program.id, learner.id)
    if (existing?.status === 'revoked') return NextResponse.json({ error: 'Your place on this course was withdrawn. Contact FXMed for help.' }, { status: 403 })
    if (existing) return NextResponse.json({ enrolled: true })
    if (program.price_kobo <= 0) {
      await enrol(database, program, learner, 'free')
      return NextResponse.json({ enrolled: true }, { status: 201 })
    }

    if (!paystackConfigured()) return NextResponse.json({ error: 'Online payment is not available yet. Please contact FXMed to enrol.' }, { status: 503 })
    const reference = newPaymentReference()
    const { error } = await database.from('training_payments').insert({ reference, program_id: program.id, user_id: learner.id, amount_kobo: program.price_kobo, currency: program.currency })
    if (error) throw error
    const checkout = await initializeTransaction({
      email: learner.email, amountKobo: program.price_kobo, currency: program.currency, reference,
      callbackUrl: portalUrl(request, `/learn/${program.slug}`),
      metadata: { purpose: 'training_course', program_id: program.id, user_id: learner.id },
    })
    return NextResponse.json({ checkout_url: checkout.authorization_url, reference })
  } catch (error) { console.error('Error enrolling learner:', error); return NextResponse.json({ error: trainingErrorMessage(error) }, { status: 500 }) }
}
