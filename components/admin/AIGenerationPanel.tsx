'use client'

import { useState, useEffect } from 'react'
import { stripHtml } from '@/lib/content-sanitizer'

interface GeneratedContent {
  title: string
  excerpt: string
  content: string
  suggestedTags: string[]
  suggestedCategory: string
}

interface ContentGenerationPanelProps {
  onApplyContent: (content: {
    title: string
    excerpt: string
    content: string
    category: string
  }) => void
  currentCategory?: string
}

export default function ContentGenerationPanel({ onApplyContent, currentCategory }: ContentGenerationPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [provider, setProvider] = useState('')
  const [availableProviders, setAvailableProviders] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingProviders, setLoadingProviders] = useState(true)

  // Fetch available providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch('/api/generate-blog')
        if (response.ok) {
          const data = await response.json()
          setAvailableProviders(data.available)
          if (data.default) {
            setProvider(data.default)
          }
        }
      } catch (error) {
        console.error('Error fetching providers:', error)
      } finally {
        setLoadingProviders(false)
      }
    }

    fetchProviders()
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setGenerating(true)
    setError(null)
    setGeneratedContent(null)

    try {
      const response = await fetch('/api/generate-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          provider,
          category: currentCategory || 'Health Education'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content')
      }

      setGeneratedContent(data.generated)
    } catch (error: any) {
      console.error('Error generating content:', error)
      setError(error?.message || 'Failed to generate content. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleApply = () => {
    if (!generatedContent) return

    onApplyContent({
      title: generatedContent.title,
      excerpt: generatedContent.excerpt,
      content: generatedContent.content,
      category: generatedContent.suggestedCategory || currentCategory || 'Health Education'
    })
  }

  const handleRetry = () => {
    setError(null)
    handleGenerate()
  }

  // Provider name mapping for display
  const providerDisplayName = (name: string) => {
    const map: Record<string, string> = {
      'openai': 'OpenAI GPT-4',
      'anthropic': 'Anthropic Claude',
      'google': 'Google Gemini'
    }
    return map[name] || name
  }

  return (
    <div className="mb-6 border border-gold/30 rounded-[20px] overflow-hidden bg-gradient-to-br from-gold/5 to-transparent">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gold/10 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
            <svg className="w-6 h-6 text-green-deep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="font-dm-sans font-semibold text-green-deep">
              ✨ Blog Assistant
            </h3>
            <p className="text-sm text-text-mid">
              Generate blog posts with content assistance
            </p>
          </div>
        </div>
        <svg 
          className={`w-5 h-5 text-green-deep transition-transform ${expanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-6 pb-6">
          {/* Provider Loading State */}
          {loadingProviders ? (
            <div className="py-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-deep mx-auto"></div>
              <p className="text-sm text-text-mid mt-2">Checking content providers...</p>
            </div>
          ) : availableProviders.length === 0 ? (
            <div className="py-4 px-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">
                ⚠️ No content providers configured. Please add API keys to your environment variables.
              </p>
            </div>
          ) : (
            <>
              {/* Provider Selector */}
              <div className="mb-4">
                <label className="block font-dm-sans font-medium text-green-deep mb-2 text-sm">
                  Content Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold text-sm"
                >
                  {availableProviders.map((p) => (
                    <option key={p} value={p}>
                      {providerDisplayName(p)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prompt Input */}
              <div className="mb-4">
                <label className="block font-dm-sans font-medium text-green-deep mb-2 text-sm">
                  What should the blog post be about? *
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="E.g., 'Benefits of functional medicine for managing diabetes', 'How to improve gut health naturally', 'Top 5 preventive health screenings for women over 40'"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-green-deep/20 focus:outline-none focus:border-gold text-sm"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {prompt.length}/500 characters
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-deep to-green-mid text-white rounded-lg font-dm-sans font-semibold hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {generating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating blog post...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Blog Post
                  </span>
                )}
              </button>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-red-700 text-sm">{error}</p>
                      <button
                        onClick={handleRetry}
                        className="mt-2 text-sm text-red-600 hover:text-red-800 font-semibold"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Generated Content Preview */}
              {generatedContent && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-dm-sans font-semibold text-green-deep">
                      ✨ Generated Content
                    </h4>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Generated Content
                    </span>
                  </div>

                  {/* Title Preview */}
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-gray-600 uppercase">Title</label>
                    <p className="text-sm font-medium text-green-deep">{generatedContent.title}</p>
                  </div>

                  {/* Excerpt Preview */}
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-gray-600 uppercase">Excerpt</label>
                    <p className="text-sm text-text-mid">{generatedContent.excerpt}</p>
                  </div>

                  {/* Content Preview */}
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-gray-600 uppercase">Content Preview</label>
                    <div className="text-sm text-text-mid mt-1 max-h-32 overflow-y-auto p-2 bg-white rounded border border-green-100">
                      {stripHtml(generatedContent.content).substring(0, 300)}...
                    </div>
                  </div>

                  {/* Suggested Tags */}
                  {generatedContent.suggestedTags.length > 0 && (
                    <div className="mb-3">
                      <label className="text-xs font-semibold text-gray-600 uppercase">Suggested Tags</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {generatedContent.suggestedTags.map((tag, i) => (
                          <span key={i} className="text-xs bg-gold/20 text-green-deep px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Category */}
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-600 uppercase">Suggested Category</label>
                    <p className="text-sm text-text-mid">{generatedContent.suggestedCategory}</p>
                  </div>

                  {/* Apply Button */}
                  <button
                    onClick={handleApply}
                    className="w-full px-4 py-2 bg-gold text-green-deep rounded-lg font-dm-sans font-semibold hover:bg-gold-light transition-colors"
                  >
                    Apply to Blog Form
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
