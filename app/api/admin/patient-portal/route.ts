import { NextRequest, NextResponse } from 'next/server'
import { cleanText, getEmrContext, isUuid, writeEmrAudit, type EmrPermission } from '@/lib/emr'
import { notifyPatient, portalErrorMessage } from '@/lib/patient-portal'
import { portalUrl } from '@/lib/portal-url'

// The clinic side of the patient portal: portal access, the message thread,
// and what has been shared with the patient. Opened from a patient's chart.

export async function GET(request: NextRequest) {
  const context = await getEmrContext(request, 'view_clinical_records')
  if (!context) return NextResponse.json({ error: 'Clinical access required' }, { status: 403 })
  const { database } = context
  const patientId = request.nextUrl.searchParams.get('patientId')
  if (!isUuid(patientId)) return NextResponse.json({ error: 'A valid patient is required.' }, { status: 400 })

  try {
    const [account, messages] = await Promise.all([
      database.from('patient_portal_accounts').select('id,user_id,status,invited_at,activated_at,last_seen_at').eq('patient_id', patientId).maybeSingle(),
      database.from('patient_portal_messages').select('id,sender,sender_name,body,status,created_at').eq('patient_id', patientId).order('created_at', { ascending: true }).limit(200),
    ])
    const error = account.error || messages.error
    if (error) throw error
    let email: string | null = null
    if (account.data) {
      const { data } = await database.auth.admin.getUserById(account.data.user_id)
      email = data.user?.email || null
    }
    return NextResponse.json({ account: account.data ? { ...account.data, email } : null, messages: messages.data || [] })
  } catch (error) {
    return NextResponse.json({ error: portalErrorMessage(error) }, { status: 500 })
  }
}

