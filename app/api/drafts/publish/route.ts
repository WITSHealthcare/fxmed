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

// POST - Publish draft to blog_posts table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { draftId } = body
    
    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID required' },
        { status: 400 }
      )
    }
    
    // First, get the draft data
    const { data: draft, error: fetchError } = await supabaseAdmin
      .from('draft_posts')
      .select('*')
      .eq('id', draftId)
      .single()
    
    if (fetchError) {
      throw fetchError
    }
    if (!draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }
    
    // Insert into blog_posts table
    const { data: publishedPost, error: insertError } = await supabaseAdmin
      .from('blog_posts')
      .insert({
        title: draft.title,
        slug: draft.slug,
        excerpt: sanitizeRichText(draft.excerpt),
        content: sanitizeRichText(draft.content),
        author: draft.author,
        category: draft.category,
        thumbnail_url: draft.thumbnail_url,
        thumbnail_alt: draft.thumbnail_alt,
        status: 'published',
        read_time: draft.read_time,
        created_at: draft.created_at,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (insertError) {
      throw insertError
    }
    
    // Delete from drafts after successful publish
    const { error: deleteError } = await supabaseAdmin
      .from('draft_posts')
      .delete()
      .eq('id', draftId)
    
    if (deleteError) {
      throw deleteError
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Draft published successfully',
      publishedPost 
    })
    
  } catch (error: any) {
    console.error('Error publishing draft:', error)
    return NextResponse.json(
      { error: 'Failed to publish draft', details: error.message },
      { status: 500 }
    )
  }
}
