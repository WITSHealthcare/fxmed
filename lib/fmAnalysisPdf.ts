// The Functional Health Report: a US Letter portrait PDF in five sections —
// Introduction, Assessment, Analysis, Health Improvement Plan and Appendix.
//
// Each page is laid out as fixed-size HTML (816 × 1056 CSS px = 8.5 × 11 in),
// rasterised with html2canvas and placed on its own PDF sheet. Sizes are in em
// against the page's base font size, so a page whose content runs long is
// shrunk a step at a time until it fits rather than spilling or being cut.
// The same HTML drives the on-screen preview.

import {
  analyse, AREA_GROUPS, BAND_COLOR, BAND_LABEL, bandOf, defaultFindings, defaultNextSteps, defaultRecommendations,
  defaultSummary, directionOf, likelihoodLabel, needsDetail, planFor, PLAN_PARTS, priorityOf,
  type Analysis, type AreaGroup, type AreaResult, type Band,
} from './fmAssessment'
import { FM_PANELS, PRIORITY_COLOR, type AssessedEntry, type FmEntry, type FmNarrative, type FmPatient } from './fmBiomarkers'
import { markerExplanation } from './fmMarkerInfo'

export const PAGE_W = 816
export const PAGE_H = 1056
const BASE_FONT = 11
const MIN_FONT = 8
const MINT = '#3CC48A'
const MINT_DARK = '#1E9E68'
const INK = '#1F2A37'
const BODY = '#3F4A57'
const MUTED = '#6B7280'
const FAINT = '#A0A8B2'
const LINE = '#E3E7EA'
const SOFT = '#F3FAF6'
const FONT = "'DM Sans', 'Lato', Arial, Helvetica, sans-serif"
const GRADIENT = 'linear-gradient(90deg, #3CC48A 0%, #9CCB5E 32%, #F5C04A 55%, #F59A4F 76%, #EF6F5E 100%)'

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

type SectionId = 'intro' | 'assessment' | 'analysis' | 'plan' | 'appendix'

const SECTIONS: Array<{ id: SectionId; number: number; title: string; blurb: string }> = [
  { id: 'intro', number: 1, title: 'Introduction', blurb: 'An introduction to functional blood chemistry analysis, and your results at a glance.' },
  { id: 'assessment', number: 2, title: 'Assessment', blurb: 'An in-depth evaluation of your body systems, nutrient status and individual nutrient needs.' },
  { id: 'analysis', number: 3, title: 'Analysis', blurb: 'A full breakdown of every biomarker, showing where each sits against the optimal and standard ranges.' },
  { id: 'plan', number: 4, title: 'Health Improvement Plan', blurb: 'The areas that need the most attention, with a practical plan for each.' },
  { id: 'appendix', number: 5, title: 'Appendix', blurb: 'Additional information about this report.' },
]

/** Page number of the first page of each section's tab, keyed "section:tab". */
type TocIndex = Map<string, number>
type Page = { kind: 'cover' | 'divider' | 'content'; section: SectionId; tab: string; body: (toc: TocIndex) => string }

function header(section: SectionId, tab: string, tabs: string[]) {
  const name = SECTIONS.find(item => item.id === section)!.title
  return `<div style="display:flex;gap:1.8em;padding:2.2em 2.6em 0">
    <div style="width:15.5em;flex:none;border-top:1px solid ${MINT};padding-top:.7em;font-size:.95em;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:${MINT};line-height:1.35">${esc(name)}</div>
    <div style="flex:1;display:flex;border-top:1px solid ${MINT}">${tabs.map(item => {
      const active = item === tab
      return `<div style="width:9.6em;margin-top:-1px;padding-top:.7em;padding-right:.8em;border-top:3px solid ${active ? MINT : 'transparent'};font-size:.92em;line-height:1.35;font-weight:${active ? 800 : 400};color:${active ? MINT : INK}">${esc(item)}</div>`
    }).join('')}</div>
  </div>`
}

function footer(patient: FmPatient, number: number) {
  const date = readableDate(patient.collectedAt)
  return `<div style="position:absolute;left:2.6em;right:2.6em;bottom:2em;display:flex;justify-content:space-between;font-size:.88em;color:${BODY};line-height:1.4">
    <span>Functional Health Report &nbsp;&nbsp;|&nbsp;&nbsp; ${esc(patient.name || 'Patient')}${date ? `&nbsp;&nbsp;&nbsp;&nbsp; Lab test ${esc(date)}` : ''}</span><span>${number}</span>
  </div>`
}

function shell(content: string, chrome: string, patient: FmPatient, number: number | null) {
  return `<div data-fm-page style="position:relative;width:${PAGE_W}px;height:${PAGE_H}px;overflow:hidden;background:#fff;color:${INK};font-family:${FONT};font-size:${BASE_FONT}px;line-height:1.45;box-sizing:border-box">
    ${chrome}
    <div data-fm-body style="padding:0 2.6em">${content}</div>
    ${number === null ? '' : footer(patient, number)}
  </div>`
}

