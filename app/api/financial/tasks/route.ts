import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('financial_tasks')
      .select('*')
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ tasks: data || [] })
  } catch (error: any) {
    console.error('Error fetching financial tasks:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch financial tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('financial_tasks')
      .insert([{
        id: body.id || `task-${Date.now()}`,
        title: body.title,
        due_date: body.due_date,
        priority: body.priority || 'Medium',
        category: body.category || 'ops',
        done: body.done ?? false,
        created_at: now,
        updated_at: now,
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ task: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating financial task:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create financial task' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('financial_tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ task: data })
  } catch (error: any) {
    console.error('Error updating financial task:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update financial task' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('financial_tasks')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting financial task:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete financial task' },
      { status: 500 }
    )
  }
}
