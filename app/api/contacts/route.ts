import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { writeRequestAdminActivity } from '@/lib/admin-activity'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'
import { checkRateLimit, cleanPublicString, isEmail } from '@/lib/request-security'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service-role client bypasses RLS. Used for the public registration insert and
// for all admin reads/updates (which are gated by an auth + role check below).
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Fields a registrant is allowed to submit. Anything else is ignored.
const SUBMITTABLE_FIELDS = [
  'full_name', 'phone', 'email',
  'gender', 'date_of_birth', 'marital_status',
  'address', 'city', 'state',
  'health_concern', 'conditions', 'medications', 'blood_pressure', 'blood_sugar',
  'outreach_event',
] as const

// POST - Public: register a new contact from the outreach form.
export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, 'contact-create', 8, 15 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many registrations. Please try again shortly.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
    }
    const body = await request.json()

    const record: Record<string, string | null> = {}
    for (const field of SUBMITTABLE_FIELDS) {
      record[field] = cleanPublicString(body[field], field === 'health_concern' || field === 'conditions' || field === 'medications' ? 2000 : 500)
    }

    if (!record.full_name) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }
    if (!record.phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }
    if (record.email && !isEmail(record.email)) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert([{ ...record, status: 'new' }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ contact: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to register' },
      { status: 500 }
    )
  }
}

// GET - Admin: list contacts, optionally filtered by status or outreach event.
export async function GET(request: NextRequest) {
  try {
    const role = await getAuthorizedAdminRole(request, 'contacts')
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const event = searchParams.get('event')

    let query = supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') query = query.eq('status', status)
    if (event && event !== 'all') query = query.eq('outreach_event', event)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ contacts: data || [] })
  } catch (error: any) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

// PATCH - Admin: update a contact's status or notes.
export async function PATCH(request: NextRequest) {
  try {
    const role = await getAuthorizedAdminRole(request, 'contacts')
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { id } = body
    if (!id) {
      return NextResponse.json({ error: 'Contact ID required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.status === 'string') {
      if (!['new', 'contacted', 'enrolled', 'archived'].includes(body.status)) {
        return NextResponse.json({ error: 'A valid contact status is required' }, { status: 400 })
      }
      updates.status = body.status
    }
    if (typeof body.notes === 'string') updates.notes = body.notes.trim().slice(0, 5000)

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await writeRequestAdminActivity(supabase, request, {
      action: 'update_contact',
      module: 'Outreach Contacts',
      description: `Updated outreach contact ${data.full_name || data.id}`,
      entityType: 'contact',
      entityId: data.id,
      metadata: { status: data.status },
    })

    return NextResponse.json({ contact: data })
  } catch (error: any) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update contact' },
      { status: 500 }
    )
  }
}

// DELETE - Admin: remove a contact.
export async function DELETE(request: NextRequest) {
  try {
    const role = await getAuthorizedAdminRole(request, 'contacts')
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Contact ID required' }, { status: 400 })
    }

    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) throw error

    await writeRequestAdminActivity(supabase, request, {
      action: 'delete_contact',
      module: 'Outreach Contacts',
      description: 'Deleted an outreach contact',
      entityType: 'contact',
      entityId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete contact' },
      { status: 500 }
    )
  }
}