const dash = (margin = '1.6em 0 1em') => `<div style="width:2.8em;height:.38em;background:${MINT};border-radius:1em;margin:${margin}"></div>`

function title(text: string) {
  return `${dash()}<div style="font-size:3em;font-weight:800;letter-spacing:-.02em;line-height:1.2;color:${MINT}">${esc(text)}</div>`
}

const subtitle = (text: string) => `<div style="font-size:2.1em;font-weight:400;color:${MINT};line-height:1.3;margin:1.4em 0 .7em">${esc(text)}</div>`
const lead = (text: string) => `<p style="font-size:1.08em;line-height:1.65;color:${BODY};margin:.9em 0 0">${esc(text)}</p>`
const heading = (text: string) => `<div style="font-size:1.05em;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:1em">${esc(text)}</div>`

// ---------------------------------------------------------------------------
// Charts

let svgId = 0

/** A half-circle gauge of a likelihood, green to red. */
function gauge(score: number, size = 9) {
  const id = `fmg${svgId++}`
  const arc = 'M 14 64 A 46 46 0 0 1 106 64'
  return `<svg width="${size}em" height="${size * 0.62}em" viewBox="0 0 120 74" style="display:block;margin:0 auto">
    <defs><linearGradient id="${id}" x1="14" y1="0" x2="106" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3CC48A"/><stop offset=".55" stop-color="#F5C04A"/><stop offset="1" stop-color="#EF6F5E"/></linearGradient></defs>
    <path d="${arc}" fill="none" stroke="#ECEFF1" stroke-width="13" stroke-linecap="round"/>
    ${score > 0 ? `<path d="${arc}" fill="none" stroke="url(#${id})" stroke-width="13" stroke-linecap="round" pathLength="100" stroke-dasharray="${Math.min(score, 100)} 200"/>` : ''}
    <text x="60" y="62" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="${INK}">${score}%</text>
  </svg>`
}

/** A filled circle with centred lines of text. SVG, because html2canvas mis-centres text in boxes. */
function disc(color: string, lines: Array<[string, number, number?]>, size: number, outline = false) {
  const total = lines.reduce((sum, [, font]) => sum + font, 0) + (lines.length - 1) * 4
  let y = 50 - total / 2
  const texts = lines.map(([text, font, weight], index) => {
    y += (index ? 4 : 0) + font * 0.85
    const line = `<text x="50" y="${y}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${font}" font-weight="${weight || 400}" fill="${outline ? INK : '#fff'}">${esc(text)}</text>`
    y += font * 0.15
    return line
  }).join('')
  return `<svg width="${size}em" height="${size}em" viewBox="0 0 100 100" style="display:block;flex:none"><circle cx="50" cy="50" r="${outline ? 48 : 50}" fill="${outline ? '#fff' : color}" stroke="${outline ? '#9CA3AF' : 'none'}" stroke-width="${outline ? 2 : 0}"/>${texts}</svg>`
}

function likelihoodBar(score: number, grow = true, labelled = true) {
  const width = Math.max(0, Math.min(score, 100))
  const label = !labelled ? '' : width >= 9
    ? `<div style="position:absolute;top:0;right:${100 - width}%;padding-right:.7em;height:100%;line-height:1.7em;font-size:.76em;font-weight:800;color:#fff">${score}%</div>`
    : `<div style="position:absolute;top:0;left:${width}%;padding-left:.6em;height:100%;line-height:1.7em;font-size:.76em;font-weight:800;color:${INK}">${score}%</div>`
  return `<div style="position:relative;${grow ? 'flex:1;' : ''}height:1.3em;background:#E6E9EC;border-radius:1em;overflow:hidden">
    ${width ? `<div style="position:absolute;left:0;top:0;bottom:0;width:${width}%;overflow:hidden;border-radius:1em"><div style="width:${10000 / width}%;height:100%;background:${GRADIENT}"></div></div>` : ''}${label}
  </div>`
}

