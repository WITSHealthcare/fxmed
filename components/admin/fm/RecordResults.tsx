'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircleIcon, FileTextIcon, FolderOpenIcon, SparkleIcon } from '@phosphor-icons/react'
import type { FmEntry, FmPatient, Sex } from '@/lib/fmBiomarkers'
import { entriesFromReports, latestRound, usableResults, type PatientRecordResults, type RecordReport } from '@/lib/fmRecordResults'

// The results already in the linked patient's EMR record. Saved investigation
// results go straight into the analysis: the latest round is added on its own
// when the analysis has no results yet. Lab reports in the patient's
// documents can be read with AI from here, without uploading them again.

const api = '/api/admin/fm-analysis'
const day = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
const when = (value: string) => {
  const parsed = new Date(value)
  return value && !Number.isNaN(parsed.getTime()) ? day.format(parsed) : value
}
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
const reportDate = (report: RecordReport) =>
  report.collectedAt ? `collected ${when(report.collectedAt)}` : report.reportedAt ? `reported ${when(report.reportedAt)}` : `saved ${when(report.savedAt)}`
/** Collection dates saved as YYYY-MM-DD fill the analysis's date field. */
const isoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''

type Props = {
  patientId: string
  patientName: string
  sex: Sex
  /** True while the analysis has no results, so the latest round can be added on its own. */
  empty: boolean
  onImported: (entries: FmEntry[], details: Partial<FmPatient>, source: string) => void
}

export default function RecordResults({ patientId, patientName, sex, empty, onImported }: Props) {
  const [record, setRecord] = useState<PatientRecordResults | null>(null)
  const [error, setError] = useState('')
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [reading, setReading] = useState('')
  const [readError, setReadError] = useState('')
  // Read when the record arrives, not when the panel first renders.
  const latest = useRef({ sex, empty, onImported })
  useEffect(() => { latest.current = { sex, empty, onImported } })

  const addReports = (reports: RecordReport[]) => {
    const entries = entriesFromReports(reports, latest.current.sex)
    if (!entries.length) return
    const titles = reports.map(report => `${report.title}, ${reportDate(report)}`).join('; ')
    const collected = reports.map(report => isoDate(report.collectedAt)).find(Boolean) || ''
    latest.current.onImported(entries, collected ? { collectedAt: collected } : {}, `the patient's record (${titles})`)
    setAdded(current => {
      const next = new Set(current)
      reports.forEach(report => next.add(report.id))
      return next
    })
  }

  useEffect(() => {
    let cancelled = false
    fetch(`${api}?patientId=${patientId}`)
      .then(async response => {
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || 'The patient\'s results could not be loaded.')
        return result as PatientRecordResults
      })
      .then(result => {
        if (cancelled) return
        setRecord(result)
        if (latest.current.empty) addReports(latestRound(result.reports))
      })
      .catch(loadError => { if (!cancelled) setError(loadError.message) })
    return () => { cancelled = true }
  }, [patientId])

  const readFile = async (id: string, title: string) => {
    setReadError('')
    setReading(id)
    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_record', patientId, documentIds: [id], sex: latest.current.sex }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'The lab report could not be read.')
      if (!result.entries?.length) throw new Error(`No results could be read from ${title}. Check it is a lab report, or enter the results by hand.`)
      latest.current.onImported(result.entries, result.patient || {}, title)
      setAdded(current => new Set(current).add(id))
    } catch (failure) {
      setReadError(failure instanceof Error ? failure.message : 'The lab report could not be read.')
    } finally {
      setReading('')
    }
  }

  const firstName = patientName.split(' ')[0] || 'the patient'
  const nothing = record && !record.reports.length && !record.files.length

  return <div className="rounded-[20px] border border-green-deep/10 bg-white p-5">
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-green-deep/10 text-green-deep"><FolderOpenIcon size={20} weight="duotone" /></span>
      <div><h4 className="font-bold text-green-deep">From {firstName}&apos;s record</h4>
        <p className="mt-1 text-xs text-text-mid">Investigation results already saved in the EMR, and lab reports in the patient&apos;s documents.</p></div>
    </div>

    {error && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error} You can still import the lab report below.</p>}
    {!record && !error && <p className="mt-4 flex items-center gap-2 text-sm text-text-mid"><span className="h-4 w-4 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" />Looking for results in the record…</p>}
    {nothing && <p className="mt-4 rounded-lg bg-cream/50 px-3 py-2 text-sm text-text-mid">No investigation results or lab reports are saved for {firstName} yet. Import the lab report below.</p>}

    {record && record.reports.length > 0 && <div className="mt-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-mid">Saved results</p>
      <ul className="mt-2 divide-y divide-green-deep/10 rounded-xl border border-green-deep/10">
        {record.reports.map(report => {
          const count = usableResults(report)
          const isAdded = added.has(report.id)
          return <li key={report.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-green-deep">{report.title}</p>
              <p className="text-xs text-text-mid">{reportDate(report)} · {count ? plural(count, 'numeric result') : 'no numeric results'}</p></div>
            {isAdded
              ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircleIcon size={16} weight="fill" />Added</span>
              : <button type="button" disabled={!count} onClick={() => addReports([report])} className="secondary disabled:opacity-40">Add {count ? plural(count, 'result') : 'results'}</button>}
          </li>
        })}
      </ul>
    </div>}

    {record && record.files.length > 0 && <div className="mt-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-mid">Lab reports in the documents</p>
      <ul className="mt-2 divide-y divide-green-deep/10 rounded-xl border border-green-deep/10">
        {record.files.map(file => <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2"><FileTextIcon size={18} className="shrink-0 text-green-mid" />
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-green-deep">{file.title}</p><p className="text-xs text-text-mid">Added {when(file.createdAt)}</p></div></div>
          {added.has(file.id)
            ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircleIcon size={16} weight="fill" />Read</span>
            : <button type="button" disabled={!!reading} onClick={() => readFile(file.id, file.title)} className="secondary disabled:opacity-40">
                {reading === file.id ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" />Reading…</> : <><SparkleIcon size={16} />Read results</>}
              </button>}
        </li>)}
      </ul>
    </div>}
    {readError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{readError}</p>}
  </div>
}
