import { NextRequest, NextResponse } from 'next/server'
import { cleanText, isUuid, writeEmrAudit } from '@/lib/emr'
import { PORTAL_MAX_UPLOAD_BYTES, getRequestPatient, portalDocumentColumns, portalDocumentTypes, portalErrorMessage } from '@/lib/patient-portal'
import { checkRateLimit } from '@/lib/request-security'

// A short-lived link to a document the patient may see: one the clinic
// shared, or one they uploaded themselves.
export async function GET(request: NextRequest) {
  try {
    const context = await getRequestPatient(request)
    if (!context) return NextResponse.json({ error: 'Patient portal access required' }, { status: 403 })
    const { database, patientId, user } = context
    const id = request.nextUrl.searchParams.get('id')
    if (!isUuid(id)) return NextResponse.json({ error: 'A valid document is required.' }, { status: 400 })

    const { data: document, error } = await database.from('emr_documents')
      .select('id,patient_id,storage_path,shared_with_patient,source').eq('id', id).single()
    if (error || !document || document.patient_id !== patientId || !(document.shared_with_patient || document.source === 'patient')) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }
    const { data, error: signedError } = await database.storage.from('emr-documents').createSignedUrl(document.storage_path, 120)
    if (signedError) throw signedError
    await writeEmrAudit(database, user, { action: 'patient_downloaded_document', entityType: 'emr_document', entityId: id, patientId })
    return NextResponse.json({ url: data.signedUrl })
  } catch (error) {
    console.error('Error opening patient portal document:', error)
    return NextResponse.json({ error: portalErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestPatient(request)
    if (!context) return NextResponse.json({ error: 'Patient portal access required' }, { status: 403 })
    const limit = checkRateLimit(request, 'patient-portal-upload', 15, 60 * 60 * 1000)
    if (!limit.allowed) return NextResponse.json({ error: 'Too many uploads. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })

    const { database, patientId, user } = context
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })
    if (file.size > PORTAL_MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'Files must be smaller than 15 MB.' }, { status: 400 })
    if (!portalDocumentTypes.includes(file.type)) return NextResponse.json({ error: 'Upload a PDF, image (JPG, PNG, WebP) or Word document.' }, { status: 400 })

    const category = form.get('category') === 'laboratory' || form.get('category') === 'imaging' ? String(form.get('category')) : 'external_record'
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)
    const path = `${patientId}/portal/${crypto.randomUUID()}-${safeName}`
    const { error: uploadError } = await database.storage.from('emr-documents').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError

    const { data, error } = await database.from('emr_documents').insert({
      patient_id: patientId,
      category,
      title: cleanText(form.get('title'), 240) || file.name,
      storage_path: path,
      original_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      notes: cleanText(form.get('notes'), 2000),
      uploaded_by: user.id,
      source: 'patient',
      portal_status: 'new',
    }).select(portalDocumentColumns).single()
    if (error) { await database.storage.from('emr-documents').remove([path]); throw error }
    await writeEmrAudit(database, user, { action: 'patient_uploaded_document', entityType: 'emr_document', entityId: data.id, patientId, metadata: { mimeType: file.type, size: file.size } })
    return NextResponse.json({ document: data }, { status: 201 })
  } catch (error) {
    console.error('Error uploading patient portal document:', error)
    return NextResponse.json({ error: portalErrorMessage(error) }, { status: 500 })
  }
}
