// Browser side of the stamp tool: opens the document, renders each page for
// the preview, reads its text and ink, and writes the stamped copy.
// The document stays in the browser; only scanned pages that need a closer
// look are sent to the server (see locateWithAi).

import { BlendMode, PDFDocument, degrees } from 'pdf-lib'
import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { blobToBase64 } from '@/lib/fileDownload'
import { STAMP_INK_OPACITY, drawStamp, stampAspect, tintEmblemPixels, type StampDesign, type StampInk } from '@/lib/stamp/design'
import { inkMapFromPixels, toPdfPoint, uprightImageOrigin, type Box, type InkMap, type StampRequest, type TextRun } from '@/lib/stamp/placement'

export type StampPage = {
  /** 1-based. */
  number: number
  /** Size as displayed, in PDF points. */
  width: number
  height: number
  rotation: number
  /** Maps PDF coordinates to displayed points. */
  transform: number[]
  preview: string
  previewBlob: Blob
  previewWidth: number
  previewHeight: number
  runs: TextRun[]
  ink: InkMap
  /** False for scanned pages with no text layer. */
  hasText: boolean
}

export type StampDocument = {
  kind: 'pdf' | 'image'
  file: File
  pages: StampPage[]
  pdf: PDFDocumentProxy | null
}

/** A stamp on a page: its centre and width in displayed points. */
export type StampSpot = { page: number; x: number; y: number; width: number }

export const STAMP_ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp'
export const STAMP_MAX_BYTES = 25 * 1024 * 1024
export const STAMP_MAX_PAGES = 60

// Pages are rendered with this many pixels on the long edge: sharp enough
// for the preview, and the size scanned pages are sent at for a closer look.
const PREVIEW_LONG_EDGE = 1600
// Images are treated as an A4 page, so stamp sizes in millimetres make sense.
const IMAGE_LONG_EDGE_PT = 842

type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
let pdfjsLoading: Promise<PdfJs> | null = null

function loadPdfJs() {
  if (!pdfjsLoading) {
    pdfjsLoading = import('pdfjs-dist/legacy/build/pdf.mjs').then(lib => {
      if (!lib.GlobalWorkerOptions.workerPort) {
        lib.GlobalWorkerOptions.workerPort = new Worker(new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url), { type: 'module' })
      }
      return lib
    }).catch(error => {
      pdfjsLoading = null
      throw error
    })
  }
  return pdfjsLoading
}

export function isPdf(file: File) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

export function isStampableImage(file: File) {
  return /^image\/(png|jpeg|webp)$/.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name)
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The page could not be rendered.')), type, quality)
  })
}

async function finishPage(canvas: HTMLCanvasElement, base: Omit<StampPage, 'preview' | 'previewBlob' | 'previewWidth' | 'previewHeight' | 'ink'>) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('This browser could not render the page.')
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const ink = inkMapFromPixels(pixels.data, canvas.width, canvas.height, canvas.width / base.width)
  const previewBlob = await toBlob(canvas, 'image/jpeg', 0.86)
  const page: StampPage = { ...base, ink, previewBlob, preview: URL.createObjectURL(previewBlob), previewWidth: canvas.width, previewHeight: canvas.height }
  canvas.width = 0
  canvas.height = 0
  return page
}

/**
 * Opens a PDF or image and prepares every page. Calls onProgress after each
 * page so a long document can show how far it has got.
 */
export async function openStampDocument(file: File, onProgress?: (done: number, total: number) => void): Promise<StampDocument> {
  if (file.size > STAMP_MAX_BYTES) throw new Error('Please choose a document smaller than 25 MB.')
  if (isPdf(file)) return openPdf(file, onProgress)
  if (isStampableImage(file)) return openImage(file)
  throw new Error('Choose a PDF, or a PNG, JPG or WEBP image.')
}

