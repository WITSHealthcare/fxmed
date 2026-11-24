// The Functional Health Analysis lab report: a US Letter portrait PDF in four
// parts — Start Here, Your Body System by System, Your Care Plan and Your
// Results in Full — closing with a page of notes about the report.
//
// Each page is laid out as fixed-size HTML (816 × 1056 CSS px = 8.5 × 11 in),
// rasterised with html2canvas and placed on its own PDF sheet. Sizes are in em
// against the page's base font size, so a page whose content runs long is
// shrunk a step at a time until it fits rather than spilling or being cut.
// The same HTML drives the on-screen preview.

import {
  analyse, AREA_GROUPS, BAND_COLOR, BANDS, BAND_LABEL, bandOf, defaultFindings, defaultNextSteps, defaultRecommendations,
  defaultSummary, directionOf, likelihoodLabel, needsDetail, planFor, PLAN_PARTS, priorityOf,
  type Analysis, type AreaGroup, type AreaResult, type Band,
} from './fmAssessment'
import { ageInYears, deviation, FM_PANELS, PRIORITY_COLOR, type AssessedEntry, type FmEntry, type FmNarrative, type FmPatient } from './fmBiomarkers'
import { markerExplanation } from './fmMarkerInfo'

export const PAGE_W = 816
export const PAGE_H = 1056
const BASE_FONT = 11
const MIN_FONT = 8
// The clinic palette shared with the admin and the FxMed Twin: forest and sage
// on soft grey, with flag / watch / clear for results.
const DEEP = '#13261A'
const GREEN = '#4F7A35'
const SAGE = '#6F9A4E'
const LIME = '#C9D8AE'
const CREAM = '#F3F3F0'
const TRACK = '#E9EAE4'
const INK = '#161A15'
const BODY = '#4F544D'
const MUTED = '#6D726B'
const FAINT = '#B9BCB4'
const LINE = '#E6E6E1'
const ON_DARK = 'rgba(255,255,255,.72)'
// The brand mark keeps its own colours.
const BRAND_LIME = '#C9E265'
// Plus Jakarta Sans where the page can reach it (the admin sets --font-clinic), otherwise Arial.
const FONT = "var(--font-clinic), 'Plus Jakarta Sans', Arial, Helvetica, sans-serif"
const SVG_FONT = 'Arial, Helvetica, sans-serif'
const ACCENT = `linear-gradient(90deg, ${LIME}, ${SAGE})`

/** A tone for a 0–100 support score, on the report's own scale: worth watching from 50%, needs support from 70%. */
type Tone = 'clear' | 'watch' | 'flag'
const toneOf = (score: number): Tone => score >= 70 ? 'flag' : score >= 50 ? 'watch' : 'clear'
const TONE: Record<Tone, { solid: string; light: string; text: string; tint: string }> = {
  clear: { solid: SAGE, light: '#A9C98A', text: GREEN, tint: '#DFE8CF' },
  watch: { solid: '#D6A23A', light: '#EAD39A', text: '#8A6312', tint: '#F3E5BF' },
  flag: { solid: '#D0574F', light: '#E3A19B', text: '#9E2F29', tint: '#F2D3CF' },
}
/** Soft fills and readable text for each result band: discs, legends and labels. */
const BAND_STYLE: Record<Band, { tint: string; text: string }> = {
  alarm_low: { tint: '#ECC4C0', text: '#9E2F29' }, below_standard: { tint: TONE.flag.tint, text: '#B8433B' },
  below_optimal: { tint: TONE.watch.tint, text: TONE.watch.text }, optimal: { tint: TONE.clear.tint, text: GREEN },
  above_optimal: { tint: TONE.watch.tint, text: TONE.watch.text }, above_standard: { tint: TONE.flag.tint, text: '#B8433B' },
  alarm_high: { tint: '#ECC4C0', text: '#9E2F29' }, unknown: { tint: TRACK, text: MUTED },
}

export type FmReportData = {
  patient: FmPatient
  entries: FmEntry[]
  narrative: FmNarrative
  generatedAt?: Date
}

const esc = (value: string) => (value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const fmtDate = (date: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)

function readableDate(value: string) {
  if (!value) return ''
  // A bare date is a calendar day, not UTC midnight, so read it as local time.
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? fmtDate(parsed) : value
}

const chunk = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size))
const arrow = (direction: 'low' | 'high') => direction === 'low' ? '↓' : '↑'

// ---------------------------------------------------------------------------
// Sections and page chrome

type SectionId = 'start' | 'body' | 'plan' | 'results' | 'notes'

/** The report's parts, in print order. The closing notes have no number and no divider page. */
const SECTIONS: Array<{ id: SectionId; number: number | null; title: string; blurb: string }> = [
  { id: 'start', number: 1, title: 'Start Here', blurb: 'How FXMed reads your labs, and the short version of what we found.' },
  { id: 'body', number: 2, title: 'Your Body, System by System', blurb: 'Each body system and nutrient reserve, scored for how much support it needs right now.' },
  { id: 'plan', number: 3, title: 'Your Care Plan', blurb: 'The areas we will work on together, a plan for each, and what happens over the next 90 days.' },
  { id: 'results', number: 4, title: 'Your Results in Full', blurb: 'Every marker we measured, set against your laboratory\'s range and the FXMed optimal range.' },
  { id: 'notes', number: null, title: 'About This Report', blurb: 'What this report can and cannot tell you.' },
]
const sectionOf = (id: SectionId) => SECTIONS.find(item => item.id === id)!

/** Page number of the first page of each section's tab, keyed "section:tab". */
type TocIndex = Map<string, number>
type Page = { kind: 'cover' | 'divider' | 'content'; section: SectionId; tab: string; body: (toc: TocIndex) => string; tabs?: string[] }

/**
 * A piece of a flowing part of the report. Pieces are laid onto pages in
 * order, as many as fit. `resume` is shown above a piece that has to start a
 * new page part-way through a list (a panel heading marked "continued");
 * `keep` holds a piece on the same page as the one after it (a heading).
 */
type Block = { tab: string; html: string; resume?: string; keep?: boolean }

/** Measures pieces of a page in a hidden page of the real size, in the browser. */
function createMeasurer(patient: FmPatient) {
  if (typeof document === 'undefined') return null
  const host = document.createElement('div')
  Object.assign(host.style, { position: 'absolute', left: '-20000px', top: '0', visibility: 'hidden', pointerEvents: 'none' })
  const theme = document.querySelector('.clinic-theme')
  const font = theme && getComputedStyle(theme).getPropertyValue('--font-clinic')
  if (font) host.style.setProperty('--font-clinic', font)
  host.innerHTML = shell('', header('body', 'Measure', ['Measure']), patient, 1)
  document.body.appendChild(host)
  const body = host.querySelector<HTMLElement>('[data-fm-body]')
  if (!body) { host.remove(); return null }
  // Count each piece's own top and bottom margins, which would otherwise collapse out of the measurement.
  body.style.display = 'flow-root'
  // The same limit fitPage uses, less a little room for rounding and late font loads.
  const capacity = PAGE_H - 70 - body.offsetTop - 14
  return {
    capacity,
    height(html: string) { body.innerHTML = html; return body.scrollHeight },
    done() { host.remove() },
  }
}

let svgId = 0

/** The FxMed mark: a circle split by a wave, forest green below and lime above. */
function logoMark(size: number) {
  const id = `fmc${svgId++}`
  return `<svg width="${size}em" height="${size}em" viewBox="0 0 100 100" style="display:block">
    <defs><clipPath id="${id}"><circle cx="50" cy="50" r="50"/></clipPath></defs>
    <g clip-path="url(#${id})">
      <rect width="100" height="100" fill="${BRAND_LIME}"/>
      <path d="M -2 26 C 22 18 34 40 46 56 C 58 72 74 70 102 86 L 102 102 L -2 102 Z" fill="#14693E"/>
      <path d="M -2 26 C 22 18 34 40 46 56 C 58 72 74 70 102 86" fill="none" stroke="${DEEP}" stroke-width="3"/>
    </g>
  </svg>`
}

/** A header tab. SVG, because html2canvas draws text in small boxes too low. */
function pill(text: string, active: boolean) {
  const width = text.length * 0.56 + 1.9
  return `<span style="display:block;font-size:.8em"><svg width="${width}em" height="2.1em" viewBox="0 0 ${width * 10} 21" style="display:block">
    ${active ? `<rect width="${width * 10}" height="21" rx="10.5" fill="${LIME}"/>` : ''}
    <text x="${width * 5}" y="14.3" text-anchor="middle" font-family="${SVG_FONT}" font-size="10" font-weight="${active ? 700 : 500}" fill="${active ? DEEP : ON_DARK}">${esc(text)}</text>
  </svg></span>`
}

function header(section: SectionId, tab: string, tabs: string[]) {
  const { number } = sectionOf(section)
  return `<div style="background:${DEEP};padding:1.05em 2.6em;display:flex;align-items:center;justify-content:space-between">
      <img src="/logo-trimmed.png" style="height:1.75em;display:block" />
      <div style="display:flex;align-items:center;gap:.35em">
        ${number ? `<span style="font-size:.76em;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:${LIME};margin-right:.9em">Part ${number}</span>` : ''}
        ${tabs.map(item => pill(item, item === tab)).join('')}
      </div>
    </div>
    <div style="height:.32em;background:${ACCENT}"></div>`
}

function footer(patient: FmPatient, number: number, dark: boolean) {
  const date = readableDate(patient.collectedAt)
  return `<div style="position:absolute;left:2.6em;right:2.6em;bottom:1.6em;display:flex;align-items:center;justify-content:space-between;border-top:1px solid ${dark ? 'rgba(248,243,234,.2)' : LINE};padding-top:.75em;font-size:.85em;line-height:1.4;color:${dark ? ON_DARK : MUTED}">
    <span><span style="font-weight:800;color:${dark ? LIME : GREEN}">Functional Health Analysis · Lab Report</span> &nbsp;·&nbsp; ${esc(patient.name || 'Patient')}${date ? ` &nbsp;·&nbsp; Lab test ${esc(date)}` : ''}</span>
    ${disc(dark ? LIME : DEEP, [[String(number), 40, 700]], 2.3, false, dark ? DEEP : '#fff')}
  </div>`
}

function shell(content: string, chrome: string, patient: FmPatient, number: number | null, dark = false) {
  return `<div data-fm-page style="position:relative;width:${PAGE_W}px;height:${PAGE_H}px;overflow:hidden;background:${dark ? DEEP : '#fff'};color:${INK};font-family:${FONT};font-size:${BASE_FONT}px;line-height:1.45;box-sizing:border-box">
    ${chrome}
    <div data-fm-body style="padding:0 2.6em">${content}</div>
    ${number === null ? '' : footer(patient, number, dark)}
  </div>`
}

const dash = (margin = '1.6em 0 1em') => `<div style="width:3.2em;height:.42em;background:${LIME};border-radius:1em;margin:${margin}"></div>`

