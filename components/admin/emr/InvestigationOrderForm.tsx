'use client'

import { useEffect, useMemo, useState } from 'react'
import { CORE_PANEL_TESTS, INVESTIGATION_CATALOG, generateInvestigationFormPdf } from '@/lib/investigationFormPdf'
import { blobToBase64, downloadBlob } from '@/lib/fileDownload'
import { downloadBase, type InvestigationOrder, type InvestigationPatientSnapshot } from '@/lib/investigations'

// Places an investigation order: the tests requested, printed on the FXMed
// request form. The order then waits for results on the patient's Results tab.

export const INVESTIGATIONS_API = '/api/admin/emr/investigations'
const PATIENTS_API = '/api/admin/emr'
const PARTNER_LABORATORIES = ['Mecure', 'Synlab'] as const
const DEFAULT_PANEL_TITLE = 'Core Functional Medicine Panel'

export type OrderPatient = {
  id: string
  mrn: string
  first_name: string
  middle_name?: string | null
  last_name: string
  date_of_birth: string
  sex: string
  email?: string | null
  phone?: string | null
}

/** Tests and wording carried over from an earlier order. */
export type OrderTemplate = { tests: string[]; panelTitle: string; requestingClinician: string; clinicalDetails: string }

export function orderPatientName(patient: OrderPatient) {
  return [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ')
}

export function formatPatientAge(dob: string, today = new Date()) {
  const birth = new Date(`${dob}T00:00:00`)
  if (Number.isNaN(birth.getTime()) || birth > today) return ''
  let years = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) years--
  if (years >= 1) return `${years} ${years === 1 ? 'year' : 'years'}`
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth()
  if (today.getDate() < birth.getDate()) months--
  if (months >= 1) return `${months} ${months === 1 ? 'month' : 'months'}`
  const days = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(birth.getFullYear(), birth.getMonth(), birth.getDate())) / 86_400_000)
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

/** The demographics printed on the request form and the results report. */
export function patientSnapshot(patient: OrderPatient): InvestigationPatientSnapshot {
  return {
    fullName: orderPatientName(patient),
    email: patient.email || '',
    phone: patient.phone || '',
    age: formatPatientAge(patient.date_of_birth),
    gender: patient.sex ? patient.sex.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : '',
  }
}

function splitInvestigationList(value: string) {
  const cleanItem = (item: string) => item.replace(/^\s*(?:[-•–—*]|☐|☑|✓|\d+[.)])\s*/, '').trim()
  const lines = value.split(/\r?\n/).map(cleanItem).filter(Boolean)
  if (lines.length > 1) return lines
  const source = lines[0] || ''
  if (source.includes(';')) return source.split(';').map(cleanItem).filter(Boolean)
  // Commas separate tests, except inside brackets: "Thyroid (TSH, Free T4)".
  const items: string[] = []
  let current = ''
  let depth = 0
  for (const character of source) {
    if (character === '(') depth++
    if (character === ')') depth = Math.max(0, depth - 1)
    if (character === ',' && depth === 0) {
      if (cleanItem(current)) items.push(cleanItem(current))
      current = ''
    } else current += character
  }
  if (cleanItem(current)) items.push(cleanItem(current))
  return items
}

const fieldClass = 'w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm font-dm-sans text-green-deep focus:border-green-deep focus:outline-none'
const labelClass = 'block text-xs font-dm-sans font-semibold uppercase tracking-wide text-text-mid mb-1'