async function openPdf(file: File, onProgress?: (done: number, total: number) => void): Promise<StampDocument> {
  const pdfjs = await loadPdfJs()
  // pdf.js shares one worker, which cannot take a new document while the
  // last one is still closing.
  await closing
  let pdf: PDFDocumentProxy
  try {
    // pdf.js takes ownership of the bytes it is given, so it gets a copy.
    pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise
  } catch (error: any) {
    if (error?.name === 'PasswordException') throw new Error('This PDF needs a password to open. Save a copy without the password and try again.')
    throw new Error('This file could not be read as a PDF.')
  }
  if (pdf.numPages > STAMP_MAX_PAGES) {
    await pdf.destroy()
    throw new Error(`This PDF has ${pdf.numPages} pages. Documents of up to ${STAMP_MAX_PAGES} pages can be stamped.`)
  }

  const pages: StampPage[] = []
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number)
    const base = page.getViewport({ scale: 1 })
    const scale = PREVIEW_LONG_EDGE / Math.max(base.width, base.height)
    const viewport = page.getViewport({ scale })
    const canvas = canvasOf(viewport.width, viewport.height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('This browser could not render the page.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: context, viewport }).promise

    const content = await page.getTextContent()
    const runs: TextRun[] = []
    let characters = 0
    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue
      characters += item.str.trim().length
      const [a, b, c, d, x, y] = pdfjs.Util.transform(base.transform, item.transform)
      // Only text that runs left to right across the page as shown.
      if (a <= 0 || Math.abs(b) > Math.abs(a) * 0.2) continue
      const size = Math.hypot(c, d) || item.height
      if (!size || !item.width) continue
      runs.push({ text: item.str, left: x, top: y - size * 0.82, width: item.width, height: size })
    }

    pages.push(await finishPage(canvas, {
      number, width: base.width, height: base.height, rotation: page.rotate, transform: base.transform, runs, hasText: characters >= 20,
    }))
    page.cleanup()
    onProgress?.(number, pdf.numPages)
  }
  return { kind: 'pdf', file, pages, pdf }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('This image could not be opened.'))
    image.src = src
  })
}

async function openImage(file: File): Promise<StampDocument> {
  const url = URL.createObjectURL(file)
  try {
    const image = await loadImage(url)
    const long = Math.max(image.naturalWidth, image.naturalHeight)
    const width = image.naturalWidth / long * IMAGE_LONG_EDGE_PT
    const height = image.naturalHeight / long * IMAGE_LONG_EDGE_PT
    const scale = Math.min(1, PREVIEW_LONG_EDGE / long)
    const canvas = canvasOf(image.naturalWidth * scale, image.naturalHeight * scale)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('This browser could not open the image.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const page = await finishPage(canvas, {
      number: 1, width, height, rotation: 0, transform: [1, 0, 0, -1, 0, height], runs: [], hasText: false,
    })
    return { kind: 'image', file, pages: [page], pdf: null }
  } finally {
    URL.revokeObjectURL(url)
  }
}

let closing: Promise<void> = Promise.resolve()

export function closeStampDocument(document: StampDocument | null) {
  if (!document) return
  for (const page of document.pages) URL.revokeObjectURL(page.preview)
  const pdf = document.pdf
  if (pdf) closing = closing.then(() => pdf.destroy()).catch(() => undefined)
}

// ---------------------------------------------------------------------------
// The stamp artwork

let emblemLoading: Promise<HTMLImageElement | null> | null = null
const emblems = new Map<StampInk, HTMLCanvasElement>()

