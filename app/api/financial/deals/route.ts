import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const dealStatuses = new Set(['cold', 'warm', 'hot', 'won'])

function validateDealPayload(body: any, requireCoreFields = false) {
  const company = typeof body.company === 'string' ? body.company.trim() : body.company
  const type = typeof body.type === 'string' ? body.type.trim() : body.type
  const notes = typeof body.notes === 'string' ? body.notes.trim() : body.notes
  const value = Number(body.value ?? 0)

  if (requireCoreFields && (!company || !type)) {
    return { error: 'Company and type are required' }
  }

  if (body.company !== undefined && (!company || typeof company !== 'string')) {
    return { error: 'Company must be a non-empty string' }
  }

  if (body.type !== undefined && (!type || typeof type !== 'string')) {
    return { error: 'Type must be a non-empty string' }
  }

  if (body.value !== undefined && (!Number.isFinite(value) || value < 0)) {
    return { error: 'Deal value must be a non-negative number' }
  }

  if (body.status !== undefined && !dealStatuses.has(body.status)) {
    return { error: 'Invalid deal status' }
  }

  return { company, type, notes: notes || '', value }
}

function getAllowedDealUpdates(body: any) {
  const updates: Record<string, any> = {}
  const allowedFields = ['company', 'type', 'value', 'status', 'notes']

  allowedFields.forEach((field) => {
    if (body[field] === undefined) return
    if (field === 'company' || field === 'type' || field === 'notes') {
      updates[field] = body[field].trim()
      return
    }
    updates[field] = field === 'value' ? Number(body[field]) : body[field]
  })

  return updates
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('financial_deals')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ deals: data || [] })
  } catch (error: any) {
    console.error('Error fetching financial deals:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch financial deals' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = validateDealPayload(body, true)
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('financial_deals')
      .insert([{
        id: body.id || `deal-${Date.now()}`,
        company: validation.company,
        type: validation.type,
        value: validation.value,
        status: body.status || 'cold',
        notes: validation.notes,
        created_at: now,
        updated_at: now,
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ deal: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating financial deal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create financial deal' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Deal ID required' }, { status: 400 })
    }

    const validation = validateDealPayload(body)
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const updates = getAllowedDealUpdates(body)
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid deal fields provided' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('financial_deals')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ deal: data })
  } catch (error: any) {
    console.error('Error updating financial deal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update financial deal' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Deal ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('financial_deals')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting financial deal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete financial deal' },
      { status: 500 }
    )
  }
}
