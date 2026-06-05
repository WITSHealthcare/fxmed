import { promises as fs } from 'fs'
import path from 'path'
import JSZip from 'jszip'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { canAccessTab, getUserAdminRole } from '@/lib/admin-auth'

export const runtime = 'nodejs'

const PDF_CONTENT_TYPE = 'application/pdf'
const MAX_FILE_SIZE = 12 * 1024 * 1024
const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png')
const GEMINI_MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
]
const DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image'

type MealPlan = {
  title: string
  subtitle: string
  clientName?: string
  overview: string
  notes: string[]
  days: Array<{
    day: string
    theme?: string
    meals: Array<{
      name: string
      time?: string
      description: string
      foodItems: Array<{
        name: string
        imagePrompt: string
      }>
    }>
  }>
}

type PdfContext = {
  pdf: PDFDocument
  page: PDFPage
  width: number
  height: number
  y: number
  fonts: {
    regular: PDFFont
    bold: PDFFont
  }
  logoImage?: Awaited<ReturnType<PDFDocument['embedPng']>>
}

async function getRequestRole(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase auth configuration is missing')
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {
        // This route only reads auth state.
      },
    },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  return getUserAdminRole(user)
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

async function extractDocxText(file: File) {
  const zip = await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()))
  const documentFile = zip.file('word/document.xml')

  if (!documentFile) {
    throw new Error('This does not look like a valid Word .docx file')
  }

  const documentXml = await documentFile.async('string')
  const paragraphs = Array.from(documentXml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g))
    .map((match) => {
      const paragraphXml = match[1]
        .replace(/<w:tab\b[^>]*\/>/g, ' ')
        .replace(/<w:br\b[^>]*\/>/g, '\n')
      return Array.from(paragraphXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g))
        .map((textMatch) => decodeXml(textMatch[1]))
        .join('')
        .replace(/\s+/g, ' ')
        .trim()
    })
    .filter(Boolean)

  return paragraphs.join('\n')
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenced?.[1]) return fenced[1]

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }

  return text
}

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeMealPlan(value: any, sourceText: string): MealPlan {
  const rawDays = Array.isArray(value?.days) ? value.days : []
  const days = rawDays.map((day: any, dayIndex: number) => {
    const meals = Array.isArray(day?.meals) ? day.meals : []

    return {
      day: normalizeText(day?.day, `Day ${dayIndex + 1}`),
      theme: normalizeText(day?.theme),
      meals: meals.map((meal: any) => {
        const rawFoodItems = Array.isArray(meal?.foodItems) ? meal.foodItems : []
        const foodItems = rawFoodItems
          .map((item: any) => {
            const name = normalizeText(typeof item === 'string' ? item : item?.name)
            if (!name) return null
            return {
              name,
              imagePrompt: normalizeText(
                item?.imagePrompt,
                `A clean editorial food photo of ${name}, healthy functional medicine meal styling, natural daylight, white background`
              ),
            }
          })
          .filter(Boolean) as MealPlan['days'][number]['meals'][number]['foodItems']

        return {
          name: normalizeText(meal?.name, 'Meal'),
          time: normalizeText(meal?.time),
          description: normalizeText(meal?.description),
          foodItems,
        }
      }).filter((meal: MealPlan['days'][number]['meals'][number]) => meal.description || meal.foodItems.length > 0),
    }
  }).filter((day: MealPlan['days'][number]) => day.meals.length > 0)

  if (days.length > 0) {
    return {
      title: normalizeText(value?.title, 'FXMed Meal Plan'),
      subtitle: normalizeText(value?.subtitle, 'Personalized nutrition guide'),
      clientName: normalizeText(value?.clientName),
      overview: normalizeText(value?.overview, 'A structured meal plan prepared for branded client delivery.'),
      notes: Array.isArray(value?.notes) ? value.notes.map((note: unknown) => String(note).trim()).filter(Boolean).slice(0, 8) : [],
      days,
    }
  }

  return {
    title: 'FXMed Meal Plan',
    subtitle: 'Personalized nutrition guide',
    overview: 'A structured meal plan prepared for branded client delivery.',
    notes: [],
    days: [{
      day: 'Meal Plan',
      meals: [{
        name: 'Plan Details',
        description: sourceText,
        foodItems: [],
      }],
    }],
  }
}

