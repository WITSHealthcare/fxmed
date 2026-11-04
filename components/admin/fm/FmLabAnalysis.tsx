'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftIcon, ChartBarIcon, FileTextIcon, FlaskIcon, FloppyDiskIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon, UserIcon } from '@phosphor-icons/react'
import { ageFromDateOfBirth } from '@/lib/age'
import { defaultRanges, emptyNarrative, markerById, summarize, type FmEntry, type FmNarrative, type FmPatient, type Sex } from '@/lib/fmBiomarkers'
import AnalysisDashboard from './AnalysisDashboard'
import RecordResults from './RecordResults'
import ReportBuilder from './ReportBuilder'
import { ImportPanel, ResultsTable, inputClass, mergeEntries } from './ResultsEntry'

// Functional medicine lab analysis: enter a patient's results (typed, or read
// from the lab's report), see them against lab and FM-optimal ranges, and
// issue the Functional Health Analysis report.

const api = '/api/admin/fm-analysis'
type Step = 'results' | 'analysis' | 'report'
type Saved = { id: string; emr_patient_id: string | null; patient: FmPatient; status: 'draft' | 'final'; updated_at: string; markerCount: number }
type EmrPatient = { id: string; mrn: string; first_name: string; middle_name?: string | null; last_name: string; date_of_birth?: string | null; sex?: string | null }

const emptyPatient = (): FmPatient => ({ name: '', age: '', sex: '', collectedAt: '', labRef: '', facility: '', clinician: '' })

/** Edits are saved this long after the last change. */
const AUTOSAVE_DELAY = 1500

type Content = { emrPatientId: string | null; patient: FmPatient; entries: FmEntry[]; narrative: FmNarrative }
/** What is saved, as one comparable string; unsaved changes are any difference from the last save. */
const snapshotOf = (content: Content) => JSON.stringify([content.emrPatientId, content.patient, content.entries, content.narrative])
const dateTime = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const savedTime = new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit' })
const patientName = (patient: EmrPatient) => [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ')

export default function FmLabAnalysis() {
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  return editing
    ? <Editor key={editing} id={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
    : <AnalysisList onOpen={setEditing} />
}

function Hero({ children }: { children?: React.ReactNode }) {
  return <section className="relative overflow-hidden rounded-[28px] bg-green-deep p-6 text-white shadow-[0_18px_50px_rgba(26,61,46,0.16)] sm:p-8">
    <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
    <div className="relative flex flex-wrap items-end justify-between gap-6">
      <div><span className="inline-flex rounded-full bg-gold px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-green-deep">Functional Medicine</span>
        <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-4xl">Lab analysis</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Enter or upload lab results, compare every marker against laboratory and functional-medicine optimal ranges, and issue the Functional Health Analysis report.</p></div>
      {children}
    </div>
  </section>
}

function AnalysisList({ onOpen }: { onOpen: (id: string) => void }) {
  const [items, setItems] = useState<Saved[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    fetch(api).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setItems(result.analyses || []) })
      .catch(loadError => { setError(loadError.message || 'Saved analyses could not be loaded.'); setItems([]) })
  }, [])
  const query = search.trim().toLowerCase()
  const shown = (items || []).filter(item => !query || item.patient?.name?.toLowerCase().includes(query) || item.patient?.labRef?.toLowerCase().includes(query))

  return <div className="space-y-6">
    <Hero><button type="button" onClick={() => onOpen('new')} className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-green-deep transition hover:-translate-y-0.5"><PlusIcon size={20} weight="bold" />New analysis</button></Hero>
    <section className="rounded-[24px] border border-green-deep/10 bg-white p-5 shadow-[0_8px_30px_rgba(26,61,46,0.055)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h3 className="text-2xl font-bold tracking-[-0.025em]">Saved analyses</h3><p className="mt-1 text-sm text-text-mid">Drafts and issued reports, most recently updated first.</p></div>
        <div className="relative w-full sm:w-72"><MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mid" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Patient or lab ref…" className={`${inputClass} pl-9`} /></div>
      </div>
      {error && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error} You can still prepare a new analysis.</p>}
      {items === null ? <div className="flex min-h-40 items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" /></div>
        : shown.length ? <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{shown.map(item => <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="flex items-start gap-4 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4 text-left transition hover:border-green-mid">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-green-deep text-gold"><FlaskIcon size={21} weight="fill" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate font-bold">{item.patient?.name || 'Unnamed patient'}</span>
            <span className="mt-1 block text-xs text-text-mid">{item.markerCount} markers{item.patient?.collectedAt ? ` · collected ${item.patient.collectedAt}` : ''}{item.patient?.labRef ? ` · ${item.patient.labRef}` : ''}</span>
            <span className="mt-1 block text-[11px] text-text-mid">Updated {dateTime.format(new Date(item.updated_at))}</span></span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${item.status === 'final' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.status === 'final' ? 'Issued' : 'Draft'}</span>
        </button>)}</div>
        : <div className="py-12 text-center text-sm text-text-mid"><FlaskIcon size={34} weight="duotone" className="mx-auto mb-3 text-green-mid/60" />{query ? 'No analyses match.' : 'No analyses yet. Start one with New analysis.'}</div>}
    </section>
  </div>
}

