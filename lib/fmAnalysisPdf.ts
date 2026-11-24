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
  defaultSummary, directionOf, likelihoodLabel, needsDetail, planFor, PLAN_PARTS, priorityOf, scoreStatus,
  type Analysis, type AreaGroup, type AreaResult, type Band,
} from './fmAssessment'
import { ageInYears, deviation, FM_PANELS, PRIORITY_COLOR, type AssessedEntry, type FmEntry, type Range, type FmNarrative, type FmPatient } from './fmBiomarkers'
import { markerExplanation } from './fmMarkerInfo'
import { assessStool, gutEvidence, type GutAssessment } from './stoolAssessment'
import { parseStoolNumber, parseStoolReference, stoolNeedsReview, stoolStatus, STOOL_STATUS_LABEL, type StoolEntry, type StoolTest } from './stoolMarkers'

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
  /** The patient's stool test, read beside the blood results (lib/stoolMarkers.ts). */
  stool?: StoolTest | null
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
  { name: 'Low priority', short: 'Low priority', from: 0, solid: SAGE, tint: '#DFE8CF', faint: '#EEF3E6', text: GREEN },
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
function dotScale(score: number, width = 12, state: 'score' | 'untested' | 'pass' = 'score') {
  const level = levelOf(score), tone = LEVELS[level]
  const filled = Math.round(Math.max(0, Math.min(score, 100)) / 10)
  // Not tested directly: hollow grey rings. On target: a soft sage row, nothing filled.
  const dots = Array.from({ length: 10 }, (_, index) => state === 'untested'
    ? `<circle cx="${7 + index * 18}" cy="8" r="5.6" fill="none" stroke="#C9CBC3" stroke-width="1.6" stroke-dasharray="2.2 2"/>`
    : `<circle cx="${7 + index * 18}" cy="8" r="6.5" fill="${state === 'pass' ? LEVELS[0].tint : index < filled ? tone.solid : index === filled ? tone.faint : '#E9EAE4'}"/>`).join('')
  return `${svgOpen(width, 176, 16, 'start')}${dots}</svg></div>`
}

/** A level meter: the four levels as one bar, the score's level in full colour, and a pin at the score. */
function levelMeter(score: number, width = 30, untested = false) {
  const level = levelOf(score), W = 300
  if (untested) return `${svgOpen(width, W, 20, 'start')}<rect x="1" y="5.5" width="${W - 2}" height="9" rx="4.5" fill="none" stroke="#C9CBC3" stroke-width="1.4" stroke-dasharray="4 3"/></svg></div>`
  const x = (value: number) => (value / 100) * W
  const ends = [0, 50, 70, 90, 100]
  const parts = LEVELS.map((tone, index) => {
    const left = x(ends[index]) + (index ? 1.5 : 0), right = x(ends[index + 1]) - (index < 3 ? 1.5 : 0)
    const fill = index === level ? tone.solid : index < level ? tone.tint : tone.faint
    return `<rect x="${left.toFixed(1)}" y="5" width="${(right - left).toFixed(1)}" height="10" rx="${index === 0 || index === 3 ? 5 : 1.5}" fill="${fill}"/>`
  }).join('')
  // Square inner corners: cover the rounded ends where segments meet.
  const joins = `<rect x="${x(50) - 6}" y="5" width="4.5" height="10" fill="${level === 0 ? LEVELS[0].solid : LEVELS[0].tint}"/><rect x="${x(90) + 1.5}" y="5" width="4.5" height="10" fill="${level === 3 ? LEVELS[3].solid : LEVELS[3].faint}"/>`
  // Kept a radius plus half the stroke from each end, so a 0% or 100% pin isn't cut off by the SVG's edge.
  const r = 7, stroke = 3.2, inset = r + stroke / 2
  const pin = Math.max(inset, Math.min(W - inset, x(score)))
  return `${svgOpen(width, W, 20, 'start')}${parts}${joins}<circle cx="${pin.toFixed(1)}" cy="10" r="${r}" fill="#fff" stroke="${LEVELS[level].text}" stroke-width="${stroke}"/></svg></div>`
}

/** The four levels as a key: a dot in each colour and its name. */
function levelKey() {
  return `<div style="display:flex;flex-wrap:wrap;gap:.2em 1.4em;font-size:.82em;color:${BODY}">${LEVELS.map((tone, index) => `<span style="white-space:nowrap"><span style="color:${tone.solid}">●</span> ${tone.name} <span style="color:${MUTED}">${index === 3 ? '90%+' : `${tone.from}–${LEVELS[index + 1].from}%`}</span></span>`).join('')}<span style="white-space:nowrap"><span style="color:#B5B8AF">○</span> Not tested directly</span></div>`
}

