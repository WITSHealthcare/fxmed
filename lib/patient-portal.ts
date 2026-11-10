import type { SupabaseClient } from '@supabase/supabase-js'
import { after, type NextRequest } from 'next/server'
import { getRequestUser } from '@/lib/ambassador-portal'
import { getEmrDatabase } from '@/lib/emr'
import { PATIENT_AUTH_COOKIE } from '@/lib/patient-auth'
import { displayDate, displayTime, lagosToday } from '@/lib/bookingTimes'
import { sendEmail } from '@/lib/email'
import { contact, siteUrl } from '@/lib/seo'

export const portalSections = ['overview', 'care_plan', 'documents', 'messages'] as const
export type PortalSection = typeof portalSections[number]

export const portalDocumentTypes = [
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
export const PORTAL_MAX_UPLOAD_BYTES = 15 * 1024 * 1024

// The patient-facing columns of an EMR record. Internal fields such as CRM
// links and who created the record are never sent to the portal.
export const portalPatientColumns = 'id,mrn,first_name,middle_name,last_name,date_of_birth,sex,phone,email,address,city,state'
export const portalDocumentColumns = 'id,title,category,original_name,mime_type,file_size,notes,source,portal_status,shared_at,created_at'

/**
 * The signed-in patient, their EMR record and their portal account. Returns
 * null for anyone who is not a linked, non-suspended portal patient.
 */
export async function getRequestPatient(request: NextRequest) {
  const user = await getRequestUser(request, PATIENT_AUTH_COOKIE)
  const database = getEmrDatabase()
  if (!user || !database) return null

  const { data: account, error } = await database
    .from('patient_portal_accounts')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !account || account.status === 'suspended') return null
  return { user, account, database, patientId: account.patient_id as string }
}

export type PortalNoticeKind = 'message' | 'document' | 'care_plan' | 'appointment'

export type PortalNotice = {
  kind: PortalNoticeKind
  /** Shown in the portal, where the patient is signed in. */
  title: string
  detail?: string | null
  section: PortalSection
  /**
   * What the email says. Never clinical detail: email is not a secure
   * channel, so it says that something changed and links to the portal.
   * Defaults to a line for the kind.
   */
  email?: { subject: string; summary: string }
}

const emailDefaults: Record<PortalNoticeKind, { subject: string; summary: string }> = {
  message: { subject: 'You have a new message from your FXMed care team', summary: 'Your care team has sent you a message in your Patient Portal.' },
  document: { subject: 'A new document is ready in your FXMed Patient Portal', summary: 'Your care team has shared a document with you in your Patient Portal.' },
  care_plan: { subject: 'Your FXMed care plan has an update', summary: 'Your care team has shared or updated your care plan in your Patient Portal.' },
  appointment: { subject: 'An update about your FXMed appointment', summary: 'There is an update about your appointment.' },
}
const buttonLabels: Record<PortalSection, string> = {
  overview: 'Open your Patient Portal',
  care_plan: 'See your care plan',
  documents: 'Open your documents',
  messages: 'Read the message',
}
// Several changes in a row send one email of each kind. Each appointment
// update is its own email.
const EMAIL_QUIET_MINUTES = 15

/**
 * Whether a patient was invited to the portal and finished setting up their
 * account (created a password). Only they get notifications, in the portal or
 * by email; anyone else gets nothing, not even a backlog for later.
 */
export function hasOnboarded(account: { status?: string | null; activated_at?: string | null } | null | undefined) {
  return Boolean(account && account.status === 'active' && account.activated_at)
}

/**
 * Tells a patient something changed: in their portal, and by email unless
 * they have turned emails off. Only for patients who have completed portal
 * onboarding. A missed notification never fails the action that raised it.
 */
export async function notifyPatient(database: SupabaseClient, patientId: string, notice: PortalNotice) {
  const { data: account, error: accountError } = await database.from('patient_portal_accounts').select('*').eq('patient_id', patientId).maybeSingle()
  if (accountError) console.error('Failed to look up a patient portal account:', accountError.message)
  if (!hasOnboarded(account)) return

  const { data, error } = await database.from('patient_portal_notifications').insert({
    patient_id: patientId,
    kind: notice.kind,
    title: notice.title.slice(0, 240),
    detail: notice.detail ? notice.detail.slice(0, 600) : null,
    section: notice.section,
  }).select('id').single()
  if (error) console.error('Failed to write patient portal notification:', error.message)

  // The email goes after the response, so it never slows down or fails the clinic's action.
  const email = () => emailPatient(database, patientId, account, notice, data?.id || null).catch(emailError => console.error('Failed to email a patient portal notification:', emailError))
  try {
    after(email)
  } catch {
    // Outside a request, such as a script: send it now.
    void email()
  }
}