function likelihoodChart(items: AreaResult[], label = 'Probability of dysfunction') {
  const row = (item: AreaResult) => `<div style="display:flex;align-items:center;margin-bottom:.75em">
    <div style="width:16.5em;flex:none;text-align:right;padding-right:1.3em;font-size:.98em;line-height:1.3;color:${INK}">${esc(item.area.name)}</div>${likelihoodBar(item.score)}</div>`
  const tick = (left: number, text: string) => `<div style="position:absolute;left:${left}%;top:0;font-size:.82em;line-height:1.35;color:${BODY}">${text}<div style="width:1px;height:.7em;background:${FAINT};margin-top:.15em"></div></div>`
  const high = items.filter(needsDetail)
  const low = items.filter(item => !needsDetail(item))
  return `<div style="margin-top:2.2em">
    <div style="display:flex"><div style="width:16.5em;flex:none"></div><div style="flex:1">
      <div style="text-align:center;font-weight:800;font-size:1.05em;letter-spacing:.06em;text-transform:uppercase;padding-bottom:.55em;border-bottom:1px solid ${FAINT}">${esc(label)}</div>
      <div style="position:relative;height:3.6em;margin-top:.6em">${tick(50, 'Possible<br/>50–70%')}${tick(70, 'Likely<br/>70–90%')}${tick(88, 'Highly<br/>likely 90%+')}</div>
    </div></div>
    ${high.map(row).join('')}
    ${low.length ? `<div style="display:flex;margin:${high.length ? '1em' : '0'} 0 .6em"><div style="width:16.5em;flex:none"></div><div style="font-size:.82em;line-height:1.35;color:${BODY}">Less likely<br/>under 50%<div style="width:1px;height:.7em;background:${FAINT};margin-top:.15em"></div></div></div>${low.map(row).join('')}` : ''}
  </div>`
}

function bandCounts(analysis: Analysis) {
  const items: Array<[Band | 'total', string, number]> = [
    ['alarm_low', 'Alarm Low', analysis.bands.alarm_low], ['below_standard', 'Below Standard', analysis.bands.below_standard],
    ['below_optimal', 'Below Optimal', analysis.bands.below_optimal], ['optimal', 'Optimal', analysis.bands.optimal],
    ['above_optimal', 'Above Optimal', analysis.bands.above_optimal], ['above_standard', 'Above Standard', analysis.bands.above_standard],
    ['alarm_high', 'Alarm High', analysis.bands.alarm_high], ['total', 'Total', analysis.summary.total - analysis.bands.unknown],
  ]
  return `<div style="display:grid;grid-template-columns:repeat(8,1fr);margin-top:1.8em">${items.map(([band, label, count]) => `<div style="text-align:center">
      <div style="display:flex;justify-content:center">${disc(band === 'total' ? '#fff' : BAND_COLOR[band], [[String(count), 30, 700]], 3.9, band === 'total')}</div>
      <div style="border-left:1px solid ${FAINT};margin-top:.9em;padding:0 .3em;font-size:.82em;font-weight:800;line-height:1.35">${esc(label)}</div>
    </div>`).join('')}</div>`
}

// ---------------------------------------------------------------------------
// Assessment details

function markerList(items: Array<{ entry: AssessedEntry; direction?: 'low' | 'high' }>) {
  return items.map(({ entry, direction }) => `${esc(entry.name)}${direction ? `&nbsp;${arrow(direction)}` : ''}`).join(', ')
}

