import { NextRequest, NextResponse } from 'next/server'
import { getEmrDatabase } from '@/lib/emr'
import { checkRateLimit } from '@/lib/request-security'

export const runtime = 'nodejs'

// Steps a visitor can reach after submitting the form. Closed so a caller
// cannot write arbitrary keys into the record.
const STEPS = ['investigations_viewed_at', 'request_downloaded_at', 'payment_started_at'] as const
type Step = (typeof STEPS)[number]

const isStep = (value: unknown): value is Step =>
  typeof value === 'string' && (STEPS as readonly string[]).includes(value)

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

// Called by the public funnel pages, so the visitor is not signed in. Knowing
// an assessment's UUID is the capability: it only ever stamps a timestamp on a
// row that already exists, and can neither read the assessment back nor change
// anything a clinician relies on.
export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, 'health-analysis-progress', 30, 15 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
  }

  const database = getEmrDatabase()
  if (!database) return NextResponse.json({ error: 'Not configured.' }, { status: 503 })

  const body = await request.json().catch(() => null)
  if (!isUuid(body?.id) || !isStep(body?.step)) {
    return NextResponse.json({ error: 'A valid assessment and step are required.' }, { status: 400 })
  }

  const { data: existing, error: readError } = await database
    .from('emr_health_assessments')
    .select('id, progress')
    .eq('id', body.id)
    .maybeSingle()

  // Migration 030 may not be applied yet. Losing a progress mark is not worth
  // failing the visitor's page over, so this reports success either way.
  if (readError || !existing) return NextResponse.json({ recorded: false })

  // First timestamp for a step wins, so a refresh does not overwrite when the
  // visitor first reached it.
  const progress = { ...(existing.progress || {}) }
  if (progress[body.step]) return NextResponse.json({ recorded: true })
  progress[body.step] = new Date().toISOString()

  const { error: writeError } = await database
    .from('emr_health_assessments')
    .update({ progress, updated_at: new Date().toISOString() })
    .eq('id', body.id)

  return NextResponse.json({ recorded: !writeError })
}
