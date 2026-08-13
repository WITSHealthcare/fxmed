import { NextRequest, NextResponse } from 'next/server'
import { cleanText, getEmrDatabase } from '@/lib/emr'
import { checkRateLimit } from '@/lib/request-security'

export const runtime = 'nodejs'

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
        phone: cleanText(personal.phone, 40), age: cleanText(personal.age, 3), gender: cleanText(personal.gender, 50),
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
    return NextResponse.json({ id: data.id }, { status: 201 })
  } catch (error) {
    console.error('Health analysis submission error:', error)
    return NextResponse.json({ error: 'We could not save your assessment. Please try again.' }, { status: 500 })
  }
}
