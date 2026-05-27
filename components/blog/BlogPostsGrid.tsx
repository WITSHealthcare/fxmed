'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useMemo } from 'react'

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

interface BlogPostsGridProps {
  initialPosts: BlogPost[]
}

export default function BlogPostsGrid({ initialPosts }: BlogPostsGridProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Health Education': 'bg-blue-500 text-white',
      'Preventive Medicine': 'bg-purple-500 text-white',
      'Nutrition': 'bg-orange-500 text-white',
      'Functional Medicine': 'bg-green-500 text-white',
      'Mobile Health': 'bg-red-500 text-white',
      'Hormonal Health': 'bg-pink-500 text-white'
    }
    return colors[category] || 'bg-gray-500 text-white'
  }

  // Get unique categories from initial posts
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(initialPosts.map(post => post.category)))
    return ['all', ...uniqueCategories]
  }, [initialPosts])

  // Filter posts based on search term and category
  const filteredPosts = useMemo(() => {
    return initialPosts.filter(post => {
      const matchesSearch = searchTerm === '' || 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.author.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory, initialPosts])

  return (
    <>
      {/* Search and Filter Section */}
      <section className="py-[40px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-[20px] p-6 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Search Bar */}
              <div className="lg:col-span-2">
                <label htmlFor="search" className="block font-dm-sans font-semibold text-green-deep mb-2">
                  Search Articles
                </label>
                <div className="relative">
                  <input
                    id="search"
                    type="text"
                    placeholder="Search by title, content, or author..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-12 rounded-[12px] font-dm-sans text-[1rem] border-2 border-green-deep/20 focus:outline-none focus:border-gold transition-colors"
                  />
                  <svg 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-mid" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Category Filter */}
              <div className="lg:col-span-1">
                <label htmlFor="category" className="block font-dm-sans font-semibold text-green-deep mb-2">
                  Filter by Category
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] font-dm-sans text-[1rem] border-2 border-green-deep/20 focus:outline-none focus:border-gold transition-colors"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || selectedCategory !== 'all') && (
              <div className="mt-4 flex flex-wrap gap-2">
                {searchTerm && (
                  <div className="inline-flex items-center gap-2 bg-gold/20 text-green-deep px-3 py-1 rounded-full text-sm font-medium">
                    Search: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-green-deep hover:text-green-mid transition-colors"
                    >
                      ×
                    </button>
                  </div>
                )}
                {selectedCategory !== 'all' && (
                  <div className="inline-flex items-center gap-2 bg-gold/20 text-green-deep px-3 py-1 rounded-full text-sm font-medium">
                    Category: {selectedCategory}
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="text-green-deep hover:text-green-mid transition-colors"
                    >
                      ×
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory('all')
                  }}
                  className="text-green-mid hover:text-green-deep text-sm font-medium transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Results Count */}
            <div className="mt-4 text-text-mid font-dm-sans">
              Showing {filteredPosts.length} of {initialPosts.length} articles
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-[60px] px-[5%]">
        <div className="max-w-7xl mx-auto">
          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <article key={post.id} className="bg-white rounded-[20px] overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  {/* Thumbnail Image */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-green-deep/10 to-green-mid/10">
                    {post.thumbnail_url ? (
                      <Image
                        src={post.thumbnail_url}
                        alt={post.title}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : null}
                    {/* Show placeholder emoji if no thumbnail or image failed */}
                    <div className={`w-full h-full flex items-center justify-center ${post.thumbnail_url ? 'hidden' : ''}`}>
                      <div className="text-6xl">📝</div>
                    </div>
                    {/* Category Badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(post.category)}`}>
                        {post.category}
                      </span>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="p-6">
                    <div className="flex items-center mb-3 text-text-mid text-[0.85rem]">
                      <span>{new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      <span className="mx-2">•</span>
                      <span>{post.read_time}</span>
                    </div>

                    <h3 className="font-dm-sans font-bold text-green-deep text-[1.25rem] leading-[1.3] mb-3 line-clamp-2">
                      {post.title}
                    </h3>

                    <p className="font-dm-sans text-text-mid text-[0.95rem] leading-[1.6] mb-4 line-clamp-3">
                      {post.excerpt.length > 150 
                        ? post.excerpt.substring(0, 150) + '...' 
                        : post.excerpt}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-text-mid text-[0.9rem] font-medium">
                        By {post.author}
                      </span>
                      <Link 
                        href={`/blog/${post.slug}`}
                        className="font-dm-sans text-gold text-green-deep font-semibold text-[0.95rem] no-underline hover:text-green-mid transition-colors"
                      >
                        Read More →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="font-dm-sans font-bold text-green-deep text-[1.5rem] mb-2">
                No articles found
              </h3>
              <p className="font-dm-sans text-text-mid text-[1.1rem] mb-6">
                Try adjusting your search terms or filters
              </p>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('all')
                }}
                className="font-dm-sans bg-gold text-green-deep px-6 py-3 rounded-[50px] font-semibold text-[0.95rem] transition-all hover:bg-gold-light"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
