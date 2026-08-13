import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedAdminRole } from '@/lib/admin-api-auth'

export const runtime = 'nodejs'

const execFileAsync = promisify(execFile)
const HEADER_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header'
const FOOTER_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer'
const RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PDF_CONTENT_TYPE = 'application/pdf'
const WORD_HEADER_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml'
const WORD_FOOTER_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml'
const DOCX_LETTERHEAD_TEMPLATE_PATH = path.join(process.cwd(), 'public', 'templates', 'fxmed-letterhead-template.docx')
const PDF_LETTERHEAD_TEMPLATE_PATH = path.join(process.cwd(), 'public', 'templates', 'fxmed-letterhead-template.pdf')
const GEMINI_MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
]

type Relationship = {
  id: string
  type: string
  target: string
  targetMode?: string
}

type SectionReference = {
  kind: 'header' | 'footer'
  type: string
  relId: string
}

type OutputFormat = 'docx' | 'pdf'

type StructuredDocument = {
  title: string
  sections: Array<{
    heading: string
    paragraphs: string[]
  }>
}

function getNextRelationshipId(xml: string) {
  const ids = Array.from(xml.matchAll(/Id="rId(\d+)"/g)).map((match) => Number(match[1]))
  return `rId${Math.max(0, ...ids) + 1}`
}

function addRelationship(xml: string, type: string, target: string) {
  const id = getNextRelationshipId(xml)
  const relationship = `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`
  return {
    id,
    xml: xml.replace('</Relationships>', `${relationship}</Relationships>`),
  }
}

function ensureContentTypeOverride(xml: string, partName: string, contentType: string) {
  if (xml.includes(`PartName="${partName}"`)) return xml

  const override = `<Override PartName="${partName}" ContentType="${contentType}"/>`
  return xml.replace('</Types>', `${override}</Types>`)
}

function ensureContentTypeDefault(xml: string, extension: string, contentType: string) {
  if (xml.includes(`Extension="${extension}"`)) return xml

  const defaultType = `<Default Extension="${extension}" ContentType="${contentType}"/>`
  return xml.replace('</Types>', `${defaultType}</Types>`)
}

function removeHeaderFooterReferences(xml: string) {
  return xml
    .replace(/<w:headerReference\b[^>]*\/>/g, '')
    .replace(/<w:footerReference\b[^>]*\/>/g, '')
}

function applySectionFormatting(sectionXml: string, sectionReferencesXml: string, marginXml: string) {
  let updated = removeHeaderFooterReferences(sectionXml)
  updated = updated.replace(/(<w:sectPr\b[^>]*>)/, `$1${sectionReferencesXml}`)

  if (!marginXml) return updated

  if (/<w:pgMar\b[^>]*\/>/.test(updated)) {
    return updated.replace(/<w:pgMar\b[^>]*\/>/, marginXml)
  }

  return updated.replace('</w:sectPr>', `${marginXml}</w:sectPr>`)
}

function applyDocumentFormatting(xml: string, sectionReferencesXml: string, marginXml: string) {
  let updated = xml

  if (!updated.includes('xmlns:r=')) {
    updated = updated.replace('<w:document ', '<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ')
  }

  const sectionPattern = /<w:sectPr\b[^>]*>[\s\S]*?<\/w:sectPr>/g
  if (sectionPattern.test(updated)) {
    return updated.replace(sectionPattern, (sectionXml) => applySectionFormatting(sectionXml, sectionReferencesXml, marginXml))
  }

  const section = `<w:sectPr>${sectionReferencesXml}${marginXml}</w:sectPr>`
  return updated.replace('</w:body>', `${section}</w:body>`)
}

