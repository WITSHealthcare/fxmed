// Finds where a document asks for a stamp, and picks where the stamp goes.
//
// Plain geometry and text rules with no browser code. Positions are PDF points
// on the page as it is displayed (any page rotation already applied),
// measured from the top-left corner.

export type Box = { left: number; top: number; right: number; bottom: number }

/** A piece of text on the page, as the PDF lays it out. */
export type TextRun = { text: string; left: number; top: number; width: number; height: number }

export type StampRequest = {
  /** The words asking for the stamp, such as "Hospital stamp". */
  label: string
  /** The label with any blank line or box that goes with it. */
  anchor: Box
  /** Just the words, which the stamp should not cover. */
  labelBox: Box | null
  /** The empty space meant for the stamp, when known. */
  area: Box | null
  /** A field label, rather than a mention of a stamp in a sentence. */
  strong: boolean
}

export type Placement = { x: number; y: number; width: number; height: number }

const area = (box: Box) => Math.max(0, box.right - box.left) * Math.max(0, box.bottom - box.top)

function overlap(a: Box, b: Box) {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  return width > 0 && height > 0 ? width * height : 0
}

function gapBetween(a: Box, b: Box) {
  const dx = Math.max(0, a.left - b.right, b.left - a.right)
  const dy = Math.max(0, a.top - b.bottom, b.top - a.bottom)
  return Math.sqrt(dx * dx + dy * dy)
}

function union(boxes: Box[]): Box {
  return {
    left: Math.min(...boxes.map(box => box.left)),
    top: Math.min(...boxes.map(box => box.top)),
    right: Math.max(...boxes.map(box => box.right)),
    bottom: Math.max(...boxes.map(box => box.bottom)),
  }
}

/** A box shrunk by dx and dy on each side (grown, if negative). */
function inset(box: Box, dx: number, dy: number): Box {
  return { left: box.left + dx, right: box.right - dx, top: box.top + dy, bottom: box.bottom - dy }
}

export function footprint({ x, y, width, height }: Placement): Box {
  return { left: x - width / 2, top: y - height / 2, right: x + width / 2, bottom: y + height / 2 }
}

// ---------------------------------------------------------------------------
// Reading the page's text

type Line = { runs: TextRun[]; middle: number; height: number }

/** Runs that share a baseline, left to right. */
export function textLines(runs: TextRun[]) {
  const sorted = runs
    .filter(run => run.text.trim() && run.width > 0 && run.height > 0)
    .sort((a, b) => (a.top + a.height / 2) - (b.top + b.height / 2) || a.left - b.left)
  const lines: Line[] = []
  for (const run of sorted) {
    const middle = run.top + run.height / 2
    let line: Line | undefined
    for (let index = lines.length - 1; index >= Math.max(0, lines.length - 4); index--) {
      const candidate = lines[index]
      if (Math.abs(candidate.middle - middle) < Math.min(candidate.height, run.height) * 0.45) { line = candidate; break }
    }
    if (line) line.runs.push(run)
    else lines.push({ runs: [run], middle, height: run.height })
  }
  for (const line of lines) line.runs.sort((a, b) => a.left - b.left)
  return lines
}

type Segment = { text: string; runs: TextRun[]; starts: number[] }

/** Splits a line where a wide gap separates columns or form fields. */
function segments(line: Line): Segment[] {
  const result: Segment[] = []
  let current: Segment | null = null
  let previous: TextRun | null = null
  for (const run of line.runs) {
    const gap = previous ? run.left - (previous.left + previous.width) : 0
    if (!current || !previous || gap > Math.max(previous.height, run.height) * 1.6) {
      current = { text: '', runs: [], starts: [] }
      result.push(current)
    } else if (gap > Math.min(previous.height, run.height) * 0.12 && !/\s$/.test(current.text) && !/^\s/.test(run.text)) {
      current.text += ' '
    }
    current.starts.push(current.text.length)
    current.runs.push(run)
    current.text += run.text
    previous = run
  }
  return result
}

