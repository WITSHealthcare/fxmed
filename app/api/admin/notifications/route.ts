import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { canAccessTab, getUserAdminRole, type AdminTab } from '@/lib/admin-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Nothing here is older than this. A booking left pending for months is a
// workflow problem, not a notification, and it would otherwise crowd out
// everything recent.
const MAX_AGE_DAYS = 60
// Per source, so one busy stream cannot bury the others.
const PER_SOURCE_LIMIT = 20

export type NotificationKind = 'message' | 'appointment' | 'registration' | 'contact' | 'assessment'

type Notification = {
  id: string
  kind: NotificationKind
  title: string
  detail: string
  timestamp: string
  link: string
  // Messages carry real read state. The rest are open work items that clear
  // when someone actions them, so they cannot be dismissed from the bell.
  dismissable: boolean
}

// Each inbound stream, the tab that governs who may see it, and the status
// that means "nobody has dealt with this yet".
const sources: Array<{
  kind: NotificationKind
  tab: AdminTab
  table: string
  status: string
  timeField: string
  select: string
  link: string
  dismissable: boolean
  describe: (row: any) => { title: string; detail: string }
}> = [
  {
    kind: 'message',
    tab: 'messages',
    table: 'messages',
    status: 'unread',
    timeField: 'created_at',
    // `subject` rather than `source`, so this keeps working before migration
    // 029 adds the column.
    select: 'id, name, email, subject, message, created_at',
    link: '/admin?tab=messages',
    dismissable: true,
    describe: row => {
      const fromAssessment = /^health assessment:/i.test(String(row.subject || ''))
      return {
        title: fromAssessment
          ? `Health assessment completed by ${row.name || 'a visitor'}`
          : `New message from ${row.name || 'a visitor'}`,
        detail: String(row.subject || row.message || '').trim(),
      }
    },
  },
  {
    kind: 'appointment',
    tab: 'requests',
    table: 'appointments',
    status: 'pending',
    timeField: 'created_at',
    select: 'id, first_name, last_name, consultation_type, preferred_date, preferred_time, created_at',
    link: '/admin?tab=requests',
    dismissable: false,
    describe: row => ({
      title: `New booking from ${[row.first_name, row.last_name].filter(Boolean).join(' ') || 'a patient'}`,
      detail: [row.consultation_type, row.preferred_date && `requested for ${row.preferred_date}`, row.preferred_time]
        .filter(Boolean).join(' · '),
    }),
  },
  {
    kind: 'registration',
    tab: 'requests',
    table: 'emr_patient_registration_requests',
    status: 'pending',
    timeField: 'submitted_at',
    select: 'id, first_name, last_name, phone, source, submitted_at',
    link: '/admin?tab=requests',
    dismissable: false,
    describe: row => ({
      title: `Registration awaiting review — ${[row.first_name, row.last_name].filter(Boolean).join(' ') || 'unnamed'}`,
      detail: [row.phone, row.source === 'appointment_booking' ? 'from a booking' : 'from the public form']
        .filter(Boolean).join(' · '),
    }),
  },
  {
    kind: 'contact',
    tab: 'contacts',
    table: 'contacts',
    status: 'new',
    timeField: 'created_at',
    select: 'id, full_name, phone, health_concern, outreach_event, created_at',
    link: '/admin?tab=contacts',
    dismissable: false,
    describe: row => ({
      title: `New enquiry from ${row.full_name || 'a contact'}`,
      detail: [row.health_concern, row.outreach_event, row.phone].filter(Boolean).join(' · '),
    }),
  },
  {
    kind: 'assessment',
    tab: 'healthcare',
    table: 'emr_health_assessments',
    status: 'new',
    timeField: 'submitted_at',
    select: 'id, assessment_data, submitted_at',
    link: '/admin?tab=healthcare',
    dismissable: false,
    describe: row => {
      const person = row.assessment_data?.personalInfo || {}
      const concerns = row.assessment_data?.healthConcerns || {}
      return {
        title: `Health analysis submitted by ${[person.firstName, person.lastName].filter(Boolean).join(' ') || 'a visitor'}`,
        detail: String(concerns.primaryConcern || '').trim(),
      }
    },
  },
]

export async function GET(request: NextRequest) {
  const user = await getRequestAdminUser(request)
  const role = getUserAdminRole(user)
  if (!role) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const since = new Date(Date.now() - MAX_AGE_DAYS * 86400000).toISOString()
  const visible = sources.filter(source => canAccessTab(role, source.tab))

  // A missing table or a single failed query must not blank the whole bell, so
  // each source is settled independently and its failure reported separately.
  const settled = await Promise.all(visible.map(async source => {
    const { data, error } = await supabase
      .from(source.table)
      .select(source.select)
      .eq('status', source.status)
      .gte(source.timeField, since)
      .order(source.timeField, { ascending: false })
      .limit(PER_SOURCE_LIMIT)

    if (error) {
      console.error(`Notifications: ${source.table} query failed:`, error.message)
      return { kind: source.kind, failed: true, items: [] as Notification[] }
    }

    const items = (data || []).map((row: any) => {
      const { title, detail } = source.describe(row)
      return {
        id: `${source.kind}:${row.id}`,
        kind: source.kind,
        title,
        detail: detail.length > 140 ? `${detail.slice(0, 140)}…` : detail,
        timestamp: row[source.timeField],
        link: source.link,
        dismissable: source.dismissable,
      }
    })
    return { kind: source.kind, failed: false, items }
  }))

  const notifications = settled
    .flatMap(result => result.items)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const counts = Object.fromEntries(settled.map(result => [result.kind, result.items.length]))
  const degraded = settled.filter(result => result.failed).map(result => result.kind)

  return NextResponse.json({
    notifications,
    total: notifications.length,
    counts,
    // Lets the client say "some sources could not be read" instead of silently
    // showing an undercount, which is the failure the bell had before.
    degraded,
  })
}
