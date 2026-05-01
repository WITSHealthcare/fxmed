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

class HuggingFaceProvider implements AIProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string = 'mistralai/Mistral-7B-Instruct-v0.2') {
    this.apiKey = apiKey
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
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: `<s>[INST] ${systemPrompt}\n\n${userPrompt} [/INST]`,
            parameters: {
              max_new_tokens: 2000,
              temperature: 0.7,
              do_sample: true,
              return_full_text: false,
            }
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Hugging Face API error: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const data = await response.json()
      const content = data[0]?.generated_text || '{}'
      
      return this.parseResponse(content)
    } catch (error) {
      console.error('Hugging Face API error:', error)
      throw new Error('Failed to generate content with Hugging Face')
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
      console.error('Failed to parse Hugging Face response:', error)
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

export function createHuggingFaceProvider(apiKey?: string, model?: string): AIProvider {
  if (!apiKey) {
    throw new Error('Hugging Face API key is required')
  }
  return new HuggingFaceProvider(apiKey, model)
}