function evidence(item: AreaResult) {
  const block = (label: string, text: string) => text ? `<div style="margin-bottom:.9em"><div style="font-weight:800;color:${MINT_DARK};margin-bottom:.15em">${label}</div><div style="color:${MINT_DARK}">${text}</div></div>` : ''
  return `<div style="font-size:.88em;line-height:1.5">
    ${block('Rationale', markerList(item.contributors) || 'No markers outside optimal.')}
    ${block('Biomarkers considered', markerList(item.considered.map(entry => ({ entry }))))}
    ${item.missing.length ? block('Not in these results — consider testing', esc(item.missing.join(', '))) : ''}
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
// Blood test results

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
  const labels = ['Below standard', 'Below optimal', 'Optimal', 'Above optimal', 'Above standard']
  return `<div>
    <div style="position:relative;height:1.7em;margin-top:.5em">
      <div style="position:absolute;left:0;right:0;top:.38em;height:.95em;border-radius:1em;background:linear-gradient(90deg,#EF6F5E 0%,#F5C04A 25%,#3CC48A 42%,#3CC48A 58%,#F5C04A 75%,#EF6F5E 100%)"></div>
      ${[20, 40, 60, 80].map(left => `<div style="position:absolute;left:${left}%;top:.38em;height:.95em;width:2px;margin-left:-1px;background:#fff"></div>`).join('')}
      <div style="position:absolute;left:${position}%;top:-.2em;width:2.1em;height:2.1em;margin-left:-1.05em;border-radius:50%;background:#fff;border:.3em solid ${BAND_COLOR[band]};box-sizing:border-box"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);margin-top:.35em">${labels.map((label, index) => {
      const on = index === active
      const empty = cuts[index + 1] === cuts[index]
      return `<div style="text-align:center;border-left:${index ? 0 : 1}px solid ${FAINT};line-height:1.35">
        <div style="font-size:.72em;font-weight:800;color:${on ? INK : FAINT}">${label}</div>
        <div style="font-size:.82em;color:${on ? INK : FAINT}">${empty ? '—' : `${fmt(cuts[index])} – ${fmt(cuts[index + 1])}`}</div></div>`
    }).join('')}</div>
  </div>`
}

function resultRow(entry: AssessedEntry) {
  return `<div style="display:grid;grid-template-columns:14.5em 1fr;gap:1.6em;margin-bottom:1.55em">
    <div><div style="font-size:1em;line-height:1.35">${esc(entry.name)}${entry.calculated ? ` <span style="font-size:.78em;color:${MUTED}">(calculated)</span>` : ''}</div>
      <div style="line-height:1.3"><span style="font-size:1.85em;font-weight:300;color:${INK}">${esc(entry.value)}</span> <span style="font-size:.92em;color:${MUTED}">${esc(entry.unit)}</span></div></div>
    ${rangeBar(entry)}
  </div>`
}

// ---------------------------------------------------------------------------
// Out of optimal range

function outOfRangeCard(entry: AssessedEntry) {
  const direction = directionOf(entry) || 'high'
  const band = bandOf(entry)
  const alarm = band === 'alarm_low' || band === 'alarm_high'
  const text = markerExplanation(entry.markerId, direction) || `${entry.name} is ${direction === 'low' ? 'below' : 'above'} the optimal range of ${entry.fmRange || entry.labRange} ${entry.unit}.`
  const font = entry.value.length > 6 ? 20 : entry.value.length > 4 ? 23 : 26
  return `<div style="display:flex;gap:1.1em;align-items:flex-start">
    ${disc(BAND_COLOR[band], [[entry.value, font], [entry.unit.slice(0, 14), 12]], 7.6)}
    <div style="flex:1"><div style="font-size:1.02em;font-weight:800;text-transform:uppercase;line-height:1.35">${esc(entry.name)}${alarm ? ` <span style="color:${BAND_COLOR[band]}">▲</span>` : ''}</div>
      <div style="font-size:.78em;font-weight:800;color:${BAND_COLOR[band]};letter-spacing:.04em;text-transform:uppercase;margin-top:.15em">${esc(BAND_LABEL[band])} · optimal ${esc(entry.fmRange || '—')}</div>
      <div style="font-size:.9em;line-height:1.55;color:${BODY};margin-top:.4em">${esc(text)}</div>
      ${entry.note && !entry.calculated ? `<div style="font-size:.86em;line-height:1.5;color:${MINT_DARK};margin-top:.35em;font-style:italic">${esc(entry.note)}</div>` : ''}
    </div></div>`
}

// ---------------------------------------------------------------------------
// Health improvement plan

function bullets(items: string[], color: string) {
  return items.map(point => `<div style="display:flex;align-items:baseline;gap:.6em;margin-bottom:.5em"><span style="flex:none;color:${color};font-size:.8em">●</span><span>${esc(point)}</span></div>`).join('')
}

/** The results behind an improvement area, each against its optimal target. */
function targets(item: AreaResult) {
  const cell = `padding:.5em .7em;border-bottom:1px solid ${LINE}`
  return `<div style="margin-top:1.5em">
    <div style="font-size:1.05em;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin-bottom:.6em">Your numbers and targets</div>
    <table style="width:100%;border-collapse:collapse;font-size:.92em;line-height:1.4">
      <thead><tr style="background:${SOFT};color:${MINT_DARK};font-weight:800;text-align:left"><th style="${cell}">Biomarker</th><th style="${cell}">Your result</th><th style="${cell}">Optimal target</th><th style="${cell}">Where it sits</th></tr></thead>
      <tbody>${item.contributors.map(({ entry, direction }) => {
        const band = bandOf(entry)
        return `<tr><td style="${cell};font-weight:700">${esc(entry.name)}</td>
          <td style="${cell};font-weight:800;color:${BAND_COLOR[band]}">${esc(entry.value)} ${esc(entry.unit)} ${arrow(direction)}</td>
          <td style="${cell};color:${BODY}">${esc(entry.fmRange || '—')} ${esc(entry.unit)}</td>
          <td style="${cell};color:${BAND_COLOR[band]};font-weight:700">${esc(band === 'optimal' ? 'Borderline' : BAND_LABEL[band])}</td></tr>`
      }).join('')}</tbody>
    </table>
    ${item.missing.length ? `<div style="font-size:.88em;line-height:1.5;margin-top:.7em;color:${BODY}"><span style="font-weight:800;color:${MINT_DARK}">Not in these results — consider testing:</span> ${esc(item.missing.join(', '))}</div>` : ''}
  </div>`
}

function improvementPage(item: AreaResult, narrative: FmNarrative) {
  const plan = planFor(item.area, narrative)
  const priority = priorityOf(item)
  return `${dash('1.4em 0 .9em')}
    <div style="display:grid;grid-template-columns:1fr 11.5em;gap:2em;align-items:start">
      <div>
        <div style="font-size:.8em;font-weight:800;letter-spacing:.14em;color:${PRIORITY_COLOR[priority]};text-transform:uppercase">${priority === 'urgent' ? 'Needs prompt medical review' : `${priority} priority`}</div>
        <div style="font-size:2.1em;font-weight:800;line-height:1.25;letter-spacing:-.01em;margin-top:.2em">${esc(item.area.name)}</div>
        <div style="font-size:1.04em;line-height:1.65;color:${BODY};margin-top:.7em">${esc(item.area.finding || item.area.about)}</div>
      </div>
      ${gaugeColumn(item.score)}
    </div>
    ${targets(item)}
    <div style="font-size:1.05em;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin:1.7em 0 .9em">Your plan</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2em">${PLAN_PARTS.filter(part => plan[part.key].length).map(part => `<div style="border:1px solid ${LINE};border-top:.35em solid ${part.color};border-radius:.4em;padding:.9em 1.1em">
      <div style="font-weight:800;color:${part.color};margin-bottom:.6em;font-size:1em">${part.title}</div>
      <div style="font-size:.9em;line-height:1.5;color:${BODY}">${bullets(plan[part.key], part.color)}</div></div>`).join('')}</div>
    <div style="font-size:.8em;color:${MUTED};margin-top:1.1em;line-height:1.5">Supplement doses are typical adult doses for discussion with your clinician. Do not start, stop or change any medicine or supplement without their advice, particularly if you are pregnant, breastfeeding or taking prescribed medicines.</div>`
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
  return `<div style="border-left:.35em solid ${color};background:#FAFBFB;padding:.7em 1em;margin-bottom:.7em;border-radius:.3em">
    <div style="font-weight:800;color:${color};line-height:1.4">${esc(item.title)}</div>
    ${item.detail ? `<div style="font-size:.9em;line-height:1.55;color:${BODY};margin-top:.25em">${esc(item.detail)}</div>` : ''}</div>`
}