function title(text: string) {
  return `${dash()}<div style="font-size:2.9em;font-weight:500;letter-spacing:-.02em;line-height:1.2;color:${DEEP}">${esc(text)}</div>`
}

const subtitle = (text: string) => `<div style="font-size:2.1em;font-weight:400;color:${GREEN};line-height:1.3;margin:1.4em 0 .7em">${esc(text)}</div>`
const lead = (text: string) => `<p style="font-size:1.08em;line-height:1.65;color:${BODY};margin:.9em 0 0">${esc(text)}</p>`
const heading = (text: string) => `<div style="font-size:1.05em;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:1em">${esc(text)}</div>`

// ---------------------------------------------------------------------------
// Charts


/** A filled circle with centred lines of text. SVG, because html2canvas mis-centres text in boxes. */
function disc(color: string, lines: Array<[string, number, number?]>, size: number, outline = false, text = '#fff') {
  const total = lines.reduce((sum, [, font]) => sum + font, 0) + (lines.length - 1) * 4
  let y = 50 - total / 2
  const texts = lines.map(([label, font, weight], index) => {
    y += (index ? 4 : 0) + font * 0.85
    const line = `<text x="50" y="${y}" text-anchor="middle" font-family="${SVG_FONT}" font-size="${font}" font-weight="${weight || 400}" fill="${outline ? INK : text}">${esc(label)}</text>`
    y += font * 0.15
    return line
  }).join('')
  return `<svg width="${size}em" height="${size}em" viewBox="0 0 100 100" style="display:block;flex:none"><circle cx="50" cy="50" r="${outline ? 48 : 50}" fill="${outline ? '#fff' : color}" stroke="${outline ? '#9CA3AF' : 'none'}" stroke-width="${outline ? 2 : 0}"/>${texts}</svg>`
}

/** The four support levels, on the report's 50 / 70 / 90 thresholds (see likelihoodLabel). */
const LEVELS = [
  { name: 'Holding steady', short: 'Holding steady', from: 0, solid: SAGE, tint: '#DFE8CF', faint: '#EEF3E6', text: GREEN },
  { name: 'Worth watching', short: 'Watching', from: 50, solid: '#D6A23A', tint: '#F1DFAE', faint: '#F7EFD8', text: '#8A6312' },
  { name: 'Needs support', short: 'Support', from: 70, solid: '#D0574F', tint: '#ECC0BB', faint: '#F6E3E0', text: '#B8433B' },
  { name: 'Priority support', short: 'Priority', from: 90, solid: '#9E2F29', tint: '#DDA9A5', faint: '#F2DEDC', text: '#9E2F29' },
] as const
const levelOf = (score: number) => score >= 90 ? 3 : score >= 70 ? 2 : score >= 50 ? 1 : 0

/** Signal bars: four rising bars, lit up to the score's level. */
function signalBars(score: number, size = 5.6) {
  const level = levelOf(score), tone = LEVELS[level]
  const bars = [22, 36, 52, 70].map((height, index) => `<rect x="${index * 22}" y="${70 - height}" width="16" height="${height}" rx="4" fill="${index <= level ? tone.solid : '#E9EAE4'}"/>`).join('')
  return `${svgOpen(size, 82, 70)}${bars}</svg></div>`
}

/** A dot scale: ten dots, one for each 10% of the score, coloured by its level. */
function dotScale(score: number, width = 12) {
  const level = levelOf(score), tone = LEVELS[level]
  const filled = Math.round(Math.max(0, Math.min(score, 100)) / 10)
  const dots = Array.from({ length: 10 }, (_, index) => `<circle cx="${7 + index * 18}" cy="8" r="6.5" fill="${index < filled ? tone.solid : index === filled ? tone.faint : '#E9EAE4'}"/>`).join('')
  return `${svgOpen(width, 176, 16, 'start')}${dots}</svg></div>`
}

/** A level meter: the four levels as one bar, the score's level in full colour, and a pin at the score. */
function levelMeter(score: number, width = 30) {
  const level = levelOf(score), W = 300
  const x = (value: number) => (value / 100) * W
  const ends = [0, 50, 70, 90, 100]
  const parts = LEVELS.map((tone, index) => {
    const left = x(ends[index]) + (index ? 1.5 : 0), right = x(ends[index + 1]) - (index < 3 ? 1.5 : 0)
    const fill = index === level ? tone.solid : index < level ? tone.tint : tone.faint
    return `<rect x="${left.toFixed(1)}" y="5" width="${(right - left).toFixed(1)}" height="10" rx="${index === 0 || index === 3 ? 5 : 1.5}" fill="${fill}"/>`
  }).join('')
  // Square inner corners: cover the rounded ends where segments meet.
  const joins = `<rect x="${x(50) - 6}" y="5" width="4.5" height="10" fill="${level === 0 ? LEVELS[0].solid : LEVELS[0].tint}"/><rect x="${x(90) + 1.5}" y="5" width="4.5" height="10" fill="${level === 3 ? LEVELS[3].solid : LEVELS[3].faint}"/>`
  const pin = Math.max(7, Math.min(W - 7, x(score)))
  return `${svgOpen(width, W, 20, 'start')}${parts}${joins}<circle cx="${pin.toFixed(1)}" cy="10" r="7" fill="#fff" stroke="${LEVELS[level].text}" stroke-width="3.2"/></svg></div>`
}

/** The four levels as a key: a dot in each colour and its name. */
function levelKey() {
  return `<div style="display:flex;flex-wrap:wrap;gap:.2em 1.4em;font-size:.82em;color:${BODY}">${LEVELS.map((tone, index) => `<span style="white-space:nowrap"><span style="color:${tone.solid}">●</span> ${tone.name} <span style="color:${MUTED}">${index === 3 ? '90%+' : `${tone.from}–${LEVELS[index + 1].from}%`}</span></span>`).join('')}</div>`
}

/** The support scores of a group of areas: a row each with a dot scale, or (for the core body systems) a level meter. */
function likelihoodChart(items: AreaResult[], style: 'dots' | 'meter' = 'dots') {
  const nameW = 16.5, chartW = style === 'meter' ? 30 : 16
  const row = (item: AreaResult) => {
    const tone = LEVELS[levelOf(item.score)]
    return `<div style="display:flex;align-items:center;gap:1.2em;margin-bottom:.8em">
      <div style="width:${nameW}em;flex:none;text-align:right;font-size:.98em;line-height:1.3;color:${INK}">${esc(item.area.name)}</div>
      ${style === 'meter' ? levelMeter(item.score, chartW) : dotScale(item.score, chartW)}
      <div style="width:3.2em;flex:none;font-size:1em;font-weight:800;color:${tone.text}">${item.score}%</div>
      <div style="font-size:.82em;color:${tone.text}">${style === 'dots' ? esc(tone.name) : ''}</div>
    </div>`
  }
  const header = style === 'meter'
    ? `<div style="display:flex;gap:1.2em;margin-bottom:.9em"><div style="width:${nameW}em;flex:none"></div><div style="width:${chartW}em;flex:none;position:relative;height:1.4em;font-size:.82em">${LEVELS.map((tone, index) => {
      const left = [0, 50, 70, 90][index], width = [50, 20, 20, 10][index]
      return `<span style="position:absolute;left:${left}%;width:${width}%;text-align:center;color:${tone.text};font-weight:700;white-space:nowrap">${tone.short}</span>`
    }).join('')}</div></div>`
    : `<div style="display:flex;gap:1.2em;margin-bottom:1em"><div style="width:${nameW}em;flex:none"></div>${levelKey()}</div>`
  return `<div style="margin-top:2.2em">
    <div style="text-align:center;font-weight:800;font-size:1.05em;letter-spacing:.06em;text-transform:uppercase;padding-bottom:.55em;border-bottom:1px solid ${FAINT};margin-bottom:1.1em">Support score</div>
    ${header}${items.map(row).join('')}
  </div>`
}

function bandCounts(analysis: Analysis) {
  const items: Array<[Band | 'total', string, number]> = [
    ...BANDS.map(band => [band, BAND_LABEL[band], analysis.bands[band]] as [Band, string, number]),
    ['total', 'Total', analysis.summary.total - analysis.bands.unknown],
  ]
  return `<div style="display:grid;grid-template-columns:repeat(8,1fr);margin-top:1.8em">${items.map(([band, label, count]) => `<div style="text-align:center">
      <div style="display:flex;justify-content:center">${band === 'total' ? disc('#fff', [[String(count), 32, 400]], 3.9, true) : disc(BAND_STYLE[band].tint, [[String(count), 32, 400]], 3.9, false, BAND_STYLE[band].text)}</div>
      <div style="border-left:1px solid ${FAINT};margin-top:.9em;padding:0 .3em;font-size:.82em;font-weight:800;line-height:1.35">${esc(label)}</div>
    </div>`).join('')}</div>`
}

// ---------------------------------------------------------------------------
// Assessment details

function markerList(items: Array<{ entry: AssessedEntry; direction?: 'low' | 'high' }>) {
  return items.map(({ entry, direction }) => `${esc(entry.name)}${direction ? `&nbsp;${arrow(direction)}` : ''}`).join(', ')
}

function evidence(item: AreaResult) {
  const block = (label: string, text: string) => text ? `<div style="margin-bottom:.9em"><div style="font-weight:800;color:${GREEN};margin-bottom:.15em">${label}</div><div style="color:${GREEN}">${text}</div></div>` : ''
  return `<div style="font-size:.88em;line-height:1.5">
    ${block('What moved the score', markerList(item.contributors) || 'Every marker here is on target.')}
    ${block('Markers we read', markerList(item.considered.map(entry => ({ entry }))))}
    ${item.missing.length ? block('Worth adding next time', esc(item.missing.join(', '))) : ''}
  </div>`
}

function gaugeColumn(score: number) {
  const { label, advice } = likelihoodLabel(score)
  const tone = LEVELS[levelOf(score)]
  return `<div style="text-align:center">
    ${signalBars(score, 5)}
    <div style="font-size:2.1em;line-height:1.25;color:${INK};letter-spacing:-.02em;margin-top:.35em">${score}<span style="font-size:.45em;color:${MUTED}">%</span></div>
    <div style="width:3.4em;border-top:1px solid ${FAINT};margin:1.1em auto .8em"></div>
    <div style="font-size:.92em;line-height:1.5;color:${BODY}"><span style="font-weight:800;color:${tone.text}">${esc(label)}.</span><br/>${esc(advice)}</div>
    <div style="width:3.4em;border-top:1px solid ${FAINT};margin:.9em auto 0"></div></div>`
}

function areaDetail(item: AreaResult) {
  return `<div style="display:grid;grid-template-columns:11.5em 1fr 15em;gap:1.8em;margin-bottom:2.6em">
    ${gaugeColumn(item.score)}
    <div><div style="font-size:1.35em;font-weight:800;letter-spacing:.01em;text-transform:uppercase;line-height:1.3">${esc(item.area.name)}</div>
      <div style="margin-top:.75em;font-size:1em;line-height:1.65;color:${BODY}">${esc(item.area.about)}</div></div>
    ${evidence(item)}
  </div>`
}

