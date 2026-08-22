// Data-driven generator for FXMed "Investigation Request Form" PDFs.
// Mirrors the branded layout used on the public Functional Health Analysis
// investigations page, but accepts a custom patient + test list so admins can
// produce bespoke request forms with the same style and design.

import { renderReportPdf } from './reportPdf'
import { REPORT_LEADING, pdfType } from './reportTheme'

export interface InvestigationTest {
  name: string
  description: string
}

export interface InvestigationFormData {
  fullName: string
  email: string
  phone: string
  age: string
  gender: string
  panelTitle: string
  tests: InvestigationTest[]
  // Optional partner verification stamp. Present only when the form is being
  // taken to a partner laboratory, so they can confirm FXMed authorised it.
  stamp?: InvestigationStamp
}

export interface InvestigationStamp {
  partner: string
  validOn: string
}

// The default "Core Functional Medicine Panel" used on the public site. Exposed
// so the admin tool can offer it as a starting point before customisation.
export const CORE_PANEL_TESTS: InvestigationTest[] = [
  {
    name: 'Complete Blood Count (CBC)',
    description:
      'Comprehensive blood analysis to assess overall health, detect infections, anemia, and immune system status',
  },
  {
    name: 'Comprehensive Metabolic Panel (CMP)',
    description:
      'Evaluates kidney function, liver function, blood sugar levels, and electrolyte balance for metabolic health assessment',
  },
  {
    name: 'Lipid Profile (Total Cholesterol, LDL, HDL, Triglycerides)',
    description:
      'Complete cholesterol analysis including HDL, LDL, and triglycerides to assess cardiovascular risk and metabolic function',
  },
  {
    name: 'Thyroid (TSH, free T3, free T4)',
    description:
      'Comprehensive thyroid evaluation to assess metabolic rate, energy production, and hormonal balance',
  },
  {
    name: 'HbA1c (Glycated Hemoglobin)',
    description:
      'Measures average blood sugar levels over 2-3 months to assess glucose control and metabolic health',
  },
  {
    name: 'High Sensitivity CRP',
    description:
      'Detects low levels of inflammation that may indicate chronic disease risk and cardiovascular issues',
  },
  {
    name: 'Vitamin D (25-OH Vitamin D)',
    description:
      'Measures vitamin D status critical for immune function, bone health, hormone balance, and disease prevention',
  },
  {
    name: 'ESR (Erythrocyte Sedimentation Rate)',
    description:
      'Measures the rate at which red blood cells settle in a test tube, indicating inflammation levels in the body',
  },
]

// Test rows now contain names only, so the first page can use the remaining
// space below the patient block and continuation pages can carry a denser list.
const FIRST_PAGE_TESTS = 11
const CONTINUATION_PAGE_TESTS = 20

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function valueOrBlank(value: string) {
  const trimmed = value.trim()
  if (trimmed) return escapeHtml(trimmed)
  return '<span style="display:inline-block; min-width:160px; border-bottom:1px solid #D1D5DB;">&nbsp;</span>'
}

function buildHeaderHtml(panelTitle: string, origin: string) {
  return `
    <div style="text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 2px solid #CADE68;">
      <div style="font-size: ${pdfType('badge')}; font-weight: 600; color: #6B8E23; text-transform: uppercase; letter-spacing: 0.14em; background: rgba(107, 142, 35, 0.1); display: inline-flex; align-items: center; justify-content: center; padding: 2px 16px 14px 16px; border-radius: 20px; margin-bottom: 16px; line-height: 1;">
        Functional Health Analysis
      </div>
      <div style="margin-bottom: 8px; text-align: center; display: flex; justify-content: center; align-items: center;">
        <img src="${origin}/FXMed_Logo_Black.png" alt="FXMed" style="height: 60px; width: auto; margin: 0 auto;" />
      </div>
      <h1 style="font-size: ${pdfType('title')}; font-weight: 700; color: #0F2419; margin-bottom: 8px;">
        Investigation Request Form
      </h1>
      <p style="font-size: ${pdfType('subtitle')}; color: #666; font-weight: 500;">
        ${escapeHtml(panelTitle)}
      </p>
    </div>
  `
}

function buildPatientHtml(data: InvestigationFormData) {
  return `
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: ${pdfType('section')}; font-weight: 700; color: #0F2419; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
        Patient Information
      </h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div style="margin-bottom: 12px;">
          <div style="font-size: ${pdfType('label')}; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
            Full Name
          </div>
          <div style="font-size: ${pdfType('value')}; font-weight: 600; color: #0F2419;">
            ${valueOrBlank(data.fullName)}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <div style="font-size: ${pdfType('label')}; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
            Email Address
          </div>
          <div style="font-size: ${pdfType('value')}; font-weight: 600; color: #0F2419;">
            ${valueOrBlank(data.email)}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <div style="font-size: ${pdfType('label')}; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
            Phone Number
          </div>
          <div style="font-size: ${pdfType('value')}; font-weight: 600; color: #0F2419;">
            ${valueOrBlank(data.phone)}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <div style="font-size: ${pdfType('label')}; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
            Age / Gender
          </div>
          <div style="font-size: ${pdfType('value')}; font-weight: 600; color: #0F2419;">
            ${valueOrBlank([data.age.trim(), data.gender.trim()].filter(Boolean).join(' / '))}
          </div>
        </div>
      </div>
    </div>
  `
}

