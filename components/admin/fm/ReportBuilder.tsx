'use client'

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { ArrowCounterClockwiseIcon, DownloadSimpleIcon, FloppyDiskIcon, ListChecksIcon, PlusIcon, SparkleIcon, TrashIcon } from '@phosphor-icons/react'
import { PAGE_H, PAGE_W, buildFmReportPages, fitPage, renderFmReportPdf } from '@/lib/fmAnalysisPdf'
import { PLAN_PARTS, analyse, defaultFindings, defaultNextSteps, defaultRecommendations, defaultSummary, planFor } from '@/lib/fmAssessment'
import { type AreaPlan, type FmEntry, type FmNarrative, type FmPatient, type Priority } from '@/lib/fmBiomarkers'
import { inputClass } from './ResultsEntry'

// Step three: the report. Every section has standard wording worked out from
// the results, so it is complete without the AI; the AI can personalise the
// summary, findings, priority actions and next steps, and the clinician can
// edit all of it, including each improvement area's plan. The report is
// previewed page by page exactly as it will print.

const PRIORITIES: Priority[] = ['urgent', 'high', 'moderate', 'low']
const lines = (value: string) => value.split('\n').map(line => line.trim()).filter(Boolean)

function Card({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-[20px] border border-green-deep/10 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-bold text-green-deep">{title}</h4>{subtitle && <p className="mt-1 text-xs text-text-mid">{subtitle}</p>}</div>{action}</div>
    <div className="mt-4">{children}</div>
  </section>
}

/** A list edited as one item per line. Holds its own text so blank lines survive typing. */
function LinesField({ value, onChange, rows = 5, placeholder }: { value: string[]; onChange: (items: string[]) => void; rows?: number; placeholder?: string }) {
  const [text, setText] = useState(value.join('\n'))
  const last = useRef(value)
  useEffect(() => { if (value !== last.current) { last.current = value; if (lines(text).join('\n') !== value.join('\n')) setText(value.join('\n')) } }, [value, text])
  return <textarea value={text} rows={rows} placeholder={placeholder} onChange={event => { setText(event.target.value); const items = lines(event.target.value); last.current = items; onChange(items) }} className={`${inputClass} text-[13px]`} />
}

function PrioritySelect({ value, onChange }: { value: Priority; onChange: (value: Priority) => void }) {
  return <select value={value} onChange={event => onChange(event.target.value as Priority)} className={`${inputClass} w-32`}>{PRIORITIES.map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select>
}

function Preview({ pages }: { pages: string[] }) {
  const host = useRef<HTMLDivElement>(null)
  const scale = 0.62
  useEffect(() => { host.current?.querySelectorAll<HTMLElement>('[data-fm-page]').forEach(fitPage) }, [pages])
  return <div ref={host} className="grid justify-center gap-5 rounded-[20px] bg-[#E9EFEC] p-5 xl:grid-cols-2">
    {pages.map((html, index) => <div key={index} className="overflow-hidden rounded bg-white shadow-lg" style={{ width: PAGE_W * scale, height: PAGE_H * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: PAGE_W, height: PAGE_H }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>)}
  </div>
}

export default function ReportBuilder({ patient, entries, setEntries, narrative, setNarrative, emrPatientId, onSaveAnalysis }: {
  patient: FmPatient
  entries: FmEntry[]
  setEntries: Dispatch<SetStateAction<FmEntry[]>>
  narrative: FmNarrative
  setNarrative: Dispatch<SetStateAction<FmNarrative>>
  emrPatientId: string | null
  onSaveAnalysis: (status?: 'draft' | 'final') => Promise<boolean>
}) {
  const [context, setContext] = useState('')
  const [busy, setBusy] = useState<'' | 'interpret' | 'pdf' | 'record'>('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showPreview, setShowPreview] = useState(true)
  const analysis = useMemo(() => analyse(entries, patient.sex), [entries, patient.sex])
  const summary = analysis.summary
  const pages = useMemo(() => showPreview ? buildFmReportPages({ patient, entries, narrative }) : [], [patient, entries, narrative, showPreview])
  const update = (changes: Partial<FmNarrative>) => setNarrative(current => ({ ...current, ...changes }))
  const updatePlan = (id: string, plan: AreaPlan | null) => setNarrative(current => {
    const areaPlans = { ...current.areaPlans }
    if (plan) areaPlans[id] = plan
    else delete areaPlans[id]
    return { ...current, areaPlans }
  })

  function startFromAnalysis() {
    if ((narrative.summary || narrative.findings.length || narrative.recommendations.length) && !window.confirm('Replace the summary, findings, priority actions and next steps with the standard wording from the analysis?')) return
    setNarrative(current => ({ ...current, summary: defaultSummary(analysis), findings: defaultFindings(analysis), recommendations: defaultRecommendations(analysis), nextSteps: defaultNextSteps(analysis) }))
    setNotice('Standard wording added. Edit anything below before issuing the report.')
  }

  async function interpret() {
    if (narrative.findings.length && !window.confirm('Replace the current interpretation and marker notes with a new one?')) return
    setError(''); setNotice(''); setBusy('interpret')
    try {
      const response = await fetch('/api/admin/fm-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'interpret', patient, entries, context }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The interpretation could not be written.')
      // Keep the clinician's edits to the improvement area plans.
      setNarrative(current => ({ ...result.narrative, areaPlans: current.areaPlans }))
      const notes: Record<string, string> = result.notes || {}
      setEntries(current => current.map(entry => ({ ...entry, note: notes[entry.name.toLowerCase()] || entry.note })))
      setNotice('Interpretation written. Review and edit it before issuing the report.')
    } catch (interpretError) {
      setError(interpretError instanceof Error ? interpretError.message : 'The interpretation could not be written.')
    } finally {
      setBusy('')
    }
  }

  const fileName = `FXMed-Functional-Health-Report-${(patient.name || 'patient').replace(/[^a-z0-9]+/gi, '-')}-${patient.collectedAt || new Date().toISOString().slice(0, 10)}.pdf`

  async function download() {
    setError(''); setBusy('pdf')
    try {
      const blob = await renderFmReportPdf({ patient, entries, narrative })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = fileName; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (pdfError) {
      console.error(pdfError)
      setError('The PDF could not be generated.')
    } finally {
      setBusy('')
    }
  }

  async function saveToRecord() {
    if (!emrPatientId) return
    setError(''); setNotice(''); setBusy('record')
    try {
      if (!await onSaveAnalysis('final')) throw new Error('Save the analysis first.')
      const blob = await renderFmReportPdf({ patient, entries, narrative })
      const form = new FormData()
      form.append('file', new File([blob], fileName, { type: 'application/pdf' }))
      form.append('patient_id', emrPatientId)
      form.append('category', 'laboratory')
      form.append('title', `Functional Health Report${patient.collectedAt ? ` — ${patient.collectedAt}` : ''}`)
      form.append('notes', `${summary.total} biomarkers analysed against functional medicine optimal ranges.`)
      const response = await fetch('/api/admin/emr', { method: 'POST', body: form })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'The report could not be saved to the patient record.')
      setNotice('Report saved to the patient\'s documents and the analysis marked final.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The report could not be saved.')
    } finally {
      setBusy('')
    }
  }

  if (!summary.total) return <div className="rounded-[20px] border border-green-deep/10 bg-white p-10 text-center text-sm text-text-mid">Enter or import results before writing the report.</div>

  return <div className="space-y-6">
    <Card title="Interpretation" subtitle="Statuses, likelihood scores and each area's plan are calculated from the results, so the report is complete as it is: any section left empty uses the standard wording. The AI can personalise the summary, findings, priority actions and next steps. Everything can be edited."
      action={<div className="flex flex-wrap gap-2">
        <button type="button" onClick={startFromAnalysis} disabled={!!busy} className="secondary disabled:opacity-50"><ListChecksIcon size={16} />Start from the analysis</button>
        <button type="button" onClick={interpret} disabled={!!busy} className="primary disabled:opacity-50">{busy === 'interpret' ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Writing…</> : <><SparkleIcon size={16} />{narrative.findings.length ? 'Rewrite with AI' : 'Write with AI'}</>}</button>
      </div>}>
      <label className="text-xs font-semibold text-text-mid">Clinical context for the AI (optional — symptoms, history, medications)
        <textarea value={context} onChange={event => setContext(event.target.value)} rows={3} placeholder="e.g. 62F, fatigue and dizziness for 6 months, on atorvastatin 20 mg, no steroid use" className={`${inputClass} mt-1`} />
      </label>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      <label className="mt-4 block text-xs font-semibold text-text-mid">Overall summary (results at a glance)<textarea value={narrative.summary} onChange={event => update({ summary: event.target.value })} rows={3} placeholder={defaultSummary(analysis)} className={`${inputClass} mt-1`} /></label>
    </Card>

    <Card title="Key findings" subtitle="Up to four appear on the results-at-a-glance page. Left empty, the report lists alarm results and the top improvement areas."
      action={<button type="button" className="secondary" onClick={() => update({ findings: [...narrative.findings, { priority: 'high', title: '', detail: '' }] })}><PlusIcon size={16} />Finding</button>}>
      <div className="space-y-3">{narrative.findings.map((item, index) => <div key={index} className="grid gap-2 rounded-xl bg-cream/30 p-3 sm:grid-cols-[8rem_1fr_2rem]">
        <PrioritySelect value={item.priority} onChange={priority => update({ findings: narrative.findings.map((f, i) => i === index ? { ...f, priority } : f) })} />
        <div className="space-y-2"><input value={item.title} placeholder="Headline, e.g. Adrenal insufficiency — AM cortisol 3.7 nmol/L" onChange={event => update({ findings: narrative.findings.map((f, i) => i === index ? { ...f, title: event.target.value } : f) })} className={`${inputClass} font-semibold`} />
          <textarea value={item.detail} rows={2} onChange={event => update({ findings: narrative.findings.map((f, i) => i === index ? { ...f, detail: event.target.value } : f) })} className={inputClass} /></div>
        <button type="button" aria-label="Remove finding" onClick={() => update({ findings: narrative.findings.filter((_, i) => i !== index) })} className="flex h-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"><TrashIcon size={16} /></button>
      </div>)}{!narrative.findings.length && <p className="text-sm text-text-mid">None written — the report will use {defaultFindings(analysis).length} standard findings from the analysis.</p>}</div>
    </Card>

    <Card title="Health improvement plan" subtitle={`${analysis.plan.length} area${analysis.plan.length === 1 ? '' : 's'} at 50% likelihood or more, each with its own page. Edit any area's plan (one point per line); the standard plan is used until you do.`}>
      <div className="space-y-2">{analysis.plan.map(item => {
        const plan = planFor(item.area, narrative)
        const edited = !!narrative.areaPlans?.[item.area.id]
        return <details key={item.area.id} className="rounded-xl border border-green-deep/10">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-green-deep">{item.area.name}<span className="ml-2 text-xs font-normal text-text-mid">{item.score}%{item.urgent ? ' · alarm marker' : ''} · {item.contributors.map(({ entry, direction }) => `${entry.name} ${direction === 'low' ? '↓' : '↑'}`).join(', ')}{edited ? ' · edited' : ''}</span></summary>
          <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
            {PLAN_PARTS.map(part => <label key={part.key} className="block text-xs font-semibold" style={{ color: part.color }}>{part.title}
              <LinesField value={plan[part.key]} rows={4} onChange={items => updatePlan(item.area.id, { ...plan, [part.key]: items })} placeholder="One point per line" /></label>)}
            {edited && <button type="button" onClick={() => updatePlan(item.area.id, null)} className="inline-flex items-center gap-1.5 justify-self-start text-xs font-semibold text-green-mid underline underline-offset-2"><ArrowCounterClockwiseIcon size={14} />Restore the standard plan</button>}
          </div>
        </details>
      })}{!analysis.plan.length && <p className="text-sm text-text-mid">No improvement area reached 50%.</p>}</div>
    </Card>

    <Card title="Priority actions" subtitle="Shown six to a page, in this order. Left empty, the report lists the key actions from each improvement area."
      action={<button type="button" className="secondary" onClick={() => update({ recommendations: [...narrative.recommendations, { priority: 'moderate', title: '', items: [] }] })}><PlusIcon size={16} />Recommendation</button>}>
      <div className="space-y-3">{narrative.recommendations.map((item, index) => <div key={index} className="grid gap-2 rounded-xl bg-cream/30 p-3 sm:grid-cols-[8rem_1fr_2rem]">
        <PrioritySelect value={item.priority} onChange={priority => update({ recommendations: narrative.recommendations.map((r, i) => i === index ? { ...r, priority } : r) })} />
        <div className="space-y-2"><input value={item.title} placeholder="e.g. Stage 3A CKD — Nephrology referral" onChange={event => update({ recommendations: narrative.recommendations.map((r, i) => i === index ? { ...r, title: event.target.value } : r) })} className={`${inputClass} font-semibold`} />
          <LinesField value={item.items} rows={4} onChange={items => update({ recommendations: narrative.recommendations.map((r, i) => i === index ? { ...r, items } : r) })} placeholder="One action per line" /></div>
        <button type="button" aria-label="Remove recommendation" onClick={() => update({ recommendations: narrative.recommendations.filter((_, i) => i !== index) })} className="flex h-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"><TrashIcon size={16} /></button>
      </div>)}{!narrative.recommendations.length && <p className="text-sm text-text-mid">None written — the report will use {defaultRecommendations(analysis).length} standard priority actions.</p>}</div>
    </Card>

    <Card title="Next steps" subtitle="Up to three. Left empty, the report uses standard next steps: clinician review, follow-up tests and the foundations."
      action={narrative.nextSteps.length < 3 ? <button type="button" className="secondary" onClick={() => update({ nextSteps: [...narrative.nextSteps, { title: '', text: '', items: [] }] })}><PlusIcon size={16} />Next step</button> : undefined}>
      <div className="space-y-3">{narrative.nextSteps.map((item, index) => <div key={index} className="grid gap-2 rounded-xl bg-cream/30 p-3 sm:grid-cols-[1fr_2rem]">
        <div className="space-y-2"><input value={item.title} placeholder="e.g. Schedule an urgent appointment with your physician" onChange={event => update({ nextSteps: narrative.nextSteps.map((s, i) => i === index ? { ...s, title: event.target.value } : s) })} className={`${inputClass} font-semibold`} />
          <textarea value={item.text} rows={2} onChange={event => update({ nextSteps: narrative.nextSteps.map((s, i) => i === index ? { ...s, text: event.target.value } : s) })} className={inputClass} />
          <LinesField value={item.items} rows={3} onChange={items => update({ nextSteps: narrative.nextSteps.map((s, i) => i === index ? { ...s, items } : s) })} placeholder="One point per line" /></div>
        <button type="button" aria-label="Remove next step" onClick={() => update({ nextSteps: narrative.nextSteps.filter((_, i) => i !== index) })} className="flex h-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"><TrashIcon size={16} /></button>
      </div>)}</div>
    </Card>

    <Card title={`Report preview — ${pages.length || '…'} pages, US Letter`} subtitle="Exactly as the PDF will print."
      action={<div className="flex flex-wrap gap-2">
        <button type="button" className="secondary" onClick={() => setShowPreview(value => !value)}>{showPreview ? 'Hide preview' : 'Show preview'}</button>
        <button type="button" className="secondary disabled:opacity-50" disabled={!!busy} onClick={download}><DownloadSimpleIcon size={16} />{busy === 'pdf' ? 'Generating…' : 'Download PDF'}</button>
        {emrPatientId && <button type="button" className="primary disabled:opacity-50" disabled={!!busy} onClick={saveToRecord}><FloppyDiskIcon size={16} />{busy === 'record' ? 'Saving…' : 'Issue to patient record'}</button>}
      </div>}>
      {showPreview && <Preview pages={pages} />}
    </Card>
  </div>
}
