// Lesson content is Markdown with a few extras: tables, callout boxes,
// images, and drawn visuals written as fenced JSON blocks. It is parsed into
// blocks here and rendered as React elements (never as HTML), so lesson text
// cannot inject markup. Plain-text lessons written before this format render
// as paragraphs, exactly as they did. Syntax reference: docs/lesson-visuals.md.

export type Inline =
  | { t: 'text'; v: string } | { t: 'bold'; c: Inline[] } | { t: 'italic'; c: Inline[] }
  | { t: 'code'; v: string } | { t: 'link'; href: string; c: Inline[] } | { t: 'br' }

export const calloutKinds = ['note', 'tip', 'key', 'warning', 'example'] as const
export type CalloutKind = typeof calloutKinds[number]

export const visualKinds = ['chart', 'steps', 'compare', 'stats', 'cycle', 'timeline', 'hub', 'range', 'body'] as const
export type VisualKind = typeof visualKinds[number]

export type Block =
  | { t: 'heading'; level: 2 | 3 | 4; c: Inline[] }
  | { t: 'paragraph'; c: Inline[] }
  | { t: 'list'; ordered: boolean; start: number; items: Inline[][] }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][]; align: ('left' | 'center' | 'right')[] }
  | { t: 'callout'; kind: CalloutKind; title: string; body: Block[] }
  | { t: 'quote'; body: Block[] }
  | { t: 'image'; src: string; alt: string; caption: string }
  | { t: 'rule' }
  | { t: 'visual'; kind: VisualKind; data: Visual }
  | { t: 'invalid'; kind: string; error: string }

// ---------------------------------------------------------------------------
// Visual schemas. Every visual is validated and capped here, so a typo in a
// lesson shows a small notice instead of breaking the page.

export type Tone = 'good' | 'warning' | 'serious' | 'critical' | 'neutral'
const tones: Tone[] = ['good', 'warning', 'serious', 'critical', 'neutral']
export const bodySystems = ['brain', 'thyroid', 'heart', 'lungs', 'liver', 'stomach', 'gallbladder', 'pancreas', 'gut', 'adrenals', 'kidneys', 'reproductive', 'skin', 'muscles', 'bones', 'immune', 'blood', 'nerves'] as const
export type BodySystem = typeof bodySystems[number]

export type ChartVisual = { kind: 'chart'; type: 'bar' | 'column' | 'line' | 'donut'; title: string; caption: string; unit: string; labels: string[]; series: { name: string; values: number[] }[] }
export type StepsVisual = { kind: 'steps'; title: string; steps: { title: string; text: string }[] }
export type CompareVisual = { kind: 'compare'; title: string; columns: { heading: string; tone: Tone; points: string[] }[] }
export type StatsVisual = { kind: 'stats'; title: string; items: { value: string; label: string; note: string }[] }
export type CycleVisual = { kind: 'cycle'; title: string; center: string; items: string[] }
export type TimelineVisual = { kind: 'timeline'; title: string; items: { when: string; title: string; text: string }[] }
export type HubVisual = { kind: 'hub'; title: string; center: string; items: { label: string; text: string }[] }
export type RangeVisual = { kind: 'range'; title: string; unit: string; min: number; max: number; bands: { from: number; to: number; label: string; tone: Tone }[]; markers: { value: number; label: string }[]; caption: string }
export type BodyVisual = { kind: 'body'; title: string; items: { system: BodySystem; label: string; text: string }[] }
export type Visual = ChartVisual | StepsVisual | CompareVisual | StatsVisual | CycleVisual | TimelineVisual | HubVisual | RangeVisual | BodyVisual

