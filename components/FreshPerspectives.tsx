'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type BlogPost = {
  id: string
  title: string
  excerpt: string | null
  content: string
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
  slug: string
  thumbnail_url?: string
  thumbnail_alt?: string
  category?: string
  author?: string
  read_time?: string
}

const defaultPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Understanding Your Lab Results',
    excerpt: 'Learn how to interpret your blood work and make informed health decisions based on evidence-based medicine.',
    content: 'Learn how to interpret your blood work and make informed health decisions based on evidence-based medicine. Understanding your lab results is crucial for taking control of your health journey.',
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    slug: 'understanding-lab-results',
    category: 'Health Education',
    thumbnail_url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=600&fit=crop',
    read_time: '5 min read'
  },
  {
    id: '2',
    title: 'Preventive Care Strategies',
    excerpt: 'Discover proactive approaches to maintain optimal health and prevent chronic conditions before they develop.',
    content: 'Discover proactive approaches to maintain optimal health and prevent chronic conditions before they develop. Prevention is the foundation of optimal health.',
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    slug: 'preventive-care-strategies',
    category: 'Preventive Medicine',
    thumbnail_url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=600&fit=crop',
    read_time: '8 min read'
  },
  {
    id: '3',
    title: 'Nutrition for Mental Wellness',
    excerpt: 'Explore the connection between diet and mental health, with practical tips for improving both through functional nutrition.',
    content: 'Explore the connection between diet and mental health, with practical tips for improving both through functional nutrition. The gut-brain connection is profound.',
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    slug: 'nutrition-mental-wellness',
    category: 'Nutrition',
    thumbnail_url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop',
    read_time: '6 min read'
  }
]

const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    'Health Education': 'bg-blue-100 text-blue-800',
    'Preventive Medicine': 'bg-purple-100 text-purple-800',
    'Nutrition': 'bg-orange-100 text-orange-800',
    'Functional Medicine': 'bg-green-100 text-green-800',
    'Mobile Health': 'bg-red-100 text-red-800',
    'Hormonal Health': 'bg-pink-100 text-pink-800'
  }
  return colors[category] || 'bg-gray-100 text-gray-800'
}