// ---------------------------------------------------------------------------
// Insight charts. Plain SVG, which html2canvas draws as an image, so their
// text is set in Arial; sizes are in the SVG's own units and scale with it.

/**
 * Opens a chart's SVG at a size in em. html2canvas draws an SVG from its own
 * width and height attributes, and reads "em" there against 16px rather than
 * the page's size; so the attributes are pixels and CSS sets the size in em.
 */
function svgOpen(widthEm: number, viewW: number, viewH: number, align: 'center' | 'start' = 'center') {
  const heightEm = (widthEm * viewH) / viewW
  // Centred by a flex wrapper: html2canvas shifts an SVG centred with auto margins by that margin again, cropping its right side.
  return `<div style="display:flex;justify-content:${align === 'center' ? 'center' : 'flex-start'};flex:none"><svg width="${Math.round(widthEm * BASE_FONT)}" height="${Math.round(heightEm * BASE_FONT)}" viewBox="0 0 ${viewW} ${viewH}" style="display:block;width:${widthEm}em;height:${heightEm.toFixed(2)}em">`
}

/** The bands from furthest below to furthest above, so a row of markers reads low → on target → high. */
const BAND_ORDER: Band[] = ['alarm_low', 'below_standard', 'below_optimal', 'optimal', 'above_optimal', 'above_standard', 'alarm_high']
const bandRank = (entry: AssessedEntry) => { const rank = BAND_ORDER.indexOf(bandOf(entry)); return rank < 0 ? 3 : rank }
/** Solid fills for a band on a chart. */
const BAND_FILL: Record<Band, string> = {
  alarm_low: '#9E2F29', below_standard: '#D0574F', below_optimal: '#D6A23A', optimal: SAGE,
  above_optimal: '#D6A23A', above_standard: '#D0574F', alarm_high: '#9E2F29', unknown: '#C9CBC3',
}
const onTarget = (entry: AssessedEntry) => bandOf(entry) === 'optimal'
const outsideLab = (band: Band) => band === 'below_standard' || band === 'above_standard' || band === 'alarm_low' || band === 'alarm_high'

/** The overall functional health score: markers on FXMed optimal count fully, borderline half. */
function healthScore(analysis: Analysis) {
  const scored = analysis.summary.assessed.filter(entry => entry.fm !== 'unknown')
  if (!scored.length) return 0
  const points = scored.reduce((sum, entry) => sum + (entry.fm === 'optimal' || entry.fm === 'normal' ? 1 : entry.fm === 'borderline' ? 0.5 : 0), 0)
  return Math.round((points / scored.length) * 100)
}
const scoreWord = (score: number) => score >= 85 ? 'Thriving' : score >= 70 ? 'Strong foundations' : score >= 55 ? 'Room to improve' : 'Needs focused support'

/** Blends two #RRGGBB colours. */
function mix(from: string, to: string, share: number) {
  const a = [1, 3, 5].map(index => parseInt(from.slice(index, index + 2), 16))
  const b = [1, 3, 5].map(index => parseInt(to.slice(index, index + 2), 16))
  return `#${a.map((value, index) => Math.round(value + (b[index] - value) * share).toString(16).padStart(2, '0')).join('')}`
}

