import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { canAccessTab, getUserAdminRole } from '@/lib/admin-auth'
import { writeAdminActivity } from '@/lib/admin-activity'
import { clockTime, displayDate, displayTime, isDate, lagosToday, parseTime } from '@/lib/bookingTimes'
import { emrRolePermissions, getEmrDatabase, isUuid, writeEmrAudit } from '@/lib/emr'
import { cleanPublicString, isEmail } from '@/lib/request-security'
import { notifyAppointment } from '@/lib/patient-portal'
import { alertStaff } from '@/lib/staff-alerts'

// Staff add a booking taken by phone, WhatsApp or in person, from the Requests
// calendar, the financial CRM or a patient's EMR chart. Every booking is for
// a registered patient or a new one, so it shows on that patient's chart.
// Unlike website bookings, the 24-hour notice and closed days and times do
// not apply, so a booking can also be recorded after the fact.
//
// A new patient is registered in the EMR straight away by staff who can
// create patients. For anyone else (sales) a registration request goes to the
// clinical team, and approving it links the booking (see migration 027).

const patientColumns = 'id, mrn, first_name, middle_name, last_name, phone, email, address'
const sexes = ['female', 'male', 'intersex', 'unknown']

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

async function staffContext(request: NextRequest) {
  const user = await getRequestAdminUser(request)
  const role = getUserAdminRole(user)
  if (!user || !role || !canAccessTab(role, 'requests')) return null
  return { user, canRegister: emrRolePermissions[role].includes('create_patients') }
}

// GET - Find registered patients to book for (?search=name, MRN, phone or email)
export async function GET(request: NextRequest) {
  const context = await staffContext(request)
  if (!context) return bad('Requests access required', 403)
  const database = getEmrDatabase()
  if (!database) return bad('Database connection not available', 503)

  const words = (cleanPublicString(new URL(request.url).searchParams.get('search'), 80) || '')
    .replace(/[%_,().*\\]/g, ' ').split(/\s+/).filter(Boolean)
  // The database narrows by the longest word; every word must then match.
  const longest = [...words].sort((a, b) => b.length - a.length)[0]
  let query = database.from('emr_patients').select(patientColumns).order('last_name').order('first_name').limit(longest ? 60 : 20)
  if (longest) query = query.or(['mrn', 'first_name', 'middle_name', 'last_name', 'phone', 'email'].map(column => `${column}.ilike.%${longest}%`).join(','))
  const { data, error } = await query
  if (error) {
    console.error('Error searching patients for a booking:', error)
    return bad('Patients could not be searched. Please try again.', 500)
  }
  const patients = (data || []).filter(patient => {
    const text = [patient.mrn, patient.first_name, patient.middle_name, patient.last_name, patient.phone, patient.email].join(' ').toLowerCase()
    return words.every(word => text.includes(word.toLowerCase()))
  }).slice(0, 20)
  return NextResponse.json({ patients, canRegister: context.canRegister })
}

async function findPatient(database: SupabaseClient, column: 'phone' | 'email', value: string) {
  const { data, error } = await database.from('emr_patients').select('mrn').eq(column, value).limit(1).maybeSingle()
  if (error) throw error
  return data
}

