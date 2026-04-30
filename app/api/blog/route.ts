import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

// GET - Fetch all posts (for admin) or published posts (for public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const slug = searchParams.get('slug')
    const limit = searchParams.get('limit')
    
    let query = supabaseAdmin
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })
    
    // If slug provided, filter by slug (for individual post)
    if (slug) {
      query = query.eq('slug', slug)
    }
    
    // If status filter provided, use it (for admin)
    if (status) {
      query = query.eq('status', status)
    }
    
    // If limit provided, limit results
    if (limit) {
      query = query.limit(parseInt(limit))
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
    const body = await request.json()
    
    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .insert(body)
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Post ID required' },
        { status: 400 }
      )
    }
    
    const { error } = await supabaseAdmin
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
    const body = await request.json()
    const { id, status, ...updateData } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID required' },
        { status: 400 }
      )
    }
    
    // Build update object - include all provided fields
    const updateObj: any = {
      updated_at: new Date().toISOString()
    }
    
    if (status) updateObj.status = status
    if (updateData.title !== undefined) updateObj.title = updateData.title
    if (updateData.slug !== undefined) updateObj.slug = updateData.slug
    if (updateData.excerpt !== undefined) updateObj.excerpt = updateData.excerpt
    if (updateData.content !== undefined) updateObj.content = updateData.content
    if (updateData.author !== undefined) updateObj.author = updateData.author
    if (updateData.category !== undefined) updateObj.category = updateData.category
    if (updateData.thumbnail_url !== undefined) updateObj.thumbnail_url = updateData.thumbnail_url
    if (updateData.thumbnail_alt !== undefined) updateObj.thumbnail_alt = updateData.thumbnail_alt
    if (updateData.read_time !== undefined) updateObj.read_time = updateData.read_time
    
    const { data, error } = await supabaseAdmin
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
