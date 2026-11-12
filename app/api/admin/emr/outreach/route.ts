import { NextRequest, NextResponse } from 'next/server'
import { calculateBmi, cleanDate, cleanNumber, cleanText, getEmrContext, isUuid, writeEmrAudit } from '@/lib/emr'
import type { FormDefinition } from '@/lib/forms'
import { followUpWish, intakeNote, vitalFields, type OutreachAttendee, type OutreachStatus } from '@/lib/outreach'

const migrationHint = 'Has migration 048 been applied?'
const statuses: OutreachStatus[] = ['awaiting_vitals', 'signed_off', 'booked', 'no_follow_up', 'left']
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status })

// Outreach forms with attendee counts, or one outreach's attendees with their answers.
export async function GET(request: NextRequest) {
  const context = await getEmrContext(request, 'view_patients')
  if (!context) return fail('Clinical access required.', 403)
  const { database } = context
  const formId = new URL(request.url).searchParams.get('formId')
  try {
    if (!formId) {
      const { data: forms, error } = await database.from('forms').select('id,title,slug,status,created_at').eq('outreach', true).order('created_at', { ascending: false })
      if (error) throw error
      const { data: rows, error: countError } = forms?.length
        ? await database.from('emr_outreach_attendees').select('form_id,status').in('form_id', forms.map((f) => f.id)).limit(20000)
        : { data: [], error: null }
      if (countError) throw countError
      return NextResponse.json({ outreaches: (forms || []).map((form) => ({
        ...form, counts: Object.fromEntries(statuses.map((s) => [s, (rows || []).filter((r) => r.form_id === form.id && r.status === s).length])),
      })) })
    }
    if (!isUuid(formId)) return fail('A valid outreach is required.')

    const [{ data: form, error: formError }, { data: attendees, error }] = await Promise.all([
      database.from('forms').select('id,title,definition').eq('id', formId).single(),
      database.from('emr_outreach_attendees').select('*').eq('form_id', formId).order('created_at', { ascending: false }).limit(2000),
    ])
    if (formError || error) throw formError || error
    const rows = (attendees || []) as OutreachAttendee[]
    const definition = form.definition as FormDefinition

    const responseIds = rows.map((a) => a.form_response_id)
    const { data: responses } = responseIds.length ? await database.from('form_responses').select('id,answers').in('id', responseIds) : { data: [] }
    const answersById = new Map((responses || []).map((r) => [r.id, r.answers]))

    // Possible existing patients, matched as the registration queue does: phone, email, or name and date of birth.
    const pending = rows.filter((a) => a.status !== 'booked')
    const phones = Array.from(new Set(pending.map((a) => a.phone).filter(Boolean))) as string[]
    const emails = Array.from(new Set(pending.map((a) => a.email).filter(Boolean))) as string[]
    const dobs = Array.from(new Set(pending.map((a) => a.date_of_birth).filter(Boolean))) as string[]
    const columns = 'id,mrn,first_name,last_name,date_of_birth,phone,email'
    const none = Promise.resolve({ data: [] as { id: string; mrn: string; first_name: string; last_name: string; date_of_birth: string | null; phone: string | null; email: string | null }[] })
    const [byPhone, byEmail, byDob] = await Promise.all([
      phones.length ? database.from('emr_patients').select(columns).in('phone', phones) : none,
      emails.length ? database.from('emr_patients').select(columns).in('email', emails) : none,
      dobs.length ? database.from('emr_patients').select(columns).in('date_of_birth', dobs) : none,
    ])
    const candidates = Array.from(new Map([...(byPhone.data || []), ...(byEmail.data || []), ...(byDob.data || [])].map((p) => [p.id, p])).values())

    const booked = rows.map((a) => a.patient_id).filter(Boolean) as string[]
    const { data: bookedPatients } = booked.length ? await database.from('emr_patients').select('id,mrn').in('id', booked) : { data: [] }
    const mrns = new Map((bookedPatients || []).map((p) => [p.id, p.mrn]))

    const staffIds = new Set(rows.flatMap((a) => [a.recorded_by, a.signed_by]).filter(Boolean))
    const staff = new Map<string, string>()
    if (staffIds.size) {
      const { data: listed } = await database.auth.admin.listUsers({ perPage: 1000 })
      for (const member of listed?.users || []) if (staffIds.has(member.id)) staff.set(member.id, member.user_metadata?.full_name || member.email || 'Staff member')
    }

    return NextResponse.json({
      outreach: { id: form.id, title: form.title, definition },
      attendees: rows.map((a) => {
        const answers = answersById.get(a.form_response_id) || {}
        const name = a.full_name.toLowerCase()
        return {
          ...a, answers, follow_up_wish: followUpWish(definition, answers),
          recorder: a.recorded_by ? staff.get(a.recorded_by) || 'Staff member' : null,
          signer: a.signed_by ? staff.get(a.signed_by) || 'Staff member' : null,
          patient_mrn: a.patient_id ? mrns.get(a.patient_id) || null : null,
          duplicates: a.status === 'booked' ? [] : candidates.filter((p) => (a.phone && p.phone === a.phone) || (a.email && p.email?.toLowerCase() === a.email.toLowerCase())
            || (a.date_of_birth && p.date_of_birth === a.date_of_birth && name.includes(p.first_name.toLowerCase()) && name.includes(p.last_name.toLowerCase()))),
        }
      }),
    })
  } catch (error) {
    console.error('Failed to load outreach attendees:', error)
    return fail(`Unable to load outreach attendees. ${migrationHint}`, 500)
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const action = String(body?.action || '')
  if (!body || !isUuid(body.id) || !['record_vitals', 'sign_off', 'set_status', 'update_details', 'book_follow_up'].includes(action)) return fail('A valid outreach action is required.')
  const context = await getEmrContext(request, action === 'book_follow_up' ? 'create_patients' : action === 'update_details' ? 'edit_patients' : 'record_vitals')
  if (!context) return fail('Clinical access required.', 403)
  const { database, user } = context
  const audit = (event: string, metadata: Record<string, unknown>, patientId?: string | null) =>
    writeEmrAudit(database, user, { action: event, entityType: 'outreach_attendee', entityId: body.id as string, patientId, metadata })

  try {
    const { data: attendee } = await database.from('emr_outreach_attendees').select('*').eq('id', body.id).maybeSingle()
    if (!attendee) return fail('Outreach attendee not found.', 404)
    // Once booked, the patient chart holds the record; corrections are made there.
    if (attendee.status === 'booked') return fail('A follow-up is already booked for this attendee. Make any corrections in their patient chart.', 409)
    const save = async (update: Record<string, unknown>) => {
      const { data, error } = await database.from('emr_outreach_attendees').update(update).eq('id', attendee.id).select('*').single()
      if (error) throw error
      return NextResponse.json({ attendee: data })
    }

    if (action === 'record_vitals') {
      const update: Record<string, unknown> = {}
      for (const field of vitalFields) {
        const value = cleanNumber(body[field.name])
        if (value !== null && (value < field.min || value > field.max)) return fail(`${field.label} must be between ${field.min} and ${field.max}${field.unit ? ` ${field.unit}` : ''}.`)
        update[field.name] = value === null ? null : 'integer' in field ? Math.round(value) : value
      }
      update.glucose_unit = body.glucose_unit === 'mmol/L' ? 'mmol/L' : 'mg/dL'
      update.glucose_timing = body.glucose_timing === 'fasting' || body.glucose_timing === 'random' ? body.glucose_timing : null
      update.vitals_notes = cleanText(body.vitals_notes, 2000)
      update.bmi = calculateBmi(update.weight_kg, update.height_cm)
      update.recorded_by = user.id; update.recorded_at = new Date().toISOString()
      // Changing signed-off readings keeps the earlier values in the audit log.
      if (attendee.signed_at) await audit('correct_outreach_vitals', { previous: Object.fromEntries(Object.keys(update).map((k) => [k, attendee[k]])) })
      return save(update)
    }

    if (action === 'sign_off') {
      if (attendee.systolic_bp == null || attendee.diastolic_bp == null || attendee.heart_rate == null) return fail('Record at least blood pressure and pulse before signing off.')
      await audit('sign_off_outreach_vitals', {})
      return save({ signed_by: user.id, signed_at: new Date().toISOString(), status: 'signed_off' })
    }

    if (action === 'set_status') {
      const status = body.status as OutreachStatus
      if (!['awaiting_vitals', 'signed_off', 'no_follow_up', 'left'].includes(status)) return fail('Choose a valid status.')
      if (status === 'signed_off' && !attendee.signed_at) return fail('Sign off the vital signs first.')
      await audit('set_outreach_status', { from: attendee.status, to: status })
      return save({ status })
    }

    if (action === 'update_details') {
      const fullName = cleanText(body.full_name, 160); const dob = cleanDate(body.date_of_birth)
      if (!fullName) return fail('A name is required.')
      if (dob && dob > new Date().toISOString().slice(0, 10)) return fail('Date of birth cannot be in the future.')
      const sex = ['female', 'male', 'intersex', 'unknown'].includes(String(body.sex)) ? body.sex : null
      await audit('update_outreach_details', { previous: { full_name: attendee.full_name, phone: attendee.phone, email: attendee.email, date_of_birth: attendee.date_of_birth, sex: attendee.sex, address: attendee.address } })
      return save({ full_name: fullName, phone: cleanText(body.phone, 40), email: cleanText(body.email, 254)?.toLowerCase() || null, date_of_birth: dob, sex, address: cleanText(body.address, 500) })
    }

    // book_follow_up
    const type = body.consultation_type === 'telemedicine' ? 'telemedicine' : body.consultation_type === 'home-visit' ? 'home-visit' : null
    const date = cleanDate(body.appointment_date); const time = typeof body.appointment_time === 'string' && /^\d{2}:\d{2}$/.test(body.appointment_time) ? body.appointment_time : null
    if (!type) return fail('Choose a home visit or telehealth.')
    if (!date || !time) return fail('Choose a date and time for the follow-up.')
    if (date < new Date().toISOString().slice(0, 10)) return fail('The follow-up date cannot be in the past.')
    const linkPatient = isUuid(body.link_patient_id) ? body.link_patient_id : null
    const dob = cleanDate(body.date_of_birth) || attendee.date_of_birth
    if (!linkPatient && !dob) return fail('A date of birth is needed to create the patient record.')

    const [{ data: form }, { data: response }] = await Promise.all([
      database.from('forms').select('title,definition').eq('id', attendee.form_id).single(),
      database.from('form_responses').select('answers,submitted_at').eq('id', attendee.form_response_id).single(),
    ])
    const definition = form?.definition as FormDefinition
    const answers = response?.answers || {}
    const concernQuestion = definition?.questions.find((q) => q.type === 'long_text' && /concern/i.test(q.label))
    const { data: result, error } = await database.rpc('book_outreach_follow_up', {
      p_attendee_id: attendee.id, p_actor_id: user.id, p_link_patient_id: linkPatient,
      p_first_name: cleanText(body.first_name, 80) || '', p_last_name: cleanText(body.last_name, 80) || '',
      p_date_of_birth: dob, p_sex: ['female', 'male', 'intersex', 'unknown'].includes(String(body.sex)) ? body.sex : attendee.sex,
      p_consultation_type: type, p_appointment_date: date, p_appointment_time: time,
      p_concern: (concernQuestion && typeof answers[concernQuestion.id] === 'string' ? answers[concernQuestion.id] : '') || `Follow-up from ${form?.title || 'medical outreach'}`,
      p_intake_note: definition ? intakeNote(form!.title, definition, answers, response?.submitted_at || attendee.created_at) : '',
    })
    if (error) {
      // Messages raised by book_outreach_follow_up are written for staff; anything else is unexpected.
      if (error.code === 'P0001') return fail(error.message, 409)
      throw error
    }
    await audit('book_outreach_follow_up', { consultation_type: type, appointment_date: date, appointment_time: time, linked_existing_patient: !!linkPatient, ...result }, result?.patient_id)
    const { data: updated } = await database.from('emr_outreach_attendees').select('*').eq('id', attendee.id).single()
    return NextResponse.json({ attendee: updated, ...result })
  } catch (error) {
    console.error('Failed to update outreach attendee:', error)
    return fail(`Unable to save. ${migrationHint}`, 500)
  }
}
