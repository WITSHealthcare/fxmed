// The FXMed stamp: what it says, and how it is drawn.
//
// drawStamp paints the stamp onto any 2D canvas context, so the same drawing
// is used for the preview on screen and for the stamped document. Ink is drawn
// fully opaque; it is laid onto the page slightly translucent and multiplied,
// like real ink, so the lines and text underneath stay visible.

export type StampStyle = 'round' | 'rectangle'
export type StampInk = 'green' | 'blue' | 'red'

export type StampDesign = {
  style: StampStyle
  ink: StampInk
  /** The day shown on the stamp, as YYYY-MM-DD. */
  date: string
  /** Optional word across the middle, such as "Received". */
  wording: string
}

/** Who the stamp says it is from. */
export const STAMP_ISSUER = {
  name: 'FXMed Functional Medicine',
  address: '6A Robin Road, Crown Estate, Sangotedo, Lagos',
  locality: 'Sangotedo · Lagos · Nigeria',
  phone: '+234 907 703 1311',
}

export const STAMP_INKS: Record<StampInk, { label: string; color: string }> = {
  green: { label: 'FXMed green', color: '#1f6b46' },
  blue: { label: 'Official blue', color: '#1c3f94' },
  red: { label: 'Red', color: '#b1221d' },
}

export const STAMP_WORDINGS = ['', 'Approved', 'Received', 'Verified', 'Certified true copy', 'Paid']

/** How the ink is laid onto the page. */
export const STAMP_INK_OPACITY = 0.92

/** Usual printed width of each style, in millimetres. */
export const STAMP_DEFAULT_WIDTH_MM: Record<StampStyle, number> = { round: 40, rectangle: 62 }
export const STAMP_MIN_WIDTH_MM = 22
export const STAMP_MAX_WIDTH_MM = 80

/** Height as a fraction of width. */
export function stampAspect(style: StampStyle) {
  return style === 'round' ? 1 : 0.46
}

export const MM_TO_PT = 72 / 25.4

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** "2026-10-28" as it appears on the stamp: "28 OCT 2026". */
export function stampDateText(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return ''
  const month = MONTHS[Number(match[2]) - 1]
  return month ? `${Number(match[3])} ${month} ${match[1]}` : ''
}

/** Today in Lagos, as YYYY-MM-DD. */
export function todayInLagos() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return /^\d{4}-\d{2}-\d{2}$/.test(parts) ? parts : new Date().toISOString().slice(0, 10)
}

// The subset of a canvas context the drawing uses, so it runs on browser
// canvases and on canvases made outside a browser alike.
type Context = Pick<CanvasRenderingContext2D,
  'save' | 'restore' | 'translate' | 'rotate' | 'scale' | 'beginPath' | 'closePath' | 'arc' | 'moveTo' | 'lineTo' |
  'stroke' | 'fill' | 'fillText' | 'measureText' | 'drawImage' | 'arcTo'> & {
  fillStyle: unknown
  strokeStyle: unknown
  lineWidth: number
  font: string
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
}

export const STAMP_FONT = `'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif`

/**
 * Paints the stamp filling a width × height area at the context's origin.
 * The emblem, if given, is the FXMed mark already tinted in the ink colour.
 */
export function drawStamp(ctx: Context, design: StampDesign, width: number, height: number, emblem?: CanvasImageSource | null, font = STAMP_FONT) {
  const color = STAMP_INKS[design.ink]?.color || STAMP_INKS.green.color
  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = color
  if (design.style === 'rectangle') drawRectangle(ctx, design, width, height, emblem || null, font)
  else drawRound(ctx, design, Math.min(width, height), emblem || null, font)
  ctx.restore()
}

// Measures with a 1000-unit design grid; everything below is in those units.
function fitFont(ctx: Context, text: string, weight: number, font: string, maxSize: number, maxWidth: number, spacing = 0) {
  let size = maxSize
  for (let step = 0; step < 4; step++) {
    ctx.font = `${weight} ${size}px ${font}`
    const measured = textWidth(ctx, text, size * spacing)
    if (measured <= maxWidth) break
    size = size * maxWidth / measured * 0.99
  }
  return size
}

function textWidth(ctx: Context, text: string, spacing: number) {
  let total = 0
  for (let index = 0; index < text.length; index++) total += ctx.measureText(text[index]).width
  return total + spacing * Math.max(0, text.length - 1)
}

/** Text with letter spacing, centred on x. */
function spacedText(ctx: Context, text: string, x: number, y: number, size: number, spacing: number) {
  const gap = size * spacing
  let cursor = x - textWidth(ctx, text, gap) / 2
  ctx.textAlign = 'left'
  for (let index = 0; index < text.length; index++) {
    ctx.fillText(text[index], cursor, y)
    cursor += ctx.measureText(text[index]).width + gap
  }
}

