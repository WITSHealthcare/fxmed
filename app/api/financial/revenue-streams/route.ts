import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
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
    const body = await request.json()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('financial_revenue_streams')
      .upsert({
        id: body.id,
        name: body.name,
        target: body.target ?? 0,
        secured: body.secured ?? 0,
        source_type: body.source_type || 'manual',
        hidden: body.hidden ?? false,
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
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Revenue stream ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('financial_revenue_streams')
      .update({
        ...updates,
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
