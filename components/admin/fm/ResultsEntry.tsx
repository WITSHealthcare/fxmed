'use client'

import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { ClipboardTextIcon, FileArrowUpIcon, MagnifyingGlassIcon, PlusIcon, SparkleIcon, XIcon } from '@phosphor-icons/react'
import {
  FM_BIOMARKERS, FM_PANELS, FM_STATUS_LABEL, LAB_STATUS_LABEL, STATUS_COLOR, assessEntry, createEntry, defaultRanges, markerById, matchBiomarker,
  type FmEntry, type FmPatient, type PanelId, type Sex,
} from '@/lib/fmBiomarkers'

// Lab results go in three ways: typed into the table, read by AI from an
// uploaded PDF or photo of the lab's report, or pasted as text. A CSV
// (name, value, unit, range) is read here in the browser without AI.

export const inputClass = 'w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm text-green-deep focus:border-green-deep focus:outline-none'
const UPLOAD_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

const entryKey = (entry: Pick<FmEntry, 'markerId' | 'name'>) => entry.markerId || entry.name.trim().toLowerCase()

/** Adds read results to the table: a marker already there takes the new value. */
export function mergeEntries(current: FmEntry[], incoming: FmEntry[], sex: Sex) {
  const next = [...current]
  let added = 0, updated = 0
  for (const entry of incoming) {
    const index = next.findIndex(row => entryKey(row) === entryKey(entry))
    if (index === -1) { next.push(entry); added++; continue }
    const row = next[index]
    const marker = markerById(row.markerId)
    const unitChanged = entry.unit && entry.unit !== row.unit
    const ranges = marker && unitChanged ? defaultRanges(marker, entry.unit, sex) : null
    next[index] = {
      ...row,
      value: entry.value,
      unit: entry.unit || row.unit,
      labRange: entry.labRange || (unitChanged ? ranges?.lab || '' : row.labRange),
      fmRange: unitChanged ? ranges?.fm || '' : row.fmRange,
    }
    updated++
  }
  return { entries: next, added, updated }
}

function splitCsvLine(line: string) {
  const cells: string[] = []
  let cell = '', quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') { if (quoted && line[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if ((char === ',' || char === '\t') && !quoted) { cells.push(cell.trim()); cell = '' }
    else cell += char
  }
  cells.push(cell.trim())
  return cells
}

function parseCsv(text: string, sex: Sex): FmEntry[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (!lines.length) return []
  const head = splitCsvLine(lines[0]).map(cell => cell.toLowerCase())
  const find = (...names: string[]) => head.findIndex(cell => names.some(name => cell.includes(name)))
  const hasHeader = find('test', 'marker', 'name', 'result', 'value') !== -1
  const col = hasHeader
    ? { name: Math.max(0, find('test', 'marker', 'biomarker', 'name', 'analyte')), value: find('result', 'value'), unit: find('unit'), range: find('range', 'reference', 'ref') }
    : { name: 0, value: 1, unit: 2, range: 3 }
  return (hasHeader ? lines.slice(1) : lines).flatMap(line => {
    const cells = splitCsvLine(line)
    const name = cells[col.name] || '', value = col.value >= 0 ? cells[col.value] || '' : ''
    if (!name || !value) return []
    const marker = matchBiomarker(name)
    const unit = (col.unit >= 0 ? cells[col.unit] : '') || marker?.unit || ''
    const ranges = marker ? defaultRanges(marker, unit, sex) : null
    return [createEntry(marker, sex, { ...(marker ? {} : { name }), value, unit, labRange: (col.range >= 0 ? cells[col.range] : '') || ranges?.lab || '', fmRange: ranges?.fm || '' })]
  })
}