// ---------------------------------------------------------------------------
// Pages

const BCA_COLUMNS: Array<[string, string]> = [
  ['Why blood testing?', 'Blood carries a record of how every system in the body is working, and a chemistry screen with a full blood count is the most commonly ordered medical test in the world. Yet many people feel unwell long before a standard blood test becomes abnormal, and are told that "everything looks normal".'],
  ['"Normal" is not optimal', 'Standard laboratory ranges describe the average of the population tested, which includes many people who are not well. A result inside that range is not necessarily a result associated with good health. Functional ranges are narrower, and are set around the values linked to optimal physiology.'],
  ['The functional approach', 'Comparing each result with both ranges shows the area inside "normal" where something is starting to drift. That gives you and your clinician the chance to act on early change in physiology, before it becomes disease.'],
  ['Patterns, not single numbers', 'Rather than reading each biomarker on its own, this analysis looks at how related markers move together to judge each body system, your nutrient status and the areas most in need of support.'],
  ['This report', 'Your results have been analysed against functional ranges, scored system by system, and turned into a health improvement plan for you to go through with your clinician, in the context of your history and symptoms.'],
  ['In summary', 'Blood testing is no longer only a tool for diagnosing disease. Read functionally, it uncovers hidden trends and guides prevention, so you can take practical steps towards better health.'],
]

function coverBody(data: FmReportData) {
  const { patient } = data
  const who = [patient.age ? `${patient.age}-year-old` : '', patient.sex].filter(Boolean).join(' ')
  const row = (label: string, value: string) => value ? `<div style="display:grid;grid-template-columns:7.5em 1fr;gap:1em;border-top:1px solid ${INK};padding:1em 0;font-size:1.02em;line-height:1.55"><div style="font-weight:800">${label}</div><div style="color:${BODY}">${value}</div></div>` : ''
  return `<div style="padding-top:5em">
      <img src="/FXMed_Logo_Black.png" style="height:4.6em;display:block" />
      <div style="margin-top:9em">${dash('0 0 1.4em')}</div>
      <div style="font-size:2.7em;font-weight:800;color:${MINT};line-height:1.2">Blood Chemistry Analysis</div>
      <div style="font-size:3.9em;font-weight:800;line-height:1.15;letter-spacing:-.02em;margin-top:.1em">Functional Health Report</div>
      <div style="margin-top:4em">${disc(MINT, [['›', 64, 700]], 4.4)}</div>
      <div style="margin-top:2.8em">${dash('0 0 1em')}</div>
      <div style="font-size:1.9em;font-weight:800;color:${MINT};margin-bottom:1.1em">Patient Report</div>
      <div style="width:36em">
        ${row('Prepared for', `${esc(patient.name || '—')}${who ? `<br/>${esc(who)}` : ''}`)}
        ${row('Requested by', [patient.clinician, patient.facility || 'WITS FxMed Nigeria'].filter(Boolean).map(esc).join('<br/>'))}
        ${row('Test date', esc(readableDate(patient.collectedAt) || '—'))}
        ${row('Lab reference', esc(patient.labRef))}
        <div style="border-top:1px solid ${INK}"></div>
      </div>
    </div>`
}

