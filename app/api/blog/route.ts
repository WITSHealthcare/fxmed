import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeRichText } from '@/lib/content-sanitizer'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

function requireSupabase() {
  if (!supabaseAdmin) {
    throw new Error('Supabase server environment variables are missing')
  }

  return supabaseAdmin
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined
  return value.trim().slice(0, maxLength)
}

function getPostInput(input: Record<string, unknown>, partial = false) {
  const post: Record<string, unknown> = {}
  const stringFields: Array<[string, number]> = [
    ['title', 300], ['slug', 300], ['author', 150], ['category', 120],
    ['thumbnail_url', 2000], ['thumbnail_alt', 500], ['read_time', 80],
  ]
  for (const [field, maxLength] of stringFields) {
    if (input[field] !== undefined) post[field] = cleanString(input[field], maxLength)
  }
  if (input.excerpt !== undefined) post.excerpt = sanitizeRichText(cleanString(input.excerpt, 10_000) || '')
  if (input.content !== undefined) post.content = sanitizeRichText(cleanString(input.content, 500_000) || '')
  if (input.status !== undefined) {
    if (!['draft', 'published'].includes(String(input.status))) return { error: 'A valid post status is required.' }
    post.status = input.status
  }
  if (!partial && (!post.title || !post.slug)) return { error: 'Title and slug are required.' }
  return { post }
}

// GET - Fetch all posts (for admin) or published posts (for public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const slug = searchParams.get('slug')
    const limit = searchParams.get('limit')
    const supabase = requireSupabase()
    const canManageBlog = Boolean(await getAuthorizedAdminRole(request, 'blog'))
    
    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })
    
    // If slug provided, filter by slug (for individual post)
    if (slug) {
      query = query.eq('slug', slug)
    }
    
    // If status filter provided, use it (for admin)
    if (status && canManageBlog) {
      query = query.eq('status', status)
    } else if (!canManageBlog) {
      query = query.eq('status', 'published')
    }
    
    // If limit provided, limit results
    if (limit) {
      const parsedLimit = Number.parseInt(limit, 10)
      if (Number.isFinite(parsedLimit)) query = query.limit(Math.min(100, Math.max(1, parsedLimit)))
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return NextResponse.json({ posts: data })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'blog')) return NextResponse.json({ error: 'Blog access required' }, { status: 403 })
    const supabase = requireSupabase()
    const input = getPostInput(await request.json())
    if (input.error) return NextResponse.json({ error: input.error }, { status: 400 })
    
    const { data, error } = await supabase
      .from('blog_posts')
      .insert(input.post!)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ post: data })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a post
export async function DELETE(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'blog')) return NextResponse.json({ error: 'Blog access required' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Post ID required' },
        { status: 400 }
      )
    }
    const supabase = requireSupabase()
    
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}

// PATCH - Update post (status, content, or any fields)
export async function PATCH(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'blog')) return NextResponse.json({ error: 'Blog access required' }, { status: 403 })
    const supabase = requireSupabase()
    const body = await request.json()
    const { id } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID required' },
        { status: 400 }
      )
    }
    
    const input = getPostInput(body, true)
    if (input.error) return NextResponse.json({ error: input.error }, { status: 400 })
    if (!input.post || Object.keys(input.post).length === 0) return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
    const updateObj = { ...input.post, updated_at: new Date().toISOString() }
    
    const { data, error } = await supabase
      .from('blog_posts')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ post: data })
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    )
  }
}
