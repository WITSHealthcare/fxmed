'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowCounterClockwiseIcon, CircleNotchIcon, ClockIcon, CopyIcon, DownloadSimpleIcon, EyeIcon,
  FileTextIcon, FlaskIcon, ImageIcon, PencilSimpleIcon, PlusIcon, UploadSimpleIcon, XIcon,
} from '@phosphor-icons/react'
import InvestigationOrderForm, { INVESTIGATIONS_API, patientSnapshot, type OrderPatient, type OrderTemplate } from '@/components/admin/emr/InvestigationOrderForm'
import ResultsEditor from '@/components/admin/emr/ResultsEditor'
import { Alert, Empty, Loading, Panel } from '@/components/admin/emr/ui'
import { base64ToBlob, blobToBase64, downloadBlob, formatFileSize } from '@/lib/fileDownload'
import { resultRowsForOrder } from '@/lib/investigationResultCatalog'
import { generateInvestigationResultPdf, type InvestigationResult } from '@/lib/investigationResultPdf'
import {
  DEFAULT_REPORT_TITLE, downloadBase, mapLabReportFile, mergeLabResults,
  type InvestigationOrder, type InvestigationPatientSnapshot, type InvestigationReport, type InvestigationReportMeta, type LabReportFile,
} from '@/lib/investigations'

// The investigation workflow: an order waits for results until they are typed
// in or read from the lab's uploaded report, then its FXMed results PDF can be
// downloaded. See lib/investigations.ts for the records behind it.

const EMR_API = '/api/admin/emr'
const LAB_REPORT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const LAB_REPORT_ACCEPT = LAB_REPORT_TYPES.join(',')
const MAX_LAB_REPORT_BYTES = 15 * 1024 * 1024
const day = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDay = (value: string | null | undefined) => value ? day.format(new Date(value)) : '—'

type Chart = Record<string, any>
type Lists = { orders: InvestigationOrder[]; reports: InvestigationReport[]; files: LabReportFile[] }

/** Everything the results window needs, from a patient record or the worklist. */
type Entry = {
  patientId: string
  mrn?: string
  snapshot: InvestigationPatientSnapshot
  order: InvestigationOrder | null
  report: InvestigationReport | null
  files: LabReportFile[]
  /** Lab report files chosen on an order card, uploaded as the window opens. */
  pendingUpload?: File[]
}

function daysSince(value: string) {
  const start = new Date(value)
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000))
}

const isFlagged = (row: InvestigationResult) => row.flag === 'High' || row.flag === 'Low' || row.flag === 'Abnormal'

async function downloadStoredPdf(kind: 'order' | 'report', id: string) {
  const response = await fetch(`${INVESTIGATIONS_API}?download=${kind}&id=${id}`)
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.documentBase64) throw new Error(result.error || 'The document could not be downloaded.')
  downloadBlob(base64ToBlob(result.documentBase64), result.downloadName)
}

async function openLabReport(id: string) {
  const response = await fetch(`${EMR_API}?resource=document_url&id=${id}`)
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'The lab report could not be opened.')
  window.open(result.url, '_blank', 'noopener,noreferrer')
}

// Order and report actions shared by the patient record and the worklist.
function useActions(onChanged: () => void) {
  const [error, setError] = useState('')
  const run = useCallback(async (task: () => Promise<unknown>, refresh = true) => {
    setError('')
    try {
      await task()
      if (refresh) onChanged()
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Something went wrong. Try again.')
    }
  }, [onChanged])
  const send = async (method: 'PATCH' | 'DELETE', body?: Record<string, unknown>, query = '') => {
    const response = await fetch(`${INVESTIGATIONS_API}${query}`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'The change could not be saved.')
  }
  return {
    error,
    setError,
    download: (kind: 'order' | 'report', id: string) => run(() => downloadStoredPdf(kind, id), false),
    openFile: (id: string) => run(() => openLabReport(id), false),
    cancelOrder: (order: InvestigationOrder) => {
      const question = order.status
        ? `Cancel the order for ${order.panelTitle}? It will stop waiting for results. You can reopen it from the order history.`
        : `Close the earlier order for ${order.panelTitle} without recording results? It stays in the order history, where you can reopen it.`
      if (window.confirm(question)) run(() => send('PATCH', { action: 'status', id: order.id, status: 'cancelled' }))
    },
    link: (kind: 'order' | 'report', id: string, patientId: string) => run(() => send('PATCH', { action: 'link', kind, id, patientId })),
    reopenOrder: (order: InvestigationOrder) => run(() => send('PATCH', { action: 'status', id: order.id, status: 'awaiting_results' })),
    deleteOrder: (order: InvestigationOrder) => {
      if (window.confirm(`Delete the order for ${order.panelTitle} and its request form? Any results and lab reports saved for it stay on the patient record.`)) run(() => send('DELETE', undefined, `?kind=order&id=${order.id}`))
    },
    deleteReport: (report: InvestigationReport) => {
      if (window.confirm('Delete these results and their FXMed PDF? Uploaded lab reports are kept, and the order goes back to waiting for results.')) run(() => send('DELETE', undefined, `?kind=report&id=${report.id}`))
    },
  }
}

