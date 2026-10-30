import { NextRequest, NextResponse } from 'next/server'
import { isReadable, type ReportAttachment } from '@/lib/ai/clinical-report'
import { cleanText, emrErrorMessage, getEmrContext, isUuid, writeEmrAudit } from '@/lib/emr'
import { extractLabResults, interpretLabResults } from '@/lib/fmAnalysisAi'
import { FM_PANELS, type FmEntry, type FmNarrative, type FmPatient, type PanelId, type Sex } from '@/lib/fmBiomarkers'

export const runtime = 'nodejs'
export const maxDuration = 120

// Functional medicine lab analyses: saved analyses, reading results from an
// uploaded lab report, and the AI interpretation. See lib/fmBiomarkers.ts.

const MAX_READ_BYTES = 15 * 1024 * 1024
const LIST_COLUMNS = 'id,emr_patient_id,patient,status,created_at,updated_at,entries'
const PANEL_IDS = new Set<string>(FM_PANELS.map(panel => panel.id))

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function serverError(error: unknown) {
  console.error('FM analysis error:', error)
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
  if (code === '42P01' || code === 'PGRST205') return fail('The FM lab analysis migration (037) has not been applied yet.', 500)
  return fail(emrErrorMessage(error), 500)
}

const str = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : ''
const sex = (value: unknown): Sex => value === 'female' || value === 'male' ? value : ''

function cleanPatient(value: any): FmPatient {
  return {
    name: str(value?.name, 120), age: str(value?.age, 10), sex: sex(value?.sex),
    collectedAt: str(value?.collectedAt, 40), labRef: str(value?.labRef, 60),
    facility: str(value?.facility, 120), clinician: str(value?.clinician, 120),
  }
}

function cleanEntries(value: unknown): FmEntry[] {
  return (Array.isArray(value) ? value : []).slice(0, 250).map((row: any) => ({
    markerId: typeof row?.markerId === 'string' ? row.markerId.slice(0, 60) : null,
    name: str(row?.name, 120),
    panel: (PANEL_IDS.has(row?.panel) ? row.panel : 'other') as PanelId,
    value: str(row?.value, 40),
    unit: str(row?.unit, 40),
    labRange: str(row?.labRange, 60),
    fmRange: str(row?.fmRange, 60),
    note: str(row?.note, 300),
  })).filter(row => row.name.trim())
}

// The narrative is shown back as text only, so it is size-limited JSON.
function cleanNarrative(value: unknown): FmNarrative | null {
  if (!value || typeof value !== 'object') return null
  const json = JSON.stringify(value)
  return json.length > 200_000 ? null : JSON.parse(json)
}

export async function GET(request: NextRequest) {
  const context = await getEmrContext(request, 'view_clinical_records')
  if (!context) return fail('Clinical access required.', 403)
  const { database } = context
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (id) {
      if (!isUuid(id)) return fail('Analysis not found.', 404)
      const { data, error } = await database.from('fm_lab_analyses').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      if (!data) return fail('Analysis not found.', 404)
      return NextResponse.json({ analysis: data })
    }
    const { data, error } = await database.from('fm_lab_analyses').select(LIST_COLUMNS).order('updated_at', { ascending: false }).limit(200)
    if (error) throw error
    const analyses = (data || []).map(({ entries, ...row }: any) => ({ ...row, markerCount: Array.isArray(entries) ? entries.filter((entry: any) => entry?.value).length : 0 }))
    return NextResponse.json({ analyses })
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(request: NextRequest) {
  if ((request.headers.get('content-type') || '').includes('multipart/form-data')) return readUpload(request)
  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return fail('Invalid request.')
  }
  if (body.action === 'extract') return readPasted(request, body)
  if (body.action === 'interpret') return interpret(request, body)
  return save(request, body)
}

