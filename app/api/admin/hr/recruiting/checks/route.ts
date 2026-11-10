import { NextRequest, NextResponse } from 'next/server'
import { lagosDate } from '@/lib/follow-ups'
import { cleanHrDate, cleanHrEnum, cleanHrNumber, cleanHrOptionalText, cleanHrText, cleanHrUuid, credentialTypes, documentTypes, hrDocumentBucket, restrictedDocumentTypes, values, type DocumentType } from '@/lib/hr'
import { candidateHealthDocumentTypes, isClosedStage } from '@/lib/hr-recruiting'
import { checkMimeTypes, checkUpload, cvMimeTypes, fail, interviewerScorecards, logHr, readJson, recordEvent, recruitingContext, serverError, signedUrl, type HrDatabase } from '../shared'

// Pre-offer checks on an application: credentials (identity, qualifications,
// licences, indemnity) and documents in the hr-documents bucket under
// candidates/<application_id>/. Admin only, except that an assigned
// interviewer may open the CV of an open application through a signed URL.
// Collect only what the stage needs: nothing but the CV before a hire
// decision, and health documents only after a conditional offer.
async function loadApplication(database: HrDatabase, id: string | null) {
  if (!id) return null
  const { data } = await database.from('hr_applications').select('id,stage,decision,employee_id,cv_path').eq('id', id).maybeSingle()
  return data
}
async function hasOffer(database: HrDatabase, applicationId: string, statuses: string[]) {
  const { count } = await database.from('hr_offers').select('id', { count: 'exact', head: true }).eq('application_id', applicationId).in('status', statuses)
  return !!count
}

export async function GET(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  const params = new URL(request.url).searchParams; const documentId = cleanHrUuid(params.get('document')); const cvFor = cleanHrUuid(params.get('cv'))
  try {
    const query = database.from('hr_documents').select('id,application_id,employee_id,document_type,title,storage_path,is_restricted,status').neq('status', 'deleted')
    const { data: document } = documentId ? await query.eq('id', documentId).maybeSingle() : cvFor ? await query.eq('application_id', cvFor).eq('document_type', 'cv').order('created_at', { ascending: false }).limit(1).maybeSingle() : { data: null }
    if (!document?.application_id) return fail('Document not found.', 404)
    const allowed = admin ? !document.employee_id : document.document_type === 'cv' && !document.is_restricted && !document.employee_id && await interviewerScorecards(database, user.id, document.application_id) > 0
    if (!allowed) return fail('Document not found.', 404)
    const url = await signedUrl(database, document.storage_path)
    await logHr(context, { action: 'view_document', entityType: 'hr_document', entityId: document.id, description: `Opened ${document.title}` })
    return NextResponse.json({ url })
  } catch (error) { return serverError(error, 'signing candidate document', 'Failed to open the document.') }
}

export async function POST(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  try {
    if ((request.headers.get('content-type') || '').includes('multipart/form-data')) {
      const form = await request.formData(); const file = form.get('file'); const app = await loadApplication(database, cleanHrUuid(form.get('application_id')))
      const type = cleanHrEnum(form.get('document_type'), values(documentTypes)) as DocumentType | null
      if (!app || isClosedStage(app.stage) || app.employee_id) return fail('Documents can be added only to open applications.')
      if (!type || !(file instanceof File)) return fail('Choose a document type and a file.')
      if (type !== 'cv' && type !== 'offer_letter' && app.decision !== 'hire') return fail('Only the CV is collected before the decision to hire.')
      if (type === 'offer_letter' && !await hasOffer(database, app.id, ['approved', 'sent', 'accepted'])) return fail('Upload the offer letter once the offer is approved.')
      if ((candidateHealthDocumentTypes as readonly string[]).includes(type) && !await hasOffer(database, app.id, ['sent', 'accepted'])) return fail('Health documents are collected only after a conditional offer, with consent.')
      const upload = await checkUpload(file, type === 'cv' ? cvMimeTypes : checkMimeTypes); if ('error' in upload) return fail(upload.error || 'That file is not accepted.')
      const path = `candidates/${app.id}/${crypto.randomUUID()}-${upload.safeName}`
      const { error: uploadError } = await database.storage.from(hrDocumentBucket).upload(path, file, { contentType: upload.mime, upsert: false }); if (uploadError) throw uploadError
      const { data, error } = await database.from('hr_documents').insert({ application_id: app.id, document_type: type, title: cleanHrText(form.get('title'), 200) || file.name.slice(0, 200), storage_path: path, mime_type: upload.mime, size_bytes: file.size, is_restricted: restrictedDocumentTypes.includes(type), status: 'uploaded', uploaded_by: user.id }).select('id,document_type,title,mime_type,size_bytes,is_restricted,status,created_at').single()
      if (error) { await database.storage.from(hrDocumentBucket).remove([path]); throw error }
      if (type === 'cv') await database.from('hr_applications').update({ cv_path: path }).eq('id', app.id)
      if (type === 'offer_letter') await database.from('hr_offers').update({ offer_letter_path: path }).eq('application_id', app.id).in('status', ['approved', 'sent', 'accepted'])
      await logHr(context, { action: 'upload', entityType: 'hr_document', entityId: data.id, description: `Uploaded ${type} for an application` })
      return NextResponse.json({ document: data }, { status: 201 })
    }
    const body = await readJson(request); const app = await loadApplication(database, cleanHrUuid(body?.application_id))
    if (!body || !app || isClosedStage(app.stage) || app.employee_id) return fail('Credentials can be added only to open applications.')
    if (app.decision !== 'hire') return fail('Credential checks start after the decision to hire.')
    const type = cleanHrEnum(body.credential_type, values(credentialTypes)); if (!type) return fail('Choose the credential type.')
    // NIN: keep the minimum — the last four digits and the verified flag.
    const minimise = (value: string | null) => value && type === 'NIN' ? value.replace(/\D/g, '').slice(-4) || null : value
    const { data, error } = await database.from('hr_credentials').insert({
      application_id: app.id, credential_type: type, issuing_body: cleanHrOptionalText(body.issuing_body, 160), registration_number: minimise(cleanHrOptionalText(body.registration_number, 80)), licence_number: minimise(cleanHrOptionalText(body.licence_number, 80)),
      issued_on: cleanHrDate(body.issued_on), expires_on: cleanHrDate(body.expires_on), cpd_points_required: cleanHrNumber(body.cpd_points_required, 0, 1000), notes: cleanHrText(body.notes, 2000), status: 'pending_verification',
    }).select('*').single()
    if (error) throw error
    await logHr(context, { action: 'create', entityType: 'hr_credential', entityId: data.id, description: `Added ${type} check for an application` })
    return NextResponse.json({ credential: data }, { status: 201 })
  } catch (error) { return serverError(error, 'adding candidate check', 'Failed to save the check.') }
}

