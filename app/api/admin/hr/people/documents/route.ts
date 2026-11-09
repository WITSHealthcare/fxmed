import { NextRequest, NextResponse } from 'next/server'
import { canHr, cleanHrDate, cleanHrEnum, cleanHrOptionalText, cleanHrText, cleanHrUuid, documentTypes, hrDocumentBucket, restrictedDocumentTypes, values, type DocumentType } from '@/lib/hr'
import { hrDocumentColumns, hrDocumentMaxBytes, hrDocumentMimeTypes } from '@/lib/hr-people'
import { bad, canOpenDocument, deny, employeeFor, failure, isAdmin, logHr, peopleContext, type PeopleContext } from '../shared'

// Staff file documents. Files live in the private hr-documents bucket under
// employees/<employee_id>/ and are only handed out as short-lived signed URLs.

// Issued by FXMed, so only People Ops files them.
const adminIssued: DocumentType[] = ['contract', 'offer_letter', 'payslip', 'letter']

async function loadDocument(context: PeopleContext, id: string | null) {
  if (!id) return null
  const { data, error } = await context.database.from('hr_documents').select(`${hrDocumentColumns},storage_path`).eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function GET(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  try {
    const document = await loadDocument(context, cleanHrUuid(new URL(request.url).searchParams.get('id')))
    if (!document || document.status === 'deleted' || !document.employee_id) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    const access = await employeeFor(context, document.employee_id, 'document')
    if (!access || !canOpenDocument(context, access.relation, document)) return deny('Restricted documents are held by People Ops. Ask them for a copy.')
    const { data, error } = await context.database.storage.from(hrDocumentBucket).createSignedUrl(document.storage_path, 120)
    if (error || !data) throw error || new Error('No signed URL')
    await logHr(context, 'open_staff_document', `Opened ${document.is_restricted ? 'restricted ' : ''}document "${document.title}" for ${access.employee.legal_name}`, { type: 'hr_document', id: document.id, employee: access.employee }, { document_type: document.document_type })
    return NextResponse.json({ url: data.signedUrl })
  } catch (error) { return failure(error, 'open the document') }
}

export async function POST(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  try {
    const form = await request.formData().catch(() => null); if (!form) return bad('Choose a file to upload.')
    // Staff upload only to their own file; the id they send is ignored.
    const employeeId = isAdmin(context) ? cleanHrUuid(form.get('employee_id')) : context.viewer.employeeId
    const access = await employeeFor(context, employeeId, 'document', 'write')
    if (!access) return deny('You can upload documents to your own file only.')
    const file = form.get('file'); const type = cleanHrEnum(form.get('document_type'), values(documentTypes))
    if (!(file instanceof File) || !file.size) return bad('Choose a file to upload.')
    if (!type) return bad('Choose the document type.')
    if (!isAdmin(context) && adminIssued.includes(type)) return bad('People Ops files contracts, letters and payslips.')
    if (file.size > hrDocumentMaxBytes) return bad('Documents must be smaller than 15 MB.')
    if (!hrDocumentMimeTypes.includes(file.type)) return bad('Upload a PDF, image (JPEG, PNG, WebP) or Word document.')
    const restricted = restrictedDocumentTypes.includes(type) || (isAdmin(context) && form.get('is_restricted') === 'true')
    const path = `employees/${access.employee.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)}`
    const { error: uploadError } = await context.database.storage.from(hrDocumentBucket).upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError
    const { data, error } = await context.database.from('hr_documents').insert({
      employee_id: access.employee.id, document_type: type, title: cleanHrText(form.get('title'), 200) || file.name.slice(0, 200), storage_path: path, mime_type: file.type, size_bytes: file.size,
      is_restricted: restricted, retention_until: isAdmin(context) ? cleanHrDate(form.get('retention_until')) : null, uploaded_by: context.user.id,
    }).select(hrDocumentColumns).single()
    if (error) { await context.database.storage.from(hrDocumentBucket).remove([path]); throw error }
    await logHr(context, 'upload_staff_document', `Uploaded ${restricted ? 'restricted ' : ''}document "${data.title}" for ${access.employee.legal_name}`, { type: 'hr_document', id: data.id, employee: access.employee }, { document_type: type, size: file.size })
    return NextResponse.json({ document: data }, { status: 201 })
  } catch (error) { return failure(error, 'upload the document') }
}

// Admin: mark the original seen, verify, reject, or change type, title, restriction and retention.
export async function PATCH(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    const document = await loadDocument(context, cleanHrUuid(body?.id))
    if (!body || !document || !document.employee_id) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    const now = new Date().toISOString(); const me = context.user.id
    let changes: Record<string, unknown>
    if (body.action === 'original_seen') changes = { original_seen_at: now, original_seen_by: me }
    else if (body.action === 'verify') {
      const method = cleanHrText(body.verification_method, 200); if (!method) return bad('Say how the document was verified.')
      changes = { status: 'verified', verified_at: now, verified_by: me, verification_method: method }
    } else if (body.action === 'reject') changes = { status: 'rejected', verification_method: cleanHrOptionalText(body.verification_method, 200) }
    else {
      const type = cleanHrEnum(body.document_type, values(documentTypes)) || document.document_type as DocumentType
      changes = { document_type: type, title: cleanHrText(body.title, 200) || document.title, is_restricted: restrictedDocumentTypes.includes(type) || body.is_restricted === true, retention_until: cleanHrDate(body.retention_until) }
    }
    const { data, error } = await context.database.from('hr_documents').update(changes).eq('id', document.id).select(hrDocumentColumns).single(); if (error) throw error
    const { data: employee } = await context.database.from('hr_employees').select('legal_name,auth_user_id').eq('id', document.employee_id).single()
    await logHr(context, 'update_staff_document', `Updated document "${data.title}" for ${employee?.legal_name || 'employee'} (${typeof body.action === 'string' ? body.action : 'details'})`, { type: 'hr_document', id: document.id, employee }, { fields: Object.keys(changes) })
    return NextResponse.json({ document: data })
  } catch (error) { return failure(error, 'update the document') }
}