function contentsList(section: SectionId, toc: TocIndex) {
  return Array.from(toc.entries()).filter(([key]) => key.startsWith(`${section}:`)).map(([key, number]) =>
    `<div style="display:flex;gap:1.6em;color:${MINT};font-size:1.02em;line-height:1.75"><span style="width:1.4em">${number}</span><span>${esc(key.slice(section.length + 1))}</span></div>`).join('')
}

function tocBody(toc: TocIndex) {
  return `${title("What's Inside?")}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3.2em 2em;margin-top:3em">${SECTIONS.map(section => `<div>
      <div style="font-size:1.05em;color:${MUTED};line-height:1.55;min-height:4.8em">${esc(section.blurb)}</div>
      <div style="border-top:1px solid ${INK};margin-top:1.2em;padding-top:1.1em;font-size:1.2em;font-weight:800;letter-spacing:.02em;text-transform:uppercase;line-height:1.35">Section ${section.number}: ${esc(section.title)}</div>
      <div style="margin-top:.8em">${contentsList(section.id, toc)}</div></div>`).join('')}</div>`
}

function dividerBody(section: (typeof SECTIONS)[number], toc: TocIndex) {
  return `<div style="position:absolute;left:2.6em;bottom:8.5em"><div style="font-size:40em;font-weight:900;line-height:.8;color:${MINT};letter-spacing:-.05em">${section.number}</div></div>
    <div style="position:absolute;left:36.5em;right:2.6em;bottom:11em">
      <div style="font-size:1.08em;line-height:1.55;color:${BODY}">${esc(section.blurb)}</div>
      ${dash('2.2em 0 .9em')}
      <div style="font-size:3em;font-weight:800;color:${MINT};line-height:1.15">${esc(section.title)}</div>
      <div style="margin-top:.9em">${contentsList(section.id, toc)}</div>
    </div>`
}

function glanceBody(analysis: Analysis, narrative: FmNarrative) {
  const findings = (narrative.findings.length ? narrative.findings : defaultFindings(analysis)).slice(0, 4)
  const top = analysis.plan.slice(0, 6)
  return `${title('Your Results at a Glance')}
    ${lead(narrative.summary || defaultSummary(analysis))}
    ${bandCounts(analysis)}
    <div style="display:grid;grid-template-columns:1fr 1.15fr;gap:2.2em;margin-top:2.6em">
      <div>${heading('Areas needing attention')}
        ${top.length ? top.map(item => `<div style="margin-bottom:.95em"><div style="display:flex;justify-content:space-between;font-size:.95em;line-height:1.4;margin-bottom:.35em"><span>${esc(item.area.name)}</span><span style="font-weight:800">${item.score}%</span></div>${likelihoodBar(item.score, false, false)}</div>`).join('') : `<div style="color:${MUTED}">No area shows a strong pattern of dysfunction.</div>`}</div>
      <div>${heading('Key findings')}
        ${findings.length ? findings.map(findingCard).join('') : `<div style="color:${MUTED}">No significant findings.</div>`}</div>
    </div>`
}

function nextStepsBody(analysis: Analysis, narrative: FmNarrative, patient: FmPatient) {
  const steps = narrative.nextSteps.length ? narrative.nextSteps : defaultNextSteps(analysis)
  return `${title('Next Steps')}
    ${lead('Lasting change comes from a few well-chosen steps, repeated. Start with the foundations, retest to see what has improved, and adjust the plan with your clinician.')}
    <div style="margin-top:2em">${steps.map((step, index) => `<div style="display:flex;gap:1.2em;padding:1.2em 0;border-top:1px solid ${LINE}">
      ${disc(MINT, [[String(index + 1), 44, 700]], 2.8)}
      <div style="flex:1"><div style="font-weight:800;font-size:1.2em;line-height:1.35">${esc(step.title)}</div>
        ${step.text ? `<div style="font-size:.98em;line-height:1.6;color:${BODY};margin:.35em 0 .6em">${esc(step.text)}</div>` : ''}
        <div style="font-size:.95em;line-height:1.5;color:${BODY}">${bullets(step.items, MINT)}</div></div></div>`).join('')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2em;margin-top:2.4em;font-size:.95em">
      <div><div style="border-bottom:1px solid ${INK};height:2.2em;font-size:1.1em;line-height:2.2em">${esc(patient.clinician)}</div><div style="color:${MUTED};margin-top:.4em">Reviewing clinician</div></div>
      <div><div style="border-bottom:1px solid ${INK};height:2.2em"></div><div style="color:${MUTED};margin-top:.4em">Date of review</div></div>
    </div>`
}

