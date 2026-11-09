import { NextRequest, NextResponse } from 'next/server'
import { cleanHrDate, cleanHrEnum, cleanHrNumber, cleanHrOptionalText, cleanHrText, cleanHrUuid, credentialTypes, hrDocumentBucket, hrEmployeeWorkColumns, practisingCredentialTypes, values, type CredentialType, type DocumentType, type HrEmployee } from '@/lib/hr'
import { credentialStatusOn, hrDocumentMaxBytes, hrDocumentMimeTypes, type HrCredential } from '@/lib/hr-people'
import { bad, deny, employeeFor, failure, isAdmin, logHr, peopleContext, today, viewCredentials, type PeopleContext } from '../shared'

// Licences, indemnity and identity checks on the employee file. Staff submit
// renewals (pending_verification); only admin verifies, suspends or fails.

const documentTypeFor = (type: CredentialType): DocumentType => type === 'indemnity' ? 'indemnity' : type === 'NIN' || type === 'right_to_work' ? 'id' : practisingCredentialTypes.includes(type) ? 'licence' : 'certificate'

function fields(form: FormData | Record<string, unknown>) {
  const get = (key: string) => form instanceof FormData ? form.get(key) : form[key]
  const credential_type = cleanHrEnum(get('credential_type'), values(credentialTypes))
  if (!credential_type) return null
  return {
    credential_type, issuing_body: cleanHrOptionalText(get('issuing_body'), 160), registration_number: cleanHrOptionalText(get('registration_number'), 80), licence_number: cleanHrOptionalText(get('licence_number'), 80),
    issued_on: cleanHrDate(get('issued_on')), expires_on: cleanHrDate(get('expires_on')), cpd_points_required: cleanHrNumber(get('cpd_points_required'), 0, 1000), notes: cleanHrText(get('notes'), 2000),
  }
}

async function report(context: PeopleContext) {
  const { database } = context
  const [{ data: employees, error }, { data: credentials, error: credentialError }] = await Promise.all([
    database.from('hr_employees').select(hrEmployeeWorkColumns).neq('status', 'exited').order('legal_name'),
    database.from('hr_credentials').select('*').in('credential_type', practisingCredentialTypes).not('employee_id', 'is', null).neq('status', 'superseded'),
  ])
  if (error) throw error; if (credentialError) throw credentialError
  const views = await viewCredentials(database, (credentials || []) as HrCredential[], true)
  const staff = (employees || []) as unknown as HrEmployee[]
  // Clinical staff and anyone holding a practising credential.
  const rows = staff.filter((employee) => employee.department === 'Clinical' || views.some((v) => v.employee_id === employee.id)).map((employee) => {
    const held = views.filter((v) => v.employee_id === employee.id)
    // Cleared when a practising licence (not just indemnity) is current or expiring soon, and no indemnity has lapsed.
    const licensed = held.some((v) => v.credential_type !== 'indemnity' && ['current', 'expiring_soon'].includes(v.status))
    const indemnityLapsed = held.some((v) => v.credential_type === 'indemnity' && v.status === 'expired') && !held.some((v) => v.credential_type === 'indemnity' && ['current', 'expiring_soon'].includes(v.status))
    return { employee: { id: employee.id, name: employee.preferred_name || employee.legal_name, job_title: employee.job_title, status: employee.status, employment_type: employee.employment_type }, credentials: held, cleared: licensed && !indemnityLapsed }
  })
  await logHr(context, 'view_licence_report', 'Viewed the monthly licence report', { type: 'hr_credentials', id: null }, { staff: rows.length })
  return NextResponse.json({ generated_on: today(), rows })
}

export async function GET(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try { return await report(context) } catch (error) { return failure(error, 'build the licence report') }
}