const actionPermissions: Record<string, EmrPermission> = {
  invite: 'edit_patients',
  set_status: 'edit_patients',
  message: 'view_clinical_records',
  read_messages: 'view_clinical_records',
  share_document: 'upload_documents',
  review_upload: 'upload_documents',
  share_care_plan: 'manage_care_plans',
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const action = typeof body?.action === 'string' ? body.action : ''
  const permission = actionPermissions[action]
  if (!body || !permission) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  const context = await getEmrContext(request, permission)
  if (!context) return NextResponse.json({ error: 'Clinical access required' }, { status: 403 })
  const { database, user } = context
  const now = new Date().toISOString()

  try {
    switch (action) {
      case 'invite': {
        if (!isUuid(body.patient_id)) return NextResponse.json({ error: 'A valid patient is required.' }, { status: 400 })
        const { data: patient, error: patientError } = await database.from('emr_patients').select('id,first_name,last_name,email').eq('id', body.patient_id).single()
        if (patientError || !patient) return NextResponse.json({ error: 'Patient not found.' }, { status: 404 })
        const redirectTo = portalUrl(request, '/patient-portal/setup')

        const { data: existing } = await database.from('patient_portal_accounts').select('*').eq('patient_id', patient.id).maybeSingle()
        if (existing) {
          const { data: linked } = await database.auth.admin.getUserById(existing.user_id)
          const email = linked.user?.email
          if (!email) return NextResponse.json({ error: 'The linked portal account could not be found.' }, { status: 409 })
          const { error: resetError } = await database.auth.resetPasswordForEmail(email, { redirectTo })
          if (resetError) throw resetError
          await writeEmrAudit(database, user, { action: 'resend_patient_portal_invite', entityType: 'patient_portal_account', entityId: existing.id, patientId: patient.id })
          return NextResponse.json({ message: `A fresh portal link has been sent to ${email}.` })
        }

        const email = patient.email?.trim().toLowerCase()
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return NextResponse.json({ error: 'Add an email address to this patient’s record before inviting them to the portal.' }, { status: 400 })
        }

        const { data: listed, error: listError } = await database.auth.admin.listUsers({ page: 1, perPage: 1000 })
        if (listError) throw listError
        let authUser = listed.users.find(candidate => candidate.email?.toLowerCase() === email)
        if (authUser?.app_metadata?.role || authUser?.app_metadata?.is_admin) {
          return NextResponse.json({ error: 'This email belongs to an admin dashboard user. Give the patient a separate email address.' }, { status: 409 })
        }
        if (authUser?.app_metadata?.account_type === 'ambassador') {
          return NextResponse.json({ error: 'This email is already used by an ambassador account. Give the patient a separate email address.' }, { status: 409 })
        }
        if (authUser) {
          const { data: taken } = await database.from('patient_portal_accounts').select('patient_id').eq('user_id', authUser.id).maybeSingle()
          if (taken) return NextResponse.json({ error: 'This email already has portal access for a different patient record.' }, { status: 409 })
        }

        let delivery: 'invite' | 'password_reset' = 'invite'
        if (!authUser) {
          const { data: invited, error: inviteError } = await database.auth.admin.inviteUserByEmail(email, {
            redirectTo,
            data: { account_type: 'patient', first_name: patient.first_name, last_name: patient.last_name },
          })
          if (inviteError) throw inviteError
          authUser = invited.user
        } else {
          delivery = 'password_reset'
        }
        const { error: metadataError } = await database.auth.admin.updateUserById(authUser.id, {
          app_metadata: { ...authUser.app_metadata, account_type: 'patient' },
          user_metadata: { ...authUser.user_metadata, account_type: 'patient' },
        })
        if (metadataError) throw metadataError
        if (delivery === 'password_reset') {
          const { error: resetError } = await database.auth.resetPasswordForEmail(email, { redirectTo })
          if (resetError) throw resetError
        }

        const { data: account, error } = await database.from('patient_portal_accounts').insert({
          user_id: authUser.id,
          patient_id: patient.id,
          invited_by: user.id,
        }).select('*').single()
        if (error) throw error
        await writeEmrAudit(database, user, { action: 'invite_patient_portal', entityType: 'patient_portal_account', entityId: account.id, patientId: patient.id, metadata: { delivery } })
        return NextResponse.json({ account, message: `Portal invitation sent to ${email}. They can create a password from the email and sign in.` }, { status: 201 })
      }

      case 'set_status': {
        if (!isUuid(body.patient_id)) return NextResponse.json({ error: 'A valid patient is required.' }, { status: 400 })
        const status = body.status === 'suspended' ? 'suspended' : 'active'
        const { data: account, error: accountError } = await database.from('patient_portal_accounts').select('id,activated_at').eq('patient_id', body.patient_id).single()
        if (accountError || !account) return NextResponse.json({ error: 'This patient has no portal account.' }, { status: 404 })
        // Restoring an account the patient never activated returns it to "invited".
        const restored = status === 'active' && !account.activated_at ? 'invited' : status
        const { data, error } = await database.from('patient_portal_accounts').update({ status: restored }).eq('id', account.id).select('*').single()
        if (error) throw error
        await writeEmrAudit(database, user, { action: status === 'suspended' ? 'suspend_patient_portal' : 'restore_patient_portal', entityType: 'patient_portal_account', entityId: account.id, patientId: String(body.patient_id) })
        return NextResponse.json({ account: data })
      }

      case 'message': {
        if (!isUuid(body.patient_id)) return NextResponse.json({ error: 'A valid patient is required.' }, { status: 400 })
        const text = cleanText(body.body, 4000)
        if (!text) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 })
        const senderName = cleanText(user.user_metadata?.full_name || user.user_metadata?.name, 160) || 'FXMed care team'
        const { data, error } = await database.from('patient_portal_messages').insert({
          patient_id: body.patient_id, sender: 'clinic', sender_user_id: user.id, sender_name: senderName, body: text,
        }).select('id,sender,sender_name,body,status,created_at').single()
        if (error) throw error
        // Replying means the patient's earlier messages have been seen.
        await database.from('patient_portal_messages').update({ status: 'read', read_at: now }).eq('patient_id', body.patient_id).eq('sender', 'patient').eq('status', 'unread')
        await notifyPatient(database, String(body.patient_id), { kind: 'message', title: `New message from ${senderName}`, detail: text.slice(0, 160), section: 'messages' })
        await writeEmrAudit(database, user, { action: 'send_patient_message', entityType: 'patient_portal_messages', entityId: data.id, patientId: String(body.patient_id) })
        return NextResponse.json({ message: data }, { status: 201 })
      }

      case 'read_messages': {
        if (!isUuid(body.patient_id)) return NextResponse.json({ error: 'A valid patient is required.' }, { status: 400 })
        const { error } = await database.from('patient_portal_messages').update({ status: 'read', read_at: now }).eq('patient_id', body.patient_id).eq('sender', 'patient').eq('status', 'unread')
        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'share_document': {
        if (!isUuid(body.id)) return NextResponse.json({ error: 'A valid document is required.' }, { status: 400 })
        const shared = body.shared === true
        const { data, error } = await database.from('emr_documents')
          .update({ shared_with_patient: shared, shared_at: shared ? now : null })
          .eq('id', body.id).eq('source', 'clinic').select('*').single()
        if (error) throw error
        if (shared) await notifyPatient(database, data.patient_id, { kind: 'document', title: 'A new document was shared with you', detail: data.title, section: 'documents' })
        await writeEmrAudit(database, user, { action: shared ? 'share_document_with_patient' : 'unshare_document_with_patient', entityType: 'emr_document', entityId: data.id, patientId: data.patient_id })
        return NextResponse.json({ document: data })
      }

      case 'review_upload': {
        if (!isUuid(body.id)) return NextResponse.json({ error: 'A valid document is required.' }, { status: 400 })
        const { data, error } = await database.from('emr_documents')
          .update({ portal_status: 'reviewed', reviewed_by: user.id, reviewed_at: now })
          .eq('id', body.id).eq('source', 'patient').select('*').single()
        if (error) throw error
        await writeEmrAudit(database, user, { action: 'review_patient_upload', entityType: 'emr_document', entityId: data.id, patientId: data.patient_id })
        return NextResponse.json({ document: data })
      }

      case 'share_care_plan': {
        if (!isUuid(body.id)) return NextResponse.json({ error: 'A valid care plan is required.' }, { status: 400 })
        const shared = body.shared === true
        const { data, error } = await database.from('emr_care_plans')
          .update({ shared_with_patient: shared, shared_at: shared ? now : null })
          .eq('id', body.id).select('*').single()
        if (error) throw error
        if (shared) await notifyPatient(database, data.patient_id, { kind: 'care_plan', title: 'Your care team shared a care plan', detail: data.title, section: 'care_plan' })
        await writeEmrAudit(database, user, { action: shared ? 'share_care_plan_with_patient' : 'unshare_care_plan_with_patient', entityType: 'emr_care_plans', entityId: data.id, patientId: data.patient_id })
        return NextResponse.json({ carePlan: data })
      }
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (error) {
    console.error(`Patient portal admin action "${action}" failed:`, error)
    return NextResponse.json({ error: portalErrorMessage(error) }, { status: 500 })
  }
}