export async function PATCH(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database, user } = context
  if (!admin) return fail('Admin access required', 403)
  const body = await readJson(request); if (!body) return fail('Invalid request.')
  try {
    const credentialId = cleanHrUuid(body.credential_id); const documentId = cleanHrUuid(body.document_id); const method = cleanHrText(body.verification_method, 300); const now = new Date().toISOString()
    if (credentialId) {
      const { data: credential } = await database.from('hr_credentials').select('id,application_id,employee_id,credential_type,expires_on').eq('id', credentialId).maybeSingle()
      if (!credential?.application_id || credential.employee_id) return fail('Only application checks are edited here; hired staff credentials are on the People tab.', 404)
      const verify = body.action === 'verify'
      if (body.action !== 'verify' && body.action !== 'fail') return fail('Unknown action.')
      if (!method) return fail(verify ? 'Record how it was verified (register, portal, original sighted).' : 'Record what failed.')
      if (verify && credential.expires_on && credential.expires_on < lagosDate()) return fail('This credential has expired; it cannot be verified current.')
      const { error } = await database.from('hr_credentials').update({ status: verify ? 'current' : 'failed', verification_method: method, verified_by: user.id, verified_at: now }).eq('id', credentialId); if (error) throw error
      await recordEvent(database, { application_id: credential.application_id, note: `${credential.credential_type} check ${verify ? 'verified' : 'failed'}: ${method}`, changed_by: user.id })
      await logHr(context, { action: verify ? 'verify' : 'fail_verification', entityType: 'hr_credential', entityId: credentialId, description: `${verify ? 'Verified' : 'Failed'} ${credential.credential_type} for an application` })
      return NextResponse.json({ success: true })
    }
    if (documentId) {
      const { data: document } = await database.from('hr_documents').select('id,application_id,employee_id,title').eq('id', documentId).maybeSingle()
      if (!document?.application_id || document.employee_id) return fail('Document not found.', 404)
      if (!method) return fail('Record how the original was checked.')
      const { error } = await database.from('hr_documents').update({ original_seen_at: now, original_seen_by: user.id, verified_at: now, verified_by: user.id, verification_method: method, status: 'verified' }).eq('id', documentId); if (error) throw error
      await logHr(context, { action: 'verify', entityType: 'hr_document', entityId: documentId, description: `Verified ${document.title}` })
      return NextResponse.json({ success: true })
    }
    return fail('Choose a credential or document.')
  } catch (error) { return serverError(error, 'verifying candidate check', 'Failed to update the check.') }
}

export async function DELETE(request: NextRequest) {
  const resolved = await recruitingContext(request); if ('response' in resolved) return resolved.response
  const { context, admin } = resolved; const { database } = context
  if (!admin) return fail('Admin access required', 403)
  const params = new URL(request.url).searchParams; const documentId = cleanHrUuid(params.get('document')); const credentialId = cleanHrUuid(params.get('credential'))
  try {
    if (documentId) {
      const { data: document } = await database.from('hr_documents').select('id,application_id,employee_id,storage_path,document_type').eq('id', documentId).maybeSingle()
      if (!document?.application_id || document.employee_id) return fail('Document not found.', 404)
      await database.storage.from(hrDocumentBucket).remove([document.storage_path])
      const { error } = await database.from('hr_documents').delete().eq('id', documentId); if (error) throw error
      if (document.document_type === 'cv') await database.from('hr_applications').update({ cv_path: null }).eq('id', document.application_id).eq('cv_path', document.storage_path)
      await logHr(context, { action: 'delete', entityType: 'hr_document', entityId: documentId, description: `Deleted a candidate ${document.document_type} document` })
      return NextResponse.json({ success: true })
    }
    if (credentialId) {
      const { data, error } = await database.from('hr_credentials').delete().eq('id', credentialId).is('employee_id', null).not('application_id', 'is', null).select('id'); if (error) throw error
      if (!data?.length) return fail('Credential not found.', 404)
      await logHr(context, { action: 'delete', entityType: 'hr_credential', entityId: credentialId, description: 'Deleted a candidate credential check' })
      return NextResponse.json({ success: true })
    }
    return fail('Choose a document or credential.')
  } catch (error) { return serverError(error, 'deleting candidate check', 'Failed to delete.') }
}