function PatientSearch({ onSelect }: { onSelect: (patient: OrderPatient) => void }) {
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<OrderPatient[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const search = query.trim()
    if (search.length < 2) { setMatches([]); setLoading(false); return }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ resource: 'patients', search: search.split(/\s+/)[0], status: 'active', pageSize: '100' })
        const response = await fetch(`${PATIENTS_API}?${params}`, { signal: controller.signal })
        const data = response.ok ? await response.json() : { patients: [] }
        const terms = search.toLowerCase().split(/\s+/).filter(Boolean)
        setMatches((Array.isArray(data.patients) ? data.patients as OrderPatient[] : []).filter(patient => {
          const searchable = `${orderPatientName(patient)} ${patient.mrn} ${patient.phone || ''} ${patient.email || ''}`.toLowerCase()
          return terms.every(term => searchable.includes(term))
        }))
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setMatches([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query])

  return <div className="relative">
    <label htmlFor="investigation-patient-search" className={labelClass}>Patient</label>
    <input id="investigation-patient-search" type="text" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name, MRN or phone" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={matches.length > 0} aria-controls="investigation-patient-options" className={fieldClass} />
    {loading && <p className="mt-1 text-xs font-dm-sans text-text-mid">Searching patients…</p>}
    {!loading && query.trim().length >= 2 && !matches.length && <p className="mt-1 text-xs font-dm-sans text-text-mid">No registered patient matches. Register the patient first, then order.</p>}
    {matches.length > 0 && <div id="investigation-patient-options" role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-green-deep/15 bg-white p-1 shadow-xl">
      {matches.map(patient => <button key={patient.id} type="button" role="option" aria-selected={false} onMouseDown={event => { event.preventDefault(); onSelect(patient); setQuery(''); setMatches([]) }} className="block w-full rounded-md px-3 py-2 text-left hover:bg-cream">
        <span className="block text-sm font-dm-sans font-semibold text-green-deep">{orderPatientName(patient)}</span>
        <span className="mt-0.5 block text-xs font-dm-sans text-text-mid">{patient.mrn} · {patient.phone || patient.email || 'No contact recorded'}</span>
      </button>)}
    </div>}
  </div>
}

