// Server-only AI steps of the functional medicine lab analysis: reading
// results out of a lab report, and writing the interpretation. Classification
// itself (lab vs FM status, scores, urgency) is done in lib/fmBiomarkers.ts,
// never by the model, so the numbers on the report are always reproducible.

import { generateClinicalReport, type ReportAttachment } from '@/lib/ai/clinical-report'
import { analyse, BAND_LABEL, bandOf, directionOf } from '@/lib/fmAssessment'
import {
  FM_BIOMARKERS, createEntry, defaultRanges, matchBiomarker,
  type FmEntry, type FmNarrative, type FmPatient, type Priority, type Sex,
} from '@/lib/fmBiomarkers'

function parseJson(output: string) {
  const fenced = output.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const source = fenced?.[1] || output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1)
  return JSON.parse(source) as Record<string, any>
}

const text = (value: unknown, max = 600) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const list = (value: unknown, max = 12) => Array.isArray(value) ? value.map(item => text(item, 300)).filter(Boolean).slice(0, max) : []
const PRIORITIES: Priority[] = ['urgent', 'high', 'moderate', 'low']
const priority = (value: unknown): Priority => PRIORITIES.includes(value as Priority) ? value as Priority : 'moderate'

// ---------------------------------------------------------------------------
// Reading a lab report

export type ExtractedLab = { patient: Partial<FmPatient>; entries: FmEntry[]; provider: string }

function extractionPrompt(pastedText: string) {
  const catalogue = FM_BIOMARKERS.map(marker => `${marker.id}: ${marker.name}`).join('\n')
  return `You are transcribing a laboratory report for a functional medicine clinic.${pastedText ? ' The report text is pasted below.' : ' The attached files are the laboratory\'s report: PDF pages or photographs of it.'}

Copy every numeric result. Where a result is one of these known markers, give its id; otherwise use null for markerId:
${catalogue}

Return valid JSON only, with no commentary, in exactly this shape:
{"patient":{"name":"","age":"","sex":"","collectedAt":"","labRef":"","facility":""},"results":[{"markerId":null,"name":"","value":"","unit":"","referenceRange":""}]}

Rules:
- Never invent or calculate a value. Copy each value, unit and reference range exactly as printed.
- sex is "female", "male" or empty. age is a number of years as printed, or empty.
- facility is the reporting laboratory's name. labRef is the lab's report or accession number.
- Leave out anything you cannot read with confidence, and any result that is not a number (e.g. "Negative").
- If this is not a laboratory report, return an empty results array.${pastedText ? `\n\nREPORT TEXT:\n${pastedText.slice(0, 40000)}` : ''}`
}

export async function extractLabResults(files: ReportAttachment[], pastedText: string, sex: Sex): Promise<ExtractedLab> {
  const { report: output, provider } = await generateClinicalReport(extractionPrompt(pastedText), files)
  let parsed: Record<string, any>
  try {
    parsed = parseJson(output)
  } catch {
    throw new Error('The results could not be read from this report.')
  }
  const patient = parsed.patient && typeof parsed.patient === 'object' ? parsed.patient : {}
  const extractedSex = patient.sex === 'female' || patient.sex === 'male' ? patient.sex as Sex : ''
  const rangeSex = sex || extractedSex
  const entries: FmEntry[] = []
  const seen = new Set<string>()
  for (const row of Array.isArray(parsed.results) ? parsed.results.slice(0, 200) : []) {
    const name = text(row?.name, 120)
    const value = text(row?.value, 40)
    if (!name || !value) continue
    const marker = FM_BIOMARKERS.find(item => item.id === row?.markerId) || matchBiomarker(name)
    const key = marker?.id || name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const unit = text(row?.unit, 40)
    const labRange = text(row?.referenceRange, 60)
    const fallback = marker ? defaultRanges(marker, unit, rangeSex) : null
    entries.push(createEntry(marker, rangeSex, {
      ...(marker ? {} : { name }),
      value,
      unit: unit || marker?.unit || '',
      // The lab's own printed range wins; the catalogue fills a gap.
      labRange: labRange || fallback?.lab || '',
      fmRange: fallback?.fm || '',
    }))
  }
  return {
    patient: {
      name: text(patient.name, 120), age: text(patient.age, 10), sex: extractedSex,
      collectedAt: text(patient.collectedAt, 40), labRef: text(patient.labRef, 60), facility: text(patient.facility, 120),
    },
    entries,
    provider,
  }
}

// ---------------------------------------------------------------------------
// Interpretation

