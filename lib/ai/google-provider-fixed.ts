import { GoogleGenerativeAI } from '@google/generative-ai'

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

class GoogleProvider implements AIProvider {
  private client: GoogleGenerativeAI

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  }

  async generateBlogContent(prompt: string, category: string): Promise<AIGeneratedContent> {
    // Try different model names in order of preference
    const models = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro', 'gemini-pro-vision']
    
    for (const modelName of models) {
      try {
        const model = this.client.getGenerativeModel({ model: modelName })

        const fullPrompt = `You are a professional health and wellness content writer for FXMed, a functional medicine practice.

Write a complete blog post about: ${prompt}
Category: ${category}

Return your response in this exact JSON format:
{
  "title": "Compelling SEO-friendly title (max 60 chars)",
  "excerpt": "Engaging 2-3 sentence summary",
  "content": "Full blog post with HTML formatting (use <h2>, <h3>, <p>, <ul>, <li> tags)",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "suggestedCategory": "Health Education"
}

Content guidelines:
- Write for patients interested in functional medicine and preventive health
- Include practical, actionable advice
- Use a warm, empathetic tone
- Include 3-5 main sections with subheadings
- End with a brief conclusion or call to action
- Content should be 800-1200 words

Respond ONLY with valid JSON.`

        const result = await model.generateContent(fullPrompt)
        const response = await result.response
        const content = response.text()
        
        return this.parseResponse(content)
      } catch (error) {
        console.warn(`Model ${modelName} failed:`, error)
        continue // Try next model
      }
    }
    
    throw new Error('All Google AI models failed. Please check your API key and model availability.')
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
      console.error('Failed to parse Google response:', error)
      // Fallback to basic structure if JSON parsing fails
      return {
        title: `Blog Post about ${prompt}`,
        excerpt: content.substring(0, 200) + '...',
        content: `<h2>Introduction</h2><p>${content}</p>`,
        suggestedTags: ['health', 'wellness', 'functional medicine'],
        suggestedCategory: 'Health Education'
      }
    }
  }
}

export function createGoogleProvider(): AIProvider {
  return new GoogleProvider()
}
