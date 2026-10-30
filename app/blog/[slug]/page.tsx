import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { sanitizeRichText, stripHtml } from '@/lib/content-sanitizer'
import { absoluteUrl, createBreadcrumbJsonLd, createMetadata, organizationId, siteName, siteUrl } from '@/lib/seo'
import { careLinkFor, getPublicBlogClient, getPublishedPostSummaries, topicPath } from '@/lib/blog'

// Articles are served from the cache and refreshed at most once a minute;
// publishing and editing also revalidate them on demand.
export const revalidate = 60

// Prerendering the known slugs is what makes this route ISR rather than
// rendered on every request. If Supabase is unreachable at build this returns
// nothing and every article is generated on its first visit instead.
export async function generateStaticParams() {
  const posts = await getPublishedPostSummaries()
  return posts.map((post) => ({ slug: post.slug }))
}

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  author: string
  category: string
  thumbnail_url?: string | null
  thumbnail_alt?: string | null
  read_time: string
  created_at: string
  updated_at?: string | null
}

function getSupabaseClient() {
  const supabase = getPublicBlogClient()
  if (!supabase) throw new Error('Supabase public environment variables are missing')
  return supabase
}

async function getPost(slug: string): Promise<BlogPost | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Failed to fetch blog post:', error)
    }
    return null
  }

  return data
}

const RELATED_POST_COUNT = 4
const relatedColumns = 'id,title,slug,excerpt,content,author,category,thumbnail_url,thumbnail_alt,read_time,created_at'

// Same-topic articles first, topped up with the newest posts. Linking within a
// topic is what lets search engines see the blog as covering that subject in
// depth rather than as a flat list of unrelated pages.
async function getRelatedPosts(post: BlogPost): Promise<BlogPost[]> {
  const supabase = getSupabaseClient()
  const { data: sameTopic, error } = await supabase
    .from('blog_posts')
    .select(relatedColumns)
    .eq('status', 'published')
    .eq('category', post.category)
    .neq('id', post.id)
    .order('created_at', { ascending: false })
    .limit(RELATED_POST_COUNT)

  if (error) {
    console.error('Failed to fetch related blog posts:', error)
    return []
  }

  const related = sameTopic || []
  if (related.length >= RELATED_POST_COUNT) return related

  const { data: latest, error: latestError } = await supabase
    .from('blog_posts')
    .select(relatedColumns)
    .eq('status', 'published')
    .neq('id', post.id)
    .order('created_at', { ascending: false })
    .limit(RELATED_POST_COUNT * 2)

  if (latestError) {
    console.error('Failed to fetch latest blog posts:', latestError)
    return related
  }

  const seen = new Set(related.map((item) => item.id))
  for (const item of latest || []) {
    if (related.length >= RELATED_POST_COUNT) break
    if (!seen.has(item.id)) related.push(item)
  }
  return related
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    const post = await getPost(slug)

    if (!post) {
      return createMetadata({
        title: 'Article Not Found | FXMed',
        description: 'This FXMed article could not be found.',
        path: `/blog/${slug}`,
        noIndex: true,
      })
    }

    return createMetadata({
      title: `${post.title} | FXMed`,
      description: stripHtml(post.excerpt || post.content).slice(0, 155),
      path: `/blog/${post.slug}`,
      image: post.thumbnail_url || '/blog/functional-medicine.jpg',
      keywords: [post.category, 'FXMed', 'functional medicine', 'health education'],
      article: {
        publishedTime: post.created_at,
        modifiedTime: post.updated_at || post.created_at,
        section: post.category,
        authors: [post.author || siteName],
      },
    })
  } catch (error) {
    console.error('Failed to generate blog post metadata:', error)
    return createMetadata({
      title: 'FXMed Health Article',
      description: 'Read health education and functional medicine insights from FXMed.',
      path: `/blog/${slug}`,
    })
  }
}