/** The box around characters [from, to) of a segment. */
function boxOfRange(segment: Segment, from: number, to: number): Box | null {
  const boxes: Box[] = []
  segment.runs.forEach((run, index) => {
    const start = segment.starts[index]
    const end = start + run.text.length
    const a = Math.max(from, start)
    const b = Math.min(to, end)
    if (b <= a) return
    const perChar = run.width / Math.max(1, run.text.length)
    boxes.push({ left: run.left + (a - start) * perChar, right: run.left + (b - start) * perChar, top: run.top, bottom: run.top + run.height })
  })
  return boxes.length ? union(boxes) : null
}

const STAMP_WORD = /\b(stamp|seal)\b/gi
// Uses of the words that are not a request to stamp the document.
const NOT_A_REQUEST_AFTER = /^\s*(dut(y|ies)|paper|collection|album|vendor|office|machine)\b/i
const NOT_A_REQUEST_BEFORE = /\b(time|postage|revenue|tamper[- ]?evident|hermetic|airtight)\s*$/i
// Leader characters that mark a blank to fill in.
const LEADERS = /[_.…\-–—\s]+$/

/** Every place in the text that asks for a stamp or seal. */
export function findStampRequests(runs: TextRun[]): StampRequest[] {
  const requests: StampRequest[] = []
  for (const line of textLines(runs)) {
    for (const segment of segments(line)) {
      const text = segment.text
      STAMP_WORD.lastIndex = 0
      let match: RegExpExecArray | null
      let found: { start: number; end: number } | null = null
      while ((match = STAMP_WORD.exec(text))) {
        const before = text.slice(0, match.index)
        const after = text.slice(match.index + match[0].length)
        if (NOT_A_REQUEST_AFTER.test(after) || NOT_A_REQUEST_BEFORE.test(before)) continue
        found = { start: match.index, end: match.index + match[0].length }
        break
      }
      if (!found) continue

      // A field label ("Hospital stamp:", "Signature & stamp ____"), rather
      // than a sentence that mentions a stamp ("...must carry the stamp.").
      const words = text.split(/\s+/).filter(word => /[a-z0-9]/i.test(word))
      const following = text.slice(found.end)
      const blankFollows = /^\s*(:|_|\.{2,}|…|\)|\])/.test(following)
      const sentence = /[.!?]$/.test(text.replace(/[\s_]+$/, ''))
      const continues = /^[a-z]/.test(text.trim())
      const strong = blankFollows
        || (words.length <= 8 && !sentence && !continues)
        || (words.length <= 16 && !continues && /\b(here|below|above|box|space provided)\b/i.test(text))

      // The words themselves, without the blank line after them.
      const wordsEnd = text.replace(LEADERS, '').length
      const wordsStart = text.length - text.replace(/^[\s_.…\-–—]+/, '').length
      const anchor = boxOfRange(segment, 0, text.length)
      if (!anchor) continue
      const labelBox = wordsEnd > wordsStart ? boxOfRange(segment, wordsStart, wordsEnd) : null
      const label = text.slice(wordsStart, wordsEnd).replace(/\s+/g, ' ').replace(/[\s:]+$/, '').trim()
      requests.push({ label: label.length > 70 ? `${label.slice(0, 67)}…` : label, anchor, labelBox, area: null, strong })
    }
  }
  return requests
}

// ---------------------------------------------------------------------------
// How much ink is already on the page

/** Darkness of the rendered page, summed over a grid so any box is O(1). */
export type InkMap = { cell: number; columns: number; rows: number; sums: Float32Array }

/**
 * Builds the map from a rendering of the page (RGBA pixels at pxPerPt).
 * Light tints, such as shaded boxes, do not count as ink.
 */
