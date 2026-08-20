import { NextRequest, NextResponse } from 'next/server'
import { getEmrContext, writeEmrAudit } from '@/lib/emr'
import { extractDocumentText, generateClinicalReport, isReadable, isTextExtractable, type ReportAttachment } from '@/lib/ai/clinical-report'

// Guard rails on how much is sent to the model in one request.
const MAX_DOCUMENTS = 12
const MAX_TOTAL_BYTES = 18 * 1024 * 1024
// Text pulled out of Word files goes into the prompt itself, so it is capped in
// characters rather than bytes.
const MAX_TEXT_CHARS = 30_000
const MAX_TOTAL_TEXT_CHARS = 100_000

const date = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

function fmt(value: unknown) {
  if (!value) return null
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : date.format(parsed)
}

function section(title: string, rows: string[]) {
  return rows.length ? `\n## ${title}\n${rows.map(row => `- ${row}`).join('\n')}` : `\n## ${title}\nNone recorded.`
}

function money(value: unknown, currency = 'NGN') {
  const amount = Number(value || 0)
  try { return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount) }
  catch { return `${currency} ${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
}

function tableCell(value: unknown) {
  return String(value ?? '—').replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim() || '—'
}

function financialRecordsInRange(records: any[], from: string, to: string) {
  const start = new Date(`${from}T00:00:00`).getTime()
  const end = new Date(`${to}T23:59:59.999`).getTime()
  return records.filter(record => {
    const stamp = new Date(`${record.service_date}T00:00:00`).getTime()
    return stamp >= start && stamp <= end
  })
}

function buildFinancialReport(records: any[], from: string, to: string) {
  const selected = financialRecordsInRange(records, from, to)
  const currencies = Array.from(new Set(selected.map(record => record.currency || 'NGN')))
  const totals = currencies.map(currency => {
    const rows = selected.filter(record => (record.currency || 'NGN') === currency)
    const billed = rows.reduce((sum, record) => sum + Number(record.amount_due || 0), 0)
    const paid = rows.reduce((sum, record) => sum + Number(record.amount_paid || 0), 0)
    return { currency, billed, paid, balance: billed - paid }
  })
  const lines = [
    '## Financial Summary',
    selected.length ? `This report contains ${selected.length} financial record${selected.length === 1 ? '' : 's'} for the selected period.` : 'No financial records were recorded for the selected period.',
  ]
  if (totals.length) {
    lines.push('', '| Currency | Total billed | Total paid | Outstanding balance |', '| --- | ---: | ---: | ---: |')
    for (const total of totals) lines.push(`| ${total.currency} | ${money(total.billed, total.currency)} | ${money(total.paid, total.currency)} | ${money(total.balance, total.currency)} |`)
  }
  lines.push('', '## Payment Records')
  if (!selected.length) lines.push('None recorded.')
  else {
    lines.push('| Service date | Description | Billed | Paid | Balance | Status | Payment method | Reference |', '| --- | --- | ---: | ---: | ---: | --- | --- | --- |')
    for (const record of selected) {
      const currency = record.currency || 'NGN'
      lines.push(`| ${tableCell(fmt(record.service_date))} | ${tableCell(record.description)} | ${money(record.amount_due, currency)} | ${money(record.amount_paid, currency)} | ${money(Number(record.amount_due || 0) - Number(record.amount_paid || 0), currency)} | ${tableCell(record.status)} | ${tableCell(record.payment_method)} | ${tableCell(record.payment_reference)} |`)
    }
  }
  lines.push('', '## Status Notes')
  const outstanding = selected.filter(record => ['pending','partial','overdue'].includes(record.status))
  lines.push(outstanding.length ? `${outstanding.length} record${outstanding.length === 1 ? ' has' : 's have'} an outstanding balance.` : 'No outstanding balances are recorded for the selected period.')
  return lines.join('\n')
}

// Flattens the chart into text the model can reason over. Kept explicit rather
// than dumping raw JSON so the model sees clinical meaning, not column names.
function buildClinicalSummary(data: any, from: string, to: string) {
  const p = data.patient
  const inRange = (value: unknown) => {
    if (!value) return false
    const stamp = new Date(String(value)).getTime()
    return stamp >= new Date(from).getTime() && stamp <= new Date(`${to}T23:59:59.999Z`).getTime()
  }

  const lines: string[] = []
  lines.push(`# Patient record extract`)
  lines.push(`Patient: ${[p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ')}`)
  lines.push(`MRN: ${p.mrn} | Sex: ${p.sex} | Date of birth: ${fmt(p.date_of_birth) || 'unknown'}`)
  lines.push(`Reporting period: ${fmt(from)} to ${fmt(to)}`)

  lines.push(section('Allergies', (data.allergies || []).map((a: any) =>
    `${a.allergen}${a.reaction ? ` — reaction: ${a.reaction}` : ''} (severity: ${a.severity}, status: ${a.status})`)))

  lines.push(section('Diagnoses', (data.diagnoses || []).map((d: any) =>
    `${d.diagnosis_name}${d.icd10_code ? ` [${d.icd10_code}]` : ''} — ${d.status}, diagnosed ${fmt(d.diagnosed_at) || 'date unknown'}${d.notes ? `. Notes: ${d.notes}` : ''}`)))

  lines.push(section('Encounters in period', (data.encounters || []).filter((e: any) => inRange(e.created_at)).map((e: any) => {
    const parts = [
      `${fmt(e.created_at)} — ${e.encounter_type} (${e.status})`,
      e.chief_complaint && `Chief complaint: ${e.chief_complaint}`,
      e.history_presenting_illness && `History: ${e.history_presenting_illness}`,
      e.examination && `Examination: ${e.examination}`,
      e.clinical_assessment && `Assessment: ${e.clinical_assessment}`,
      e.treatment_plan && `Plan: ${e.treatment_plan}`,
      e.follow_up_plan && `Follow-up: ${e.follow_up_plan}`,
    ].filter(Boolean)
    return parts.join('\n  ')
  })))

  lines.push(section('Clinical notes in period', (data.notes || []).filter((n: any) => inRange(n.created_at)).map((n: any) =>
    `${fmt(n.created_at)} — ${n.note_type} (${n.status})${n.parent_note_id ? ' [amendment]' : ''}\n  ${n.content}`)))

  lines.push(section('Vital signs in period', (data.vitals || []).filter((v: any) => inRange(v.recorded_at)).map((v: any) => {
    const readings = [
      v.systolic_bp && v.diastolic_bp && `BP ${v.systolic_bp}/${v.diastolic_bp} mmHg`,
      v.heart_rate && `HR ${v.heart_rate} bpm`, v.respiratory_rate && `RR ${v.respiratory_rate}/min`,
      v.temperature_c && `Temp ${v.temperature_c}°C`, v.spo2 && `SpO2 ${v.spo2}%`,
      v.weight_kg && `Weight ${v.weight_kg} kg`, v.height_cm && `Height ${v.height_cm} cm`,
      v.bmi && `BMI ${v.bmi}`, v.blood_glucose && `Glucose ${v.blood_glucose}`,
    ].filter(Boolean).join(', ')
    return `${fmt(v.recorded_at)} — ${readings || 'no readings'}${v.notes ? `. ${v.notes}` : ''}`
  })))

  lines.push(section('Medications', (data.medications || []).map((m: any) =>
    `${m.medication_name} ${m.strength || ''} — ${m.dose}, ${m.route}, ${m.frequency}, ${m.duration} (${m.status})${m.instructions ? `. ${m.instructions}` : ''}`)))

  lines.push(section('Investigations ordered in period', (data.investigations || []).filter((i: any) => inRange(i.ordered_at || i.created_at)).map((i: any) =>
    `${fmt(i.ordered_at || i.created_at)} — ${i.test_name} (${i.category || 'uncategorised'}, ${i.status}). Indication: ${i.clinical_indication || 'not stated'}`)))

  lines.push(section('Investigation results in period', (data.results || []).filter((r: any) => inRange(r.result_date)).map((r: any) =>
    `${fmt(r.result_date)} — ${r.test_name}: ${r.result} ${r.unit || ''} (ref ${r.reference_range || 'n/a'})${r.abnormal_flag ? ` [${r.abnormal_flag}]` : ''}${r.notes ? `. ${r.notes}` : ''}`)))

  lines.push(section('Imaging in period', (data.imaging || []).filter((i: any) => inRange(i.performed_at || i.created_at)).map((i: any) =>
    `${fmt(i.performed_at || i.created_at)} — ${i.modality}${i.body_region ? ` ${i.body_region}` : ''}. Indication: ${i.indication || 'not stated'}${i.report ? `. Report: ${i.report}` : ''}`)))

  lines.push(section('Care plans', (data.carePlans || []).map((c: any) =>
    `${c.title} (${c.status}) — goals: ${c.goals || 'not stated'}`)))

  return lines.join('\n')
}