export async function POST(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  try {
    const form = await request.formData().catch(() => null); if (!form) return bad('Fill in the credential details.')
    // Staff submit for themselves only; the id they send is ignored.
    const employeeId = isAdmin(context) ? cleanHrUuid(form.get('employee_id')) : context.viewer.employeeId
    const access = await employeeFor(context, employeeId, 'credential', 'write')
    if (!access) return deny('You can submit credentials for your own file only.')
    const clean = fields(form); if (!clean) return bad('Choose the credential type.')
    if (clean.expires_on && clean.issued_on && clean.expires_on < clean.issued_on) return bad('The expiry date is before the issue date.')
    const supersedesId = cleanHrUuid(form.get('supersedes_id'))
    if (supersedesId) {
      const { data: previous } = await context.database.from('hr_credentials').select('employee_id').eq('id', supersedesId).maybeSingle()
      if (previous?.employee_id !== access.employee.id) return bad('The credential being renewed is not on this file.')
    }
    const file = form.get('file'); let documentId: string | null = null; let path: string | null = null
    if (file instanceof File && file.size) {
      if (file.size > hrDocumentMaxBytes) return bad('Documents must be smaller than 15 MB.')
      if (!hrDocumentMimeTypes.includes(file.type)) return bad('Upload a PDF, image (JPEG, PNG, WebP) or Word document.')
      path = `employees/${access.employee.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)}`
      const { error: uploadError } = await context.database.storage.from(hrDocumentBucket).upload(path, file, { contentType: file.type, upsert: false }); if (uploadError) throw uploadError
      const label = credentialTypes.find((t) => t.value === clean.credential_type)?.label || clean.credential_type
      const { data: document, error: documentError } = await context.database.from('hr_documents').insert({ employee_id: access.employee.id, document_type: documentTypeFor(clean.credential_type), title: `${label}${clean.expires_on ? ` (expires ${clean.expires_on})` : ''}`, storage_path: path, is_restricted: clean.credential_type === 'police_certificate', mime_type: file.type, size_bytes: file.size, uploaded_by: context.user.id }).select('id').single()
      if (documentError) { await context.database.storage.from(hrDocumentBucket).remove([path]); throw documentError }
      documentId = document.id
    }
    const { data, error } = await context.database.from('hr_credentials').insert({ ...clean, employee_id: access.employee.id, supersedes_id: supersedesId, document_id: documentId, status: 'pending_verification' }).select('*').single()
    if (error) { if (documentId) { await context.database.from('hr_documents').delete().eq('id', documentId); await context.database.storage.from(hrDocumentBucket).remove([path!]) } throw error }
    await logHr(context, supersedesId ? 'submit_credential_renewal' : 'add_credential', `${supersedesId ? 'Submitted renewal of' : 'Added'} ${clean.credential_type} for ${access.employee.legal_name}`, { type: 'hr_credential', id: data.id, employee: access.employee }, { expires_on: clean.expires_on, with_document: !!documentId })
    return NextResponse.json({ credential: data }, { status: 201 })
  } catch (error) { return failure(error, 'save the credential') }
}

// Admin: verify (status follows the expiry date), suspend, fail, or edit.
export async function PATCH(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Only People Ops can verify or change a credential.')
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null; const id = cleanHrUuid(body?.id)
    const { data: credential, error: loadError } = id ? await context.database.from('hr_credentials').select('*').eq('id', id).maybeSingle() : { data: null, error: null }
    if (loadError) throw loadError
    if (!body || !credential || !credential.employee_id) return NextResponse.json({ error: 'Credential not found.' }, { status: 404 })
    let changes: Record<string, unknown>
    if (body.action === 'verify') {
      const method = cleanHrText(body.verification_method, 200); if (!method) return bad('Record how it was verified (council portal, phone, letter).')
      if (practisingCredentialTypes.includes(credential.credential_type) && !credential.expires_on) return bad('Add the expiry date printed on the licence before verifying.')
      changes = { verification_method: method, verified_by: context.user.id, verified_at: new Date().toISOString(), status: credentialStatusOn({ status: 'current', expires_on: credential.expires_on }, today()) }
    } else if (body.action === 'suspend' || body.action === 'fail') changes = { status: body.action === 'suspend' ? 'suspended' : 'failed', notes: cleanHrText(body.notes, 2000) || credential.notes }
    else {
      const clean = fields(body); if (!clean) return bad('Choose the credential type.')
      if (clean.expires_on && clean.issued_on && clean.expires_on < clean.issued_on) return bad('The expiry date is before the issue date.')
      // A new expiry date restarts the reminders.
      const reset = clean.expires_on !== credential.expires_on ? { reminder_90_sent_at: null, reminder_60_sent_at: null, reminder_30_sent_at: null, reminder_7_sent_at: null } : {}
      const status = ['current', 'expiring_soon', 'expired'].includes(credential.status) ? { status: credentialStatusOn({ status: 'current', expires_on: clean.expires_on }, today()) } : {}
      changes = { ...clean, ...reset, ...status }
    }
    const { data, error } = await context.database.from('hr_credentials').update(changes).eq('id', credential.id).select('*').single(); if (error) throw error
    if (body.action === 'verify' && credential.supersedes_id) {
      const { error: supersedeError } = await context.database.from('hr_credentials').update({ status: 'superseded' }).eq('id', credential.supersedes_id).eq('employee_id', credential.employee_id); if (supersedeError) throw supersedeError
    }
    const { data: employee } = await context.database.from('hr_employees').select('legal_name,auth_user_id').eq('id', credential.employee_id).single()
    const action = typeof body.action === 'string' && ['verify', 'suspend', 'fail'].includes(body.action) ? body.action : 'edit'
    await logHr(context, `${action}_credential`, `${action === 'edit' ? 'Edited' : action === 'verify' ? 'Verified' : action === 'suspend' ? 'Suspended' : 'Failed verification of'} ${credential.credential_type} for ${employee?.legal_name || 'employee'}`, { type: 'hr_credential', id: credential.id, employee }, { status: data.status })
    const [view] = await viewCredentials(context.database, [data as HrCredential], false)
    return NextResponse.json({ credential: view })
  } catch (error) { return failure(error, 'update the credential') }
}