async function emailPatient(database: SupabaseClient, patientId: string, account: Record<string, any>, notice: PortalNotice, notificationId: string | null) {
  if (account.email_notifications === false) return

  if (notice.kind !== 'appointment') {
    const since = new Date(Date.now() - EMAIL_QUIET_MINUTES * 60 * 1000).toISOString()
    const { data: recent, error: recentError } = await database.from('patient_portal_notifications')
      .select('id').eq('patient_id', patientId).eq('kind', notice.kind).gte('emailed_at', since).limit(1)
    // Before migration 045 there is no emailed_at, and every notification is emailed.
    if (!recentError && recent?.length) return
  }

  const [{ data: auth }, { data: patient }] = await Promise.all([
    database.auth.admin.getUserById(account.user_id),
    database.from('emr_patients').select('first_name,email').eq('id', patientId).maybeSingle(),
  ])
  const to = auth?.user?.email || patient?.email
  if (!to) return

  const copy = notice.email || emailDefaults[notice.kind]
  const url = `${siteUrl}/patient-portal?section=${notice.section}`
  const sent = await sendEmail({
    to,
    subject: copy.subject,
    replyTo: contact.email,
    ...portalEmail({ firstName: patient?.first_name || null, heading: copy.subject, summary: copy.summary, buttonLabel: buttonLabels[notice.section], url, to }),
  })
  if (sent && notificationId) await database.from('patient_portal_notifications').update({ emailed_at: new Date().toISOString() }).eq('id', notificationId)
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The email, in the same design as the FXMed invite emails (supabase/templates). */
export function portalEmail({ firstName, heading, summary, buttonLabel, url, to }: { firstName: string | null; heading: string; summary: string; buttonLabel: string; url: string; to: string }) {
  const hello = `Hello${firstName ? ` ${firstName}` : ''},`
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>FXMed</title></head>
<body style="margin:0;padding:0;background-color:#f8f3ea;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#1a3d2e;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(summary)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f3ea;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e7e1d3;">
<tr><td style="padding:28px 36px 22px 36px;border-bottom:4px solid #C9E265;">
<img src="${siteUrl}/FXMed_Logo_Black.png" width="170" alt="FXMed" style="display:block;width:170px;height:auto;border:0;">
</td></tr>
<tr><td style="padding:34px 36px 8px 36px;">
<p style="margin:0 0 8px 0;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#2d6a4f;">Patient Portal</p>
<h1 style="margin:0 0 16px 0;font-size:24px;line-height:31px;font-weight:bold;color:#1a3d2e;">${escapeHtml(heading)}</h1>
<p style="margin:0 0 14px 0;font-size:15px;line-height:24px;color:#3d4f45;">${escapeHtml(hello)}</p>
<p style="margin:0 0 14px 0;font-size:15px;line-height:24px;color:#3d4f45;">${escapeHtml(summary)} Sign in to your Patient Portal to see it.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 26px 0;"><tr><td style="background-color:#1a3d2e;border-radius:999px;">
<a href="${escapeHtml(url)}" style="display:inline-block;padding:15px 30px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(buttonLabel)}</a>
</td></tr></table>
<p style="margin:0 0 6px 0;font-size:13px;line-height:20px;color:#6b7c72;">For your privacy, we never put health details in emails. You can read everything securely in your portal.</p>
</td></tr>
<tr><td style="padding:8px 36px 32px 36px;">
<p style="margin:0;font-size:13px;line-height:20px;color:#6b7c72;">If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(url)}" style="color:#2d6a4f;word-break:break-all;">${escapeHtml(url)}</a></p>
</td></tr>
<tr><td style="background-color:#1a3d2e;padding:22px 36px;">
<p style="margin:0;font-size:12px;line-height:19px;color:#cfe0d6;">FXMed &middot; Functional medicine that comes to you<br>
<a href="${siteUrl}" style="color:#C9E265;text-decoration:none;">www.fxmed.ng</a></p>
<p style="margin:10px 0 0 0;font-size:11px;line-height:17px;color:#9fb8aa;">This email was sent to ${escapeHtml(to)} because you have an FXMed Patient Portal. You can turn these emails off in your portal, under Notifications.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
  const text = `${hello}

${summary} Sign in to your Patient Portal to see it:
${url}

For your privacy, we never put health details in emails.

FXMed · www.fxmed.ng
You can turn these emails off in your portal, under Notifications.`
  return { html, text }
}

/**
 * Tells a patient their appointment was booked, confirmed or cancelled.
 * Only for upcoming appointments linked to a patient record.
 */
export async function notifyAppointment(database: SupabaseClient, appointment: { patient_id?: string | null; preferred_date: string; preferred_time: string; consultation_type: string }, change: 'booked' | 'confirmed' | 'cancelled') {
  if (!appointment.patient_id || appointment.preferred_date < lagosToday()) return
  const what = appointment.consultation_type === 'telemedicine' ? 'telemedicine call' : 'home visit'
  const when = `${displayDate(appointment.preferred_date)} at ${displayTime(appointment.preferred_time)} (Lagos time)`
  const copy = {
    booked: { title: `Your ${what} is booked for ${when}`, subject: 'Your FXMed appointment is booked', summary: `Your ${what} is booked for ${when}.` },
    confirmed: { title: `Your ${what} on ${when} is confirmed`, subject: 'Your FXMed appointment is confirmed', summary: `Your ${what} on ${when} is confirmed.` },
    cancelled: { title: `Your ${what} on ${when} was cancelled`, subject: 'Your FXMed appointment has been cancelled', summary: `Your ${what} on ${when} has been cancelled. If you did not expect this, reply to this email to rebook.` },
  }[change]
  await notifyPatient(database, appointment.patient_id, { kind: 'appointment', title: copy.title, section: 'overview', email: { subject: copy.subject, summary: copy.summary } })
}

/** Tells a patient their shared care plan changed. Plans they cannot see stay quiet. */
export async function notifyCarePlanChange(database: SupabaseClient, carePlanId: unknown, title: string) {
  if (typeof carePlanId !== 'string') return
  const { data: plan } = await database.from('emr_care_plans').select('patient_id,title,status,shared_with_patient').eq('id', carePlanId).maybeSingle()
  if (!plan?.shared_with_patient || plan.status === 'draft') return
  await notifyPatient(database, plan.patient_id, { kind: 'care_plan', title, detail: plan.title, section: 'care_plan' })
}

export function portalErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : ''
  if (message.includes('patient_portal') && (message.includes('Could not find the table') || message.includes('schema cache'))) {
    return 'The patient portal database migration has not been applied yet.'
  }
  return message || 'The patient portal request could not be completed.'
}