function applyStyleDefaults(xml: string) {
  const defaults = [
    '<w:docDefaults>',
    '<w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Aptos" w:cs="Aptos"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="1F2937"/></w:rPr></w:rPrDefault>',
    '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>',
    '</w:docDefaults>',
  ].join('')

  if (/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/.test(xml)) {
    return xml.replace(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/, defaults)
  }

  return xml.replace(/(<w:styles\b[^>]*>)/, `$1${defaults}`)
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function createParagraphXml(text: string, style?: string) {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
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

function normalizeStructuredDocument(value: any, fallbackText: string): StructuredDocument {
  const rawSections = Array.isArray(value?.sections) ? value.sections : []
  const sections = rawSections.map((section: any) => ({
    heading: typeof section?.heading === 'string' ? section.heading.trim() : '',
    paragraphs: Array.isArray(section?.paragraphs)
      ? section.paragraphs.map((paragraph: unknown) => String(paragraph).trim()).filter(Boolean)
      : [],
  })).filter((section: StructuredDocument['sections'][number]) => section.heading || section.paragraphs.length > 0)

  if (sections.length > 0) {
    return {
      title: typeof value?.title === 'string' ? value.title.trim() : 'Formatted Document',
      sections,
    }
  }

  return {
    title: 'Formatted Document',
    sections: [{
      heading: '',
      paragraphs: fallbackText.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean),
    }],
  }
}

function parseStructuredDocument(content: string, fallbackText: string) {
  try {
    return normalizeStructuredDocument(JSON.parse(extractJsonObject(content)), fallbackText)
  } catch {
    return normalizeStructuredDocument(null, fallbackText)
  }
}

function getDocumentCleanupPrompt(text?: string) {
  return `You are formatting PDF content for FXMed administrative documents.

Clean the text into an editable DOCX-friendly structure. Preserve the original meaning, names, dates, medical/admin details, and ordering. Fix obvious OCR or line-break issues. Do not invent facts.

Return ONLY valid JSON in this shape:
{
  "title": "Short document title",
  "sections": [
    {
      "heading": "Section heading, or empty string",
      "paragraphs": ["Clean paragraph text"]
    }
  ]
}

${text ? `Extracted text:\n${text.slice(0, 24000)}` : 'Read the attached PDF and reconstruct its text content into the JSON structure.'}`
}

async function tryGeminiDocumentCleanup(text: string) {
  if (!process.env.GOOGLE_AI_API_KEY) return null

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)

  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(getDocumentCleanupPrompt(text))
      return result.response.text()
    } catch (error) {
      console.warn(`Gemini model ${modelName} failed for document cleanup:`, error)
    }
  }

  return null
}

async function tryOpenAIDocumentCleanup(text: string) {
  if (!process.env.OPENAI_API_KEY) return null

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You clean extracted PDF text into structured JSON for editable DOCX documents. Return only valid JSON.' },
      { role: 'user', content: getDocumentCleanupPrompt(text) },
    ],
    temperature: 0.2,
  })

  return response.choices[0]?.message?.content || null
}

async function tryClaudeDocumentCleanup(text: string) {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: 'You clean extracted PDF text into structured JSON for editable DOCX documents. Return only valid JSON.',
    messages: [{ role: 'user', content: getDocumentCleanupPrompt(text) }],
  })
  const textBlock = response.content.find((block) => block.type === 'text') as Anthropic.TextBlock | undefined

  return textBlock?.text || null
}

async function cleanPdfTextWithAi(text: string) {
  const providers = [
    tryGeminiDocumentCleanup,
    tryOpenAIDocumentCleanup,
    tryClaudeDocumentCleanup,
  ]

  for (const provider of providers) {
    try {
      const response = await provider(text)
      if (response) return parseStructuredDocument(response, text)
    } catch (error) {
      console.warn('PDF text cleanup provider failed:', error)
    }
  }

  return normalizeStructuredDocument(null, text)
}

async function structurePdfWithGemini(pdfBytes: Buffer) {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('PDF to DOCX requires GOOGLE_AI_API_KEY for AI-assisted reconstruction')
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  let lastError: unknown = null

  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent([
        { text: getDocumentCleanupPrompt() },
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBytes.toString('base64'),
          },
        },
      ])

      return parseStructuredDocument(result.response.text(), '')
    } catch (error) {
      lastError = error
      console.warn(`Gemini model ${modelName} failed for PDF reconstruction:`, error)
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `PDF to DOCX AI reconstruction failed: ${lastError.message}`
      : 'PDF to DOCX AI reconstruction failed'
  )
}

function buildDocumentBodyXml(document: StructuredDocument, sectionXml: string) {
  const content: string[] = []
  if (document.title) content.push(createParagraphXml(document.title, 'Title'))

  for (const section of document.sections) {
    if (section.heading) content.push(createParagraphXml(section.heading, 'Heading1'))
    for (const paragraph of section.paragraphs) {
      content.push(createParagraphXml(paragraph))
    }
  }

  return `${content.join('')}${sectionXml}`
}

