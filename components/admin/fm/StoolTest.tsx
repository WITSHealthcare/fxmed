'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ClipboardTextIcon, FileArrowUpIcon, PlusIcon, WarningIcon, XIcon } from '@phosphor-icons/react'
import { StatusChip, type ChipTone } from '@/components/charts'
import {
  STOOL_MARKERS, STOOL_SECTIONS, STOOL_STATUS_LABEL, createStoolEntry, emptyStoolTest, stoolNeedsReview, stoolOutOfRange, stoolStatus,
  type StoolEntry, type StoolStatus, type StoolTest,
} from '@/lib/stoolMarkers'
import { inputClass } from './ResultsEntry'

// The patient's stool test (GI-MAP), kept beside the blood results on the
// Results step. Each result is read against the lab's own printed reference;
// it never changes the blood markers' scores. See lib/stoolMarkers.ts.

const api = '/api/admin/fm-analysis'
const UPLOAD_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

const keyOf = (entry: StoolEntry) => entry.markerId || entry.name.trim().toLowerCase()

/** Adds what a new reading found: new markers are added, and a result read again replaces the old one. */
export function mergeStool(current: StoolTest | null, incoming: StoolTest) {
  const base = current || emptyStoolTest()
  const entries = [...base.entries]
  let added = 0, updated = 0
  for (const entry of incoming.entries) {
    const index = entries.findIndex(item => keyOf(item) === keyOf(entry))
    if (index < 0) { entries.push(entry); added += 1 }
    else if (entry.value.trim() && (entries[index].value !== entry.value || entries[index].reference !== entry.reference)) { entries[index] = { ...entries[index], value: entry.value, reference: entry.reference || entries[index].reference, unit: entry.unit || entries[index].unit }; updated += 1 }
  }
  return {
    test: { lab: base.lab || incoming.lab, collectedAt: base.collectedAt || incoming.collectedAt, accession: base.accession || incoming.accession, entries },
    added, updated,
  }
}

function toneOf(entry: StoolEntry, status: StoolStatus): ChipTone {
  if (stoolNeedsReview(entry, status)) return 'flag'
  if (stoolOutOfRange(status)) return 'watch'
  return status === 'unknown' ? 'nodata' : 'clear'
}

type RecordFile = { id: string; title: string; createdAt: string }