/** A dial of fine ticks around a smooth progress ring, with the score in the middle. */
function tickRing(score: number, size = 15) {
  const id = `fmr${svgId++}`
  const ticks = 72, share = Math.max(0, Math.min(score, 100)) / 100
  const marks = Array.from({ length: ticks }, (_, index) => {
    const angle = (index / ticks) * Math.PI * 2 - Math.PI / 2
    const on = index / ticks < share
    const inner = 87, outer = index % 6 === 0 ? 97 : 94
    return `<line x1="${(100 + inner * Math.cos(angle)).toFixed(2)}" y1="${(100 + inner * Math.sin(angle)).toFixed(2)}" x2="${(100 + outer * Math.cos(angle)).toFixed(2)}" y2="${(100 + outer * Math.sin(angle)).toFixed(2)}" stroke="${on ? mix('#A9C98A', '#4F7A35', index / ticks) : '#DCDDD6'}" stroke-width="1.6" stroke-linecap="round"/>`
  }).join('')
  const ring = 2 * Math.PI * 72
  return `${svgOpen(size, 200, 200)}
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C5D9AE"/><stop offset="1" stop-color="${GREEN}"/></linearGradient></defs>
    ${marks}
    <circle cx="100" cy="100" r="72" fill="none" stroke="${TRACK}" stroke-width="9"/>
    ${share > 0 ? `<circle cx="100" cy="100" r="72" fill="none" stroke="url(#${id})" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(share * ring).toFixed(1)} 999" transform="rotate(-90 100 100)"/>` : ''}
    <text x="100" y="104" text-anchor="middle" font-family="${SVG_FONT}" font-size="46" fill="${INK}" letter-spacing="-1.5">${score}<tspan font-size="16" fill="${MUTED}" letter-spacing="0">/100</tspan></text>
    <text x="100" y="128" text-anchor="middle" font-family="${SVG_FONT}" font-size="10.5" fill="${MUTED}">Functional health score</text>
  </svg></div>`
}

/** Every marker as a dot on a three-row arc, from running low on the left, through on target, to running high on the right. */
function constellation(entries: AssessedEntry[], width = 26) {
  const sorted = [...entries].filter(entry => bandOf(entry) !== 'unknown').sort((a, b) => bandRank(a) - bandRank(b) || deviation(b.numeric, b.fmRangeParsed) * (bandRank(b) < 3 ? 1 : -1) - deviation(a.numeric, a.fmRangeParsed) * (bandRank(a) < 3 ? 1 : -1))
  const count = sorted.length
  const radii = [150, 126, 102]
  const gap = (Math.PI * radii[2]) / Math.max(1, Math.ceil(count / 3))
  const scale = Math.max(0.55, Math.min(1, gap / 19))
  const size: Record<number, number> = { 0: 9.5, 1: 8.5, 2: 7.4, 3: 6.6, 4: 7.4, 5: 8.5, 6: 9.5 }
  const dots = sorted.map((entry, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1)
    const angle = Math.PI * (1 - (0.03 + t * 0.94))
    const radius = radii[index % 3]
    const rank = bandRank(entry)
    const fade = rank === 3 ? [1, 0.8, 0.62][index % 3] : 1
    return `<circle cx="${(190 + radius * Math.cos(angle)).toFixed(1)}" cy="${(176 - radius * Math.sin(angle)).toFixed(1)}" r="${(size[rank] * scale).toFixed(1)}" fill="${BAND_FILL[bandOf(entry)]}" fill-opacity="${fade}"/>`
  }).join('')
  const on = sorted.filter(onTarget).length
  return `${svgOpen(width, 380, 200)}
    ${dots}
    <text x="190" y="150" text-anchor="middle" font-family="${SVG_FONT}" font-size="40" fill="${INK}" letter-spacing="-1">${on}<tspan font-size="15" fill="${MUTED}" letter-spacing="0"> of ${count}</tspan></text>
    <text x="190" y="170" text-anchor="middle" font-family="${SVG_FONT}" font-size="10.5" fill="${MUTED}">markers on target</text>
    <text x="22" y="196" font-family="${SVG_FONT}" font-size="10" fill="${MUTED}">Running low</text>
    <text x="358" y="196" text-anchor="end" font-family="${SVG_FONT}" font-size="10" fill="${MUTED}">Running high</text>
  </svg></div>`
}

/** A legend for the band colours used by the dot and bar charts. */
function bandLegend() {
  const item = (color: string, text: string) => `<span style="margin-right:1.4em;white-space:nowrap"><span style="color:${color}">●</span> ${text}</span>`
  return `<div style="font-size:.82em;color:${BODY};line-height:1.6">${item(SAGE, 'On target')}${item('#D6A23A', 'Off target, within lab range')}${item('#D0574F', 'Outside lab range')}${item('#9E2F29', 'Urgent')}</div>`
}

/** A panel as a scorecard: its score, a slim bar for each marker in band order, and the counts. */
function panelCard(name: string, entries: AssessedEntry[]) {
  const sorted = [...entries].filter(entry => bandOf(entry) !== 'unknown').sort((a, b) => bandRank(a) - bandRank(b))
  const scored = sorted.filter(entry => entry.fm !== 'unknown')
  const score = scored.length ? Math.round(scored.reduce((sum, entry) => sum + (entry.fm === 'optimal' || entry.fm === 'normal' ? 1 : entry.fm === 'borderline' ? 0.5 : 0), 0) / scored.length * 100) : 0
  const on = sorted.filter(onTarget).length
  const lab = sorted.filter(entry => outsideLab(bandOf(entry))).length
  const off = sorted.length - on - lab
  // One slim bar per marker, in band order, padded with empty slots so every card shares a rhythm.
  const slots = Math.max(sorted.length, 14)
  const bar = (color: string) => `<div style="width:.5em;height:1.7em;border-radius:.25em;background:${color};flex:none"></div>`
  const bars = sorted.map(entry => bar(BAND_FILL[bandOf(entry)])).join('') + Array.from({ length: slots - sorted.length }, () => bar('#E4E5DF')).join('')
  const tone = score >= 75 ? TONE.clear : score >= 50 ? TONE.watch : TONE.flag
  return `<div style="background:${CREAM};border-radius:1.1em;padding:1em 1.15em 1.05em">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:.6em"><span style="font-size:.86em;color:${BODY};line-height:1.3">${esc(name)}</span><span style="font-size:.72em;font-weight:700;color:${tone.text};white-space:nowrap">${on}/${sorted.length} on target</span></div>
    <div style="margin-top:.2em;line-height:1.25"><span style="font-size:2.3em;font-weight:400;letter-spacing:-.03em;color:${INK}">${score}</span><span style="font-size:.85em;color:${MUTED}"> /100</span></div>
    <div style="display:flex;gap:.32em;margin-top:.95em;overflow:hidden">${bars}</div>
    <div style="font-size:.76em;color:${MUTED};margin-top:.55em">${[off ? `${off} off target` : '', lab ? `<span style="color:#B8433B;font-weight:700">${lab} outside lab range</span>` : '', !off && !lab ? 'Every marker on target' : ''].filter(Boolean).join(' · ')}</div>
  </div>`
}

/** The off-target markers that would lift the score most if they came back to target, and the score that would give. */
function liftBox(analysis: Analysis) {
  const scored = analysis.summary.assessed.filter(entry => entry.fm !== 'unknown')
  if (!scored.length) return ''
  const gain = (entry: AssessedEntry) => (entry.fm === 'borderline' ? 0.5 : entry.fm === 'optimal' || entry.fm === 'normal' ? 0 : 1) / scored.length * 100
  const candidates = scored.filter(entry => gain(entry) > 0)
    .sort((a, b) => gain(b) - gain(a) || SEVERITY[bandOf(a)] - SEVERITY[bandOf(b)] || deviation(b.numeric, b.fmRangeParsed) - deviation(a.numeric, a.fmRangeParsed))
    .slice(0, 6)
  if (!candidates.length) return ''
  const now = healthScore(analysis)
  const projected = Math.min(100, Math.round(now + candidates.reduce((sum, entry) => sum + gain(entry), 0)))
  return `<div style="margin-top:1.8em;background:${DEEP};border-radius:1.2em;padding:1.4em 1.7em;color:#fff;display:grid;grid-template-columns:1fr 12em;gap:1.8em;align-items:center">
    <div><div style="font-size:.78em;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:${LIME}">Your fastest lift</div>
      <div style="font-size:1em;line-height:1.55;color:${ON_DARK};margin-top:.45em">Bring these markers back to target and your score climbs from ${now} to about ${projected}. Your care plan in Part 3 is built around them.</div>
      <div style="display:flex;flex-wrap:wrap;gap:.45em;margin-top:.9em">${candidates.map(entry => `<span style="display:inline-block;background:rgba(255,255,255,.1);border-radius:2em;padding:.3em .85em;font-size:.88em;line-height:1.5"><span style="color:${BAND_FILL[bandOf(entry)]}">●</span> ${esc(entry.name)} <span style="color:${LIME};font-weight:700">+${gain(entry).toFixed(1)}</span></span>`).join('')}</div></div>
    <div style="text-align:center">${disc(LIME, [[String(projected), 40, 400], ['possible', 12]], 7, false, DEEP)}</div>
  </div>`
}

/** Your Health Score: the score dial, every marker on the dot arc, and a scorecard for each panel. */
function healthScoreBody(analysis: Analysis) {
  const score = healthScore(analysis)
  const panels = analysis.summary.panels.filter(item => item.entries.some(entry => bandOf(entry) !== 'unknown'))
  return `${title('Your Health Score')}
    ${lead('One number for where your results stand today: the share of your markers sitting on the FXMed optimal target, with borderline results counting half. Below it, every marker you had tested, and how each panel is doing.')}
    <div style="display:grid;grid-template-columns:15.5em 1fr;gap:2em;align-items:center;margin-top:1.8em">
      <div style="text-align:center">${tickRing(score)}<div style="font-size:1.15em;font-weight:700;color:${DEEP};margin-top:.5em">${esc(scoreWord(score))}</div><div style="font-size:.85em;color:${MUTED};margin-top:.15em">Retest in 90 days to see this move</div></div>
      <div>${constellation(analysis.summary.assessed)}<div style="margin-top:.9em;display:flex;justify-content:center">${bandLegend()}</div></div>
    </div>
    ${heading('Panel by panel').replace('margin-bottom:1em', 'margin:2.4em 0 1em')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.9em">${panels.map(item => panelCard(item.panel.name, item.entries)).join('')}</div>
    ${liftBox(analysis)}`
}

/** Short names for the bubbles. */
const shortName = (name: string) => name.replace(/ Function$| Regulation$| Balance$| Health$/, '').replace(' & ', ' & ')
function wrapWords(text: string, width: number) {
  const lines: string[] = []
  for (const word of text.split(' ')) {
    const last = lines[lines.length - 1]
    if (last && (last + ' ' + word).length <= width) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  return lines.slice(0, 3)
}

/** Each area as a bubble: support score across, share of its markers off target up, size by markers read. Top right is where to act. */
function systemsMap(items: AreaResult[], width = 60) {
  const W = 640, H = 400, left = 44, right = 16, top = 18, bottom = 40
  const plotW = W - left - right, plotH = H - top - bottom
  const shown = items.filter(item => item.considered.length)
  const bubbles = shown.map((item, index) => {
    const off = item.considered.length ? (item.contributors.length / item.considered.length) * 100 : 0
    const r = Math.min(46, 21 + 5.2 * Math.sqrt(item.considered.length))
    return { item, r, x: left + (item.score / 100) * plotW, y: top + plotH - (Math.min(off, 100) / 100) * plotH, seed: index }
  })
  // Nudge overlapping bubbles apart, keeping each near its true place.
  for (let round = 0; round < 260; round++) {
    for (let a = 0; a < bubbles.length; a++) for (let b = a + 1; b < bubbles.length; b++) {
      const one = bubbles[a], two = bubbles[b]
      let dx = two.x - one.x, dy = two.y - one.y
      if (!dx && !dy) { dx = (two.seed % 2 ? 1 : -1) * 0.5; dy = 0.5 }
      const distance = Math.hypot(dx, dy), need = one.r + two.r + 3
      if (distance < need) {
        const push = (need - distance) / 2 / distance
        one.x -= dx * push; one.y -= dy * push; two.x += dx * push; two.y += dy * push
      }
    }
    for (const bubble of bubbles) {
      bubble.x = Math.max(left + bubble.r, Math.min(W - right - bubble.r, bubble.x))
      bubble.y = Math.max(top + bubble.r, Math.min(top + plotH - bubble.r, bubble.y))
    }
  }
  const x = (value: number) => left + (value / 100) * plotW
  const y = (value: number) => top + plotH - (value / 100) * plotH
  const grid = [0, 20, 40, 60, 80, 100].map(value => `<line x1="${x(value)}" y1="${top}" x2="${x(value)}" y2="${top + plotH}" stroke="#E2E3DD" stroke-dasharray="3 4"/><text x="${x(value)}" y="${top + plotH + 16}" text-anchor="middle" font-family="${SVG_FONT}" font-size="10" fill="${MUTED}">${value}%</text>`
    + `<line x1="${left}" y1="${y(value)}" x2="${left + plotW}" y2="${y(value)}" stroke="#E2E3DD" stroke-dasharray="3 4"/><text x="${left - 8}" y="${y(value) + 3.5}" text-anchor="end" font-family="${SVG_FONT}" font-size="10" fill="${MUTED}">${value}</text>`).join('')
  const zones = `<rect x="${x(50)}" y="${top}" width="${x(70) - x(50)}" height="${plotH}" fill="#FBF4E2"/><rect x="${x(70)}" y="${top}" width="${x(100) - x(70)}" height="${plotH}" fill="#FBEBE8"/>
    <text x="${x(60)}" y="${top + 14}" text-anchor="middle" font-family="${SVG_FONT}" font-size="9.5" font-weight="700" fill="#8A6312">WATCH</text>
    <text x="${x(85)}" y="${top + 14}" text-anchor="middle" font-family="${SVG_FONT}" font-size="9.5" font-weight="700" fill="#9E2F29">ACT FIRST</text>`
  const circles = bubbles.map(({ item, r, x: cx, y: cy }) => {
    const tone = toneOf(item.score)
    const fill = tone === 'flag' ? '#C9534B' : tone === 'watch' ? '#E2BC63' : '#B7D29C'
    const text = tone === 'flag' ? '#fff' : INK
    const font = Math.max(7.6, Math.min(10.5, r / 3.9))
    const lines = wrapWords(shortName(item.area.name), Math.max(7, Math.floor((r * 1.75) / (font * 0.56))))
    const block = lines.length * font * 1.15 + font * 1.25
    const start = cy - block / 2 + font * 0.9
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" fill-opacity=".92" stroke="#fff" stroke-width="1.5"/>`
      + lines.map((line, index) => `<text x="${cx.toFixed(1)}" y="${(start + index * font * 1.15).toFixed(1)}" text-anchor="middle" font-family="${SVG_FONT}" font-size="${font.toFixed(1)}" fill="${text}">${esc(line)}</text>`).join('')
      + `<text x="${cx.toFixed(1)}" y="${(start + lines.length * font * 1.15 + font * 0.25).toFixed(1)}" text-anchor="middle" font-family="${SVG_FONT}" font-size="${(font * 1.18).toFixed(1)}" font-weight="700" fill="${text}">${item.score}%</text>`
  }).join('')
  return `${svgOpen(width, W, H)}
    ${zones}${grid}${circles}
    <text x="${left + plotW / 2}" y="${H - 4}" text-anchor="middle" font-family="${SVG_FONT}" font-size="10.5" fill="${BODY}">Support score →</text>
    <text x="12" y="${top + plotH / 2}" text-anchor="middle" font-family="${SVG_FONT}" font-size="10.5" fill="${BODY}" transform="rotate(-90 12 ${top + plotH / 2})">Markers off target (%) →</text>
  </svg></div>`
}

function systemsMapBody(analysis: Analysis) {
  const core = analysis.group('system')
  const nutrients = [...analysis.group('nutrient'), ...analysis.group('accessory')]
  return `${title('Your Systems Map')}
    ${lead('Every body system at once. The further right a bubble sits, the higher its support score; the higher it sits, the more of its markers are off target; the bigger it is, the more markers we read for it. Start with anything in the top right.')}
    <div style="margin-top:1.4em">${systemsMap(core)}</div>
    ${nutrients.some(item => item.considered.length) ? `${heading('Whole-body processes and nourishment').replace('margin-bottom:1em', 'margin:1.6em 0 .6em')}${systemsMap(nutrients, 50)}` : ''}`
}

