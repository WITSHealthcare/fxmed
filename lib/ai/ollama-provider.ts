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

class OllamaProvider implements AIProvider {
  private baseUrl: string
  private model: string

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3') {
    this.baseUrl = baseUrl
    this.model = model
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
Target audience: Patients seeking functional medicine care`

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 2000,
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.response || '{}'
      
      return this.parseResponse(content)
    } catch (error) {
      console.error('Ollama API error:', error)
      throw new Error('Failed to generate content with Ollama')
    }
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
      console.error('Failed to parse Ollama response:', error)
      // Fallback to basic structure if JSON parsing fails
      return {
        title: `Blog Post about ${this.extractTopic(content)}`,
        excerpt: content.substring(0, 200) + '...',
        content: `<h2>Introduction</h2><p>${content}</p>`,
        suggestedTags: ['health', 'wellness', 'functional medicine'],
        suggestedCategory: 'Health Education'
      }
    }
  }

  private extractTopic(content: string): string {
    // Simple topic extraction - take first few words
    const words = content.split(' ').slice(0, 5).join(' ')
    return words.length > 30 ? words.substring(0, 30) + '...' : words
  }
}

export function createOllamaProvider(baseUrl?: string, model?: string): AIProvider {
  return new OllamaProvider(baseUrl, model)
}