/** The support scores of a group of areas: a row each with a dot scale, or (for the core body systems) a level meter. */
function likelihoodChart(items: AreaResult[], style: 'dots' | 'meter' = 'dots') {
  const nameW = 16.5, chartW = style === 'meter' ? 30 : 16
  const row = (item: AreaResult) => {
    const tone = LEVELS[levelOf(item.score)]
    const status = scoreStatus(item)
    const untested = status.key === 'not_direct' || status.key === 'indirect'
    const chart = style === 'meter' ? levelMeter(item.score, chartW, untested) : dotScale(item.score, chartW, untested ? 'untested' : status.key === 'on_target' ? 'pass' : 'score')
    const figure = untested ? `<span style="color:${MUTED};font-weight:400">—</span>` : status.key === 'on_target' ? `<span style="color:${GREEN}">✓</span>` : `${item.score}%`
    // Below 50% the level alone says little, so say what the score rests on.
    const note = untested ? `<span style="color:${MUTED}">${esc(status.label)}${item.missing.length ? ` · consider ${esc(item.missing.slice(0, 2).join(', '))}` : ''}</span>`
      : status.key === 'on_target' ? `<span style="color:${GREEN}">On target</span>`
      : status.key === 'low' ? `<span style="color:${tone.text}">Low priority</span>${item.direct === false ? `<span style="color:${MUTED}"> · not tested directly</span>` : ''}`
      : style === 'dots' ? `<span style="color:${tone.text}">${esc(tone.name)}</span>` : ''
    return `<div style="display:flex;align-items:center;gap:1.2em;margin-bottom:.8em">
      <div style="width:${nameW}em;flex:none;text-align:right;font-size:.98em;line-height:1.3;color:${INK}">${esc(item.area.name)}</div>
      ${chart}
      <div style="width:3.2em;flex:none;font-size:1em;font-weight:800;color:${tone.text}">${figure}</div>
      <div style="font-size:.82em;line-height:1.35">${note}</div>
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
  // A worded result has no scale to draw: say what it is and what is expected.
  if (entry.textResult) {
    const band = bandOf(entry)
    const label = { negative: 'Negative', equivocal: 'Equivocal: repeat or confirm', positive: 'Positive' }[entry.textResult]
    return `<div style="display:flex;align-items:center;gap:.8em;padding-top:.7em"><span style="flex:none;width:1.1em;height:1.1em;border-radius:50%;background:${BAND_COLOR[band]}"></span><span style="font-size:.95em;color:${INK};font-weight:700">${esc(label)}</span><span style="font-size:.88em;color:${MUTED}">Expected result: negative</span></div>`
  }
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
      <div style="font-size:.78em;font-weight:800;color:${BAND_STYLE[band].text};letter-spacing:.04em;text-transform:uppercase;margin-top:.15em">${esc(BAND_LABEL[band])} · ${entry.textResult ? 'expected negative' : `optimal ${esc(entry.fmRange || '—')}`}</div>
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
          <td style="${cell};color:${BODY}">${entry.textResult ? 'Negative' : `${esc(entry.fmRange || '—')} ${esc(entry.unit)}`}</td>
          <td style="${cell};color:${BAND_STYLE[band].text};font-weight:700">${esc(band === 'optimal' ? 'Borderline' : BAND_LABEL[band])}</td></tr>`
      }).join('')}</tbody>
    </table>
    ${item.missing.length ? `<div style="font-size:.88em;line-height:1.5;margin-top:.7em;color:${BODY}"><span style="font-weight:800;color:${GREEN}">Worth adding next time:</span> ${esc(item.missing.join(', '))}</div>` : ''}
  </div>`
}

function improvementPage(item: AreaResult, narrative: FmNarrative, child: boolean, gut?: GutAssessment) {
  const base = planFor(item.area, narrative, child)
  // With a stool test done, the plan does not ask for one again.
  const plan = gut?.tested ? { ...base, tests: base.tests.filter(test => !/^stool test/i.test(test)) } : base
  const stool = gut?.tested ? gutEvidence(gut, item.area.id) : null
  const priority = priorityOf(item)
  return `${dash('1.4em 0 .9em')}
    <div style="display:grid;grid-template-columns:1fr 11.5em;gap:2em;align-items:start">
      <div>
        <div style="font-size:.8em;font-weight:800;letter-spacing:.14em;color:${PRIORITY_COLOR[priority]};text-transform:uppercase">${priority === 'urgent' ? 'See your doctor promptly' : `${priority} priority`}</div>
        <div style="font-size:2.1em;font-weight:800;line-height:1.25;letter-spacing:-.01em;margin-top:.2em">${esc(item.area.name)}</div>
        <div style="font-size:1.04em;line-height:1.65;color:${BODY};margin-top:.7em">${esc(item.area.finding || item.area.about)}</div>
        ${stool && stool.findings.length ? `<div style="font-size:.95em;line-height:1.55;margin-top:.7em;background:${CREAM};border-radius:.8em;padding:.6em .9em"><b style="color:${GREEN}">Your stool test also shows:</b> ${esc(stool.findings.map(finding => finding.title.toLowerCase()).join(', '))}. See Your Gut.</div>` : ''}
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

/** Two Views: the patient's own results read the laboratory's way and the FXMed way, the gap between them, and how we read them. */
const REPORT_IS = ['A clinician-reviewed reading of one set of results, taken on one day.', 'A starting point for your next consultation with your FXMed care team.', 'A baseline we compare against each time you retest.']
const REPORT_IS_NOT = ['A diagnosis, or a replacement for an examination and your history.', 'A reason to start, stop or change any medicine on your own.', 'A complete picture of your health: it covers only the tests that were done.']

const LAB_NORMAL_FILL = '#B7D29C'
const withinLab = (band: Band) => band === 'optimal' || band === 'below_optimal' || band === 'above_optimal'

/** Every marker as a dot, in band order: coloured the laboratory's way (normal or flagged) or the FXMed way (every band). */
function dotGrid(entries: AssessedEntry[], view: 'lab' | 'fxmed', width: number) {
  const count = entries.length
  const cols = count <= 40 ? 10 : count <= 84 ? 14 : 18
  const rows = Math.ceil(count / cols)
  const step = 20, r = 7.4
  const dots = entries.map((entry, index) => {
    const band = bandOf(entry)
    const fill = view === 'lab' ? (withinLab(band) ? LAB_NORMAL_FILL : '#D0574F') : BAND_FILL[band]
    return `<circle cx="${(index % cols) * step + step / 2}" cy="${Math.floor(index / cols) * step + step / 2}" r="${r}" fill="${fill}"/>`
  }).join('')
  return `${svgOpen(width, cols * step, rows * step, 'start')}${dots}</svg></div>`
}

/** One marker against both ranges: the laboratory's range as the pale band, the FXMed optimal range in green, the result as a dot. */
function twoRangeBar(entry: AssessedEntry, width = 12) {
  const lab = entry.labRangeParsed, fm = entry.fmRangeParsed, value = entry.numeric
  if (value === null || (!lab && !fm)) return ''
  const points = [lab?.low, lab?.high, fm?.low, fm?.high, value].filter((point): point is number => point !== null && point !== undefined)
  let lo = Math.min(...points), hi = Math.max(...points)
  const pad = (hi - lo || Math.abs(value) || 1) * 0.12
  lo = lo >= 0 ? Math.max(0, lo - pad) : lo - pad
  hi += pad
  const W = 200, x = (point: number) => 6 + ((point - lo) / (hi - lo)) * (W - 12)
  const band = (range: Range | null, fill: string, y: number, h: number) => {
    if (!range) return ''
    const a = x(range.low ?? lo), b = x(range.high ?? hi)
    return `<rect x="${a.toFixed(1)}" y="${y}" width="${Math.max(2, b - a).toFixed(1)}" height="${h}" rx="${h / 2}" fill="${fill}"/>`
  }
  return `${svgOpen(width, W, 24, 'start')}${band(lab, '#E4E6DE', 6, 12)}${band(fm, '#9DC27C', 8, 8)}<circle cx="${x(value).toFixed(1)}" cy="12" r="6.6" fill="${BAND_FILL[bandOf(entry)]}" stroke="#fff" stroke-width="2.4"/></svg></div>`
}

