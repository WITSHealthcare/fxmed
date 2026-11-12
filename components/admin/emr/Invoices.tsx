'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DownloadSimpleIcon, EyeIcon, PaperPlaneTiltIcon, ReceiptIcon, XIcon } from '@phosphor-icons/react'
import { Alert, Empty, Loading, Panel, fullName } from '@/components/admin/emr/ui'
import { downloadBlob } from '@/lib/fileDownload'
import { formatInvoiceDate, formatInvoiceMoney, mapInvoice, paymentStatusLabels, type Invoice, type InvoicePaymentStatus } from '@/lib/invoices'
import { generateInvoicePdf, invoiceFileName, type InvoicePatient } from '@/lib/invoicePdf'

// Invoices on the chart's Financial tab: several bills on one invoice, sent to
// the patient's portal when staff choose. See lib/invoices.ts.

const API = '/api/admin/emr/invoices'
type Chart = Record<string, any>

const paymentTone: Record<InvoicePaymentStatus, string> = {
  unpaid: 'bg-amber-50 text-amber-800',
  part_paid: 'bg-sky-50 text-sky-800',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-red-50 text-red-700',
  void: 'bg-gray-100 text-text-mid',
}

function invoicePatient(patient: Record<string, any>): InvoicePatient {
  return {
    fullName: fullName(patient),
    mrn: patient.mrn,
    phone: patient.phone,
    email: patient.email,
    address: [patient.address, patient.city, patient.state].filter(Boolean).join(', '),
  }
}

async function post(body: Record<string, unknown>) {
  const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'The invoice could not be saved.')
  return result
}