export function ImportPanel({ sex, onImported, another = false }: { sex: Sex; onImported: (entries: FmEntry[], patient: Partial<FmPatient>, source: string) => void; another?: boolean }) {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pasted, setPasted] = useState('')
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function read(files: File[]) {
    setError('')
    const csv = files.filter(file => /\.(csv|tsv|txt)$/i.test(file.name) || file.type === 'text/csv')
    const reports = files.filter(file => UPLOAD_TYPES.includes(file.type))
    if (!csv.length && !reports.length) { setError('Upload a PDF, a photo (JPG, PNG, WEBP) or a CSV of the lab results.'); return }
    setBusy(true)
    try {
      for (const file of csv) {
        const entries = parseCsv(await file.text(), sex)
        if (!entries.length) throw new Error(`No results were found in ${file.name}. Use columns: test, result, unit, reference range.`)
        onImported(entries, {}, file.name)
      }
      if (reports.length) {
        const form = new FormData()
        reports.forEach(file => form.append('files', file))
        form.append('sex', sex)
        const response = await fetch('/api/admin/fm-analysis', { method: 'POST', body: form })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'The lab report could not be read.')
        if (!result.entries?.length) throw new Error('No results could be read from this report. Check it is a lab report, or enter the results by hand.')
        onImported(result.entries, result.patient || {}, reports.map(file => file.name).join(', '))
      }
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'The file could not be read.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  async function readPasted() {
    setError('')
    setBusy(true)
    try {
      const response = await fetch('/api/admin/fm-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'extract', text: pasted, sex }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The results could not be read.')
      if (!result.entries?.length) throw new Error('No results were found in the pasted text.')
      onImported(result.entries, result.patient || {}, 'pasted text')
      setPasted('')
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'The results could not be read.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="rounded-[20px] border border-green-deep/10 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h4 className="font-bold text-green-deep">{another ? 'Import another lab report' : 'Import lab results'}</h4><p className="mt-1 text-xs text-text-mid">{another ? 'Only needed for results that are not in the table below yet.' : 'Read the results from the lab\u2019s report, then check them in the table below.'}</p></div>
      <div className="flex rounded-full bg-cream/60 p-1 text-xs font-bold">
        {(['upload', 'paste'] as const).map(item => <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-full px-3 py-1.5 ${mode === item ? 'bg-green-deep text-white' : 'text-text-mid'}`}>{item === 'upload' ? 'Upload file' : 'Paste text'}</button>)}
      </div>
    </div>
    {mode === 'upload'
      ? <button type="button" disabled={busy} onClick={() => input.current?.click()}
          onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
          onDrop={event => { event.preventDefault(); setDragging(false); read(Array.from(event.dataTransfer.files)) }}
          className={`mt-4 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${dragging ? 'border-green-deep bg-green-deep/5' : 'border-green-deep/20 hover:border-green-mid hover:bg-cream/30'} disabled:opacity-60`}>
          {busy ? <span className="h-8 w-8 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" /> : <FileArrowUpIcon size={34} weight="duotone" className="text-green-mid" />}
          <span className="mt-3 text-sm font-bold text-green-deep">{busy ? 'Reading the lab report…' : 'Drop the lab report here, or click to choose'}</span>
          <span className="mt-1 text-xs text-text-mid">PDF or photos of each page (read with AI), or a CSV of test, result, unit, reference range. Files are not stored.</span>
        </button>
      : <div className="mt-4 space-y-3">
          <textarea value={pasted} onChange={event => setPasted(event.target.value)} rows={7} placeholder={'Paste the results as they appear on the lab report, e.g.\nCreatinine 91 µmol/L (44 - 80)\nTSH 2.51 uIU/mL (0.4 - 4.0)'} className={inputClass} />
          <button type="button" disabled={busy || pasted.trim().length < 10} onClick={readPasted} className="primary disabled:opacity-50">{busy ? 'Reading…' : <><ClipboardTextIcon size={16} />Read results</>}</button>
        </div>}
    <input ref={input} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.tsv,.txt,application/pdf,image/*,text/csv" className="hidden" onChange={event => read(Array.from(event.target.files || []))} />
    {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
  </div>
}

function MarkerPicker({ entries, sex, onAdd }: { entries: FmEntry[]; sex: Sex; onAdd: (entries: FmEntry[]) => void }) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const present = new Set(entries.map(entry => entry.markerId).filter(Boolean))
  const groups = FM_PANELS.filter(panel => panel.id !== 'other').map(panel => ({
    panel,
    markers: FM_BIOMARKERS.filter(marker => marker.panel === panel.id && (!query || panel.name.toLowerCase().includes(query) || marker.name.toLowerCase().includes(query) || (marker.aliases || []).some(alias => alias.includes(query)))),
  })).filter(group => group.markers.length)
  const add = (ids: string[]) => onAdd(ids.filter(id => !present.has(id)).map(id => createEntry(markerById(id), sex)))

  return <div className="p-4 pt-0">
    <div className="relative"><MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mid" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search markers or panels…" className={`${inputClass} pl-9`} /></div>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={() => add(FM_BIOMARKERS.map(marker => marker.id))} className="rounded-full bg-green-deep px-3 py-1.5 text-xs font-bold text-white">Add full FM panel ({FM_BIOMARKERS.length})</button>
    </div>
    <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">{groups.map(({ panel, markers }) => <details key={`${panel.id}:${query ? 's' : 'b'}`} open={query ? true : undefined} className="rounded-lg border border-green-deep/10">
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-green-deep"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: panel.color }} />{panel.name}<span className="ml-2 text-xs font-normal text-text-mid">{markers.filter(marker => present.has(marker.id)).length} / {markers.length} added</span></summary>
      <div className="px-3 pb-3">
        <button type="button" onClick={() => add(markers.map(marker => marker.id))} disabled={markers.every(marker => present.has(marker.id))} className="mb-2 text-xs font-semibold text-green-deep underline underline-offset-2 disabled:opacity-40">Add the whole panel</button>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{markers.map(marker => <button key={marker.id} type="button" disabled={present.has(marker.id)} onClick={() => add([marker.id])} className="flex items-center justify-between rounded-lg bg-cream/30 px-2.5 py-2 text-left text-sm text-green-deep hover:bg-cream disabled:opacity-40">
          <span>{marker.name}</span><span className="text-[11px] text-text-mid">{marker.unit}</span></button>)}</div>
      </div>
    </details>)}</div>
  </div>
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return <span className="inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color, background: `${color}14` }}>{label}</span>
}

const columns = 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1fr)_2rem]'

export function ResultsTable({ entries, sex, onChange }: { entries: FmEntry[]; sex: Sex; onChange: Dispatch<SetStateAction<FmEntry[]>> }) {
  const [open, setOpen] = useState<Set<number>>(new Set())
  const update = (index: number, changes: Partial<FmEntry>) => onChange(current => current.map((row, i) => {
    if (i !== index) return row
    const next = { ...row, ...changes }
    // A new unit makes the old ranges wrong; take the catalogue's in that unit.
    if (changes.unit !== undefined && changes.unit !== row.unit) {
      const marker = markerById(row.markerId)
      const ranges = marker ? defaultRanges(marker, changes.unit, sex) : null
      if (marker) { next.fmRange = ranges?.fm || ''; next.labRange = ranges?.lab || row.labRange }
    }
    return next
  }))
  const remove = (index: number) => { onChange(current => current.filter((_, i) => i !== index)); setOpen(new Set()) }
  const toggle = (index: number) => setOpen(current => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next })
  const addCustom = () => { setOpen(new Set([entries.length])); onChange(current => [...current, createEntry(null, sex, { name: 'New marker' })]) }

  const sections = FM_PANELS.map(panel => ({ panel, items: entries.map((row, index) => ({ row, index })).filter(({ row }) => row.panel === panel.id) })).filter(section => section.items.length)
  const filled = entries.filter(entry => entry.value.trim()).length

  return <div className="rounded-[20px] border border-green-deep/10 bg-white p-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h4 className="font-bold text-green-deep">Results</h4><p className="mt-1 text-xs text-text-mid">{entries.length ? `${filled} of ${entries.length} markers have a result. Blank markers are left out of the report.` : 'Add markers from the catalogue, or import the lab report above, then type each result.'}</p></div>
      <div className="flex gap-2">
        <button type="button" onClick={addCustom} className="secondary"><PlusIcon size={16} />Custom marker</button>
        {entries.length > 0 && <button type="button" onClick={() => { if (window.confirm('Remove every marker from this analysis?')) onChange([]) }} className="secondary">Clear all</button>}
      </div>
    </div>

    {entries.length > 0 && <div className={`mt-4 hidden gap-2 px-3 text-[10px] font-bold uppercase tracking-wide text-text-mid/70 lg:grid ${columns}`}><span>Marker</span><span>Result</span><span>Unit</span><span>Lab range</span><span>FM optimal</span><span>Status (lab · FM)</span><span /></div>}
    <div className="mt-2 space-y-4">{sections.map(({ panel, items }) => <section key={panel.id}>
      <p className="flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: panel.color }}><span className="h-2 w-2 rounded-full" style={{ background: panel.color }} />{panel.name}</p>
      <div className="mt-1.5 divide-y divide-green-deep/10 rounded-xl border border-green-deep/10">{items.map(({ row, index }) => {
        const assessed = assessEntry(row)
        const editing = open.has(index)
        const marker = markerById(row.markerId)
        const unitWarning = marker && row.unit && !row.fmRange
        return <div key={index} className={`grid gap-2 p-3 lg:items-start ${columns} ${assessed.urgent ? 'bg-red-50/60' : ''}`}>
          <div className="min-w-0 pt-1.5">
            <p className="text-sm font-semibold text-green-deep">{row.name || 'Unnamed marker'}{assessed.urgent && <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">URGENT</span>}</p>
            <button type="button" onClick={() => toggle(index)} aria-expanded={editing} className="mt-0.5 text-[11px] font-semibold text-green-mid hover:text-green-deep">{editing ? 'Hide details' : row.note ? 'Note added · edit' : 'Rename, panel or note'}</button>
          </div>
          <input aria-label={`Result for ${row.name}`} value={row.value} onChange={event => update(index, { value: event.target.value })} placeholder="Result" inputMode="decimal" className={`${inputClass} font-bold`} />
          <input aria-label={`Unit for ${row.name}`} value={row.unit} onChange={event => update(index, { unit: event.target.value })} placeholder="Unit" className={inputClass} />
          <input aria-label={`Lab range for ${row.name}`} value={row.labRange} onChange={event => update(index, { labRange: event.target.value })} placeholder="e.g. 3.5–5.1" className={inputClass} />
          <input aria-label={`FM optimal range for ${row.name}`} value={row.fmRange} onChange={event => update(index, { fmRange: event.target.value })} placeholder="e.g. 4–4.5" className={`${inputClass} ${unitWarning ? 'border-amber-400' : ''}`} title={unitWarning ? 'No FM range is known in this unit. Enter one, or switch to the catalogue unit.' : undefined} />
          <div className="flex flex-wrap items-center gap-1 pt-2">
            {row.value.trim() ? <><StatusPill label={LAB_STATUS_LABEL[assessed.lab]} color={STATUS_COLOR[assessed.lab]} /><StatusPill label={FM_STATUS_LABEL[assessed.fm]} color={STATUS_COLOR[assessed.fm]} /></> : <span className="text-xs text-text-mid">—</span>}
            {unitWarning && <span className="text-[10px] font-semibold text-amber-700">Set FM range for {row.unit}</span>}
          </div>
          <button type="button" aria-label={`Remove ${row.name}`} title="Remove" onClick={() => remove(index)} className="flex h-9 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"><XIcon size={16} /></button>
          {editing && <div className="grid gap-2 rounded-lg bg-cream/40 p-3 lg:col-span-7 sm:grid-cols-3">
            <label className="text-xs font-semibold text-text-mid">Marker name<input value={row.name} onChange={event => update(index, { name: event.target.value })} className={`${inputClass} mt-1`} /></label>
            <label className="text-xs font-semibold text-text-mid">Panel<select value={row.panel} onChange={event => update(index, { panel: event.target.value as PanelId })} className={`${inputClass} mt-1`}>{FM_PANELS.map(panel => <option key={panel.id} value={panel.id}>{panel.name}</option>)}</select></label>
            <label className="text-xs font-semibold text-text-mid">Clinical note (shown on the report)<input value={row.note} onChange={event => update(index, { note: event.target.value })} placeholder="e.g. Low — microcytic pattern" className={`${inputClass} mt-1`} /></label>
          </div>}
        </div>
      })}</div>
    </section>)}</div>

    <details open={!entries.length || undefined} className="mt-4 rounded-xl border border-green-deep/10 bg-white">
      <summary className="cursor-pointer p-4 text-sm font-semibold text-green-deep"><SparkleIcon size={14} className="mr-1 inline text-green-mid" />Add markers from the FM catalogue</summary>
      <MarkerPicker entries={entries} sex={sex} onAdd={added => onChange(current => [...current, ...added])} />
    </details>
  </div>
}