function SubTabs<T extends string>({ value, onChange, items }: { value: T; onChange: (value: T) => void; items: { id: T; label: string; description: string; count?: number }[] }) {
  return <div className="rounded-[20px] border border-green-deep/10 bg-white p-2 shadow-lg">
    <div className="grid gap-2 md:grid-cols-2">{items.map(item => {
      const active = value === item.id
      return <button key={item.id} type="button" aria-pressed={active} onClick={() => onChange(item.id)} className={`rounded-xl p-4 text-left transition-colors ${active ? 'bg-green-deep text-cream' : 'bg-cream/40 text-green-deep hover:bg-green-deep/5'}`}>
        <span className="flex items-center gap-2 font-dm-sans text-sm font-semibold">{item.label}{item.count ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? 'bg-gold text-green-deep' : 'bg-amber-100 text-amber-800'}`}>{item.count} awaiting</span> : null}</span>
        <span className={`mt-1 block font-dm-sans text-xs ${active ? 'text-cream/80' : 'text-text-mid'}`}>{item.description}</span>
      </button>
    })}</div>
  </div>
}

function FileLinks({ files, onOpen }: { files: LabReportFile[]; onOpen: (id: string) => void }) {
  if (!files.length) return null
  return <div className="mt-3 flex flex-wrap gap-2">{files.map(file => {
    const Icon = file.mimeType?.startsWith('image/') ? ImageIcon : FileTextIcon
    return <button key={file.id} type="button" onClick={() => onOpen(file.id)} title="Open the lab's report" className="inline-flex max-w-full items-center gap-2 rounded-full border border-green-deep/10 bg-white px-3 py-1.5 text-xs font-semibold text-green-deep hover:border-green-mid">
      <Icon size={16} weight="duotone" className="shrink-0 text-green-mid" /><span className="truncate">{file.originalName}</span>{file.fileSize ? <span className="shrink-0 font-normal text-text-mid">{formatFileSize(file.fileSize)}</span> : null}
    </button>
  })}</div>
}

/** A button that opens the file chooser for lab reports. */
function UploadButton({ onFiles, label = 'Upload lab report', className = 'secondary', disabled }: { onFiles: (files: File[]) => void; label?: string; className?: string; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  return <>
    <button type="button" disabled={disabled} onClick={() => input.current?.click()} className={`${className} disabled:opacity-50`}><UploadSimpleIcon size={18} weight="bold" />{label}</button>
    <input ref={input} type="file" multiple accept={LAB_REPORT_ACCEPT} className="hidden" onChange={event => {
      const files = Array.from(event.target.files || [])
      event.target.value = ''
      if (files.length) onFiles(files)
    }} />
  </>
}

function TestChips({ tests, limit = 8 }: { tests: string[]; limit?: number }) {
  return <div className="mt-3 flex flex-wrap gap-1.5">
    {tests.slice(0, limit).map(test => <span key={test} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-green-deep ring-1 ring-green-deep/10">{test}</span>)}
    {tests.length > limit && <span className="rounded-full px-2 py-1 text-[11px] font-semibold text-text-mid">+{tests.length - limit} more</span>}
  </div>
}

// Earlier orders, made before results were tracked, use the same card: their
// results may still be outstanding, but nothing says so.
function AwaitingOrderCard({ order, report, files, showPatient, onEnter, onUpload, onView, onOpenPatient, actions }: {
  order: InvestigationOrder
  report?: InvestigationReport
  files: LabReportFile[]
  showPatient?: boolean
  onEnter: () => void
  onUpload: (files: File[]) => void
  onView: () => void
  onOpenPatient?: () => void
  actions: ReturnType<typeof useActions>
}) {
  const waited = daysSince(order.createdAt)
  const earlier = !order.status
  return <article className={`rounded-[18px] border p-5 ${earlier ? 'border-green-deep/10 bg-white' : 'border-amber-200 bg-amber-50/40'}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {showPatient && <button type="button" onClick={onOpenPatient} disabled={!onOpenPatient} className="mb-1 text-xs font-bold text-green-mid hover:text-green-deep hover:underline">{order.mrn ? `${order.mrn} · ` : ''}{order.patient.fullName || 'Patient'}</button>}
        <p className="font-bold text-green-deep">{order.panelTitle}</p>
        <p className="mt-1 text-xs text-text-mid">Ordered {formatDay(order.createdAt)} · {order.tests.length} test{order.tests.length === 1 ? '' : 's'}{order.requestingClinician ? ` · Requested by ${order.requestingClinician}` : ''}</p>
      </div>
      {earlier
        ? <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-text-mid">Results not recorded</span>
        : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800"><ClockIcon size={14} weight="bold" />{waited === 0 ? 'Awaiting results · ordered today' : `Awaiting results · ${waited} day${waited === 1 ? '' : 's'}`}</span>}
    </div>
    <TestChips tests={order.tests} />
    {report && <p className="mt-3 text-xs font-semibold text-green-deep">{report.results.length} result{report.results.length === 1 ? '' : 's'} saved on {formatDay(report.updatedAt || report.createdAt)}. Waiting for the rest.</p>}
    <FileLinks files={files} onOpen={actions.openFile} />
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button type="button" onClick={onEnter} disabled={!order.patientId} className="primary disabled:opacity-50"><PencilSimpleIcon size={18} weight="bold" />{report ? 'Add remaining results' : 'Enter results'}</button>
      <UploadButton onFiles={onUpload} disabled={!order.patientId} />
      <button type="button" onClick={() => actions.download('order', order.id)} className="secondary"><DownloadSimpleIcon size={18} weight="bold" />Request form</button>
      {report && <button type="button" onClick={onView} className="secondary"><EyeIcon size={18} weight="bold" />View results so far</button>}
      <button type="button" onClick={() => actions.cancelOrder(order)} className="px-2 text-sm font-semibold text-text-mid hover:text-red-700">{earlier ? 'Close without results' : 'Cancel order'}</button>
    </div>
  </article>
}

function ReportCard({ report, order, files, onView, onEdit, actions }: { report: InvestigationReport; order?: InvestigationOrder; files: LabReportFile[]; onView: () => void; onEdit: () => void; actions: ReturnType<typeof useActions> }) {
  const flagged = report.results.filter(isFlagged)
  const meta = report.reportMeta
  return <article className="rounded-[18px] border border-green-deep/10 bg-[#FCFFF0] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-bold text-green-deep">{order?.panelTitle || meta.reportTitle}</p>
        <p className="mt-1 text-xs text-text-mid">{report.results.length} result{report.results.length === 1 ? '' : 's'} · saved {formatDay(report.updatedAt || report.createdAt)}{meta.reportedAt ? ` · reported ${meta.reportedAt}` : ''}{order ? ` · ordered ${formatDay(order.createdAt)}` : ' · no order'}</p>
      </div>
      <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${flagged.length ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{flagged.length ? `${flagged.length} flagged` : 'None flagged'}</span>
    </div>
    {flagged.length > 0 && <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Flagged results">{flagged.slice(0, 6).map((row, index) => <li key={`${row.test}-${index}`} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">{row.test}: {row.result}{row.unit ? ` ${row.unit}` : ''} ({row.flag})</li>)}{flagged.length > 6 && <li className="px-2 py-1 text-[11px] font-semibold text-text-mid">+{flagged.length - 6} more</li>}</ul>}
    <FileLinks files={files} onOpen={actions.openFile} />
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button type="button" onClick={onView} className="primary"><EyeIcon size={18} weight="bold" />View results</button>
      <button type="button" onClick={() => actions.download('report', report.id)} className="secondary"><DownloadSimpleIcon size={18} weight="bold" />Download FXMed PDF</button>
      <button type="button" onClick={onEdit} disabled={!report.patientId} className="secondary disabled:opacity-50"><PencilSimpleIcon size={18} weight="bold" />Edit results</button>
      <button type="button" onClick={() => actions.deleteReport(report)} className="px-2 text-sm font-semibold text-text-mid hover:text-red-700">Delete</button>
    </div>
  </article>
}

function flagTone(flag: InvestigationResult['flag']) {
  if (flag === 'High' || flag === 'Low' || flag === 'Abnormal') return 'bg-red-50 text-red-700 ring-red-200'
  if (flag === 'Normal') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  return ''
}

/** Every result saved for an order, read-only, grouped by section as on the PDF. */
function ResultsViewer({ report, order, files, patientLabel, onClose, onEdit, actions }: {
  report: InvestigationReport
  order: InvestigationOrder | null
  files: LabReportFile[]
  patientLabel: string
  onClose: () => void
  onEdit?: () => void
  actions: ReturnType<typeof useActions>
}) {
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeButton.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const meta = report.reportMeta
  const flagged = report.results.filter(isFlagged).length
  const sections: { name: string; rows: InvestigationResult[] }[] = []
  for (const row of report.results) {
    const name = row.section.trim() || 'Other investigations'
    const group = sections.find(section => section.name.toLowerCase() === name.toLowerCase())
    if (group) group.rows.push(row)
    else sections.push({ name, rows: [row] })
  }
  const details = [['Report', meta.reportTitle], ['Specimen', meta.specimen], ['Requesting clinician', meta.clinician], ['Collected', meta.collectedAt], ['Reported', meta.reportedAt]]

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div role="dialog" aria-modal="true" aria-labelledby="results-view-title" className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-green-deep/10 px-6 py-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-green-mid">Investigation results</p>
          <h3 id="results-view-title" className="mt-1 text-2xl font-bold">{order?.panelTitle || meta.reportTitle}</h3>
          <p className="mt-1 text-sm text-text-mid">{patientLabel}{order ? ` · ordered ${formatDay(order.createdAt)}` : ' · results without an order'} · saved {formatDay(report.updatedAt || report.createdAt)}</p>
        </div>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Close" className="icon-button shrink-0"><XIcon /></button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-green-deep/5 px-3 py-1.5 text-xs font-bold text-green-deep">{report.results.length} result{report.results.length === 1 ? '' : 's'}</span>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${flagged ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{flagged ? `${flagged} flagged` : 'None flagged'}</span>
          {order?.status === 'awaiting_results' && <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">More results to come</span>}
        </div>

        <dl className="grid gap-x-6 gap-y-3 rounded-[16px] border border-green-deep/10 bg-cream/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {details.map(([label, value]) => <div key={label}><dt className="text-[10px] font-bold uppercase tracking-wide text-text-mid/70">{label}</dt><dd className="mt-0.5 text-sm font-semibold text-green-deep">{value || '—'}</dd></div>)}
        </dl>

        <div className="overflow-x-auto rounded-[16px] border border-green-deep/10">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead><tr className="bg-green-deep text-left text-[11px] uppercase tracking-wide text-white"><th scope="col" className="px-4 py-2.5 font-bold">Test</th><th scope="col" className="px-4 py-2.5 font-bold">Result</th><th scope="col" className="px-4 py-2.5 font-bold">Unit</th><th scope="col" className="px-4 py-2.5 font-bold">Reference range</th><th scope="col" className="px-4 py-2.5 font-bold">Flag</th></tr></thead>
            {sections.map(section => <tbody key={section.name}>
              <tr><th scope="colgroup" colSpan={5} className="bg-[#eef2d5] px-4 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-green-deep">{section.name}</th></tr>
              {section.rows.map((row, index) => <tr key={`${row.test}-${index}`} className={`border-t border-green-deep/10 ${isFlagged(row) ? 'bg-red-50/40' : ''}`}>
                <th scope="row" className="px-4 py-2.5 text-left font-semibold text-green-deep">{row.test}{row.remark && <span className="mt-0.5 block text-xs font-normal text-text-mid">{row.remark}</span>}</th>
                <td className={`px-4 py-2.5 font-bold ${isFlagged(row) ? 'text-red-700' : 'text-green-deep'}`}>{row.result}</td>
                <td className="px-4 py-2.5 text-text-mid">{row.unit || '—'}</td>
                <td className="px-4 py-2.5 text-text-mid">{row.referenceRange || '—'}</td>
                <td className="px-4 py-2.5">{row.flag ? <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${flagTone(row.flag)}`}>{row.flag}</span> : <span className="text-text-mid">—</span>}</td>
              </tr>)}
            </tbody>)}
          </table>
        </div>

        {meta.notes && <div className="rounded-[16px] border-l-4 border-green-mid bg-[#f7f8ed] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-text-mid/70">Clinical notes</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-text-dark">{meta.notes}</p></div>}

        {files.length > 0 && <div><p className="text-[10px] font-bold uppercase tracking-wide text-text-mid/70">Lab report</p><FileLinks files={files} onOpen={actions.openFile} /></div>}
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-green-deep/10 px-6 py-4">
        <button type="button" onClick={onClose} className="secondary">Close</button>
        {onEdit && <button type="button" onClick={onEdit} className="secondary"><PencilSimpleIcon size={18} weight="bold" />Edit results</button>}
        <button type="button" onClick={() => actions.download('report', report.id)} className="primary"><DownloadSimpleIcon size={18} weight="bold" />Download FXMed PDF</button>
      </div>
    </div>
  </div>
}

const statusChip: Record<string, { text: string; tone: string }> = {
  awaiting_results: { text: 'Awaiting results', tone: 'bg-amber-50 text-amber-800' },
  completed: { text: 'Results in', tone: 'bg-emerald-50 text-emerald-700' },
  cancelled: { text: 'Closed without results', tone: 'bg-gray-100 text-text-mid' },
  untracked: { text: 'Not tracked', tone: 'bg-gray-100 text-text-mid' },
}

function OrderHistory({ orders, showPatient, loading, onReuse, onEnter, onOpenPatient, actions }: {
  orders: InvestigationOrder[]
  showPatient?: boolean
  loading?: boolean
  onReuse: (order: InvestigationOrder) => void
  onEnter: (order: InvestigationOrder) => void
  onOpenPatient?: (order: InvestigationOrder) => void
  actions: ReturnType<typeof useActions>
}) {
  return <Panel title={showPatient ? 'Recent orders' : 'Order history'} subtitle={showPatient ? 'The latest investigation orders across all patients.' : `${orders.length} order${orders.length === 1 ? '' : 's'} for this patient.`}>
    {loading ? <Loading /> : <div className="mt-5 divide-y divide-green-deep/10">{orders.length ? orders.map(order => {
      const chip = statusChip[order.status || 'untracked']
      return <div key={order.id} className="flex flex-wrap items-center gap-4 py-4">
        <div className="min-w-56 flex-1">
          {showPatient && <button type="button" disabled={!order.patientId} onClick={() => onOpenPatient?.(order)} className="text-xs font-bold text-green-mid hover:underline disabled:no-underline">{order.mrn ? `${order.mrn} · ` : ''}{order.patient.fullName || 'Unlinked patient'}</button>}
          <p className="font-bold text-green-deep">{order.panelTitle}</p>
          <p className="mt-0.5 text-xs text-text-mid">{formatDay(order.createdAt)} · {order.tests.length} test{order.tests.length === 1 ? '' : 's'}{order.createdByEmail ? ` · by ${order.createdByEmail}` : ''}</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${chip.tone}`}>{chip.text}</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => actions.download('order', order.id)} className="secondary"><DownloadSimpleIcon size={16} weight="bold" />Form</button>
          <button type="button" onClick={() => onReuse(order)} title="Start a new order with these tests" className="secondary"><CopyIcon size={16} weight="bold" />Reuse tests</button>
          {!order.status && order.patientId && <button type="button" onClick={() => onEnter(order)} className="secondary"><PencilSimpleIcon size={16} weight="bold" />Enter results</button>}
          {order.status === 'cancelled' && <button type="button" onClick={() => actions.reopenOrder(order)} className="secondary"><ArrowCounterClockwiseIcon size={16} weight="bold" />Reopen</button>}
          <button type="button" onClick={() => actions.deleteOrder(order)} className="px-2 text-sm font-semibold text-text-mid hover:text-red-700">Delete</button>
        </div>
      </div>
    }) : <Empty text="No investigations have been ordered yet." />}</div>}
  </Panel>
}

// Forms and reports made under this patient's name without being linked to a
// patient record. Two patients can share a name, so each is linked only when
// a clinician confirms it.
function NameMatches({ name, orders, reports, onLink, actions }: {
  name: string
  orders: InvestigationOrder[]
  reports: InvestigationReport[]
  onLink: (kind: 'order' | 'report', id: string) => void
  actions: ReturnType<typeof useActions>
}) {
  const items = [
    ...orders.map(order => ({ kind: 'order' as const, id: order.id, at: order.createdAt, title: `Request form · ${order.panelTitle}`, detail: `${order.tests.length} test${order.tests.length === 1 ? '' : 's'}` })),
    ...reports.map(report => ({ kind: 'report' as const, id: report.id, at: report.createdAt, title: `Results · ${report.reportMeta.reportTitle}`, detail: `${report.results.length} result${report.results.length === 1 ? '' : 's'}` })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  if (!items.length) return null
  return <Panel title="Found under this patient's name" subtitle={`${items.length} earlier record${items.length === 1 ? ' was' : 's were'} made for "${name}" without being linked to a patient record. Download each one to check it belongs to this patient, then link it. Leave any that belong to someone else with the same name.`}>
    <div className="mt-5 divide-y divide-green-deep/10">{items.map(item => <div key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center gap-4 py-4">
      <div className="min-w-56 flex-1"><p className="font-bold text-green-deep">{item.title}</p><p className="mt-0.5 text-xs text-text-mid">{formatDay(item.at)} · {item.detail}</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => actions.download(item.kind, item.id)} className="secondary"><DownloadSimpleIcon size={16} weight="bold" />Download to check</button>
        <button type="button" onClick={() => onLink(item.kind, item.id)} className="primary">Link to this patient</button>
      </div>
    </div>)}</div>
  </Panel>
}

function orderTemplate(order: InvestigationOrder, samePatient: boolean): OrderTemplate {
  // Clinical details describe one patient, so they only carry over on that
  // patient's own record.
  return { tests: order.tests, panelTitle: order.panelTitle, requestingClinician: order.requestingClinician, clinicalDetails: samePatient ? order.clinicalDetails : '' }
}

/** The Investigations tab of a patient record. */
export function PatientInvestigations({ patient, chart, onChanged, attachments }: { patient: OrderPatient; chart: Chart; onChanged: () => void; attachments?: ReactNode }) {
  const orders: InvestigationOrder[] = chart.investigationOrders || []
  const reports: InvestigationReport[] = chart.investigationReports || []
  const files: LabReportFile[] = (chart.documents || []).filter((item: any) => item.investigation_form_id).map(mapLabReportFile)
  const [tab, setTab] = useState<'results' | 'order'>('results')
  const [template, setTemplate] = useState<{ key: number; value: OrderTemplate } | null>(null)
  const [entry, setEntry] = useState<Entry | null>(null)
  const [viewing, setViewing] = useState<{ report: InvestigationReport; order: InvestigationOrder | null } | null>(null)
  const closeViewer = useCallback(() => setViewing(null), [])
  const actions = useActions(onChanged)

  const awaiting = orders.filter(order => order.status === 'awaiting_results')
  const earlier = orders.filter(order => !order.status)
  const reportFor = (order: InvestigationOrder) => reports.find(report => report.orderId === order.id)
  const filesFor = (orderId: string | null) => orderId ? files.filter(file => file.orderId === orderId) : []
  // Results for orders still awaiting the rest are shown on their order.
  const awaitingIds = new Set(awaiting.map(order => order.id))
  const finished = reports.filter(report => !report.orderId || !awaitingIds.has(report.orderId))
  const open = (order: InvestigationOrder | null, report: InvestigationReport | null, pendingUpload?: File[]) => setEntry({
    patientId: patient.id, mrn: patient.mrn, snapshot: patientSnapshot(patient), order, report,
    files: filesFor(order?.id || report?.orderId || null), pendingUpload,
  })

  return <div className="space-y-6">
    <SubTabs value={tab} onChange={setTab} items={[
      { id: 'results', label: 'Results', description: 'Orders waiting for results, and results received.', count: awaiting.length },
      { id: 'order', label: 'Order investigations', description: 'Request tests and download the request form.' },
    ]} />
    {chart.investigationError && <Alert tone="error">{chart.investigationError}</Alert>}
    {actions.error && <Alert tone="error">{actions.error}</Alert>}

    {tab === 'results' && <>
      <Panel title="Results" subtitle={finished.length ? `${finished.length} results report${finished.length === 1 ? '' : 's'}. Each downloads as an FXMed-branded PDF.` : 'Results appear here once they are saved.'} action={<button type="button" onClick={() => open(null, null)} className="secondary"><PlusIcon size={18} weight="bold" />Results without an order</button>}>
        <div className="mt-5 space-y-3">{finished.length ? finished.map(report => {
          const order = orders.find(item => item.id === report.orderId)
          return <ReportCard key={report.id} report={report} order={order} files={filesFor(report.orderId)} actions={actions} onView={() => setViewing({ report, order: order || null })} onEdit={() => open(order || null, report)} />
        }) : <Empty text="No results have been recorded yet." />}</div>
      </Panel>
      <Panel title="Awaiting results" subtitle={awaiting.length ? `${awaiting.length} order${awaiting.length === 1 ? ' is' : 's are'} waiting for results. Enter them by hand, or upload the lab's report to read them in.` : 'Orders appear here until their results are in.'}>
        <div className="mt-5 space-y-3">{awaiting.length ? awaiting.map(order => <AwaitingOrderCard key={order.id} order={order} report={reportFor(order)} files={filesFor(order.id)} actions={actions}
          onView={() => { const report = reportFor(order); if (report) setViewing({ report, order }) }}
          onEnter={() => open(order, reportFor(order) || null)}
          onUpload={selected => open(order, reportFor(order) || null, selected)} />)
          : <Empty text="No orders are waiting for results." />}</div>
      </Panel>
      {earlier.length > 0 && <Panel title="Earlier orders" subtitle={`${earlier.length} order${earlier.length === 1 ? ' was' : 's were'} placed before results were tracked, so the system cannot tell whether their results came back. Enter or upload the results for any you have, and close the rest.`}>
        <div className="mt-5 space-y-3">{earlier.map(order => <AwaitingOrderCard key={order.id} order={order} report={reportFor(order)} files={filesFor(order.id)} actions={actions}
          onView={() => { const report = reportFor(order); if (report) setViewing({ report, order }) }}
          onEnter={() => open(order, reportFor(order) || null)}
          onUpload={selected => open(order, reportFor(order) || null, selected)} />)}</div>
      </Panel>}
      <NameMatches name={patientSnapshot(patient).fullName} orders={chart.unlinkedInvestigationOrders || []} reports={chart.unlinkedInvestigationReports || []} actions={actions}
        onLink={(kind, id) => actions.link(kind, id, patient.id)} />
      {attachments}
    </>}

    {tab === 'order' && <>
      <InvestigationOrderForm key={template?.key || 0} patient={patient} template={template?.value} onOrdered={onChanged} />
      <OrderHistory orders={orders} actions={actions} onEnter={order => open(order, null)}
        onReuse={order => { setTemplate({ key: Date.now(), value: orderTemplate(order, true) }); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
    </>}

    {viewing && <ResultsViewer report={viewing.report} order={viewing.order} files={filesFor(viewing.report.orderId)} patientLabel={`${patient.mrn} · ${patientSnapshot(patient).fullName}`} actions={actions} onClose={closeViewer}
      onEdit={viewing.report.patientId ? () => { const { report, order } = viewing; setViewing(null); open(order, report) } : undefined} />}
    {entry && <ResultsEntry entry={entry} onClose={changed => { setEntry(null); if (changed) onChanged() }} onSaved={() => { setEntry(null); onChanged() }} />}
  </div>
}

/** The EMR-wide Investigations view: every order awaiting results, and ordering for any patient. */
export function InvestigationWorklist({ onPatient }: { onPatient: (patientId: string) => void }) {
  const [tab, setTab] = useState<'awaiting' | 'order'>('awaiting')
  const [lists, setLists] = useState<Lists | null>(null)
  const [recent, setRecent] = useState<InvestigationOrder[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [template, setTemplate] = useState<{ key: number; value: OrderTemplate } | null>(null)
  const [entry, setEntry] = useState<Entry | null>(null)
  const [viewing, setViewing] = useState<{ report: InvestigationReport; order: InvestigationOrder } | null>(null)
  const closeViewer = useCallback(() => setViewing(null), [])

  const loadAwaiting = useCallback(async () => {
    const response = await fetch(`${INVESTIGATIONS_API}?view=awaiting`)
    const result = await response.json().catch(() => ({}))
    if (response.ok) { setLists(result); setLoadError('') } else setLoadError(result.error || 'Orders awaiting results could not be loaded.')
  }, [])
  const loadRecent = useCallback(async () => {
    const response = await fetch(`${INVESTIGATIONS_API}?view=recent`)
    const result = await response.json().catch(() => ({}))
    if (response.ok) setRecent(result.orders || []); else setLoadError(result.error || 'Recent orders could not be loaded.')
  }, [])
  const refresh = useCallback(() => { loadAwaiting(); if (recent) loadRecent() }, [loadAwaiting, loadRecent, recent])
  const actions = useActions(refresh)

  useEffect(() => { loadAwaiting() }, [loadAwaiting])
  useEffect(() => { if (tab === 'order' && !recent) loadRecent() }, [tab, recent, loadRecent])

  const open = (order: InvestigationOrder, pendingUpload?: File[]) => {
    if (!order.patientId) return
    setEntry({
      patientId: order.patientId, mrn: order.mrn, snapshot: order.patient, order,
      report: lists?.reports.find(report => report.orderId === order.id) || null,
      files: (lists?.files || []).filter(file => file.orderId === order.id),
      pendingUpload,
    })
  }

  return <div className="space-y-6">
    <SubTabs value={tab} onChange={setTab} items={[
      { id: 'awaiting', label: 'Awaiting results', description: 'Every order still waiting for its results, longest-waiting first.', count: lists?.orders.length },
      { id: 'order', label: 'Order investigations', description: 'Request tests for a registered patient.' },
    ]} />
    {loadError && <Alert tone="error">{loadError}</Alert>}
    {actions.error && <Alert tone="error">{actions.error}</Alert>}

    {tab === 'awaiting' && <Panel title="Awaiting results" subtitle="Enter results by hand, or upload the lab's report to read them in. Each order closes when its results are saved.">
      {!lists ? (loadError ? null : <Loading />) : <div className="mt-5 space-y-3">{lists.orders.length ? lists.orders.map(order => <AwaitingOrderCard key={order.id} order={order} showPatient actions={actions}
        report={lists.reports.find(report => report.orderId === order.id)}
        files={lists.files.filter(file => file.orderId === order.id)}
        onEnter={() => open(order)}
        onUpload={selected => open(order, selected)}
        onView={() => { const report = lists.reports.find(item => item.orderId === order.id); if (report) setViewing({ report, order }) }}
        onOpenPatient={order.patientId ? () => onPatient(order.patientId!) : undefined} />)
        : <Empty text="No orders are waiting for results." />}</div>}
    </Panel>}

    {tab === 'order' && <>
      <InvestigationOrderForm key={template?.key || 0} template={template?.value} onOrdered={() => { loadAwaiting(); loadRecent() }} />
      <OrderHistory orders={recent || []} loading={!recent} showPatient actions={actions}
        onEnter={order => open(order)}
        onOpenPatient={order => order.patientId && onPatient(order.patientId)}
        onReuse={order => { setTemplate({ key: Date.now(), value: orderTemplate(order, false) }); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
    </>}

    {viewing && <ResultsViewer report={viewing.report} order={viewing.order} files={(lists?.files || []).filter(file => file.orderId === viewing.order.id)} patientLabel={`${viewing.order.mrn ? `${viewing.order.mrn} · ` : ''}${viewing.order.patient.fullName}`} actions={actions} onClose={closeViewer}
      onEdit={() => { const { order } = viewing; setViewing(null); open(order) }} />}
    {entry && <ResultsEntry entry={entry} onClose={changed => { setEntry(null); if (changed) refresh() }} onSaved={() => { setEntry(null); refresh() }} />}
  </div>
}

function listNames(names: string[], limit = 8) {
  return names.length > limit ? `${names.slice(0, limit).join(', ')} and ${names.length - limit} more` : names.join(', ')
}

const detailClass = 'w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm text-green-deep focus:border-green-deep focus:outline-none'

function ResultsEntry({ entry, onClose, onSaved }: { entry: Entry; onClose: (changed: boolean) => void; onSaved: () => void }) {
  const { order, report, snapshot, patientId } = entry
  const [rows, setRows] = useState<InvestigationResult[]>(() => report ? report.results.map(row => ({ ...row })) : order ? resultRowsForOrder(order.tests) : [])
  const [meta, setMeta] = useState<InvestigationReportMeta>(() => report ? { ...report.reportMeta } : { reportTitle: DEFAULT_REPORT_TITLE, specimen: '', collectedAt: '', reportedAt: '', clinician: order?.requestingClinician || '', notes: '' })
  const [files, setFiles] = useState(entry.files)
  const [completeOrder, setCompleteOrder] = useState(true)
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'reading' | 'saving'>('idle')
  const [notice, setNotice] = useState('')
  const [missing, setMissing] = useState<string[]>([])
  const [error, setError] = useState('')
  const rowsRef = useRef(rows)
  const initial = useRef(JSON.stringify({ rows, meta }))
  const uploaded = useRef(false)
  const started = useRef(false)
  const busy = phase !== 'idle'

  useEffect(() => { rowsRef.current = rows }, [rows])

  // warning carries an upload problem through to the result of reading.
  async function read(documentIds: string[], warning = '') {
    setPhase('reading'); setError(warning); setMissing([])
    setNotice('Reading the results from the lab report. This can take up to a minute…')
    try {
      const response = await fetch(INVESTIGATIONS_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read', patientId, orderId: order?.id, documentIds }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'The results could not be read from the lab report.')
      const extracted: InvestigationResult[] = Array.isArray(result.results) ? result.results : []
      if (!extracted.length) {
        setNotice('')
        setError(order ? 'None of the ordered tests were found in this lab report. Check it is the right report, or enter the results by hand.' : 'No results were found in this lab report. Enter them by hand.')
        return
      }
      const merge = mergeLabResults(rowsRef.current, extracted)
      setRows(merge.rows)
      setMissing(merge.missing)
      setMeta(current => ({
        ...current,
        specimen: current.specimen || result.report?.specimen || '',
        collectedAt: current.collectedAt || result.report?.collectedAt || '',
        reportedAt: current.reportedAt || result.report?.reportedAt || '',
      }))
      const added = extracted.length - merge.kept
      setNotice(`${added} result${added === 1 ? '' : 's'} read from the lab report${merge.kept ? `; ${merge.kept} you had already entered ${merge.kept === 1 ? 'was' : 'were'} kept as typed` : ''}. Check each value against the original before saving.`)
    } catch (readError) {
      setNotice('')
      setError(readError instanceof Error ? readError.message : 'The results could not be read from the lab report.')
    } finally {
      setPhase('idle')
    }
  }

  async function uploadAndRead(selected: File[]) {
    setMissing([])
    const accepted = selected.filter(file => LAB_REPORT_TYPES.includes(file.type))
    let warning = accepted.length < selected.length ? 'Only PDFs and photos (JPG, PNG or WEBP) can be uploaded; other files were skipped.' : ''
    setError(warning)
    const tooLarge = accepted.find(file => file.size > MAX_LAB_REPORT_BYTES)
    if (tooLarge) { setError(`${tooLarge.name} is larger than 15 MB.`); return }
    if (!accepted.length) return

    setPhase('uploading')
    const saved: LabReportFile[] = []
    for (let index = 0; index < accepted.length; index++) {
      const file = accepted[index]
      setNotice(accepted.length > 1 ? `Uploading ${index + 1} of ${accepted.length}…` : 'Uploading the lab report…')
      const form = new FormData()
      form.set('file', file)
      form.set('patient_id', patientId)
      if (order) form.set('order_id', order.id)
      try {
        const response = await fetch(INVESTIGATIONS_API, { method: 'POST', body: form })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.error || `${file.name} could not be uploaded.`)
        saved.push(result.file)
      } catch (uploadError) {
        warning = uploadError instanceof Error ? uploadError.message : `${file.name} could not be uploaded.`
        setError(warning)
        break
      }
    }
    if (!saved.length) { setPhase('idle'); setNotice(''); return }
    uploaded.current = true
    setFiles(current => [...current, ...saved])
    await read(saved.map(file => file.id), warning)
  }

  // Files chosen on an order card are uploaded as soon as the window opens.
  useEffect(() => {
    if (started.current || !entry.pendingUpload?.length) return
    started.current = true
    uploadAndRead(entry.pendingUpload)
    // Runs once, for the files the window was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    setError('')
    const filled = rows
      .map(row => ({ ...row, section: row.section.trim(), test: row.test.trim(), result: row.result.trim(), unit: row.unit.trim(), referenceRange: row.referenceRange.trim(), remark: row.remark.trim() }))
      .filter(row => row.result)
    if (filled.some(row => !row.test)) { setError('Give every result a test name.'); return }
    if (!filled.length) { setError('Enter at least one result, or upload the lab report to read them from it.'); return }

    setPhase('saving'); setNotice('')
    try {
      const blob = await generateInvestigationResultPdf({ ...snapshot, ...meta, results: filled })
      const downloadName = `${downloadBase(snapshot.fullName, 'patient')}-fxmed-investigation-results.pdf`
      const response = await fetch(INVESTIGATIONS_API, {
        method: report ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'results', id: report?.id, patientId, orderId: order?.id, patient: snapshot,
          results: filled, reportMeta: meta, completeOrder: order ? completeOrder : undefined,
          documentBase64: await blobToBase64(blob), downloadName, size: blob.size,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'The results could not be saved.')
      downloadBlob(blob, downloadName)
      onSaved()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The results could not be saved.')
      setPhase('idle')
    }
  }

  function close() {
    if (busy) return
    const edited = JSON.stringify({ rows, meta }) !== initial.current
    if (edited && !window.confirm(`Close without saving? The results you have entered will be lost${uploaded.current ? '. The uploaded lab report stays on the order' : ''}.`)) return
    onClose(uploaded.current)
  }

  const blank = rows.filter(row => row.test.trim() && !row.result.trim()).length
  const detail = (field: keyof InvestigationReportMeta, text: string, placeholder = '') => <label className="text-xs font-semibold text-text-mid">{text}<input value={meta[field]} onChange={event => setMeta(current => ({ ...current, [field]: event.target.value }))} placeholder={placeholder} className={`${detailClass} mt-1`} /></label>

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="results-entry-title" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-green-deep/10 px-6 py-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-green-mid">Investigation results</p>
          <h3 id="results-entry-title" className="mt-1 text-2xl font-bold">{report ? 'Edit results' : 'Enter results'}{order ? ` · ${order.panelTitle}` : ''}</h3>
          <p className="mt-1 text-sm text-text-mid">{entry.mrn ? `${entry.mrn} · ` : ''}{snapshot.fullName}{order ? ` · ordered ${formatDay(order.createdAt)}` : ' · results without an order'}</p>
        </div>
        <button type="button" onClick={close} disabled={busy} aria-label="Close" className="icon-button shrink-0"><XIcon /></button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        <section className="rounded-[18px] border border-gold/60 bg-gold/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-xl"><h4 className="flex items-center gap-2 font-bold"><FlaskIcon size={20} weight="duotone" className="text-green-mid" />Lab report</h4><p className="mt-1 text-xs leading-5 text-text-mid">Upload the laboratory's report as a PDF or photos of it. It is kept on the patient's record{order ? ' with this order' : ''}, and the results are read into the form below for you to check.</p></div>
            <div className="flex flex-wrap gap-2">
              {files.length > 0 && <button type="button" disabled={busy} onClick={() => read(files.map(file => file.id))} className="secondary disabled:opacity-50">Read results from {files.length === 1 ? 'the report' : 'these files'}</button>}
              <UploadButton onFiles={uploadAndRead} disabled={busy} className="primary" label={files.length ? 'Upload more' : 'Upload lab report'} />
            </div>
          </div>
          <FileLinks files={files} onOpen={id => openLabReport(id).catch(openError => setError(openError.message))} />
          {notice && <p role="status" className="mt-3 flex items-start gap-2 text-sm font-semibold text-green-deep">{busy && <CircleNotchIcon size={18} className="mt-0.5 shrink-0 animate-spin" />}{notice}</p>}
          {missing.length > 0 && <p className="mt-2 text-xs leading-5 text-amber-800"><span className="font-bold">Not found in the report:</span> {listNames(missing)}. Add any that were reported elsewhere from the catalogue below.</p>}
        </section>

        <section>
          <h4 className="text-sm font-bold text-green-deep">Report details</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detail('reportTitle', 'Report title', DEFAULT_REPORT_TITLE)}
            {detail('specimen', 'Specimen', 'e.g. Serum / Whole blood')}
            {detail('clinician', 'Requesting clinician')}
            {detail('collectedAt', 'Collected', 'Date and time, as on the report')}
            {detail('reportedAt', 'Reported', 'Date and time, as on the report')}
          </div>
        </section>

        <section className="rounded-[18px] border border-green-deep/10 bg-cream/30 p-4">
          <ResultsEditor rows={rows} onChange={setRows} catalogueOpen={!order && !rows.length} />
        </section>

        <label className="block text-sm font-bold text-green-deep">Clinical notes<textarea value={meta.notes} onChange={event => setMeta(current => ({ ...current, notes: event.target.value }))} rows={3} placeholder="Optional interpretation or follow-up note, printed on the report" className={`${detailClass} mt-2 resize-y font-normal`} /></label>
      </div>

      <div className="border-t border-green-deep/10 px-6 py-4">
        {error && <p role="alert" className="mb-3 rounded-[12px] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            {order && <label className="flex items-center gap-2 text-sm font-semibold text-green-deep"><input type="checkbox" checked={completeOrder} onChange={event => setCompleteOrder(event.target.checked)} className="h-4 w-4 accent-green-deep" />All results are in. Close the order.</label>}
            {order && !completeOrder && <p className="text-xs text-text-mid">The order stays on the awaiting list until the rest arrive.</p>}
            {blank > 0 && <p className="text-xs text-text-mid">{blank} test{blank === 1 ? ' has' : 's have'} no result and will be left out of the report.</p>}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={close} disabled={busy} className="secondary disabled:opacity-50">Cancel</button>
            <button type="button" onClick={save} disabled={busy} className="primary disabled:opacity-50">{phase === 'saving' ? 'Saving…' : 'Save and download PDF'}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
}
