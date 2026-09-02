import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRequestAdminUser, getAuthorizedAdminRole } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type InvestigationPatient = {
  fullName: string
  email: string
  phone: string
  age: string
  gender: string
  clinicalDetails: string
  emrPatientId: string
}

type InvestigationTest = {
  name: string
  description: string
}

const emptyPatient: InvestigationPatient = {
  fullName: '',
  email: '',
  phone: '',
  age: '',
  gender: '',
  clinicalDetails: '',
  emrPatientId: '',
}

function cleanString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function parseJsonValue(value: unknown) {
  if (typeof value !== 'string') return value

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function normalizePatient(value: unknown): InvestigationPatient {
  value = parseJsonValue(value)
  const patient = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    fullName: cleanString(patient.fullName),
    email: cleanString(patient.email),
    phone: cleanString(patient.phone),
    age: cleanString(patient.age),
    gender: cleanString(patient.gender),
    clinicalDetails: cleanString(patient.clinicalDetails),
    emrPatientId: cleanString(patient.emrPatientId),
  }
}

function normalizeTests(value: unknown): InvestigationTest[] {
  value = parseJsonValue(value)
  if (!Array.isArray(value)) return []

  return value
    .map((test) => {
      const item = test && typeof test === 'object' ? test as Record<string, unknown> : {}
      return {
        name: cleanString(item.name),
        description: cleanString(item.description),
      }
    })
    .filter((test) => test.name)
}

async function getToolsAccess(request: NextRequest) {
  return await getAuthorizedAdminRole(request, 'tools') ? getRequestAdminUser(request) : null
}

function mapForm(row: any) {
  return {
    id: row.id,
    originalName: row.original_name,
    downloadName: row.download_name,
    size: row.file_size,
    uploadedAt: row.created_at,
    documentBase64: row.document_base64,
    patient: { ...emptyPatient, ...normalizePatient(row.patient) },
    clinicalDetails: normalizePatient(row.patient).clinicalDetails,
    panelTitle: cleanString(row.panel_title, 'Core Functional Medicine Panel'),
    tests: normalizeTests(row.tests),
    createdByEmail: row.created_by_email,
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getToolsAccess(request)
    if (!user) {
      return NextResponse.json({ error: 'Tools access required' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('investigation_forms')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ forms: (data || []).map(mapForm) })
  } catch (error: any) {
    console.error('Error fetching investigation forms:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch investigation forms' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getToolsAccess(request)
    if (!user) {
      return NextResponse.json({ error: 'Tools access required' }, { status: 403 })
    }

    const body = await request.json()
    const patient = normalizePatient(body.patient)
    const tests = normalizeTests(body.tests)
    const documentBase64 = cleanString(body.documentBase64)
    const downloadName = cleanString(body.downloadName, 'investigation-fxmed-request-form.pdf')
    const originalName = cleanString(body.originalName, patient.fullName || 'Investigation Request Form')
    const panelTitle = cleanString(body.panelTitle, 'Core Functional Medicine Panel')
    const size = Number.isFinite(Number(body.size)) ? Number(body.size) : 0

    if (!documentBase64) {
      return NextResponse.json({ error: 'Generated PDF document is required' }, { status: 400 })
    }
    if (tests.length === 0) {
      return NextResponse.json({ error: 'At least one investigation test is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('investigation_forms')
      .insert([{
        original_name: originalName,
        download_name: downloadName,
        file_size: size,
        document_base64: documentBase64,
        patient,
        panel_title: panelTitle,
        tests,
        created_by: user.id,
        created_by_email: user.email,
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ form: mapForm(data) }, { status: 201 })
  } catch (error: any) {
    console.error('Error saving investigation form:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save investigation form' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getToolsAccess(request)
    if (!user) {
      return NextResponse.json({ error: 'Tools access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Investigation form ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('investigation_forms')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting investigation form:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete investigation form' },
      { status: 500 }
    )
  }
}
