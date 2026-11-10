import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'
import { writeRequestAdminActivity } from '@/lib/admin-activity'
import { clockTime, displayDate, displayTime, isDate, parseTime } from '@/lib/bookingTimes'
import { cleanPublicString, isEmail } from '@/lib/request-security'

// Staff add a booking taken by phone, WhatsApp or in person. Unlike website
// bookings, the 24-hour notice and closed days and times do not apply, so a
// booking can also be recorded after the fact.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

const bad = (error: string) => NextResponse.json({ error }, { status: 400 })

// POST - Add a booking by hand
export async function POST(request: NextRequest) {
  if (!await getAuthorizedAdminRole(request, 'requests')) return NextResponse.json({ error: 'Requests access required' }, { status: 403 })
  if (!supabase) return NextResponse.json({ error: 'Database connection not available' }, { status: 503 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return bad('The booking details could not be read.')
  }

  const firstName = cleanPublicString(body.firstName, 100)
  const lastName = cleanPublicString(body.lastName, 100)
  const phone = cleanPublicString(body.phone, 40)
  const email = cleanPublicString(body.email, 180)?.toLowerCase() || ''
  const homeAddress = cleanPublicString(body.homeAddress, 500) || ''
  const consultationType = body.consultationType
  const preferredDate = typeof body.preferredDate === 'string' ? body.preferredDate : ''
  const startMinutes = typeof body.preferredTime === 'string' ? parseTime(body.preferredTime) : null
  const status = body.status
  const paymentStatus = body.paymentStatus

  if (!firstName || !lastName) return bad('Enter the patient’s first and last name.')
  if (!phone) return bad('Enter the patient’s phone number.')
  if (email && !isEmail(email)) return bad('Enter a valid email address, or leave it blank.')
  if (consultationType !== 'telemedicine' && consultationType !== 'home-visit') return bad('Choose telemedicine or home visit.')
  if (consultationType === 'home-visit' && !homeAddress) return bad('Enter the address for the home visit.')
  if (!isDate(preferredDate)) return bad('Choose a date for the booking.')
  if (startMinutes === null) return bad('Choose a time for the booking.')
  if (typeof status !== 'string' || !['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) return bad('Choose a booking status.')
  if (typeof paymentStatus !== 'string' || !['pending', 'paid', 'failed'].includes(paymentStatus)) return bad('Choose a payment status.')

  try {
    // Link the booking to the patient's record when they are already registered.
    const [patientByPhone, patientByEmail] = await Promise.all([
      supabase.from('emr_patients').select('id').eq('phone', phone).limit(1).maybeSingle(),
      email ? supabase.from('emr_patients').select('id').eq('email', email).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ])
    if (patientByPhone.error || patientByEmail.error) throw patientByPhone.error || patientByEmail.error

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        home_address: homeAddress,
        consultation_type: consultationType,
        preferred_date: preferredDate,
        preferred_time: clockTime(startMinutes),
        symptoms: cleanPublicString(body.notes, 3000),
        status,
        payment_status: paymentStatus,
        patient_id: patientByPhone.data?.id || patientByEmail.data?.id || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()
    if (error) throw error

    await writeRequestAdminActivity(supabase, request, {
      action: 'add_appointment',
      module: 'Requests',
      description: `Added a booking for ${firstName} ${lastName} on ${displayDate(preferredDate)} at ${displayTime(clockTime(startMinutes))}`,
      entityType: 'appointment',
      entityId: data.id,
      metadata: { consultation_type: consultationType, status, payment_status: paymentStatus },
    })

    return NextResponse.json({ appointment: data }, { status: 201 })
  } catch (error) {
    console.error('Error adding appointment:', error)
    return NextResponse.json({ error: 'The booking could not be saved. Please try again.' }, { status: 500 })
  }
}