export default function PatientInvoices({ chart, onChanged }: { chart: Chart; onChanged: () => void }) {
  const patient = chart.patient
  const bills: any[] = useMemo(() => chart.financialRecords || [], [chart.financialRecords])
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  // An action waiting for a second click, so nothing is cancelled by accident.
  const [confirming, setConfirming] = useState<{ id: string; action: 'void' | 'delete' } | null>(null)

  const load = useCallback(async () => {
    const response = await fetch(`${API}?patientId=${patient.id}`, { cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (response.ok) { setInvoices(result.invoices || []); setError('') } else { setInvoices([]); setError(result.error || 'Invoices could not be loaded.') }
  }, [patient.id])
  // Reload when the bills change, so payments show on the invoices.
  useEffect(() => { load() }, [load, bills])

  // Bills already on an invoice that is not cancelled.
  const invoicedBills = useMemo(() => {
    const taken = new Map<string, string>()
    for (const invoice of invoices || []) if (invoice.status !== 'void') for (const item of invoice.items) if (item.billId) taken.set(item.billId, invoice.number)
    return taken
  }, [invoices])
  const available = bills.filter(bill => !invoicedBills.has(bill.id))

  async function act(invoice: Invoice, action: 'send' | 'void' | 'delete') {
    setBusy(invoice.id); setError(''); setNotice(''); setConfirming(null)
    try {
      await post({ action, id: invoice.id })
      setNotice(action === 'send' ? `${invoice.number} was sent to the patient's portal, and they have been notified.` : action === 'void' ? `${invoice.number} was cancelled. Its bills can be invoiced again.` : `Draft ${invoice.number} was deleted.`)
      await load()
      onChanged()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Something went wrong. Try again.')
    }
    setBusy(null)
  }

  async function download(invoice: Invoice) {
    setBusy(invoice.id); setError('')
    try {
      downloadBlob(await generateInvoicePdf(invoice, invoicePatient(patient)), invoiceFileName(invoice))
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : 'The invoice PDF could not be made.')
    }
    setBusy(null)
  }

  return <>
    <Panel title="Invoices" subtitle="Put one or more bills on an invoice and send it to the patient's portal. Payments recorded on the bills show on the invoice." action={<button type="button" onClick={() => { setNotice(''); setCreating(true) }} disabled={!available.length || !invoices} title={available.length ? undefined : 'Every bill is already on an invoice. Add a bill first.'} className="primary disabled:opacity-50"><ReceiptIcon size={18} weight="duotone" />Create invoice</button>}>
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="info">{notice}</Alert>}
      {!invoices ? <Loading /> : invoices.length ? <div className="mt-6 space-y-3">{invoices.map(invoice => {
        const waiting = confirming?.id === invoice.id ? confirming.action : null
        return <article key={invoice.id} className="rounded-[18px] border border-green-deep/10 bg-[#FCFFF0] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-bold">{invoice.number}</p>
              <p className="mt-1 text-xs text-text-mid">Issued {formatInvoiceDate(invoice.issueDate)} · {invoice.dueDate ? `due ${formatInvoiceDate(invoice.dueDate)}` : 'due on receipt'} · {invoice.items.length} item{invoice.items.length === 1 ? '' : 's'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${invoice.status === 'draft' ? 'bg-gray-100 text-text-mid' : invoice.status === 'void' ? 'bg-gray-100 text-text-mid' : 'bg-green-deep/5 text-green-deep'}`}>{invoice.status === 'draft' ? 'Draft, not sent' : invoice.status === 'void' ? 'Cancelled' : `Sent ${invoice.sentAt ? formatInvoiceDate(invoice.sentAt.slice(0, 10)) : ''}`}</span>
              {invoice.status !== 'void' && <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${paymentTone[invoice.paymentStatus]}`}>{paymentStatusLabels[invoice.paymentStatus]}</span>}
            </div>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-text-mid">{invoice.items.map(item => <li key={item.id} className="flex justify-between gap-3"><span className="min-w-0 break-words">{item.description}</span><span className="shrink-0 font-semibold text-green-deep">{formatInvoiceMoney(item.amount, invoice.currency)}</span></li>)}</ul>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-green-deep/10 pt-3 text-sm"><span>Total <strong>{formatInvoiceMoney(invoice.total, invoice.currency)}</strong></span><span>Paid <strong>{formatInvoiceMoney(invoice.paid, invoice.currency)}</strong></span>{invoice.status !== 'void' && <span>Balance <strong>{formatInvoiceMoney(invoice.balance, invoice.currency)}</strong></span>}</div>
          {waiting ? <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[14px] border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <span className="mr-auto font-semibold">{waiting === 'void' ? `Cancel ${invoice.number}? The patient will see it as cancelled, and its bills can be invoiced again.` : `Delete draft ${invoice.number}? The patient never saw it.`}</span>
            <button type="button" onClick={() => setConfirming(null)} className="secondary">Keep it</button>
            <button type="button" onClick={() => act(invoice, waiting)} disabled={busy === invoice.id} className="rounded-full bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50">{waiting === 'void' ? 'Cancel invoice' : 'Delete draft'}</button>
          </div> : <div className="mt-4 flex flex-wrap items-center gap-2">
            {invoice.status === 'draft' && <button type="button" onClick={() => act(invoice, 'send')} disabled={busy === invoice.id} className="primary disabled:opacity-50"><PaperPlaneTiltIcon size={18} weight="duotone" />Send to patient</button>}
            <button type="button" onClick={() => download(invoice)} disabled={busy === invoice.id} className="secondary disabled:opacity-50"><DownloadSimpleIcon size={18} weight="bold" />Download PDF</button>
            {invoice.status === 'draft' && <button type="button" onClick={() => setConfirming({ id: invoice.id, action: 'delete' })} className="px-2 text-sm font-semibold text-text-mid hover:text-red-700">Delete draft</button>}
            {invoice.status === 'sent' && <button type="button" onClick={() => setConfirming({ id: invoice.id, action: 'void' })} className="px-2 text-sm font-semibold text-text-mid hover:text-red-700">Cancel invoice</button>}
          </div>}
        </article>
      })}</div> : <Empty text={bills.length ? 'No invoices yet. Create one from the bills above.' : 'Add a bill first, then put it on an invoice.'} />}
    </Panel>
    {creating && <CreateInvoice patient={patient} bills={bills} invoicedBills={invoicedBills} onClose={() => setCreating(false)} onCreated={async (invoice, sent) => {
      setCreating(false)
      setNotice(sent ? `${invoice.number} was created and sent to the patient's portal, and they have been notified.` : `${invoice.number} was saved as a draft. Send it when you are ready.`)
      await load()
      onChanged()
    }} />}
  </>
}