export function inkMapFromPixels(rgba: ArrayLike<number>, pxWidth: number, pxHeight: number, pxPerPt: number, cell = 3): InkMap {
  const cellPx = cell * pxPerPt
  const columns = Math.max(1, Math.ceil(pxWidth / cellPx))
  const rows = Math.max(1, Math.ceil(pxHeight / cellPx))
  const totals = new Float64Array(columns * rows)
  const counts = new Float64Array(columns * rows)
  for (let py = 0; py < pxHeight; py++) {
    const row = Math.min(rows - 1, Math.floor(py / cellPx)) * columns
    for (let px = 0; px < pxWidth; px++) {
      const offset = (py * pxWidth + px) * 4
      const alpha = rgba[offset + 3] / 255
      const light = (0.299 * rgba[offset] + 0.587 * rgba[offset + 1] + 0.114 * rgba[offset + 2]) * alpha + 255 * (1 - alpha)
      const index = row + Math.min(columns - 1, Math.floor(px / cellPx))
      totals[index] += light < 225 ? (225 - light) / 225 : 0
      counts[index] += 1
    }
  }
  // Summed-area table, one larger than the grid each way. Single precision
  // is plenty here and keeps long documents light.
  const sums = new Float32Array((columns + 1) * (rows + 1))
  for (let row = 0; row < rows; row++) {
    let running = 0
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column
      // A thin line darkens little of its cell but matters as much as text:
      // anything clearly there counts nearly in full.
      running += counts[index] ? Math.min(1, totals[index] / counts[index] * 3) : 0
      sums[(row + 1) * (columns + 1) + column + 1] = sums[row * (columns + 1) + column + 1] + running
    }
  }
  return { cell, columns, rows, sums }
}

/** Total ink inside a box, and how many grid cells that covers. */
function inkSum(map: InkMap, box: Box): [number, number] {
  const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))
  const c0 = clamp(Math.floor(box.left / map.cell), map.columns)
  const c1 = clamp(Math.ceil(box.right / map.cell), map.columns)
  const r0 = clamp(Math.floor(box.top / map.cell), map.rows)
  const r1 = clamp(Math.ceil(box.bottom / map.cell), map.rows)
  const cells = (c1 - c0) * (r1 - r0)
  if (cells <= 0) return [0, 0]
  const width = map.columns + 1
  return [map.sums[r1 * width + c1] - map.sums[r0 * width + c1] - map.sums[r1 * width + c0] + map.sums[r0 * width + c0], cells]
}

/** Average darkness (0 to 1) inside a box. */
export function inkIn(map: InkMap, box: Box) {
  const [sum, cells] = inkSum(map, box)
  return cells ? sum / cells : 0
}

function intersection(a: Box, b: Box): Box | null {
  const box = { left: Math.max(a.left, b.left), top: Math.max(a.top, b.top), right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom) }
  return box.right > box.left && box.bottom > box.top ? box : null
}

/** Ink inside a box, leaving out the request's own label and blank line. */
function inkAround(map: InkMap, box: Box, own: Box) {
  const [sum, cells] = inkSum(map, box)
  if (!cells) return 0
  const shared = intersection(box, own)
  return Math.max(0, sum - (shared ? inkSum(map, shared)[0] : 0)) / cells
}

// ---------------------------------------------------------------------------
// Choosing the spot

type PlaceOptions = {
  ink: InkMap | null
  page: { width: number; height: number }
  request: Pick<StampRequest, 'anchor' | 'labelBox' | 'area'>
  /** The stamp's usual size; it may be made a little smaller to fit a box. */
  size: { width: number; height: number }
  round: boolean
  /** Stamps already placed on this page, which must not be covered. */
  taken: Box[]
  /** The page's text, including fill-in lines, which is best left clear. */
  text?: Box[]
}

const SCALES = [1, 0.88, 0.76]
const MARGIN = 6

/**
 * The clearest spot near the request: as little existing ink under the
 * stamp as possible, without covering the label, close to it, and preferably
 * beside or below it, the way a stamp is usually placed on a form.
 */
