import type { SupabaseClient, User } from '@supabase/supabase-js'
import { canAccessTab, getUserAdminRole } from '@/lib/admin-auth'
import { notificationSources, type Notification, type NotificationKind } from '@/lib/admin-notifications'
import { siteUrl } from '@/lib/seo'
import { staffEmail } from '@/lib/staff-alerts'

// The morning email (app/api/cron/staff-summary): follow-ups due today or
// overdue, and what is still waiting in the dashboard. It goes to the clinic
// inbox, with everything, and to each active clinical team member, with what
// their role can see in the dashboard's bell, on the days they have
// follow-ups due.

const waitingLabels: Partial<Record<NotificationKind, [string, string]>> = {
  appointment: ['booking awaiting confirmation', 'bookings awaiting confirmation'],
  festive: ['festive package booking awaiting confirmation', 'festive package bookings awaiting confirmation'],
  registration: ['patient registration to review', 'patient registrations to review'],
  message: ['unread message', 'unread messages'],
  portal_message: ['unread patient portal message', 'unread patient portal messages'],
  portal_upload: ['patient portal upload to review', 'patient portal uploads to review'],
  assessment: ['health analysis to review', 'health analyses to review'],
  contact: ['new outreach enquiry', 'new outreach enquiries'],
}

/** The summary of these notifications, or null when there is nothing to say. */
export function summarise(notifications: Notification[], counts: Partial<Record<NotificationKind, number>>, kinds: Set<NotificationKind>) {
  // Names only: a follow-up's own title can be clinical.
  const followUps = kinds.has('follow_up') ? notifications.filter(item => item.kind === 'follow_up').map(item => item.title) : []
  const waiting = Object.entries(waitingLabels).flatMap(([kind, [one, many]]) => {
    const count = kinds.has(kind as NotificationKind) ? counts[kind as NotificationKind] || 0 : 0
    return count ? [`${count} ${count === 1 ? one : many}`] : []
  })
  if (!followUps.length && !waiting.length) return null
  const title = followUps.length ? `${followUps.length} follow-up${followUps.length === 1 ? '' : 's'} due today` : 'Your FXMed morning summary'
  const email = staffEmail({
    title,
    detail: followUps.length ? 'Due today or overdue:' : 'Still waiting in the dashboard:',
    items: followUps.length ? [...followUps, ...waiting.map(line => `Also waiting: ${line}`)] : waiting,
    link: `${siteUrl}${followUps.length ? '/admin?tab=healthcare&view=follow_ups' : '/admin'}`,
  })
  return { title, followUps: followUps.length, ...email }
}

/** Active dashboard users with the clinical role, as on the Users & Roles page. */
export async function clinicalTeam(database: SupabaseClient) {
  const team: User[] = []
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await database.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    for (const user of data.users) {
      const banned = Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now())
      if (user.email && !banned && getUserAdminRole(user) === 'clinical') team.push(user)
    }
    if (data.users.length < 1000) break
  }
  return team
}

/**
 * The morning emails to send: the clinic inbox gets everything in the bell,
 * and each clinical team member gets what the clinical role can see, on days
 * with follow-ups due. Nobody gets two copies.
 */
export function morningEmails(notifications: Notification[], counts: Partial<Record<NotificationKind, number>>, inbox: string[], team: User[]) {
  const emails: Array<{ to: string; subject: string; html: string; text: string }> = []
  const full = summarise(notifications, counts, new Set(notificationSources.map(source => source.kind)))
  if (full) for (const to of inbox) emails.push({ to, subject: full.title, html: full.html, text: full.text })

  const clinicalKinds = new Set(notificationSources.filter(source => canAccessTab('clinical', source.tab)).map(source => source.kind))
  const clinical = summarise(notifications, counts, clinicalKinds)
  if (clinical?.followUps) {
    const already = new Set(inbox.map(address => address.toLowerCase()))
    for (const member of team) {
      const to = member.email?.toLowerCase()
      if (!to || already.has(to)) continue
      already.add(to)
      emails.push({ to, subject: clinical.title, html: clinical.html, text: clinical.text })
    }
  }
  return emails
}
