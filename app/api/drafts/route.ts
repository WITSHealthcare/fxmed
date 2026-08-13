import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeRichText } from '@/lib/content-sanitizer'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'

// Server-only client; route authorization is enforced before every operation.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined
  return value.trim().slice(0, maxLength)
}

function getDraftInput(input: Record<string, unknown>, partial = false) {
  const draft: Record<string, unknown> = {}
  const fields: Array<[string, number]> = [
    ['title', 300], ['slug', 300], ['author', 150], ['category', 120],
    ['thumbnail_url', 2000], ['thumbnail_alt', 500], ['read_time', 80],
  ]
  for (const [field, maxLength] of fields) {
    if (input[field] !== undefined) draft[field] = cleanString(input[field], maxLength)
  }
  if (input.excerpt !== undefined) draft.excerpt = sanitizeRichText(cleanString(input.excerpt, 10_000) || '')
  if (input.content !== undefined) draft.content = sanitizeRichText(cleanString(input.content, 500_000) || '')
  if (!partial && (!draft.title || !draft.slug)) return { error: 'Title and slug are required.' }
  return { draft }
}

// GET - Fetch all draft posts
export async function GET(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'blog')) return NextResponse.json({ error: 'Blog access required' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    let query = supabaseAdmin
      .from('draft_posts')
      .select('*')
      .order('created_at', { ascending: false })
    
    // If id provided, filter by id
    if (id) {
      query = query.eq('id', id)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return NextResponse.json({ drafts: data })
  } catch (error) {
    console.error('Error fetching drafts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    )
  }
}

// POST - Create new draft post
export async function POST(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'blog')) return NextResponse.json({ error: 'Blog access required' }, { status: 403 })
    const input = getDraftInput(await request.json())
    if (input.error) return NextResponse.json({ error: input.error }, { status: 400 })
    
    const { data, error } = await supabaseAdmin
      .from('draft_posts')
      .insert(input.draft!)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ draft: data })
  } catch (error) {
    console.error('Error creating draft:', error)
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a draft post
export async function DELETE(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'blog')) return NextResponse.json({ error: 'Blog access required' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Draft ID required' },
        { status: 400 }
      )
    }
    
    const { error } = await supabaseAdmin
      .from('draft_posts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting draft:', error)
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500 }
    )
  }
}

// PATCH - Update draft post
export async function PATCH(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'blog')) return NextResponse.json({ error: 'Blog access required' }, { status: 403 })
    const body = await request.json()
    const { id } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID required' },
        { status: 400 }
      )
    }
    
    const input = getDraftInput(body, true)
    if (input.error) return NextResponse.json({ error: input.error }, { status: 400 })
    if (!input.draft || Object.keys(input.draft).length === 0) return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
    const updateObj = { ...input.draft, updated_at: new Date().toISOString() }
    
    const { data, error } = await supabaseAdmin
      .from('draft_posts')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ draft: data })
  } catch (error) {
    console.error('Error updating draft:', error)
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    )
  }
}
