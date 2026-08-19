import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Models proven in this codebase. Both Gemini and Claude accept PDFs and images
// directly, which is how uploaded documents are read without local OCR.
const GEMINI_MODEL = 'gemini-1.5-flash'
const CLAUDE_MODEL = 'claude-sonnet-4-6'
const OPENAI_MODEL = 'gpt-4o'

export type ReportAttachment = {
  name: string
  mimeType: string
  base64: string
}

// Word documents cannot be passed to any provider as-is; they are listed in the
// prompt by name instead so the report still acknowledges them.
export const READABLE_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export function isReadable(mimeType: string) {
  return READABLE_MIME_TYPES.includes(mimeType)
}

async function tryGemini(prompt: string, attachments: ReportAttachment[]) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
  const parts: any[] = [{ text: prompt }]
  for (const file of attachments) parts.push({ inlineData: { mimeType: file.mimeType, data: file.base64 } })
  const result = await model.generateContent(parts)
  return result.response.text()
}

async function tryClaude(prompt: string, attachments: ReportAttachment[]) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const content: any[] = []
  for (const file of attachments) {
    if (file.mimeType === 'application/pdf') {
      content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.base64 } })
    } else {
      content.push({ type: 'image', source: { type: 'base64', media_type: file.mimeType, data: file.base64 } })
    }
  }
  content.push({ type: 'text', text: prompt })
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    messages: [{ role: 'user', content }],
  })
  return response.content.filter(block => block.type === 'text').map(block => (block as any).text).join('\n')
}

async function tryOpenAI(prompt: string, attachments: ReportAttachment[]) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  // OpenAI chat completions take images but not raw PDFs, so PDFs are dropped
  // here rather than failing the whole request.
  const images = attachments.filter(file => file.mimeType !== 'application/pdf')
  const content: any[] = [{ type: 'text', text: prompt }]
  for (const file of images) content.push({ type: 'image_url', image_url: { url: `data:${file.mimeType};base64,${file.base64}` } })
  const response = await client.chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: 8000,
    messages: [{ role: 'user', content: content as any }],
  })
  return response.choices[0]?.message?.content || ''
}

// Providers are tried in order so a single outage or quota limit does not block
// report generation. The provider that succeeded is returned for the audit log.
export async function generateClinicalReport(prompt: string, attachments: ReportAttachment[]) {
  const chain: Array<{ name: string; run: () => Promise<string> }> = []
  if (process.env.GOOGLE_AI_API_KEY) chain.push({ name: 'gemini', run: () => tryGemini(prompt, attachments) })
  if (process.env.ANTHROPIC_API_KEY) chain.push({ name: 'claude', run: () => tryClaude(prompt, attachments) })
  if (process.env.OPENAI_API_KEY) chain.push({ name: 'openai', run: () => tryOpenAI(prompt, attachments) })
  if (!chain.length) throw new Error('No AI provider is configured.')

  const failures: string[] = []
  for (const provider of chain) {
    try {
      const text = await provider.run()
      if (text && text.trim()) return { report: text.trim(), provider: provider.name }
      failures.push(`${provider.name}: empty response`)
    } catch (error) {
      failures.push(`${provider.name}: ${error instanceof Error ? error.message : 'failed'}`)
    }
  }
  throw new Error(`All AI providers failed. ${failures.join(' | ')}`)
}