// Admin: delete the file (retention or error) and keep the metadata as evidence.
export async function DELETE(request: NextRequest) {
  const context = await peopleContext(request); if (context instanceof NextResponse) return context
  if (!isAdmin(context)) return deny('Admin access required.')
  try {
    const params = new URL(request.url).searchParams; const reason = cleanHrText(params.get('reason'), 300)
    const document = await loadDocument(context, cleanHrUuid(params.get('id')))
    if (!document || document.status === 'deleted') return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    if (!reason) return bad('Give the reason or retention rule for deleting this document.')
    const { data: employee } = document.employee_id ? await context.database.from('hr_employees').select('legal_name,auth_user_id,legal_hold').eq('id', document.employee_id).single() : { data: null }
    if (employee?.legal_hold) return bad('This file is under a legal hold. Nothing can be deleted until the MD lifts it.')
    const { error: removeError } = await context.database.storage.from(hrDocumentBucket).remove([document.storage_path]); if (removeError) throw removeError
    const { error } = await context.database.from('hr_documents').update({ status: 'deleted', deleted_at: new Date().toISOString() }).eq('id', document.id); if (error) throw error
    await context.database.from('hr_retention_log').insert({ entity_type: `hr_documents.${document.document_type}`, record_id: document.id, action: 'deleted', retention_rule: reason, performed_by: context.user.id })
    await logHr(context, 'delete_staff_document', `Deleted document "${document.title}" for ${employee?.legal_name || 'employee'}`, { type: 'hr_document', id: document.id, employee }, { reason })
    return NextResponse.json({ success: true })
  } catch (error) { return failure(error, 'delete the document') }
}
