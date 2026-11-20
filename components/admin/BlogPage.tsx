'use client'

import { useEffect, useState } from 'react'
import BlogManagement, { type BlogPost } from '@/components/admin/BlogManagement'
import { Alert, Spinner } from '@/components/admin/ui'

// The blog route: loads drafts and published posts, then hands them to the editor.
export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [draftsResponse, postsResponse] = await Promise.all([fetch('/api/drafts'), fetch('/api/blog?status=published')])
        if (!draftsResponse.ok || !postsResponse.ok) throw new Error('Failed to fetch posts')
        const [{ drafts }, { posts: published }] = await Promise.all([draftsResponse.json(), postsResponse.json()])
        setPosts([...(drafts || []), ...(published || [])])
      } catch (problem) {
        console.error('Error loading posts:', problem)
        setError('Posts could not be loaded. Refresh to try again.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) return <Spinner />
  return <div className="space-y-6"><Alert>{error}</Alert><BlogManagement posts={posts} setPosts={setPosts} /></div>
}
