// The Functional Health Analysis report: US Letter portrait PDF.
//
// Each page is laid out as fixed-size HTML (816 × 1056 CSS px = 8.5 × 11 in),
// rasterised with html2canvas and placed on its own PDF sheet. Sizes are in em
// against the page's base font size, so a page whose content runs long is
// shrunk a step at a time until it fits rather than spilling or being cut.
// The same HTML drives the on-screen preview.

import {
  FM_STATUS_LABEL, LAB_STATUS_LABEL, PRIORITY_COLOR, STATUS_COLOR, summarize,
  type AssessedEntry, type FmEntry, type FmNarrative, type FmPatient, type FmStatus, type PanelSummary, type Priority,
} from './fmBiomarkers'

export const PAGE_W = 816
export const PAGE_H = 1056
const BASE_FONT = 11
const MIN_FONT = 8
const INK = '#14261E'
const BRAND = '#1A6B53'
const MUTED = '#6B7C74'
const LINE = '#DCE7E1'
const SOFT = '#F2F7F4'
const FONT = "'DM Sans', 'Lato', Arial, Helvetica, sans-serif"

export type FmReportData = {
  patient: FmPatient
  entries: FmEntry[]
  narrative: FmNarrative
  generatedAt?: Date
}

const esc = (value: string) => (value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const fmtDate = (date: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)

function readableDate(value: string) {
  if (!value) return '—'
  // A bare date is a calendar day, not UTC midnight, so read it as local time.
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? fmtDate(parsed) : value
}

const sexLabel = (sex: string) => sex ? sex[0].toUpperCase() + sex.slice(1) : ''
const ageSex = (patient: FmPatient) => [patient.age ? `${patient.age} years` : '', sexLabel(patient.sex)].filter(Boolean).join(' / ') || '—'

function scoreColor(score: number | null) {
  if (score === null) return MUTED
  if (score >= 70) return '#0E9F6E'
  if (score >= 50) return '#C8730F'
  return '#C53030'
}

// ---------------------------------------------------------------------------
// Shared pieces

/** A numbered circle. SVG, because html2canvas mis-centres text in small boxes. */
function numberBadge(n: number, color: string, size = 1.55) {
  return `<svg width="${size}em" height="${size}em" viewBox="0 0 20 20" style="flex:none;display:block"><circle cx="10" cy="10" r="10" fill="${color}"/><text x="10" y="10" dy="0.35em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#fff">${n}</text></svg>`
}

type Chrome = { patient: FmPatient; section: string; color: string; page: number; pages: number }

function header({ patient, section, color, page, pages }: Chrome) {
  return `<div style="background:${color};color:#fff;padding:1.3em 2.6em 1.1em;display:flex;justify-content:space-between;align-items:flex-end">
    <div><div style="font-size:1.05em;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${esc(patient.name || 'Patient')}</div>
    <div style="font-size:.85em;opacity:.85;margin-top:.3em">${esc(ageSex(patient))} &nbsp;|&nbsp; Collected: ${esc(readableDate(patient.collectedAt))} &nbsp;|&nbsp; ${esc(patient.facility || 'WITS FxMed Nigeria')}</div></div>
    <div style="text-align:right"><div style="font-size:.85em;font-weight:800;letter-spacing:.06em;text-transform:uppercase">${esc(section)}</div><div style="font-size:.78em;opacity:.75;margin-top:.3em">Page ${page} / ${pages}</div></div>
  </div><div style="height:.35em;background:${color};opacity:.45"></div>`
}

function footer(patient: FmPatient) {
  return `<div style="position:absolute;left:0;right:0;bottom:0;background:${SOFT};border-top:1px solid ${LINE};padding:.8em 2.6em;display:flex;justify-content:space-between;font-size:.72em;color:${MUTED}">
    <span style="font-style:italic">MEDICAL DISCLAIMER: For informational purposes only. Not a substitute for professional medical advice. All findings should be interpreted by a licensed healthcare provider.</span>
    <span style="white-space:nowrap;margin-left:1.5em">${patient.labRef ? `Lab Ref: ${esc(patient.labRef)}` : 'WITS FxMed Nigeria'}</span>
  </div>`
}

function page(body: string, chrome: Chrome | null, patient: FmPatient) {
  return `<div data-fm-page style="position:relative;width:${PAGE_W}px;height:${PAGE_H}px;overflow:hidden;background:#fff;color:${INK};font-family:${FONT};font-size:${BASE_FONT}px;line-height:1.4;box-sizing:border-box">
    ${chrome ? header(chrome) : ''}
    <div data-fm-body style="padding:${chrome ? '1.6em' : '0'} 2.6em 4.5em">${body}</div>
    ${footer(patient)}
  </div>`
}

function title(text: string, subtitle: string) {
  return `<div style="margin-bottom:1.2em"><div style="font-size:2em;font-weight:800;letter-spacing:-.02em;line-height:1.3;color:${INK}">${esc(text)}</div><div style="font-size:1em;font-style:italic;color:${MUTED};margin-top:.2em">${esc(subtitle)}</div></div>`
}

function sectionLabel(text: string, color = BRAND) {
  return `<div style="font-size:.85em;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:${color};margin:0 0 .7em">${esc(text)}</div>`
}

function statTiles(stats: Array<[string, number, string]>) {
  return `<div style="display:grid;grid-template-columns:repeat(${stats.length},1fr);gap:.8em;margin-bottom:1.5em">${stats.map(([label, value, color]) =>
    `<div style="border:1px solid ${LINE};border-top:.45em solid ${color};border-radius:.3em;padding:.7em .4em;text-align:center"><div style="font-size:2.3em;font-weight:800;color:${color};line-height:1.35">${value}</div><div style="font-size:.8em;color:${MUTED};margin-top:.35em;line-height:1.4">${esc(label)}</div></div>`).join('')}</div>`
}

function bar(score: number | null, color: string) {
  return `<div style="height:.75em;background:#E3ECE7;border-radius:1em;overflow:hidden"><div style="height:100%;width:${score ?? 0}%;background:${color};border-radius:1em"></div></div>`
}

function findingCard(item: FmNarrative['findings'][number]) {
  const color = PRIORITY_COLOR[item.priority]
  const bg = item.priority === 'moderate' ? '#FFF8EB' : item.priority === 'low' ? '#EEF7F2' : '#FDEFF1'
  const mark = item.priority === 'urgent' ? '!! ' : item.priority === 'high' ? '! ' : '~ '
  return `<div style="border:1px solid ${color}55;border-left:.45em solid ${color};background:${bg};border-radius:.25em;padding:.75em 1em;margin-bottom:.6em">
    <div style="font-weight:800;color:${color};font-size:1.02em">${mark}${esc(item.title)}</div>
    ${item.detail ? `<div style="margin-top:.35em;font-size:.92em">${esc(item.detail)}</div>` : ''}</div>`
}

const statusText = (status: FmStatus | 'unknown', labels: Record<string, string>) =>
  `<span style="font-weight:800;font-size:.82em;color:${STATUS_COLOR[status]}">${labels[status]}</span>`

/** Where the result sits against the lab range (grey) and FM optimal range (green). */
function positionBar(entry: AssessedEntry) {
  const value = entry.numeric
  const lab = entry.labRangeParsed, fm = entry.fmRangeParsed
  if (value === null || (!lab && !fm)) return ''
  const points = [value, lab?.low, lab?.high, fm?.low, fm?.high].filter((point): point is number => typeof point === 'number')
  let min = Math.min(...points), max = Math.max(...points)
  if (min === max) { min -= 1; max += 1 }
  const pad = (max - min) * 0.08
  min = Math.max(min - pad, Math.min(0, min)); max += pad
  const at = (point: number) => ((point - min) / (max - min)) * 100
  const band = (range: typeof lab, color: string) => {
    if (!range) return ''
    const start = at(range.low ?? min), end = at(range.high ?? max)
    return `<div style="position:absolute;top:0;bottom:0;left:${start}%;width:${Math.max(end - start, 1)}%;background:${color};border-radius:1em"></div>`
  }
  const dot = STATUS_COLOR[entry.fm]
  return `<div style="position:relative;height:.65em;background:#EDF2EF;border-radius:1em;margin-top:.2em">
    ${band(lab, '#D5DED9')}${band(fm, '#7CC3A5')}
    <div style="position:absolute;top:50%;left:${at(value)}%;width:1em;height:1em;margin:-.5em 0 0 -.5em;border-radius:50%;background:${dot};border:2px solid #fff;box-shadow:0 0 0 1px ${dot}55"></div>
  </div>`
}

function chips(counts: Record<FmStatus, number>) {
  const order: Array<[FmStatus, string, string]> = [['optimal', '#E9F7F0', '#0E9F6E'], ['normal', '#EEF5F1', '#1A6B53'], ['borderline', '#FFF6E5', '#C8730F'], ['high', '#FDECEC', '#C53030'], ['low', '#EAF1FD', '#1D64C8']]
  return order.filter(([status]) => counts[status]).map(([status, bg, color]) =>
    `<span style="display:inline-block;border:1px solid ${color}66;background:${bg};color:${color};border-radius:1em;padding:.3em .9em;font-size:.8em;font-weight:800;line-height:1.4;margin-right:.5em">${counts[status]}× ${FM_STATUS_LABEL[status]}</span>`).join('')
}

// ---------------------------------------------------------------------------
// Pages

type Ctx = { data: FmReportData; summary: ReturnType<typeof summarize>; generated: Date; urgentCount: number }

function coverPage(ctx: Ctx) {
  const { patient, narrative } = ctx.data
  const s = ctx.summary
  const top = narrative.findings.filter(item => item.priority === 'urgent' || item.priority === 'high').slice(0, 4)
  const fallback: FmNarrative['findings'] = s.urgent.slice(0, 4).map(entry => ({ priority: 'urgent' as Priority, title: `${entry.name} ${entry.value} ${entry.unit}`.trim(), detail: entry.note || `Outside the laboratory range (${entry.labRange}).` }))
  const findings = top.length ? top : fallback
  const field = (label: string, value: string) => `<div><div style="font-size:.72em;font-weight:800;letter-spacing:.14em;color:${MUTED};text-transform:uppercase">${label}</div><div style="font-size:1.08em;font-weight:800;margin-top:.25em">${esc(value || '—')}</div></div>`
  return `<div style="background:${BRAND};color:#fff;padding:2em 2.6em 1.7em;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:1.35em;font-weight:800">WITS FxMed Nigeria</div><div style="font-size:.85em;opacity:.8;margin-top:.3em">Functional Medicine · Laboratory Report</div></div>
      <div style="background:#fff;border-radius:.5em;padding:.5em .9em"><img src="/FXMed_Logo_Black.png" style="height:3em;display:block" /></div>
    </div>
    <div style="padding:1.8em 2.6em 4.5em">
      <div style="display:flex;justify-content:space-between;font-size:.82em;color:${MUTED};margin-bottom:1em"><span>Generated: ${esc(fmtDate(ctx.generated))}</span><span>${patient.labRef ? `Lab Ref: ${esc(patient.labRef)}` : ''}</span></div>
      <div style="font-size:3.6em;font-weight:800;line-height:1.2;letter-spacing:-.03em">Functional<br/><span style="color:${BRAND}">Health Analysis</span></div>
      <div style="color:${MUTED};margin:.9em 0 1.2em;font-size:1.05em">Comprehensive Functional Medicine Report with Clinical Implications</div>
      <div style="height:.3em;background:#D6EBE1;margin-bottom:1.2em"></div>
      <div style="border:1px solid ${LINE};background:#FAFCFB;border-radius:.3em;padding:1.1em 1.4em;display:grid;grid-template-columns:1fr 1fr 1fr;gap:1.1em 1.4em;margin-bottom:1.3em">
        ${field('Patient', patient.name)}${field('Age / Sex', ageSex(patient))}${field('Collected', readableDate(patient.collectedAt))}
        ${field('Lab Ref', patient.labRef)}${field('Facility', patient.facility || 'WITS FxMed Nigeria')}${field('Generated', fmtDate(ctx.generated))}
      </div>
      ${statTiles([['Total Tests', s.total, INK], ['Normal/Optimal', s.inRange, BRAND], ['High (FM)', s.high, '#C53030'], ['Low (FM)', s.low, '#1D64C8'], ['Urgent', ctx.urgentCount, '#B5102B']])}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.6em">
        <div>${sectionLabel('Panel Overview')}${s.panels.map(item => `<div style="margin-bottom:.65em"><div style="display:flex;justify-content:space-between;font-size:.92em;line-height:1.5;margin-bottom:.55em"><span>${esc(item.panel.short)}</span><span style="font-weight:800;color:${scoreColor(item.score)}">${item.score ?? '—'}%</span></div>${bar(item.score, item.panel.color)}</div>`).join('')}</div>
        <div>${sectionLabel('Top Urgent Findings')}${findings.length ? findings.map(findingCard).join('') : `<div style="color:${MUTED};font-style:italic">No urgent findings.</div>`}</div>
      </div>
      <div style="margin-top:1.3em;border:1px solid ${LINE};background:${SOFT};padding:.8em 1.1em;font-size:.8em;font-style:italic;color:${MUTED}">MEDICAL DISCLAIMER: For informational and educational purposes only. Not a substitute for professional medical advice. All findings must be interpreted by a licensed healthcare provider in the context of complete medical history.</div>
    </div>`
}

function overviewBody(ctx: Ctx) {
  const { narrative } = ctx.data
  const s = ctx.summary
  return `${title('Clinical Overview', `Functional medicine assessment across ${s.panels.length} panels — ${s.total} biomarkers analysed`)}
    ${statTiles([['Total Markers', s.total, INK], ['Normal/Optimal', s.inRange, BRAND], ['High (FM)', s.high, '#C53030'], ['Low (FM)', s.low, '#1D64C8'], ['Urgent Actions', ctx.urgentCount, '#B5102B']])}
    ${narrative.summary ? `<div style="background:${SOFT};border-left:.35em solid ${BRAND};padding:.9em 1.1em;margin-bottom:1.4em;font-size:1em">${esc(narrative.summary)}</div>` : ''}
    <div style="display:grid;grid-template-columns:1.35fr 1fr;gap:1.6em">
      <div>${sectionLabel('Urgent & High Priority Findings')}${narrative.findings.slice(0, 7).map(findingCard).join('') || `<div style="color:${MUTED};font-style:italic">Generate the interpretation to list findings.</div>`}</div>
      <div>${sectionLabel('Panel Health Scores')}${s.panels.map(item => `<div style="margin-bottom:.8em"><div style="display:flex;justify-content:space-between;font-weight:800;font-size:.92em;line-height:1.5;margin-bottom:.55em"><span>${esc(item.panel.name)}</span><span style="color:${scoreColor(item.score)}">${item.score ?? '—'}%</span></div>${bar(item.score, item.panel.color)}${narrative.panels[item.panel.id]?.summary ? `<div style="font-size:.8em;color:${MUTED};margin-top:.25em">${esc(narrative.panels[item.panel.id]!.summary)}</div>` : ''}</div>`).join('')}</div>
    </div>`
}

const TABLE_HEAD = `background:${BRAND};color:#fff;font-size:.75em;font-weight:800;letter-spacing:.05em;text-transform:uppercase`

function allMarkersBody(rows: AssessedEntry[], part: number, parts: number, ctx: Ctx) {
  const cell = 'padding:.45em .6em;border-bottom:1px solid #E7EEEA;vertical-align:middle'
  return `${title('All Biomarkers — Quick Reference', `${ctx.summary.total} biomarkers across ${ctx.summary.panels.length} panels — Lab reference vs Functional Medicine optimal ranges${parts > 1 ? ` · Page ${part} of ${parts}` : ''}`)}
    <table style="width:100%;border-collapse:collapse;font-size:.92em"><thead><tr style="${TABLE_HEAD}"><th style="text-align:left;padding:.65em .6em">Biomarker</th><th style="text-align:left;padding:.65em .6em">Result (unit)</th><th style="text-align:left;padding:.65em .6em">Lab Range</th><th style="text-align:left;padding:.65em .6em">FM Optimal</th><th style="text-align:left;padding:.65em .6em">Lab Status</th><th style="text-align:left;padding:.65em .6em">FM Status</th></tr></thead>
    <tbody>${rows.map((entry, index) => `<tr style="background:${index % 2 ? '#F7FAF8' : '#fff'}">
      <td style="${cell};${entry.urgent ? 'border-left:.35em solid #B5102B;color:#B5102B;font-weight:800' : ''}">${esc(entry.name)}</td>
      <td style="${cell};font-weight:800;color:${STATUS_COLOR[entry.fm]}">${esc(entry.value)} ${esc(entry.unit)}</td>
      <td style="${cell};color:${MUTED}">${esc(entry.labRange || '—')}</td>
      <td style="${cell};font-weight:700;color:${BRAND}">${esc(entry.fmRange || '—')}</td>
      <td style="${cell}">${statusText(entry.lab, LAB_STATUS_LABEL)}</td>
      <td style="${cell}">${statusText(entry.fm, FM_STATUS_LABEL)}</td></tr>`).join('')}</tbody></table>`
}

function panelTable(entries: AssessedEntry[], color: string) {
  const cell = 'padding:.55em .55em;border-bottom:1px solid #E7EEEA;vertical-align:middle'
  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed"><colgroup><col style="width:27%"/><col style="width:9%"/><col style="width:12%"/><col style="width:12%"/><col style="width:18%"/><col style="width:11%"/><col style="width:11%"/></colgroup>
    <thead><tr style="${TABLE_HEAD};background:${color}"><th style="text-align:left;padding:.65em .55em">Biomarker</th><th style="text-align:left;padding:.65em .55em">Result</th><th style="text-align:left;padding:.65em .55em">Lab Ref</th><th style="text-align:left;padding:.65em .55em">FM Optimal</th><th style="text-align:left;padding:.65em .55em">Position</th><th style="text-align:left;padding:.65em .55em">Lab</th><th style="text-align:left;padding:.65em .55em">FM</th></tr></thead>
    <tbody>${entries.map((entry, index) => `<tr style="background:${index % 2 ? '#F7FAF8' : '#fff'}">
      <td style="${cell};${entry.urgent ? 'border-left:.35em solid #B5102B' : ''}"><div style="font-weight:700;${entry.urgent ? 'color:#B5102B' : ''}">${esc(entry.name)}</div><div style="font-size:.8em;color:${MUTED}">${esc(entry.unit)}</div>${entry.note ? `<div style="font-size:.82em;color:#3E5249;margin-top:.2em">${esc(entry.note)}</div>` : ''}</td>
      <td style="${cell};font-size:1.25em;font-weight:800;color:${STATUS_COLOR[entry.fm]}">${esc(entry.value)}</td>
      <td style="${cell};color:${MUTED};font-size:.9em">${esc(entry.labRange || '—')}</td>
      <td style="${cell};color:${BRAND};font-weight:700;font-size:.9em">${esc(entry.fmRange || '—')}</td>
      <td style="${cell}">${positionBar(entry)}</td>
      <td style="${cell}">${statusText(entry.lab, LAB_STATUS_LABEL)}</td>
      <td style="${cell}">${statusText(entry.fm, FM_STATUS_LABEL)}</td></tr>`).join('')}</tbody></table>`
}

function panelHead(item: PanelSummary, continued: boolean) {
  const color = scoreColor(item.score)
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1em">
    <div><div style="font-size:1.9em;font-weight:800;text-transform:uppercase;letter-spacing:-.01em;line-height:1.3">${esc(item.panel.name)}${continued ? ' <span style="font-size:.5em;color:#6B7C74;text-transform:none">(continued)</span>' : ''}</div>
    <div style="font-style:italic;color:${MUTED};margin:.35em 0 .8em">${esc(item.panel.description)}</div>${chips(item.counts)}</div>
    <div style="border:2px solid ${color};background:${color}10;border-radius:.6em;padding:.6em 1.3em;text-align:center;min-width:7em"><div style="font-size:2.1em;font-weight:800;color:${color};line-height:1.35">${item.score ?? '—'}%</div><div style="font-size:.7em;font-weight:800;color:${color};letter-spacing:.06em;line-height:1.4;margin-top:.2em">FM OPTIMAL</div></div>
  </div>`
}

function panelNarrative(item: PanelSummary, narrative: FmNarrative) {
  const text = narrative.panels[item.panel.id]
  if (!text || (!text.understanding.length && !text.actions.length)) return ''
  const color = item.panel.color
  return `<div style="display:grid;grid-template-columns:1.2fr 1fr;gap:1.2em;margin-top:1.4em">
    <div style="border:1px solid ${LINE};background:#FAFCFB"><div style="background:#E8F2EC;padding:.7em 1em;font-size:.82em;font-weight:800;letter-spacing:.2em;color:${BRAND}">UNDERSTANDING YOUR RESULTS</div>
      <div style="padding:.8em 1em">${text.understanding.map(point => `<div style="margin-bottom:.8em"><div style="display:flex;align-items:baseline;gap:.55em;font-weight:800;margin-bottom:.25em;line-height:1.4"><span style="flex:none;color:${color};font-size:.85em">●</span><span>${esc(point.title)}</span></div><div style="font-size:.9em;color:#3E5249">${esc(point.text)}</div></div>`).join('')}</div></div>
    <div style="border:1px solid ${LINE}"><div style="background:${color};color:#fff;padding:.7em 1em;font-size:.82em;font-weight:800;letter-spacing:.2em">YOUR ACTION PLAN</div>
      <div style="padding:.8em 1em">${text.actions.map((action, index) => `<div style="display:flex;gap:.7em;margin-bottom:.6em;font-size:.9em">${numberBadge(index + 1, color)}<span style="padding-top:.1em;line-height:1.4">${esc(action)}</span></div>`).join('')}</div></div>
  </div>`
}

function recommendationCard(item: FmNarrative['recommendations'][number]) {
  const color = PRIORITY_COLOR[item.priority]
  const bg = item.priority === 'moderate' ? '#FFF8EB' : item.priority === 'low' ? '#EEF7F2' : '#FDF1F3'
  return `<div style="border:1px solid ${color}55;background:${bg};border-radius:.25em;overflow:hidden">
    <div style="background:${color};padding:.35em 1em .7em;color:#fff;font-size:.75em;font-weight:800;letter-spacing:.16em">${item.priority.toUpperCase()}</div>
    <div style="padding:.8em 1.1em"><div style="font-weight:800;color:${color};margin-bottom:.6em">${esc(item.title)}</div>
    ${item.items.map(point => `<div style="display:flex;align-items:baseline;gap:.7em;margin-bottom:.45em;font-size:.9em"><span style="flex:none;color:${color};font-size:.85em">■</span><span>${esc(point)}</span></div>`).join('')}</div></div>`
}

function closingBody(ctx: Ctx) {
  const { narrative } = ctx.data
  const s = ctx.summary
  const is = [`A comprehensive snapshot of ${s.total} biomarkers across ${s.panels.length} body systems`, 'A side-by-side comparison: standard lab vs FM optimal ranges', 'A tool to identify sub-clinical patterns before they become disease', 'An educational resource to support your consultation with a physician']
  const isNot = ['A replacement for a full clinical history and physical examination', 'A definitive diagnosis of any medical condition', 'Approved or validated by any regulatory medical authority', 'Sufficient alone to guide any treatment or medication decision']
  return `${title('Important Information & Next Steps', 'Please read carefully before acting on any findings in this report.')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2em;margin-bottom:1.5em">
      <div style="border:1px solid #F5D9A6;background:#FFFAF0"><div style="background:#C8730F;color:#fff;padding:.7em 1em;font-weight:800;font-size:.85em">MEDICAL DISCLAIMER</div><div style="padding:1em;font-size:.9em">
        <p style="margin:0 0 .8em">This report is generated for educational and informational purposes only. It does not constitute a medical diagnosis, medical advice, or a substitute for professional healthcare. Functional Medicine optimal ranges differ from standard laboratory reference ranges and are not universally accepted by all medical specialties or regulatory bodies.</p>
        <p style="margin:0">All results, interpretations, and recommendations in this report must be reviewed and validated by a licensed, qualified healthcare provider before any clinical decisions are made. Do not start, stop, or change any medication, supplement, or treatment based solely on this report.</p></div></div>
      <div style="border:1px solid ${LINE};background:${SOFT}"><div style="background:${BRAND};color:#fff;padding:.7em 1em;font-weight:800;font-size:.85em">ABOUT FUNCTIONAL MEDICINE RANGES</div><div style="padding:1em;font-size:.88em">
        <div style="font-weight:800;color:${BRAND};margin-bottom:.4em">This report IS:</div>${is.map(point => `<div style="display:flex;align-items:baseline;gap:.6em;margin-bottom:.35em"><span style="flex:none;color:#5BB38E;font-size:.85em">●</span>${esc(point)}</div>`).join('')}
        <div style="font-weight:800;color:#C53030;margin:.7em 0 .4em">This report IS NOT:</div>${isNot.map(point => `<div style="display:flex;align-items:baseline;gap:.6em;margin-bottom:.35em"><span style="flex:none;color:#C53030;font-size:.85em">■</span>${esc(point)}</div>`).join('')}
      </div></div>
    </div>
    ${narrative.nextSteps.length ? `${sectionLabel('Recommended Next Steps', INK)}<div style="display:grid;gap:.9em">${narrative.nextSteps.map((step, index) => `<div style="border:1px solid ${LINE};background:${SOFT};padding:1em 1.2em;display:flex;gap:1em">
      ${numberBadge(index + 1, BRAND, 2.2)}
      <div><div style="font-weight:800;color:${BRAND};font-size:1.05em">${esc(step.title)}</div>${step.text ? `<div style="font-size:.9em;margin:.35em 0 .5em">${esc(step.text)}</div>` : ''}${step.items.map(point => `<div style="display:flex;align-items:baseline;gap:.6em;font-size:.88em;margin-bottom:.3em"><span style="flex:none;color:#5BB38E;font-size:.85em">●</span>${esc(point)}</div>`).join('')}</div></div>`).join('')}</div>` : ''}
    <div style="text-align:center;font-size:.8em;color:${MUTED};margin-top:1.4em">REPORT PREPARED BY: WITS FxMed Nigeria Ltd — Lagos, Nigeria${ctx.data.patient.clinician ? ` &nbsp;|&nbsp; Reviewed by: ${esc(ctx.data.patient.clinician)}` : ''}${ctx.data.patient.labRef ? ` &nbsp;|&nbsp; Lab Reference: ${esc(ctx.data.patient.labRef)}` : ''} &nbsp;|&nbsp; Collection Date: ${esc(readableDate(ctx.data.patient.collectedAt))}</div>`
}

const chunk = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size))

