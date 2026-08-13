import { NextRequest, NextResponse } from 'next/server'
import { getRequestAmbassador } from '@/lib/ambassador-portal'
import { checkRateLimit } from '@/lib/request-security'

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, 'ambassador-referral-create', 30, 60 * 60 * 1000)
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many referrals submitted. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
    const context = await getRequestAmbassador(request)
    if (!context) return NextResponse.json({ error: 'Active ambassador access required' }, { status: 403 })
    const { profile, database } = context
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const firstName = clean(body?.first_name, 80)
    const lastName = clean(body?.last_name, 80)
    const email = clean(body?.email, 254).toLowerCase()
    const phone = clean(body?.phone, 40)
    const notes = clean(body?.notes, 1600) || null
    if (!firstName || !lastName || !email.includes('@') || !phone || body?.consent_confirmed !== true) {
      return NextResponse.json({ error: 'Client details and confirmation of consent are required.' }, { status: 400 })
    }

    const { data, error } = await database.from('ambassador_referrals').insert({
      ambassador_id: profile.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      notes,
      consent_confirmed: true,
    }).select('*').single()
    if (error) throw error
    return NextResponse.json({ referral: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating ambassador referral:', error)
    return NextResponse.json({ error: 'Failed to submit the referral.' }, { status: 500 })
  }
}