function disclaimerBody() {
  const paragraphs = [
    'This report contains confidential information for the exclusive use of the person named on it. If you are not that person, or have not been given their permission, you may not read, use, copy or share it.',
    'The information in this report, including the optimal ranges, is provided for education and to support a consultation with a qualified clinician. It is not a diagnosis, and is not a substitute for professional medical care. It should not be relied on to diagnose or treat any condition.',
    'Optimal ranges are general reference recommendations, not targets for any individual. They differ from standard laboratory ranges and are not accepted by all medical specialties. The likelihood scores are an algorithmic summary of the results provided, not probabilities of disease.',
    'This report is not complete or exhaustive. It is based only on the laboratory results supplied, which may not include every relevant measure, and it does not cover every condition, ailment or treatment.',
    'The absence of a warning about a supplement, food, medicine or combination does not mean it is safe or suitable for you. Supplements mentioned have not been evaluated by NAFDAC or any other regulator for the treatment, cure or prevention of any disease.',
    'Never disregard professional medical advice, delay seeking it, or stop a current treatment because of something in this report. Consult your doctor before beginning any new diet, exercise programme, supplement or medicine. In an emergency, go to the nearest hospital emergency department.',
    'Calculated markers are worked out from your other results. HOMA-IR uses fasting glucose (mmol/L) × fasting insulin (µIU/mL) ÷ 22.5.',
  ]
  return `${title('Disclaimer')}<div style="margin-top:1.4em">${paragraphs.map(text => `<p style="font-size:1em;line-height:1.65;color:${BODY};margin:0 0 1em">${esc(text)}</p>`).join('')}</div>
    <div style="margin-top:2em;font-size:.95em;color:${MUTED}">Prepared by WITS FxMed Nigeria Ltd, Lagos, Nigeria.</div>`
}

const GROUP_TABS: Record<Exclude<AreaGroup, 'plan'>, string> = { system: 'Body Systems', accessory: 'Accessory Systems', nutrient: 'Nutrient Status', deficiency: 'Nutrient Needs' }
const SEVERITY: Record<Band, number> = { alarm_high: 0, alarm_low: 0, above_standard: 1, below_standard: 1, above_optimal: 2, below_optimal: 2, optimal: 9, unknown: 9 }

