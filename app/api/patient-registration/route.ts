import { NextRequest, NextResponse } from 'next/server'
import { getEmrDatabase } from '@/lib/emr'
import { checkRateLimit, cleanPublicString, isEmail } from '@/lib/request-security'

const allowedSex = new Set(['female','male','intersex','unknown'])

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, 'patient-registration-create', 4, 60 * 60 * 1000)
  if (!rateLimit.allowed) return NextResponse.json({ error: `Too many registration attempts from your connection. Please wait ${Math.ceil(rateLimit.retryAfter / 60)} minute(s) before trying again, or contact FXMed for help.` }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })

  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'The form data could not be read. Please try submitting again.' }, { status: 400 })
    if (body.website) return NextResponse.json({ error: 'Your submission could not pass our spam check. Please contact FXMed if you are having trouble registering.' }, { status: 400 })

    const firstName = cleanPublicString(body.first_name, 100)
    const middleName = cleanPublicString(body.middle_name, 100)
    const lastName = cleanPublicString(body.last_name, 100)
    const phone = cleanPublicString(body.phone, 40)
    const email = cleanPublicString(body.email, 180)?.toLowerCase() || null
    const dateOfBirth = cleanPublicString(body.date_of_birth, 10)
    const sex = cleanPublicString(body.sex, 20)?.toLowerCase()
    const today = new Date().toISOString().slice(0, 10)

    const missing = [!firstName && 'first name', !lastName && 'last name', !phone && 'phone number', !dateOfBirth && 'date of birth', !sex && 'sex'].filter(Boolean)
    if (missing.length) {
      return NextResponse.json({ error: `Please complete these required fields: ${missing.join(', ')}.` }, { status: 400 })
    }
    const parsedDate = new Date(`${dateOfBirth}T00:00:00Z`)
    if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dateOfBirth || dateOfBirth < '0001-01-01') return NextResponse.json({ error: 'Please enter a valid date of birth.' }, { status: 400 })
    if (dateOfBirth > today) return NextResponse.json({ error: 'Date of birth cannot be in the future.' }, { status: 400 })
    if (!sex || !allowedSex.has(sex)) return NextResponse.json({ error: 'Please select one of the available options for sex.' }, { status: 400 })
    if (email && !isEmail(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    if (body.consent_confirmed !== true) return NextResponse.json({ error: 'Consent is required before submitting registration.' }, { status: 400 })

    const database = getEmrDatabase()
    if (!database) return NextResponse.json({ error: 'The registration service is temporarily unavailable. Your details have not been saved. Please try again later or contact FXMed for help.' }, { status: 503 })

    const [phoneDuplicate, emailDuplicate] = await Promise.all([
      database.from('emr_patient_registration_requests').select('id').eq('status', 'pending').eq('phone', phone).limit(1),
      email ? database.from('emr_patient_registration_requests').select('id').eq('status', 'pending').eq('email', email).limit(1) : Promise.resolve({ data: [], error: null }),
    ])
    if (phoneDuplicate.error || emailDuplicate.error) throw phoneDuplicate.error || emailDuplicate.error
    if (phoneDuplicate.data?.length || emailDuplicate.data?.length) return NextResponse.json({ error: 'A registration with this phone number or email is already awaiting review. No new registration was created. Please contact FXMed to check its status.' }, { status: 409 })

    const { data, error } = await database.from('emr_patient_registration_requests').insert({
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      sex,
      phone,
      email,
      address: cleanPublicString(body.address, 1000),
      city: cleanPublicString(body.city, 120),
      state: cleanPublicString(body.state, 120),
      country: cleanPublicString(body.country, 120) || 'Nigeria',
      marital_status: cleanPublicString(body.marital_status, 80),
      occupation: cleanPublicString(body.occupation, 180),
      emergency_contact_name: cleanPublicString(body.emergency_contact_name, 180),
      emergency_contact_phone: cleanPublicString(body.emergency_contact_phone, 40),
      emergency_contact_relationship: cleanPublicString(body.emergency_contact_relationship, 100),
      consent_confirmed: true,
      status: 'pending',
    }).select('id,submitted_at').single()
    if (error) throw error

    return NextResponse.json({ registration: data, message: 'Registration submitted for clinical review.' }, { status: 201 })
  } catch (error) {
    console.error('Patient registration failed:', error)
    return NextResponse.json({ error: 'The registration service encountered a problem. We could not confirm whether your details were saved. Please contact FXMed before submitting again.' }, { status: 500 })
  }
}
