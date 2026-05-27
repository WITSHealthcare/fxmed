'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import 'react-quill/dist/quill.snow.css'
import ContentGenerationPanel from './AIGenerationPanel'
import { sanitizeRichText } from '@/lib/content-sanitizer'

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  author: string
  category: string
  thumbnail_url: string
  thumbnail_alt?: string
  status: 'draft' | 'published'
  read_time: string
  created_at: string
  updated_at: string
}

type BlogNavItem = "new-blog" | "drafts" | "posted"

interface BlogManagementProps {
  posts: BlogPost[]
  setPosts: (posts: BlogPost[]) => void
}

export default function BlogManagement({ posts, setPosts }: BlogManagementProps) {
  const [activeBlogSection, setActiveBlogSection] = useState<BlogNavItem>("new-blog")
  const [formData, setFormData] = useState<Partial<BlogPost>>({
    title: '',
    excerpt: '',
    content: '',
    author: 'FXMed Team',
    category: 'Health Education',
    thumbnail_url: '',
    thumbnail_alt: ''
  })
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const blogNavItems = [
    { id: "new-blog", label: "New Blog" },
    { id: "drafts", label: "Drafts" },
    { id: "posted", label: "Posted Blogs" },
  ]

  const calculateReadTime = (content: string): string => {
    // Remove HTML tags if any
    const plainText = content.replace(/<[^>]*>/g, '')
    const words = plainText.split(/\s+/).length
    const minutes = Math.ceil(words / 200)
    return `${minutes} min read`
  }

  // Toast notification component
  const ToastNotification = ({ notification, onClose }: { notification: { message: string; type: 'success' | 'error' }, onClose: () => void }) => {
    if (!notification) return null

    return (
      <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all transform ${
        notification.type === 'success' 
          ? 'bg-green-deep text-white' 
          : 'bg-red-500 text-white'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-2">
              {notification.type === 'success' ? '✓' : '✗'}
            </span>
            <span className="font-dm-sans font-medium">
              {notification.message}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:opacity-80 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // Preview Modal Component
  const PreviewModal = ({ post, onClose }: { post: BlogPost; onClose: () => void }) => {
    if (!post) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="bg-white rounded-[20px] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-dm-sans font-bold text-green-deep">
                Preview: {post.title}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {post.status === 'draft' ? 'Draft Preview' : 'Published Post Preview'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {post.thumbnail_url && (
              <div className="relative w-full h-64 rounded-[12px] overflow-hidden mb-6">
                <Image
                  src={post.thumbnail_url}
                  alt={post.thumbnail_alt || post.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            
            <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
              <span className="bg-gold/20 text-green-deep px-3 py-1 rounded-full font-medium">
                {post.category}
              </span>
              <span>{post.read_time}</span>
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              <span>By {post.author}</span>
            </div>

            <h1 className="text-3xl font-dm-sans font-bold text-green-deep mb-4">
              {post.title}
            </h1>

            <p className="text-lg text-gray-600 font-dm-sans mb-6 italic">
              {post.excerpt}
            </p>

            <div 
              className="prose prose-lg max-w-none font-dm-sans text-gray-700"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.content) }}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-[12px] font-dm-sans font-medium hover:bg-gray-300 transition-colors"
            >
              Close Preview
            </button>
            <a
              href={`/blog/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-green-deep text-white rounded-[12px] font-dm-sans font-medium hover:bg-green-700 transition-colors"
            >
              View on Site
            </a>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const baseSlug = formData.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'post'
    const uniqueSuffix = Date.now().toString(36).slice(-6)
    const slug = `${baseSlug}-${uniqueSuffix}`

    // If editing an existing published post, use PATCH to update
    if (editingPost && editingPost.status === 'published') {
      try {
        const updateData = {
          id: editingPost.id,
          title: formData.title,
          excerpt: formData.excerpt,
          content: formData.content,
          author: formData.author,
          category: formData.category,
          thumbnail_url: formData.thumbnail_url,
          thumbnail_alt: formData.thumbnail_alt,
          updated_at: new Date().toISOString()
        }

        const response = await fetch('/api/blog', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('API error:', errorData)
          throw new Error(errorData.error || 'Failed to update post')
        }

        const { post: data } = await response.json()

        setPosts(posts.map(p => p.id === editingPost.id ? data : p))

        // Update editingPost with new data so form shows updated content
        setEditingPost(data)
        setNotification({ message: 'Published post updated successfully!', type: 'success' })
        setTimeout(() => setNotification(null), 3000)
      } catch (error) {
        console.error('Error updating post:', error)
        setNotification({ message: 'Error updating post. Please try again.', type: 'error' })
        setTimeout(() => setNotification(null), 5000)
      }
      return
    }

    // Creating new post or updating draft
    const newPost = {
      title: formData.title || '',
      slug: slug,
      excerpt: formData.excerpt || '',
      content: formData.content || '',
      author: formData.author || 'FXMed Team',
      category: formData.category || 'Health Education',
      thumbnail_url: formData.thumbnail_url || '',
      thumbnail_alt: formData.thumbnail_alt || '',
      status: editingPost ? editingPost.status : 'published' as const,
      read_time: calculateReadTime(formData.content || '')
    }

    try {
      // Use correct endpoint based on whether it's a draft or published post
      const isDraft = editingPost?.status === 'draft'
      const endpoint = isDraft ? '/api/drafts' : '/api/blog'
      
      const response = await fetch(endpoint, {
        method: editingPost ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingPost ? { id: editingPost.id, ...newPost } : newPost),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to create post')
      }

      // Parse response based on endpoint used
      const result = await response.json()
      const data = isDraft ? result.draft : result.post

      setPosts(editingPost ? posts.map(p => p.id === editingPost.id ? data : p) : [data, ...posts])

      if (editingPost) {
        // When updating, keep form data and update editingPost
        setEditingPost(data)
        setNotification({ message: 'Post updated successfully!', type: 'success' })
      } else {
        // When creating new, clear form
        setFormData({
          title: '',
          excerpt: '',
          content: '',
          author: 'FXMed Team',
          category: 'Health Education',
          thumbnail_url: '',
          thumbnail_alt: ''
        })
        setEditingPost(null)
        setNotification({ message: 'Blog post created successfully!', type: 'success' })
      }
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Error creating post:', error)
      setNotification({ message: 'Error creating blog post. Please try again.', type: 'error' })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault()

    // If editing an existing post (published or draft), update it and set status to draft
    if (editingPost) {
      try {
        const updateData = {
          id: editingPost.id,
          title: formData.title,
          excerpt: formData.excerpt,
          content: formData.content,
          author: formData.author,
          category: formData.category,
          thumbnail_url: formData.thumbnail_url,
          thumbnail_alt: formData.thumbnail_alt,
          status: 'draft', // Convert to draft
          updated_at: new Date().toISOString()
        }

        const response = await fetch('/api/drafts', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('API error:', errorData)
          throw new Error(errorData.error || 'Failed to save draft')
        }

        const { draft: data } = await response.json()

        setPosts(posts.map(p => p.id === editingPost.id ? data : p))

        // Keep form data when updating, just update editingPost
        setEditingPost(data)
        setNotification({ message: 'Saved as draft successfully!', type: 'success' })
        setTimeout(() => setNotification(null), 3000)
      } catch (error) {
        console.error('Error saving draft:', error)
        setNotification({ message: 'Error saving draft. Please try again.', type: 'error' })
        setTimeout(() => setNotification(null), 5000)
      }
      return
    }

    // Creating new draft
    const baseSlug = formData.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'draft'
    const uniqueSuffix = Date.now().toString(36).slice(-6)
    const slug = `${baseSlug}-${uniqueSuffix}`

    const draftPost = {
      title: formData.title || '',
      slug: slug,
      excerpt: formData.excerpt || '',
      content: formData.content || '',
      author: formData.author || 'FXMed Team',
      category: formData.category || 'Health Education',
      thumbnail_url: formData.thumbnail_url || '',
      thumbnail_alt: formData.thumbnail_alt || '',
      status: 'draft' as const,
      read_time: calculateReadTime(formData.content || '')
    }

    try {
      const response = await fetch('/api/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftPost),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to save draft')
      }

      const { draft: data } = await response.json()

      setPosts([data, ...posts])

      // When creating new draft, clear form and start editing the new draft
      setEditingPost(data)
      setFormData({
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        author: data.author,
        category: data.category,
        thumbnail_url: data.thumbnail_url || '',
        thumbnail_alt: data.thumbnail_alt || ''
      })

      setNotification({ message: 'Draft saved successfully! You can continue editing.', type: 'success' })
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Error saving draft:', error)
      setNotification({ message: 'Error saving draft. Please try again.', type: 'error' })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const handleEditDraft = (post: BlogPost) => {
    setEditingPost(post)
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      category: post.category,
      thumbnail_url: post.thumbnail_url,
      thumbnail_alt: post.thumbnail_alt
    })
    setActiveBlogSection("new-blog")
  }

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post)
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      author: post.author,
      category: post.category,
      thumbnail_url: post.thumbnail_url,
      thumbnail_alt: post.thumbnail_alt
    })
    setActiveBlogSection("new-blog")
  }

  const handlePublishDraft = async (post: BlogPost) => {
    try {
      const response = await fetch('/api/drafts/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draftId: post.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Publish API error:', errorData)
        throw new Error(errorData.error || 'Failed to publish draft')
      }

      const result = await response.json()
      
      // Remove draft from posts and add published post
      setPosts(posts.filter(p => p.id !== post.id).concat(result.publishedPost))
      
      // Switch to editing the published post so user can continue if needed
      setEditingPost(result.publishedPost)
      setNotification({ message: 'Draft published successfully! Now editing published post.', type: 'success' })
      setTimeout(() => setNotification(null), 3000)
    } catch (error: any) {
      console.error('Error publishing draft:', error)
      setNotification({ message: `Error: ${error.message || 'Failed to publish'}`, type: 'error' })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const handleDelete = async (post: BlogPost) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      // Use different endpoints for drafts vs published posts
      const endpoint = post.status === 'draft' ? '/api/drafts' : '/api/blog'
      const response = await fetch(`${endpoint}?id=${post.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete post')

      setPosts(posts.filter(p => p.id !== post.id))
      
      // Only clear form if the deleted post was being edited
      if (editingPost?.id === post.id) {
        setFormData({
          title: '',
          excerpt: '',
          content: '',
          author: 'FXMed Team',
          category: 'Health Education',
          thumbnail_url: '',
          thumbnail_alt: ''
        })
        setEditingPost(null)
      }
      
      setNotification({ message: 'Post deleted successfully!', type: 'success' })
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Error deleting post:', error)
      setNotification({ message: 'Error deleting post. Please try again.', type: 'error' })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const drafts = posts.filter(post => post.status === 'draft')
  const publishedPosts = posts.filter(post => post.status === 'published')

  // Handle AI-generated content
  const handleAIApply = (content: {
    title: string
    excerpt: string
    content: string
    category: string
  }) => {
    // Check if form already has content and confirm overwrite
    const hasExistingContent = formData.title || formData.excerpt || formData.content
    if (hasExistingContent) {
      if (!confirm('This will overwrite the current content in the form. Continue?')) {
        return
      }
    }

    setFormData({
      ...formData,
      title: content.title,
      excerpt: content.excerpt,
      content: content.content,
      category: content.category
    })

    setNotification({ 
      message: 'AI-generated content applied! You can edit before publishing.', 
      type: 'success' 
    })
    setTimeout(() => setNotification(null), 5000)
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <ToastNotification 
          notification={notification} 
          onClose={() => setNotification(null)} 
        />
      )}
      
      {/* Blog Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {blogNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveBlogSection(item.id as BlogNavItem)}
            className={`px-4 py-2 rounded-lg font-dm-sans text-sm font-medium transition-colors ${
              activeBlogSection === item.id
                ? 'bg-green-deep text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeBlogSection === "new-blog" && (
        <>
          {/* AI Generation Panel */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-[20px] p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-dm-sans font-bold text-purple-700">
                AI Content Assistant
              </h3>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                Generate complete blog posts
              </span>
            </div>
            <p className="text-gray-600 mb-4">
              Use AI to generate complete blog content from a simple prompt or topic idea.
            </p>
            <ContentGenerationPanel 
              onApplyContent={handleAIApply}
              currentCategory={formData.category}
            />
          </div>

          <div className="bg-white rounded-[20px] p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-dm-sans font-bold text-green-deep">
                {editingPost 
                  ? (editingPost.status === 'published' ? 'Edit Published Post' : 'Edit Draft')
                  : 'Create New Blog Post'
                }
              </h2>
              <p className="text-text-mid mt-1">
                {editingPost 
                  ? (editingPost.status === 'published' ? 'Update your published post' : 'Update your draft post')
                  : 'Write and publish engaging health education content'
                }
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 bg-gold text-green-deep rounded-[12px] font-dm-sans font-semibold text-sm hover:bg-gold-light transition-colors shadow-sm"
              >
                {editingPost?.status === 'published' ? 'Save as Draft' : 'Save to Drafts'}
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-green-deep text-white rounded-[12px] font-dm-sans font-semibold text-sm hover:bg-green-700 transition-colors shadow-sm"
              >
                {editingPost 
                  ? (editingPost.status === 'published' ? 'Update Published Post' : 'Update Draft')
                  : 'Publish Now'
                }
              </button>
            </div>
          </div>

          <form onSubmit={editingPost ? handleSaveDraft : handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                    placeholder="Enter blog post title"
                    required
                  />
                </div>

                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-2">Author</label>
                  <input
                    type="text"
                    value={formData.author || ''}
                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                    placeholder="Author name"
                  />
                </div>

                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-2">Category</label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                  >
                    <option>Health Education</option>
                    <option>Preventive Care</option>
                    <option>Nutrition</option>
                    <option>Mental Health</option>
                    <option>Fitness</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-2">Excerpt</label>
                  <textarea
                    value={formData.excerpt || ''}
                    onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold"
                    placeholder="Brief description of the post"
                  />
                </div>

                <div>
                  <label className="block font-dm-sans font-medium text-green-deep mb-2">Thumbnail Image</label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setUploadingImage(true)
                          try {
                            // Create FormData for server upload
                            const uploadFormData = new FormData()
                            uploadFormData.append('file', file)
                            
                            // Upload via server API route (bypasses RLS)
                            const response = await fetch('/api/upload-image', {
                              method: 'POST',
                              body: uploadFormData,
                            })
                            
                            if (!response.ok) {
                              const errorData = await response.json()
                              console.error('Upload API error:', errorData)
                              setNotification({ message: `Upload failed: ${errorData.error || 'Unknown error'}`, type: 'error' })
                              setTimeout(() => setNotification(null), 5000)
                              return
                            }
                            
                            const result = await response.json()
                            
                            if (result.success && result.url) {
                              setFormData({...formData, thumbnail_url: result.url})
                              setNotification({ message: 'Image uploaded successfully!', type: 'success' })
                              setTimeout(() => setNotification(null), 3000)
                            } else {
                              console.error('Upload returned no URL')
                              setNotification({ message: 'Error: Could not get image URL', type: 'error' })
                              setTimeout(() => setNotification(null), 5000)
                            }
                          } catch (error: any) {
                            console.error('Exception during upload:', error)
                            setNotification({ message: `Error: ${error?.message || 'Upload failed'}`, type: 'error' })
                            setTimeout(() => setNotification(null), 5000)
                          } finally {
                            setUploadingImage(false)
                          }
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold file:text-green-deep hover:file:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {uploadingImage && (
                      <p className="text-sm text-green-mid font-dm-sans">Uploading image...</p>
                    )}
                    <div>
                      <label className="block font-dm-sans font-medium text-green-deep mb-1 text-sm">Alt Text (for accessibility)</label>
                      <input
                        type="text"
                        value={formData.thumbnail_alt || ''}
                        onChange={(e) => setFormData({...formData, thumbnail_alt: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold text-sm"
                        placeholder="Describe the image for screen readers (e.g., 'Doctor consulting with patient in modern clinic')"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-dm-sans">
                        Alt text helps visually impaired users understand the image content
                      </p>
                    </div>
                    {formData.thumbnail_url && (
                      <div className="mt-2">
                        <div className="relative w-full h-32 rounded-lg border border-green-deep/20 overflow-hidden">
                          <Image
                            src={formData.thumbnail_url}
                            alt={formData.thumbnail_alt || "Thumbnail preview"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, thumbnail_url: '', thumbnail_alt: ''})}
                          className="mt-2 text-sm text-red-600 hover:text-red-800 font-dm-sans"
                        >
                          Remove image
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Field - Full Width */}
            <div className="mt-6">
              <label className="block font-dm-sans font-medium text-green-deep mb-2">Content</label>
              <div className="border border-green-deep/20 rounded-lg overflow-hidden">
                <ReactQuill
                  value={formData.content || ''}
                  onChange={(content) => setFormData({...formData, content})}
                  placeholder="Write your blog post content here..."
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      ['blockquote', 'code-block'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'script': 'sub'}, { 'script': 'super' }],
                      [{ 'indent': '-1'}, { 'indent': '+1' }],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'align': [] }],
                      ['link', 'image'],
                      ['clean']
                    ]
                  }}
                  formats={[
                    'header', 'bold', 'italic', 'underline', 'strike',
                    'blockquote', 'code-block', 'list', 'bullet',
                    'script', 'indent', 'color', 'background', 'align',
                    'link', 'image'
                  ]}
                  theme="snow"
                  style={{ height: '300px' }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-8 font-dm-sans">
                Use the toolbar to format your content with headings, bold, italics, lists, links, images, and more.
              </p>
            </div>
          </form>
        </div>
        </>
      )}

      {activeBlogSection === "drafts" && (
        <div className="space-y-6">
          {/* AI Assistant for Drafts */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-[20px] p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-dm-sans font-bold text-purple-700">
                AI Content Assistant
              </h3>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                Generate content for your drafts
              </span>
            </div>
            <p className="text-gray-600 mb-4">
              Use AI to generate complete blog content from your draft titles and descriptions.
            </p>
            <ContentGenerationPanel 
              onApplyContent={handleAIApply}
              currentCategory="Health Education"
            />
          </div>

          <div className="bg-white rounded-[20px] p-6 border border-gray-200">
            <h3 className="text-xl font-dm-sans font-bold text-green-deep mb-4">
              Draft Posts ({drafts.length})
            </h3>
            <p className="text-text-mid mt-1">
              Manage your saved drafts
            </p>
            <button
              onClick={() => setActiveBlogSection("new-blog")}
              className="px-4 py-2 bg-green-deep text-white rounded-[12px] font-dm-sans font-semibold text-sm hover:bg-green-700 transition-colors shadow-sm"
            >
              + New Post
            </button>
          </div>

          {drafts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 font-dm-sans">No drafts yet. Start writing!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {drafts.map((post) => (
                <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:border-gold/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-dm-sans font-semibold text-green-deep mb-1">{post.title}</h3>
                      <p className="text-sm text-gray-600 font-dm-sans mb-2">{post.excerpt}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{post.category}</span>
                        <span>{post.read_time}</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreviewPost(post)}
                        className="px-3 py-1 bg-purple-500 text-white text-sm rounded font-dm-sans hover:bg-purple-600 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEditDraft(post)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded font-dm-sans hover:bg-blue-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handlePublishDraft(post)}
                        className="px-3 py-1 bg-green-deep text-white text-sm rounded font-dm-sans hover:bg-green-700 transition-colors"
                      >
                        Publish
                      </button>
                      <button
                        onClick={() => handleDelete(post)}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded font-dm-sans hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeBlogSection === "posted" && (
        <div className="bg-white rounded-[20px] p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-dm-sans font-bold text-green-deep">
                Published Posts
              </h2>
              <p className="text-text-mid mt-1">
                Manage your live blog posts
              </p>
            </div>
          </div>

          {publishedPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 font-dm-sans">No published posts yet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {publishedPosts.map((post) => (
                <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:border-gold/50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      {post.thumbnail_url ? (
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                          <Image
                            src={post.thumbnail_url}
                            alt={post.thumbnail_alt || post.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-dm-sans font-semibold text-green-deep mb-1">{post.title}</h3>
                      <p className="text-sm text-gray-600 font-dm-sans mb-2 line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{post.category}</span>
                        <span>{post.read_time}</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setPreviewPost(post)}
                        className="px-3 py-1 bg-purple-500 text-white text-sm rounded font-dm-sans hover:bg-purple-600 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEditPost(post)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded font-dm-sans hover:bg-blue-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(post)}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded font-dm-sans hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewPost && (
        <PreviewModal 
          post={previewPost} 
          onClose={() => setPreviewPost(null)} 
        />
      )}
    </div>
  )
}
