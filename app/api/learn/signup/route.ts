import { NextRequest, NextResponse } from 'next/server'
import { portalUrl } from '@/lib/portal-url'
import { checkRateLimit, cleanPublicString, isEmail } from '@/lib/request-security'
import { getTrainingDatabase } from '@/lib/training'
import { LEARNER_ACCOUNT_TYPE } from '@/lib/training-learner'

// External learners sign up here. The account is created server-side so
// account_type lives in app_metadata, which a user cannot change themselves;
// they then set a password from the emailed link (/learn/setup).
const text = (value: unknown, max: number) => cleanPublicString(value, max) || ''
const sent = 'Check your email for a link to set your password and finish signing up.'

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(request, 'learn-signup', 5, 60 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: 'Too many sign-up attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  const database = getTrainingDatabase()
  if (!database) return NextResponse.json({ error: 'Sign-up is unavailable right now.' }, { status: 503 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const fullName = text(body?.full_name, 160)
  const email = text(body?.email, 254).toLowerCase()
  const next = typeof body?.next === 'string' && /^\/courses\/[a-z0-9-]{1,120}$/.test(body.next) ? body.next : ''
  if (!fullName || !isEmail(email)) return NextResponse.json({ error: 'Enter your full name and a valid email address.' }, { status: 400 })
  if (body?.consent !== true) return NextResponse.json({ error: 'Please accept the terms to continue.' }, { status: 400 })

  try {
    const redirectTo = portalUrl(request, `/learn/setup${next ? `?next=${encodeURIComponent(next)}` : ''}`)
    const { data, error } = await database.auth.admin.inviteUserByEmail(email, { redirectTo, data: { account_type: LEARNER_ACCOUNT_TYPE, full_name: fullName } })
    // An email that already has an FXMed account gets the same reply, so the
    // form cannot be used to find out who has an account. Existing learners
    // use "Forgot password?" on the sign-in page.
    if (error || !data.user) {
      if (error && !/already|registered|exists/i.test(error.message)) console.error('Learner sign-up failed:', error.message)
      return NextResponse.json({ message: sent })
    }
    const { error: metaError } = await database.auth.admin.updateUserById(data.user.id, { app_metadata: { ...data.user.app_metadata, account_type: LEARNER_ACCOUNT_TYPE } })
    if (metaError) throw metaError
    const { error: accountError } = await database.from('training_learner_accounts').upsert({
      user_id: data.user.id, full_name: fullName,
      organisation: text(body?.organisation, 160), profession: text(body?.profession, 120), phone: text(body?.phone, 40),
    })
    if (accountError) throw accountError
    return NextResponse.json({ message: sent }, { status: 201 })
  } catch (error) {
    console.error('Learner sign-up failed:', error)
    return NextResponse.json({ error: 'We could not create your account. Please try again.' }, { status: 500 })
  }
}