function getMealPlanPrompt(sourceText: string) {
  return `You are an FXMed nutrition document designer.

Read the DOCX meal plan text and transform it into a polished branded meal-plan structure. Preserve the source facts. Do not invent medical details, client details, calories, macros, allergies, or restrictions that are not present.

Identify every specific food item mentioned in each meal so the app can render it as an image. Prefer concrete food names like "grilled salmon", "avocado", "oats", "steamed broccoli", not generic words like "breakfast".

Return ONLY valid JSON in this shape:
{
  "title": "Short meal plan title",
  "subtitle": "Short subtitle",
  "clientName": "Client name if present, otherwise empty string",
  "overview": "Brief polished summary",
  "notes": ["Important preparation, hydration, or clinical notes that are already present"],
  "days": [
    {
      "day": "Day 1 or Monday",
      "theme": "Optional theme",
      "meals": [
        {
          "name": "Breakfast",
          "time": "Optional time",
          "description": "Clean meal instructions from source",
          "foodItems": [
            {
              "name": "Food item name",
              "imagePrompt": "Photorealistic healthy food image prompt for this exact item, no text, no logos"
            }
          ]
        }
      ]
    }
  ]
}

DOCX text:
${sourceText.slice(0, 30000)}`
}

async function tryGeminiMealPlan(sourceText: string) {
  if (!process.env.GOOGLE_AI_API_KEY) return null

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)

  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(getMealPlanPrompt(sourceText))
      return result.response.text()
    } catch (error) {
      console.warn(`Gemini model ${modelName} failed for meal-plan structuring:`, error)
    }
  }

  return null
}

async function tryOpenAIMealPlan(sourceText: string) {
  if (!process.env.OPENAI_API_KEY) return null

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You structure DOCX meal plans into strict JSON for branded PDF generation. Return only valid JSON.' },
      { role: 'user', content: getMealPlanPrompt(sourceText) },
    ],
    temperature: 0.2,
  })

  return response.choices[0]?.message?.content || null
}

async function tryClaudeMealPlan(sourceText: string) {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_TEXT_MODEL || 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: 'You structure DOCX meal plans into strict JSON for branded PDF generation. Return only valid JSON.',
    messages: [{ role: 'user', content: getMealPlanPrompt(sourceText) }],
  })
  const textBlock = response.content.find((block) => block.type === 'text') as Anthropic.TextBlock | undefined

  return textBlock?.text || null
}

async function structureMealPlanWithAi(sourceText: string) {
  const providers = [
    tryGeminiMealPlan,
    tryOpenAIMealPlan,
    tryClaudeMealPlan,
  ]

  for (const provider of providers) {
    try {
      const response = await provider(sourceText)
      if (response) return normalizeMealPlan(JSON.parse(extractJsonObject(response)), sourceText)
    } catch (error) {
      console.warn('Meal-plan AI provider failed:', error)
    }
  }

  return normalizeMealPlan(null, sourceText)
}

function collectFoodItems(plan: MealPlan) {
  const items = new Map<string, { name: string; prompt: string }>()

  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const item of meal.foodItems) {
        const key = item.name.toLowerCase()
        if (!items.has(key)) items.set(key, { name: item.name, prompt: item.imagePrompt })
      }
    }
  }

  return Array.from(items.values()).slice(0, 40)
}

