import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET() {
  try {
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
    const body = await request.json()
    const now = new Date().toISOString()

    const { data, error } = await runWithRetry(() =>
      supabase
        .from('financial_expenses')
        .insert([{
          id: body.id || `expense-${Date.now()}`,
          description: body.description,
          amount: body.amount,
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