/**
 * Text set along a circle, centred on an angle (radians, clockwise from 3
 * o'clock). Along the top it reads clockwise with letters standing outward;
 * along the bottom it reads left to right with letters standing inward.
 */
function arcText(ctx: Context, text: string, radius: number, centre: number, size: number, spacing: number, along: 'top' | 'bottom') {
  const gap = size * spacing
  const widths: number[] = []
  for (let index = 0; index < text.length; index++) widths.push(ctx.measureText(text[index]).width)
  const sweep = (widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, text.length - 1)) / radius
  const direction = along === 'top' ? 1 : -1
  let angle = centre - direction * sweep / 2
  ctx.textAlign = 'center'
  for (let index = 0; index < text.length; index++) {
    const half = widths[index] / 2 / radius
    angle += direction * half
    ctx.save()
    ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius)
    ctx.rotate(along === 'top' ? angle + Math.PI / 2 : angle - Math.PI / 2)
    ctx.fillText(text[index], 0, 0)
    ctx.restore()
    angle += direction * (half + gap / radius)
  }
}

function arcSweep(ctx: Context, text: string, size: number, spacing: number, radius: number) {
  return textWidth(ctx, text, size * spacing) / radius
}

function star(ctx: Context, x: number, y: number, outer: number) {
  const inner = outer * 0.45
  ctx.beginPath()
  for (let point = 0; point < 10; point++) {
    const radius = point % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + point * Math.PI / 5
    const px = x + Math.cos(angle) * radius
    const py = y + Math.sin(angle) * radius
    if (point === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

function ring(ctx: Context, radius: number, lineWidth: number) {
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.stroke()
}

function rule(ctx: Context, fromX: number, toX: number, y: number, lineWidth: number) {
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(fromX, y)
  ctx.lineTo(toX, y)
  ctx.stroke()
}

/** Splits long wording such as "Certified true copy" over two lines. */
function wordingLines(wording: string) {
  const text = wording.trim().toUpperCase()
  if (text.length <= 12 || !text.includes(' ')) return text ? [text] : []
  const words = text.split(/\s+/)
  let best: [string, string] = [text, '']
  let bestDiff = Infinity
  for (let split = 1; split < words.length; split++) {
    const first = words.slice(0, split).join(' ')
    const second = words.slice(split).join(' ')
    const diff = Math.abs(first.length - second.length)
    if (diff < bestDiff) { best = [first, second]; bestDiff = diff }
  }
  return best
}

function drawRound(ctx: Context, design: StampDesign, size: number, emblem: CanvasImageSource | null, font: string) {
  ctx.translate(size / 2, size / 2)
  ctx.scale(size / 1000, size / 1000)

  ring(ctx, 486, 18)
  ring(ctx, 458, 5)
  ring(ctx, 318, 5)
  ring(ctx, 304, 2.5)

  // The lettering band between the rings, with a star either side.
  const bandMiddle = 388
  const spacing = 0.14
  const top = STAMP_ISSUER.name.toUpperCase()
  const bottom = STAMP_ISSUER.locality.toUpperCase()
  const usable = (180 - 2 * 17) * Math.PI / 180
  ctx.font = `700 100px ${font}`
  const fitTop = 100 * usable / arcSweep(ctx, top, 100, spacing, bandMiddle - 26)
  const fitBottom = 100 * (usable * 0.9) / arcSweep(ctx, bottom, 100, spacing, bandMiddle + 26)
  const ringSize = Math.min(74, fitTop, fitBottom)
  const cap = ringSize * 0.71
  ctx.textBaseline = 'alphabetic'
  ctx.font = `700 ${ringSize}px ${font}`
  arcText(ctx, top, bandMiddle - cap / 2, -Math.PI / 2, ringSize, spacing, 'top')
  arcText(ctx, bottom, bandMiddle + cap / 2, Math.PI / 2, ringSize, spacing, 'bottom')
  star(ctx, -bandMiddle, 0, 24)
  star(ctx, bandMiddle, 0, 24)

  // The centre: the mark or the wording, the date between rules, the phone.
  const wording = wordingLines(design.wording)
  if (wording.length) {
    const lineSize = wording.length === 1 ? 68 : 54
    const sizes = wording.map((line, index) => fitFont(ctx, line, 800, font, lineSize, index === 0 && wording.length === 2 ? 400 : 470, 0.06))
    const shared = Math.min(...sizes)
    ctx.font = `800 ${shared}px ${font}`
    ctx.textBaseline = 'alphabetic'
    if (wording.length === 1) spacedText(ctx, wording[0], 0, -104, shared, 0.06)
    else {
      spacedText(ctx, wording[0], 0, -172, shared, 0.06)
      spacedText(ctx, wording[1], 0, -104, shared, 0.06)
    }
  } else if (emblem) {
    ctx.drawImage(emblem, -74, -250, 148, 148)
  }

  rule(ctx, -236, 236, -64, 6)
  rule(ctx, -236, 236, 68, 6)
  const date = stampDateText(design.date)
  const dateSize = fitFont(ctx, date, 800, font, 84, 440, 0.04)
  ctx.font = `800 ${dateSize}px ${font}`
  ctx.textBaseline = 'middle'
  spacedText(ctx, date, 0, 4, dateSize, 0.04)

  const phoneSize = fitFont(ctx, STAMP_ISSUER.phone, 600, font, 44, 400, 0.04)
  ctx.font = `600 ${phoneSize}px ${font}`
  ctx.textBaseline = 'middle'
  spacedText(ctx, STAMP_ISSUER.phone, 0, 146, phoneSize, 0.04)
}

function roundedRect(ctx: Context, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function drawRectangle(ctx: Context, design: StampDesign, width: number, height: number, emblem: CanvasImageSource | null, font: string) {
  // A 1000 × 460 design grid, scaled to the area.
  ctx.scale(width / 1000, height / 460)

  ctx.lineWidth = 16
  roundedRect(ctx, 10, 10, 980, 440, 34)
  ctx.stroke()
  ctx.lineWidth = 4.5
  roundedRect(ctx, 34, 34, 932, 392, 20)
  ctx.stroke()

  const name = STAMP_ISSUER.name.toUpperCase()
  const textLeft = emblem ? 175 : 70
  const textCentre = emblem ? (textLeft + 930) / 2 : 500
  const nameSize = fitFont(ctx, name, 800, font, 66, 930 - textLeft, 0.04)
  ctx.font = `800 ${nameSize}px ${font}`
  ctx.textBaseline = 'alphabetic'
  spacedText(ctx, name, textCentre, 112, nameSize, 0.04)
  const addressSize = fitFont(ctx, STAMP_ISSUER.address, 500, font, 34, 930 - textLeft)
  ctx.font = `500 ${addressSize}px ${font}`
  spacedText(ctx, STAMP_ISSUER.address, textCentre, 160, addressSize, 0)
  if (emblem) ctx.drawImage(emblem, 62, 58, 104, 104)

  rule(ctx, 70, 930, 190, 5)
  rule(ctx, 70, 930, 330, 5)

  const date = stampDateText(design.date)
  const wording = design.wording.trim().toUpperCase()
  ctx.textBaseline = 'middle'
  if (wording) {
    const wordingSize = fitFont(ctx, wording, 800, font, 50, 820, 0.08)
    ctx.font = `800 ${wordingSize}px ${font}`
    spacedText(ctx, wording, 500, 228, wordingSize, 0.08)
    const dateSize = fitFont(ctx, date, 800, font, 64, 820, 0.05)
    ctx.font = `800 ${dateSize}px ${font}`
    spacedText(ctx, date, 500, 290, dateSize, 0.05)
  } else {
    const dateSize = fitFont(ctx, date, 800, font, 92, 820, 0.05)
    ctx.font = `800 ${dateSize}px ${font}`
    spacedText(ctx, date, 500, 262, dateSize, 0.05)
  }

  const phone = `Tel: ${STAMP_ISSUER.phone}`
  const phoneSize = fitFont(ctx, phone, 600, font, 38, 820, 0.03)
  ctx.font = `600 ${phoneSize}px ${font}`
  spacedText(ctx, phone, 500, 378, phoneSize, 0.03)
}

/**
 * Turns the two-tone FXMed mark into ink: the deep green half solid, the
 * light half a lighter tint, white left clear.
 */
export function tintEmblemPixels(rgba: Uint8ClampedArray, ink: StampInk) {
  const hex = (STAMP_INKS[ink] || STAMP_INKS.green).color
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  for (let index = 0; index < rgba.length; index += 4) {
    const alpha = rgba[index + 3] / 255
    const light = (0.2126 * rgba[index] + 0.7152 * rgba[index + 1] + 0.0722 * rgba[index + 2]) / 255
    const strength = light > 0.9 ? 0 : light > 0.6 ? 0.38 : 1
    rgba[index] = r
    rgba[index + 1] = g
    rgba[index + 2] = b
    rgba[index + 3] = Math.round(255 * alpha * strength)
  }
}