async function generateFoodImages(plan: MealPlan) {
  const images = new Map<string, Uint8Array>()

  for (const item of collectFoodItems(plan)) {
    const prompt = getFoodImagePrompt(item.prompt)
    const imageBytes = await generateFoodImage(prompt, item.name)
    if (imageBytes) {
      images.set(item.name.toLowerCase(), imageBytes)
    }
  }

  return images
}

function getFoodImagePrompt(prompt: string) {
  return `${prompt}. Single food item or meal, appetizing but clinical wellness brand style, natural daylight, no text, no logo, no watermark.`
}

async function tryGeminiFoodImage(prompt: string) {
  if (!process.env.GOOGLE_AI_API_KEY) return null

  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GOOGLE_AI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }],
      }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `Gemini image generation failed with status ${response.status}`)
  }

  const data = await response.json()
  const parts = data?.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((part: any) => part?.inlineData?.data || part?.inline_data?.data)
  const base64 = imagePart?.inlineData?.data || imagePart?.inline_data?.data

  return base64 ? Buffer.from(base64, 'base64') : null
}

async function generateFoodImage(prompt: string, itemName: string) {
  try {
    return await tryGeminiFoodImage(prompt)
  } catch (error) {
    console.warn(`Gemini food image generation failed for ${itemName}:`, error)
  }

  return null
}

function sanitizeDownloadName(filename: string) {
  const baseName = filename.replace(/\.docx$/i, '').replace(/[^a-z0-9-_ ]/gi, '').trim() || 'meal-plan'
  return `${baseName}-fxmed-meal-plan.pdf`
}

function toArrayBuffer(bytes: Uint8Array) {
  const responseBody = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(responseBody).set(bytes)
  return responseBody
}

function makePdfSafeText(text: string) {
  return text
    .replace(/[≤⩽]/g, '<=')
    .replace(/[≥⩾]/g, '>=')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[•·]/g, '-')
    .replace(/[×]/g, 'x')
    .replace(/[÷]/g, '/')
    .replace(/[₦]/g, 'NGN ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = makePdfSafeText(text).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
    } else {
      if (current) lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  options: { font: PDFFont; size: number; maxWidth: number; color?: ReturnType<typeof rgb>; lineHeight?: number }
) {
  const lineHeight = options.lineHeight || options.size * 1.35
  const lines = wrapText(text, options.font, options.size, options.maxWidth)
  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - (index * lineHeight),
      size: options.size,
      font: options.font,
      color: options.color || rgb(0.16, 0.22, 0.2),
    })
  })

  return y - (lines.length * lineHeight)
}

async function tryEmbedLogo(pdf: PDFDocument) {
  try {
    const logoBytes = await fs.readFile(LOGO_PATH)
    return await pdf.embedPng(logoBytes)
  } catch {
    return undefined
  }
}

function drawPageChrome(ctx: PdfContext, label = 'Meal Plan') {
  const { page, width, height, fonts, logoImage } = ctx

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.988, 1, 0.941) })
  page.drawRectangle({ x: 0, y: height - 88, width, height: 88, color: rgb(0.043, 0.204, 0.145) })
  page.drawRectangle({ x: 0, y: height - 92, width, height: 4, color: rgb(0.87, 0.69, 0.33) })

  if (logoImage) {
    const logoWidth = 72
    const logoHeight = (logoImage.height / logoImage.width) * logoWidth
    page.drawImage(logoImage, { x: 42, y: height - 64, width: logoWidth, height: logoHeight })
  } else {
    page.drawText(makePdfSafeText('FXMed'), { x: 42, y: height - 54, size: 18, font: fonts.bold, color: rgb(0.988, 1, 0.941) })
  }

  page.drawText(makePdfSafeText(label), {
    x: width - 140,
    y: height - 54,
    size: 11,
    font: fonts.bold,
    color: rgb(0.87, 0.69, 0.33),
  })

  page.drawText(makePdfSafeText('Functional Medicine | Nutrition | Wellness'), {
    x: 42,
    y: 28,
    size: 8,
    font: fonts.regular,
    color: rgb(0.35, 0.43, 0.39),
  })
}

