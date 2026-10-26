import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isReadable, type ReportAttachment } from '@/lib/ai/clinical-report'
import { cleanText, emrErrorMessage, getEmrContext, isUuid, writeEmrAudit } from '@/lib/emr'
import { extractInvestigationResults } from '@/lib/investigationExtraction'
import { resultRowsForOrder } from '@/lib/investigationResultCatalog'
import {
  ORDER_COLUMNS, REPORT_COLUMNS, mapLabReportFile, mapOrderRow, mapReportRow,
  normalizePatientSnapshot, normalizeReportMeta, normalizeResults,
} from '@/lib/investigations'

export const runtime = 'nodejs'

// Investigation orders, their results and the lab reports uploaded for them.
// An order is a row in investigation_forms; see lib/investigations.ts.

const LAB_REPORT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_BYTES = 15 * 1024 * 1024
// The most sent to an AI provider in one request, across all files read.
const MAX_READ_BYTES = 15 * 1024 * 1024
const MAX_PDF_BASE64_CHARS = 30 * 1024 * 1024
const FILE_COLUMNS = 'id,investigation_form_id,title,original_name,mime_type,file_size,created_at'

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function serverError(error: unknown) {
  console.error('EMR investigations error:', error)
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
  if (code === '42703') return fail('The investigation tracking migration (035) has not been applied yet.', 500)
  if (code === '23505') return fail('Results have already been saved for this order. Edit them instead.', 409)
  return fail(emrErrorMessage(error), 500)
}

async function patientExists(database: SupabaseClient, patientId: unknown) {
  if (!isUuid(patientId)) return false
  const { data } = await database.from('emr_patients').select('id').eq('id', patientId).maybeSingle()
  return Boolean(data)
}

async function findOrder(database: SupabaseClient, orderId: unknown) {
  if (!isUuid(orderId)) return null
  const { data, error } = await database.from('investigation_forms').select(ORDER_COLUMNS).eq('id', orderId).maybeSingle()
  if (error) throw error
  return data
}

function pdfFromBody(body: Record<string, any>) {
  const documentBase64 = typeof body.documentBase64 === 'string' ? body.documentBase64 : ''
  if (!documentBase64) return { error: 'The generated PDF is missing. Try again.' }
  if (documentBase64.length > MAX_PDF_BASE64_CHARS) return { error: 'The generated PDF is too large to save.' }
  return {
    documentBase64,
    downloadName: cleanText(body.downloadName, 240) || 'fxmed-investigation.pdf',
    size: Number.isFinite(Number(body.size)) ? Number(body.size) : 0,
  }
}

