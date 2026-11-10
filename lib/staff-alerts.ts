import { after } from 'next/server'
import { notificationSources, type NotificationKind } from '@/lib/admin-notifications'
import { sendEmail } from '@/lib/email'
import { contact, siteUrl } from '@/lib/seo'

// Emails the clinic inbox when something arrives that shows in the admin
// dashboard's notification bell, with the same wording as the bell. Set
// STAFF_NOTIFICATION_EMAIL (comma separated) to send somewhere other than
// the clinic's address.

/** The kinds whose detail is operational: times, packages, phone numbers. */
const detailInEmail = new Set<NotificationKind>(['appointment', 'festive', 'registration', 'message'])

export function staffRecipients() {
  return (process.env.STAFF_NOTIFICATION_EMAIL || contact.email).split(',').map(address => address.trim()).filter(Boolean)
}

/**
 * Emails the clinic about a new item of this kind. `row` has the fields the
 * bell reads for it. The email goes after the response, so it never slows down
 * or fails what raised it. `quiet` can skip it, say for a patient's second
 * portal message in a few minutes.
 */
export function alertStaff(kind: NotificationKind, row: Record<string, any>, options: { extraDetail?: string; quiet?: () => Promise<boolean> } = {}) {
  const source = notificationSources.find(item => item.kind === kind)
  if (!source || source.skip?.(row)) return
  const { title, detail } = source.describe(row)
  const shownDetail = [detailInEmail.has(kind) ? detail : '', options.extraDetail].filter(Boolean).join(' · ')
  const link = `${siteUrl}${source.linkFor ? source.linkFor(row) : source.link}`

  const send = async () => {
    try {
      if (options.quiet && await options.quiet()) return
      const { html, text } = staffEmail({ title, detail: shownDetail, link, private: !detailInEmail.has(kind) })
      for (const to of staffRecipients()) await sendEmail({ to, subject: title, html, text })
    } catch (error) {
      console.error('Failed to email the clinic about a new notification:', error)
    }
  }
  try {
    after(send)
  } catch {
    void send()
  }
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** An email to the clinic: what arrived, and a link to it in the dashboard. */
export function staffEmail({ title, detail, link, private: isPrivate, items }: { title: string; detail?: string; link: string; private?: boolean; items?: string[] }) {
  const privacy = isPrivate ? 'Details are in the dashboard, not in this email, because they can include health information.' : ''
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>FXMed</title></head>
<body style="margin:0;padding:0;background-color:#f8f3ea;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#1a3d2e;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f3ea;">
<tr><td align="center" style="padding:28px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e7e1d3;">
<tr><td style="padding:22px 32px 18px 32px;border-bottom:4px solid #C9E265;">
<img src="${siteUrl}/FXMed_Logo_Black.png" width="140" alt="FXMed" style="display:block;width:140px;height:auto;border:0;">
</td></tr>
<tr><td style="padding:28px 32px 30px 32px;">
<p style="margin:0 0 8px 0;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#2d6a4f;">Admin dashboard</p>
<h1 style="margin:0 0 12px 0;font-size:21px;line-height:28px;font-weight:bold;color:#1a3d2e;">${escapeHtml(title)}</h1>
${detail ? `<p style="margin:0 0 12px 0;font-size:15px;line-height:23px;color:#3d4f45;">${escapeHtml(detail)}</p>` : ''}
${items?.length ? `<ul style="margin:0 0 12px 0;padding-left:20px;font-size:15px;line-height:24px;color:#3d4f45;">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
${privacy ? `<p style="margin:0 0 12px 0;font-size:13px;line-height:20px;color:#6b7c72;">${escapeHtml(privacy)}</p>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0 0;"><tr><td style="background-color:#1a3d2e;border-radius:999px;">
<a href="${escapeHtml(link)}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">Open in the dashboard</a>
</td></tr></table>
</td></tr>
<tr><td style="background-color:#1a3d2e;padding:16px 32px;">
<p style="margin:0;font-size:11px;line-height:17px;color:#9fb8aa;">Sent by the FXMed admin dashboard to the clinic inbox. Everything here also shows in the dashboard’s notification bell.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
  const text = [title, detail, ...(items || []).map(item => `- ${item}`), privacy, `Open in the dashboard: ${link}`].filter(Boolean).join('\n\n')
  return { html, text }
}
