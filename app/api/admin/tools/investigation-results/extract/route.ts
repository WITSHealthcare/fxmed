import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'
const MAX_FILE_SIZE = 15 * 1024 * 1024
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest']

async function hasToolsAccess(request: NextRequest) {
  return Boolean(await getAuthorizedAdminRole(request, 'tools'))
}

function parseJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const source = fenced?.[1] || text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  return JSON.parse(source)
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: NextRequest) {
  try {
    if (!await hasToolsAccess(request)) return NextResponse.json({ error: 'Tools access required' }, { status: 403 })
    if (!process.env.GOOGLE_AI_API_KEY) return NextResponse.json({ error: 'Gemini AI is not configured' }, { status: 503 })
    const form = await request.formData()
    const file = form.get('document')
    const instructions = clean(form.get('instructions'))
    if (!(file instanceof File) || file.type !== 'application/pdf') return NextResponse.json({ error: 'Upload a valid PDF file' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'PDF must be 15 MB or smaller' }, { status: 400 })
    if (!instructions) return NextResponse.json({ error: 'Specify which results to extract' }, { status: 400 })

    const prompt = `Read this laboratory investigation-results PDF and extract only the results requested by the user.

User request: ${instructions}

Return valid JSON only in this exact shape:
{"results":[{"section":"Optional panel heading such as Full Blood Count","test":"Test name","result":"Exact reported value","unit":"Unit or empty","referenceRange":"Reference range or empty","flag":"Normal, High, Low, Abnormal, or empty","remark":"Relevant report remark or empty"}]}

Rules:
- Never invent values. Copy values, units, ranges, and flags exactly from the document.
- Include only tests matching the user's request. If they request a panel, include all tests shown beneath that panel.
- Use a consistent section heading for tests belonging to the same panel.
- If a requested result is absent, omit it.
- Return an empty results array if none of the requested results can be found.`
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
    let lastError: unknown
    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: 'application/json', temperature: 0 } })
        const response = await model.generateContent([{ inlineData: { mimeType: 'application/pdf', data: Buffer.from(await file.arrayBuffer()).toString('base64') } }, { text: prompt }])
        const parsed = parseJson(response.response.text())
        const results = Array.isArray(parsed.results) ? parsed.results.map((item: Record<string, unknown>) => ({ section: clean(item.section), test: clean(item.test), result: clean(item.result), unit: clean(item.unit), referenceRange: clean(item.referenceRange), flag: clean(item.flag), remark: clean(item.remark) })).filter((item: { test: string; result: string }) => item.test && item.result) : []
        return NextResponse.json({ results })
      } catch (error) { lastError = error }
    }
    throw lastError || new Error('AI extraction failed')
  } catch (error: any) {
    console.error('Investigation PDF extraction failed:', error)
    return NextResponse.json({ error: error?.message || 'Unable to extract results from this PDF' }, { status: 500 })
  }
}