/** Three summary cards over the off-target chart: running high, running low, outside the lab range. */
function offTargetCards(entries: AssessedEntry[]) {
  const high = entries.filter(entry => directionOf(entry) === 'high'), low = entries.filter(entry => directionOf(entry) === 'low')
  const lab = entries.filter(entry => outsideLab(bandOf(entry)))
  const furthest = (list: AssessedEntry[]) => [...list].sort((a, b) => deviation(b.numeric, b.fmRangeParsed) - deviation(a.numeric, a.fmRangeParsed))[0]
  const card = (label: string, list: AssessedEntry[], tint: string, ink: string, note: string) => `<div style="border-radius:1.1em;overflow:hidden;background:${CREAM}">
    <div style="background:${tint};padding:.8em 1.1em;display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:.9em;font-weight:700;color:${ink}">${label}</span><span style="font-size:2em;line-height:1;color:${ink}">${list.length}</span></div>
    <div style="padding:.75em 1.1em;font-size:.82em;line-height:1.5;color:${BODY}">${list.length ? note.replace('{name}', esc(furthest(list).name)) : 'None'}</div></div>`
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.9em;margin-top:1.6em">
    ${card('Running high', high, '#F6E3DF', '#9E2F29', 'Furthest out: {name}')}
    ${card('Running low', low, '#F3E8C9', '#8A6312', 'Furthest out: {name}')}
    ${card('Outside lab range', lab, '#ECE4F1', '#6B4C80', 'Worth discussing with your doctor first, starting with {name}')}
  </div>`
}

/** How far each off-target marker sits from its optimal range: low to the left, high to the right, the furthest first. */
function deviationChart(entries: AssessedEntry[]) {
  const rows = entries.map(entry => ({ entry, direction: directionOf(entry) || 'high', amount: deviation(entry.numeric, entry.fmRangeParsed) || deviation(entry.numeric, entry.labRangeParsed) }))
  const W = 640, rowH = 25, top = 34, nameW = 180
  const H = top + rows.length * rowH + 12
  const centre = nameW + (W - nameW) / 2, half = (W - nameW) / 2 - 58
  const cap = Math.max(25, Math.min(150, Math.max(...rows.map(row => row.amount))))
  const lines = rows.map(({ entry, direction, amount }, index) => {
    const band = bandOf(entry)
    const cy = top + index * rowH + rowH / 2
    const reach = Math.max(10, (Math.min(amount, cap) / cap) * half)
    const end = direction === 'low' ? centre - 8 - reach : centre + 8 + reach
    const color = BAND_FILL[band]
    const id = `fmd${svgId++}`
    const x1 = direction === 'low' ? end : centre + 8, x2 = direction === 'low' ? centre - 8 : end
    return `<defs><linearGradient id="${id}" x1="${direction === 'low' ? 1 : 0}" y1="0" x2="${direction === 'low' ? 0 : 1}" y2="0"><stop offset="0" stop-color="${mix(color, '#FFFFFF', 0.55)}"/><stop offset="1" stop-color="${color}"/></linearGradient></defs>
      <text x="${nameW - 12}" y="${cy + 3.8}" text-anchor="end" font-family="${SVG_FONT}" font-size="11" fill="${INK}">${esc(entry.name.length > 28 ? `${entry.name.slice(0, 27)}…` : entry.name)}</text>
      <rect x="${x1.toFixed(1)}" y="${cy - 4}" width="${Math.max(1, x2 - x1).toFixed(1)}" height="8" rx="4" fill="url(#${id})"/>
      <circle cx="${end.toFixed(1)}" cy="${cy}" r="6" fill="#fff" stroke="${color}" stroke-width="3"/>
      <text x="${(direction === 'low' ? end - 11 : end + 11).toFixed(1)}" y="${cy + 3.8}" text-anchor="${direction === 'low' ? 'end' : 'start'}" font-family="${SVG_FONT}" font-size="10.5" font-weight="700" fill="${BAND_STYLE[band].text}">${amount >= 1 ? `${Math.round(amount)}%` : '<1%'}</text>`
  }).join('')
  return `${svgOpen(64, W, H)}
    <rect x="${centre - 8}" y="${top - 6}" width="16" height="${rows.length * rowH + 6}" rx="8" fill="#DFE8CF"/>
    <text x="${centre}" y="14" text-anchor="middle" font-family="${SVG_FONT}" font-size="10" font-weight="700" fill="${GREEN}">ON TARGET</text>
    <text x="${centre - 20}" y="27" text-anchor="end" font-family="${SVG_FONT}" font-size="10" fill="${MUTED}">← Running low</text>
    <text x="${centre + 20}" y="27" font-family="${SVG_FONT}" font-size="10" fill="${MUTED}">Running high →</text>
    ${lines}
  </svg></div>`
}

// ---------------------------------------------------------------------------
// Every marker

/** The five zones of a result bar, each a clear mid tone, with the zone the result falls in at full strength. */
const ZONES = [
  { off: '#EBBDB8', on: ['#E3A19B', '#D0574F'] },
  { off: '#EFDCAA', on: ['#EAD39A', '#D6A23A'] },
  { off: '#BCD3A3', on: ['#A9C98A', '#5F8A42'] },
  { off: '#EFDCAA', on: ['#D6A23A', '#EAD39A'] },
  { off: '#EBBDB8', on: ['#D0574F', '#E3A19B'] },
]

/** The five-band bar: below standard, below optimal, optimal, above optimal, above standard. */
function rangeBar(entry: AssessedEntry) {
  const lab = entry.labRangeParsed, fm = entry.fmRangeParsed
  const value = entry.numeric
  if (value === null || (!lab && !fm)) return `<div style="font-size:.9em;color:${MUTED};padding-top:.8em">No reference range entered.</div>`
  let c1 = lab?.low ?? fm?.low ?? null
  const c2 = fm?.low ?? c1
  let c4 = lab?.high ?? fm?.high ?? null
  const c3 = fm?.high ?? c4
  // Where the optimal range reaches past the lab's (a high HDL), the outer band starts at the optimal limit.
  if (c1 !== null && c2 !== null) c1 = Math.min(c1, c2)
  if (c3 !== null && c4 !== null) c4 = Math.max(c3, c4)
  const known = [c1, c2, c3, c4, value].filter((point): point is number => point !== null)
  const spread = Math.max(...known) - Math.min(...known) || Math.abs(value) || 1
  const floor = Math.min(value, (c1 ?? c3 ?? value) - spread * 0.3)
  const start = c1 !== null && c1 >= 0 ? Math.max(0, floor) : floor
  const end = Math.max(value, (c4 ?? c2 ?? value) + spread * 0.3)
  const cuts = [start, c1 ?? start, c2 ?? c1 ?? start, c3 ?? end, c4 ?? end, end]
  for (let index = 1; index < cuts.length; index++) cuts[index] = Math.max(cuts[index], cuts[index - 1])
  const band = bandOf(entry)
  const active = ({ alarm_low: 0, below_standard: 0, below_optimal: 1, optimal: 2, above_optimal: 3, above_standard: 4, alarm_high: 4, unknown: 2 } as Record<Band, number>)[band]
  // The marker sits in the band the result was judged to be in, placed within it by value.
  const within = cuts[active + 1] > cuts[active] ? (value - cuts[active]) / (cuts[active + 1] - cuts[active]) : 0.5
  const position = (active + Math.max(0.08, Math.min(0.92, within))) * 20
  const fmt = (point: number) => Number(point.toFixed(Math.abs(point) >= 100 ? 0 : Math.abs(point) >= 10 ? 1 : 2)).toString()
  const labels = ['Below lab range', 'Below optimal', 'Optimal', 'Above optimal', 'Above lab range']
  return `<div>
    <div style="position:relative;height:1.7em;margin-top:.5em">
      <div style="position:absolute;left:0;right:0;top:.45em;height:.8em;display:flex;gap:3px">${ZONES.map((zone, index) =>
        `<div style="flex:1;background:${index === active ? `linear-gradient(90deg, ${zone.on[0]}, ${zone.on[1]})` : zone.off};border-radius:${index === 0 ? '1em 0 0 1em' : index === 4 ? '0 1em 1em 0' : '.15em'}"></div>`).join('')}</div>
      <div style="position:absolute;left:${position}%;top:.05em;width:1.6em;height:1.6em;margin-left:-.8em;border-radius:50%;background:#fff;border:.36em solid ${BAND_COLOR[band]};box-sizing:border-box;box-shadow:0 1px 4px rgba(22,26,21,.25)"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);margin-top:.35em">${labels.map((label, index) => {
      const on = index === active
      const empty = cuts[index + 1] === cuts[index]
      return `<div style="text-align:center;border-left:${index ? 0 : 1}px solid ${FAINT};line-height:1.35">
        <div style="font-size:.72em;font-weight:${on ? 700 : 500};color:${on ? BAND_STYLE[band].text : FAINT}">${label}</div>
        <div style="font-size:.82em;color:${on ? INK : FAINT}">${empty ? '—' : `${fmt(cuts[index])} – ${fmt(cuts[index + 1])}`}</div></div>`
    }).join('')}</div>
  </div>`
}

function resultRow(entry: AssessedEntry) {
  return `<div style="display:grid;grid-template-columns:14.5em 1fr;gap:1.6em;margin-bottom:1.55em">
    <div><div style="font-size:1em;line-height:1.35">${esc(entry.name)}${entry.calculated ? ` <span style="font-size:.78em;color:${MUTED}">(calculated)</span>` : ''}</div>
      <div style="line-height:1.3"><span style="font-size:1.85em;font-weight:400;letter-spacing:-.02em;color:${INK}">${esc(entry.value)}</span> <span style="font-size:.92em;color:${MUTED}">${esc(entry.unit)}</span></div></div>
    ${rangeBar(entry)}
  </div>`
}

// ---------------------------------------------------------------------------
// Off target

function outOfRangeCard(entry: AssessedEntry) {
  const direction = directionOf(entry) || 'high'
  const band = bandOf(entry)
  const alarm = band === 'alarm_low' || band === 'alarm_high'
  const text = markerExplanation(entry.markerId, direction) || `${entry.name} is ${direction === 'low' ? 'below' : 'above'} the optimal range of ${entry.fmRange || entry.labRange} ${entry.unit}.`
  const font = entry.value.length > 6 ? 20 : entry.value.length > 4 ? 23 : 26
  return `<div style="display:flex;gap:1.1em;align-items:flex-start">
    ${disc(BAND_STYLE[band].tint, [[entry.value, font], [entry.unit.slice(0, 14), 12]], 7.6, false, BAND_STYLE[band].text)}
    <div style="flex:1"><div style="font-size:1.02em;font-weight:800;text-transform:uppercase;line-height:1.35">${esc(entry.name)}${alarm ? ` <span style="color:${BAND_STYLE[band].text}">▲</span>` : ''}</div>
      <div style="font-size:.78em;font-weight:800;color:${BAND_STYLE[band].text};letter-spacing:.04em;text-transform:uppercase;margin-top:.15em">${esc(BAND_LABEL[band])} · optimal ${esc(entry.fmRange || '—')}</div>
      <div style="font-size:.9em;line-height:1.55;color:${BODY};margin-top:.4em">${esc(text)}</div>
      ${entry.note && !entry.calculated ? `<div style="font-size:.86em;line-height:1.5;color:${GREEN};margin-top:.35em;font-style:italic">${esc(entry.note)}</div>` : ''}
    </div></div>`
}

// ---------------------------------------------------------------------------
// Care plan

function bullets(items: string[], color: string) {
  return items.map(point => `<div style="display:flex;align-items:baseline;gap:.6em;margin-bottom:.5em"><span style="flex:none;color:${color};font-size:.8em">●</span><span>${esc(point)}</span></div>`).join('')
}

/** The results behind an improvement area, each against its optimal target. */
function targets(item: AreaResult) {
  const cell = `padding:.5em .7em;border-bottom:1px solid ${LINE}`
  return `<div style="margin-top:1.5em">
    <div style="font-size:1.05em;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:.6em">Your numbers and targets</div>
    <table style="width:100%;border-collapse:collapse;font-size:.92em;line-height:1.4">
      <thead><tr style="background:${CREAM};color:${GREEN};font-weight:800;text-align:left"><th style="${cell}">Biomarker</th><th style="${cell}">Your result</th><th style="${cell}">Optimal target</th><th style="${cell}">Where it sits</th></tr></thead>
      <tbody>${item.contributors.map(({ entry, direction }) => {
        const band = bandOf(entry)
        return `<tr><td style="${cell};font-weight:700">${esc(entry.name)}</td>
          <td style="${cell};font-weight:800;color:${BAND_STYLE[band].text}">${esc(entry.value)} ${esc(entry.unit)} ${arrow(direction)}</td>
          <td style="${cell};color:${BODY}">${esc(entry.fmRange || '—')} ${esc(entry.unit)}</td>
          <td style="${cell};color:${BAND_STYLE[band].text};font-weight:700">${esc(band === 'optimal' ? 'Borderline' : BAND_LABEL[band])}</td></tr>`
      }).join('')}</tbody>
    </table>
    ${item.missing.length ? `<div style="font-size:.88em;line-height:1.5;margin-top:.7em;color:${BODY}"><span style="font-weight:800;color:${GREEN}">Worth adding next time:</span> ${esc(item.missing.join(', '))}</div>` : ''}
  </div>`
}

function improvementPage(item: AreaResult, narrative: FmNarrative, child: boolean) {
  const plan = planFor(item.area, narrative, child)
  const priority = priorityOf(item)
  return `${dash('1.4em 0 .9em')}
    <div style="display:grid;grid-template-columns:1fr 11.5em;gap:2em;align-items:start">
      <div>
        <div style="font-size:.8em;font-weight:800;letter-spacing:.14em;color:${PRIORITY_COLOR[priority]};text-transform:uppercase">${priority === 'urgent' ? 'See your doctor promptly' : `${priority} priority`}</div>
        <div style="font-size:2.1em;font-weight:800;line-height:1.25;letter-spacing:-.01em;margin-top:.2em">${esc(item.area.name)}</div>
        <div style="font-size:1.04em;line-height:1.65;color:${BODY};margin-top:.7em">${esc(item.area.finding || item.area.about)}</div>
      </div>
      ${gaugeColumn(item.score)}
    </div>
    ${targets(item)}
    <div style="font-size:1.05em;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin:1.7em 0 .9em">What we will do</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2em">${PLAN_PARTS.filter(part => plan[part.key].length).map(part => `<div style="background:${CREAM};border-top:.35em solid ${part.color};border-radius:.3em .3em .9em .9em;padding:.95em 1.15em">
      <div style="font-weight:800;color:${part.color};margin-bottom:.6em;font-size:1em">${part.title}</div>
      <div style="font-size:.9em;line-height:1.5;color:${BODY}">${bullets(plan[part.key], part.color)}</div></div>`).join('')}</div>
    <div style="font-size:.8em;color:${MUTED};margin-top:1.1em;line-height:1.5">${child ? 'Supplement doses for children depend on age and weight and must be set by the child\'s doctor. Do not start, stop or change any medicine or supplement without their advice.' : 'Supplement doses are typical adult doses for discussion with your clinician. Do not start, stop or change any medicine or supplement without their advice, particularly if you are pregnant, breastfeeding or taking prescribed medicines.'}</div>`
}