function CreateInvoice({ patient, bills, invoicedBills, onClose, onCreated }: { patient: Record<string, any>; bills: any[]; invoicedBills: Map<string, string>; onClose: () => void; onCreated: (invoice: Invoice, sent: boolean) => void }) {
  const [chosen, setChosen] = useState<string[]>([])
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState<'draft' | 'send' | 'preview' | null>(null)
  const [error, setError] = useState('')
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeButton.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const selected = chosen.map(id => bills.find(bill => bill.id === id)).filter(Boolean)
  const currency = selected[0]?.currency || 'NGN'
  const total = selected.reduce((sum, bill) => sum + Number(bill.amount_due || 0), 0)

  function toggle(id: string) {
    setError('')
    setChosen(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  // What the invoice will look like, before it is saved.
  async function preview() {
    setSaving('preview'); setError('')
    try {
      const draft = mapInvoice({
        id: 'preview', patient_id: patient.id, invoice_number: 'DRAFT', currency, issue_date: new Date().toISOString().slice(0, 10), due_date: dueDate || null, notes, status: 'draft', created_at: new Date().toISOString(),
        items: selected.map((bill, position) => ({ id: bill.id, financial_record_id: bill.id, description: bill.description, service_date: bill.service_date, amount: bill.amount_due, position })),
      }, bills)
      downloadBlob(await generateInvoicePdf(draft, invoicePatient(patient)), 'fxmed-invoice-preview.pdf')
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'The preview could not be made.')
    }
    setSaving(null)
  }

  async function save(send: boolean) {
    if (!chosen.length) { setError('Choose at least one bill.'); return }
    setSaving(send ? 'send' : 'draft'); setError('')
    try {
      const result = await post({ action: 'create', patientId: patient.id, billIds: chosen, dueDate: dueDate || null, notes, send })
      onCreated(result.invoice, send)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The invoice could not be saved.')
      setSaving(null)
    }
  }

  const inputClass = 'mt-1 w-full rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm text-green-deep focus:border-green-deep focus:outline-none'
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <div role="dialog" aria-modal="true" aria-labelledby="create-invoice-title" className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-green-deep/10 px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-green-mid">Invoice</p>
          <h3 id="create-invoice-title" className="mt-1 text-2xl font-bold">Create invoice</h3>
          <p className="mt-1 text-sm text-text-mid">{patient.mrn} · {fullName(patient)}</p>
        </div>
        <button ref={closeButton} type="button" onClick={onClose} disabled={Boolean(saving)} aria-label="Close" className="icon-button shrink-0"><XIcon /></button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
        <div>
          <p className="text-sm font-bold text-green-deep">Bills to include</p>
          <div className="mt-2 space-y-2">{bills.map(bill => {
            const onInvoice = invoicedBills.get(bill.id)
            const otherCurrency = selected.length > 0 && !chosen.includes(bill.id) && (bill.currency || 'NGN') !== currency
            const disabled = Boolean(onInvoice) || otherCurrency
            const balance = Number(bill.amount_due || 0) - Number(bill.amount_paid || 0)
            return <label key={bill.id} className={`flex items-start gap-3 rounded-[14px] border p-3 ${chosen.includes(bill.id) ? 'border-green-mid bg-[#FCFFF0]' : 'border-green-deep/10'} ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
              <input type="checkbox" checked={chosen.includes(bill.id)} disabled={disabled} onChange={() => toggle(bill.id)} className="mt-1 h-4 w-4 shrink-0 accent-green-deep" />
              <span className="min-w-0 flex-1">
                <span className="block break-words font-semibold text-green-deep">{bill.description}</span>
                <span className="mt-0.5 block text-xs text-text-mid">{bill.service_date ? formatInvoiceDate(bill.service_date) : 'No service date'} · {balance > 0 ? `${formatInvoiceMoney(balance, bill.currency || 'NGN')} outstanding` : 'Paid'}{onInvoice ? ` · already on ${onInvoice}` : otherCurrency ? ' · different currency' : ''}</span>
              </span>
              <span className="shrink-0 text-sm font-bold text-green-deep">{formatInvoiceMoney(Number(bill.amount_due || 0), bill.currency || 'NGN')}</span>
            </label>
          })}</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-text-mid">Due date<input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className={inputClass} /><span className="mt-1 block font-normal">Leave empty for &ldquo;due on receipt&rdquo;.</span></label>
          <div className="rounded-[14px] bg-cream/60 p-4"><p className="text-xs font-semibold text-text-mid">{selected.length} bill{selected.length === 1 ? '' : 's'} on this invoice</p><p className="mt-1 text-2xl font-bold text-green-deep">{formatInvoiceMoney(total, currency)}</p></div>
        </div>
        <label className="block text-xs font-semibold text-text-mid">Note on the invoice (optional)<textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} maxLength={2000} placeholder="e.g. Includes your 12-week gut repair programme" className={`${inputClass} resize-y`} /></label>
      </div>

      <div className="border-t border-green-deep/10 px-5 py-4 sm:px-6">
        {error && <p role="alert" className="mb-3 rounded-[12px] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={preview} disabled={Boolean(saving) || !chosen.length} className="secondary mr-auto disabled:opacity-50"><EyeIcon size={18} weight="bold" />{saving === 'preview' ? 'Making preview…' : 'Preview PDF'}</button>
          <button type="button" onClick={() => save(false)} disabled={Boolean(saving) || !chosen.length} className="secondary disabled:opacity-50">{saving === 'draft' ? 'Saving…' : 'Save as draft'}</button>
          <button type="button" onClick={() => save(true)} disabled={Boolean(saving) || !chosen.length} className="primary disabled:opacity-50"><PaperPlaneTiltIcon size={18} weight="duotone" />{saving === 'send' ? 'Sending…' : 'Create and send to patient'}</button>
        </div>
      </div>
    </div>
  </div>
}
