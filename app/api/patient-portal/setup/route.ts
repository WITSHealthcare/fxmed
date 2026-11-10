import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/ambassador-portal'
import { getEmrDatabase, writeEmrAudit } from '@/lib/emr'
import { PATIENT_AUTH_COOKIE } from '@/lib/patient-auth'
import { portalErrorMessage } from '@/lib/patient-portal'

// The account a patient's invitation or reset link signed in, and setting its
// password. The password is set here, on the server, and only once the
// sign-in is confirmed to be a patient's portal account, so a link can never
// change anyone else's password.

const expired = 'This link has expired or has already been used. Enter your email below and we will send you a new one.'

async function linkedPatient(request: NextRequest) {
  const database = getEmrDatabase()
  const user = await getRequestUser(request, PATIENT_AUTH_COOKIE)
  if (!database) return { response: NextResponse.json({ error: 'The patient portal is unavailable right now.' }, { status: 503 }) }
  if (!user) return { response: NextResponse.json({ error: expired, reason: 'expired' }, { status: 401 }) }
  const { data: account, error } = await database.from('patient_portal_accounts').select('id,status,activated_at,patient_id').eq('user_id', user.id).maybeSingle()
  if (error) throw error
  if (!account) return { response: NextResponse.json({ error: `${user.email || 'This account'} does not have Patient Portal access. If you were expecting an invitation, ask your FXMed care team to send it again.`, reason: 'not_patient' }, { status: 403 }) }
  if (account.status === 'suspended') return { response: NextResponse.json({ error: 'Your Patient Portal access is paused. Contact the FXMed team to restore it.', reason: 'suspended' }, { status: 403 }) }
  return { database, user, account }
}

// GET - Who this link is for
export async function GET(request: NextRequest) {
  try {
    const context = await linkedPatient(request)
    if (context.response) return context.response
    const { database, user, account } = context
    const { data: patient } = await database.from('emr_patients').select('first_name').eq('id', account.patient_id).maybeSingle()
    return NextResponse.json({ email: user.email, firstName: patient?.first_name || null, activated: Boolean(account.activated_at) })
  } catch (error) {
    console.error('Error checking a patient portal link:', error)
    return NextResponse.json({ error: portalErrorMessage(error) }, { status: 500 })
  }
}

// POST - Set the patient's password and open their portal ({ password })
export async function POST(request: NextRequest) {
  try {
    const context = await linkedPatient(request)
    if (context.response) return context.response
    const { database, user, account } = context
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const password = typeof body?.password === 'string' ? body.password : ''
    if (password.length < 8) return NextResponse.json({ error: 'Your password must be at least 8 characters.' }, { status: 400 })
    if (password.length > 72) return NextResponse.json({ error: 'Your password must be 72 characters or fewer.' }, { status: 400 })

    const { error: passwordError } = await database.auth.admin.updateUserById(user.id, { password })
    if (passwordError) return NextResponse.json({ error: passwordError.message }, { status: 400 })

    if (account.status !== 'active' || !account.activated_at) {
      const { error } = await database.from('patient_portal_accounts').update({ status: 'active', activated_at: account.activated_at || new Date().toISOString() }).eq('id', account.id)
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'activate_patient_portal', entityType: 'patient_portal_account', entityId: account.id, patientId: account.patient_id })
    } else {
      await writeEmrAudit(database, user, { action: 'reset_patient_portal_password', entityType: 'patient_portal_account', entityId: account.id, patientId: account.patient_id })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error setting a patient portal password:', error)
    return NextResponse.json({ error: portalErrorMessage(error) }, { status: 500 })
  }
}