function recommendationCard(item: FmNarrative['recommendations'][number]) {
  const color = PRIORITY_COLOR[item.priority]
  return `<div style="border:1px solid ${LINE};border-left:.4em solid ${color};border-radius:.4em;padding:.9em 1.1em">
    <div style="font-size:.74em;font-weight:800;letter-spacing:.14em;color:${color};text-transform:uppercase">${item.priority}</div>
    <div style="font-weight:800;font-size:1.05em;margin:.2em 0 .6em;line-height:1.35">${esc(item.title)}</div>
    <div style="font-size:.9em;line-height:1.5;color:${BODY}">${bullets(item.items, color)}</div></div>`
}

function findingCard(item: FmNarrative['findings'][number]) {
  const color = PRIORITY_COLOR[item.priority]
  return `<div style="border-left:.35em solid ${color};background:${CREAM};padding:.75em 1em;margin-bottom:.7em;border-radius:.2em .6em .6em .2em">
    <div style="font-weight:800;color:${color};line-height:1.4">${esc(item.title)}</div>
    ${item.detail ? `<div style="font-size:.9em;line-height:1.55;color:${BODY};margin-top:.25em">${esc(item.detail)}</div>` : ''}</div>`
}

// ---------------------------------------------------------------------------
// Pages

/** Our Method: how FXMed reads a set of lab results, step by step. */
const METHOD_STEPS: Array<[string, string]> = [
  ['Two ranges, not one', 'Every result is placed against the reference range printed by your laboratory and against the narrower FXMed optimal range our clinicians work to. A result can sit inside the first and still miss the second, and that gap is where we look first.'],
  ['Read in clusters', 'No marker is judged alone. Insulin, triglycerides and HDL together say more about blood sugar than glucose does by itself, so each body system is read from the group of markers that reflects it.'],
  ['Scored for support', 'Each system and nutrient gets a support score from 0 to 100%. The higher the score, the more your results point to that area needing attention now, and the more weight it carries in your plan.'],
  ['Turned into a plan', 'Areas scoring 50% or more become focus areas in your care plan, each with food, daily habits, supplements to discuss and tests to repeat, built around foods and options you can find in Nigeria.'],
]

const REPORT_IS = ['A clinician-reviewed reading of one set of results, taken on one day.', 'A starting point for your next consultation with your FXMed care team.', 'A baseline we compare against each time you retest.']
const REPORT_IS_NOT = ['A diagnosis, or a replacement for an examination and your history.', 'A reason to start, stop or change any medicine on your own.', 'A complete picture of your health: it covers only the tests that were done.']

function methodBody() {
  const step = ([name, text]: [string, string], index: number) => `<div style="background:${CREAM};border-radius:1.1em;padding:1.3em 1.4em;display:flex;gap:1em;align-items:flex-start">
      ${disc(DEEP, [[String(index + 1), 44, 700]], 2.6, false, LIME)}
      <div><div style="font-weight:800;font-size:1.12em;line-height:1.35;color:${DEEP}">${esc(name)}</div><div style="font-size:.96em;line-height:1.62;color:${BODY};margin-top:.4em">${esc(text)}</div></div></div>`
  const list = (label: string, items: string[], color: string, mark: string) => `<div><div style="font-size:.78em;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${color};margin-bottom:.8em">${label}</div>
      ${items.map(item => `<div style="display:flex;gap:.7em;align-items:baseline;margin-bottom:.55em;font-size:.98em;line-height:1.5;color:${BODY}"><span style="flex:none;font-weight:800;color:${color}">${mark}</span><span>${esc(item)}</span></div>`).join('')}</div>`
  return `${title('How We Read Your Labs')}
    ${lead('At FXMed, a lab result is the start of a conversation, not the end of one. This report is the lab part of your Functional Health Analysis: we take the results of your blood test, read them the way our clinicians do in consultation, and turn them into a plan you can follow in everyday life.')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2em;margin-top:2em">${METHOD_STEPS.map(step).join('')}</div>
    <div style="margin-top:2.4em">${heading('Two ranges at a glance')}
      <div style="position:relative;height:2.4em;border-radius:1.2em;background:${TRACK}">
        <div style="position:absolute;left:30%;right:30%;top:0;bottom:0;border-radius:1.2em;background:#52B788"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2.4em;margin-top:1em;font-size:.95em;line-height:1.55;color:${BODY}">
        <div><span style="font-weight:800;color:${INK}">Laboratory range</span> (the whole bar): the spread of results the laboratory sees in the people it tests, many of whom are not in good health.</div>
        <div><span style="font-weight:800;color:#2D8A5F">FXMed optimal range</span> (the green centre): the narrower band where our clinicians see the body working at its best.</div>
      </div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2.4em;margin-top:2.4em;border-top:1px solid ${LINE};padding-top:1.6em">
      ${list('This report is', REPORT_IS, GREEN, '✓')}${list('This report is not', REPORT_IS_NOT, '#B5523B', '✕')}
    </div>`
}

function coverBody(data: FmReportData) {
  const { patient } = data
  const who = [patient.age ? `${patient.age} years` : '', patient.sex ? patient.sex[0].toUpperCase() + patient.sex.slice(1) : ''].filter(Boolean).join(' · ')
  const field = (label: string, value: string) => `<div><div style="font-size:.74em;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${GREEN}">${label}</div><div style="font-size:1.12em;font-weight:700;color:${INK};margin-top:.3em;line-height:1.4">${value || '—'}</div></div>`
  return `<div style="position:absolute;right:-17em;top:17em;opacity:.95">${logoMark(50)}</div>
    <div style="position:absolute;left:0;right:0;top:0;height:.5em;background:${ACCENT}"></div>
    <div style="position:relative;padding:4.6em 0.8em 0">
      <img src="/logo-trimmed.png" style="height:3em;display:block" />
      <div style="margin-top:11em;font-size:.9em;font-weight:800;letter-spacing:.26em;text-transform:uppercase;color:${LIME}">WITS Functional Medicine &nbsp;·&nbsp; Lagos</div>
      <div style="font-size:5em;font-weight:500;line-height:1.15;letter-spacing:-.03em;color:#fff;margin-top:.3em">Functional<br/>Health Analysis</div>
      <div style="display:inline-block;margin-top:1em">${pill('Lab Report', true).replace('font-size:.8em', 'font-size:1.6em')}</div>
      <div style="font-size:1.25em;line-height:1.55;color:${ON_DARK};margin-top:1.3em;width:25em">A clinician-led reading of your lab results: where your body is doing well, where it needs support, and the plan we will follow together.</div>
    </div>
    <div style="position:absolute;left:3.4em;right:3.4em;bottom:3.4em;background:${CREAM};border-radius:1.4em;padding:1.9em 2.2em">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.4em"><div style="font-size:1.5em;font-weight:800;color:${DEEP}">${esc(patient.name || 'Patient')}</div><div style="font-size:.95em;font-weight:700;color:${GREEN}">${esc(who)}</div></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.3em 2em;border-top:1px solid ${LINE};padding-top:1.3em">
        ${field('Test date', esc(readableDate(patient.collectedAt)))}${field('Lab reference', esc(patient.labRef))}${field('Facility', esc(patient.facility || 'WITS FxMed Nigeria'))}
        ${field('Requested by', esc(patient.clinician))}${field('Report prepared', esc(fmtDate(data.generatedAt || new Date())))}${field('Prepared by', 'WITS FxMed Nigeria')}
      </div>
    </div>`
}

/** A part's pages and their page numbers, from the contents index. */
const partPages = (section: SectionId, toc: TocIndex) => Array.from(toc.entries()).filter(([key]) => key.startsWith(`${section}:`)).map(([key, number]) => ({ name: key.slice(section.length + 1), number }))

function contentsList(section: SectionId, toc: TocIndex) {
  return partPages(section, toc).map(({ name, number }) =>
    `<div style="display:flex;gap:1.4em;font-size:1.02em;line-height:1.8"><span style="width:1.6em;font-weight:800;color:${LIME}">${String(number).padStart(2, '0')}</span><span style="color:#fff">${esc(name)}</span></div>`).join('')
}