async function emblemFor(ink: StampInk) {
  const cached = emblems.get(ink)
  if (cached) return cached
  if (!emblemLoading) emblemLoading = loadImage('/FXMed_Favicon.png').catch(() => null)
  const source = await emblemLoading
  if (!source) return null
  const canvas = canvasOf(source.naturalWidth, source.naturalHeight)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(source, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  tintEmblemPixels(pixels.data, ink)
  context.putImageData(pixels, 0, 0)
  emblems.set(ink, canvas)
  return canvas
}

async function fontsReady() {
  if (typeof document === 'undefined' || !document.fonts) return
  await Promise.all(['500', '600', '700', '800'].map(weight => document.fonts.load(`${weight} 40px "DM Sans"`).catch(() => [])))
}

/** The stamp drawn at the given pixel width, on a clear background. */
export async function renderStamp(design: StampDesign, widthPx: number) {
  await fontsReady()
  const height = Math.round(widthPx * stampAspect(design.style))
  const canvas = canvasOf(widthPx, height)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not draw the stamp.')
  drawStamp(context, design, canvas.width, canvas.height, await emblemFor(design.ink))
  return canvas
}

// ---------------------------------------------------------------------------
// Writing the stamped copy

// Stamps are drawn at this resolution in the finished document.
const STAMP_DPI = 600

function spotBox(spot: StampSpot, aspect: number): Box {
  const height = spot.width * aspect
  return { left: spot.x - spot.width / 2, top: spot.y - height / 2, right: spot.x + spot.width / 2, bottom: spot.y + height / 2 }
}

export type StampedFile = { blob: Blob; downloadName: string; note?: string }

export function stampedName(file: File, extension: string) {
  const base = file.name.replace(/\.[a-z0-9]+$/i, '').trim() || 'document'
  return `${base}-stamped.${extension}`
}

/** The document with every stamp applied, in the same format it came in. */
export async function writeStampedDocument(doc: StampDocument, design: StampDesign, spots: StampSpot[]): Promise<StampedFile> {
  const widest = Math.max(...spots.map(spot => spot.width), 60)
  const stamp = await renderStamp(design, Math.min(2400, Math.round(widest / 72 * STAMP_DPI)))
  const aspect = stampAspect(design.style)
  if (doc.kind === 'image') return writeStampedImage(doc, stamp, aspect, spots)
  try {
    return await writeStampedPdf(doc, stamp, aspect, spots)
  } catch (error: any) {
    // Some PDFs are locked against changes. They can still be stamped by
    // making a copy from images of their pages.
    if (error?.name === 'EncryptedPDFError' || /encrypt/i.test(String(error?.message))) return writeRasterPdf(doc, stamp, aspect, spots)
    throw error
  }
}

async function writeStampedPdf(doc: StampDocument, stamp: HTMLCanvasElement, aspect: number, spots: StampSpot[]): Promise<StampedFile> {
  const pdf = await PDFDocument.load(await doc.file.arrayBuffer(), { updateMetadata: false })
  const image = await pdf.embedPng(new Uint8Array(await (await toBlob(stamp, 'image/png')).arrayBuffer()))
  const pages = pdf.getPages()
  for (const spot of spots) {
    const info = doc.pages[spot.page - 1]
    const page = pages[spot.page - 1]
    if (!info || !page) continue
    const width = spot.width
    const height = spot.width * aspect
    const [cx, cy] = toPdfPoint(info.transform, spot.x, spot.y)
    const origin = uprightImageOrigin(cx, cy, width, height, info.rotation)
    page.drawImage(image, {
      x: origin.x, y: origin.y, width, height,
      rotate: degrees(info.rotation),
      opacity: STAMP_INK_OPACITY,
      blendMode: BlendMode.Multiply,
    })
  }
  const bytes = await pdf.save()
  return { blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }), downloadName: stampedName(doc.file, 'pdf') }
}

function paintStamps(context: CanvasRenderingContext2D, pxPerPt: number, stamp: HTMLCanvasElement, aspect: number, spots: StampSpot[]) {
  context.save()
  context.globalAlpha = STAMP_INK_OPACITY
  context.globalCompositeOperation = 'multiply'
  for (const spot of spots) {
    const box = spotBox(spot, aspect)
    context.drawImage(stamp, box.left * pxPerPt, box.top * pxPerPt, (box.right - box.left) * pxPerPt, (box.bottom - box.top) * pxPerPt)
  }
  context.restore()
}

