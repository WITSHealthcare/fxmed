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
import { ageInYears, FM_PANELS, PRIORITY_COLOR, type AssessedEntry, type FmEntry, type FmNarrative, type FmPatient } from './fmBiomarkers'
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
type Page = { kind: 'cover' | 'divider' | 'content'; section: SectionId; tab: string; body: (toc: TocIndex) => string }

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


/** The gauge arc's length in SVG units (a half circle of radius 46). Safari ignores pathLength when it draws an SVG as an image, so the dash is measured in real units. */
const ARC_LENGTH = Math.PI * 46

/** A half-circle gauge of a likelihood: one smooth arc in its tone over a soft track, with a rounded cap. */
function gauge(score: number, size = 9) {
  const id = `fmg${svgId++}`
  const tone = TONE[toneOf(score)]
  const arc = 'M 14 64 A 46 46 0 0 1 106 64'
  const share = Math.min(Math.max(score, 0), 100) / 100
  return `<svg width="${size}em" height="${size * 0.62}em" viewBox="0 0 120 74" style="display:block;margin:0 auto">
    <defs><linearGradient id="${id}" x1="14" y1="0" x2="106" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${tone.light}"/><stop offset="1" stop-color="${tone.solid}"/></linearGradient></defs>
    <path d="${arc}" fill="none" stroke="${TRACK}" stroke-width="11" stroke-linecap="round"/>
    ${score > 0 ? `<path d="${arc}" fill="none" stroke="url(#${id})" stroke-width="11" stroke-linecap="round" stroke-dasharray="${share * ARC_LENGTH} 400"/>` : ''}
    <text x="60" y="61" text-anchor="middle" font-family="${SVG_FONT}" font-size="18" fill="${INK}">${score}<tspan font-size="10" fill="${MUTED}">%</tspan></text>
  </svg>`
}

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

/** A rounded bar that fills to the likelihood with a soft gradient in its tone, over a light track. */
function likelihoodBar(score: number, grow = true, labelled = true) {
  const width = Math.max(0, Math.min(score, 100))
  const tone = TONE[toneOf(score)]
  // The percentage is SVG text outside the clipped track: html2canvas draws
  // HTML text a few pixels low, which a clipped bar would cut off.
  const inside = width >= 12
  // html2canvas skips an SVG that is itself absolutely positioned, so a span carries the position.
  const label = !labelled ? '' : `<span style="position:absolute;top:0;${inside ? `right:${100 - width}%` : `left:${width}%`}"><svg width="3.6em" height="1.1em" viewBox="0 0 36 11" style="display:block">
    <text x="${inside ? 31 : 5}" y="8" text-anchor="${inside ? 'end' : 'start'}" font-family="${SVG_FONT}" font-size="7.2" font-weight="700" fill="${inside && toneOf(score) !== 'watch' ? '#fff' : INK}">${score}%</text></svg></span>`
  return `<div style="position:relative;${grow ? 'flex:1;' : ''}height:1.1em">
    <div style="position:absolute;inset:0;background:${TRACK};border-radius:1em;overflow:hidden">
      ${width ? `<div style="position:absolute;left:0;top:0;bottom:0;width:${width}%;border-radius:1em;background:linear-gradient(90deg, ${tone.light}, ${tone.solid})"></div>` : ''}
    </div>${label}
  </div>`
}

/** The support-score scale as one bar: holding steady under 50%, watch to 70%, support above. */
function likelihoodScale() {
  const part = (width: number, color: string, radius: string) => `<div style="width:${width}%;height:100%;background:${color};border-radius:${radius}"></div>`
  return `<div style="display:flex;gap:2px;height:.75em">${part(50, `linear-gradient(90deg, ${TONE.clear.tint}, ${TONE.clear.light})`, '1em 0 0 1em')}${part(20, `linear-gradient(90deg, ${TONE.watch.light}, ${TONE.watch.solid})`, '0')}${part(30, `linear-gradient(90deg, ${TONE.flag.light}, ${TONE.flag.solid})`, '0 1em 1em 0')}</div>`
}

