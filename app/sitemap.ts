import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { absoluteUrl, publicRoutes } from '@/lib/seo'

async function getPublishedBlogSlugs() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return []
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug,created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch blog slugs for sitemap:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to build blog sitemap entries:', error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const staticEntries = publicRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: now,
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route === '/blog' ? 0.8 : 0.7,
  })) satisfies MetadataRoute.Sitemap

  const blogPosts = await getPublishedBlogSlugs()
  const blogEntries = blogPosts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.created_at ? new Date(post.created_at) : now,
    changeFrequency: 'monthly',
    priority: 0.6,
  })) satisfies MetadataRoute.Sitemap

  return [...staticEntries, ...blogEntries]
}
