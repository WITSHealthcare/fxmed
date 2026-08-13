import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'
import { writeRequestAdminActivity } from '@/lib/admin-activity'
import { checkRateLimit, cleanPublicString, isEmail } from '@/lib/request-security'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Fetch all messages or filter by status
export async function GET(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'messages')) return NextResponse.json({ error: 'Messages access required' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ messages: data || [] })
  } catch (error: any) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST - Create new message
export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, 'message-create', 8, 15 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many messages. Please try again shortly.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } })
    }
    const body = await request.json()
    const name = cleanPublicString(body.name, 150)
    const email = cleanPublicString(body.email, 180)?.toLowerCase()
    const message = cleanPublicString(body.message, 5000)
    if (!name || !email || !isEmail(email) || !message) {
      return NextResponse.json({ error: 'Name, a valid email address, and message are required.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        name,
        email,
        phone: cleanPublicString(body.phone, 40),
        subject: cleanPublicString(body.subject, 200),
        message,
        status: 'unread',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ message: data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create message' },
      { status: 500 }
    )
  }
}

// PATCH - Update message status
export async function PATCH(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'messages')) return NextResponse.json({ error: 'Messages access required' }, { status: 403 })
    const body = await request.json()
    const ids = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : []
    const status = body.status

    if (!ids.length || ids.some((id: unknown) => typeof id !== 'string')) {
      return NextResponse.json({ error: 'At least one valid message ID is required' }, { status: 400 })
    }

    if (!['unread', 'read', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'A valid message status is required' }, { status: 400 })
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('messages')
      .update(updateData)
      .in('id', ids)
      .select()

    if (error) throw error

    await writeRequestAdminActivity(supabase, request, {
      action: 'update_message_status',
      module: 'Messages',
      description: `Marked ${ids.length} message${ids.length === 1 ? '' : 's'} as ${status}`,
      entityType: 'message',
      entityId: ids.length === 1 ? ids[0] : null,
      metadata: { status, count: ids.length },
    })

    return NextResponse.json({ message: data?.[0] || null, messages: data || [] })
  } catch (error: any) {
    console.error('Error updating message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update message' },
      { status: 500 }
    )
  }
}

// DELETE - Delete message
export async function DELETE(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'messages')) return NextResponse.json({ error: 'Messages access required' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)

    if (error) throw error

    await writeRequestAdminActivity(supabase, request, {
      action: 'delete_message',
      module: 'Messages',
      description: 'Deleted a contact message',
      entityType: 'message',
      entityId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete message' },
      { status: 500 }
    )
  }
}
