import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const taskPriorities = new Set(['High', 'Medium', 'Low'])
const taskCategories = new Set(['corporate', 'government', 'elderly', 'hmo', 'premium', 'ops'])

function validateTaskPayload(body: any, requireCoreFields = false) {
  const title = typeof body.title === 'string' ? body.title.trim() : body.title

  if (requireCoreFields && (!title || !body.due_date)) {
    return { error: 'Task title and due date are required' }
  }

  if (body.title !== undefined && (!title || typeof title !== 'string')) {
    return { error: 'Task title must be a non-empty string' }
  }

  if (body.priority !== undefined && !taskPriorities.has(body.priority)) {
    return { error: 'Invalid task priority' }
  }

  if (body.category !== undefined && !taskCategories.has(body.category)) {
    return { error: 'Invalid task category' }
  }

  if (body.done !== undefined && typeof body.done !== 'boolean') {
    return { error: 'Task done must be a boolean' }
  }

  return { title }
}

function getAllowedTaskUpdates(body: any) {
  const updates: Record<string, any> = {}
  const allowedFields = ['title', 'due_date', 'priority', 'category', 'done']

  allowedFields.forEach((field) => {
    if (body[field] !== undefined) updates[field] = field === 'title' ? body[field].trim() : body[field]
  })

  return updates
}

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
    const validation = validateTaskPayload(body, true)
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('financial_tasks')
      .insert([{
        id: body.id || `task-${Date.now()}`,
        title: validation.title,
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
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }

    const validation = validateTaskPayload(body)
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const updates = getAllowedTaskUpdates(body)
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid task fields provided' }, { status: 400 })
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
