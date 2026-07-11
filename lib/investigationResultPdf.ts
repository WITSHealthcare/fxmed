export type InvestigationResultFlag = 'Normal' | 'High' | 'Low' | 'Abnormal' | ''

export interface InvestigationResult {
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
  return `<div><div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">${label}</div><div style="font-size:15px;font-weight:600;color:#0f2419">${shown(value)}</div></div>`
}

function flagStyle(flag: InvestigationResultFlag) {
  if (flag === 'High' || flag === 'Low' || flag === 'Abnormal') return 'background:#fee2e2;color:#b91c1c'
  if (flag === 'Normal') return 'background:#ecfccb;color:#3f6212'
  return 'background:#f3f4f6;color:#6b7280'
}

function buildPage(data: InvestigationResultPdfData, rows: InvestigationResult[], page: number, pages: number) {
  const header = `<div style="text-align:center;margin-bottom:28px;padding-bottom:24px;border-bottom:2px solid #cade68">
    <div style="display:inline-block;background:rgba(107,142,35,.1);color:#6b8e23;border-radius:20px;padding:7px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.14em">Confidential Medical Document</div>
    <div style="margin:14px 0 6px"><img src="${window.location.origin}/FXMed_Logo_Black.png" style="height:52px;width:auto" /></div>
    <h1 style="font-size:29px;color:#0f2419;margin:0 0 6px">Investigation Results</h1><div style="font-size:14px;color:#666;font-weight:600">${shown(data.reportTitle)}</div>
  </div>`
  const info = page === 1 ? `<section style="margin-bottom:25px"><h2 style="font-size:17px;color:#0f2419;border-bottom:2px solid #e5e7eb;padding-bottom:7px;margin:0 0 14px">Patient Information</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:15px 24px">${patientField('Full Name', data.fullName)}${patientField('Email Address', data.email)}${patientField('Phone Number', data.phone)}${patientField('Age / Gender', [data.age, data.gender].filter(Boolean).join(' / '))}${patientField('Specimen', data.specimen)}${patientField('Requesting Clinician', data.clinician)}${patientField('Collected', data.collectedAt)}${patientField('Reported', data.reportedAt)}</div></section>` : ''
  const body = rows.map((row, index) => `<tr style="background:${index % 2 ? '#fafafa' : '#fff'}"><td style="padding:11px 8px;font-weight:700;color:#0f2419">${shown(row.test)}${row.remark.trim() ? `<div style="font-size:10px;color:#6b7280;font-weight:400;margin-top:4px">${shown(row.remark)}</div>` : ''}</td><td style="padding:11px 8px;font-weight:700">${shown(row.result)}</td><td style="padding:11px 8px">${shown(row.unit)}</td><td style="padding:11px 8px">${shown(row.referenceRange)}</td><td style="padding:11px 8px"><span style="display:inline-block;border-radius:14px;padding:4px 8px;font-size:10px;font-weight:700;${flagStyle(row.flag)}">${shown(row.flag)}</span></td></tr>`).join('')
  const notes = page === pages && data.notes.trim() ? `<div style="margin-top:22px;background:#f7f8ed;border-left:4px solid #6b8e23;border-radius:7px;padding:14px"><div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:5px">Clinical Notes</div><div style="font-size:13px;line-height:1.55;color:#374151">${shown(data.notes)}</div></div>` : ''
  return `${page === 1 ? header + info : `<div style="border-bottom:2px solid #cade68;padding-bottom:14px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:center"><img src="${window.location.origin}/FXMed_Logo_Black.png" style="height:34px"><b style="color:#0f2419">Investigation Results — continued</b></div>`}<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#0f2419;color:#fff;text-align:left"><th style="padding:10px 8px;width:31%">Investigation</th><th style="padding:10px 8px;width:17%">Result</th><th style="padding:10px 8px;width:14%">Unit</th><th style="padding:10px 8px;width:23%">Reference Range</th><th style="padding:10px 8px;width:15%">Flag</th></tr></thead><tbody>${body}</tbody></table>${notes}<footer style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;line-height:1.6;color:#6b7280">FXMed Functional Medicine · +234 907 703 1311 · +1 832 779 2347 · fxmed@wellnesswits.com<br>Treating the root cause — not just the symptoms <span style="float:right">Page ${page} of ${pages}</span></footer>`
}

export async function generateInvestigationResultPdf(data: InvestigationResultPdfData): Promise<Blob> {
  const firstPageCount = 9
  const nextPageCount = 17
  const chunks = [data.results.slice(0, firstPageCount)]
  for (let i = firstPageCount; i < data.results.length; i += nextPageCount) chunks.push(data.results.slice(i, i + nextPageCount))
  const html2canvas = (await import('html2canvas')).default
  const { default: jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  for (let i = 0; i < chunks.length; i += 1) {
    const element = document.createElement('div')
    Object.assign(element.style, { position: 'absolute', left: '-9999px', top: '0', width: '800px', background: '#fff', padding: '48px', fontFamily: "'DM Sans',sans-serif" })
    element.innerHTML = buildPage(data, chunks[i], i + 1, chunks.length)
    document.body.appendChild(element)
    try {
      await Promise.all(Array.from(element.querySelectorAll('img')).map(img => img.complete ? Promise.resolve() : new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve() })))
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#fff' })
      if (i) pdf.addPage()
      const height = Math.min(297, canvas.height * 210 / canvas.width)
      pdf.addImage(canvas.toDataURL('image/jpeg', .95), 'JPEG', 0, 0, 210, height)
    } finally { element.remove() }
  }
  return pdf.output('blob')
}