function addPage(ctx: PdfContext, label?: string) {
  ctx.page = ctx.pdf.addPage([ctx.width, ctx.height])
  ctx.y = ctx.height - 122
  drawPageChrome(ctx, label)
}

function ensureSpace(ctx: PdfContext, required: number, label?: string) {
  if (ctx.y - required < 64) addPage(ctx, label)
}

function drawSectionTitle(ctx: PdfContext, text: string) {
  ensureSpace(ctx, 38, text)
  ctx.page.drawText(makePdfSafeText(text), {
    x: 42,
    y: ctx.y,
    size: 17,
    font: ctx.fonts.bold,
    color: rgb(0.043, 0.204, 0.145),
  })
  ctx.y -= 28
}

async function drawFoodImage(ctx: PdfContext, x: number, y: number, itemName: string, imageBytes?: Uint8Array) {
  const width = 86
  const height = 72

  ctx.page.drawRectangle({ x, y, width, height, color: rgb(1, 1, 1), borderColor: rgb(0.86, 0.9, 0.86), borderWidth: 1 })

  if (imageBytes) {
    try {
      const image = await ctx.pdf.embedPng(imageBytes)
      ctx.page.drawImage(image, { x: x + 2, y: y + 2, width: width - 4, height: height - 4 })
      return
    } catch {
      try {
        const image = await ctx.pdf.embedJpg(imageBytes)
        ctx.page.drawImage(image, { x: x + 2, y: y + 2, width: width - 4, height: height - 4 })
        return
      } catch {
        // Draw the text fallback below.
      }
    }
  }

  ctx.page.drawRectangle({ x: x + 8, y: y + 8, width: width - 16, height: height - 16, color: rgb(0.94, 0.97, 0.9) })
  const lines = wrapText(itemName, ctx.fonts.bold, 8, width - 20).slice(0, 4)
  lines.forEach((line, index) => {
    ctx.page.drawText(line, {
      x: x + 10,
      y: y + 44 - (index * 10),
      size: 8,
      font: ctx.fonts.bold,
      color: rgb(0.043, 0.204, 0.145),
    })
  })
}

async function drawMeal(ctx: PdfContext, meal: MealPlan['days'][number]['meals'][number], images: Map<string, Uint8Array>) {
  const cardHeight = Math.max(112, 78 + (meal.foodItems.length > 0 ? 76 : 0))
  ensureSpace(ctx, cardHeight + 12, meal.name)

  const cardY = ctx.y - cardHeight
  ctx.page.drawRectangle({
    x: 36,
    y: cardY,
    width: ctx.width - 72,
    height: cardHeight,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.86, 0.9, 0.86),
    borderWidth: 1,
  })

  ctx.page.drawText(makePdfSafeText(meal.name), {
    x: 54,
    y: ctx.y - 24,
    size: 13,
    font: ctx.fonts.bold,
    color: rgb(0.043, 0.204, 0.145),
  })

  if (meal.time) {
    ctx.page.drawText(makePdfSafeText(meal.time), {
      x: ctx.width - 118,
      y: ctx.y - 24,
      size: 9,
      font: ctx.fonts.bold,
      color: rgb(0.67, 0.5, 0.18),
    })
  }

  let textY = drawWrappedText(ctx.page, meal.description, 54, ctx.y - 44, {
    font: ctx.fonts.regular,
    size: 9.5,
    maxWidth: ctx.width - 108,
    lineHeight: 13,
  })

  if (meal.foodItems.length > 0) {
    ctx.y = textY - 8
    const shownItems = meal.foodItems.slice(0, 5)
    let imageX = 54
    const imageY = cardY + 14

    for (const item of shownItems) {
      await drawFoodImage(ctx, imageX, imageY, item.name, images.get(item.name.toLowerCase()))
      const lines = wrapText(item.name, ctx.fonts.bold, 8, 82).slice(0, 2)
      lines.forEach((line, index) => {
        ctx.page.drawText(line, {
          x: imageX,
          y: imageY - 2 - (index * 9),
          size: 8,
          font: ctx.fonts.bold,
          color: rgb(0.16, 0.22, 0.2),
        })
      })
      imageX += 98
    }
  }

  ctx.y = cardY - 16
}

