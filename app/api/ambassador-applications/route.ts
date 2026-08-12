import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { ambassadorInputToRow, validateAmbassadorApplication } from '@/lib/ambassador-applications'

function getDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const validation = validateAmbassadorApplication(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Please correct the highlighted fields.', fields: validation.errors },
        { status: 400 }
      )
    }

    const database = getDatabase()
    if (!database) {
      console.error('Ambassador application database configuration is missing')
      return NextResponse.json({ error: 'Applications are temporarily unavailable.' }, { status: 503 })
    }

    const { data, error } = await database
      .from('ambassador_applications')
      .insert(ambassadorInputToRow(validation.data))
      .select('id,created_at')
      .single()

    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'An application has already been submitted with this email address.' },
        { status: 409 }
      )
    }
    if (error) throw error

    // Transactional email is not configured in this project. This is the clean
    // integration point for applicant/admin notifications when a provider is added.
    return NextResponse.json({ application: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating ambassador application:', error)
    return NextResponse.json(
      { error: 'We could not submit your application. Please try again.' },
      { status: 500 }
    )
  }
}
