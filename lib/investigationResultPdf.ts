import { createReportContainer, renderReportPdf, waitForImages } from './reportPdf'
import {
  REPORT_ACCENT,
  REPORT_INK,
  REPORT_LEADING,
  REPORT_PAGE,
  pdfType,
} from './reportTheme'

export type InvestigationResultFlag = 'Normal' | 'High' | 'Low' | 'Abnormal' | ''

export interface InvestigationResult {
  section: string
  test: string
  result: string
  unit: string
  referenceRange: string
  flag: InvestigationResultFlag
  remark: string
}

export interface InvestigationResultPdfData {
  fullName: string
  email: string
  phone: string
  age: string
  gender: string
  reportTitle: string
  specimen: string
  collectedAt: string
  reportedAt: string
  clinician: string
  results: InvestigationResult[]
  notes: string
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const shown = (value: string) => escapeHtml(value.trim() || '—')

function patientField(label: string, value: string) {
  return `<div><div style="font-size:${pdfType('label')};font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">${label}</div><div style="font-size:${pdfType('value')};font-weight:600;overflow-wrap:anywhere;color:${REPORT_INK}">${shown(value)}</div></div>`
}

function flagStyle(flag: InvestigationResultFlag) {
  if (flag === 'High' || flag === 'Low' || flag === 'Abnormal') return 'background:#fee2e2;color:#b91c1c'
  if (flag === 'Normal') return 'background:#ecfccb;color:#3f6212'
  return 'background:#f3f4f6;color:#6b7280'
}

function buildPage(data: InvestigationResultPdfData, rows: InvestigationResult[], page: number, pages: number, pageNotes = '') {
  const header = `<div style="text-align:center;margin-bottom:28px;padding-bottom:24px;border-bottom:2px solid ${REPORT_ACCENT}">
    <div style="display:inline-block;background:rgba(107,142,35,.1);color:#6b8e23;border-radius:20px;padding:7px 16px;font-size:${pdfType('badge')};font-weight:700;text-transform:uppercase;letter-spacing:.14em">Confidential Medical Document</div>
    <div style="margin:14px 0 6px"><img src="${window.location.origin}/FXMed_Logo_Black.png" style="height:52px;width:auto;display:inline-block" /></div>
    <h1 style="font-size:${pdfType('title')};color:${REPORT_INK};margin:0 0 6px">Investigation Results</h1><div style="font-size:${pdfType('subtitle')};color:#666;font-weight:600">${shown(data.reportTitle)}</div>
  </div>`
  const info = page === 1 ? `<section style="margin-bottom:25px"><h2 style="font-size:${pdfType('section')};color:${REPORT_INK};border-bottom:2px solid #e5e7eb;padding-bottom:7px;margin:0 0 14px">Patient Information</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:15px 24px">${patientField('Full Name', data.fullName)}${patientField('Email Address', data.email)}${patientField('Phone Number', data.phone)}${patientField('Age / Gender', [data.age, data.gender].filter(Boolean).join(' / '))}${patientField('Specimen', data.specimen)}${patientField('Requesting Clinician', data.clinician)}${patientField('Collected', data.collectedAt)}${patientField('Reported', data.reportedAt)}</div></section>` : ''
  const body = rows.map((row, index) => {
    const previousSection = index > 0 ? rows[index - 1].section.trim() || 'Other Investigations' : ''
    const section = row.section.trim() || 'Other Investigations'
    const sectionHeading = section && section !== previousSection
      ? `<tr><td colspan="5" style="padding:10px 8px;background:#eef2d5;color:${REPORT_INK};font-size:${pdfType('body')};font-weight:800;text-transform:uppercase;letter-spacing:.05em;border-top:2px solid ${REPORT_ACCENT}">${shown(section)}</td></tr>`
      : ''
    return `${sectionHeading}<tr style="background:${index % 2 ? '#fafafa' : '#fff'}"><td style="padding:8px;font-weight:700;color:${REPORT_INK}">${shown(row.test)}${row.remark.trim() ? `<div style="font-size:${pdfType('micro')};color:#6b7280;font-weight:400;margin-top:4px">${shown(row.remark)}</div>` : ''}</td><td style="padding:8px;font-weight:700">${shown(row.result)}</td><td style="padding:8px">${shown(row.unit)}</td><td style="padding:8px">${shown(row.referenceRange)}</td><td style="padding:8px"><span style="display:inline-block;border-radius:14px;padding:4px 8px;font-size:${pdfType('micro')};font-weight:700;${flagStyle(row.flag)}">${shown(row.flag)}</span></td></tr>`
  }).join('')
  const notes = pageNotes.trim() ? `<div style="margin-top:22px;background:#f7f8ed;border-left:4px solid #6b8e23;border-radius:7px;padding:14px"><div style="font-size:${pdfType('label')};font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:5px">Clinical Notes</div><div style="font-size:${pdfType('body')};line-height:${REPORT_LEADING.tight};overflow-wrap:anywhere;color:#374151">${shown(pageNotes)}</div></div>` : ''
  return `${page === 1 ? header + info : `<div style="border-bottom:2px solid ${REPORT_ACCENT};padding-bottom:14px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:center"><img src="${window.location.origin}/FXMed_Logo_Black.png" style="height:34px"><b style="color:${REPORT_INK}">Investigation Results — continued</b></div>`}${rows.length ? `<table style="width:100%;table-layout:fixed;overflow-wrap:anywhere;border-collapse:collapse;font-size:${pdfType('fine')}"><thead><tr style="background:${REPORT_INK};color:#fff;text-align:left"><th style="padding:10px 8px;width:31%">Investigation</th><th style="padding:10px 8px;width:17%">Result</th><th style="padding:10px 8px;width:14%">Unit</th><th style="padding:10px 8px;width:23%">Reference Range</th><th style="padding:10px 8px;width:15%">Flag</th></tr></thead><tbody>${body}</tbody></table>` : ''}${notes}<footer style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:${pdfType('footer')};line-height:${REPORT_LEADING.footer};color:#6b7280">FXMed Functional Medicine · +234 907 703 1311 · +1 832 779 2347 · fxmed@wellnesswits.com<br>Treating the root cause — not just the symptoms <span style="float:right">Page ${page} of ${pages}</span></footer>`
}

// Keep sections in first-appearance order, and preserve test order within each
// section. Matching ignores incidental casing and whitespace from PDF imports.
export function groupInvestigationResults(results: InvestigationResult[]) {
  const groups = new Map<string, InvestigationResult[]>()
  for (const row of results) {
    const section = row.section.trim().replace(/\s+/g, ' ')
    const key = section.toLowerCase()
    const group = groups.get(key)
    if (group) group.push({ ...row, section: group[0].section })
    else groups.set(key, [{ ...row, section }])
  }
  return Array.from(groups.values()).flat()
}

/** Measure the actual table, including wrapped cells, headings and footer. */
export async function paginateInvestigationResults(data: InvestigationResultPdfData): Promise<string[]> {
  const container = createReportContainer('')
  document.body.appendChild(container)
  const pages: { rows: InvestigationResult[]; notes: string }[] = []
  let current: typeof pages[number] = { rows: [], notes: '' }

  try {
    await document.fonts.ready
    // Use the real rendered width: application CSS may set border-box sizing.
    // A small rounding allowance keeps rasterisation within a single A4 sheet.
    const maxHeight = Math.floor(container.getBoundingClientRect().width * REPORT_PAGE.a4HeightMm / REPORT_PAGE.a4WidthMm) - 2
    const fits = async (candidate: typeof current) => {
      container.innerHTML = buildPage(data, candidate.rows, pages.length + 1, 9999, candidate.notes)
      await waitForImages(container)
      return container.getBoundingClientRect().height <= maxHeight
    }
    const finishPage = () => {
      pages.push(current)
      current = { rows: [], notes: '' }
    }

    for (const row of groupInvestigationResults(data.results)) {
      let candidate = { ...current, rows: [...current.rows, row] }
      if (!await fits(candidate)) {
        if (current.rows.length) finishPage()
        candidate = { ...current, rows: [row] }
        if (!await fits(candidate)) {
          throw new Error(`The result for "${row.test}" is too long to fit on one PDF page. Shorten its text or patient details and try again.`)
        }
      }
      current = candidate
    }

    // Notes use the remaining space, then continue on as many pages as needed.
    // Split only at word boundaries so long notes cannot displace the footer.
    let remainingNotes = data.notes.trim()
    while (remainingNotes) {
      if (await fits({ ...current, notes: remainingNotes })) {
        current.notes = remainingNotes
        break
      }
      const words = remainingNotes.match(/\S+\s*/g) || []
      let low = 0, high = words.length
      while (low < high) {
        const count = Math.ceil((low + high) / 2)
        if (await fits({ ...current, notes: words.slice(0, count).join('').trim() })) low = count
        else high = count - 1
      }
      if (low) {
        current.notes = words.slice(0, low).join('').trim()
        remainingNotes = words.slice(low).join('').trim()
      } else if (!current.rows.length) {
        throw new Error('The clinical notes or patient details are too long to fit on a PDF page. Shorten the text and try again.')
      }
      finishPage()
    }
    if (current.rows.length || current.notes || !pages.length) pages.push(current)
    return pages.map((page, index) => buildPage(data, page.rows, index + 1, pages.length, page.notes))
  } finally {
    container.remove()
  }
}

export async function generateInvestigationResultPdf(data: InvestigationResultPdfData): Promise<Blob> {
  return renderReportPdf(await paginateInvestigationResults(data))
}
