import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthorizedCrmRole } from '@/lib/admin-api-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function getStreamInput(body: Record<string, unknown>, partial = false) {
  const input: Record<string, unknown> = {}
  if (body.name !== undefined) input.name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : ''
  for (const field of ['target', 'secured'] as const) {
    if (body[field] !== undefined) {
      const value = Number(body[field])
      if (!Number.isFinite(value) || value < 0) return { error: `${field} must be a non-negative number` }
      input[field] = value
    }
  }
  if (body.source_type !== undefined) input.source_type = typeof body.source_type === 'string' ? body.source_type.trim().slice(0, 80) : ''
  if (body.hidden !== undefined) {
    if (typeof body.hidden !== 'boolean') return { error: 'hidden must be a boolean' }
    input.hidden = body.hidden
  }
  if (!partial && (!body.id || !input.name)) return { error: 'Revenue stream ID and name are required' }
  return { input }
}

export async function GET(request: NextRequest) {
  try {
    if (!await getAuthorizedCrmRole(request, 'financial')) return NextResponse.json({ error: 'Financial CRM access required' }, { status: 403 })
    const { data, error } = await supabase
      .from('financial_revenue_streams')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ streams: data || [] })
  } catch (error: any) {
    console.error('Error fetching revenue streams:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch revenue streams' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await getAuthorizedCrmRole(request, 'financial')) return NextResponse.json({ error: 'Financial CRM access required' }, { status: 403 })
    const body = await request.json()
    const now = new Date().toISOString()
    const parsed = getStreamInput(body)
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { data, error } = await supabase
      .from('financial_revenue_streams')
      .upsert({
        id: body.id,
        name: parsed.input!.name,
        target: parsed.input!.target ?? 0,
        secured: parsed.input!.secured ?? 0,
        source_type: parsed.input!.source_type || 'manual',
        hidden: parsed.input!.hidden ?? false,
        updated_at: now,
      }, { onConflict: 'id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ stream: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error saving revenue stream:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save revenue stream' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!await getAuthorizedCrmRole(request, 'financial')) return NextResponse.json({ error: 'Financial CRM access required' }, { status: 403 })
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Revenue stream ID required' }, { status: 400 })
    }

    const parsed = getStreamInput(body, true)
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })
    if (!parsed.input || Object.keys(parsed.input).length === 0) return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })

    const { data, error } = await supabase
      .from('financial_revenue_streams')
      .update({
        ...parsed.input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ stream: data })
  } catch (error: any) {
    console.error('Error updating revenue stream:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update revenue stream' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!await getAuthorizedCrmRole(request, 'financial')) return NextResponse.json({ error: 'Financial CRM access required' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Revenue stream ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('financial_revenue_streams')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting revenue stream:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete revenue stream' },
      { status: 500 }
    )
  }
}
