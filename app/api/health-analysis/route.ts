import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cleanText, getEmrDatabase } from '@/lib/emr'
import { checkRateLimit } from '@/lib/request-security'
import { displayAge, isPlausibleDateOfBirth } from '@/lib/age'

export const runtime = 'nodejs'

// The clinical record lands in emr_health_assessments, which only the EMR's
// healthcare tab reads. A matching row in `messages` puts the person's contact
// details in the inbox the team actually works from, next to every other
// enquiry. The full answers stay in the EMR; this carries a summary and enough
// to reply.
async function recordContactMessage(database: SupabaseClient, assessment: {
  personalInfo: Record<string, string | null>
  healthConcerns: { primaryConcern: string | null; symptoms: (string | null)[]; duration: string | null; severity: string | null }
}) {
  const personal = assessment.personalInfo
  const concerns = assessment.healthConcerns
  const name = [personal.firstName, personal.lastName].filter(Boolean).join(' ')

  const message = [
    'Functional health analysis submitted from the website.',
    '',
    `Primary concern: ${concerns.primaryConcern || 'Not provided'}`,
    `Symptoms: ${concerns.symptoms.filter(Boolean).join(', ') || 'None listed'}`,
    `Duration: ${concerns.duration || 'Not provided'}`,
    `Severity: ${concerns.severity || 'Not provided'}`,
    `Date of birth: ${personal.dateOfBirth || 'Not provided'}`,
    `Age / gender: ${[displayAge(personal), personal.gender].filter(Boolean).join(' · ') || 'Not provided'}`,
    '',
    'Lifestyle, medical history and goals are on the full submission under Healthcare / EMR → Health Analysis.',
  ].join('\n')

  const record = {
    name: name || 'Website visitor',
    email: personal.email,
    phone: personal.phone,
    subject: `Functional health analysis: ${concerns.primaryConcern || 'new submission'}`.slice(0, 200),
    message,
    status: 'unread',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Migration 029 adds messages.source; before it is applied PostgREST rejects
  // the column from its schema cache. The subject still identifies the source,
  // so the contact is worth keeping either way.
  const { error } = await database.from('messages').insert([{ ...record, source: 'functional_health_analysis' }])
  if (error) {
    const { error: fallbackError } = await database.from('messages').insert([record])
    if (fallbackError) console.error('Health analysis contact message failed:', fallbackError.message)
  }
}

export async function POST(request: NextRequest) {
  const database = getEmrDatabase()
  if (!database) return NextResponse.json({ error: 'Health analysis submissions are not configured.' }, { status: 503 })

  try {
    const rateLimit = checkRateLimit(request, 'health-analysis-create', 5, 30 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
    }
    const body = await request.json().catch(() => null)
    const personal = body?.personalInfo
    const concerns = body?.healthConcerns
    const email = cleanText(personal?.email, 180)?.toLowerCase()
    if (!cleanText(personal?.firstName, 100) || !cleanText(personal?.lastName, 100) || !email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Complete personal information is required.' }, { status: 400 })
    }
    if (!cleanText(concerns?.primaryConcern, 2000) || !Array.isArray(concerns?.symptoms)) {
      return NextResponse.json({ error: 'Complete health concerns are required.' }, { status: 400 })
    }

    const assessmentData = {
      personalInfo: {
        firstName: cleanText(personal.firstName, 100), lastName: cleanText(personal.lastName, 100), email,
        phone: cleanText(personal.phone, 40), gender: cleanText(personal.gender, 50),
        dateOfBirth: isPlausibleDateOfBirth(personal?.dateOfBirth) ? personal.dateOfBirth : null,
      },
      healthConcerns: {
        primaryConcern: cleanText(concerns.primaryConcern, 2000),
        symptoms: concerns.symptoms.slice(0, 40).map((value: unknown) => cleanText(value, 120)).filter(Boolean),
        duration: cleanText(concerns.duration, 120), severity: cleanText(concerns.severity, 80),
      },
      lifestyle: body.lifestyle || {}, medicalHistory: body.medicalHistory || {}, goals: body.goals || {},
    }
    if (JSON.stringify(assessmentData).length > 50_000) return NextResponse.json({ error: 'The assessment is too large.' }, { status: 413 })

    const { data, error } = await database.from('emr_health_assessments').insert({ assessment_data: assessmentData, status: 'new' }).select('id').single()
    if (error) throw error

    // The clinical record is already saved. Failing to mirror the contact into
    // the inbox must not turn a successful submission into an error for the
    // visitor, who would then submit again.
    try {
      await recordContactMessage(database, assessmentData)
    } catch (messageError) {
      console.error('Health analysis contact message failed:', messageError)
    }

    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (error) {
    console.error('Health analysis submission error:', error)
    return NextResponse.json({ error: 'We could not save your assessment. Please try again.' }, { status: 500 })
  }
}