function likelihoodChart(items: AreaResult[], label = 'Support score') {
  const row = (item: AreaResult) => `<div style="display:flex;align-items:center;margin-bottom:.75em">
    <div style="width:16.5em;flex:none;text-align:right;padding-right:1.3em;font-size:.98em;line-height:1.3;color:${INK}">${esc(item.area.name)}</div>${likelihoodBar(item.score)}</div>`
  const tick = (left: number, text: string) => `<div style="position:absolute;left:${left}%;top:0;font-size:.82em;line-height:1.35;color:${BODY}">${text}<div style="width:1px;height:.6em;background:${FAINT};margin-top:.5em"></div></div>`
  const high = items.filter(needsDetail)
  const low = items.filter(item => !needsDetail(item))
  return `<div style="margin-top:2.2em">
    <div style="display:flex"><div style="width:16.5em;flex:none"></div><div style="flex:1">
      <div style="text-align:center;font-weight:800;font-size:1.05em;letter-spacing:.06em;text-transform:uppercase;padding-bottom:.55em;border-bottom:1px solid ${FAINT}">${esc(label)}</div>
      <div style="position:relative;height:3.6em;margin-top:.6em">${tick(50, 'Watch<br/>50–70%')}${tick(70, 'Support<br/>70–90%')}${tick(88, 'Priority<br/>90%+')}</div>
    </div></div>
    ${high.map(row).join('')}
    ${low.length ? `<div style="display:flex;margin:${high.length ? '1em' : '0'} 0 .6em"><div style="width:16.5em;flex:none"></div><div style="font-size:.82em;line-height:1.35;color:${BODY}">Holding steady<br/>under 50%<div style="width:1px;height:.6em;background:${FAINT};margin-top:.5em"></div></div></div>${low.map(row).join('')}` : ''}
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
  return `<div style="text-align:center">${gauge(score)}
    <div style="width:3.4em;border-top:1px solid ${FAINT};margin:.9em auto"></div>
    <div style="font-size:.92em;line-height:1.5;color:${BODY}">${esc(label)}.<br/>${esc(advice)}</div>
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
// Every marker

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
      <div style="position:absolute;left:0;right:0;top:.55em;height:.6em;display:flex;gap:2px">${[TONE.flag.tint, TONE.watch.tint, TONE.clear.light, TONE.watch.tint, TONE.flag.tint].map((color, index) =>
        `<div style="flex:1;background:${color};border-radius:${index === 0 ? '1em 0 0 1em' : index === 4 ? '0 1em 1em 0' : '0'}"></div>`).join('')}</div>
      <div style="position:absolute;left:${position}%;top:.1em;width:1.5em;height:1.5em;margin-left:-.75em;border-radius:50%;background:#fff;border:.32em solid ${BAND_COLOR[band]};box-sizing:border-box;box-shadow:0 1px 3px rgba(22,26,21,.18)"></div>
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
      <div style="margin-top:1em">${likelihoodScale()}</div>
      <div style="display:flex;justify-content:space-between;font-size:.8em;color:${MUTED};margin-top:.4em"><span>Holding steady</span><span>Watch</span><span>Support</span><span>Priority</span></div></div>
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
        ${top.length ? top.map(item => `<div style="margin-bottom:.95em"><div style="display:flex;justify-content:space-between;font-size:.95em;line-height:1.4;margin-bottom:.6em"><span>${esc(item.area.name)}</span><span style="font-weight:800">${item.score}%</span></div>${likelihoodBar(item.score, false, false)}</div>`).join('') : `<div style="color:${MUTED}">No area scored high enough to need its own plan.</div>`}</div>
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

  // Part 1. Start here
  add('start', '', () => coverBody(data), 'cover')
  add('start', 'Report Map', toc => mapBody(toc))
  divider('start')
  add('start', 'Our Method', () => methodBody())
  add('start', 'Your Snapshot', () => snapshotBody(analysis, narrative))

  // Part 2. Your body, system by system
  divider('body')
  for (const group of ['system', 'accessory', 'nutrient', 'deficiency'] as const) {
    const items = analysis.group(group)
    if (!items.length) continue
    const tab = GROUP_TABS[group]
    const info = AREA_GROUPS[group]
    add('body', tab, () => `${title(info.title)}${lead(info.intro)}${lead('Every area scoring 50% or more is explained over the page, with the markers that moved its score.')}${likelihoodChart(items)}`)
    chunk(items.filter(needsDetail), group === 'deficiency' ? 4 : 3).forEach((part, page) => add('body', tab, () =>
      `${page ? '<div style="height:1.6em"></div>' : `${subtitle(`A closer look: ${info.title}`)}${lead('For each area: its support score, what the area does in the body, and the markers that shaped the score.')}<div style="height:2em"></div>`}${part.map(areaDetail).join('')}`))
  }

  // Part 3. Your care plan
  divider('plan')
  add('plan', 'Focus Areas', () => `${title('Your Focus Areas')}${lead(AREA_GROUPS.plan.intro)}${lead(analysis.plan.length ? 'Each focus area has its own page: the results behind it, your targets, and what we will do about it through food, daily habits, supplements to discuss with your clinician, and tests to repeat.' : 'No area scored high enough to need a plan of its own. Keep up the basics on the Next 90 Days page and retest as advised.')}${analysis.plan.length ? likelihoodChart(analysis.plan, 'Focus areas') : ''}`)
  analysis.plan.forEach(item => add('plan', 'Focus Areas', () => improvementPage(item, narrative, analysis.child)))
  const recommendations = narrative.recommendations.length ? narrative.recommendations : defaultRecommendations(analysis)
  chunk(recommendations, 6).forEach((part, page) => add('plan', 'First Moves', () =>
    `${page ? '<div style="height:1.6em"></div>' : `${title('Your First Moves')}${lead('If you do nothing else, start here. These are the most important actions from your plan, most pressing first; anything marked urgent needs a doctor before the rest.')}<div style="height:1.8em"></div>`}<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2em">${part.map(recommendationCard).join('')}</div>`))
  add('plan', 'Next 90 Days', () => next90Body(analysis, narrative, data.patient))

  // Part 4. Your results in full
  divider('results')
  const rows = FM_PANELS.flatMap(panel => analysis.summary.assessed.filter(entry => entry.panel === panel.id).map((entry, index) => ({ panel: panel.name, entry, first: index === 0 })))
  const resultPages = rows.length ? [rows.slice(0, 5), ...chunk(rows.slice(5), 10)] : []
  resultPages.forEach((part, page) => add('results', 'Every Marker', () => (page ? '<div style="height:1.4em"></div>'
    : `${title('Every Marker')}${lead('Each marker sits on a five-band scale: on target in the green centre, off target either side of it, and outside the laboratory\'s range at the ends. Markers that are off target are explained on the Off Target pages.')}${bandCounts(analysis)}<div style="height:2.2em"></div>`)
    + part.map((row, position) => `${row.first || position === 0 ? `<div style="font-size:1.15em;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin:${position ? '1.2em' : '0'} 0 1em">${esc(row.panel)}${row.first ? '' : ' (continued)'}</div>` : ''}${resultRow(row.entry)}`).join('')))

  const out = analysis.summary.assessed.filter(entry => directionOf(entry)).sort((a, b) => SEVERITY[bandOf(a)] - SEVERITY[bandOf(b)])
  if (out.length) {
    add('results', 'Off Target', () => `${title('Off Target')}${lead('These markers sit outside the FXMed optimal range, the furthest out first. For each one: what it measures, and the usual reasons it runs high or low. Your clinician will read them alongside your history and symptoms.')}${bandCounts(analysis)}`)
    for (const [name, list] of [['Running high', out.filter(entry => directionOf(entry) === 'high')], ['Running low', out.filter(entry => directionOf(entry) === 'low')]] as const) {
      chunk(list, 8).forEach((part, page) => add('results', 'Off Target', () =>
        `<div style="font-size:2.1em;color:${GREEN};line-height:1.3;margin:1.3em 0 1em">${name}${page ? ' (continued)' : ''}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:2em 2.2em">${part.map(outOfRangeCard).join('')}</div>`))
    }
  }

  // Closing notes
  add('notes', 'About This Report', () => notesBody())

  // Contents and header tabs: the first page of each part's tab. The cover is page 0.
  const toc: TocIndex = new Map()
  pages.forEach((item, number) => { if (item.kind === 'content' && !toc.has(`${item.section}:${item.tab}`)) toc.set(`${item.section}:${item.tab}`, number) })
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
