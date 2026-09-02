import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestAdminUser, getAuthorizedAdminRole } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const text = (value: unknown, fallback = '') => typeof value === 'string' && value.trim() ? value.trim() : fallback
const object = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

async function getToolsUser(request: NextRequest) {
  return await getAuthorizedAdminRole(request, 'tools') ? getRequestAdminUser(request) : null
}

function normalizePatient(value: unknown) {
  const item = object(value)
  return { fullName: text(item.fullName), email: text(item.email), phone: text(item.phone), age: text(item.age), gender: text(item.gender), emrPatientId: text(item.emrPatientId) }
}

function normalizeMeta(value: unknown) {
  const item = object(value)
  return { reportTitle: text(item.reportTitle, 'Laboratory Investigation Report'), specimen: text(item.specimen), collectedAt: text(item.collectedAt), reportedAt: text(item.reportedAt), clinician: text(item.clinician), notes: text(item.notes) }
}

function normalizeResults(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map(value => { const item = object(value); return { section: text(item.section), test: text(item.test), result: text(item.result), unit: text(item.unit), referenceRange: text(item.referenceRange), flag: text(item.flag), remark: text(item.remark) } }).filter(item => item.test && item.result)
}

function mapRow(row: any) {
  return { id: row.id, originalName: row.original_name, downloadName: row.download_name, size: row.file_size, uploadedAt: row.created_at, documentBase64: row.document_base64, patient: normalizePatient(row.patient), reportMeta: normalizeMeta(row.report_meta), results: normalizeResults(row.results), createdByEmail: row.created_by_email }
}

export async function GET(request: NextRequest) {
  try {
    if (!await getToolsUser(request)) return NextResponse.json({ error: 'Tools access required' }, { status: 403 })
    const { data, error } = await supabase.from('investigation_results').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ reports: (data || []).map(mapRow) })
  } catch (error: any) { return NextResponse.json({ error: error.message || 'Failed to fetch investigation results' }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getToolsUser(request)
    if (!user) return NextResponse.json({ error: 'Tools access required' }, { status: 403 })
    const body = await request.json()
    const patient = normalizePatient(body.patient), reportMeta = normalizeMeta(body.reportMeta), results = normalizeResults(body.results)
    const documentBase64 = text(body.documentBase64)
    if (!patient.fullName) return NextResponse.json({ error: 'Patient full name is required' }, { status: 400 })
    if (!documentBase64 || !results.length) return NextResponse.json({ error: 'A PDF and at least one result are required' }, { status: 400 })
    const { data, error } = await supabase.from('investigation_results').insert([{ original_name: text(body.originalName, `${patient.fullName} — Investigation Results`), download_name: text(body.downloadName, 'fxmed-investigation-results.pdf'), file_size: Number(body.size) || 0, document_base64: documentBase64, patient, report_meta: reportMeta, results, created_by: user.id, created_by_email: user.email }]).select().single()
    if (error) throw error
    return NextResponse.json({ report: mapRow(data) }, { status: 201 })
  } catch (error: any) { return NextResponse.json({ error: error.message || 'Failed to save investigation results' }, { status: 500 }) }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!await getToolsUser(request)) return NextResponse.json({ error: 'Tools access required' }, { status: 403 })
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Report ID required' }, { status: 400 })
    const { error } = await supabase.from('investigation_results').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) { return NextResponse.json({ error: error.message || 'Failed to delete investigation results' }, { status: 500 }) }
}
