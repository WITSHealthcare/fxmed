import { NextRequest, NextResponse } from 'next/server'
import { extractDocumentText, generateClinicalReport, type ReportAttachment } from '@/lib/ai/clinical-report'
import { getEmrContext, isUuid, writeEmrAudit } from '@/lib/emr'

export const runtime = 'nodejs'

const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_TRANSCRIPT_CHARS = 60_000
const ENCOUNTER_FIELDS = [
  'chief_complaint', 'history_presenting_illness', 'past_medical_history',
  'surgical_history', 'family_history', 'social_history', 'review_of_systems',
  'examination', 'clinical_assessment', 'treatment_plan', 'follow_up_plan',
] as const

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) return fenced[1]
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return start >= 0 && end > start ? text.slice(start, end + 1) : text
}

function fileKind(file: File) {
  const extension = file.name.toLowerCase().split('.').pop()
  if (file.type === 'text/plain' || extension === 'txt') return 'text'
  if (file.type === 'application/pdf' || extension === 'pdf') return 'pdf'
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extension === 'docx') return 'docx'
  return null
}

export async function POST(request: NextRequest) {
  const context = await getEmrContext(request, 'create_encounters')
  if (!context) return NextResponse.json({ error: 'You are not authorized to draft encounter fields.' }, { status: 403 })

  try {
    const data = await request.formData()
    const pasted = String(data.get('transcript') || '').trim()
    const patientId = String(data.get('patient_id') || '')
    const fileValue = data.get('file')
    const file = fileValue instanceof File && fileValue.size ? fileValue : null

    if (patientId && !isUuid(patientId)) return NextResponse.json({ error: 'Select a valid patient.' }, { status: 400 })
    if (!pasted && !file) return NextResponse.json({ error: 'Paste a transcript or choose a transcript file.' }, { status: 400 })
    if (file && file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'Transcript files must be 8 MB or smaller.' }, { status: 400 })

    let transcript = pasted
    const attachments: ReportAttachment[] = []
    if (file) {
      const kind = fileKind(file)
      if (!kind) return NextResponse.json({ error: 'Upload a TXT, DOCX, or PDF transcript.' }, { status: 400 })
      const bytes = Buffer.from(await file.arrayBuffer())
      if (kind === 'text') transcript += `\n\n${bytes.toString('utf8')}`
      if (kind === 'docx') transcript += `\n\n${await extractDocumentText('application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes)}`
      if (kind === 'pdf') {
        if (!process.env.GOOGLE_AI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
          return NextResponse.json({ error: 'PDF transcript reading requires Gemini or Claude to be configured. Upload TXT or DOCX instead.' }, { status: 400 })
        }
        attachments.push({ name: file.name, mimeType: 'application/pdf', base64: bytes.toString('base64') })
      }
    }

    transcript = transcript.trim().slice(0, MAX_TRANSCRIPT_CHARS)
    const prompt = `You are assisting a licensed clinician with clinical documentation. Convert the encounter transcript into a concise draft for the EMR.

Safety rules:
- Use only facts explicitly stated in the transcript. Never invent, diagnose, or infer missing facts.
- Preserve uncertainty, attribution, and negation (for example, "patient denies chest pain").
- Distinguish patient-reported history from clinician findings.
- Put information only in the most appropriate field; do not duplicate it across fields.
- If a field is not supported by the transcript, return an empty string.
- Do not include commentary, warnings, Markdown, or any keys beyond those specified.

Return ONLY valid JSON with exactly these string fields:
${JSON.stringify(Object.fromEntries(ENCOUNTER_FIELDS.map(field => [field, ''])), null, 2)}

${transcript ? `TRANSCRIPT TEXT:\n${transcript}` : 'The transcript is in the attached PDF.'}`

    const { report, provider } = await generateClinicalReport(prompt, attachments)
    const parsed = JSON.parse(extractJsonObject(report)) as Record<string, unknown>
    const draft = Object.fromEntries(ENCOUNTER_FIELDS.map(field => [field, typeof parsed[field] === 'string' ? parsed[field].trim().slice(0, 10_000) : '']))

    await writeEmrAudit(context.database, context.user, {
      action: 'draft_encounter_from_transcript',
      entityType: 'emr_encounter',
      patientId: patientId || null,
      metadata: { provider, source: file ? fileKind(file) : 'pasted_text', fieldsDrafted: Object.values(draft).filter(Boolean).length },
    })

    return NextResponse.json({ draft, provider })
  } catch (error) {
    console.error('Encounter transcript drafting failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to draft encounter fields.' }, { status: 500 })
  }
}
