import { NextRequest, NextResponse } from 'next/server'
import { getEmrContext, isUuid, writeEmrAudit } from '@/lib/emr'

const statuses = new Set(['pending','approved','linked','correction_requested','rejected'])

export async function GET(request: NextRequest) {
  const context = await getEmrContext(request, 'view_patients')
  if (!context) return NextResponse.json({ error: 'Clinical access required.' }, { status: 403 })
  const { database } = context
  const requestedStatus = new URL(request.url).searchParams.get('status') || 'pending'
  const status = statuses.has(requestedStatus) ? requestedStatus : 'pending'

  try {
    const { data: registrations, error } = await database.from('emr_patient_registration_requests').select('*').eq('status', status).order('submitted_at', { ascending: false }).limit(200)
    if (error) throw error
    const rows = registrations || []
    const phones = Array.from(new Set(rows.map(row => row.phone).filter(Boolean)))
    const emails = Array.from(new Set(rows.map(row => row.email).filter(Boolean)))
    const datesOfBirth = Array.from(new Set(rows.map(row => row.date_of_birth).filter(Boolean)))
    const [phoneMatches, emailMatches, dobMatches] = await Promise.all([
      phones.length ? database.from('emr_patients').select('id,mrn,first_name,last_name,date_of_birth,phone,email').in('phone', phones) : Promise.resolve({ data: [], error: null }),
      emails.length ? database.from('emr_patients').select('id,mrn,first_name,last_name,date_of_birth,phone,email').in('email', emails) : Promise.resolve({ data: [], error: null }),
      datesOfBirth.length ? database.from('emr_patients').select('id,mrn,first_name,last_name,date_of_birth,phone,email').in('date_of_birth', datesOfBirth) : Promise.resolve({ data: [], error: null }),
    ])
    if (phoneMatches.error || emailMatches.error || dobMatches.error) throw phoneMatches.error || emailMatches.error || dobMatches.error
    const candidates = [...(phoneMatches.data || []), ...(emailMatches.data || []), ...(dobMatches.data || [])]
    const unique = Array.from(new Map(candidates.map(patient => [patient.id, patient])).values())

    return NextResponse.json({
      registrations: rows.map(registration => ({
        ...registration,
        duplicateCandidates: unique.filter(patient =>
          patient.phone === registration.phone ||
          (registration.email && patient.email?.toLowerCase() === registration.email.toLowerCase()) ||
          (patient.date_of_birth === registration.date_of_birth && patient.first_name.toLowerCase() === registration.first_name.toLowerCase() && patient.last_name.toLowerCase() === registration.last_name.toLowerCase())
        ),
      })),
    })
  } catch (error) {
    console.error('Failed to load patient registration requests:', error)
    return NextResponse.json({ error: 'Unable to load registration requests.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const context = await getEmrContext(request, 'create_patients')
  if (!context) return NextResponse.json({ error: 'Patient approval access required.' }, { status: 403 })
  const { database, user } = context

  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return NextResponse.json({ error: 'A valid registration action is required.' }, { status: 400 })
    const id = body.id
    const action = body.action
    if (!isUuid(id) || !['approve','link','reject','request_correction','update_demographics'].includes(String(action))) return NextResponse.json({ error: 'A valid registration action is required.' }, { status: 400 })

    const { data: registration, error: findError } = await database.from('emr_patient_registration_requests').select('*').eq('id', id).maybeSingle()
    if (findError || !registration) return NextResponse.json({ error: 'Registration request not found.' }, { status: 404 })
    if (!['pending','correction_requested'].includes(registration.status)) return NextResponse.json({ error: 'This registration has already been reviewed.' }, { status: 409 })

    if (action === 'update_demographics') {
      const dateOfBirth = typeof body.date_of_birth === 'string' ? body.date_of_birth : ''
      const sex = typeof body.sex === 'string' ? body.sex : ''
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || dateOfBirth > new Date().toISOString().slice(0, 10) || !['female','male','intersex','unknown'].includes(sex)) {
        return NextResponse.json({ error: 'Enter a valid date of birth and sex.' }, { status: 400 })
      }
      const { error } = await database.from('emr_patient_registration_requests').update({ date_of_birth: dateOfBirth, sex, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'complete_registration_demographics', entityType: 'emr_patient_registration_request', entityId: id, metadata: { source: registration.source } })
      return NextResponse.json({ status: registration.status })
    }

    if (action === 'approve') {
      if (!registration.date_of_birth || !registration.sex) return NextResponse.json({ error: 'Complete the date of birth and sex before approval.' }, { status: 400 })
      const { data: patientId, error } = await database.rpc('approve_emr_patient_registration', { request_id: id, reviewer_id: user.id })
      if (error) throw error
      await writeEmrAudit(database, user, { action: 'approve_patient_registration', entityType: 'emr_patient_registration_request', entityId: id, patientId, metadata: { submittedAt: registration.submitted_at } })
      return NextResponse.json({ patientId, status: 'approved' })
    }

    const notes = typeof body.review_notes === 'string' ? body.review_notes.trim().slice(0, 4000) : null
    if ((action === 'reject' || action === 'request_correction') && !notes) return NextResponse.json({ error: 'Add a review note explaining this decision.' }, { status: 400 })
    const linkedPatientId = action === 'link' && isUuid(body.patient_id) ? body.patient_id : null
    if (action === 'link' && !linkedPatientId) return NextResponse.json({ error: 'Select the existing patient to link.' }, { status: 400 })
    if (linkedPatientId) {
      const { data: patient } = await database.from('emr_patients').select('id').eq('id', linkedPatientId).maybeSingle()
      if (!patient) return NextResponse.json({ error: 'The selected patient no longer exists.' }, { status: 404 })
      if (registration.appointment_id) {
        const { error: appointmentError } = await database.from('appointments').update({ patient_id: linkedPatientId, updated_at: new Date().toISOString() }).eq('id', registration.appointment_id)
        if (appointmentError) throw appointmentError
      }
    }
    const nextStatus = action === 'link' ? 'linked' : action === 'reject' ? 'rejected' : 'correction_requested'
    const { error } = await database.from('emr_patient_registration_requests').update({ status: nextStatus, linked_patient_id: linkedPatientId, review_notes: notes, reviewed_by: user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    await writeEmrAudit(database, user, { action: `${action}_patient_registration`, entityType: 'emr_patient_registration_request', entityId: id, patientId: linkedPatientId, metadata: { reviewNotes: notes } })
    return NextResponse.json({ patientId: linkedPatientId, status: nextStatus })
  } catch (error) {
    console.error('Failed to review patient registration:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to review registration.' }, { status: 500 })
  }
}
