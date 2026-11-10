import { NextRequest, NextResponse } from 'next/server'
import { getEmrDatabase } from '@/lib/emr'
import { portalUrl } from '@/lib/portal-url'
import { checkRateLimit, cleanPublicString, isEmail } from '@/lib/request-security'

// POST - Email a patient a new link to set their password ({ email }).
// Sent from the server, so the link works on any device, not only the browser
// that asked for it. The reply is the same whether or not the email has
// portal access, so it cannot be used to find out who is a patient.

const sent = 'If this email has Patient Portal access, a new link is on its way. It can take a few minutes to arrive, so check your spam folder too.'

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, 'patient-portal-reset', 5, 15 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a few minutes and try again.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const email = cleanPublicString(body?.email, 180)?.toLowerCase()
  if (!email || !isEmail(email)) return NextResponse.json({ error: 'Enter the email address your care team invited.' }, { status: 400 })

  const database = getEmrDatabase()
  if (!database) return NextResponse.json({ error: 'The patient portal is unavailable right now.' }, { status: 503 })

  try {
    for (let page = 1; page <= 5; page++) {
      const { data, error } = await database.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      const user = data.users.find(candidate => candidate.email?.toLowerCase() === email)
      if (user) {
        const { data: account } = await database.from('patient_portal_accounts').select('status').eq('user_id', user.id).maybeSingle()
        if (account && account.status !== 'suspended') {
          const { error: resetError } = await database.auth.resetPasswordForEmail(email, { redirectTo: portalUrl(request, '/patient-portal/setup') })
          if (resetError) throw resetError
        }
        break
      }
      if (data.users.length < 1000) break
    }
  } catch (error) {
    console.error('Error sending a patient portal link:', error)
  }
  return NextResponse.json({ message: sent })
}