/** A small line icon on a lime disc, for the method strip. */
function methodIcon(kind: 'ranges' | 'clusters' | 'score' | 'plan') {
  const s = `fill="none" stroke="${DEEP}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`
  const art = {
    ranges: `<rect x="12" y="22" width="40" height="9" rx="4.5" ${s}/><rect x="22" y="33" width="20" height="9" rx="4.5" fill="${SAGE}" stroke="${DEEP}" stroke-width="3"/>`,
    clusters: `<line x1="21" y1="24" x2="43" y2="22" ${s}/><line x1="21" y1="24" x2="31" y2="42" ${s}/><line x1="43" y1="22" x2="31" y2="42" ${s}/><circle cx="21" cy="24" r="5.5" fill="#fff" stroke="${DEEP}" stroke-width="3"/><circle cx="43" cy="22" r="5.5" fill="#fff" stroke="${DEEP}" stroke-width="3"/><circle cx="31" cy="42" r="5.5" fill="${SAGE}" stroke="${DEEP}" stroke-width="3"/>`,
    score: `<line x1="16" y1="44" x2="48" y2="44" ${s}/><rect x="18" y="33" width="7" height="8" rx="1.5" fill="#fff" stroke="${DEEP}" stroke-width="2.6"/><rect x="28.5" y="26" width="7" height="15" rx="1.5" fill="#fff" stroke="${DEEP}" stroke-width="2.6"/><rect x="39" y="18" width="7" height="23" rx="1.5" fill="${SAGE}" stroke="${DEEP}" stroke-width="2.6"/>`,
    plan: `<rect x="17" y="15" width="30" height="35" rx="4" ${s}/><polyline points="23,26 26,29 31,23" ${s}/><line x1="34" y1="26" x2="41" y2="26" ${s}/><polyline points="23,38 26,41 31,35" ${s}/><line x1="34" y1="38" x2="41" y2="38" ${s}/>`,
  }[kind]
  return `${svgOpen(3.6, 64, 64)}<circle cx="32" cy="32" r="32" fill="${BRAND_LIME}"/>${art}</svg></div>`
}

const METHOD_STEPS: Array<[Parameters<typeof methodIcon>[0], string, string]> = [
  ['ranges', 'Two ranges', 'Every result against your lab\'s range and the narrower FXMed optimal range.'],
  ['clusters', 'Read in clusters', 'Related markers are read together, one body system at a time.'],
  ['score', 'Scored for support', 'Each system gets a 0–100% score for how much help it needs now.'],
  ['plan', 'Turned into a plan', 'Areas at 50% or more become focus areas in your care plan.'],
]

/** The body system a marker weighs on most, from the areas it moved. */
function mainArea(entry: AssessedEntry, analysis: Analysis) {
  return analysis.areas
    .filter(item => item.area.group !== 'plan' && item.contributors.some(contributor => contributor.entry.name === entry.name && contributor.entry.panel === entry.panel))
    .sort((a, b) => b.score - a.score)[0] || null
}