export default function StoolTestCard({ stool, onChange, emrPatientId }: { stool: StoolTest | null; onChange: (next: StoolTest | null) => void; emrPatientId: string | null }) {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload')
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [onlyOut, setOnlyOut] = useState(false)
  const [files, setFiles] = useState<RecordFile[]>([])
  const input = useRef<HTMLInputElement>(null)

  // Lab reports already in the patient's documents can be read as the stool test.
  useEffect(() => {
    if (!emrPatientId) return
    let cancelled = false
    fetch(`${api}?patientId=${emrPatientId}`).then(response => response.ok ? response.json() : null)
      .then(result => { if (!cancelled) setFiles((result?.files || []).slice(0, 6)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [emrPatientId])

  const rows = useMemo(() => (stool?.entries || []).map((entry, index) => ({ entry, index, status: stoolStatus(entry) })), [stool])
  const review = rows.filter(row => stoolNeedsReview(row.entry, row.status))
  const outOfRange = rows.filter(row => stoolOutOfRange(row.status))
  const filled = rows.filter(row => row.entry.value.trim()).length

  function received(incoming: StoolTest, source: string) {
    if (!incoming.entries.length) throw new Error('No stool results could be read from this report. Check it is a stool test, or enter the results by hand.')
    const merge = mergeStool(stool, incoming)
    onChange(merge.test)
    setNotice(`Read ${incoming.entries.length} stool result${incoming.entries.length === 1 ? '' : 's'} from ${source}: ${merge.added} added, ${merge.updated} updated. Check each value against the lab report.`)
  }

  async function run(task: () => Promise<void>) {
    setError(''); setNotice(''); setBusy(true)
    try { await task() } catch (readError) { setError(readError instanceof Error ? readError.message : 'The stool test could not be read.') } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const upload = (chosen: File[]) => run(async () => {
    const reports = chosen.filter(file => UPLOAD_TYPES.includes(file.type))
    if (!reports.length) throw new Error('Upload the stool test as a PDF or photos (JPG, PNG, WEBP).')
    const form = new FormData()
    reports.forEach(file => form.append('files', file))
    form.append('kind', 'stool')
    const response = await fetch(api, { method: 'POST', body: form })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'The stool test could not be read.')
    received(result.test, reports.map(file => file.name).join(', '))
  })

  const readPasted = () => run(async () => {
    const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'extract', kind: 'stool', text: pasted }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'The stool test could not be read.')
    received(result.test, 'pasted text')
    setPasted('')
  })

  const readRecord = (file: RecordFile) => run(async () => {
    const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read_record', kind: 'stool', patientId: emrPatientId, documentIds: [file.id] }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'The stool test could not be read.')
    received(result.test, `the patient's record (${file.title})`)
  })

  const blank = () => { setNotice(''); onChange(mergeStool(stool, { ...emptyStoolTest(), entries: STOOL_MARKERS.map(marker => createStoolEntry(marker)) }).test) }
  const update = (index: number, changes: Partial<StoolEntry>) => stool && onChange({ ...stool, entries: stool.entries.map((entry, i) => i === index ? { ...entry, ...changes } : entry) })
  const remove = (index: number) => stool && onChange({ ...stool, entries: stool.entries.filter((_, i) => i !== index) })
  const setMeta = (field: 'lab' | 'collectedAt' | 'accession', value: string) => stool && onChange({ ...stool, [field]: value })

  const sections = STOOL_SECTIONS.map(section => ({ section, items: rows.filter(row => row.entry.section === section.id && (!onlyOut || stoolOutOfRange(row.status))) })).filter(group => group.items.length)

  return <section className="clinic-card rounded-card p-5 sm:p-6" aria-labelledby="stool-test-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-2xl">
        <h4 id="stool-test-title" className="text-lg text-clinic-ink">Stool test</h4>
        <p className="mt-1 text-sm text-clinic-muted">A GI-MAP stool test, kept beside the blood results. Each result is read against the lab&apos;s own printed reference; it does not change the blood markers&apos; scores.</p>
      </div>
      {stool && <button type="button" onClick={() => { if (window.confirm('Remove the stool test from this analysis?')) onChange(null) }} className="secondary">Remove stool test</button>}
    </div>

    {stool && <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="text-xs font-semibold text-clinic-muted">Test<input value={stool.lab} onChange={event => setMeta('lab', event.target.value)} className={`${inputClass} mt-1`} /></label>
      <label className="text-xs font-semibold text-clinic-muted">Collected<input value={stool.collectedAt} onChange={event => setMeta('collectedAt', event.target.value)} placeholder="e.g. 2 Sep 2026" className={`${inputClass} mt-1`} /></label>
      <label className="text-xs font-semibold text-clinic-muted">Accession<input value={stool.accession} onChange={event => setMeta('accession', event.target.value)} className={`${inputClass} mt-1`} /></label>
    </div>}

    {review.length > 0 && <div role="alert" className="mt-4 flex gap-3 rounded-[18px] bg-[#f6dcd9] p-4 text-sm text-[#7d2a24]">
      <WarningIcon size={20} weight="fill" className="mt-0.5 shrink-0" />
      <div><p className="font-semibold">Review with the clinician before anything else</p>
        <p className="mt-1">{review.map(row => row.entry.name).join(', ')} {review.length === 1 ? 'is' : 'are'} above the lab&apos;s threshold. Findings like these need a clinical decision; the report will never suggest treatment for them on its own.</p></div>
    </div>}

    <div className="mt-4 rounded-[20px] bg-clinic-bg/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-clinic-ink">{stool ? 'Import another page or report' : 'Read the stool test'}</p>
        <div className="flex rounded-full bg-clinic-card p-1 text-xs">{(['upload', 'paste'] as const).map(item => <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-full px-3 py-1.5 font-medium ${mode === item ? 'bg-clinic-forest text-white' : 'text-clinic-muted'}`}>{item === 'upload' ? 'Upload file' : 'Paste text'}</button>)}</div>
      </div>
      {mode === 'upload'
        ? <button type="button" disabled={busy} onClick={() => input.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void upload(Array.from(event.dataTransfer.files)) }}
            className="mt-3 flex w-full flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-clinic-ink/15 px-4 py-6 text-center transition hover:border-clinic-sage disabled:opacity-60">
            {busy ? <span className="h-7 w-7 animate-spin rounded-full border-2 border-clinic-ink/10 border-t-clinic-sage" /> : <FileArrowUpIcon size={30} className="text-clinic-sage" />}
            <span className="mt-2 text-sm font-medium text-clinic-ink">{busy ? 'Reading the stool test…' : 'Drop the GI-MAP report here, or click to choose'}</span>
            <span className="mt-1 text-xs text-clinic-muted">PDF or photos of each page, read with AI. Files are not stored.</span>
          </button>
        : <div className="mt-3 space-y-3">
            <textarea value={pasted} onChange={event => setPasted(event.target.value)} rows={6} placeholder={'Paste the results as they appear on the report, e.g.\nC. difficile Toxin A  1.13e7  < 1.00e3\nCalprotectin  467  < 173 ug/g'} className={inputClass} />
            <button type="button" disabled={busy || pasted.trim().length < 10} onClick={readPasted} className="primary disabled:opacity-50"><ClipboardTextIcon size={16} />{busy ? 'Reading…' : 'Read results'}</button>
          </div>}
      {files.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-clinic-muted">From the patient&apos;s record:{files.map(file => <button key={file.id} type="button" disabled={busy} onClick={() => readRecord(file)} className="rounded-full bg-clinic-card px-3 py-1.5 font-medium text-clinic-ink hover:bg-white disabled:opacity-50">{file.title}</button>)}</div>}
      <input ref={input} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" className="hidden" onChange={event => void upload(Array.from(event.target.files || []))} />
      {!stool && <button type="button" onClick={blank} className="mt-3 text-xs font-medium text-clinic-ink underline underline-offset-2"><PlusIcon size={12} className="mr-1 inline" />Or enter by hand on a blank GI-MAP</button>}
    </div>

    {error && <p role="alert" className="mt-3 rounded-[14px] bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-3 rounded-[14px] bg-[#e3ecd5] px-3 py-2 text-sm text-[#3f6a28]">{notice}</p>}

    {stool && <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-clinic-muted">{filled} of {rows.length} markers have a result · <span className="font-medium text-clinic-ink">{outOfRange.length} outside the lab&apos;s reference</span></p>
        <label className="flex items-center gap-2 text-xs font-medium text-clinic-muted"><input type="checkbox" checked={onlyOut} onChange={event => setOnlyOut(event.target.checked)} className="h-4 w-4 accent-[#13261a]" />Show only results outside reference</label>
      </div>
      <div className="mt-3 space-y-4">{sections.map(({ section, items }) => <div key={section.id}>
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-clinic-muted">{section.name}</p>
        <div className="mt-1.5 divide-y divide-clinic-ink/[0.06] rounded-[16px] bg-clinic-bg/50">{items.map(({ entry, index, status }) => <div key={index} className="grid grid-cols-2 items-center gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.5fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_2rem]">
          {/* On phones: the name, then result and reference side by side, then the status. */}
          <p className="col-span-2 text-sm text-clinic-ink sm:col-span-1">{entry.name}{entry.unit && <span className="ml-1.5 text-xs text-clinic-muted sm:hidden">{entry.unit}</span>}</p>
          <input aria-label={`Result for ${entry.name}`} value={entry.value} onChange={event => update(index, { value: event.target.value })} placeholder="e.g. <dl" className={`${inputClass} py-2 font-semibold`} />
          <span className="hidden text-xs text-clinic-muted sm:block">{entry.unit}</span>
          <input aria-label={`Reference for ${entry.name}`} value={entry.reference} onChange={event => update(index, { reference: event.target.value })} className={`${inputClass} py-2 text-xs`} />
          <span>{entry.value.trim() ? <StatusChip tone={toneOf(entry, status)}>{STOOL_STATUS_LABEL[status]}</StatusChip> : <span className="text-xs text-clinic-muted">—</span>}</span>
          <button type="button" aria-label={`Remove ${entry.name}`} onClick={() => remove(index)} className="flex h-8 w-8 items-center justify-center justify-self-end rounded-full text-clinic-muted hover:bg-white hover:text-red-600"><XIcon size={14} /></button>
        </div>)}</div>
      </div>)}{onlyOut && !sections.length && <p className="text-sm text-clinic-muted">Every result is within the lab&apos;s reference.</p>}</div>
    </>}
  </section>
}