const str = (value: unknown, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : typeof value === 'number' ? String(value) : ''
const num = (value: unknown) => { const n = typeof value === 'number' ? value : Number(value); return Number.isFinite(n) ? n : null }
const arr = (value: unknown, limit: number) => Array.isArray(value) ? value.slice(0, limit) : []
const obj = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const tone = (value: unknown): Tone => tones.includes(value as Tone) ? value as Tone : 'neutral'

function need<T>(list: T[], min: number, what: string) {
  if (list.length < min) throw new Error(`Needs at least ${min} ${what}.`)
  return list
}

export function validateVisual(kind: VisualKind, raw: unknown): Visual {
  const v = obj(raw); const title = str(v.title, 160)
  switch (kind) {
    case 'chart': {
      const type = (['bar', 'column', 'line', 'donut'] as const).find((t) => t === v.type) || 'column'
      // Shorthand: "data": [{ "label": "A", "value": 3 }] for a single series.
      const data = arr(v.data, 24).map(obj)
      let labels = arr(v.labels, 24).map((l) => str(l, 60))
      let series = arr(v.series, type === 'line' ? 3 : 6).map(obj).map((s) => ({ name: str(s.name, 60), values: arr(s.values, 24).map((n) => num(n) ?? 0) }))
      if (data.length) { labels = data.map((d) => str(d.label, 60)); series = [{ name: str(v.name, 60) || title, values: data.map((d) => num(d.value) ?? 0) }] }
      need(labels, 2, 'labels'); need(series, 1, 'series')
      if (type === 'donut' && series.length > 1) series = series.slice(0, 1)
      if (type === 'donut' && labels.length > 6) throw new Error('A donut shows at most 6 slices; group the rest as "Other".')
      if (series.some((s) => s.values.length !== labels.length)) throw new Error('Each series needs one value per label.')
      return { kind, type, title, caption: str(v.caption, 300), unit: str(v.unit, 20), labels, series }
    }
    case 'steps': return { kind, title, steps: need(arr(v.steps, 8).map(obj).map((s) => ({ title: str(s.title, 80), text: str(s.text, 300) })).filter((s) => s.title), 2, 'steps') }
    case 'compare': return { kind, title, columns: need(arr(v.columns, 3).map(obj).map((c) => ({ heading: str(c.heading, 80), tone: tone(c.tone), points: arr(c.points, 8).map((p) => str(p, 240)).filter(Boolean) })).filter((c) => c.heading), 2, 'columns') }
    case 'stats': return { kind, title, items: need(arr(v.items, 4).map(obj).map((s) => ({ value: str(s.value, 24), label: str(s.label, 80), note: str(s.note, 160) })).filter((s) => s.value), 1, 'item') }
    case 'cycle': return { kind, title, center: str(v.center, 40), items: need(arr(v.items, 8).map((i) => str(i, 40)).filter(Boolean), 3, 'items') }
    case 'timeline': return { kind, title, items: need(arr(v.items, 10).map(obj).map((s) => ({ when: str(s.when, 40), title: str(s.title, 80), text: str(s.text, 240) })).filter((s) => s.title), 2, 'items') }
    case 'hub': return { kind, title, center: str(v.center, 40), items: need(arr(v.items, 8).map(obj).map((s) => ({ label: str(s.label, 40), text: str(s.text, 160) })).filter((s) => s.label), 3, 'items') }
    case 'range': {
      const min = num(v.min), max = num(v.max)
      if (min === null || max === null || max <= min) throw new Error('Give a "min" below "max".')
      const clamp = (n: number) => Math.min(max, Math.max(min, n))
      const bands = need(arr(v.bands, 6).map(obj).flatMap((b) => { const from = num(b.from), to = num(b.to); return from === null || to === null || to <= from ? [] : [{ from: clamp(from), to: clamp(to), label: str(b.label, 40), tone: tone(b.tone) }] }), 1, 'band')
      const markers = arr(v.markers, 3).map(obj).flatMap((m) => { const value = num(m.value); return value === null ? [] : [{ value: clamp(value), label: str(m.label, 40) }] })
      return { kind, title, unit: str(v.unit, 20), min, max, bands, markers, caption: str(v.caption, 300) }
    }
    case 'body': return { kind, title, items: need(arr(v.items, 10).map(obj).flatMap((s) => bodySystems.includes(s.system as BodySystem) ? [{ system: s.system as BodySystem, label: str(s.label, 40) || String(s.system), text: str(s.text, 200) }] : []), 1, 'body system (one of: ' + bodySystems.join(', ') + ')') }
  }
}

// ---------------------------------------------------------------------------
// Inline Markdown: **bold**, *italic*, `code`, [text](https://link).

export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  let buffer = ''
  const flush = () => { if (buffer) { out.push({ t: 'text', v: buffer }); buffer = '' } }
  let i = 0
  while (i < text.length) {
    const rest = text.slice(i)
    let m: RegExpMatchArray | null
    if (rest[0] === '\n') { flush(); out.push({ t: 'br' }); i += 1; continue }
    if ((m = rest.match(/^`([^`\n]+)`/))) { flush(); out.push({ t: 'code', v: m[1] }); i += m[0].length; continue }
    if ((m = rest.match(/^\*\*([^*\n](?:[^\n]*?[^*\s])?)\*\*/))) { flush(); out.push({ t: 'bold', c: parseInline(m[1]) }); i += m[0].length; continue }
    if ((m = rest.match(/^\*([^*\s](?:[^*\n]*?[^*\s])?)\*(?!\*)/))) { flush(); out.push({ t: 'italic', c: parseInline(m[1]) }); i += m[0].length; continue }
    if ((m = rest.match(/^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/))) { flush(); out.push({ t: 'link', href: m[2], c: parseInline(m[1]) }); i += m[0].length; continue }
    buffer += text[i]; i += 1
  }
  flush()
  return out
}

// ---------------------------------------------------------------------------
// Blocks.

const fenceOpen = /^```\s*([a-z]+)?\s*$/i
const tableDivider = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/
const splitRow = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'))
const isListItem = (line: string) => /^\s*([-*•]|\d+[.)])\s+/.test(line)
const startsBlock = (line: string) => /^(#{2,4})\s/.test(line) || fenceOpen.test(line.trim()) || /^>/.test(line) || /^!\[/.test(line.trim()) || /^(-{3,}|\*{3,})\s*$/.test(line.trim())

export function parseLesson(content: string): Block[] {
  const lines = (content || '').replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) { i += 1; continue }

    // Fenced visual block: ```chart … ```
    const fence = trimmed.match(fenceOpen)
    if (fence) {
      const lang = (fence[1] || '').toLowerCase()
      const body: string[] = []; i += 1
      while (i < lines.length && lines[i].trim() !== '```') { body.push(lines[i]); i += 1 }
      i += 1
      if ((visualKinds as readonly string[]).includes(lang)) {
        try { blocks.push({ t: 'visual', kind: lang as VisualKind, data: validateVisual(lang as VisualKind, JSON.parse(body.join('\n'))) }) }
        catch (error) { blocks.push({ t: 'invalid', kind: lang, error: error instanceof SyntaxError ? 'The data is not valid JSON.' : (error as Error).message }) }
      } else if (body.join('').trim()) blocks.push({ t: 'paragraph', c: [{ t: 'code', v: body.join('\n') }] })
      continue
    }

    const heading = line.match(/^(#{2,4})\s+(.*)$/)
    if (heading) { blocks.push({ t: 'heading', level: heading[1].length as 2 | 3 | 4, c: parseInline(heading[2].trim()) }); i += 1; continue }
    if (/^#\s+/.test(line)) { blocks.push({ t: 'heading', level: 2, c: parseInline(line.replace(/^#\s+/, '').trim()) }); i += 1; continue }

    if (/^(-{3,}|\*{3,})\s*$/.test(trimmed)) { blocks.push({ t: 'rule' }); i += 1; continue }

    const image = trimmed.match(/^!\[([^\]]*)\]\(((?:https:\/\/|\/)[^\s)]+)(?:\s+"([^"]*)")?\)$/)
    if (image) { blocks.push({ t: 'image', alt: image[1].slice(0, 200), src: image[2], caption: (image[3] || '').slice(0, 300) }); i += 1; continue }

    // Blockquote, or a callout: > [!TIP] Optional title
    if (line.startsWith('>')) {
      const body: string[] = []
      while (i < lines.length && lines[i].startsWith('>')) { body.push(lines[i].replace(/^>\s?/, '')); i += 1 }
      const marker = body[0]?.match(/^\[!(\w+)\]\s*(.*)$/)
      const kind = marker?.[1].toLowerCase() as CalloutKind | undefined
      if (marker && kind && calloutKinds.includes(kind)) blocks.push({ t: 'callout', kind, title: marker[2].trim().slice(0, 120), body: parseLesson(body.slice(1).join('\n')) })
      else blocks.push({ t: 'quote', body: parseLesson(body.join('\n')) })
      continue
    }

    // Table: header row, divider row, then rows.
    if (line.includes('|') && i + 1 < lines.length && tableDivider.test(lines[i + 1])) {
      const head = splitRow(line)
      const align = splitRow(lines[i + 1]).map((cell) => cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : 'left') as ('left' | 'center' | 'right')[]
      const rows: Inline[][][] = []; i += 2
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        const cells = splitRow(lines[i]).slice(0, head.length)
        while (cells.length < head.length) cells.push('')
        rows.push(cells.map(parseInline)); i += 1
      }
      blocks.push({ t: 'table', head: head.map(parseInline), rows: rows.slice(0, 60), align })
      continue
    }

    if (isListItem(line)) {
      const ordered = /^\s*\d+[.)]\s/.test(line)
      // A numbered list keeps its first number, so "2." after a paragraph still reads 2.
      const start = ordered ? Number(line.match(/^\s*(\d+)/)![1]) : 1
      const items: string[] = []
      while (i < lines.length && lines[i].trim()) {
        if (isListItem(lines[i])) items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ''))
        else if (startsBlock(lines[i])) break
        else items[items.length - 1] += `\n${lines[i].trim()}`
        i += 1
      }
      blocks.push({ t: 'list', ordered, start, items: items.map(parseInline) })
      continue
    }

    // Paragraph: consecutive lines; single line breaks are kept as written.
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i]) && !isListItem(lines[i]) && !(lines[i].includes('|') && i + 1 < lines.length && tableDivider.test(lines[i + 1]))) { para.push(lines[i].trim()); i += 1 }
    if (para.length) blocks.push({ t: 'paragraph', c: parseInline(para.join('\n')) })
    else i += 1
  }
  return blocks
}

/** Problems an author should fix: visuals that failed to parse. */
export const lessonProblems = (content: string) => {
  const found: string[] = []
  const walk = (blocks: Block[]) => blocks.forEach((b) => { if (b.t === 'invalid') found.push(`${b.kind}: ${b.error}`); if (b.t === 'callout' || b.t === 'quote') walk(b.body) })
  walk(parseLesson(content))
  return found
}