/** Every page of the report, as HTML, in order. */
export function buildFmReportPages(data: FmReportData) {
  const summary = summarize(data.entries)
  const generated = data.generatedAt || new Date()
  const narrativeUrgent = data.narrative.findings.filter(item => item.priority === 'urgent' || item.priority === 'high').length
  const ctx: Ctx = { data, summary, generated, urgentCount: Math.max(narrativeUrgent, summary.urgent.length) }

  // Body builders first, so page numbers can be filled in once the count is known.
  const bodies: Array<{ section: string; color: string; body: string } | 'cover'> = ['cover']
  bodies.push({ section: 'Clinical Overview', color: BRAND, body: overviewBody(ctx) })
  const byPanel = summary.panels.flatMap(item => item.entries.filter(entry => entry.panel === item.panel.id))
  const tableParts = chunk(byPanel, 34)
  tableParts.forEach((rows, index) => bodies.push({ section: 'All Markers Reference Table', color: BRAND, body: allMarkersBody(rows, index + 1, tableParts.length, ctx) }))
  for (const item of summary.panels) {
    const narrative = panelNarrative(item, data.narrative)
    // A short panel shares its page with the narrative; a long one continues.
    const firstSize = narrative ? 10 : 18
    const parts = item.entries.length <= firstSize ? [item.entries] : [item.entries.slice(0, 16), ...chunk(item.entries.slice(16), 16)]
    parts.forEach((rows, index) => {
      const last = index === parts.length - 1
      const fitsNarrative = rows.length <= 10
      bodies.push({ section: item.panel.name, color: item.panel.color, body: panelHead(item, index > 0) + panelTable(rows, item.panel.color) + (last && fitsNarrative ? narrative : '') })
      if (last && !fitsNarrative && narrative) bodies.push({ section: item.panel.name, color: item.panel.color, body: panelHead(item, true) + narrative })
    })
  }
  chunk(data.narrative.recommendations, 4).forEach((group, index) => bodies.push({
    section: 'Clinical Recommendations', color: BRAND,
    body: title(`Prioritised Clinical Recommendations${index ? ' (continued)' : ''}`, 'Organised by clinical urgency. All URGENT findings require immediate medical attention.')
      + `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.1em">${group.map(recommendationCard).join('')}</div>`,
  }))
  bodies.push({ section: 'Disclaimer & Next Steps', color: BRAND, body: closingBody(ctx) })

  const pages = bodies.length
  return bodies.map((entry, index) => entry === 'cover'
    ? page(coverPage(ctx), null, data.patient).replace('data-fm-body style="padding:0 2.6em 4.5em"', 'data-fm-body style="padding:0"')
    : page(entry.body, { patient: data.patient, section: entry.section, color: entry.color, page: index + 1, pages }, data.patient))
}

/** Shrinks a page's type until its content clears the footer. */
export function fitPage(root: HTMLElement) {
  const body = root.querySelector<HTMLElement>('[data-fm-body]')
  if (!body) return
  const limit = PAGE_H - 34
  let size = BASE_FONT
  while (size > MIN_FONT && body.offsetTop + body.scrollHeight > limit) {
    size -= 0.25
    root.style.fontSize = `${size}px`
  }
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
    for (let index = 0; index < pages.length; index++) {
      host.innerHTML = pages[index]
      const root = host.firstElementChild as HTMLElement
      await Promise.all(Array.from(root.querySelectorAll('img')).map(img => img.complete ? null : new Promise(resolve => { img.onload = img.onerror = resolve })))
      fitPage(root)
      const canvas = await html2canvas(root, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: PAGE_W, height: PAGE_H })
      if (index) pdf.addPage('letter', 'portrait')
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 8.5, 11)
    }
  } finally {
    host.remove()
  }
  return pdf.output('blob')
}
