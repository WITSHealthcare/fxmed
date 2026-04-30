import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createOllamaProvider } from './ollama-provider'
import { createSimpleProvider } from './simple-provider'

export interface AIGeneratedContent {
  title: string
  excerpt: string
  content: string
  suggestedTags: string[]
  suggestedCategory: string
}

export interface AIProvider {
  generateBlogContent(prompt: string, category: string): Promise<AIGeneratedContent>
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })
  }

  async generateBlogContent(prompt: string, category: string): Promise<AIGeneratedContent> {
    const systemPrompt = `You are a professional health and wellness content writer for FXMed, a functional medicine practice.
Your writing is authoritative yet approachable, evidence-based, and focused on empowering patients.

Generate a complete blog post in JSON format with these fields:
- title: SEO-friendly, compelling title (max 60 characters)
- excerpt: Engaging 2-3 sentence summary
- content: Full blog post with HTML formatting (use <h2>, <h3>, <p>, <ul>, <li> tags)
- suggestedTags: Array of 3-5 relevant keywords
- suggestedCategory: Best matching category

Content guidelines:
- Write for patients interested in functional medicine and preventive health
- Include practical, actionable advice
- Use a warm, empathetic tone
- Include 3-5 main sections with subheadings
- End with a brief conclusion or call to action
- Content should be 800-1200 words

Respond ONLY with valid JSON.`

    const userPrompt = `Write a blog post about: ${prompt}
Category: ${category}
Target audience: Patients seeking functional medicine care`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const content = response.choices[0]?.message?.content || '{}'
    return this.parseResponse(content)
  }

  private parseResponse(content: string): AIGeneratedContent {
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      const jsonContent = jsonMatch[1] || content;
      const parsed = JSON.parse(jsonContent);
      
      return {
        title: parsed.title || 'Untitled Blog Post',
        excerpt: parsed.excerpt || '',
        content: parsed.content || '',
        suggestedTags: parsed.suggestedTags || [],
        suggestedCategory: parsed.suggestedCategory || 'Health Education'
      }
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error)
      throw new Error('Failed to parse generated content')
    }
  }
}

class AnthropicProvider implements AIProvider {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })
  }

  async generateBlogContent(prompt: string, category: string): Promise<AIGeneratedContent> {
    const systemPrompt = `You are a professional health and wellness content writer for FXMed, a functional medicine practice. Generate blog content that is authoritative yet approachable, evidence-based, and patient-focused.`;

    const userPrompt = `Write a complete blog post about: ${prompt}
Category: ${category}

Return your response in this exact JSON format:
{
  "title": "Compelling SEO-friendly title (max 60 chars)",
  "excerpt": "Engaging 2-3 sentence summary",
  "content": "Full blog post with HTML formatting (use <h2>, <h3>, <p>, <ul>, <li> tags). Include 3-5 main sections. Content should be 800-1200 words.",
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggestedCategory": "Best matching category"
}

Guidelines:
- Target audience: Patients seeking functional medicine care
- Include practical, actionable advice
- Use warm, empathetic tone
- End with brief conclusion or call to action
- Respond ONLY with the JSON object, no markdown formatting`;

    const response = await this.client.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    })

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
    return this.parseResponse(content)
  }

  private parseResponse(content: string): AIGeneratedContent {
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      const jsonContent = jsonMatch[1] || content;
      const parsed = JSON.parse(jsonContent);
      
      return {
        title: parsed.title || 'Untitled Blog Post',
        excerpt: parsed.excerpt || '',
        content: parsed.content || '',
        suggestedTags: parsed.suggestedTags || [],
        suggestedCategory: parsed.suggestedCategory || 'Health Education'
      }
    } catch (error) {
      console.error('Failed to parse Anthropic response:', error)
      throw new Error('Failed to parse generated content')
    }
  }
}

class GoogleProvider implements AIProvider {
  private client: GoogleGenerativeAI

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  }

  async generateBlogContent(prompt: string, category: string): Promise<AIGeneratedContent> {
    const model = this.client.getGenerativeModel({ model: 'gemini-flash-latest' })

    const fullPrompt = `You are a professional health and wellness content writer for FXMed, a functional medicine practice.

Write a complete blog post about: ${prompt}
Category: ${category}

Return your response in this exact JSON format:
{
  "title": "Compelling SEO-friendly title (max 60 chars)",
  "excerpt": "Engaging 2-3 sentence summary",
  "content": "Full blog post with HTML formatting (use <h2>, <h3>, <p>, <ul>, <li> tags). Include 3-5 main sections. Content should be 800-1200 words.",
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggestedCategory": "Best matching category"
}

Guidelines:
- Target audience: Patients seeking functional medicine care
- Tone: Authoritative yet approachable, evidence-based, empowering
- Include practical, actionable advice
- Use warm, empathetic tone
- End with brief conclusion or call to action
- Respond ONLY with the JSON object`;

    const result = await model.generateContent(fullPrompt)
    const content = result.response.text()
    return this.parseResponse(content)
  }

  private parseResponse(content: string): AIGeneratedContent {
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      const jsonContent = jsonMatch[1] || content;
      const parsed = JSON.parse(jsonContent);
      
      return {
        title: parsed.title || 'Untitled Blog Post',
        excerpt: parsed.excerpt || '',
        content: parsed.content || '',
        suggestedTags: parsed.suggestedTags || [],
        suggestedCategory: parsed.suggestedCategory || 'Health Education'
      }
    } catch (error) {
      console.error('Failed to parse Google response:', error)
      throw new Error('Failed to parse generated content')
    }
  }
}

export function createAIProvider(providerName: string): AIProvider {
  switch (providerName.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider()
    case 'anthropic':
    case 'claude':
      return new AnthropicProvider()
    case 'google':
    case 'gemini':
      return new GoogleProvider()
    case 'ollama':
    case 'local':
      return createOllamaProvider()
    case 'simple':
    case 'template':
      return createSimpleProvider()
    default:
      // Default to Ollama (free) if available, otherwise try paid options, finally use simple provider
      if (process.env.OLLAMA_ENABLED === 'true') {
        return createOllamaProvider()
      } else if (process.env.OPENAI_API_KEY) {
        return new OpenAIProvider()
      } else if (process.env.ANTHROPIC_API_KEY) {
        return new AnthropicProvider()
      } else if (process.env.GOOGLE_AI_API_KEY) {
        return new GoogleProvider()
      } else {
        // Always provide a working fallback
        return createSimpleProvider()
      }
  }
}

export function getAvailableProviders(): string[] {
  const providers: string[] = []
  if (process.env.OLLAMA_ENABLED === 'true') providers.push('ollama')
  if (process.env.OPENAI_API_KEY) providers.push('openai')
  if (process.env.ANTHROPIC_API_KEY) providers.push('anthropic')
  if (process.env.GOOGLE_AI_API_KEY) providers.push('google')
  
  // Always include simple provider as fallback
  providers.push('simple')
  return providers
}