async function createDocxFromStructuredDocument(document: StructuredDocument) {
  const templateZip = await JSZip.loadAsync(await fs.readFile(DOCX_LETTERHEAD_TEMPLATE_PATH))
  const documentFile = templateZip.file('word/document.xml')
  if (!documentFile) throw new Error('The FXMed letterhead template is not a valid Word document')

  const documentXml = await documentFile.async('string')
  const templateSectionXml = getLastSectionXml(documentXml)
  const newBodyXml = buildDocumentBodyXml(document, templateSectionXml)
  const updatedDocumentXml = documentXml.replace(/<w:body>[\s\S]*?<\/w:body>/, `<w:body>${newBodyXml}</w:body>`)
  templateZip.file('word/document.xml', updatedDocumentXml)

  const formatted = await templateZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return toArrayBuffer(formatted)
}

function createDocumentRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${RELS_NS}"></Relationships>`
}

function getAttribute(xml: string, name: string) {
  return xml.match(new RegExp(`${name}="([^"]+)"`))?.[1] || ''
}

function parseRelationships(xml: string) {
  return Array.from(xml.matchAll(/<Relationship\b[^>]*\/>/g)).map((match) => {
    const tag = match[0]
    return {
      id: getAttribute(tag, 'Id'),
      type: getAttribute(tag, 'Type'),
      target: getAttribute(tag, 'Target'),
      targetMode: getAttribute(tag, 'TargetMode') || undefined,
    }
  }).filter((relationship) => relationship.id && relationship.type && relationship.target)
}

function parseTemplateSectionReferences(sectionXml: string) {
  return Array.from(sectionXml.matchAll(/<w:(headerReference|footerReference)\b[^>]*\/>/g)).map((match) => {
    const tag = match[0]
    return {
      kind: match[1] === 'headerReference' ? 'header' : 'footer',
      type: getAttribute(tag, 'w:type') || 'default',
      relId: getAttribute(tag, 'r:id'),
    } as SectionReference
  }).filter((reference) => reference.relId)
}

function getLastSectionXml(documentXml: string) {
  const sections = Array.from(documentXml.matchAll(/<w:sectPr\b[^>]*>[\s\S]*?<\/w:sectPr>/g))
  return sections.at(-1)?.[0] || ''
}

function resolveDocxPath(baseDir: string, target: string) {
  if (target.startsWith('/')) return target.slice(1)
  return path.posix.normalize(path.posix.join(baseDir, target))
}

function getRelsPath(partPath: string) {
  const directory = path.posix.dirname(partPath)
  const filename = path.posix.basename(partPath)
  return `${directory}/_rels/${filename}.rels`
}

function getDefaultContentType(contentTypesXml: string, extension: string) {
  const escapedExtension = extension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return contentTypesXml.match(new RegExp(`<Default\\s+Extension="${escapedExtension}"\\s+ContentType="([^"]+)"\\s*/>`))?.[1] || ''
}

function guessContentType(extension: string) {
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    emf: 'image/x-emf',
    wmf: 'image/x-wmf',
  }

  return contentTypes[extension.toLowerCase()] || 'application/octet-stream'
}

async function copyTemplatePartWithRelationships(
  templateZip: JSZip,
  targetZip: JSZip,
  sourcePartPath: string,
  targetPartPath: string
) {
  const sourcePart = templateZip.file(sourcePartPath)
  if (!sourcePart) throw new Error(`Letterhead template is missing ${sourcePartPath}`)

  targetZip.file(targetPartPath, await sourcePart.async('nodebuffer'))

  const sourceRelsPath = getRelsPath(sourcePartPath)
  const sourceRels = templateZip.file(sourceRelsPath)
  if (!sourceRels) return [] as string[]

  const copiedMediaExtensions: string[] = []
  const sourcePartDirectory = path.posix.dirname(sourcePartPath)
  const targetPartDirectory = path.posix.dirname(targetPartPath)
  let relsXml = await sourceRels.async('string')

  for (const relationship of parseRelationships(relsXml)) {
    if (relationship.targetMode === 'External') continue

    const sourceRelatedPath = resolveDocxPath(sourcePartDirectory, relationship.target)
    const relatedPart = templateZip.file(sourceRelatedPath)
    if (!relatedPart) continue

    const extension = path.posix.extname(sourceRelatedPath).replace('.', '').toLowerCase()
    const baseName = path.posix.basename(sourceRelatedPath)
    const targetRelatedPath = sourceRelatedPath.startsWith('word/media/')
      ? `word/media/fxmed-template-${baseName}`
      : resolveDocxPath(targetPartDirectory, relationship.target)
    const rewrittenTarget = path.posix.relative(targetPartDirectory, targetRelatedPath)

    targetZip.file(targetRelatedPath, await relatedPart.async('nodebuffer'))
    relsXml = relsXml.replace(`Target="${relationship.target}"`, `Target="${rewrittenTarget}"`)

    if (extension) copiedMediaExtensions.push(extension)
  }

  targetZip.file(getRelsPath(targetPartPath), relsXml)
  return copiedMediaExtensions
}