function twoViewsBody(analysis: Analysis) {
  const read = [...analysis.summary.assessed].filter(entry => bandOf(entry) !== 'unknown').sort((a, b) => bandRank(a) - bandRank(b))
  const arrow = `<div style="display:flex;align-items:center;justify-content:center">${svgOpen(1.1, 12, 20)}<polyline points="2,2 10,10 2,18" fill="none" stroke="${SAGE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>`
  const steps = `<div style="display:grid;grid-template-columns:1fr 1.4em 1fr 1.4em 1fr 1.4em 1fr;align-items:stretch">${METHOD_STEPS.map(([icon, name, text], index) => `${index ? arrow : ''}<div style="background:${CREAM};border-radius:1.1em;padding:1.2em .9em 1.1em;text-align:center">
      ${methodIcon(icon)}<div style="font-size:.7em;font-weight:800;letter-spacing:.18em;color:${GREEN};margin-top:.7em">STEP ${index + 1}</div><div style="font-weight:800;font-size:1em;color:${DEEP};margin-top:.15em">${name}</div><div style="font-size:.84em;line-height:1.5;color:${BODY};margin-top:.3em">${esc(text)}</div></div>`).join('')}</div>`
  if (!read.length) return `${title('How We Read Your Labs')}${lead('Each result is read against two ranges, in clusters, scored and turned into a plan.')}<div style="margin-top:2.4em">${steps}</div>`

  const total = read.length
  const labNormal = read.filter(entry => withinLab(bandOf(entry))).length
  const onTargetCount = read.filter(onTarget).length
  const gap = read.filter(entry => { const band = bandOf(entry); return band === 'below_optimal' || band === 'above_optimal' })
  const gridW = 28.5
  const view = (dark: boolean, label: string, big: string, small: string, sub: string, grid: string, legend: string) => `<div style="background:${dark ? DEEP : CREAM};border-radius:1.3em;padding:1.4em 1.5em 1.3em">
      <div style="font-size:.74em;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${dark ? LIME : GREEN}">${label}</div>
      <div style="margin-top:.35em;line-height:1.1"><span style="font-size:3em;letter-spacing:-.03em;color:${dark ? '#fff' : INK}">${big}</span><span style="font-size:1.05em;color:${dark ? ON_DARK : MUTED}"> ${small}</span></div>
      <div style="font-size:.95em;color:${dark ? ON_DARK : BODY};margin:.2em 0 1em">${sub}</div>
      ${grid}<div style="font-size:.76em;color:${dark ? ON_DARK : BODY};margin-top:.8em;line-height:1.6">${legend}</div></div>`
  const dot = (color: string, text: string) => `<span style="white-space:nowrap;margin-right:1em"><span style="color:${color}">●</span> ${text}</span>`

  const shown = [...gap].sort((a, b) => deviation(b.numeric, b.fmRangeParsed) - deviation(a.numeric, a.fmRangeParsed)).filter(entry => !entry.textResult).slice(0, 6)
  const cell = `padding:.55em .6em;border-bottom:1px solid ${LINE};vertical-align:middle`
  const rows = shown.map(entry => {
    const area = mainArea(entry, analysis)
    const direction = directionOf(entry) === 'low' ? '↓' : '↑'
    const tone = area ? LEVELS[levelOf(area.score)] : null
    return `<tr>
      <td style="${cell};font-weight:700;color:${INK}">${esc(entry.name)}</td>
      <td style="${cell};white-space:nowrap"><span style="font-weight:800;color:${BAND_STYLE[bandOf(entry)].text}">${esc(entry.value)} ${direction}</span> <span style="font-size:.85em;color:${MUTED}">${esc(entry.unit)}</span></td>
      <td style="${cell};color:${MUTED};white-space:nowrap">${esc(entry.labRange || '—')}</td>
      <td style="${cell};color:${GREEN};font-weight:700;white-space:nowrap">${esc(entry.fmRange || '—')}</td>
      <td style="${cell}">${twoRangeBar(entry)}</td>
      <td style="${cell};font-size:.86em;line-height:1.35">${area && tone ? `<span style="color:${INK}">${esc(area.area.name)}</span> <span style="font-weight:800;color:${tone.text}">${area.score}%</span>` : `<span style="color:${MUTED}">—</span>`}</td></tr>`
  }).join('')
  const more = gap.length - shown.length

  return `${title('Your Results, Read Two Ways')}
    ${lead('Most lab reports ask one question: is each result normal? We ask a second: is it where your body works best? Here is what that second look found in your results.')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.1em;margin-top:1.6em">
      ${view(false, 'Your laboratory\'s view', String(labNormal), `of ${total}`, 'results within the normal range', dotGrid(read, 'lab', gridW), `${dot(LAB_NORMAL_FILL, 'Normal')}${dot('#D0574F', 'Flagged')}`)}
      ${view(true, 'The FXMed view', String(onTargetCount), `of ${total}`, 'results on the optimal target', dotGrid(read, 'fxmed', gridW), `${dot(SAGE, 'On target')}${dot('#D6A23A', 'Drifting')}${dot('#D0574F', 'Outside lab range')}`)}
    </div>
    <div style="margin-top:1.1em;border-radius:1.3em;background:${gap.length ? '#FBF4E2' : '#EEF3E6'};padding:1.1em 1.5em;display:flex;align-items:center;gap:1.3em">
      ${disc(gap.length ? '#D6A23A' : SAGE, [[String(gap.length), 44, 700]], 3.6)}
      <div style="font-size:1.06em;line-height:1.5;color:${INK}">${gap.length
        ? `<strong>${gap.length} result${gap.length === 1 ? '' : 's'} your lab passed ${gap.length === 1 ? 'is' : 'are'} already drifting.</strong> <span style="color:${BODY}">${gap.length === 1 ? 'It sits' : 'They sit'} inside the normal range but outside the FXMed optimal target: the early changes this report is built to catch, while they are easiest to turn around.</span>`
        : `<strong>Every result your lab passed is also on target.</strong> <span style="color:${BODY}">Nothing is quietly drifting inside the normal range.</span>`}</div>
    </div>
    ${shown.length ? `<div style="margin-top:1.8em;display:flex;justify-content:space-between;align-items:baseline">${heading('In the gap').replace('margin-bottom:1em', 'margin-bottom:.5em')}<div style="font-size:.8em;color:${BODY}"><span style="color:#C9CCC2">■</span> Lab range &nbsp; <span style="color:#9DC27C">■</span> FXMed optimal &nbsp; <span style="color:#D6A23A">●</span> Your result</div></div>
    <table style="width:100%;border-collapse:collapse;font-size:.9em;line-height:1.4">
      <thead><tr style="text-align:left;font-size:.82em;letter-spacing:.06em;text-transform:uppercase;color:${GREEN}"><th style="${cell};font-weight:800">Marker</th><th style="${cell};font-weight:800">Result</th><th style="${cell};font-weight:800">Lab range</th><th style="${cell};font-weight:800">Optimal</th><th style="${cell};font-weight:800">Where it sits</th><th style="${cell};font-weight:800">Weighs on</th></tr></thead>
      <tbody>${rows}</tbody></table>
    ${more > 0 ? `<div style="font-size:.85em;color:${MUTED};margin-top:.6em">And ${more} more, all in Part 4.</div>` : ''}` : ''}
    <div style="margin-top:2em;border-top:1px solid ${LINE};padding-top:1.5em">${heading('How we read them')}${steps}</div>`
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
      <div data-fm-lift style="font-size:15em;font-weight:300;line-height:.95;letter-spacing:-.05em;color:${LIME}">${section.number}</div>
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

// ---------------------------------------------------------------------------
// Your gut: the stool test, read beside the blood results

/** A plain number from a printed stool value, 2.1e7 for big counts. */
function sciText(value: number) {
  if (!Number.isFinite(value)) return '—'
  if (value !== 0 && (Math.abs(value) >= 1e4 || Math.abs(value) < 0.01)) return value.toExponential(1).replace('e+', 'e')
  return Number(value.toFixed(value >= 100 ? 0 : 2)).toString()
}

function gutTone(entry: StoolEntry): Tone {
  const status = stoolStatus(entry)
  if (stoolNeedsReview(entry, status)) return 'flag'
  return status === 'high' || status === 'low' || status === 'detected' ? 'watch' : 'clear'
}

/**
 * One stool result on a soft three-zone bar: below the lab's range, within it
 * (sage), above it. Bacteria use a log scale, since counts run over many
 * powers of ten; a one-sided range gets a band two steps wide.
 */
function stoolBar(entry: StoolEntry, log: boolean) {
  const reference = parseStoolReference(entry.reference)
  const number = parseStoolNumber(entry.value)
  const below = /<\s*d\.?l|not\s*detected/i.test(entry.value) || number === null || (log && number <= 0)
  const scale = (value: number) => log ? Math.log10(value) : value
  let low = reference?.low != null && (!log || reference.low > 0) ? scale(reference.low) : null
  let high = reference?.high != null && (!log || reference.high > 0) ? scale(reference.high) : null
  const realLow = low, realHigh = high
  if (log) { low = low ?? (high !== null ? high - 2 : null); high = high ?? (low !== null ? low + 2 : null) }
  const span = low !== null && high !== null ? high - low : Math.abs(low ?? high ?? 1) || 1
  // Below the detection limit: well under the range on a log scale, zero on a plain one.
  const value = below ? (log ? (low ?? high ?? 0) - 1.2 : 0) : scale(number!)
  let start = Math.min(value, low ?? high ?? value) - span * 0.35
  if (!log) start = Math.max(0, start)
  const end = Math.max(value, high ?? low ?? value) + span * 0.35
  const at = (point: number) => Math.max(0, Math.min(100, ((point - start) / (end - start || 1)) * 100))
  const a = low !== null ? at(low) : 0, b = high !== null ? at(high) : 100
  const tone = gutTone(entry)
  const label = (point: number | null, real: number | null) => point === null || real === null ? '' : `<span style="position:absolute;left:${at(point)}%;top:1.75em;margin-left:-2.5em;width:5em;text-align:center;font-size:.72em;color:${MUTED}">${esc(log ? sciText(10 ** point) : sciText(point))}</span>`
  return `<div style="position:relative;height:2.7em">
    <div style="position:absolute;left:0;right:0;top:.55em;height:.6em;display:flex;gap:2px">
      ${a > 0 ? `<div style="width:${a}%;background:${TONE.flag.tint};border-radius:1em 0 0 1em"></div>` : ''}
      <div style="flex:1;background:${TONE.clear.light};border-radius:${a > 0 ? '0' : '1em'} ${b < 100 ? '0' : '1em'} ${b < 100 ? '0' : '1em'} ${a > 0 ? '0' : '1em'}"></div>
      ${b < 100 ? `<div style="width:${100 - b}%;background:${TONE.flag.tint};border-radius:0 1em 1em 0"></div>` : ''}
    </div>
    <div style="position:absolute;left:${at(value)}%;top:.1em;width:1.5em;height:1.5em;margin-left:-.75em;border-radius:50%;background:#fff;border:.32em solid ${TONE[tone].solid};box-sizing:border-box"></div>
    ${label(low, realLow)}${label(high, realHigh)}
  </div>`
}

function stoolRow(entry: StoolEntry, log: boolean) {
  const status = stoolStatus(entry), tone = gutTone(entry)
  return `<div style="display:grid;grid-template-columns:15em 6.5em 1fr 7em;gap:1.2em;align-items:center;padding:.55em 0;border-bottom:1px solid ${LINE}">
    <div style="font-size:.95em;line-height:1.3">${esc(entry.name)}</div>
    <div style="font-size:1.1em;letter-spacing:-.01em">${esc(entry.value)} <span style="font-size:.72em;color:${MUTED}">${esc(entry.unit === 'GE/g' ? '' : entry.unit)}</span></div>
    ${stoolBar(entry, log)}
    <div style="text-align:right;font-size:.82em;font-weight:700;color:${TONE[tone].text}">${esc(STOOL_STATUS_LABEL[status])}</div>
  </div>`
}

function gutFindingCard(finding: GutAssessment['findings'][number]) {
  return `<div style="background:${CREAM};border-radius:1em;padding:.9em 1em;${finding.tone === 'nodata' ? 'opacity:.7' : ''}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5em"><div style="font-size:1em;font-weight:700;line-height:1.3">${esc(finding.title)}</div>${twinChip(finding.tone as TwinStatus)}</div>
    <div style="font-size:.85em;line-height:1.5;color:${BODY};margin-top:.4em">${esc(finding.tone === 'nodata' ? 'Not part of this stool test.' : finding.summary || 'Nothing outside the lab\'s range.')}</div>
  </div>`
}

/** The "Your Gut" pages, as blocks for the page flow. Empty when there is no stool test. */
function gutBlocks(gut: GutAssessment, stool: StoolTest): Block[] {
  if (!gut.tested) return []
  const tab = 'Your Gut'
  const filled = stool.entries.filter(entry => entry.value.trim() && stoolStatus(entry) !== 'unknown')
  const bacteria = filled.filter(entry => (entry.section === 'commensal' || entry.section === 'phyla') && entry.markerId !== 'firmicutes_bacteroidetes_ratio' && parseStoolReference(entry.reference))
  const markers = filled.filter(entry => ['digestion', 'gi_markers', 'immune', 'inflammation', 'barrier'].includes(entry.section) && parseStoolReference(entry.reference))
  const found = filled.filter(entry => ['pathogen', 'h_pylori', 'overgrowth', 'inflammatory', 'fungi', 'virus', 'parasite', 'worm'].includes(entry.section) && (stoolStatus(entry) === 'high' || stoolStatus(entry) === 'detected'))
  const source = `${esc(stool.lab || 'stool test')}${stool.collectedAt ? `, collected ${esc(stool.collectedAt)}` : ''}`
  const blocks: Block[] = [{
    tab,
    html: `${title('Your Gut')}
      ${lead('Your stool test shows what blood cannot: the bacteria living in your gut, how well you digest food, and how calm or inflamed the gut lining is. Each result is read against the laboratory\'s own range.')}
      <div style="font-size:.85em;color:${MUTED};margin-top:.6em">From your ${source}.</div>
      ${gut.review.length ? `<div style="margin-top:1.4em;background:${TONE.flag.tint};border-radius:1em;padding:1em 1.2em;color:${TONE.flag.text};font-size:.95em;line-height:1.55"><b>Talk these through with your clinician:</b> ${esc(gut.review.map(result => result.entry.name).join(', '))}. Your clinician decides what they mean alongside your symptoms; this report does not suggest treatment for them.</div>` : ''}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.9em;margin-top:1.6em">${gut.findings.map(gutFindingCard).join('')}</div>
      ${found.length ? `<div style="margin-top:1.6em">${heading('Found above the laboratory\'s threshold')}<div style="display:flex;flex-wrap:wrap;gap:.6em">${found.map(entry => `<span style="background:${CREAM};border-radius:2em;padding:.45em .9em;font-size:.88em">${esc(entry.name)} <b style="color:${TONE[gutTone(entry)].text}">${esc(entry.value)}</b> <span style="color:${MUTED}">(${esc(entry.reference)})</span></span>`).join('')}</div></div>` : ''}`,
  }]
  if (bacteria.length) blocks.push({ tab, html: `${subtitle('Your microbiome')}${lead('The main groups of helpful bacteria, counted in your stool. The scale is logarithmic: each step along it is ten times more. The green band is the laboratory\'s range.')}<div style="margin-top:1.2em">${bacteria.map(entry => stoolRow(entry, true)).join('')}</div>` })
  if (markers.length) blocks.push({ tab, html: `${subtitle('Digestion, immunity and the gut lining')}${lead('How well food is being broken down, how the gut\'s immune defences are working, and signs of inflammation or a leaky gut lining.')}<div style="margin-top:1.2em">${markers.map(entry => stoolRow(entry, false)).join('')}</div>` })
  return blocks
}

// ---------------------------------------------------------------------------
// Digital twin snapshot

/**
 * Organs on the FxMed Digital Twin's body picture, with the report areas each
 * one stands for. x and y are the Twin's hotspot positions, as a percentage of
 * the picture's width and height; side is where its callout sits.
 */
const TWIN_ORGANS: Array<{ id: string; label: string; x: number; y: number; side: 'left' | 'right'; areas: string[] }> = [
  { id: 'thyroid', label: 'Thyroid', x: 50, y: 17, side: 'left', areas: ['thyroid'] },
  { id: 'heart', label: 'Heart & circulation', x: 53.5, y: 26, side: 'right', areas: ['cardiovascular', 'lipids'] },
  { id: 'liver', label: 'Liver & gallbladder', x: 45, y: 33, side: 'left', areas: ['liver', 'gallbladder'] },
  { id: 'pancreas', label: 'Pancreas & sugar', x: 53.5, y: 36.5, side: 'right', areas: ['blood_sugar'] },
  { id: 'kidneys', label: 'Kidneys & adrenals', x: 43, y: 39.5, side: 'left', areas: ['kidney', 'adrenal'] },
  { id: 'gut', label: 'Stomach & gut', x: 50, y: 45.5, side: 'right', areas: ['digestion'] },
  { id: 'hormones', label: 'Sex hormones', x: 50, y: 52.5, side: 'right', areas: ['sex_hormones'] },
  { id: 'muscle', label: 'Bones & muscle', x: 42, y: 62, side: 'left', areas: ['bone', 'protein_status'] },
]
/** Systems that run through the whole body, shown under the figure. */
const TWIN_WHOLE_BODY: Array<{ label: string; areas: string[] }> = [
  { label: 'Blood & iron', areas: ['red_blood', 'iron_status'] },
  { label: 'Immune system', areas: ['immune'] },
  { label: 'Inflammation', areas: ['inflammation', 'oxidative'] },
  { label: 'Nourishment', areas: ['vitamin_status', 'mineral_status', 'hydration', 'electrolytes'] },
]

type TwinStatus = Tone | 'nodata'
const TWIN_WORDS: Record<TwinStatus, string> = { flag: 'Needs support', watch: 'Worth watching', clear: 'Low priority', nodata: 'Not tested' }

const TWIN_RANK: Record<TwinStatus, number> = { flag: 3, watch: 2, clear: 1, nodata: 0 }

/**
 * The status of a group of areas: from the highest support score among those
 * these results could score. Where a stool test speaks to one of the areas,
 * the status is the higher of the two, and the stool findings are named; the
 * blood score itself is unchanged.
 */
function twinStatus(analysis: Analysis, ids: string[], gut?: GutAssessment) {
  const scored = ids.map(id => analysis.areas.find(item => item.area.id === id)).filter((item): item is AreaResult => !!item && item.considered.length > 0)
  const evidence = gut ? ids.map(id => gutEvidence(gut, id)).filter((item): item is NonNullable<ReturnType<typeof gutEvidence>> => !!item) : []
  const stoolTone = evidence.reduce<TwinStatus>((worst, item) => TWIN_RANK[item.tone as TwinStatus] > TWIN_RANK[worst] ? item.tone as TwinStatus : worst, 'nodata')
  const stool = Array.from(new Set(evidence.flatMap(item => item.findings.map(finding => finding.title.toLowerCase())))).join(', ')
  const stoolTested = evidence.length > 0
  if (!scored.length) return { status: stoolTone, word: TWIN_WORDS[stoolTone], worst: null, markers: '', stool, stoolTested, untested: false }
  const worst = scored.reduce((top, item) => item.score > top.score ? item : top)
  const seen = new Set<string>()
  const contributors = scored.flatMap(item => item.contributors).filter(({ entry }) => !seen.has(entry.name) && !!seen.add(entry.name))
  const blood = toneOf(worst.score) as TwinStatus
  const status = TWIN_RANK[stoolTone] > TWIN_RANK[blood] ? stoolTone : blood
  const statuses = scored.map(item => scoreStatus(item).key)
  // Low blood scores only reassure where a direct test was read. A stool finding can still raise the status.
  if (status === 'clear' && statuses.every(key => key === 'not_direct' || key === 'indirect')) {
    return stoolTone === 'clear'
      ? { status, word: TWIN_WORDS.clear, worst, markers: '', stool, stoolTested, untested: true }
      : { status: 'nodata' as TwinStatus, word: 'Not tested directly', worst, markers: '', stool, stoolTested, untested: true }
  }
  const word = status === 'clear' && statuses.every(key => key === 'on_target') ? 'On target' : TWIN_WORDS[status]
  return { status, word, worst, markers: markerList(contributors.slice(0, 3)), stool, stoolTested, untested: false }
}

/** A status pill. SVG, because html2canvas draws text in small boxes too low. */
function twinChip(status: TwinStatus, text = TWIN_WORDS[status]) {
  const colors = status === 'nodata' ? { tint: TRACK, text: MUTED } : { tint: TONE[status].tint, text: TONE[status].text }
  const width = text.length * 0.5 + 1.5
  return `<span style="display:block;flex:none;font-size:.8em"><svg width="${width}em" height="1.8em" viewBox="0 0 ${width * 10} 18" style="display:block">
    <rect width="${width * 10}" height="18" rx="9" fill="${colors.tint}"/>
    <text x="${width * 5}" y="12.2" text-anchor="middle" font-family="${SVG_FONT}" font-size="9" font-weight="700" fill="${colors.text}">${esc(text)}</text></svg></span>`
}

function twinCard(label: string, state: ReturnType<typeof twinStatus>, style: string) {
  return `<div style="${style};background:${CREAM};border-radius:1em;padding:.75em .9em;box-sizing:border-box">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5em"><div style="font-size:1em;font-weight:700;line-height:1.3;color:${INK}">${esc(label)}</div>${twinChip(state.status, state.word)}</div>
    <div style="font-size:.84em;line-height:1.45;color:${BODY};margin-top:.35em">${state.untested && state.worst
      ? `<span style="color:${MUTED}">Its main tests were not in these results.${state.worst.missing.length ? ` Consider ${esc(state.worst.missing.slice(0, 2).join(', '))}.` : ''}</span>`
      : state.worst
      ? `${esc(state.worst.area.name)} <b style="color:${TONE[toneOf(state.worst.score)].text}">${state.worst.score}%</b>${state.markers ? `<br/><span style="color:${MUTED}">${state.markers}</span>` : ''}`
      : state.stoolTested ? '' : `<span style="color:${MUTED}">These results did not include its markers.</span>`}${state.stool
      ? `${state.worst ? '<br/>' : ''}<b style="color:${GREEN}">From your stool test:</b> ${esc(state.stool)}`
      : state.stoolTested && !state.worst ? `<span style="color:${MUTED}">Stool test: nothing outside the lab's range.</span>` : ''}</div>
  </div>`
}

function twinBody(analysis: Analysis, gut?: GutAssessment) {
  // The map in em, against the page's base size: a cropped figure in the
  // middle, callouts down either side, joined by lines drawn in one SVG.
  // The picture is drawn 46em wide and cropped to the torso (22–78% across,
  // 2–66% down), so the organs read at a useful size.
  const width = 69, picture = 46, cropX = 0.22, cropY = 0.02
  const figureWidth = picture * 0.56, visible = picture * 1.5 * 0.64, figureLeft = (width - figureWidth) / 2
  const cardWidth = 19.5, cardHeight = 6.4, gap = 0.8
  const organs = TWIN_ORGANS.map(organ => ({ ...organ, ...twinStatus(analysis, organ.areas, gut),
    hx: figureLeft + (organ.x / 100 - cropX) * picture, hy: (organ.y / 100 - cropY) * picture * 1.5 }))
  // Each side's callouts at their organ's height, nudged apart so none overlap.
  const placed = new Map<string, number>()
  for (const side of ['left', 'right'] as const) {
    const list = organs.filter(organ => organ.side === side).sort((a, b) => a.hy - b.hy)
    const tops = list.map(organ => organ.hy - cardHeight / 2)
    for (let index = 0; index < tops.length; index++) tops[index] = Math.max(tops[index], index ? tops[index - 1] + cardHeight + gap : 0)
    const overflow = tops.length ? tops[tops.length - 1] + cardHeight - visible : 0
    if (overflow > 0) for (let index = tops.length - 1; index >= 0; index--) tops[index] = Math.min(tops[index] - (index === tops.length - 1 ? overflow : 0), index < tops.length - 1 ? tops[index + 1] - cardHeight - gap : Infinity)
    list.forEach((organ, index) => placed.set(organ.id, Math.max(0, tops[index])))
  }
  const u = (value: number) => (value * 10).toFixed(1)
  const lines = organs.map(organ => {
    const top = placed.get(organ.id)!, y = top + cardHeight / 2
    const edge = organ.side === 'left' ? cardWidth : width - cardWidth
    const elbow = organ.side === 'left' ? edge + 1.6 : edge - 1.6
    const tone = organ.status === 'nodata' ? FAINT : TONE[organ.status].solid
    return `<polyline points="${u(edge)},${u(y)} ${u(elbow)},${u(y)} ${u(organ.hx)},${u(organ.hy)}" fill="none" stroke="${tone}" stroke-width="1.6" stroke-opacity=".75" stroke-linejoin="round"/>
      <circle cx="${u(organ.hx)}" cy="${u(organ.hy)}" r="9.5" fill="#fff" stroke="${tone}" stroke-width="3"/>
      <circle cx="${u(organ.hx)}" cy="${u(organ.hy)}" r="3.6" fill="${tone}"/>
      <circle cx="${u(edge)}" cy="${u(y)}" r="3" fill="${tone}"/>`
  }).join('')
  const cards = organs.map(organ => twinCard(organ.label, organ, `position:absolute;top:${placed.get(organ.id)!.toFixed(2)}em;${organ.side}:0;width:${cardWidth}em;height:${cardHeight}em`)).join('')
  const legend = (['flag', 'watch', 'clear', 'nodata'] as TwinStatus[]).map(status => `<span style="display:inline-flex;align-items:center;gap:.45em;margin-right:1.4em"><span style="width:.8em;height:.8em;border-radius:50%;background:${status === 'nodata' ? FAINT : TONE[status].solid}"></span>${TWIN_WORDS[status]}</span>`).join('')
  return `${title('Your Digital Twin')}
    ${lead('Your results mapped onto the body, as in the FxMed Digital Twin. Each organ takes the highest support score among the areas it stands for, with the markers behind it.')}
    <div style="position:relative;height:${visible.toFixed(2)}em;margin-top:1.8em">
      <div style="position:absolute;left:${figureLeft}em;top:0;width:${figureWidth}em;height:${visible.toFixed(2)}em;overflow:hidden;border-radius:1.2em">
        <img src="/fm-report/digital-twin-body.jpg" style="position:absolute;left:${(-cropX * picture).toFixed(2)}em;top:${(-cropY * picture * 1.5).toFixed(2)}em;width:${picture}em;height:${picture * 1.5}em;max-width:none" />
        <div style="position:absolute;left:0;top:0;bottom:0;width:4em;background:linear-gradient(90deg,#fff,rgba(255,255,255,0))"></div>
        <div style="position:absolute;right:0;top:0;bottom:0;width:4em;background:linear-gradient(270deg,#fff,rgba(255,255,255,0))"></div>
        <div style="position:absolute;left:0;right:0;bottom:0;height:5em;background:linear-gradient(0deg,#fff,rgba(255,255,255,0))"></div>
      </div>
      <span style="position:absolute;left:0;top:0"><svg width="${width}em" height="${visible.toFixed(2)}em" viewBox="0 0 ${width * 10} ${u(visible)}" style="display:block">${lines}</svg></span>
      ${cards}
    </div>
    <div style="margin-top:1.6em">${heading('Through the whole body')}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.9em">${TWIN_WHOLE_BODY.map(item => twinCard(item.label, twinStatus(analysis, item.areas, gut), 'min-height:6.4em')).join('')}</div>
    <div style="margin-top:1.2em;font-size:.84em;color:${BODY}">${legend}</div>
    <div style="margin-top:.6em;font-size:.78em;line-height:1.5;color:${MUTED}">A map of where your results point, drawn on the FxMed Digital Twin. It is not a picture of your own body and not a diagnosis; your clinician reads it with your history and symptoms.</div>`
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
  const list = (label: string, items: string[], color: string, mark: string) => `<div><div style="font-size:.78em;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${color};margin-bottom:.8em">${label}</div>
      ${items.map(item => `<div style="display:flex;gap:.7em;align-items:baseline;margin-bottom:.55em;font-size:.98em;line-height:1.5;color:${BODY}"><span style="flex:none;font-weight:800;color:${color}">${mark}</span><span>${esc(item)}</span></div>`).join('')}</div>`
  return `${title('About This Report')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2.4em;margin-top:1.6em;background:${CREAM};border-radius:1.2em;padding:1.4em 1.6em">${list('This report is', REPORT_IS, GREEN, '✓')}${list('This report is not', REPORT_IS_NOT, '#B5523B', '✕')}</div>
    <div style="margin-top:1.6em">${paragraphs.map(text => `<p style="font-size:1em;line-height:1.65;color:${BODY};margin:0 0 1em">${esc(text)}</p>`).join('')}</div>
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
  add('start', 'Two Views', () => twoViewsBody(analysis))
  add('start', 'Your Snapshot', () => snapshotBody(analysis, narrative))
  if (analysis.summary.assessed.length) add('start', 'Health Score', () => healthScoreBody(analysis))

  // Part 2. Your body, system by system
  divider('body')
  const gut = assessStool(data.stool ?? null)
  add('body', 'Digital Twin', () => twinBody(analysis, gut.tested ? gut : undefined))
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
  if (gut.tested && data.stool) flow('body', gutBlocks(gut, data.stool))

  // Part 3. Your care plan
  divider('plan')
  const planBlocks: Block[] = []
  planBlocks.push({ tab: 'Focus Areas', html: `${title('Your Focus Areas')}${lead(AREA_GROUPS.plan.intro)}${lead(analysis.plan.length ? 'Each focus area has its own page: the results behind it, your targets, and what we will do about it through food, daily habits, supplements to discuss with your clinician, and tests to repeat.' : 'No area scored high enough to need a plan of its own. Keep up the basics on the Next 90 Days page and retest as advised.')}${analysis.plan.length ? likelihoodChart(analysis.plan) : ''}<div style="height:1.4em"></div>` })
  analysis.plan.forEach(item => planBlocks.push({ tab: 'Focus Areas', html: `${improvementPage(item, narrative, analysis.child, gut)}<div style="height:2.2em"></div>` }))
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
    // Worded results (H. pylori) have no distance to measure, so they are left off this chart.
    const byDistance = out.filter(entry => !entry.textResult).sort((a, b) => (deviation(b.numeric, b.fmRangeParsed) || deviation(b.numeric, b.labRangeParsed)) - (deviation(a.numeric, a.fmRangeParsed) || deviation(a.numeric, a.labRangeParsed)))
    chunk(byDistance, 22).forEach((part, page) => resultBlocks.push({ tab: 'How Far Off', html:
      `${page ? '<div style="height:1.6em"></div>' : `<div style="height:1em"></div>${title('How Far Off Target')}${lead('Each marker outside its FXMed optimal range, measured by how far past the nearest limit it sits, as a share of that limit. Running low reads to the left, running high to the right; the furthest out come first.')}${offTargetCards(out)}<div style="height:1.8em"></div>`}${deviationChart(part)}<div style="margin-top:1.2em;display:flex;justify-content:center">${bandLegend()}</div><div style="height:1em"></div>` }))
    resultBlocks.push({ tab: 'Off Target', keep: true, html: `${title('Off Target')}${lead('These markers sit outside the FXMed optimal range, the furthest out first. For each one: what it measures, and the usual reasons it runs high or low. Your clinician will read them alongside your history and symptoms. Every marker is also explained in the FXMed Lab Library at www.fxmed.ng/lab-library.')}` })
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

/**
 * How far below its true place html2canvas (1.4) draws a line of text, in px.
 * It puts the baseline at the text's top plus a distance measured in a probe on
 * document.body, which inherits the page's line-height (1.5) and so lands
 * about a third of an em too low: barely visible in body text, but 59px for
 * the 15em part number on a divider. Measured the same way html2canvas does
 * (see FontMetrics.parseMetrics), less the font's real ascent.
 */
function html2canvasDrop(element: HTMLElement) {
  const style = getComputedStyle(element)
  const probe = document.createElement('div')
  probe.style.cssText = `visibility:hidden;font-family:${style.fontFamily};font-size:${style.fontSize};margin:0;padding:0;white-space:nowrap`
  const span = document.createElement('span')
  span.style.cssText = `font-family:${style.fontFamily};font-size:${style.fontSize};margin:0;padding:0`
  span.textContent = 'Hidden Text'
  const img = document.createElement('img')
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  img.width = img.height = 1
  img.style.cssText = 'margin:0;padding:0;vertical-align:baseline'
  probe.append(span, img)
  document.body.appendChild(probe)
  const measured = img.offsetTop - span.offsetTop + 2
  probe.remove()
  const context = document.createElement('canvas').getContext('2d')!
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  return measured - context.measureText(element.textContent || '').fontBoundingBoxAscent
}

/** Raises large text marked data-fm-lift in html2canvas's copy of the page, so the PDF matches the preview. */
function liftForCanvas(root: HTMLElement, clone: HTMLElement) {
  const copies = clone.querySelectorAll<HTMLElement>('[data-fm-lift]')
  root.querySelectorAll<HTMLElement>('[data-fm-lift]').forEach((element, index) => {
    const drop = html2canvasDrop(element)
    if (copies[index] && drop) Object.assign(copies[index].style, { position: 'relative', top: `${-drop}px` })
  })
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
      const canvas = await html2canvas(root, { scale: RENDER_SCALE, useCORS: true, backgroundColor: '#ffffff', width: PAGE_W, height: PAGE_H, onclone: (_doc, clone) => liftForCanvas(root, clone) })
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
