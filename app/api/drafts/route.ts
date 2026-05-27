import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeRichText } from '@/lib/content-sanitizer'

// Create admin client with public key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// GET - Fetch all draft posts
export async function GET(request: NextRequest) {
  try {
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
    const body = await request.json()
    const draft = {
      ...body,
      ...(body.excerpt !== undefined ? { excerpt: sanitizeRichText(body.excerpt) } : {}),
      ...(body.content !== undefined ? { content: sanitizeRichText(body.content) } : {}),
    }
    
    const { data, error } = await supabaseAdmin
      .from('draft_posts')
      .insert(draft)
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
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID required' },
        { status: 400 }
      )
    }
    
    // Build update object
    const updateObj: any = {
      updated_at: new Date().toISOString()
    }
    
    if (updateData.title !== undefined) updateObj.title = updateData.title
    if (updateData.slug !== undefined) updateObj.slug = updateData.slug
    if (updateData.excerpt !== undefined) updateObj.excerpt = sanitizeRichText(updateData.excerpt)
    if (updateData.content !== undefined) updateObj.content = sanitizeRichText(updateData.content)
    if (updateData.author !== undefined) updateObj.author = updateData.author
    if (updateData.category !== undefined) updateObj.category = updateData.category
    if (updateData.thumbnail_url !== undefined) updateObj.thumbnail_url = updateData.thumbnail_url
    if (updateData.thumbnail_alt !== undefined) updateObj.thumbnail_alt = updateData.thumbnail_alt
    if (updateData.read_time !== undefined) updateObj.read_time = updateData.read_time
    
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