function buildTestCardHtml(index: number, test: InvestigationTest) {
  return `
    <div style="background: #FEF2F2; border-left: 3px solid #DC2626; border-radius: 6px; padding: 9px 12px; margin-bottom: 6px; break-inside: avoid; page-break-inside: avoid;">
      <div style="font-size: ${pdfType('value')}; font-weight: 700; color: #0F2419; line-height: 1.25;">
        ${index}. ${escapeHtml(test.name)}
      </div>
    </div>
  `
}

function buildSectionHtml(panelTitle: string, cardsHtml: string, withBadge: boolean) {
  const badge = withBadge
    ? `<div style="display: inline-flex; align-items: center; justify-content: center; background: #FEE2E2; color: #DC2626; font-size: ${pdfType('badge')}; font-weight: 700; padding: 0px 10px 8px 10px; border-radius: 20px; margin-bottom: 12px; text-transform: uppercase; line-height: 1;">
         Required Tests
       </div>`
    : ''

  return `
    <div style="margin-bottom: 20px;">
      ${badge}
      <h2 style="font-size: ${pdfType('section')}; font-weight: 700; color: #0F2419; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb;">
        ${escapeHtml(panelTitle)}
      </h2>
      <div style="list-style: none;">
        ${cardsHtml}
      </div>
    </div>
  `
}

function formatStampDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
}

// A verification mark the partner laboratory can check at the counter. Angled
// and double-ruled so it reads as a stamp rather than as body copy.
function buildStampHtml(stamp: InvestigationStamp, patientName: string) {
  const partner = escapeHtml(stamp.partner.toUpperCase())
  return `
    <div style="margin-top: 34px; display: flex; justify-content: flex-end;">
      <div style="transform: rotate(-2.5deg); border: 3px double #0F2419; border-radius: 10px; padding: 14px 20px; background: rgba(202,222,104,.12); text-align: center; min-width: 300px;">
        <div style="font-size: ${pdfType('label')}; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #6B8E23;">
          FXMed Functional Medicine
        </div>
        <div style="margin: 7px 0 4px; font-size: ${pdfType('stamp')}; font-weight: 800; letter-spacing: .05em; color: #0F2419;">
          VERIFIED FOR ${partner}
        </div>
        <div style="font-size: ${pdfType('fine')}; color: #0F2419; line-height: ${REPORT_LEADING.tight};">
          ${escapeHtml(patientName || 'The named patient')} is authorised by FXMed<br>
          to undergo the investigations listed on this form<br>
          at ${escapeHtml(stamp.partner)}.
        </div>
        <div style="margin-top: 9px; padding-top: 8px; border-top: 1px solid rgba(15,36,25,.25); font-size: ${pdfType('body')}; font-weight: 800; color: #0F2419;">
          VALID ON: ${escapeHtml(formatStampDate(stamp.validOn))}
        </div>
      </div>
    </div>
  `
}

function buildFooterHtml() {
  return `
    <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
      <div style="font-size: ${pdfType('body')}; font-weight: 700; color: #0F2419; margin-bottom: 12px;">
        FXMed Functional Medicine
      </div>
      <div style="font-size: ${pdfType('footer')}; color: #6B7280; line-height: ${REPORT_LEADING.footer};">
        For questions about this investigation form, please contact us:<br>
        +234 907 703 1311 · +1 832 779 2347 | fxmed@wellnesswits.com<br>
        Treating the root cause — not just the symptoms
      </div>
      <div style="margin-top: 24px; font-size: ${pdfType('micro')}; color: #9CA3AF; font-style: italic;">
        Generated on: ${new Date().toLocaleDateString()} | Confidential Medical Document
      </div>
    </div>
  `
}

// Split the tests across pages: the first page also carries the header and
// patient block, so it fits fewer cards than continuation pages.
function chunkTests(tests: InvestigationTest[]) {
  const chunks: InvestigationTest[][] = [tests.slice(0, FIRST_PAGE_TESTS)]
  for (let i = FIRST_PAGE_TESTS; i < tests.length; i += CONTINUATION_PAGE_TESTS) {
    chunks.push(tests.slice(i, i + CONTINUATION_PAGE_TESTS))
  }
  return chunks
}

export async function generateInvestigationFormPdf(data: InvestigationFormData): Promise<Blob> {
  const origin = window.location.origin
  const panelTitle = data.panelTitle.trim() || 'Core Functional Medicine Panel'

  const headerHtml = buildHeaderHtml(panelTitle, origin)
  const patientHtml = buildPatientHtml(data)
  const footerHtml = buildFooterHtml()

  const chunks = chunkTests(data.tests)

  let testNumber = 0
  const pageHtmls = chunks.map((chunk, pageIndex) => {
    const isFirstPage = pageIndex === 0
    const cardsHtml = chunk
      .map((test) => {
        testNumber += 1
        return buildTestCardHtml(testNumber, test)
      })
      .join('')

    const sectionHtml = buildSectionHtml(panelTitle, cardsHtml, isFirstPage)
    return isFirstPage ? headerHtml + patientHtml + sectionHtml : sectionHtml
  })

  // Stamp then footer, both on the final page so the verification mark sits
  // directly beneath the tests it authorises.
  if (data.stamp?.validOn) pageHtmls[pageHtmls.length - 1] += buildStampHtml(data.stamp, data.fullName)
  pageHtmls[pageHtmls.length - 1] += footerHtml

  return renderReportPdf(pageHtmls)
}
