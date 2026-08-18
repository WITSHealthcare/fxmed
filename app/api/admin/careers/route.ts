import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedAdminRole, getRequestAdminUser } from '@/lib/admin-api-auth'
import {
  careerDepartments,
  careerEmploymentTypes,
  careerEnum,
  careerStatuses,
  cleanCareerList,
  cleanCareerText,
  getCareersDatabase,
} from '@/lib/careers'

async function authorized(request: NextRequest) {
  return Boolean(await getAuthorizedAdminRole(request, 'careers'))
}

function buildPayload(body: Record<string, unknown>) {
  const title = cleanCareerText(body.title, 160)
  const location = cleanCareerText(body.location, 160)
  const summary = cleanCareerText(body.summary, 600)
  if (!title || !location || !summary) return null

  return {
    title,
    location,
    summary,
    department: careerEnum(body.department, careerDepartments, 'Clinical'),
    employment_type: careerEnum(body.employment_type, careerEmploymentTypes, 'Full-time'),
    responsibilities: cleanCareerList(body.responsibilities),
    requirements: cleanCareerList(body.requirements),
    apply_email: cleanCareerText(body.apply_email, 254),
    status: careerEnum(body.status, careerStatuses, 'draft'),
    sort_order: Number.isFinite(Number(body.sort_order)) ? Math.trunc(Number(body.sort_order)) : 0,
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!await authorized(request)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    const database = getCareersDatabase()
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const { data, error } = await database
      .from('career_openings')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ openings: data || [] })
  } catch (error) {
    console.error('Error loading career openings:', error)
    return NextResponse.json({ error: 'Failed to load career openings.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await authorized(request)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    const database = getCareersDatabase()
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body) return NextResponse.json({ error: 'A valid opening is required.' }, { status: 400 })
    const payload = buildPayload(body)
    if (!payload) return NextResponse.json({ error: 'Title, location and summary are required.' }, { status: 400 })

    const user = await getRequestAdminUser(request)
    const { data, error } = await database
      .from('career_openings')
      .insert({ ...payload, created_by: user?.id || null })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ opening: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating career opening:', error)
    return NextResponse.json({ error: 'Failed to create the opening.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!await authorized(request)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    const database = getCareersDatabase()
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const body = await request.json().catch(() => null) as Record<string, unknown> | null
    if (!body || typeof body.id !== 'string') return NextResponse.json({ error: 'A valid opening is required.' }, { status: 400 })

    // A status-only change (publish, close, reopen) skips full field validation.
    if (Object.keys(body).length === 2 && 'status' in body) {
      const { data, error } = await database
        .from('career_openings')
        .update({ status: careerEnum(body.status, careerStatuses, 'draft') })
        .eq('id', body.id)
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json({ opening: data })
    }

    const payload = buildPayload(body)
    if (!payload) return NextResponse.json({ error: 'Title, location and summary are required.' }, { status: 400 })
    const { data, error } = await database.from('career_openings').update(payload).eq('id', body.id).select('*').single()
    if (error) throw error
    return NextResponse.json({ opening: data })
  } catch (error) {
    console.error('Error updating career opening:', error)
    return NextResponse.json({ error: 'Failed to update the opening.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!await authorized(request)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    const database = getCareersDatabase()
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'A valid opening is required.' }, { status: 400 })
    const { error } = await database.from('career_openings').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting career opening:', error)
    return NextResponse.json({ error: 'Failed to delete the opening.' }, { status: 500 })
  }
}