/** Every page of the report, as HTML, in order. */
export function buildFmReportPages(data: FmReportData) {
  svgId = 0
  const analysis = analyse(data.entries, data.patient.sex)
  const { narrative } = data
  const pages: Page[] = []
  const add = (section: SectionId, tab: string, body: Page['body'], kind: Page['kind'] = 'content') => pages.push({ kind, section, tab, body })
  const divider = (id: SectionId) => add(id, '', toc => dividerBody(SECTIONS.find(item => item.id === id)!, toc), 'divider')

  // 1. Introduction
  add('intro', '', () => coverBody(data), 'cover')
  add('intro', "What's Inside?", toc => tocBody(toc))
  divider('intro')
  add('intro', 'Functional Analysis', () => `${title('Functional Blood Chemistry Analysis')}
    ${lead('Functional blood chemistry analysis organises and interprets your blood results to show the state of your main body systems, your nutrient status, and the trends towards or away from health, so that early change can be acted on.')}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.8em;margin-top:2em">${BCA_COLUMNS.map(([name, text]) => `<div style="border-top:3px solid ${MINT};padding-top:1em"><div style="font-weight:800;font-size:1.1em;text-transform:uppercase;letter-spacing:.02em;margin-bottom:.6em;line-height:1.35">${esc(name)}</div><div style="font-size:.98em;line-height:1.65;color:${BODY}">${esc(text)}</div></div>`).join('')}</div>`)
  add('intro', 'At a Glance', () => glanceBody(analysis, narrative))

  // 2. Assessment
  divider('assessment')
  for (const group of ['system', 'accessory', 'nutrient', 'deficiency'] as const) {
    const items = analysis.group(group)
    if (!items.length) continue
    const tab = GROUP_TABS[group]
    const info = AREA_GROUPS[group]
    add('assessment', tab, () => `${title(info.title)}${lead(info.intro)}${lead('Each area with a likelihood of 50% or more is explained on the pages that follow, with the biomarkers behind it.')}${likelihoodChart(items)}`)
    chunk(items.filter(needsDetail), group === 'deficiency' ? 4 : 3).forEach((part, page) => add('assessment', tab, () =>
      `${page ? '<div style="height:1.6em"></div>' : `${subtitle(`${info.title} Details`)}${lead('The likelihood, an explanation of each area, and the biomarkers considered with the reasons behind the result.')}<div style="height:2em"></div>`}${part.map(areaDetail).join('')}`))
  }

  // 3. Analysis
  divider('analysis')
  const rows = FM_PANELS.flatMap(panel => analysis.summary.assessed.filter(entry => entry.panel === panel.id).map((entry, index) => ({ panel: panel.name, entry, first: index === 0 })))
  const resultPages = rows.length ? [rows.slice(0, 5), ...chunk(rows.slice(5), 10)] : []
  resultPages.forEach((part, page) => add('analysis', 'Blood Test Results', () => (page ? '<div style="height:1.4em"></div>'
    : `${title('Blood Test Results')}${lead('Each biomarker is shown against five bands: the standard laboratory range at either end, the functional optimal range in the middle, and the bands between. Biomarkers outside the optimal range are explained in the Out of Optimal Range section.')}${bandCounts(analysis)}<div style="height:2.2em"></div>`)
    + part.map((row, position) => `${row.first || position === 0 ? `<div style="font-size:1.15em;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin:${position ? '1.2em' : '0'} 0 1em">${esc(row.panel)}${row.first ? '' : ' (continued)'}</div>` : ''}${resultRow(row.entry)}`).join('')))

  const out = analysis.summary.assessed.filter(entry => directionOf(entry)).sort((a, b) => SEVERITY[bandOf(a)] - SEVERITY[bandOf(b)])
  if (out.length) {
    add('analysis', 'Out of Optimal Range', () => `${title('Out of Optimal Range')}${lead('These biomarkers are outside the optimal range. For each one you will find what it measures and the most common reasons it runs high or low. Your clinician will interpret them together with your history and symptoms.')}${bandCounts(analysis)}`)
    for (const [name, list] of [['Above Optimal', out.filter(entry => directionOf(entry) === 'high')], ['Below Optimal', out.filter(entry => directionOf(entry) === 'low')]] as const) {
      chunk(list, 8).forEach((part, page) => add('analysis', 'Out of Optimal Range', () =>
        `<div style="font-size:2.1em;color:${MINT};line-height:1.3;margin:1.3em 0 1em">${name}${page ? ' (continued)' : ''}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:2em 2.2em">${part.map(outOfRangeCard).join('')}</div>`))
    }
  }

  // 4. Health improvement plan
  divider('plan')
  add('plan', 'Health Improvement', () => `${title('Health Improvement')}${lead(AREA_GROUPS.plan.intro)}${lead(analysis.plan.length ? 'Each area below is explained on its own page, with the results behind it and a practical plan covering nutrition, lifestyle, supplements to discuss with your clinician and follow-up tests.' : 'None of the improvement areas reached the 50% threshold. Keep up the foundations on the Next Steps page and retest as advised.')}${analysis.plan.length ? likelihoodChart(analysis.plan, 'Needs attention') : ''}`)
  analysis.plan.forEach(item => add('plan', 'Health Improvement', () => improvementPage(item, narrative)))
  const recommendations = narrative.recommendations.length ? narrative.recommendations : defaultRecommendations(analysis)
  chunk(recommendations, 6).forEach((part, page) => add('plan', 'Priority Actions', () =>
    `${page ? '<div style="height:1.6em"></div>' : `${title('Your Priority Actions')}${lead('The most important actions from your plan, in order of priority. Urgent items need medical attention before anything else.')}<div style="height:1.8em"></div>`}<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2em">${part.map(recommendationCard).join('')}</div>`))
  add('plan', 'Next Steps', () => nextStepsBody(analysis, narrative, data.patient))

  // 5. Appendix
  divider('appendix')
  add('appendix', 'Disclaimer', () => disclaimerBody())

  // Contents and header tabs: the first page of each section's tab. The cover is page 0.
  const toc: TocIndex = new Map()
  pages.forEach((item, number) => { if (item.kind === 'content' && !toc.has(`${item.section}:${item.tab}`)) toc.set(`${item.section}:${item.tab}`, number) })
  return pages.map((item, number) => {
    if (item.kind === 'cover') return shell(item.body(toc), '', data.patient, null)
    const tabs = item.kind === 'divider' ? [] : Array.from(toc.keys()).filter(key => key.startsWith(`${item.section}:`)).map(key => key.slice(item.section.length + 1))
    return shell(item.body(toc), header(item.section, item.tab, tabs), data.patient, number)
  })
}

/** Shrinks a page's type until its content clears the footer. */
export function fitPage(root: HTMLElement) {
  const body = root.querySelector<HTMLElement>('[data-fm-body]')
  if (!body) return
  const limit = PAGE_H - 62
  let size = BASE_FONT
  root.style.fontSize = `${size}px`
  while (size > MIN_FONT && body.offsetTop + body.scrollHeight > limit) {
    size -= 0.25
    root.style.fontSize = `${size}px`
  }
}

// The PDF is issued to the EMR through a request capped at 4.5 MB, so the
// pages share a size budget: each is encoded at the best quality that keeps
// the running total on budget — first by easing the JPEG quality, then, for a
// dense page, the resolution — so sparse pages stay crisp.
const RENDER_SCALE = 1.6
const PDF_BUDGET = 3.3 * 1024 * 1024
const ENCODINGS: Array<[scale: number, quality: number]> = [[1, 0.8], [1, 0.68], [1, 0.56], [0.8, 0.6], [0.8, 0.48], [0.65, 0.5]]

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