function PatientLink({ onPick }: { onPick: (patient: EmrPatient) => void }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<EmrPatient[]>([])
  useEffect(() => {
    const query = search.trim()
    if (query.length < 2) { setResults([]); return }
    const timer = setTimeout(() => {
      fetch(`/api/admin/emr?resource=patients&pageSize=10&search=${encodeURIComponent(query)}`).then(response => response.ok ? response.json() : { patients: [] }).then(result => setResults(result.patients || [])).catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(timer)
  }, [search])
  return <div className="relative">
    <MagnifyingGlassIcon size={16} className="absolute left-3 top-[1.15rem] -translate-y-1/2 text-text-mid" />
    <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find an EMR patient by name, MRN or phone…" className={`${inputClass} pl-9`} />
    {results.length > 0 && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-green-deep/10 bg-white shadow-xl">{results.map(patient => <button key={patient.id} type="button" onClick={() => { onPick(patient); setSearch(''); setResults([]) }} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-cream/50">
      <span className="font-semibold text-green-deep">{patientName(patient)}</span><span className="ml-2 text-xs text-text-mid">{patient.mrn}{patient.date_of_birth ? ` · ${ageFromDateOfBirth(patient.date_of_birth)} y` : ''}{patient.sex ? ` · ${patient.sex}` : ''}</span>
    </button>)}</div>}
  </div>
}

