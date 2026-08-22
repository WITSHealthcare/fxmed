import { renderReportPdf } from './reportPdf'
import {
  REPORT_ACCENT,
  REPORT_INK,
  REPORT_LEADING,
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
  return `<div><div style="font-size:${pdfType('label')};font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">${label}</div><div style="font-size:${pdfType('value')};font-weight:600;color:${REPORT_INK}">${shown(value)}</div></div>`
}

function flagStyle(flag: InvestigationResultFlag) {
  if (flag === 'High' || flag === 'Low' || flag === 'Abnormal') return 'background:#fee2e2;color:#b91c1c'
  if (flag === 'Normal') return 'background:#ecfccb;color:#3f6212'
  return 'background:#f3f4f6;color:#6b7280'
}

function buildPage(data: InvestigationResultPdfData, rows: InvestigationResult[], page: number, pages: number) {
  const header = `<div style="text-align:center;margin-bottom:28px;padding-bottom:24px;border-bottom:2px solid ${REPORT_ACCENT}">
    <div style="display:inline-block;background:rgba(107,142,35,.1);color:#6b8e23;border-radius:20px;padding:7px 16px;font-size:${pdfType('badge')};font-weight:700;text-transform:uppercase;letter-spacing:.14em">Confidential Medical Document</div>
    <div style="margin:14px 0 6px"><img src="${window.location.origin}/FXMed_Logo_Black.png" style="height:52px;width:auto" /></div>
    <h1 style="font-size:${pdfType('title')};color:${REPORT_INK};margin:0 0 6px">Investigation Results</h1><div style="font-size:${pdfType('subtitle')};color:#666;font-weight:600">${shown(data.reportTitle)}</div>
  </div>`
  const info = page === 1 ? `<section style="margin-bottom:25px"><h2 style="font-size:${pdfType('section')};color:${REPORT_INK};border-bottom:2px solid #e5e7eb;padding-bottom:7px;margin:0 0 14px">Patient Information</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:15px 24px">${patientField('Full Name', data.fullName)}${patientField('Email Address', data.email)}${patientField('Phone Number', data.phone)}${patientField('Age / Gender', [data.age, data.gender].filter(Boolean).join(' / '))}${patientField('Specimen', data.specimen)}${patientField('Requesting Clinician', data.clinician)}${patientField('Collected', data.collectedAt)}${patientField('Reported', data.reportedAt)}</div></section>` : ''
  const body = rows.map((row, index) => {
    const previousSection = index > 0 ? rows[index - 1].section.trim() : ''
    const section = row.section.trim()
    const sectionHeading = section && section !== previousSection
      ? `<tr><td colspan="5" style="padding:10px 8px;background:#eef2d5;color:${REPORT_INK};font-size:${pdfType('body')};font-weight:800;text-transform:uppercase;letter-spacing:.05em;border-top:2px solid ${REPORT_ACCENT}">${shown(section)}</td></tr>`
      : ''
    return `${sectionHeading}<tr style="background:${index % 2 ? '#fafafa' : '#fff'}"><td style="padding:11px 8px;font-weight:700;color:${REPORT_INK}">${shown(row.test)}${row.remark.trim() ? `<div style="font-size:${pdfType('micro')};color:#6b7280;font-weight:400;margin-top:4px">${shown(row.remark)}</div>` : ''}</td><td style="padding:11px 8px;font-weight:700">${shown(row.result)}</td><td style="padding:11px 8px">${shown(row.unit)}</td><td style="padding:11px 8px">${shown(row.referenceRange)}</td><td style="padding:11px 8px"><span style="display:inline-block;border-radius:14px;padding:4px 8px;font-size:${pdfType('micro')};font-weight:700;${flagStyle(row.flag)}">${shown(row.flag)}</span></td></tr>`
  }).join('')
  const notes = page === pages && data.notes.trim() ? `<div style="margin-top:22px;background:#f7f8ed;border-left:4px solid #6b8e23;border-radius:7px;padding:14px"><div style="font-size:${pdfType('label')};font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:5px">Clinical Notes</div><div style="font-size:${pdfType('body')};line-height:${REPORT_LEADING.tight};color:#374151">${shown(data.notes)}</div></div>` : ''
  return `${page === 1 ? header + info : `<div style="border-bottom:2px solid ${REPORT_ACCENT};padding-bottom:14px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:center"><img src="${window.location.origin}/FXMed_Logo_Black.png" style="height:34px"><b style="color:${REPORT_INK}">Investigation Results — continued</b></div>`}<table style="width:100%;border-collapse:collapse;font-size:${pdfType('fine')}"><thead><tr style="background:${REPORT_INK};color:#fff;text-align:left"><th style="padding:10px 8px;width:31%">Investigation</th><th style="padding:10px 8px;width:17%">Result</th><th style="padding:10px 8px;width:14%">Unit</th><th style="padding:10px 8px;width:23%">Reference Range</th><th style="padding:10px 8px;width:15%">Flag</th></tr></thead><tbody>${body}</tbody></table>${notes}<footer style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:${pdfType('footer')};line-height:${REPORT_LEADING.footer};color:#6b7280">FXMed Functional Medicine · +234 907 703 1311 · +1 832 779 2347 · fxmed@wellnesswits.com<br>Treating the root cause — not just the symptoms <span style="float:right">Page ${page} of ${pages}</span></footer>`
}

export async function generateInvestigationResultPdf(data: InvestigationResultPdfData): Promise<Blob> {
  const firstPageCount = 9
  const nextPageCount = 17
  const chunks = [data.results.slice(0, firstPageCount)]
  for (let i = firstPageCount; i < data.results.length; i += nextPageCount) chunks.push(data.results.slice(i, i + nextPageCount))
  return renderReportPdf(chunks.map((rows, index) => buildPage(data, rows, index + 1, chunks.length)))
}