export async function GET(request: NextRequest) {
  const context = await getEmrContext(request, 'view_clinical_records')
  if (!context) return fail('Clinical access required.', 403)
  const { database, user } = context
  const params = new URL(request.url).searchParams

  try {
    const download = params.get('download')
    if (download) {
      const id = params.get('id')
      if (!isUuid(id) || (download !== 'order' && download !== 'report')) return fail('A valid document is required.')
      const table = download === 'order' ? 'investigation_forms' : 'investigation_results'
      const { data, error } = await database.from(table).select('id,download_name,document_base64,emr_patient_id').eq('id', id).maybeSingle()
      if (error) throw error
      if (!data) return fail('Document not found.', 404)
      await writeEmrAudit(database, user, { action: `download_investigation_${download}`, entityType: table, entityId: id, patientId: data.emr_patient_id })
      return NextResponse.json({ documentBase64: data.document_base64, downloadName: data.download_name })
    }

    // Every order still waiting for results, longest-waiting first, with
    // anything already received for it.
    if (params.get('view') === 'awaiting') {
      const { data, error } = await database.from('investigation_forms')
        .select(`${ORDER_COLUMNS},emr_patient:emr_patients(mrn),reports:investigation_results(${REPORT_COLUMNS}),files:emr_documents(${FILE_COLUMNS})`)
        .eq('status', 'awaiting_results')
        .order('created_at', { ascending: true })
        .limit(500)
      if (error) throw error
      const rows = data || []
      // One report per order may come back as an object rather than a list.
      const asList = (value: unknown) => Array.isArray(value) ? value : value ? [value] : []
      return NextResponse.json({
        orders: rows.map(mapOrderRow),
        reports: rows.flatMap((row: any) => asList(row.reports).map(mapReportRow)),
        files: rows.flatMap((row: any) => asList(row.files).map(mapLabReportFile)),
      })
    }

    if (params.get('view') === 'recent') {
      const { data, error } = await database.from('investigation_forms')
        .select(`${ORDER_COLUMNS},emr_patient:emr_patients(mrn)`)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return NextResponse.json({ orders: (data || []).map(mapOrderRow) })
    }

    return fail('Unknown investigation view.')
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(request: NextRequest) {
  if ((request.headers.get('content-type') || '').includes('multipart/form-data')) return uploadLabReport(request)
  const body = await request.json().catch(() => null) as Record<string, any> | null
  if (!body) return fail('A request body is required.')
  if (body.action === 'order') return placeOrder(request, body)
  if (body.action === 'results') return saveResults(request, body, null)
  if (body.action === 'read') return readLabReport(request, body)
  return fail('Unknown investigation action.')
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, any> | null
  if (!body || !isUuid(body.id)) return fail('A valid investigation record is required.')
  if (body.action === 'results') return saveResults(request, body, body.id)
  if (body.action === 'status') return setOrderStatus(request, body)
  return fail('Unknown investigation action.')
}

export async function DELETE(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const kind = params.get('kind')
  const id = params.get('id')
  if (!isUuid(id) || (kind !== 'order' && kind !== 'report')) return fail('A valid investigation record is required.')
  const context = await getEmrContext(request, kind === 'order' ? 'order_investigations' : 'record_results')
  if (!context) return fail('Clinical access required.', 403)
  const { database, user } = context

  try {
    if (kind === 'order') {
      // Results and lab files stay on the patient record, no longer linked.
      const { data, error } = await database.from('investigation_forms').delete().eq('id', id).select('id,emr_patient_id,panel_title').maybeSingle()
      if (error) throw error
      if (!data) return fail('Order not found.', 404)
      await writeEmrAudit(database, user, { action: 'delete_investigation_order', entityType: 'investigation_forms', entityId: id, patientId: data.emr_patient_id, metadata: { panelTitle: data.panel_title } })
      return NextResponse.json({ success: true })
    }

    const { data, error } = await database.from('investigation_results').delete().eq('id', id).select('id,emr_patient_id,investigation_form_id').maybeSingle()
    if (error) throw error
    if (!data) return fail('Results report not found.', 404)
    // Without its results, the order is waiting for them again.
    if (data.investigation_form_id) {
      const { error: reopenError } = await database.from('investigation_forms')
        .update({ status: 'awaiting_results', completed_at: null })
        .eq('id', data.investigation_form_id)
        .eq('status', 'completed')
      if (reopenError) throw reopenError
    }
    await writeEmrAudit(database, user, { action: 'delete_investigation_results', entityType: 'investigation_results', entityId: id, patientId: data.emr_patient_id })
    return NextResponse.json({ success: true })
  } catch (error) {
    return serverError(error)
  }
}

async function placeOrder(request: NextRequest, body: Record<string, any>) {
  const context = await getEmrContext(request, 'order_investigations')
  if (!context) return fail('Investigation ordering access required.', 403)
  const { database, user } = context

  try {
    const patientId = body.patientId
    if (!await patientExists(database, patientId)) return fail('Choose the patient this order is for.')
    const tests = Array.from(new Set((Array.isArray(body.tests) ? body.tests : [])
      .map((test: unknown) => cleanText(typeof test === 'string' ? test : (test as { name?: unknown })?.name, 240))
      .filter(Boolean) as string[]))
    if (!tests.length) return fail('Add at least one test to the order.')
    const pdf = pdfFromBody(body)
    if ('error' in pdf) return fail(pdf.error as string)
    const snapshot = normalizePatientSnapshot(body.patient)

    const { data, error } = await database.from('investigation_forms').insert({
      original_name: snapshot.fullName || 'Investigation Request Form',
      download_name: pdf.downloadName,
      file_size: pdf.size,
      document_base64: pdf.documentBase64,
      patient: { ...snapshot, emrPatientId: patientId, clinicalDetails: cleanText(body.clinicalDetails, 8000) || '', requestingClinician: cleanText(body.requestingClinician, 240) || '' },
      panel_title: cleanText(body.panelTitle, 240) || 'Investigation request',
      // Stored in the shape the request form has always used.
      tests: tests.map(name => ({ name, description: '' })),
      emr_patient_id: patientId,
      status: 'awaiting_results',
      created_by: user.id,
      created_by_email: user.email,
    }).select(ORDER_COLUMNS).single()
    if (error) throw error

    await writeEmrAudit(database, user, { action: 'create_investigation_order', entityType: 'investigation_forms', entityId: data.id, patientId, metadata: { tests: tests.length } })
    return NextResponse.json({ order: mapOrderRow(data) }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}

// Creates the results report for an order (or for results that arrived
// without one), or replaces an existing report when reportId is given.
async function saveResults(request: NextRequest, body: Record<string, any>, reportId: string | null) {
  const context = await getEmrContext(request, 'record_results')
  if (!context) return fail('Result recording access required.', 403)
  const { database, user } = context

  try {
    const patientId = body.patientId
    if (!await patientExists(database, patientId)) return fail('Choose the patient these results belong to.')
    const results = normalizeResults(body.results)
    if (!results.length) return fail('Enter at least one result.')
    const pdf = pdfFromBody(body)
    if ('error' in pdf) return fail(pdf.error as string)

    let orderId: string | null = null
    if (reportId) {
      const { data: existing, error } = await database.from('investigation_results').select('id,emr_patient_id,investigation_form_id').eq('id', reportId).maybeSingle()
      if (error) throw error
      if (!existing) return fail('Results report not found.', 404)
      if (existing.emr_patient_id && existing.emr_patient_id !== patientId) return fail('These results belong to a different patient.')
      orderId = existing.investigation_form_id
    } else if (body.orderId) {
      const order = await findOrder(database, body.orderId)
      if (!order) return fail('Order not found.', 404)
      if (order.emr_patient_id !== patientId) return fail('This order belongs to a different patient.')
      orderId = order.id
    }

    const snapshot = normalizePatientSnapshot(body.patient)
    const record = {
      download_name: pdf.downloadName,
      file_size: pdf.size,
      document_base64: pdf.documentBase64,
      patient: { ...snapshot, emrPatientId: patientId },
      report_meta: normalizeReportMeta(body.reportMeta),
      results,
      emr_patient_id: patientId,
      investigation_form_id: orderId,
    }
    const { data, error } = reportId
      ? await database.from('investigation_results').update(record).eq('id', reportId).select(REPORT_COLUMNS).single()
      : await database.from('investigation_results').insert({ ...record, original_name: `${snapshot.fullName || 'Patient'} — Investigation Results`, created_by: user.id, created_by_email: user.email }).select(REPORT_COLUMNS).single()
    if (error) throw error

    // The order closes unless the clinician says more results are to come.
    if (orderId) {
      const complete = body.completeOrder !== false
      const { error: orderError } = await database.from('investigation_forms')
        .update({ status: complete ? 'completed' : 'awaiting_results', completed_at: complete ? new Date().toISOString() : null })
        .eq('id', orderId)
      if (orderError) throw orderError
    }

    await writeEmrAudit(database, user, { action: reportId ? 'update_investigation_results' : 'create_investigation_results', entityType: 'investigation_results', entityId: data.id, patientId, metadata: { orderId, results: results.length } })
    return NextResponse.json({ report: mapReportRow(data) }, { status: reportId ? 200 : 201 })
  } catch (error) {
    return serverError(error)
  }
}

async function setOrderStatus(request: NextRequest, body: Record<string, any>) {
  const context = await getEmrContext(request, 'order_investigations')
  if (!context) return fail('Investigation ordering access required.', 403)
  const { database, user } = context
  if (body.status !== 'cancelled' && body.status !== 'awaiting_results') return fail('An order can be cancelled or reopened.')

  try {
    const { data, error } = await database.from('investigation_forms')
      .update({ status: body.status, completed_at: null })
      .eq('id', body.id)
      .select(ORDER_COLUMNS)
      .maybeSingle()
    if (error) throw error
    if (!data) return fail('Order not found.', 404)
    await writeEmrAudit(database, user, { action: body.status === 'cancelled' ? 'cancel_investigation_order' : 'reopen_investigation_order', entityType: 'investigation_forms', entityId: data.id, patientId: data.emr_patient_id })
    return NextResponse.json({ order: mapOrderRow(data) })
  } catch (error) {
    return serverError(error)
  }
}

// One file per request, so a several-page upload stays within request limits.
async function uploadLabReport(request: NextRequest) {
  const context = await getEmrContext(request, 'upload_documents')
  if (!context) return fail('Document upload access required.', 403)
  const { database, user } = context

  try {
    const form = await request.formData()
    const file = form.get('file')
    const patientId = form.get('patient_id')
    const orderId = form.get('order_id') || null
    if (!(file instanceof File) || !file.size) return fail('Choose the lab report to upload.')
    if (!await patientExists(database, patientId)) return fail('A valid patient is required.')
    if (!LAB_REPORT_TYPES.includes(file.type)) return fail('Upload the lab report as a PDF or a photo (JPG, PNG or WEBP).')
    if (file.size > MAX_FILE_BYTES) return fail('Lab reports must be smaller than 15 MB.')
    let order: Record<string, any> | null = null
    if (orderId) {
      order = await findOrder(database, orderId)
      if (!order) return fail('Order not found.', 404)
      if (order.emr_patient_id !== patientId) return fail('This order belongs to a different patient.')
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${patientId}/${crypto.randomUUID()}-${safeName}`
    const { error: uploadError } = await database.storage.from('emr-documents').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError
    const { data, error } = await database.from('emr_documents').insert({
      patient_id: patientId,
      category: 'laboratory',
      title: order ? `Lab report — ${order.panel_title || 'investigation order'}` : `Lab report — ${file.name}`,
      storage_path: path,
      original_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: user.id,
      investigation_form_id: order?.id || null,
    }).select(FILE_COLUMNS).single()
    if (error) {
      await database.storage.from('emr-documents').remove([path])
      throw error
    }

    await writeEmrAudit(database, user, { action: 'upload_lab_report', entityType: 'emr_document', entityId: data.id, patientId: String(patientId), metadata: { orderId: order?.id || null, mimeType: file.type, size: file.size } })
    return NextResponse.json({ file: mapLabReportFile(data) }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}

// Reads the results from uploaded lab reports with AI, for the clinician to
// check before they are saved. Nothing is stored here.
async function readLabReport(request: NextRequest, body: Record<string, any>) {
  const context = await getEmrContext(request, 'record_results')
  if (!context) return fail('Result recording access required.', 403)
  const { database, user } = context

  try {
    const patientId = body.patientId
    if (!await patientExists(database, patientId)) return fail('A valid patient is required.')
    const documentIds = (Array.isArray(body.documentIds) ? body.documentIds : []).filter(isUuid).slice(0, 10)
    if (!documentIds.length) return fail('Upload the lab report first.')
    let orderedTests: string[] = []
    if (body.orderId) {
      const order = await findOrder(database, body.orderId)
      if (!order || order.emr_patient_id !== patientId) return fail('Order not found.', 404)
      orderedTests = mapOrderRow(order).tests
    }

    const { data: documents, error } = await database.from('emr_documents').select('id,title,storage_path,mime_type,file_size').in('id', documentIds).eq('patient_id', patientId)
    if (error) throw error
    const files: ReportAttachment[] = []
    let total = 0
    for (const doc of documents || []) {
      if (!isReadable(doc.mime_type)) continue
      total += Number(doc.file_size) || 0
      if (total > MAX_READ_BYTES) return fail('These files are too large to read together. Upload fewer pages, or enter the results by hand.')
      const { data: blob, error: downloadError } = await database.storage.from('emr-documents').download(doc.storage_path)
      if (downloadError || !blob) throw downloadError || new Error('The lab report could not be opened.')
      files.push({ name: doc.title, mimeType: doc.mime_type, base64: Buffer.from(await blob.arrayBuffer()).toString('base64') })
    }
    if (!files.length) return fail('The lab report could not be opened for reading.')

    const expected = resultRowsForOrder(orderedTests).map(row => ({ test: row.test, section: row.section }))
    let extracted
    try {
      extracted = await extractInvestigationResults(files, orderedTests, expected)
    } catch (readError) {
      console.error('Lab report could not be read:', readError)
      const message = readError instanceof Error && readError.message === 'No AI provider is configured.'
        ? 'Reading lab reports needs an AI provider to be configured. Enter the results by hand.'
        : 'The results could not be read from this report. Enter them by hand, using the lab report.'
      return fail(message, 502)
    }

    await writeEmrAudit(database, user, { action: 'read_lab_report', entityType: 'emr_document', entityId: documentIds[0], patientId, metadata: { orderId: body.orderId || null, files: files.length, results: extracted.results.length, provider: extracted.provider } })
    return NextResponse.json(extracted)
  } catch (error) {
    return serverError(error)
  }
}