export function placeStamp({ ink, page, request, size, round, taken, text = [] }: PlaceOptions): Placement {
  const target = request.area || request.anchor
  let best: Placement | null = null
  let bestScore = Infinity
  // Text near the request, other than the request's own label and blank line.
  const reach = { left: target.left - size.width * 2, right: target.right + size.width * 2, top: target.top - size.height * 2, bottom: target.bottom + size.height * 2 }
  const nearbyText = text.filter(run => overlap(run, reach) > 0 && overlap(run, request.anchor) < area(run) * 0.6)

  for (const scale of SCALES) {
    const width = Math.min(size.width * scale, page.width - MARGIN * 2)
    const height = Math.min(size.height * scale, page.height - MARGIN * 2)
    const step = Math.max(2, Math.min(width, height) / 12)
    const reachX = request.area ? width * 0.35 : width * 1.15
    const reachY = request.area ? height * 0.35 : height * 1.15
    const fromX = Math.max(MARGIN + width / 2, target.left - reachX)
    const toX = Math.min(page.width - MARGIN - width / 2, target.right + reachX)
    const fromY = Math.max(MARGIN + height / 2, target.top - reachY)
    const toY = Math.min(page.height - MARGIN - height / 2, target.bottom + reachY)

    for (let y = fromY; y <= toY + 0.01; y += step) {
      for (let x = fromX; x <= toX + 0.01; x += step) {
        const spot = { x, y, width, height }
        const box = footprint(spot)
        // The stamp's outline: the whole box for a rectangle; for a round
        // seal, a plus shape that reaches its rim but not the empty corners.
        const shapes = round ? [inset(box, 0, height * 0.2), inset(box, width * 0.2, 0)] : [box]
        const halo = width * 0.12
        let score = 0
        for (const shape of shapes) {
          if (ink) {
            score += inkAround(ink, shape, request.anchor) * 26 / shapes.length
            // Some clear space around the stamp, so it sits in the middle
            // of a box or blank area rather than against its edge.
            score += inkAround(ink, inset(shape, -halo, -halo), request.anchor) * 8 / shapes.length
          }
          let covered = 0
          for (const run of nearbyText) covered += overlap(shape, run)
          score += covered / area(shape) * 14 / shapes.length
        }
        if (request.labelBox && area(request.labelBox) > 0) score += overlap(box, request.labelBox) / area(request.labelBox) * 4
        score += gapBetween(box, target) / width * 1.4
        // Among equally clear spots, the one lined up with the request.
        score += Math.abs(x - (target.left + target.right) / 2) / width * 0.12
        if (request.area) score += (1 - overlap(box, request.area) / Math.min(area(box), Math.max(1, area(request.area)))) * 1.5
        if (y < request.anchor.top) score += 0.3
        if (x < request.anchor.left && y < request.anchor.bottom) score += 0.15
        for (const other of taken) score += overlap(box, other) / area(box) * 30
        score += (1 - scale) * 2.2
        if (score < bestScore) { bestScore = score; best = spot }
      }
    }
  }

  if (best) return best
  // The page is smaller than the stamp: centre it on the request.
  return {
    x: Math.min(Math.max((target.left + target.right) / 2, size.width / 2), page.width - size.width / 2),
    y: Math.min(Math.max((target.top + target.bottom) / 2, size.height / 2), page.height - size.height / 2),
    width: size.width,
    height: size.height,
  }
}

/** Drops requests that repeat one already found nearby on the same page. */
export function distinctRequests(requests: StampRequest[], nearness: number) {
  const kept: StampRequest[] = []
  for (const request of requests) {
    const centre = (box: Box) => [(box.left + box.right) / 2, (box.top + box.bottom) / 2]
    const [x, y] = centre(request.area || request.anchor)
    const repeat = kept.some(other => {
      const [ox, oy] = centre(other.area || other.anchor)
      return Math.abs(ox - x) < nearness && Math.abs(oy - y) < nearness / 2
    })
    if (!repeat) kept.push(request)
  }
  return kept
}

// ---------------------------------------------------------------------------
// Page coordinates

/** Converts a point on the displayed page back to the PDF's own coordinates. */
export function toPdfPoint(transform: number[], x: number, y: number): [number, number] {
  const [a, b, c, d, e, f] = transform
  const det = a * d - b * c
  return [(d * (x - e) - c * (y - f)) / det, (-b * (x - e) + a * (y - f)) / det]
}

/**
 * Where to draw an image so that, on a page turned by `rotation` degrees,
 * it shows upright and centred on the given PDF point.
 */
export function uprightImageOrigin(centreX: number, centreY: number, width: number, height: number, rotation: number) {
  const angle = (((rotation % 360) + 360) % 360) * Math.PI / 180
  const cos = Math.round(Math.cos(angle))
  const sin = Math.round(Math.sin(angle))
  return {
    x: centreX - (width / 2 * cos - height / 2 * sin),
    y: centreY - (width / 2 * sin + height / 2 * cos),
  }
}
