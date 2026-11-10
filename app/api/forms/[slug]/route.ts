import { NextRequest, NextResponse } from 'next/server'
import { getRequestAdminUser } from '@/lib/admin-api-auth'
import { getUserAdminRole } from '@/lib/admin-auth'
import { cleanFormText, gradeFormResponse } from '@/lib/forms'
import { formsErrorMessage, getPatientEmail, patientCanFill, publicForm, staffCanFill } from '@/lib/forms-server'
import type { FormRecord } from '@/lib/forms-types'
import { getRequestPatient } from '@/lib/patient-portal'
import { checkRateLimit, isEmail } from '@/lib/request-security'
import { getTrainingDatabase as getFormsDatabase } from '@/lib/training'

type Context = { params: Promise<{ slug: string }> }
const signIn = { staff: '/admin/login', patients: '/patient-portal/login' } as const

async function loadForm(slug: string) {
  const database = getFormsDatabase()
  if (!database || !/^[a-z0-9-]{3,80}$/.test(slug)) return { database, form: null }
  const { data, error } = await database.from('forms').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return { database, form: data as FormRecord | null }
}

// Who is asking, and whether they may fill this form. Customers' forms need no sign-in.
async function respondent(request: NextRequest, form: FormRecord) {
  if (form.audience === 'customers') return { kind: 'public' as const }
  if (form.audience === 'staff') {
    const user = await getRequestAdminUser(request)
    return { kind: 'staff' as const, user, allowed: staffCanFill(form, user), isAdmin: getUserAdminRole(user) === 'admin' }
  }
  const patient = await getRequestPatient(request)
  const email = patient ? await getPatientEmail(patient.database, patient.patientId, patient.user) : null
  return { kind: 'patient' as const, patient, allowed: !!patient && patientCanFill(form, email) }
}

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { slug } = await params; const { database, form } = await loadForm(slug)
    if (!database) return NextResponse.json({ error: 'Forms are unavailable right now.' }, { status: 503 })
    // Drafts are visible only to admins, so they can check a form before publishing it.
    const admin = getUserAdminRole(await getRequestAdminUser(request)) === 'admin'
    if (!form || (form.status === 'draft' && !admin)) return NextResponse.json({ error: 'This form could not be found.' }, { status: 404 })
    const who = await respondent(request, form)
    if (who.kind !== 'public' && !who.allowed && !admin) {
      const signedIn = who.kind === 'staff' ? !!who.user : !!who.patient
      return NextResponse.json({ error: signedIn ? 'This form has not been shared with you.' : 'Please sign in to fill in this form.', audience: form.audience, signIn: signedIn ? null : signIn[form.audience as 'staff' | 'patients'] }, { status: signedIn ? 403 : 401 })
    }
    let myResponse = null
    if (form.one_response_per_person && who.kind !== 'public' && who.allowed) {
      const query = database.from('form_responses').select('answers,score,passed,submitted_at').eq('form_id', form.id)
      const { data } = await (who.kind === 'staff' ? query.eq('user_id', who.user!.id) : query.eq('patient_id', who.patient!.patientId)).order('submitted_at', { ascending: false }).limit(1).maybeSingle()
      myResponse = data
    }
    return NextResponse.json({ form: publicForm(form), my_response: myResponse, preview: admin && (form.status === 'draft' || (who.kind !== 'public' && !who.allowed)) })
  } catch (error) { console.error('Error loading form:', error); return NextResponse.json({ error: formsErrorMessage(error, 'This form could not be loaded.') }, { status: 500 }) }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const limit = checkRateLimit(request, 'form-response', 20, 15 * 60 * 1000)
    if (!limit.allowed) return NextResponse.json({ error: 'Too many submissions. Please try again shortly.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
    const { slug } = await params; const { database, form } = await loadForm(slug)
    if (!database) return NextResponse.json({ error: 'Forms are unavailable right now.' }, { status: 503 })
    if (!form || form.status === 'draft') return NextResponse.json({ error: 'This form could not be found.' }, { status: 404 })
    if (form.status === 'closed') return NextResponse.json({ error: 'This form is closed and no longer accepts responses.' }, { status: 410 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    // Bots fill every field; people never see this one.
    if (cleanFormText(body?.website, 200)) return NextResponse.json({ success: true })

    const who = await respondent(request, form)
    if (who.kind !== 'public' && !who.allowed) return NextResponse.json({ error: 'This form has not been shared with you.' }, { status: 403 })
    const graded = gradeFormResponse(form.definition, body?.answers)
    if ('error' in graded) return NextResponse.json({ error: graded.error }, { status: 400 })

    let row: Record<string, unknown> = { form_id: form.id, ...graded, submitted_at: new Date().toISOString() }
    if (who.kind === 'public') {
      const contact = body?.contact && typeof body.contact === 'object' ? body.contact as Record<string, unknown> : {}
      const name = cleanFormText(contact.name, 160); const email = cleanFormText(contact.email, 254).toLowerCase(); const phone = cleanFormText(contact.phone, 40)
      if (form.collect_contact === 'required' && (!name || !email)) return NextResponse.json({ error: 'Please enter your name and email.' }, { status: 400 })
      if (email && !isEmail(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
      row = { ...row, respondent_type: 'public', ...(form.collect_contact === 'none' ? {} : { contact_name: name || null, contact_email: email || null, contact_phone: phone || null }) }
    } else if (who.kind === 'staff') {
      row = { ...row, respondent_type: 'staff', user_id: who.user!.id }
    } else {
      row = { ...row, respondent_type: 'patient', user_id: who.patient!.user.id, patient_id: who.patient!.patientId }
    }

    // One editable response per person: update the existing one instead of adding another.
    if (form.one_response_per_person && who.kind !== 'public') {
      const query = database.from('form_responses').select('id').eq('form_id', form.id)
      const { data: existing } = await (who.kind === 'staff' ? query.eq('user_id', who.user!.id) : query.eq('patient_id', who.patient!.patientId)).limit(1).maybeSingle()
      if (existing) {
        const { data, error } = await database.from('form_responses').update(row).eq('id', existing.id).select('answers,score,passed,submitted_at').single()
        if (error) throw error
        return NextResponse.json({ response: data })
      }
    }
    const { data, error } = await database.from('form_responses').insert(row).select('answers,score,passed,submitted_at').single()
    if (error) throw error
    return NextResponse.json({ response: data }, { status: 201 })
  } catch (error) { console.error('Error saving form response:', error); return NextResponse.json({ error: formsErrorMessage(error, 'Your response could not be saved. Please try again.') }, { status: 500 }) }
}