// Pass `patient` on a patient record. Without it, the form asks which
// registered patient the order is for.
export default function InvestigationOrderForm({ patient, template, onOrdered }: {
  patient?: OrderPatient
  template?: OrderTemplate | null
  onOrdered: (order: InvestigationOrder) => void
}) {
  const [chosenPatient, setChosenPatient] = useState<OrderPatient | null>(null)
  const orderFor = patient || chosenPatient
  const [panelTitle, setPanelTitle] = useState(template?.panelTitle || DEFAULT_PANEL_TITLE)
  const [clinicalDetails, setClinicalDetails] = useState(template?.clinicalDetails || '')
  const [requestingClinician, setRequestingClinician] = useState(template?.requestingClinician || '')
  const [tests, setTests] = useState<string[]>(template?.tests || CORE_PANEL_TESTS.map(test => test.name))
  // Partner verification stamp. Off by default: it should only appear on forms
  // actually being taken to the partner laboratory.
  const [stampOn, setStampOn] = useState(false)
  const [stampPartner, setStampPartner] = useState<string>(PARTNER_LABORATORIES[0])
  const [stampDate, setStampDate] = useState('')
  const [bulkList, setBulkList] = useState('')
  const [testSearch, setTestSearch] = useState('')
  const [status, setStatus] = useState<'idle' | 'working' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState(template ? 'Tests copied from the earlier order. Check them, then place the order.' : '')

  const selected = useMemo(() => new Set(tests), [tests])
  const catalogue = useMemo(() => {
    const query = testSearch.trim().toLowerCase()
    if (!query) return INVESTIGATION_CATALOG
    return INVESTIGATION_CATALOG.map(group => ({ ...group, tests: group.tests.filter(test => test.toLowerCase().includes(query)) })).filter(group => group.tests.length)
  }, [testSearch])
  const customTests = tests.filter(name => !INVESTIGATION_CATALOG.some(group => group.tests.some(test => test === name)))

  const toggleTest = (name: string) => setTests(current => current.includes(name) ? current.filter(test => test !== name) : [...current, name])
  const toggleGroup = (names: readonly string[]) => {
    const allSelected = names.every(name => selected.has(name))
    setTests(current => allSelected ? current.filter(test => !names.includes(test)) : [...current.filter(test => !names.includes(test)), ...names])
  }
  const addCustomTests = () => {
    const names = splitInvestigationList(bulkList)
    if (!names.length) { setStatus('error'); setMessage('Type at least one investigation name to add.'); return }
    setTests(current => [...current, ...names.filter(name => !current.includes(name))])
    setBulkList('')
    setStatus('idle')
    setMessage(`${names.length} investigation${names.length === 1 ? '' : 's'} added.`)
  }

  async function placeOrder() {
    if (!orderFor) { setStatus('error'); setMessage('Choose the patient this order is for.'); return }
    if (!tests.length) { setStatus('error'); setMessage('Tick at least one test to order.'); return }
    // A stamp without a date verifies nothing, so refuse rather than issue one.
    if (stampOn && (!stampDate || !stampPartner.trim())) { setStatus('error'); setMessage('Choose the partner laboratory and the date the form will be used, or turn the stamp off.'); return }

    setStatus('working')
    setMessage('')
    try {
      const snapshot = patientSnapshot(orderFor)
      const blob = await generateInvestigationFormPdf({
        ...snapshot,
        clinicalDetails,
        requestingClinician,
        panelTitle,
        tests: tests.map(name => ({ name, description: '' })),
        stamp: stampOn ? { partner: stampPartner.trim(), validOn: stampDate } : undefined,
      })
      const downloadName = `${downloadBase(snapshot.fullName, 'investigation')}-fxmed-request-form.pdf`
      // Saved before it is downloaded, so every form handed out has an order
      // waiting for its results.
      const response = await fetch(INVESTIGATIONS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'order', patientId: orderFor.id, patient: snapshot, panelTitle, tests, clinicalDetails, requestingClinician, documentBase64: await blobToBase64(blob), downloadName, size: blob.size }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'The order could not be saved.')
      downloadBlob(blob, downloadName)
      setStatus('success')
      setMessage(`Order placed and the request form downloaded. It is waiting for results on ${patient ? 'the Results tab' : `${orderPatientName(orderFor)}'s record`}.`)
      onOrdered(result.order)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'The order could not be placed. Try again.')
    }
  }

  return <div className="bg-white rounded-[20px] p-6 shadow-lg border border-green-deep/10">
    <h3 className="text-xl font-dm-sans font-semibold text-green-deep">Order investigations</h3>
    <p className="mt-2 max-w-2xl text-sm text-text-mid font-dm-sans leading-relaxed">Tick the tests required and place the order. The FXMed request form downloads for the patient to take to the laboratory, and the order waits for its results on the Results tab.</p>

    <div className="mt-6 rounded-xl border border-green-deep/10 bg-cream/40 p-4">
      <h4 className="text-sm font-dm-sans font-semibold text-green-deep mb-4">Patient and request details</h4>
      {orderFor ? <div className="rounded-xl border border-green-deep/15 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-dm-sans font-semibold text-green-deep">{orderPatientName(orderFor)}</p><p className="mt-1 text-xs font-dm-sans text-text-mid">{orderFor.mrn} · {formatPatientAge(orderFor.date_of_birth) || 'Age not recorded'} · {orderFor.sex ? orderFor.sex.replace(/_/g, ' ') : 'Sex not recorded'}</p></div>
          {patient ? <span className="rounded-full bg-green-deep/10 px-3 py-1.5 text-xs font-dm-sans font-semibold text-green-deep">This patient</span> : <button type="button" onClick={() => setChosenPatient(null)} className="secondary">Change patient</button>}
        </div>
        <p className="mt-3 text-xs font-dm-sans text-text-mid">Name, age, sex, phone and email are printed on the request form from the patient record.</p>
      </div> : <PatientSearch onSelect={setChosenPatient} />}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div><label htmlFor="investigation-panel-title" className={labelClass}>Panel title</label><input id="investigation-panel-title" type="text" value={panelTitle} onChange={event => setPanelTitle(event.target.value)} placeholder={DEFAULT_PANEL_TITLE} className={fieldClass} /></div>
        <div><label htmlFor="investigation-requesting-clinician" className={labelClass}>Requesting clinician (optional)</label><input id="investigation-requesting-clinician" type="text" value={requestingClinician} onChange={event => setRequestingClinician(event.target.value)} placeholder="Enter requesting clinician's name" className={fieldClass} /></div>
      </div>
      <div className="mt-4">
        <label htmlFor="investigation-clinical-details" className={labelClass}>Clinical details</label>
        <textarea id="investigation-clinical-details" value={clinicalDetails} onChange={event => setClinicalDetails(event.target.value)} placeholder="Relevant symptoms, diagnosis, clinical history, reason for testing, or special instructions" rows={3} className={`${fieldClass} resize-y`} />
        <p className="mt-1 text-xs font-dm-sans text-text-mid">Printed on the request form.</p>
      </div>
    </div>

    <div className="mt-4 rounded-xl border border-green-deep/10 bg-cream/40 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div><h4 className="text-sm font-dm-sans font-semibold text-green-deep">Requested tests</h4><p className="mt-1 text-xs font-dm-sans text-text-mid">Only ticked tests appear on the form.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { setTests(CORE_PANEL_TESTS.map(test => test.name)); setPanelTitle(DEFAULT_PANEL_TITLE); setMessage('') }} className="secondary">Load core panel</button>
          <button type="button" onClick={() => { setTests([]); setMessage('') }} className="secondary">Clear</button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-green-deep/15 bg-white p-3 sm:flex-row sm:items-end">
        <div className="flex-1"><label htmlFor="investigation-test-search" className={labelClass}>Search investigations</label><input id="investigation-test-search" value={testSearch} onChange={event => setTestSearch(event.target.value)} placeholder="Search by test name…" className={fieldClass} /></div>
        <div className="rounded-lg bg-green-deep px-4 py-2.5 text-sm font-dm-sans font-semibold text-cream">{tests.length} selected</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">{catalogue.map(group => {
        const groupSelected = group.tests.filter(name => selected.has(name)).length
        return <section key={group.category} className="overflow-hidden rounded-xl border border-green-deep/10 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-green-deep/10 bg-green-deep/[0.04] px-4 py-3">
            <div><h5 className="text-sm font-dm-sans font-semibold text-green-deep">{group.category}</h5><p className="text-xs text-text-mid">{groupSelected} of {group.tests.length} selected</p></div>
            <button type="button" onClick={() => toggleGroup(group.tests)} className="text-xs font-dm-sans font-semibold text-green-mid hover:text-green-deep">{groupSelected === group.tests.length ? 'Clear group' : 'Select group'}</button>
          </div>
          <div className="divide-y divide-green-deep/[0.07]">{group.tests.map(name => <label key={name} className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-cream/40">
            <input type="checkbox" checked={selected.has(name)} onChange={() => toggleTest(name)} className="mt-0.5 h-4 w-4 shrink-0 accent-green-deep" />
            <span className="text-sm font-dm-sans text-green-deep">{name}</span>
          </label>)}</div>
        </section>
      })}</div>
      {!catalogue.length && <p className="rounded-lg border border-green-deep/10 bg-white p-4 text-sm text-text-mid">No investigations match your search.</p>}

      <div className="mt-4 rounded-lg border border-dashed border-green-deep/25 bg-white p-3">
        <label htmlFor="investigation-custom-tests" className={labelClass}>Add custom investigations</label>
        <div className="flex flex-col gap-2 sm:flex-row"><input id="investigation-custom-tests" value={bulkList} onChange={event => setBulkList(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCustomTests() } }} placeholder="One or more tests, separated by commas" className={`${fieldClass} flex-1`} /><button type="button" onClick={addCustomTests} className="rounded-lg bg-green-deep px-4 py-2 text-xs font-dm-sans font-semibold text-cream">Add to selection</button></div>
        {customTests.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{customTests.map(name => <button key={name} type="button" onClick={() => toggleTest(name)} aria-label={`Remove ${name}`} className="rounded-full bg-cream px-3 py-1.5 text-xs font-semibold text-green-deep">{name} ×</button>)}</div>}
      </div>

      <div className="mt-5 rounded-lg border border-green-deep/15 bg-white p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={stampOn} onChange={event => setStampOn(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-green-deep" />
          <span><span className="block text-sm font-dm-sans font-semibold text-green-deep">Include partner verification stamp</span><span className="mt-0.5 block text-xs font-dm-sans text-text-mid">Confirms that FXMed authorised this patient for the selected tests at a partner laboratory.</span></span>
        </label>
        {stampOn && <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="investigation-stamp-partner" className={labelClass}>Partner laboratory</label><select id="investigation-stamp-partner" value={stampPartner} onChange={event => setStampPartner(event.target.value)} className={fieldClass}>{PARTNER_LABORATORIES.map(partner => <option key={partner} value={partner}>{partner}</option>)}</select></div>
          <div><label htmlFor="investigation-stamp-date" className={labelClass}>Valid on</label><input id="investigation-stamp-date" type="date" value={stampDate} onChange={event => setStampDate(event.target.value)} className={fieldClass} /><p className="mt-1 text-xs font-dm-sans text-text-mid">The date the patient will attend for the tests.</p></div>
        </div>}
      </div>

      <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {message ? <p role={status === 'error' ? 'alert' : 'status'} className={`text-sm font-dm-sans ${status === 'error' ? 'text-red-600' : 'text-green-deep'}`}>{message}</p> : <span />}
        <button type="button" onClick={placeOrder} disabled={status === 'working'} className="primary shrink-0 disabled:opacity-50">{status === 'working' ? 'Placing order…' : 'Place order and download form'}</button>
      </div>
    </div>
  </div>
}