const SYSTEM_BRIEF = `You are a functional medicine clinician at FXMed writing a comprehensive care summary about a patient. The finished document is given to the patient, who may hand it on to any other health worker involved in their care, so it must read as a formal clinical record written about the patient — never as a letter addressed to the patient.

Structure the report with these headings, written exactly as shown:
## Summary of Care
## Clinical Findings
## Investigation Results Explained
## Treatment and Care Provided
## Progress Over the Period
## Current Clinical Status
## Recommended Next Steps

Voice rules — these matter more than anything else below:
- Write the whole report in the third person. Refer to the patient by name, or as "the patient", and use the pronouns consistent with the sex recorded in the chart; use "they" where the sex is not recorded.
- Never address the patient directly. The words "you", "your" and "yours" must not appear anywhere in the report.
- Refer to the clinic in the third person as well: "FXMed", "the clinical team" or "the clinician". Do not write "we", "us" or "our".
- Required voice: "Mrs Adeyemi was reviewed on 4 March 2026 for persistent fatigue. Her vitamin D was low at 18 ng/mL, and supplementation was started." Not: "You were reviewed on 4 March for your fatigue, and we started you on a supplement."

Formatting rules — this text is typeset into an official PDF, so follow them exactly:
- Use "## " for the section headings above and "### " for any sub-heading. Never use more than three hashes.
- Present any data with repeating fields as a Markdown table. Investigation results, vital sign trends and medication lists must always be tables, never prose lists. Use this form:
  | Test | Result | Reference range | What it means |
  | --- | --- | --- | --- |
  | Vitamin D | 18 ng/mL | 30-100 | Below range |
- Use "- " for genuine bullet lists only.
- Write plain professional prose. Do NOT use emojis, decorative symbols, arrows or icons anywhere.
- Do not use bold for emphasis inside sentences; let the headings and tables carry the structure.
- Do not write a title, letterhead, patient name block, date line, greeting or signature. The document template supplies all of those.

Content rules:
- The report has two readers: the patient, who has no medical training, and a health worker who has never met the patient. Both must be able to follow it. Explain each medical term in plain English the first time it appears, then use the term normally.
- Keep a warm, respectful and encouraging tone while staying in the third person. This person may have disengaged from care.
- State only facts present in the record or the attached documents. Never invent results, dates, diagnoses or values.
- Where information is missing or unclear, say so plainly rather than filling the gap.
- Quote specific values and dates wherever available.
- Do not issue a new diagnosis or change the treatment plan. Summarise what happened and what was already advised.`

