// Reads investigation results out of a laboratory's own report, so they can be
// checked and issued on an FXMed results report instead of being retyped.
// Server-only: it calls the AI providers configured for clinical reports.

import { generateClinicalReport, type ReportAttachment } from '@/lib/ai/clinical-report'
import { normalizeResults } from '@/lib/investigations'
import type { InvestigationResult } from '@/lib/investigationResultPdf'

export type ExpectedResult = { test: string; section: string }

export type ExtractedReport = {
  results: InvestigationResult[]
  report: { specimen: string; collectedAt: string; reportedAt: string }
  provider: string
}

function buildPrompt(orderedTests: string[], expected: ExpectedResult[]) {
  const sections = new Map<string, string[]>()
  for (const item of expected) sections.set(item.section, [...(sections.get(item.section) || []), item.test])
  const scope = orderedTests.length
    ? `These tests were ordered:\n${orderedTests.map(test => `- ${test}`).join('\n')}

Include every result the report gives for these tests, and only those. A panel's result is every measurement printed under it.

Where a result is one of the measurements below, use its name exactly as written here, and the section heading it is listed under:
${Array.from(sections.entries()).map(([section, tests]) => `${section}: ${tests.join('; ')}`).join('\n')}`
    : 'Include every investigation result in the report.'

  return `You are transcribing a laboratory investigation report for a clinic. The attached files are the laboratory's report: PDF pages or photographs of it.

${scope}

For any other result, use the test name and the panel heading as printed on the report.

Return valid JSON only, with no commentary, in exactly this shape:
{"report":{"specimen":"","collectedAt":"","reportedAt":""},"results":[{"section":"","test":"","result":"","unit":"","referenceRange":"","flag":"","remark":""}]}

Rules:
- Never invent or calculate a value. Copy each result, unit and reference range exactly as printed.
- flag is the laboratory's own flag: "High" for H, High or an upward arrow; "Low" for L, Low or a downward arrow; "Abnormal" for any other abnormal mark; "Normal" only if the report says so. Leave it empty when the report gives no flag.
- remark is any comment the report prints against that result, otherwise empty.
- specimen, collectedAt and reportedAt are copied from the report as printed, or left empty.
- Leave out anything you cannot read with confidence.
- If the files are not a laboratory report, or contain none of the results asked for, return an empty results array.`
}

function parseJson(output: string) {
  const fenced = output.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const source = fenced?.[1] || output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1)
  return JSON.parse(source) as Record<string, any>
}

const clean = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 80) : ''

export async function extractInvestigationResults(files: ReportAttachment[], orderedTests: string[], expected: ExpectedResult[]): Promise<ExtractedReport> {
  const { report: output, provider } = await generateClinicalReport(buildPrompt(orderedTests, expected), files)
  let parsed: Record<string, any>
  try {
    parsed = parseJson(output)
  } catch {
    throw new Error('The results could not be read from this report.')
  }
  const report = parsed.report && typeof parsed.report === 'object' ? parsed.report : {}
  return {
    results: normalizeResults(parsed.results),
    report: { specimen: clean(report.specimen), collectedAt: clean(report.collectedAt), reportedAt: clean(report.reportedAt) },
    provider,
  }
}
