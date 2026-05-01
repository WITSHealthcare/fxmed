import dynamic from 'next/dynamic'
import BlogPostsGrid from '@/components/blog/BlogPostsGrid'

// Revalidate page every 60 seconds (ISR - Incremental Static Regeneration)
export const revalidate = 60

// Dynamically import Navigation and Footer with SSR disabled to prevent context errors
const Navigation = dynamic(() => import('@/components/Navigation'), { ssr: false })
const Footer = dynamic(() => import('@/components/Footer'), { ssr: false })

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

// Server-side data fetching with caching
async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/blog?status=published`, {
      // Cache the response for 60 seconds
      next: { revalidate: 60 }
    })
    
    if (!response.ok) {
      console.error('Failed to fetch blog posts:', response.status)
      return []
    }
    
    const { posts } = await response.json()
    return posts || []
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