export async function POST(request: NextRequest) {
  const context = await getEmrContext(request, 'view_clinical_records')
  if (!context) return NextResponse.json({ error: 'Clinical access required.' }, { status: 403 })
  const { database, user } = context

  try {
    const body = await request.json().catch(() => null) as Record<string, any> | null
    const patientId = body?.patientId
    const from = body?.from
    const to = body?.to
    const reportType = body?.reportType === 'financial' ? 'financial' : 'clinical'
    if (!patientId || !from || !to) return NextResponse.json({ error: 'A patient and date range are required.' }, { status: 400 })

    const [patient, encounters, notes, vitals, diagnoses, allergies, medications, orders, results, imaging, documents, carePlans, financialRecords] = await Promise.all([
      database.from('emr_patients').select('*').eq('id', patientId).single(),
      database.from('emr_encounters').select('*').eq('patient_id', patientId).order('created_at'),
      database.from('emr_clinical_notes').select('*').eq('patient_id', patientId).order('created_at'),
      database.from('emr_vitals').select('*').eq('patient_id', patientId).order('recorded_at'),
      database.from('emr_diagnoses').select('*').eq('patient_id', patientId).order('diagnosed_at'),
      database.from('emr_allergies').select('*').eq('patient_id', patientId),
      database.from('emr_medications').select('*').eq('patient_id', patientId).order('created_at'),
      database.from('emr_investigation_orders').select('*').eq('patient_id', patientId).order('ordered_at'),
      database.from('emr_investigation_results').select('*').eq('patient_id', patientId).order('result_date'),
      database.from('emr_imaging_records').select('*').eq('patient_id', patientId).order('created_at'),
      database.from('emr_documents').select('*').eq('patient_id', patientId).order('created_at'),
      database.from('emr_care_plans').select('*').eq('patient_id', patientId),
      database.from('emr_financial_records').select('*').eq('patient_id', patientId).order('service_date'),
    ])
    if (patient.error || !patient.data) return NextResponse.json({ error: 'Patient not found.' }, { status: 404 })
    if (financialRecords.error) throw financialRecords.error

    if (reportType === 'financial') {
      const report = buildFinancialReport(financialRecords.data || [], from, to)
      await writeEmrAudit(database, user, { action: 'generate_financial_report', entityType: 'emr_patient', entityId: patientId, patientId, metadata: { from, to } })
      return NextResponse.json({ report, provider: 'FXMed financial ledger', documentsRead: 0, skipped: [] })
    }

    const chart = {
      patient: patient.data,
      encounters: encounters.data || [], notes: notes.data || [], vitals: vitals.data || [],
      diagnoses: diagnoses.data || [], allergies: allergies.data || [], medications: medications.data || [],
      investigations: orders.data || [], results: results.data || [], imaging: imaging.data || [],
      carePlans: carePlans.data || [],
      financialRecords: financialRecords.data || [],
    }

    // Download the patient's documents so the model can read them directly.
    // Capped by count and total size to keep the request within provider limits.
    const candidates = (documents.data || []).filter((doc: any) => {
      const stamp = new Date(doc.created_at).getTime()
      return stamp >= new Date(from).getTime() && stamp <= new Date(`${to}T23:59:59.999Z`).getTime()
    })

    const attachments: ReportAttachment[] = []
    const extracted: Array<{ name: string; text: string }> = []
    const skipped: string[] = []
    let total = 0
    let totalText = 0
    for (const doc of candidates) {
      const readable = isReadable(doc.mime_type)
      const extractable = isTextExtractable(doc.mime_type)
      if (attachments.length + extracted.length >= MAX_DOCUMENTS) { skipped.push(`${doc.title} (document limit reached)`); continue }
      if (!readable && !extractable) { skipped.push(`${doc.title} (${doc.mime_type} cannot be read directly)`); continue }
      const { data: blob, error } = await database.storage.from('emr-documents').download(doc.storage_path)
      if (error || !blob) { skipped.push(`${doc.title} (download failed)`); continue }
      const bytes = Buffer.from(await blob.arrayBuffer())

      if (extractable) {
        // Word files are converted to text here because no provider reads them.
        let text = ''
        try { text = await extractDocumentText(doc.mime_type, bytes) }
        catch (readError) { skipped.push(`${doc.title} (${readError instanceof Error ? readError.message : 'Word file could not be opened'})`); continue }
        if (!text) { skipped.push(`${doc.title} (no readable text in the Word file)`); continue }
        if (totalText >= MAX_TOTAL_TEXT_CHARS) { skipped.push(`${doc.title} (text limit reached)`); continue }
        const room = Math.min(MAX_TEXT_CHARS, MAX_TOTAL_TEXT_CHARS - totalText)
        const trimmed = text.length > room ? `${text.slice(0, room)}\n[Document truncated at ${room} characters.]` : text
        totalText += trimmed.length
        extracted.push({ name: doc.title, text: trimmed })
        continue
      }

      if (total + bytes.length > MAX_TOTAL_BYTES) { skipped.push(`${doc.title} (size limit reached)`); continue }
      total += bytes.length
      attachments.push({ name: doc.title, mimeType: doc.mime_type, base64: bytes.toString('base64') })
    }

    const describe = (title: string) => {
      if (attachments.some(a => a.name === title)) return ' — attached in full below'
      if (extracted.some(e => e.name === title)) return ' — text extracted below'
      return ' — referenced only'
    }
    const manifest = candidates.length
      ? `\n## Attached documents\n${candidates.map((d: any) => `- ${d.title} (${d.category}, ${fmt(d.created_at)})${describe(d.title)}`).join('\n')}`
      : '\n## Attached documents\nNone uploaded in this period.'

    // Word documents have no file representation the model can open, so their
    // text is carried in the prompt body.
    const wordText = extracted.length
      ? `\n\n---\n\n# Text extracted from uploaded Word documents\n${extracted.map(d => `\n## Document: ${d.name}\n${d.text}`).join('\n')}`
      : ''

    const prompt = `${SYSTEM_BRIEF}\n\n---\n\n${buildClinicalSummary(chart, from, to)}${manifest}${wordText}\n\n---\n\n${attachments.length ? `The ${attachments.length} document(s) attached to this message are this patient's uploaded clinical files. Read them and incorporate their findings.` : 'No documents were attached to this message.'}${extracted.length ? ` The text extracted from ${extracted.length} Word document(s) appears above; treat it as this patient's uploaded clinical files and incorporate its findings. Rows written as "| a | b | c |" came from tables in those documents.` : ''}\n\nWrite the report now.`

    const { report: clinicalReport, provider } = await generateClinicalReport(prompt, attachments)
    // Financial figures are appended from the ledger rather than rewritten by
    // the model, so the billed, paid and outstanding amounts remain exact.
    const report = `${clinicalReport.trim()}\n\n${buildFinancialReport(financialRecords.data || [], from, to)}`

    await writeEmrAudit(database, user, {
      action: 'generate_patient_report',
      entityType: 'emr_patient',
      entityId: patientId,
      patientId,
      metadata: { from, to, provider, documentsRead: attachments.length, documentsExtracted: extracted.length, documentsSkipped: skipped.length },
    })

    return NextResponse.json({ report, provider, documentsRead: attachments.length + extracted.length, skipped })
  } catch (error) {
    console.error('Report generation failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Report generation failed.' }, { status: 500 })
  }
}