// POST - Add a booking for an existing patient ({ patientMode: 'existing', patientId })
// or a new one ({ patientMode: 'new', firstName, lastName, phone, dateOfBirth, sex, consent })
export async function POST(request: NextRequest) {
  const context = await staffContext(request)
  if (!context) return bad('Requests access required', 403)
  const database = getEmrDatabase()
  if (!database) return bad('Database connection not available', 503)
  const { user, canRegister } = context

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return bad('The booking details could not be read.')
  }

  const consultationType = body.consultationType
  const preferredDate = typeof body.preferredDate === 'string' ? body.preferredDate : ''
  const startMinutes = typeof body.preferredTime === 'string' ? parseTime(body.preferredTime) : null
  const status = body.status
  const paymentStatus = body.paymentStatus
  let homeAddress = cleanPublicString(body.homeAddress, 500) || ''

  if (consultationType !== 'telemedicine' && consultationType !== 'home-visit' && consultationType !== 'other') return bad('Choose telemedicine, home visit or other.')
  // An "other" booking or payment names what it is for and its amount.
  const other = consultationType === 'other'
  const serviceName = other ? cleanPublicString(body.serviceName, 120) : null
  const amount = other ? Number(body.amount) : null
  if (other && !serviceName) return bad('Enter the type of payment, such as Lab test or Supplements.')
  if (other && (!Number.isFinite(amount) || amount! <= 0 || amount! > 100_000_000)) return bad('Enter the amount in naira.')
  if (!isDate(preferredDate)) return bad('Choose a date for the booking.')
  if (startMinutes === null) return bad('Choose a time for the booking.')
  if (typeof status !== 'string' || !['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) return bad('Choose a booking status.')
  if (typeof paymentStatus !== 'string' || !['pending', 'paid', 'failed'].includes(paymentStatus)) return bad('Choose a payment status.')

  // Who the booking is for.
  let patient: { id: string; mrn: string } | null = null
  let newPatient: Record<string, unknown> | null = null
  let firstName: string, lastName: string, phone: string, email: string

  try {
    if (body.patientMode === 'existing') {
      if (!isUuid(body.patientId)) return bad('Choose the patient.')
      const { data, error } = await database.from('emr_patients').select(patientColumns).eq('id', body.patientId).maybeSingle()
      if (error) throw error
      if (!data) return bad('That patient could not be found. Please search again.')
      patient = { id: data.id, mrn: data.mrn }
      firstName = data.first_name
      lastName = data.last_name
      phone = data.phone || ''
      email = data.email || ''
      homeAddress ||= data.address || ''
    } else if (body.patientMode === 'new') {
      firstName = cleanPublicString(body.firstName, 100) || ''
      lastName = cleanPublicString(body.lastName, 100) || ''
      phone = cleanPublicString(body.phone, 40) || ''
      email = cleanPublicString(body.email, 180)?.toLowerCase() || ''
      const dateOfBirth = typeof body.dateOfBirth === 'string' ? body.dateOfBirth : ''
      const sex = typeof body.sex === 'string' ? body.sex : ''
      if (!firstName || !lastName) return bad('Enter the patient’s first and last name.')
      if (!phone) return bad('Enter the patient’s phone number.')
      if (email && !isEmail(email)) return bad('Enter a valid email address, or leave it blank.')
      if (!isDate(dateOfBirth) || dateOfBirth > lagosToday()) return bad('Enter the patient’s date of birth.')
      if (!sexes.includes(sex)) return bad('Choose the patient’s sex.')
      if (body.consent !== true) return bad('Confirm the patient agreed to FXMed keeping their details on record.')

      // One record per person: point staff to the existing one instead.
      const byPhone = await findPatient(database, 'phone', phone)
      const byEmail = !byPhone && email ? await findPatient(database, 'email', email) : null
      const existing = byPhone || byEmail
      if (existing) return bad(`A patient with this ${byPhone ? 'phone number' : 'email'} is already registered (${existing.mrn}). Choose them under Existing patient.`, 409)
      newPatient = { first_name: firstName, last_name: lastName, date_of_birth: dateOfBirth, sex, phone, email: email || null }
    } else {
      return bad('Choose an existing patient or add a new one.')
    }
    if (consultationType === 'home-visit' && !homeAddress) return bad('Enter the address for the home visit.')
    if (newPatient) newPatient.address = homeAddress || null

    if (newPatient && canRegister) {
      const { data, error } = await database.from('emr_patients').insert({ ...newPatient, created_by: user.id }).select('id, mrn').single()
      if (error) throw error
      patient = data
      await writeEmrAudit(database, user, { action: 'create', entityType: 'emr_patient', entityId: data.id, patientId: data.id, metadata: { source: 'staff_booking' } })
    }

    const now = new Date().toISOString()
    const { data: appointment, error } = await database
      .from('appointments')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        home_address: homeAddress,
        consultation_type: consultationType,
        ...(other ? { service_name: serviceName, amount: Math.round(amount! * 100) / 100 } : {}),
        preferred_date: preferredDate,
        preferred_time: clockTime(startMinutes),
        symptoms: cleanPublicString(body.notes, 3000),
        status,
        payment_status: paymentStatus,
        patient_id: patient?.id || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()
    if (error) {
      // Do not leave behind a patient registered only for this booking.
      if (newPatient && patient) await database.from('emr_patients').delete().eq('id', patient.id)
      // Before migration 047 the columns, or the rule allowing "other", are missing.
      if (other && (error.code === 'PGRST204' || error.code === '23514' || error.code === '42703')) return bad('Other payments need database migration 047 to be run first.', 503)
      throw error
    }

    let registration: 'created' | 'pending' | null = newPatient && patient ? 'created' : null
    if (newPatient && !patient) {
      const { error: registrationError } = await database.from('emr_patient_registration_requests').insert({
        ...newPatient,
        country: 'Nigeria',
        consent_confirmed: true,
        source: 'appointment_booking',
        status: 'pending',
        appointment_id: appointment.id,
      })
      if (registrationError) console.error('Error queueing patient registration for a staff booking:', registrationError)
      else {
        registration = 'pending'
        alertStaff('registration', { ...newPatient, source: 'appointment_booking' })
      }
    }

    const when = `${displayDate(preferredDate)} at ${displayTime(clockTime(startMinutes))}`
    await writeAdminActivity(database, user, {
      action: 'add_appointment',
      module: 'Requests',
      description: `Added a booking for ${firstName} ${lastName} on ${when}`,
      entityType: 'appointment',
      entityId: appointment.id,
      metadata: { consultation_type: consultationType, status, payment_status: paymentStatus, patient_id: patient?.id || null, registration },
    })
    if (patient) {
      if (status === 'pending' || status === 'confirmed') await notifyAppointment(database, appointment, 'booked')
      await writeEmrAudit(database, user, { action: 'schedule_appointment', entityType: 'appointment', entityId: appointment.id, patientId: patient.id, metadata: { preferred_date: preferredDate, consultation_type: consultationType } })
    }

    return NextResponse.json({ appointment, patient, registration }, { status: 201 })
  } catch (error) {
    console.error('Error adding appointment:', error)
    return bad('The booking could not be saved. Please try again.', 500)
  }
}
