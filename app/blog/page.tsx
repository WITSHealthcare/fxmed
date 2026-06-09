import nextDynamic from 'next/dynamic'
import { createClient } from '@supabase/supabase-js'
import BlogPostsGrid from '@/components/blog/BlogPostsGrid'
import { sanitizeRichText, stripHtml } from '@/lib/content-sanitizer'
import { createMetadata } from '@/lib/seo'

// Fetch blog content at request time so deploy builds do not depend on Supabase reachability.
export const dynamic = 'force-dynamic'

export const metadata = createMetadata({
  title: 'Functional Medicine Blog | FXMed',
  description:
    'Read FXMed health insights on functional medicine, preventive care, nutrition, hormonal health, mobile healthcare and practical wellness strategies.',
  path: '/blog',
  image: '/blog/functional-medicine.jpg',
  keywords: ['functional medicine blog', 'preventive health', 'nutrition tips', 'hormonal health'],
})

// Dynamically import Navigation and Footer with SSR disabled to prevent context errors
const Navigation = nextDynamic(() => import('@/components/Navigation'), { ssr: false })
const Footer = nextDynamic(() => import('@/components/Footer'), { ssr: false })

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  author: string
  category: string
  thumbnail_url: string
  read_time: string
  created_at: string
}

// Query Supabase directly to avoid self-referential HTTP fetch issues
async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch blog posts:', error)
      return []
    }

    return (data || []).map((post) => ({
      ...post,
      excerpt: stripHtml(post.excerpt || ''),
      content: sanitizeRichText(post.content || ''),
    }))
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return []
  }
}

export default async function BlogPage() {
  // Fetch data on server before page loads
  const blogPosts = await getBlogPosts()

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <Navigation />
      
      {/* Blog Header */}
      <section className="pt-[180px] px-[5%]">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
            Fresh Perspectives
          </div>
          <h1 className="font-dm-sans font-bold text-green-deep text-[clamp(2.5rem,5vw,4rem)] leading-[1.1] mb-6">
            Health insights you<br/>can act on today
          </h1>
          <p className="font-dm-sans text-text-mid text-[1.2rem] leading-[1.7] max-w-[600px] mx-auto">
            Evidence-based articles from the FXMed team — because informed patients heal faster.
          </p>
        </div>
      </section>

      {/* Blog Posts Grid with Search/Filter - Client Component */}
      <BlogPostsGrid initialPosts={blogPosts} />

      {/* Newsletter Signup */}
      <section className="bg-green-deep py-[80px] px-[5%]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-dm-sans font-bold text-white text-[clamp(1.8rem,4vw,2.5rem)] leading-[1.2] mb-4">
            Stay Updated with Health Insights
          </h2>
          <p className="font-dm-sans text-cream/80 text-[1.1rem] leading-[1.7] mb-8">
            Get the latest articles and health tips delivered directly to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 rounded-[50px] font-dm-sans text-[1rem] border-2 border-gold focus:outline-none focus:border-gold-light"
            />
            <button className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px]">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