function interpretationPrompt(patient: FmPatient, entries: FmEntry[], context: string) {
  const analysis = analyse(entries, patient.sex)
  const outOfOptimal = analysis.summary.assessed.filter(entry => directionOf(entry))
  const lines = outOfOptimal.map(entry =>
    `- ${entry.name}: ${entry.value} ${entry.unit} | ${BAND_LABEL[bandOf(entry)]} | lab range ${entry.labRange || 'n/a'} | FM optimal ${entry.fmRange || 'n/a'}${entry.urgent ? ' | ALARM' : ''}${entry.calculated ? ' | calculated' : ''}`)
  const optimal = analysis.summary.assessed.filter(entry => !directionOf(entry)).map(entry => `${entry.name} ${entry.value} ${entry.unit}`.trim())
  const areas = analysis.plan.map(item => `- ${item.area.name}: ${item.score}%${item.urgent ? ' (alarm marker)' : ''} | markers: ${item.contributors.map(({ entry, direction }) => `${entry.name} ${direction === 'low' ? '↓' : '↑'}`).join(', ')}`)
  return `You are a functional medicine physician writing the interpretation for a patient's Functional Health Report at WITS FxMed Nigeria. The statuses and likelihood scores below were calculated by the clinic's software; do not re-classify them. Write for a patient who will read this with their doctor: plain English, specific to these numbers, clinically sound, never alarmist and never dismissive. Do not invent results that are not listed. Practical advice should suit a Nigerian patient (local foods, availability).

PATIENT: ${patient.age || 'unknown age'} years, ${patient.sex || 'sex not recorded'}
${context ? `CLINICAL CONTEXT FROM THE CLINICIAN:\n${context.slice(0, 3000)}\n` : ''}
HEALTH IMPROVEMENT AREAS FLAGGED (likelihood of dysfunction):
${areas.join('\n') || 'None above 50%.'}

RESULTS OUTSIDE OPTIMAL:
${lines.join('\n') || 'None.'}

RESULTS WITHIN OPTIMAL: ${optimal.join('; ') || 'None.'}

Return valid JSON only, with no commentary, in exactly this shape:
{
  "summary": "3-4 sentences: the overall picture, the main patterns and what matters most",
  "findings": [{"priority":"urgent|high|moderate","title":"short headline with the key value","detail":"1-2 sentences: what it means and the immediate action"}],
  "markerNotes": [{"name":"exact result name as listed","note":"clinical implication for this patient, max 18 words"}],
  "recommendations": [{"priority":"urgent|high|moderate|low","title":"theme, e.g. Reverse insulin resistance","items":["specific, actionable step"]}],
  "nextSteps": [{"title":"","text":"1-2 sentences","items":[""]}]
}

Rules:
- findings: the 3-5 most important patterns, most serious first. Connect related markers (e.g. high insulin + high triglycerides + low HDL) rather than listing each alone. Any ALARM result is an urgent finding.
- markerNotes: one for every result outside optimal, and none for the others.
- recommendations: 4-6 groups ordered by priority, each with 3-5 items covering food, lifestyle, supplements to discuss and follow-up tests as relevant. Put any medical referral first.
- nextSteps: exactly 3 groups: seeing their clinician, follow-up tests with timing, and the foundations to start now.
- Use the units given. Give typical adult supplement doses and always say to agree medicines and supplements with their doctor.`
}

export async function interpretLabResults(patient: FmPatient, entries: FmEntry[], context: string) {
  const { report: output, provider } = await generateClinicalReport(interpretationPrompt(patient, entries, context), [])
  let parsed: Record<string, any>
  try {
    parsed = parseJson(output)
  } catch {
    throw new Error('The interpretation could not be read. Try again.')
  }

  const narrative: FmNarrative = {
    summary: text(parsed.summary, 1500),
    findings: (Array.isArray(parsed.findings) ? parsed.findings : []).slice(0, 6).map((item: any) => ({ priority: priority(item?.priority), title: text(item?.title, 140), detail: text(item?.detail, 500) })).filter((item: any) => item.title),
    panels: {},
    recommendations: (Array.isArray(parsed.recommendations) ? parsed.recommendations : []).slice(0, 10).map((item: any) => ({ priority: priority(item?.priority), title: text(item?.title, 140), items: list(item?.items, 8) })).filter((item: any) => item.title),
    nextSteps: (Array.isArray(parsed.nextSteps) ? parsed.nextSteps : []).slice(0, 3).map((item: any) => ({ title: text(item?.title, 120), text: text(item?.text, 500), items: list(item?.items, 6) })).filter((item: any) => item.title),
  }
  const notes = new Map<string, string>()
  for (const item of Array.isArray(parsed.markerNotes) ? parsed.markerNotes : []) {
    const name = text(item?.name, 120).toLowerCase()
    if (name) notes.set(name, text(item?.note, 200))
  }
  return { narrative, notes: Object.fromEntries(notes), provider }
}