export async function DELETE(request: NextRequest) {
  const context = await getEmrContext(request, 'record_results')
  if (!context) return fail('Result recording access required.', 403)
  const { database, user } = context
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!isUuid(id)) return fail('Analysis not found.', 404)
    const { data, error } = await database.from('fm_lab_analyses').delete().eq('id', id).select('id,emr_patient_id').maybeSingle()
    if (error) throw error
    if (!data) return fail('Analysis not found.', 404)
    await writeEmrAudit(database, user, { action: 'delete_fm_analysis', entityType: 'fm_lab_analysis', entityId: id, patientId: data.emr_patient_id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}

async function save(request: NextRequest, body: Record<string, any>) {
  const context = await getEmrContext(request, 'record_results')
  if (!context) return fail('Result recording access required.', 403)
  const { database, user } = context
  try {
    const patientId = isUuid(body.emrPatientId) ? body.emrPatientId : null
    if (patientId) {
      const { data } = await database.from('emr_patients').select('id').eq('id', patientId).maybeSingle()
      if (!data) return fail('The linked patient was not found.')
    }
    const row = {
      emr_patient_id: patientId,
      patient: cleanPatient(body.patient),
      entries: cleanEntries(body.entries),
      narrative: cleanNarrative(body.narrative),
      status: body.status === 'final' ? 'final' : 'draft',
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }
    if (!row.patient.name.trim()) return fail('Enter the patient\'s name.')
    const query = isUuid(body.id)
      ? database.from('fm_lab_analyses').update(row).eq('id', body.id)
      : database.from('fm_lab_analyses').insert({ ...row, created_by: user.id })
    const { data, error } = await query.select('*').single()
    if (error) throw error
    await writeEmrAudit(database, user, { action: isUuid(body.id) ? 'update_fm_analysis' : 'create_fm_analysis', entityType: 'fm_lab_analysis', entityId: data.id, patientId, metadata: { results: row.entries.length, status: row.status } })
    return NextResponse.json({ analysis: data })
  } catch (error) {
    return serverError(error)
  }
}

function readError(error: unknown) {
  console.error('Lab report could not be read:', error)
  return fail(error instanceof Error && error.message === 'No AI provider is configured.'
    ? 'Reading lab reports needs an AI provider to be configured. Enter the results by hand.'
    : 'The results could not be read from this report. Enter them by hand, using the lab report.', 502)
}

// Files are read and discarded: nothing uploaded here is stored.
async function readUpload(request: NextRequest) {
  const context = await getEmrContext(request, 'record_results')
  if (!context) return fail('Result recording access required.', 403)
  const { database, user } = context
  try {
    const form = await request.formData()
    const files: ReportAttachment[] = []
    let total = 0
    for (const file of form.getAll('files')) {
      if (!(file instanceof File) || !file.size) continue
      if (!isReadable(file.type)) return fail(`${file.name} is not a PDF or photo (JPG, PNG or WEBP).`)
      total += file.size
      if (total > MAX_READ_BYTES) return fail('These files are too large to read together (15 MB). Upload fewer pages.')
      files.push({ name: file.name, mimeType: file.type, base64: Buffer.from(await file.arrayBuffer()).toString('base64') })
    }
    if (!files.length) return fail('Choose the lab report to upload.')
    let extracted
    try {
      extracted = await extractLabResults(files, '', sex(form.get('sex')))
    } catch (error) {
      return readError(error)
    }
    await writeEmrAudit(database, user, { action: 'read_fm_lab_report', entityType: 'fm_lab_analysis', metadata: { files: files.length, results: extracted.entries.length, provider: extracted.provider } })
    return NextResponse.json(extracted)
  } catch (error) {
    return serverError(error)
  }
}

async function readPasted(request: NextRequest, body: Record<string, any>) {
  const context = await getEmrContext(request, 'record_results')
  if (!context) return fail('Result recording access required.', 403)
  const { database, user } = context
  const pasted = cleanText(body.text, 40000) || ''
  if (pasted.length < 10) return fail('Paste the lab results first.')
  try {
    const extracted = await extractLabResults([], pasted, sex(body.sex))
    await writeEmrAudit(database, user, { action: 'read_fm_lab_text', entityType: 'fm_lab_analysis', metadata: { results: extracted.entries.length, provider: extracted.provider } })
    return NextResponse.json(extracted)
  } catch (error) {
    return readError(error)
  }
}

async function interpret(request: NextRequest, body: Record<string, any>) {
  const context = await getEmrContext(request, 'record_results')
  if (!context) return fail('Result recording access required.', 403)
  const { database, user } = context
  const entries = cleanEntries(body.entries).filter(entry => entry.value.trim())
  if (!entries.length) return fail('Enter at least one result first.')
  try {
    const result = await interpretLabResults(cleanPatient(body.patient), entries, cleanText(body.context, 3000) || '')
    await writeEmrAudit(database, user, { action: 'interpret_fm_analysis', entityType: 'fm_lab_analysis', entityId: isUuid(body.id) ? body.id : null, metadata: { results: entries.length, provider: result.provider } })
    return NextResponse.json(result)
  } catch (error) {
    console.error('FM interpretation failed:', error)
    return fail(error instanceof Error && error.message === 'No AI provider is configured.'
      ? 'Writing the interpretation needs an AI provider to be configured. You can write it by hand.'
      : 'The interpretation could not be written. Try again, or write it by hand.', 502)
  }
}