async function applyTemplateLetterhead(zip: JSZip, contentTypesXml: string) {
  const templateZip = await JSZip.loadAsync(await fs.readFile(DOCX_LETTERHEAD_TEMPLATE_PATH))
  const templateDocument = templateZip.file('word/document.xml')
  const templateDocumentRels = templateZip.file('word/_rels/document.xml.rels')
  const templateContentTypes = templateZip.file('[Content_Types].xml')

  if (!templateDocument || !templateDocumentRels || !templateContentTypes) {
    throw new Error('The FXMed letterhead template is not a valid Word document')
  }

  const templateDocumentXml = await templateDocument.async('string')
  const templateSectionXml = getLastSectionXml(templateDocumentXml)
  const templateReferences = parseTemplateSectionReferences(templateSectionXml)

  if (templateReferences.length === 0) {
    throw new Error('The FXMed letterhead template needs a header or footer')
  }

  const templateRels = parseRelationships(await templateDocumentRels.async('string'))
  const templateContentTypesXml = await templateContentTypes.async('string')
  const targetRelsPath = 'word/_rels/document.xml.rels'
  const targetRelsFile = zip.file(targetRelsPath)
  let targetRelsXml = targetRelsFile ? await targetRelsFile.async('string') : createDocumentRelationshipsXml()
  let updatedContentTypesXml = contentTypesXml
  const sectionReferences: string[] = []

  for (let index = 0; index < templateReferences.length; index += 1) {
    const reference = templateReferences[index]
    const relationship = templateRels.find((rel) => rel.id === reference.relId)
    if (!relationship || (relationship.type !== HEADER_REL_TYPE && relationship.type !== FOOTER_REL_TYPE)) continue

    const sourcePartPath = resolveDocxPath('word', relationship.target)
    const extension = path.posix.extname(sourcePartPath) || '.xml'
    const targetPartPath = `word/${reference.kind}-fxmed-${index + 1}${extension}`
    const copiedMediaExtensions = await copyTemplatePartWithRelationships(templateZip, zip, sourcePartPath, targetPartPath)
    const targetRelationship = addRelationship(targetRelsXml, relationship.type, path.posix.basename(targetPartPath))
    targetRelsXml = targetRelationship.xml
    sectionReferences.push(`<w:${reference.kind}Reference w:type="${reference.type}" r:id="${targetRelationship.id}"/>`)

    updatedContentTypesXml = ensureContentTypeOverride(
      updatedContentTypesXml,
      `/${targetPartPath}`,
      reference.kind === 'header' ? WORD_HEADER_CONTENT_TYPE : WORD_FOOTER_CONTENT_TYPE
    )

    for (const mediaExtension of copiedMediaExtensions) {
      updatedContentTypesXml = ensureContentTypeDefault(
        updatedContentTypesXml,
        mediaExtension,
        getDefaultContentType(templateContentTypesXml, mediaExtension) || guessContentType(mediaExtension)
      )
    }
  }

  if (sectionReferences.length === 0) {
    throw new Error('The FXMed letterhead template header/footer could not be copied')
  }

  zip.file(targetRelsPath, targetRelsXml)

  const templateMargin = templateSectionXml.match(/<w:pgMar\b[^>]*\/>/)?.[0] || ''
  return {
    contentTypesXml: updatedContentTypesXml,
    sectionReferencesXml: sectionReferences.join(''),
    marginXml: templateMargin,
  }
}

function sanitizeDownloadName(filename: string, outputFormat: OutputFormat) {
  const baseName = filename.replace(/\.(docx|pdf)$/i, '').replace(/[^a-z0-9-_ ]/gi, '').trim() || 'document'
  return `${baseName}-fxmed-letterhead.${outputFormat}`
}

function toArrayBuffer(bytes: Uint8Array) {
  const responseBody = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(responseBody).set(bytes)
  return responseBody
}