async function buildMealPlanPdf(plan: MealPlan, images: Map<string, Uint8Array>) {
  const pdf = await PDFDocument.create()
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  }
  const ctx: PdfContext = {
    pdf,
    page: pdf.addPage([595.28, 841.89]),
    width: 595.28,
    height: 841.89,
    y: 690,
    fonts,
    logoImage: await tryEmbedLogo(pdf),
  }

  drawPageChrome(ctx)
  ctx.page.drawText(makePdfSafeText(plan.title), {
    x: 42,
    y: 682,
    size: 28,
    font: fonts.bold,
    color: rgb(0.043, 0.204, 0.145),
  })
  ctx.y = drawWrappedText(ctx.page, plan.subtitle, 42, 646, {
    font: fonts.bold,
    size: 12,
    maxWidth: 460,
    color: rgb(0.67, 0.5, 0.18),
  }) - 8

  if (plan.clientName) {
    ctx.page.drawText(makePdfSafeText(`Prepared for ${plan.clientName}`), {
      x: 42,
      y: ctx.y,
      size: 10,
      font: fonts.bold,
      color: rgb(0.16, 0.22, 0.2),
    })
    ctx.y -= 26
  }

  drawSectionTitle(ctx, 'Overview')
  ctx.y = drawWrappedText(ctx.page, plan.overview, 42, ctx.y, {
    font: fonts.regular,
    size: 10.5,
    maxWidth: 510,
    lineHeight: 15,
  }) - 12

  if (plan.notes.length > 0) {
    drawSectionTitle(ctx, 'Notes')
    for (const note of plan.notes) {
      ensureSpace(ctx, 28, 'Notes')
      ctx.page.drawText('-', { x: 46, y: ctx.y, size: 10, font: fonts.bold, color: rgb(0.87, 0.69, 0.33) })
      ctx.y = drawWrappedText(ctx.page, note, 62, ctx.y, {
        font: fonts.regular,
        size: 9.5,
        maxWidth: 480,
        lineHeight: 13,
      }) - 5
    }
  }

  for (const day of plan.days) {
    drawSectionTitle(ctx, day.theme ? `${day.day}: ${day.theme}` : day.day)
    for (const meal of day.meals) {
      await drawMeal(ctx, meal, images)
    }
  }

  return pdf.save()
}

export async function POST(request: NextRequest) {
  try {
    const role = await getRequestRole(request)
    if (!canAccessTab(role, 'tools')) {
      return NextResponse.json({ error: 'Tools access required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('document')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A Word .docx meal-plan document is required' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ error: 'Meal plans must be uploaded as .docx files' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Please upload a meal-plan document smaller than 12MB' }, { status: 400 })
    }

    const sourceText = await extractDocxText(file)
    if (!sourceText.trim()) {
      return NextResponse.json({ error: 'No readable meal-plan text was found in this DOCX file' }, { status: 400 })
    }

    const mealPlan = await structureMealPlanWithAi(sourceText)
    const images = await generateFoodImages(mealPlan)
    const pdfBytes = await buildMealPlanPdf(mealPlan, images)

    return new NextResponse(toArrayBuffer(pdfBytes), {
      headers: {
        'Content-Type': PDF_CONTENT_TYPE,
        'Content-Disposition': `attachment; filename="${sanitizeDownloadName(file.name)}"`,
      },
    })
  } catch (error: any) {
    console.error('Error formatting meal plan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to format meal plan' },
      { status: 500 }
    )
  }
}