export default function FreshPerspectives() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/blog?limit=4&status=published')
        if (!response.ok) throw new Error('Failed to fetch posts')
        
        const data = await response.json()
        if (data.posts && data.posts.length > 0) {
          setPosts(data.posts.slice(0, 4))
        }
      } catch (err) {
        console.error('Error fetching posts:', err)
        setError('Failed to load latest articles')
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  const getReadTime = (content: string) => {
    const wordsPerMinute = 200
    const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
    const minutes = Math.ceil(words / wordsPerMinute)
    return `${minutes} min read`
  }

  const getExcerpt = (post: BlogPost) => {
    if (post.excerpt) return post.excerpt
    const text = post.content.replace(/<[^>]*>/g, '')
    return text.substring(0, 120) + (text.length > 120 ? '...' : '')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const displayPosts = posts.length > 0 ? posts : defaultPosts
  const featuredPost = displayPosts[0]
  const otherPosts = displayPosts.slice(1, 4)

  return (
    <section id="fresh-perspectives" className="bg-[#FCFFF0] py-[90px] px-[5%]">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-block text-green-mid bg-green-mid/10 px-4 py-1.5 rounded-[20px] text-[0.75rem] font-dm-sans font-semibold tracking-[0.14em] uppercase mb-4">
            Fresh Perspectives
          </div>
          <h2 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-4">
            Health insights you can act on today
          </h2>
          <p className="font-dm-sans text-text-mid text-[1.05rem] leading-[1.7] max-w-2xl mx-auto">
            Evidence-based articles from the FXMed team — because informed patients heal faster.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Content - Latest Posts List */}
          <div>
            <h3 className="font-dm-sans font-semibold text-green-deep text-[1.2rem] mb-6 flex items-center">
              Latest Articles
            </h3>
            
            {/* Blog Posts List */}
            <div className="space-y-4">
              {loading ? (
                // Loading state
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-[16px] p-5 border border-green-deep/8 shadow-sm animate-pulse">
                      <div className="flex items-start">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg mr-4 flex-shrink-0"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : posts.length > 0 ? (
                // Real posts from API
                otherPosts.map((post, index) => (
                  <Link 
                    key={post.id} 
                    href={`/blog/${post.slug}`}
                    className="block bg-white rounded-[16px] p-5 border border-green-deep/8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                  >
                    <div className="flex items-start">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg mr-4 flex-shrink-0 overflow-hidden bg-gray-100">
                        {post.thumbnail_url ? (
                          <img 
                            src={post.thumbnail_url} 
                            alt={post.thumbnail_alt || post.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl bg-green-mid/10">
                            📄
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Category & Date */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[0.65rem] font-dm-sans font-semibold ${getCategoryColor(post.category || 'Health Education')}`}>
                            {post.category || 'Health Education'}
                          </span>
                          <span className="text-text-mid/60 text-[0.75rem]">
                            {formatDate(post.created_at)}
                          </span>
                        </div>
                        
                        <h4 className="font-dm-sans font-semibold text-green-deep text-[1rem] mb-1 group-hover:text-green-mid transition-colors line-clamp-1">
                          {post.title}
                        </h4>
                        <p className="font-dm-sans text-text-mid text-[0.85rem] leading-[1.5] mb-2 line-clamp-2">
                          {getExcerpt(post)}
                        </p>
                        <div className="flex items-center text-green-mid text-[0.8rem] font-medium">
                          <span className="mr-1">⏱</span> {post.read_time || getReadTime(post.content)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                // Default fallback posts
                defaultPosts.slice(1).map((post, index) => (
                  <Link 
                    key={post.id} 
                    href={`/blog/${post.slug}`}
                    className="block bg-white rounded-[16px] p-5 border border-green-deep/8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                  >
                    <div className="flex items-start">
                      <div className="w-16 h-16 rounded-lg mr-4 flex-shrink-0 overflow-hidden">
                        <img 
                          src={post.thumbnail_url} 
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[0.65rem] font-dm-sans font-semibold ${getCategoryColor(post.category || 'Health Education')}`}>
                            {post.category}
                          </span>
                        </div>
                        <h4 className="font-dm-sans font-semibold text-green-deep text-[1rem] mb-1 group-hover:text-green-mid transition-colors line-clamp-1">
                          {post.title}
                        </h4>
                        <p className="font-dm-sans text-text-mid text-[0.85rem] leading-[1.5] mb-2 line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center text-green-mid text-[0.8rem] font-medium">
                          <span className="mr-1">⏱</span> {post.read_time}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {/* CTA Button */}
            <Link 
              href="/blog" 
              className="font-dm-sans bg-gold text-green-deep px-8 py-4 rounded-[50px] font-semibold text-[1rem] no-underline transition-all hover:bg-gold-light hover:transform hover:translate-y-[-2px] hover:shadow-lg inline-block mt-8"
            >
              Read All Articles →
            </Link>
          </div>

          {/* Right Content - Featured Post */}
          <div className="order-first lg:order-last">
            <h3 className="font-dm-sans font-semibold text-green-deep text-[1.2rem] mb-6 flex items-center">
              Featured Article
            </h3>
            
            {loading ? (
              <div className="bg-white rounded-[20px] overflow-hidden shadow-xl animate-pulse">
                <div className="h-[300px] bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ) : (
              <Link 
                href={`/blog/${featuredPost?.slug || '#'}`}
                className="block bg-white rounded-[20px] overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group"
              >
                {/* Featured Image */}
                <div className="relative h-[300px] overflow-hidden">
                  {featuredPost?.thumbnail_url ? (
                    <img 
                      src={featuredPost.thumbnail_url} 
                      alt={featuredPost.thumbnail_alt || featuredPost.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-mid/20 to-green-deep/20">
                      <span className="text-8xl">📰</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-green-deep/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-[0.75rem] font-dm-sans font-semibold ${getCategoryColor(featuredPost?.category || 'Health Education')} bg-white/90 backdrop-blur-sm`}>
                      {featuredPost?.category || 'Featured'}
                    </span>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3 text-text-mid/70 text-[0.85rem]">
                    <span>{featuredPost?.created_at ? formatDate(featuredPost.created_at) : 'Recently published'}</span>
                    <span>•</span>
                    <span className="flex items-center">
                      <span className="mr-1">⏱</span> {featuredPost?.read_time || (featuredPost ? getReadTime(featuredPost.content) : '5 min read')}
                    </span>
                  </div>
                  
                  <h3 className="font-dm-sans font-bold text-green-deep text-[1.4rem] mb-3 group-hover:text-green-mid transition-colors leading-[1.3]">
                    {featuredPost?.title || 'Featured Health Article'}
                  </h3>
                  
                  <p className="font-dm-sans text-text-mid text-[1rem] leading-[1.6] mb-4">
                    {featuredPost ? getExcerpt(featuredPost) : 'Discover the latest insights from our functional medicine experts.'}
                  </p>
                  
                  <div className="flex items-center text-green-mid font-semibold group-hover:translate-x-1 transition-transform">
                    Read Article <span className="ml-2">→</span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