async function formatDocxWithLetterhead(file: File) {
  const zip = await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()))
  const documentFile = zip.file('word/document.xml')
  const contentTypesFile = zip.file('[Content_Types].xml')

  if (!documentFile || !contentTypesFile) {
    throw new Error('This does not look like a valid Word .docx file')
  }

  const templateLetterhead = await applyTemplateLetterhead(
    zip,
    await contentTypesFile.async('string')
  )

  const documentXml = await documentFile.async('string')
  zip.file(
    'word/document.xml',
    applyDocumentFormatting(documentXml, templateLetterhead.sectionReferencesXml, templateLetterhead.marginXml)
  )

  const stylesFile = zip.file('word/styles.xml')
  if (stylesFile) {
    zip.file('word/styles.xml', applyStyleDefaults(await stylesFile.async('string')))
  }

  zip.file('[Content_Types].xml', templateLetterhead.contentTypesXml)

  const formatted = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
  return toArrayBuffer(formatted)
}

async function formatPdfWithLetterhead(file: File) {
  const inputBytes = new Uint8Array(await file.arrayBuffer())
  const templateBytes = await fs.readFile(PDF_LETTERHEAD_TEMPLATE_PATH)
  const sourcePdf = await PDFDocument.load(inputBytes)
  const outputPdf = await PDFDocument.create()
  const pageCount = sourcePdf.getPageCount()
  const embeddedSourcePages = await outputPdf.embedPdf(inputBytes, Array.from({ length: pageCount }, (_, index) => index))
  const [letterheadPage] = await outputPdf.embedPdf(templateBytes, [0])

  for (let index = 0; index < pageCount; index += 1) {
    const sourcePage = sourcePdf.getPage(index)
    const { width, height } = sourcePage.getSize()
    const page = outputPdf.addPage([width, height])

    page.drawPage(letterheadPage, { x: 0, y: 0, width, height })
    page.drawPage(embeddedSourcePages[index], { x: 0, y: 0, width, height })
  }

  return toArrayBuffer(await outputPdf.save())
}

async function formatPdfToDocxWithAi(file: File) {
  const inputBytes = Buffer.from(await file.arrayBuffer())
  const structuredDocument = await structurePdfWithGemini(inputBytes)
  return createDocxFromStructuredDocument(structuredDocument)
}

async function findLibreOfficeExecutable() {
  const candidates = [
    process.env.LIBREOFFICE_PATH,
    'soffice',
    'libreoffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    try {
      if (candidate.includes(path.sep)) {
        await fs.access(candidate)
      } else {
        await execFileAsync(candidate, ['--version'])
      }
      return candidate
    } catch {
      // Try the next known executable path/name.
    }
  }

  throw new Error('PDF/DOCX conversion requires LibreOffice on the server')
}

async function convertDocument(buffer: ArrayBuffer, sourceFormat: OutputFormat, targetFormat: OutputFormat) {
  if (sourceFormat === targetFormat) return buffer

  const libreOffice = await findLibreOfficeExecutable()
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fxmed-letterhead-'))
  const inputPath = path.join(tempDir, `formatted.${sourceFormat}`)

  try {
    await fs.writeFile(inputPath, Buffer.from(buffer))
    await execFileAsync(libreOffice, [
      '--headless',
      '--convert-to',
      targetFormat,
      '--outdir',
      tempDir,
      inputPath,
    ], { timeout: 60000 })

    const outputPath = path.join(tempDir, `formatted.${targetFormat}`)
    return toArrayBuffer(await fs.readFile(outputPath))
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await getAuthorizedAdminRole(request, 'tools')) {
      return NextResponse.json({ error: 'Tools access required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('document')
    const requestedOutputFormat = formData.get('outputFormat')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A Word .docx document is required' }, { status: 400 })
    }

    const isDocx = file.name.toLowerCase().endsWith('.docx')
    const outputFormat: OutputFormat = requestedOutputFormat === 'pdf' || requestedOutputFormat === 'docx'
      ? requestedOutputFormat
      : 'pdf'

    if (!isDocx) {
      return NextResponse.json({ error: 'Only .docx documents are supported for letterhead formatting' }, { status: 400 })
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Please upload a document smaller than 20MB' }, { status: 400 })
    }

    const responseBody = await convertDocument(
      await formatDocxWithLetterhead(file),
      'docx',
      outputFormat
    )

    return new NextResponse(responseBody, {
      headers: {
        'Content-Type': outputFormat === 'pdf' ? PDF_CONTENT_TYPE : DOCX_CONTENT_TYPE,
        'Content-Disposition': `attachment; filename="${sanitizeDownloadName(file.name, outputFormat)}"`,
      },
    })
  } catch (error: any) {
    console.error('Error formatting Word document:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to format document' },
      { status: 500 }
    )
  }
}
