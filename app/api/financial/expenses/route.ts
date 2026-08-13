import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthorizedCrmRole } from '@/lib/admin-api-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const runWithRetry = async (operation: () => any, retries = 2): Promise<any> => {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
      }
    }
  }

  throw lastError
}

export async function GET(request: NextRequest) {
  try {
    if (!await getAuthorizedCrmRole(request, 'financial')) return NextResponse.json({ error: 'Financial CRM access required' }, { status: 403 })
    const { data, error } = await runWithRetry(() =>
      supabase
        .from('financial_expenses')
        .select('*')
        .order('expense_date', { ascending: false })
    )

    if (error) throw error

    return NextResponse.json({ expenses: data || [] })
  } catch (error: any) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await getAuthorizedCrmRole(request, 'financial')) return NextResponse.json({ error: 'Financial CRM access required' }, { status: 403 })
    const body = await request.json()
    const now = new Date().toISOString()
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 500) : ''
    const amount = Number(body.amount)
    if (!description || !Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'A description and non-negative amount are required' }, { status: 400 })
    }

    const { data, error } = await runWithRetry(() =>
      supabase
        .from('financial_expenses')
        .insert([{
          id: body.id || `expense-${Date.now()}`,
          description,
          amount,
          expense_date: body.expense_date || now,
          created_at: now,
          updated_at: now,
        }])
        .select()
        .single()
    )

    if (error) throw error

    return NextResponse.json({ expense: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create expense' },
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
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 })
    }

    const { error } = await runWithRetry(() =>
      supabase
        .from('financial_expenses')
        .delete()
        .eq('id', id)
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete expense' },
      { status: 500 }
    )
  }
}