/** The report map: each part, what it covers and where its pages start. */
function mapBody(toc: TocIndex) {
  const page = ({ name, number }: { name: string; number: number }) => `<span style="display:inline-flex;align-items:baseline;gap:.5em;margin:0 1.6em .3em 0"><span style="font-weight:800;color:${GREEN}">p.${number}</span><span style="color:${INK}">${esc(name)}</span></span>`
  return `${title('Your Report Map')}
    ${lead('Your report is in four parts. Start with Part 1 for the short version, then turn to your care plan. The full results in Part 4 are there whenever you want the detail behind them.')}
    <div style="margin-top:2.2em">${SECTIONS.map(section => `<div style="display:flex;gap:1.5em;align-items:flex-start;padding:1.25em 0;border-top:1px solid ${LINE}">
      <div style="width:3.4em;flex:none;display:flex;justify-content:center">${section.number ? disc(DEEP, [[String(section.number), 46, 700]], 3, false, LIME) : disc(DEEP, [['i', 46, 700]], 3, true)}</div>
      <div style="flex:1"><div style="font-size:1.3em;font-weight:800;line-height:1.3;color:${DEEP}">${esc(section.title)}</div>
        <div style="font-size:.98em;color:${BODY};line-height:1.55;margin-top:.2em">${esc(section.blurb)}</div>
        <div style="margin-top:.6em;font-size:.95em;line-height:1.5">${partPages(section.id, toc).map(page).join('')}</div></div></div>`).join('')}</div>
    ${readingKey()}`
}

/** How to read the colours and scores used through the report. */
function readingKey() {
  const bands: Array<[Band, string]> = [
    ['optimal', 'On target: within the FXMed optimal range'],
    ['below_optimal', 'Off target, but within the laboratory\'s range'],
    ['above_standard', 'Outside the laboratory\'s range'],
    ['alarm_high', 'Far outside the laboratory\'s range: see your doctor promptly'],
  ]
  return `<div style="margin-top:2.2em;background:${CREAM};border-radius:1.2em;padding:1.6em 1.9em;display:grid;grid-template-columns:1fr 1fr;gap:2.4em">
    <div><div style="font-size:.78em;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${GREEN};margin-bottom:1em">Colours</div>
      ${bands.map(([band, text]) => `<div style="display:flex;align-items:center;gap:.8em;margin-bottom:.7em"><span style="flex:none;width:1.1em;height:1.1em;border-radius:50%;background:${BAND_COLOR[band]}"></span><span style="font-size:.95em;line-height:1.4;color:${BODY}">${text}</span></div>`).join('')}</div>
    <div><div style="font-size:.78em;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${GREEN};margin-bottom:1em">Support scores</div>
      <div style="font-size:.95em;line-height:1.6;color:${BODY}">Each body system and nutrient is given a support score from 0 to 100%: how strongly your results suggest it needs attention. Anything at 50% or more is explained in full, and the areas in your care plan come with a plan of their own.</div>
      <div style="margin-top:1em;display:flex;align-items:center;gap:.8em">${dotScale(76, 11)}<span style="font-weight:800;color:${LEVELS[2].text}">76%</span></div>
      <div style="margin-top:.7em">${levelKey()}</div></div>
  </div>`
}

function dividerBody(section: (typeof SECTIONS)[number], toc: TocIndex) {
  return `<div style="position:absolute;right:-12em;top:-8em;opacity:.95">${logoMark(36)}</div>
    <div style="position:absolute;left:0;right:0;top:0;height:.5em;background:${ACCENT}"></div>
    <div style="position:absolute;left:3.4em;top:3.4em"><img src="/logo-trimmed.png" style="height:2.2em;display:block" /></div>
    <div style="position:absolute;left:3.4em;right:3.4em;bottom:7.5em">
      <div style="font-size:.95em;font-weight:800;letter-spacing:.26em;text-transform:uppercase;color:${LIME}">Part</div>
      <div style="font-size:15em;font-weight:300;line-height:.95;letter-spacing:-.05em;color:${LIME}">${section.number}</div>
      <div style="font-size:3.4em;font-weight:500;line-height:1.1;letter-spacing:-.02em;color:#fff;margin-top:.15em">${esc(section.title)}</div>
      <div style="font-size:1.15em;line-height:1.55;color:${ON_DARK};margin-top:.8em;width:32em">${esc(section.blurb)}</div>
      <div style="width:3.2em;height:.42em;background:${LIME};border-radius:1em;margin:2em 0 1.2em"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 2.4em;width:40em">${contentsList(section.id, toc)}</div>
    </div>`
}

function snapshotBody(analysis: Analysis, narrative: FmNarrative) {
  const findings = (narrative.findings.length ? narrative.findings : defaultFindings(analysis)).slice(0, 4)
  const top = analysis.plan.slice(0, 6)
  return `${title('Your Snapshot')}
    <div style="margin-top:1.4em;background:${DEEP};border-radius:1.2em;padding:1.5em 1.8em;position:relative;overflow:hidden">
      <div style="position:absolute;right:-3.5em;top:-3.5em;opacity:.9">${logoMark(9)}</div>
      <div style="font-size:.78em;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:${LIME}">In short</div>
      <div style="font-size:1.08em;line-height:1.65;color:#fff;margin-top:.5em;padding-right:5em">${esc(narrative.summary || defaultSummary(analysis))}</div>
    </div>
    ${bandCounts(analysis)}
    <div style="display:grid;grid-template-columns:1fr 1.15fr;gap:2.2em;margin-top:2.6em">
      <div>${heading('Where to focus')}
        ${top.length ? top.map(item => `<div style="margin-bottom:.95em"><div style="display:flex;justify-content:space-between;font-size:.95em;line-height:1.4;margin-bottom:.45em"><span>${esc(item.area.name)}</span><span style="font-weight:800;color:${LEVELS[levelOf(item.score)].text}">${item.score}%</span></div>${dotScale(item.score, 15)}</div>`).join('') : `<div style="color:${MUTED}">No area scored high enough to need its own plan.</div>`}</div>
      <div>${heading('What stood out')}
        ${findings.length ? findings.map(findingCard).join('') : `<div style="color:${MUTED}">Nothing significant stood out.</div>`}</div>
    </div>`
}

function next90Body(analysis: Analysis, narrative: FmNarrative, patient: FmPatient) {
  const steps = narrative.nextSteps.length ? narrative.nextSteps : defaultNextSteps(analysis)
  return `${title('Your Next 90 Days')}
    ${lead('Change that lasts is built in small, steady steps. Work through these with your FXMed care team over the next twelve weeks, then retest so we can see what has moved and adjust your plan.')}
    <div style="margin-top:2em">${steps.map((step, index) => `<div style="display:flex;gap:1.2em;padding:1.2em 0;border-top:1px solid ${LINE}">
      ${disc(DEEP, [[String(index + 1), 44, 700]], 2.8, false, LIME)}
      <div style="flex:1"><div style="font-weight:800;font-size:1.2em;line-height:1.35">${esc(step.title)}</div>
        ${step.text ? `<div style="font-size:.98em;line-height:1.6;color:${BODY};margin:.35em 0 .6em">${esc(step.text)}</div>` : ''}
        <div style="font-size:.95em;line-height:1.5;color:${BODY}">${bullets(step.items, GREEN)}</div></div></div>`).join('')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2em;margin-top:2.4em;font-size:.95em">
      <div><div style="border-bottom:1px solid ${INK};height:2.2em;font-size:1.1em;line-height:2.2em">${esc(patient.clinician)}</div><div style="color:${MUTED};margin-top:.4em">Reviewing clinician</div></div>
      <div><div style="border-bottom:1px solid ${INK};height:2.2em"></div><div style="color:${MUTED};margin-top:.4em">Date of review</div></div>
    </div>`
}

function notesBody() {
  const paragraphs = [
    'This report is private. It was prepared for the person named on the cover, and should only be read or shared with their permission.',
    'It is an educational tool to support your consultation with an FXMed clinician. It does not diagnose any condition, and it does not replace an examination, your history or the judgement of the doctor treating you.',
    'The FXMed optimal ranges are clinical reference points our team works to. They are narrower than laboratory ranges, are not used in every specialty, and are not personal targets. Support scores summarise patterns in the results supplied; they are not the probability of any disease.',
    'The report covers only the tests that were done. A test that was not requested cannot be assessed, and a result on target does not rule out a problem elsewhere.',
    'If a food, supplement or medicine is not flagged here, that does not mean it is safe for you. Supplements named in this report have not been approved by NAFDAC or any other regulator to treat, cure or prevent disease, and should be agreed with your clinician before you start them.',
    'Do not stop, start or change a treatment, or put off seeing a doctor, because of something in this report. In an emergency, go to the nearest hospital emergency department.',
    'Calculated markers are worked out from your other results. HOMA-IR uses fasting glucose (mmol/L) × fasting insulin (µIU/mL) ÷ 22.5.',
  ]
  return `${title('About This Report')}<div style="margin-top:1.4em">${paragraphs.map(text => `<p style="font-size:1em;line-height:1.65;color:${BODY};margin:0 0 1em">${esc(text)}</p>`).join('')}</div>
    <div style="margin-top:2em;font-size:.95em;color:${MUTED}">Prepared by WITS FxMed Nigeria Ltd, Lagos, Nigeria. Questions about your report? Speak to your FXMed care team.</div>`
}

const GROUP_TABS: Record<Exclude<AreaGroup, 'plan'>, string> = { system: 'Core Systems', accessory: 'Whole-Body Processes', nutrient: 'Nourishment', deficiency: 'Nutrient Gaps' }
const SEVERITY: Record<Band, number> = { alarm_high: 0, alarm_low: 0, above_standard: 1, below_standard: 1, above_optimal: 2, below_optimal: 2, optimal: 9, unknown: 9 }