function Editor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [analysisId, setAnalysisId] = useState<string | null>(id)
  const [loading, setLoading] = useState(!!id)
  const [step, setStep] = useState<Step>('results')
  const [patient, setPatient] = useState<FmPatient>(emptyPatient)
  const [emrPatientId, setEmrPatientId] = useState<string | null>(null)
  const [emrPatientLabel, setEmrPatientLabel] = useState('')
  const [entries, setEntries] = useState<FmEntry[]>([])
  const [narrative, setNarrative] = useState<FmNarrative>(emptyNarrative)
  const [status, setStatus] = useState<'draft' | 'final'>('draft')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshotOf({ emrPatientId: null, patient: emptyPatient(), entries: [], narrative: emptyNarrative() }))
  // Saves run one after another, and read the id from here, so a second save
  // made while the first is still creating the analysis updates it rather than
  // creating a duplicate.
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const idRef = useRef(analysisId)

  useEffect(() => {
    if (!id) return
    fetch(`${api}?id=${id}`).then(async response => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      const row = result.analysis
      const loaded = { emrPatientId: row.emr_patient_id, patient: { ...emptyPatient(), ...row.patient }, entries: row.entries || [], narrative: { ...emptyNarrative(), ...(row.narrative || {}) } }
      setPatient(loaded.patient)
      setEntries(loaded.entries)
      setNarrative(loaded.narrative)
      setSavedSnapshot(snapshotOf(loaded))
      setSavedAt(row.updated_at ? new Date(row.updated_at) : null)
      setStatus(row.status)
      setEmrPatientId(row.emr_patient_id)
      if (row.emr_patient_id) setEmrPatientLabel(row.patient?.name || 'Linked patient')
      setStep((row.entries || []).length ? 'analysis' : 'results')
    }).catch(loadError => setMessage({ tone: 'error', text: loadError.message || 'The analysis could not be loaded.' })).finally(() => setLoading(false))
  }, [id])

  const snapshot = useMemo(() => snapshotOf({ emrPatientId, patient, entries, narrative }), [emrPatientId, patient, entries, narrative])
  const dirty = !loading && snapshot !== savedSnapshot
  // Autosave needs a name to file the analysis under, and something worth keeping.
  const canAutosave = !!patient.name.trim() && (!!analysisId || entries.length > 0)

  const summary = useMemo(() => summarize(entries), [entries])
  const setField = (field: keyof FmPatient, value: string) => setPatient(current => ({ ...current, [field]: value }))

  // A change of sex moves catalogue ranges that have not been edited by hand.
  function setSex(sex: Sex) {
    const previous = patient.sex
    setPatient(current => ({ ...current, sex }))
    setEntries(current => current.map(entry => {
      const marker = markerById(entry.markerId)
      if (!marker) return entry
      const before = defaultRanges(marker, entry.unit, previous), after = defaultRanges(marker, entry.unit, sex)
      if (!before || !after) return entry
      return { ...entry, labRange: entry.labRange === before.lab ? after.lab : entry.labRange, fmRange: entry.fmRange === before.fm ? after.fm : entry.fmRange }
    }))
  }

  // Linking a patient also brings in the results saved in their record; see RecordResults.
  function linkPatient(record: EmrPatient) {
    setEmrPatientId(record.id)
    setEmrPatientLabel(`${patientName(record)} · ${record.mrn}`)
    setStep('results')
    const age = ageFromDateOfBirth(record.date_of_birth)
    setPatient(current => ({ ...current, name: patientName(record), age: age === null ? current.age : String(age) }))
    if (record.sex === 'female' || record.sex === 'male') setSex(record.sex)
  }

  function imported(incoming: FmEntry[], details: Partial<FmPatient>, source: string) {
    const merge = mergeEntries(entries, incoming, patient.sex)
    setEntries(merge.entries)
    setPatient(current => {
      const next = { ...current }
      for (const key of ['name', 'age', 'collectedAt', 'labRef', 'facility'] as const) if (!next[key] && details[key]) next[key] = details[key] as string
      return next
    })
    if (!patient.sex && (details.sex === 'female' || details.sex === 'male')) setSex(details.sex)
    const counts = `${merge.added} added, ${merge.updated} updated`
    setMessage({ tone: 'ok', text: source.startsWith('the patient\'s record')
      ? `Brought in ${incoming.length} result${incoming.length === 1 ? '' : 's'} from ${source}: ${counts}.`
      : `Read ${incoming.length} result${incoming.length === 1 ? '' : 's'} from ${source}: ${counts}. Check each value against the lab report.` })
  }

  const save = useCallback((nextStatus?: 'draft' | 'final', quiet = false) => {
    if (!patient.name.trim()) {
      if (!quiet) { setMessage({ tone: 'error', text: 'Enter the patient\'s name before saving.' }); setStep('results') }
      return Promise.resolve(false)
    }
    const sent = snapshot
    const body = { emrPatientId, patient, entries, narrative, status: nextStatus || status }
    const run = queue.current.then(async () => {
      setSaving(true)
      if (!quiet) setMessage(null)
      try {
        const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: idRef.current, ...body }) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'The analysis could not be saved.')
        idRef.current = result.analysis.id
        setAnalysisId(result.analysis.id)
        setStatus(result.analysis.status)
        // Only what was sent is saved; edits made meanwhile stay unsaved and are saved next.
        setSavedSnapshot(sent)
        setSavedAt(new Date())
        if (!quiet) setMessage({ tone: 'ok', text: 'Analysis saved.' })
        return true
      } catch (saveError) {
        setMessage({ tone: 'error', text: `${saveError instanceof Error ? saveError.message : 'The analysis could not be saved.'}${quiet ? ' Your changes are kept here; autosave will try again after your next change.' : ''}` })
        return false
      } finally {
        setSaving(false)
      }
    })
    queue.current = run
    return run
  }, [snapshot, emrPatientId, patient, entries, narrative, status])

  // Autosave a moment after the last change, as results and edits come in.
  useEffect(() => {
    if (!dirty || !canAutosave) return
    const timer = setTimeout(() => { void save(undefined, true) }, AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
  }, [dirty, canAutosave, save])

  // Warn before the tab is closed with changes not yet saved.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function remove() {
    if (!analysisId || !window.confirm('Delete this analysis? This cannot be undone.')) return
    const response = await fetch(`${api}?id=${analysisId}`, { method: 'DELETE' })
    if (response.ok) onClose()
    else setMessage({ tone: 'error', text: (await response.json().catch(() => ({}))).error || 'The analysis could not be deleted.' })
  }

  async function close() {
    if (dirty && canAutosave) {
      if (!await save(undefined, true) && !window.confirm('The latest changes could not be saved. Leave anyway?')) return
    } else if (dirty && entries.length && !window.confirm('Leave without saving? Enter the patient\'s name to save this analysis.')) return
    onClose()
  }

  if (loading) return <div className="flex min-h-64 items-center justify-center"><span className="h-9 w-9 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" /></div>

  const steps: Array<{ id: Step; label: string; Icon: typeof FlaskIcon }> = [
    { id: 'results', label: '1. Patient & results', Icon: FlaskIcon },
    { id: 'analysis', label: `2. Analysis${summary.total ? ` (${summary.total})` : ''}`, Icon: ChartBarIcon },
    { id: 'report', label: '3. Report', Icon: FileTextIcon },
  ]

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={close} className="inline-flex items-center gap-2 text-sm font-bold text-green-deep"><ArrowLeftIcon size={18} />All analyses</button>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${status === 'final' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{status === 'final' ? 'Issued' : 'Draft'}</span>
        <span className="text-xs text-text-mid" aria-live="polite">{saving ? 'Saving…' : dirty ? (canAutosave ? 'Unsaved changes' : entries.length ? 'Not saved — enter the patient\'s name' : '') : savedAt ? `All changes saved · ${savedTime.format(savedAt)}` : ''}</span>
        {analysisId && <button type="button" onClick={remove} className="secondary text-red-600"><TrashIcon size={16} />Delete</button>}
        <button type="button" onClick={() => save()} disabled={saving} className="primary disabled:opacity-50"><FloppyDiskIcon size={16} />{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>

    <section className="rounded-[24px] border border-green-deep/10 bg-white p-5 shadow-[0_8px_30px_rgba(26,61,46,0.055)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-green-deep text-gold"><UserIcon size={22} weight="fill" /></span>
          <div><h3 className="text-xl font-bold">{patient.name || 'New analysis'}</h3><p className="text-xs text-text-mid">{emrPatientId ? `Linked to EMR: ${emrPatientLabel}` : 'Not linked to an EMR patient'}{emrPatientId && <button type="button" className="ml-2 font-semibold text-green-mid underline" onClick={() => { setEmrPatientId(null); setEmrPatientLabel('') }}>Unlink</button>}</p></div></div>
        <div className="w-full sm:w-96"><PatientLink onPick={linkPatient} /></div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-text-mid">Patient name *<input value={patient.name} onChange={event => setField('name', event.target.value)} className={`${inputClass} mt-1`} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-text-mid">Age<input value={patient.age} inputMode="numeric" onChange={event => setField('age', event.target.value.replace(/[^\d]/g, '').slice(0, 3))} className={`${inputClass} mt-1`} /></label>
          <label className="text-xs font-semibold text-text-mid">Sex<select value={patient.sex} onChange={event => setSex(event.target.value as Sex)} className={`${inputClass} mt-1`}><option value="">—</option><option value="female">Female</option><option value="male">Male</option></select></label>
        </div>
        <label className="text-xs font-semibold text-text-mid">Sample collected<input type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(patient.collectedAt) ? patient.collectedAt : ''} onChange={event => setField('collectedAt', event.target.value)} className={`${inputClass} mt-1`} />{patient.collectedAt && !/^\d{4}-\d{2}-\d{2}$/.test(patient.collectedAt) && <span className="mt-1 block text-[11px]">As printed: {patient.collectedAt}</span>}</label>
        <label className="text-xs font-semibold text-text-mid">Lab reference<input value={patient.labRef} onChange={event => setField('labRef', event.target.value)} className={`${inputClass} mt-1`} /></label>
        <label className="text-xs font-semibold text-text-mid">Reporting laboratory / facility<input value={patient.facility} onChange={event => setField('facility', event.target.value)} placeholder="WITS FxMed Nigeria" className={`${inputClass} mt-1`} /></label>
        <label className="text-xs font-semibold text-text-mid">Reviewing clinician<input value={patient.clinician} onChange={event => setField('clinician', event.target.value)} placeholder="Dr. …" className={`${inputClass} mt-1`} /></label>
      </div>
      {!patient.sex && entries.length > 0 && <p className="mt-3 text-xs text-amber-700">Set the patient&apos;s sex so sex-specific ranges (haemoglobin, creatinine, ferritin, testosterone…) are applied.</p>}
    </section>

    {message && <p className={`rounded-[14px] border px-4 py-3 text-sm ${message.tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message.text}</p>}

    <nav className="flex gap-2 overflow-x-auto rounded-[20px] border border-green-deep/10 bg-white p-2" aria-label="Analysis steps">
      {steps.map(item => <button key={item.id} type="button" onClick={() => setStep(item.id)} className={`flex shrink-0 items-center gap-2 rounded-[14px] px-4 py-3 text-sm font-bold transition ${step === item.id ? 'bg-green-deep text-white shadow-md' : 'text-text-mid hover:bg-green-deep/5 hover:text-green-deep'}`}><item.Icon size={20} weight={step === item.id ? 'fill' : 'duotone'} className={step === item.id ? 'text-gold' : 'text-green-mid'} />{item.label}</button>)}
    </nav>

    {step === 'results' && <div className="space-y-6">
      {emrPatientId && <RecordResults key={emrPatientId} patientId={emrPatientId} patientName={patient.name} sex={patient.sex} empty={entries.length === 0} onImported={imported} />}
      <ImportPanel sex={patient.sex} onImported={imported} another={entries.length > 0} />
      <ResultsTable entries={entries} sex={patient.sex} onChange={setEntries} />
      {summary.total > 0 && <div className="flex justify-end"><button type="button" className="primary" onClick={() => setStep('analysis')}><ChartBarIcon size={16} />See the analysis</button></div>}
    </div>}
    {step === 'analysis' && <AnalysisDashboard entries={entries} narrative={narrative} sex={patient.sex} />}
    {step === 'report' && <ReportBuilder patient={patient} entries={entries} setEntries={setEntries} narrative={narrative} setNarrative={setNarrative} emrPatientId={emrPatientId} onSaveAnalysis={save} />}
  </div>
}
