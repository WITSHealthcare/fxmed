import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'
import { ambassadorStatuses, type AmbassadorStatus } from '@/lib/ambassador-applications'
import { writeRequestAdminActivity } from '@/lib/admin-activity'

function getDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key
    ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    : null
}

async function authorize(request: NextRequest) {
  return Boolean(await getAuthorizedAdminRole(request, 'ambassador'))
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!await authorize(request)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    const database = getDatabase()
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const { id } = await context.params
    const { data, error } = await database.from('ambassador_applications').select('*').eq('id', id).single()
    if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (error) throw error
    return NextResponse.json({ application: data })
  } catch (error) {
    console.error('Error fetching ambassador application:', error)
    return NextResponse.json({ error: 'Failed to fetch the application.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!await authorize(request)) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    const database = getDatabase()
    if (!database) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    const body = await request.json().catch(() => null) as { status?: AmbassadorStatus } | null
    if (!body?.status || !ambassadorStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'A valid status is required.' }, { status: 400 })
    }

    const { id } = await context.params
    const { data: current, error: currentError } = await database
      .from('ambassador_applications')
      .select('status')
      .eq('id', id)
      .single()
    if (currentError?.code === 'PGRST116') return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (currentError) throw currentError

    const allowedTransitions: Record<AmbassadorStatus, AmbassadorStatus[]> = {
      pending: ['under_review'],
      under_review: ['approved', 'rejected'],
      approved: ['under_review'],
      rejected: ['under_review'],
    }
    if (body.status !== current.status && !allowedTransitions[current.status as AmbassadorStatus].includes(body.status)) {
      return NextResponse.json({ error: `Cannot change status from ${current.status} to ${body.status}.` }, { status: 409 })
    }

    const { data, error } = await database
      .from('ambassador_applications')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    await writeRequestAdminActivity(database, request, {
      action: 'update_ambassador_application',
      module: 'Ambassador Program',
      description: `Changed ambassador application status to ${body.status.replace(/_/g, ' ')}`,
      entityType: 'ambassador_application',
      entityId: id,
      metadata: { previous_status: current.status, status: body.status },
    })
    return NextResponse.json({ application: data })
  } catch (error) {
    console.error('Error updating ambassador application:', error)
    return NextResponse.json({ error: 'Failed to update the application.' }, { status: 500 })
  }
}