/** Every page of the report, as HTML, in order. */
export function buildFmReportPages(data: FmReportData) {
  svgId = 0
  const analysis = analyse(data.entries, data.patient.sex, ageInYears(data.patient.age))
  const { narrative } = data
  const pages: Page[] = []
  const add = (section: SectionId, tab: string, body: Page['body'], kind: Page['kind'] = 'content') => pages.push({ kind, section, tab, body })
  const divider = (id: SectionId) => add(id, '', toc => dividerBody(sectionOf(id), toc), 'divider')
  const measurer = createMeasurer(data.patient)
  /** Lays blocks onto as few pages as they fit on, each page filled before the next starts. */
  const flow = (section: SectionId, blocks: Block[]) => {
    // Without a page to measure in (on a server), each block gets its own page.
    if (!measurer) { blocks.forEach(block => add(section, block.tab, () => block.html)); return }
    // A heading held with the piece after it travels with that piece.
    const units: Block[] = []
    blocks.forEach((block, index) => {
      const previous = units[units.length - 1]
      if (index && blocks[index - 1].keep && previous) units[units.length - 1] = { ...block, tab: previous.tab, html: previous.html + block.html, resume: previous.resume }
      else units.push(block)
    })
    let page: Block[] = [], used = 0
    const close = () => {
      if (!page.length) return
      const html = page.map(item => item.html).join('')
      const tabs = Array.from(new Set(page.map(item => item.tab)))
      pages.push({ kind: 'content', section, tab: tabs[0], tabs, body: () => html })
      page = []; used = 0
    }
    for (const unit of units) {
      const height = measurer.height(unit.html)
      if (page.length && used + height > measurer.capacity) close()
      const piece = !page.length && unit.resume ? { ...unit, html: unit.resume + unit.html } : unit
      page.push(piece)
      used += page.length === 1 && piece !== unit ? measurer.height(piece.html) : height
    }
    close()
  }

  // Part 1. Start here
  add('start', '', () => coverBody(data), 'cover')
  add('start', 'Report Map', toc => mapBody(toc))
  divider('start')
  add('start', 'Our Method', () => methodBody())
  add('start', 'Your Snapshot', () => snapshotBody(analysis, narrative))
  if (analysis.summary.assessed.length) add('start', 'Health Score', () => healthScoreBody(analysis))

  // Part 2. Your body, system by system
  divider('body')
  if (analysis.group('system').some(item => item.considered.length)) add('body', 'Systems Map', () => systemsMapBody(analysis))
  const bodyBlocks: Block[] = []
  for (const group of ['system', 'accessory', 'nutrient', 'deficiency'] as const) {
    const items = analysis.group(group)
    if (!items.length) continue
    const tab = GROUP_TABS[group]
    const info = AREA_GROUPS[group]
    const detail = items.filter(needsDetail)
    bodyBlocks.push({ tab, html: `${title(info.title)}${lead(info.intro)}${lead(detail.length ? 'Every area scoring 50% or more is explained below, with the markers that moved its score.' : 'No area here scored 50% or more, so none needs a closer look.')}${likelihoodChart(items, group === 'system' ? 'meter' : 'dots')}<div style="height:1.6em"></div>` })
    const closer = `${subtitle(`A closer look: ${info.title}`)}${lead('For each area: its support score, what the area does in the body, and the markers that shaped the score.')}<div style="height:1.6em"></div>`
    detail.forEach((item, index) => bodyBlocks.push({ tab, html: `${index ? '' : closer}${areaDetail(item)}`, resume: index ? `${subtitle(`A closer look: ${info.title} (continued)`)}<div style="height:1.2em"></div>` : undefined }))
  }
  flow('body', bodyBlocks)

  // Part 3. Your care plan
  divider('plan')
  const planBlocks: Block[] = []
  planBlocks.push({ tab: 'Focus Areas', html: `${title('Your Focus Areas')}${lead(AREA_GROUPS.plan.intro)}${lead(analysis.plan.length ? 'Each focus area has its own page: the results behind it, your targets, and what we will do about it through food, daily habits, supplements to discuss with your clinician, and tests to repeat.' : 'No area scored high enough to need a plan of its own. Keep up the basics on the Next 90 Days page and retest as advised.')}${analysis.plan.length ? likelihoodChart(analysis.plan) : ''}<div style="height:1.4em"></div>` })
  analysis.plan.forEach(item => planBlocks.push({ tab: 'Focus Areas', html: `${improvementPage(item, narrative, analysis.child)}<div style="height:2.2em"></div>` }))
  const recommendations = narrative.recommendations.length ? narrative.recommendations : defaultRecommendations(analysis)
  const movesIntro = `${title('Your First Moves')}${lead('If you do nothing else, start here. These are the most important actions from your plan, most pressing first; anything marked urgent needs a doctor before the rest.')}<div style="height:1.8em"></div>`
  chunk(recommendations, 2).forEach((pair, index) => planBlocks.push({ tab: 'First Moves', html: `${index ? '' : movesIntro}<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2em;margin-bottom:1.2em">${pair.map(recommendationCard).join('')}</div>` }))
  planBlocks.push({ tab: 'Next 90 Days', html: next90Body(analysis, narrative, data.patient) })
  flow('plan', planBlocks)

  // Part 4. Your results in full
  divider('results')
  const rows = FM_PANELS.flatMap(panel => analysis.summary.assessed.filter(entry => entry.panel === panel.id).map((entry, index) => ({ panel: panel.name, entry, first: index === 0 })))
  const resultBlocks: Block[] = []
  const panelHeading = (name: string, more = false) => `<div style="font-size:1.15em;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin:1.2em 0 1em">${esc(name)}${more ? ' (continued)' : ''}</div>`
  if (rows.length) resultBlocks.push({ tab: 'Every Marker', keep: true, html: `${title('Every Marker')}${lead('Each marker sits on a five-band scale: on target in the green centre, off target either side of it, and outside the laboratory\'s range at the ends. Markers that are off target are explained on the Off Target pages.')}${bandCounts(analysis)}<div style="height:1em"></div>` })
  rows.forEach(row => resultBlocks.push({ tab: 'Every Marker', html: `${row.first ? panelHeading(row.panel) : ''}${resultRow(row.entry)}`, resume: row.first ? undefined : panelHeading(row.panel, true) }))

  const out = analysis.summary.assessed.filter(entry => directionOf(entry)).sort((a, b) => SEVERITY[bandOf(a)] - SEVERITY[bandOf(b)])
  if (out.length) {
    const byDistance = [...out].sort((a, b) => (deviation(b.numeric, b.fmRangeParsed) || deviation(b.numeric, b.labRangeParsed)) - (deviation(a.numeric, a.fmRangeParsed) || deviation(a.numeric, a.labRangeParsed)))
    chunk(byDistance, 22).forEach((part, page) => resultBlocks.push({ tab: 'How Far Off', html:
      `${page ? '<div style="height:1.6em"></div>' : `<div style="height:1em"></div>${title('How Far Off Target')}${lead('Each marker outside its FXMed optimal range, measured by how far past the nearest limit it sits, as a share of that limit. Running low reads to the left, running high to the right; the furthest out come first.')}${offTargetCards(out)}<div style="height:1.8em"></div>`}${deviationChart(part)}<div style="margin-top:1.2em;display:flex;justify-content:center">${bandLegend()}</div><div style="height:1em"></div>` }))
    resultBlocks.push({ tab: 'Off Target', keep: true, html: `${title('Off Target')}${lead('These markers sit outside the FXMed optimal range, the furthest out first. For each one: what it measures, and the usual reasons it runs high or low. Your clinician will read them alongside your history and symptoms.')}` })
    for (const [name, list] of [['Running high', out.filter(entry => directionOf(entry) === 'high')], ['Running low', out.filter(entry => directionOf(entry) === 'low')]] as const) {
      const heading = (more: boolean) => `<div style="font-size:2.1em;color:${GREEN};line-height:1.3;margin:1.1em 0 .9em">${name}${more ? ' (continued)' : ''}</div>`
      chunk(list, 2).forEach((pair, index) => resultBlocks.push({ tab: 'Off Target', html: `${index ? '' : heading(false)}<div style="display:grid;grid-template-columns:1fr 1fr;gap:2.2em;margin-bottom:2em">${pair.map(outOfRangeCard).join('')}</div>`, resume: index ? heading(true) : undefined }))
    }
  }
  flow('results', resultBlocks)

  // Closing notes
  add('notes', 'About This Report', () => notesBody())
  measurer?.done()

  // Contents and header tabs: the first page of each part's tab. The cover is page 0.
  const toc: TocIndex = new Map()
  pages.forEach((item, number) => {
    if (item.kind !== 'content') return
    for (const tab of item.tabs || [item.tab]) if (!toc.has(`${item.section}:${tab}`)) toc.set(`${item.section}:${tab}`, number)
  })
  return pages.map((item, number) => {
    if (item.kind === 'cover') return shell(item.body(toc), '', data.patient, null, true)
    if (item.kind === 'divider') return shell(item.body(toc), '', data.patient, number, true)
    const tabs = Array.from(toc.keys()).filter(key => key.startsWith(`${item.section}:`)).map(key => key.slice(item.section.length + 1))
    return shell(item.body(toc), header(item.section, item.tab, tabs), data.patient, number)
  })
}

/** Shrinks a page's type until its content clears the footer. */
export function fitPage(root: HTMLElement) {
  const body = root.querySelector<HTMLElement>('[data-fm-body]')
  if (!body) return
  const limit = PAGE_H - 70
  let size = BASE_FONT
  root.style.fontSize = `${size}px`
  while (size > MIN_FONT && body.offsetTop + body.scrollHeight > limit) {
    size -= 0.25
    root.style.fontSize = `${size}px`
  }
}

// Rendered at about 230 dpi so text stays sharp on screen and in print. The
// pages share a size budget, kept under the EMR's 15 MB document limit: each
// is encoded at the best JPEG quality that keeps the running total on budget.
// Resolution is only reduced as a last resort for an unusually long report.
const RENDER_SCALE = 2.4
const PDF_BUDGET = 11.5 * 1024 * 1024
const ENCODINGS: Array<[scale: number, quality: number]> = [[1, 0.92], [1, 0.86], [1, 0.8], [1, 0.72], [0.8, 0.8], [0.7, 0.72]]

function encode(canvas: HTMLCanvasElement, budget: number) {
  let image = ''
  for (const [scale, quality] of ENCODINGS) {
    let source = canvas
    if (scale < 1) {
      source = document.createElement('canvas')
      source.width = Math.round(canvas.width * scale)
      source.height = Math.round(canvas.height * scale)
      const context = source.getContext('2d')!
      context.imageSmoothingQuality = 'high'
      context.drawImage(canvas, 0, 0, source.width, source.height)
    }
    image = source.toDataURL('image/jpeg', quality)
    if (image.length * 0.75 <= budget) break
  }
  return image
}

export async function renderFmReportPdf(data: FmReportData): Promise<Blob> {
  const html2canvas = (await import('html2canvas')).default
  const { default: jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter', compress: true })
  const pages = buildFmReportPages(data)
  const host = document.createElement('div')
  Object.assign(host.style, { position: 'absolute', left: '-10000px', top: '0' })
  // The pages are drawn outside the admin frame, so carry its font variable across.
  const font = document.querySelector('.clinic-theme') && getComputedStyle(document.querySelector('.clinic-theme')!).getPropertyValue('--font-clinic')
  if (font) host.style.setProperty('--font-clinic', font)
  document.body.appendChild(host)
  try {
    if (document.fonts?.ready) await document.fonts.ready
    let used = 0
    for (let index = 0; index < pages.length; index++) {
      host.innerHTML = pages[index]
      const root = host.firstElementChild as HTMLElement
      await Promise.all(Array.from(root.querySelectorAll('img')).map(img => img.complete ? null : new Promise(resolve => { img.onload = img.onerror = resolve })))
      fitPage(root)
      const canvas = await html2canvas(root, { scale: RENDER_SCALE, useCORS: true, backgroundColor: '#ffffff', width: PAGE_W, height: PAGE_H })
      if (index) pdf.addPage('letter', 'portrait')
      // A dense page may take more than an even share; the pages after it make up the difference.
      const image = encode(canvas, (1.5 * (PDF_BUDGET - used)) / (pages.length - index))
      used += image.length * 0.75
      pdf.addImage(image, 'JPEG', 0, 0, 8.5, 11)
    }
  } finally {
    host.remove()
  }
  return pdf.output('blob')
}
