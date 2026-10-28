import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'

// Finds where scanned pages ask for a stamp. The stamp tool reads text pages
// itself in the browser; pages with no text layer come here as images, and
// Claude says where on each one a stamp is asked for.

export const runtime = 'nodejs'

// Newest first; the second is tried if the first fails or declines.
const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5']
const MAX_PAGES = 10
const MAX_IMAGE_BASE64 = 2_000_000
// Larger images are scaled down by the model, which would shift coordinates.
const MAX_EDGE = 2576

type PageInput = { page: number; width: number; height: number; image: string }
type Box = { left: number; top: number; right: number; bottom: number }
type Found = { page: number; label: string; labelBox: Box | null; area: Box | null }

const boxSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['left', 'top', 'right', 'bottom'],
  properties: { left: { type: 'number' }, top: { type: 'number' }, right: { type: 'number' }, bottom: { type: 'number' } },
}

const outputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['requests'],
  properties: {
    requests: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['page', 'label', 'labelBox', 'area'],
        properties: {
          page: { type: 'integer' },
          label: { type: 'string' },
          labelBox: { anyOf: [boxSchema, { type: 'null' }] },
          area: { anyOf: [boxSchema, { type: 'null' }] },
        },
      },
    },
  },
}

const INSTRUCTIONS = `You look at the pages of a document and find every place where it asks for an official stamp or seal to be applied: for example a box or line labelled "Hospital stamp", "Official stamp", "Company seal", "Signature and stamp", "Stamp here" or "Affix stamp".

For each place, give:
- page: the page number given with that image.
- label: the words asking for the stamp, as written on the page.
- labelBox: a box around those words.
- area: the empty space meant for the stamp, such as the box, blank line or clear space beside or under the label. Use null when there is no clear space for it.

Leave out:
- places that ask only for a signature, date, name or thumbprint;
- "stamp duty", postage stamps, and stamps mentioned in ordinary sentences that do not say where to put one;
- places that already carry a stamp.

Boxes are in pixels of that page's image: left and right measured from the left edge, top and bottom from the top edge. Each image's size is given before it. If no page asks for a stamp, return an empty list.`

function readPages(body: unknown): PageInput[] | string {
  const pages = (body as { pages?: unknown })?.pages
  if (!Array.isArray(pages) || !pages.length) return 'No pages were sent.'
  if (pages.length > MAX_PAGES) return `Up to ${MAX_PAGES} pages can be checked at a time.`
  const result: PageInput[] = []
  for (const item of pages) {
    const page = Number(item?.page)
    const width = Number(item?.width)
    const height = Number(item?.height)
    const image = typeof item?.image === 'string' ? item.image : ''
    if (!Number.isInteger(page) || page < 1) return 'A page number is missing.'
    if (!(width > 0 && height > 0 && width <= MAX_EDGE && height <= MAX_EDGE)) return `Page ${page} has an unexpected size.`
    if (!image || image.length > MAX_IMAGE_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(image)) return `Page ${page} could not be read.`
    result.push({ page, width, height, image })
  }
  return result
}

function cleanBox(value: unknown, page: PageInput): Box | null {
  const box = value as Partial<Box> | null
  if (!box) return null
  const numbers = [box.left, box.top, box.right, box.bottom].map(Number)
  if (numbers.some(number => !Number.isFinite(number))) return null
  const [left, top, right, bottom] = numbers
  const clamp = (number: number, max: number) => Math.max(0, Math.min(max, number))
  const clean = {
    left: clamp(Math.min(left, right), page.width),
    right: clamp(Math.max(left, right), page.width),
    top: clamp(Math.min(top, bottom), page.height),
    bottom: clamp(Math.max(top, bottom), page.height),
  }
  return clean.right - clean.left >= 2 && clean.bottom - clean.top >= 2 ? clean : null
}

function readAnswer(text: string, pages: PageInput[]): Found[] {
  const parsed = JSON.parse(text) as { requests?: unknown[] }
  const found: Found[] = []
  for (const item of parsed.requests || []) {
    const entry = item as Record<string, unknown>
    const page = pages.find(input => input.page === Number(entry.page))
    if (!page) continue
    const labelBox = cleanBox(entry.labelBox, page)
    const area = cleanBox(entry.area, page)
    if (!labelBox && !area) continue
    found.push({ page: page.page, label: String(entry.label || '').slice(0, 120), labelBox, area })
  }
  return found
}

export async function POST(request: NextRequest) {
  if (!await getAuthorizedAdminRole(request, 'tools')) {
    return NextResponse.json({ error: 'Tools access required' }, { status: 403 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Scanned pages cannot be checked because the AI service is not set up.' }, { status: 503 })
  }

  const pages = readPages(await request.json().catch(() => null))
  if (typeof pages === 'string') return NextResponse.json({ error: pages }, { status: 400 })

  const content: Anthropic.ContentBlockParam[] = []
  for (const page of pages) {
    content.push({ type: 'text', text: `Page ${page.page} (${page.width} × ${page.height} pixels):` })
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: page.image } })
  }
  content.push({ type: 'text', text: 'Find the places on these pages that ask for a stamp.' })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const failures: string[] = []
  for (const model of MODELS) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 16000,
        system: INSTRUCTIONS,
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: outputSchema } },
        messages: [{ role: 'user', content }],
      })
      if (response.stop_reason === 'refusal') {
        failures.push(`${model}: declined`)
        continue
      }
      const text = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')?.text
      if (!text) {
        failures.push(`${model}: empty answer (${response.stop_reason})`)
        continue
      }
      return NextResponse.json({ requests: readAnswer(text, pages), model })
    } catch (error) {
      failures.push(`${model}: ${error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : error instanceof Error ? error.message : 'failed'}`)
    }
  }
  console.error('Stamp locations could not be found:', failures.join('; '))
  return NextResponse.json({ error: 'The scanned pages could not be checked just now. Place the stamp by clicking on the page.' }, { status: 502 })
}