const markdownToHtml = (content: string): string => {
  if (!content) return ''

  const hasHtmlTags = /<(p|div|span|h[1-6]|ul|ol|li|strong|em|b|i|br|a|img)[^>]*>/i.test(content)

  if (hasHtmlTags) {
    return sanitizeRichText(content)
  }

  const html = content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^(\d+\.) (.*$)/gim, '<li>$2</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^(?!<[hl]|<li|<ul|<ol)(.*$)/gim, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/\n/g, '')

  return sanitizeRichText(html)
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Health Education': 'bg-blue-500 text-white',
    'Preventive Medicine': 'bg-purple-500 text-white',
    Nutrition: 'bg-orange-500 text-white',
    'Functional Medicine': 'bg-green-500 text-white',
    'Mobile Health': 'bg-red-500 text-white',
    'Hormonal Health': 'bg-pink-500 text-white',
    Autism: 'bg-indigo-500 text-white',
  }

  return colors[category] || 'bg-gray-500 text-white'
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let post: BlogPost | null = null

  try {
    post = await getPost(slug)
  } catch (error) {
    console.error('Failed to initialize blog post page:', error)
    notFound()
  }

  if (!post) {
    notFound()
  }

  const relatedPosts = await getRelatedPosts(post)
  const articleHtml = markdownToHtml(post.content)
  const careLink = careLinkFor(post)
  const postUrl = absoluteUrl(`/blog/${post.slug}`)
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: stripHtml(post.excerpt || post.content).slice(0, 200),
    image: post.thumbnail_url ? absoluteUrl(post.thumbnail_url) : absoluteUrl('/blog/functional-medicine.jpg'),
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    inLanguage: 'en',
    articleSection: post.category,
    keywords: [post.category, 'functional medicine'].filter(Boolean).join(', '),
    author: {
      '@type': 'Person',
      name: post.author || siteName,
    },
    // Ties the article to the same Organization entity declared in the root
    // layout, so its authority accrues to FXMed rather than a detached name.
    publisher: {
      '@type': 'Organization',
      '@id': organizationId,
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/logo.png'),
      },
    },
    isPartOf: { '@type': 'Blog', name: `${siteName} Blog`, url: `${siteUrl}/blog` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
  }
  const breadcrumbJsonLd = createBreadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    ...(post.category ? [{ name: post.category, path: topicPath(post.category) }] : []),
    { name: post.title, path: `/blog/${post.slug}` },
  ])

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <Navigation />

      <article className="pt-[180px] px-[5%]">
        <div className="max-w-4xl mx-auto">
          <nav className="mb-8 relative z-10">
            <Link
              href="/blog"
              className="font-dm-sans text-green-mid text-[0.95rem] no-underline hover:text-green-deep transition-all hover:underline cursor-pointer inline-block px-2 py-1 rounded-lg hover:bg-green-deep/10"
            >
              ← Back to Articles
            </Link>
          </nav>

          {post.thumbnail_url && (
            <div className="mb-8 rounded-[20px] overflow-hidden shadow-lg relative h-64 md:h-80">
              <Image
                src={post.thumbnail_url}
                alt={post.thumbnail_alt || post.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center mb-4">
              <div>
                <Link
                  href={topicPath(post.category)}
                  className={`inline-block px-3 py-1 rounded-[20px] text-[0.8rem] font-dm-sans font-semibold mb-2 no-underline hover:opacity-90 ${getCategoryColor(post.category)}`}
                >
                  {post.category}
                </Link>
                <div className="text-text-mid text-[0.9rem]">
                  {new Date(post.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })} • {post.read_time}
                </div>
              </div>
            </div>

            <h1 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,5vw,3rem)] leading-[1.2] mb-4">
              {post.title}
            </h1>

            <div className="flex items-center justify-between text-text-mid">
              <span className="font-medium">By {post.author}</span>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-8 shadow-lg">
            <div
              className="prose prose-lg max-w-none font-dm-sans text-text-mid leading-[1.7]"
              dangerouslySetInnerHTML={{ __html: articleHtml }}
            />
          </div>

          <aside className="mt-10 rounded-[20px] border border-green-deep/10 bg-green-deep/5 p-8">
            <div className="text-green-mid text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-2">
              Care at FXMed
            </div>
            <h2 className="font-dm-sans font-bold text-green-deep text-[1.4rem] mb-2">{careLink.label}</h2>
            <p className="font-dm-sans text-text-mid mb-5">{careLink.blurb}</p>
            <div className="flex flex-wrap gap-4">
              <Link
                href={careLink.href}
                className="font-dm-sans bg-green-deep text-white px-6 py-3 rounded-[50px] font-semibold text-[0.95rem] no-underline transition-all hover:opacity-90"
              >
                Learn about {careLink.label}
              </Link>
              {post.category && (
                <Link
                  href={topicPath(post.category)}
                  className="font-dm-sans text-green-deep px-6 py-3 rounded-[50px] font-semibold text-[0.95rem] no-underline border-2 border-green-deep transition-all hover:bg-green-deep hover:text-white"
                >
                  More on {post.category}
                </Link>
              )}
            </div>
          </aside>

          <div className="mt-12 pt-8 border-t border-green-deep/20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="font-dm-sans font-bold text-green-deep mb-2">About the Author</h3>
                <p className="font-dm-sans text-text-mid">{post.author}</p>
              </div>

              <div className="flex gap-4">
                <button className="font-dm-sans bg-gold text-green-deep px-6 py-3 rounded-[50px] font-semibold text-[0.95rem] transition-all hover:bg-gold-light">
                  Share Article
                </button>
                <button className="font-dm-sans bg-transparent text-green-deep px-6 py-3 rounded-[50px] font-semibold text-[0.95rem] border-2 border-green-deep transition-all hover:bg-green-deep hover:text-white">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {relatedPosts.length > 0 && (
            <div className="mt-16">
              <h2 className="font-dm-sans font-bold text-green-deep text-[2rem] mb-8">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    href={`/blog/${relatedPost.slug}`}
                    className="bg-white rounded-[16px] p-6 border border-green-deep/8 shadow-sm hover:shadow-md transition-shadow no-underline"
                  >
                    <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-2">
                      {relatedPost.title}
                    </h3>
                    <p className="font-dm-sans text-text-mid text-[0.9rem] mb-2">
                      {stripHtml(relatedPost.excerpt || relatedPost.content).slice(0, 100)}...
                    </p>
                    <div className="text-green-mid text-[0.85rem] font-medium">
                      {relatedPost.read_time}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([articleJsonLd, breadcrumbJsonLd]) }}
      />
    </main>
  )
}