async function writeStampedImage(doc: StampDocument, stamp: HTMLCanvasElement, aspect: number, spots: StampSpot[]): Promise<StampedFile> {
  const url = URL.createObjectURL(doc.file)
  try {
    const image = await loadImage(url)
    const canvas = canvasOf(image.naturalWidth, image.naturalHeight)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser could not write the image.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0)
    paintStamps(context, canvas.width / doc.pages[0].width, stamp, aspect, spots)
    const png = doc.file.type === 'image/png' || /\.png$/i.test(doc.file.name)
    const blob = await toBlob(canvas, png ? 'image/png' : 'image/jpeg', 0.95)
    return { blob, downloadName: stampedName(doc.file, png ? 'png' : 'jpg') }
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Locked PDFs: each page becomes an image at this resolution, then stamped.
const RASTER_DPI = 200

async function writeRasterPdf(doc: StampDocument, stamp: HTMLCanvasElement, aspect: number, spots: StampSpot[]): Promise<StampedFile> {
  if (!doc.pdf) throw new Error('This PDF could not be stamped.')
  const output = await PDFDocument.create()
  for (const info of doc.pages) {
    const page = await doc.pdf.getPage(info.number)
    const scale = RASTER_DPI / 72
    const viewport = page.getViewport({ scale })
    const canvas = canvasOf(viewport.width, viewport.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser could not render the page.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: context, viewport }).promise
    paintStamps(context, canvas.width / info.width, stamp, aspect, spots.filter(spot => spot.page === info.number))
    const jpeg = await output.embedJpg(new Uint8Array(await (await toBlob(canvas, 'image/jpeg', 0.9)).arrayBuffer()))
    output.addPage([info.width, info.height]).drawImage(jpeg, { x: 0, y: 0, width: info.width, height: info.height })
    canvas.width = 0
    canvas.height = 0
  }
  const bytes = await output.save()
  return {
    blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }),
    downloadName: stampedName(doc.file, 'pdf'),
    note: 'This PDF is locked against changes, so the stamped copy is made from images of its pages. Its text cannot be selected or searched.',
  }
}

// ---------------------------------------------------------------------------
// A closer look at scanned pages

// Kept under the server's request size limit.
const AI_MAX_PAGES = 10
const AI_MAX_BASE64 = 3_600_000

type AiBox = { left: number; top: number; right: number; bottom: number }
type AiRequest = { page: number; label: string; labelBox: AiBox | null; area: AiBox | null }

/**
 * Asks the server to find stamp requests on pages it cannot read as text,
 * such as scans. Returns them by page number, in displayed points.
 */
export async function locateWithAi(pages: StampPage[]): Promise<{ requests: Map<number, StampRequest[]>; checked: number[]; skipped: number[] }> {
  const chosen = pages.length > AI_MAX_PAGES ? [...pages.slice(0, 2), ...pages.slice(-(AI_MAX_PAGES - 2))] : pages
  const payload: Array<{ page: number; width: number; height: number; image: string }> = []
  let size = 0
  for (const page of chosen) {
    const image = await blobToBase64(page.previewBlob)
    if (size + image.length > AI_MAX_BASE64) break
    size += image.length
    payload.push({ page: page.number, width: page.previewWidth, height: page.previewHeight, image })
  }
  const checked = payload.map(item => item.page)
  const skipped = pages.map(page => page.number).filter(number => !checked.includes(number))
  const requests = new Map<number, StampRequest[]>()
  if (!payload.length) return { requests, checked, skipped }

  const response = await fetch('/api/admin/tools/stamp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pages: payload }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'The scanned pages could not be checked.')

  for (const found of (result.requests || []) as AiRequest[]) {
    const page = pages.find(item => item.number === found.page)
    if (!page) continue
    const toPt = page.width / page.previewWidth
    const convert = (box: AiBox | null): Box | null => {
      if (!box) return null
      const left = Math.max(0, Math.min(box.left, box.right) * toPt)
      const right = Math.min(page.width, Math.max(box.left, box.right) * toPt)
      const top = Math.max(0, Math.min(box.top, box.bottom) * toPt)
      const bottom = Math.min(page.height, Math.max(box.top, box.bottom) * toPt)
      return right - left > 1 && bottom - top > 1 ? { left, top, right, bottom } : null
    }
    const labelBox = convert(found.labelBox)
    const area = convert(found.area)
    const anchor = labelBox || area
    if (!anchor) continue
    const list = requests.get(page.number) || []
    list.push({ label: found.label || 'Stamp', anchor, labelBox, area, strong: true })
    requests.set(page.number, list)
  }
  return { requests, checked, skipped }
}
