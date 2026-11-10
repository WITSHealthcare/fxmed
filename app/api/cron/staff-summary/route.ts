import { NextRequest, NextResponse } from 'next/server'
import { loadNotifications, notificationSources } from '@/lib/admin-notifications'
import { sendEmail } from '@/lib/email'
import { getEmrDatabase } from '@/lib/emr'
import { syncReviewFollowUps } from '@/lib/reviewFollowUps'
import { staffRecipients } from '@/lib/staff-alerts'
import { clinicalTeam, morningEmails } from '@/lib/staff-summary'

// GET - Sends the morning email (lib/staff-summary) to the clinic inbox and
// the clinical team. Run by Vercel Cron (vercel.json) at 07:00 Lagos time,
// which sends the CRON_SECRET environment variable as a bearer token.
// Nothing is sent to anyone with nothing to report.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const database = getEmrDatabase()
  if (!database) return NextResponse.json({ error: 'Database connection not available' }, { status: 503 })

  try {
    await syncReviewFollowUps(database)
    const { notifications, counts } = await loadNotifications(database, notificationSources)
    const emails = morningEmails(notifications, counts, staffRecipients(), await clinicalTeam(database))
    let sent = 0
    for (const email of emails) if (await sendEmail(email)) sent++
    return NextResponse.json({ sent, of: emails.length })
  } catch (error) {
    console.error('Morning summary failed:', error)
    return NextResponse.json({ error: 'The morning summary could not be prepared.' }, { status: 500 })
  }
}
