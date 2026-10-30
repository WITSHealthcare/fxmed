// Server-only AI steps of the functional medicine lab analysis: reading
// results out of a lab report, and writing the interpretation. Classification
// itself (lab vs FM status, scores, urgency) is done in lib/fmBiomarkers.ts,
// never by the model, so the numbers on the report are always reproducible.

import { generateClinicalReport, type ReportAttachment } from '@/lib/ai/clinical-report'
import {
  FM_BIOMARKERS, FM_PANELS, createEntry, defaultRanges, matchBiomarker, summarize,
  type FmEntry, type FmNarrative, type FmPatient, type PanelId, type Priority, type Sex,
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
const PANEL_IDS = new Set(FM_PANELS.map(panel => panel.id))

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
  const summary = summarize(entries)
  const lines = summary.assessed.map(entry =>
    `- [${entry.panel}] ${entry.name}: ${entry.value} ${entry.unit} | lab range ${entry.labRange || 'n/a'} (${entry.lab}) | FM optimal ${entry.fmRange || 'n/a'} (${entry.fm})${entry.urgent ? ' | CRITICAL' : ''}`)
  const panels = summary.panels.map(item => `${item.panel.id} (${item.panel.name}): ${item.score ?? 'n/a'}%`).join('\n')
  return `You are a functional medicine physician writing the interpretation for a patient's lab report at WITS FxMed Nigeria. The statuses below were calculated by the clinic's software; do not re-classify them. Write for a patient who will read this with their doctor: plain English, specific to these numbers, clinically sound, never alarmist and never dismissive. Do not invent results that are not listed.

PATIENT: ${patient.age || 'unknown age'} years, ${patient.sex || 'sex not recorded'}
${context ? `CLINICAL CONTEXT FROM THE CLINICIAN:\n${context.slice(0, 3000)}\n` : ''}
PANEL SCORES (share of markers within FM optimal):
${panels}

RESULTS:
${lines.join('\n')}

Return valid JSON only, with no commentary, in exactly this shape:
{
  "summary": "2-3 sentence overview of the whole picture",
  "findings": [{"priority":"urgent|high|moderate","title":"short headline with the key value","detail":"1-2 sentences: what it means and the immediate action"}],
  "markerNotes": [{"name":"exact result name as listed","note":"clinical implication, max 12 words"}],
  "panels": {"<panel id>": {"summary":"one line, max 8 words","understanding":[{"title":"","text":"2-3 sentences"}],"actions":["specific action"]}},
  "recommendations": [{"priority":"urgent|high|moderate|low","title":"condition or theme — referral or focus","items":["specific action"]}],
  "nextSteps": [{"title":"","text":"1-2 sentences","items":[""]}]
}

Rules:
- findings: the 3-6 most important patterns, most serious first. Connect related markers (e.g. low MCV + high ferritin) rather than listing each alone.
- markerNotes: one for every result listed.
- panels: one entry for each panel id in PANEL SCORES, with exactly 3 understanding items and 5-8 actions.
- recommendations: 4-8 groups, ordered by priority, each with 3-6 items.
- nextSteps: exactly 3 groups: seeing their physician, confirmatory or follow-up tests, and supplementation or lifestyle to discuss with their doctor.
- Use the units given. Doses only where they are standard and always "discuss with your doctor" for medicines.`
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
    summary: text(parsed.summary, 1200),
    findings: (Array.isArray(parsed.findings) ? parsed.findings : []).slice(0, 8).map((item: any) => ({ priority: priority(item?.priority), title: text(item?.title, 140), detail: text(item?.detail, 500) })).filter((item: any) => item.title),
    panels: {},
    recommendations: (Array.isArray(parsed.recommendations) ? parsed.recommendations : []).slice(0, 10).map((item: any) => ({ priority: priority(item?.priority), title: text(item?.title, 140), items: list(item?.items, 8) })).filter((item: any) => item.title),
    nextSteps: (Array.isArray(parsed.nextSteps) ? parsed.nextSteps : []).slice(0, 3).map((item: any) => ({ title: text(item?.title, 120), text: text(item?.text, 500), items: list(item?.items, 6) })).filter((item: any) => item.title),
  }
  const panels = parsed.panels && typeof parsed.panels === 'object' ? parsed.panels : {}
  for (const [id, value] of Object.entries(panels)) {
    if (!PANEL_IDS.has(id as PanelId) || !value || typeof value !== 'object') continue
    const panel = value as Record<string, any>
    narrative.panels[id as PanelId] = {
      summary: text(panel.summary, 120),
      understanding: (Array.isArray(panel.understanding) ? panel.understanding : []).slice(0, 4).map((item: any) => ({ title: text(item?.title, 100), text: text(item?.text, 600) })).filter((item: any) => item.title || item.text),
      actions: list(panel.actions, 8),
    }
  }

  const notes = new Map<string, string>()
  for (const item of Array.isArray(parsed.markerNotes) ? parsed.markerNotes : []) {
    const name = text(item?.name, 120).toLowerCase()
    if (name) notes.set(name, text(item?.note, 160))
  }
  return { narrative, notes: Object.fromEntries(notes), provider }
}
