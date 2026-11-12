'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CaretDownIcon, CheckCircleIcon, DownloadSimpleIcon, MagnifyingGlassIcon, PlusIcon, ReceiptIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import { downloadBlob } from '@/lib/fileDownload'
import { downloadBase, type InvestigationOrder } from '@/lib/investigations'
import { formatInvoiceDate, formatInvoiceMoney, type Invoice } from '@/lib/invoices'
import {
  HOME_LOGISTICS_FEE, INVOICE_EXTRAS, collectionLabels, loadPriceList, matchTests, searchPriceList,
  type CollectionType, type LabInvoice, type LabInvoiceLine, type PriceItem,
} from '@/lib/labPrices'

// An order's request form and its invoices. Shown once an order is placed, and
// from the order afterwards. "Generate invoice" opens a builder with a tab for
// lab collection and one for home collection: tests with a clear line on the
// price list are added straight away, the rest come with the closest lines to
// choose from, and the clinician adjusts and saves. A saved invoice can be
// downloaded, and added to the patient's bills once the patient approves it.

const API = '/api/admin/emr/investigations'
const collections: CollectionType[] = ['lab', 'home']

export type OrderDownloadsPatient = { id: string; fullName: string; mrn?: string | null; phone?: string | null; email?: string | null }
type OrderBill = { id: string; collection: CollectionType; amount: number; createdAt: string }

/** A saved invoice in the shape the invoice PDF takes. */
function labInvoicePdf(order: InvestigationOrder, patientId: string, invoice: LabInvoice): Invoice {
  return {
    id: order.id, number: `LAB-${order.id.slice(0, 8).toUpperCase()}-${invoice.collection === 'home' ? 'H' : 'L'}`, patientId, currency: 'NGN',
    issueDate: (invoice.savedAt || new Date().toISOString()).slice(0, 10), dueDate: null,
    notes: `${order.panelTitle}. ${invoice.collection === 'home' ? 'Samples are collected at your home.' : 'Samples are collected at the laboratory.'}`,
    status: 'sent', sentAt: null, createdAt: order.createdAt,
    items: invoice.lines.map((line, index) => ({ id: String(index), billId: null, description: line.test, serviceDate: null, amount: line.amount, paid: 0 })),
    total: invoice.total, paid: 0, balance: invoice.total, paymentStatus: 'unpaid',
  }
}

export function OrderDownloadsDialog({ order, patient, justPlaced, onDownloadForm, onBilled, onClose }: { order: InvestigationOrder; patient: OrderDownloadsPatient; justPlaced?: boolean; onDownloadForm: () => void; onBilled?: () => void; onClose: () => void }) {
  const [saved, setSaved] = useState<Partial<Record<CollectionType, LabInvoice>> | null>(null)
  const [bill, setBill] = useState<OrderBill | null>(null)
  const [needsMigration, setNeedsMigration] = useState(false)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<CollectionType>('lab')
  const [dirty, setDirty] = useState<Record<CollectionType, boolean>>({ lab: false, home: false })
  const [confirmClose, setConfirmClose] = useState(false)
  const unsaved = dirty.lab || dirty.home

  useEffect(() => {
    let current = true
    fetch(`${API}?view=invoices&id=${order.id}`).then(response => response.json()).then(result => {
      if (!current) return
      setSaved(result.invoices || {})
      setBill(result.bill || null)
      setNeedsMigration(result.needsMigration === true)
    }).catch(() => { if (current) setSaved({}) })
    return () => { current = false }
  }, [order.id])

  const close = useCallback(() => { if (unsaved && !confirmClose) setConfirmClose(true); else onClose() }, [unsaved, confirmClose, onClose])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])
  const setTabDirty = useCallback((collection: CollectionType, value: boolean) => setDirty(current => current[collection] === value ? current : { ...current, [collection]: value }), [])

  const savedNames = saved ? collections.filter(collection => saved[collection]).map(collection => `${collectionLabels[collection]} ${formatInvoiceMoney(saved[collection]!.total)}`) : []
  const row = 'flex w-full items-center gap-4 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4 text-left transition hover:border-green-mid'
  const badge = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-green-deep text-gold'

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) close() }}>
    <div role="dialog" aria-modal="true" aria-labelledby="order-placed-title" className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-[26px] bg-white p-5 font-dm-sans shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {justPlaced && <CheckCircleIcon size={34} weight="fill" className="mt-0.5 shrink-0 text-green-mid" />}
          <div className="min-w-0">
            <h3 id="order-placed-title" className="text-2xl font-bold text-green-deep">{justPlaced ? 'Order placed' : 'Request form and invoices'}</h3>
            <p className="mt-1 text-sm text-text-mid">{order.panelTitle} · {order.tests.length} test{order.tests.length === 1 ? '' : 's'} for {patient.fullName || 'the patient'}.{justPlaced ? ' The request form is also in the patient’s portal.' : ''}</p>
          </div>
        </div>
        <button type="button" onClick={close} aria-label="Close" className="icon-button shrink-0"><XIcon /></button>
      </div>

      <div className="mt-6 space-y-3">
        <button type="button" onClick={onDownloadForm} className={row}>
          <span className={badge}><DownloadSimpleIcon size={22} weight="bold" /></span>
          <span className="min-w-0"><span className="block font-bold text-green-deep">Download request form</span><span className="mt-0.5 block text-xs text-text-mid">For the patient to take to the laboratory.</span></span>
        </button>
        <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} className={row}>
          <span className={badge}><ReceiptIcon size={22} weight="bold" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-green-deep">{savedNames.length ? 'View or change invoice' : 'Generate invoice'}</span>
            <span className="mt-0.5 block text-xs text-text-mid">{savedNames.length ? `Saved: ${savedNames.join(' · ')}.` : 'Price the tests from the price list for lab or home collection, adjust and save.'}</span>
          </span>
          <CaretDownIcon size={18} weight="bold" className={`shrink-0 text-green-mid transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && <div className="mt-4 rounded-[18px] border border-green-deep/10 p-3 sm:p-4">
        <div role="tablist" aria-label="Collection type" className="grid grid-cols-2 gap-1 rounded-[14px] bg-green-deep/5 p-1">{collections.map(collection => {
          const invoice = saved?.[collection]
          return <button key={collection} type="button" role="tab" aria-selected={tab === collection} onClick={() => setTab(collection)} className={`rounded-[11px] px-3 py-2 text-left transition ${tab === collection ? 'bg-white shadow-sm' : 'hover:bg-white/60'}`}>
            <span className="block text-sm font-bold text-green-deep">{collectionLabels[collection]}</span>
            <span className={`block text-[11px] font-semibold ${bill?.collection === collection ? 'text-green-mid' : dirty[collection] ? 'text-amber-700' : invoice ? 'text-green-mid' : 'text-text-mid'}`}>{bill?.collection === collection ? 'On the patient’s bill' : dirty[collection] ? 'Unsaved changes' : invoice ? `Saved · ${formatInvoiceMoney(invoice.total)}` : 'Not saved yet'}</span>
          </button>
        })}</div>
        {!saved ? <p className="p-6 text-center text-sm text-text-mid">Loading…</p> : collections.map(collection => <div key={collection} role="tabpanel" hidden={tab !== collection}>
          <InvoiceBuilder order={order} patient={patient} collection={collection} saved={saved[collection] || null} bill={bill} needsMigration={needsMigration}
            onDirty={value => setTabDirty(collection, value)}
            onSaved={invoice => setSaved(current => ({ ...current, [collection]: invoice }))}
            onBilled={added => { setBill(added); onBilled?.() }} />
        </div>)}
      </div>}

      {confirmClose && <div role="alert" className="mt-4 flex flex-wrap items-center justify-end gap-2 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
        <span className="w-full font-semibold">The invoice has changes that are not saved. Close anyway?</span>
        <button type="button" onClick={() => setConfirmClose(false)} className="rounded-full px-3 py-1.5 font-bold hover:bg-amber-100">Keep working</button>
        <button type="button" onClick={onClose} className="rounded-full bg-green-deep px-3 py-1.5 font-bold text-white hover:bg-green-mid">Close without saving</button>
      </div>}
      <div className="mt-6 flex justify-end"><button type="button" onClick={close} className="primary">{justPlaced ? 'Done' : 'Close'}</button></div>
    </div>
  </div>
}

type Row = {
  id: number
  /** The line's name on the invoice: the ordered test, or what was typed for an added line. */
  test: string
  /** Added by hand, rather than one of the ordered tests. */
  custom: boolean
  /** The logistics fee that every home collection invoice starts with. */
  fee: boolean
  /** The price list line the amount came from, if any. */
  item: string | null
  amount: string
  removed: boolean
  /** Priced straight away from a clear line on the price list. */
  auto: boolean
  suggestions: PriceItem[]
  picking: boolean
}

const amountOf = (row: Row) => { const amount = Number(row.amount.replace(/[,\s]/g, '')); return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0 }
/** Whether a line's price was changed from the price list line it came from. */
const adjusted = (row: Row, amount: number, list: PriceItem[]) => { const listed = list.find(item => item.name === row.item); return Boolean(listed && amount && listed.price !== amount) }
const linesOf = (rows: Row[]): LabInvoiceLine[] => rows.filter(row => !row.removed && row.test.trim()).map(row => ({ test: row.test.trim(), item: row.item, amount: amountOf(row) }))

function InvoiceBuilder({ order, patient, collection, saved, bill, needsMigration, onDirty, onSaved, onBilled }: {
  order: InvestigationOrder
  patient: OrderDownloadsPatient
  collection: CollectionType
  saved: LabInvoice | null
  bill: OrderBill | null
  needsMigration: boolean
  onDirty: (dirty: boolean) => void
  onSaved: (invoice: LabInvoice) => void
  onBilled: (bill: OrderBill) => void
}) {
  const [list, setList] = useState<PriceItem[] | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  // The lines as last saved, to tell when there are changes to save.
  const [baseline, setBaseline] = useState('')
  const [busy, setBusy] = useState<'save' | 'pdf' | 'bill' | null>(null)
  const [confirmBill, setConfirmBill] = useState(false)
  const [error, setError] = useState('')
  const nextId = useRef(1)
  const label = collectionLabels[collection].toLowerCase()
  // Once the order is on the patient's bills, its invoices are settled.
  const locked = Boolean(bill)

  // Start from the saved invoice, or price the ordered tests from the list.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    loadPriceList(collection).then(items => {
      const fresh = (partial: Omit<Row, 'id' | 'fee'> & { fee?: boolean }): Row => ({ id: nextId.current++, fee: false, ...partial })
      // Every home collection invoice carries the logistics fee. It is fixed: the server adds it too.
      const logistics = () => fresh({ test: HOME_LOGISTICS_FEE.label, custom: false, fee: true, item: null, amount: String(HOME_LOGISTICS_FEE.amount), removed: false, auto: false, suggestions: [], picking: false })
      const isFee = (test: string) => collection === 'home' && test === HOME_LOGISTICS_FEE.label
      let initial: Row[]
      if (saved) {
        const kept = saved.lines.filter(line => !isFee(line.test)).map(line => fresh({ test: line.test, custom: !order.tests.includes(line.test), item: line.item, amount: String(line.amount), removed: false, auto: false, suggestions: [], picking: false }))
        const left = order.tests.filter(test => !saved.lines.some(line => line.test === test))
        initial = [...kept, ...left.map(test => fresh({ test, custom: false, item: null, amount: '', removed: true, auto: false, suggestions: [], picking: false }))]
        if (collection === 'home') initial.push(logistics())
      } else {
        initial = matchTests(order.tests, items, collection).map(match => match.status === 'matched'
          ? fresh({ test: match.test, custom: false, item: match.item, amount: String(match.amount), removed: false, auto: true, suggestions: [], picking: false })
          : fresh({ test: match.test, custom: false, item: null, amount: '', removed: false, auto: false, suggestions: match.suggestions, picking: match.suggestions.length > 0 }))
        if (collection === 'home') initial.push(logistics())
      }
      setList(items)
      setRows(initial)
      setBaseline(saved ? JSON.stringify(linesOf(initial)) : '')
    }).catch(() => setError('The price list could not be loaded. Close this window and try again.'))
  }, [collection, order.tests, saved])

  const lines = useMemo(() => linesOf(rows), [rows])
  const total = lines.reduce((sum, line) => sum + line.amount, 0)
  const unpriced = rows.filter(row => !row.removed && !amountOf(row))
  const changed = list !== null && JSON.stringify(lines) !== baseline
  // A fresh invoice nobody has touched is not "unsaved changes" yet.
  const touched = useRef(false)
  useEffect(() => { onDirty(Boolean(saved ? changed : touched.current && changed) && !locked) }, [changed, saved, locked, onDirty, rows])

  const update = (id: number, patch: Partial<Row>) => { touched.current = true; setError(''); setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row)) }
  const pick = (id: number, item: PriceItem) => update(id, { item: item.name, amount: String(item.price), picking: false, auto: false })
  // For a line that already has a price list line, its nearest alternatives
  // come first (Lipid Profile Mini beside Maxi), then lines close to the test's name.
  const alternatives = (row: Row) => {
    if (!list) return row.suggestions
    const seen = new Set<string>()
    return [...(row.item ? searchPriceList(row.item, list, 4) : []), ...searchPriceList(row.test, list, 5)]
      .filter(item => { const key = `${item.name}|${item.price}`; if (seen.has(key)) return false; seen.add(key); return true })
      .slice(0, 6)
  }
  const openPicker = (row: Row) => update(row.id, { picking: !row.picking, suggestions: row.suggestions.length ? row.suggestions : alternatives(row) })
  // Set services, such as the Functional Health Analysis, that are not on this invoice yet.
  const extras = INVOICE_EXTRAS.filter(extra => !rows.some(row => row.test.trim().toLowerCase() === extra.label.toLowerCase()))
  const addExtra = (extra: { label: string; amount: number }) => { touched.current = true; setError(''); setRows(current => [...current, { id: nextId.current++, test: extra.label, custom: true, fee: false, item: null, amount: String(extra.amount), removed: false, auto: false, suggestions: [], picking: false }]) }
  const addLine = () => { touched.current = true; setRows(current => [...current, { id: nextId.current++, test: '', custom: true, fee: false, item: null, amount: '', removed: false, auto: false, suggestions: [], picking: false }]) }

  async function post(body: Record<string, unknown>) {
    const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id, collection, ...body }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'That could not be saved. Try again.')
    return result
  }

  async function save() {
    if (rows.some(row => !row.removed && row.custom && !row.test.trim())) { setError('Name every line you added, or remove it.'); return }
    if (unpriced.length) { setError(`${unpriced.length === 1 ? `“${unpriced[0].test || 'The added line'}” still needs` : `${unpriced.length} lines still need`} a price. Choose one from the price list, type it, or leave the test off the invoice.`); return }
    if (!rows.some(row => !row.removed && !row.fee)) { setError('Add at least one test to the invoice.'); return }
    setBusy('save'); setError('')
    try {
      const result = await post({ action: 'save_invoice', lines })
      setBaseline(JSON.stringify(lines))
      setRows(current => current.map(row => ({ ...row, picking: false })))
      onSaved(result.invoice)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The invoice could not be saved.')
    }
    setBusy(null)
  }

  async function download() {
    if (!saved) return
    setBusy('pdf'); setError('')
    try {
      const { generateInvoicePdf } = await import('@/lib/invoicePdf')
      const blob = await generateInvoicePdf(labInvoicePdf(order, patient.id, saved), { fullName: patient.fullName, mrn: patient.mrn, phone: patient.phone, email: patient.email }, { subtitle: collectionLabels[collection], dates: false })
      downloadBlob(blob, `${downloadBase(patient.fullName, 'patient')}-fxmed-lab-invoice-${collection}-collection.pdf`)
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : 'The invoice could not be made. Try again.')
    }
    setBusy(null)
  }

  async function addToBill() {
    setBusy('bill'); setError('')
    try {
      onBilled((await post({ action: 'bill' })).bill)
    } catch (billError) {
      setError(billError instanceof Error ? billError.message : 'The invoice could not be added to the bill.')
    }
    setBusy(null); setConfirmBill(false)
  }

  if (!list) return <p className="p-6 text-center text-sm text-text-mid">{error || 'Pricing the tests…'}</p>
  const tests = rows.filter(row => !row.fee)
  const priced = tests.filter(row => !row.removed && amountOf(row)).length
  const input = 'rounded-lg border border-green-deep/15 bg-white px-3 py-2 text-sm text-green-deep focus:border-green-deep focus:outline-none disabled:bg-gray-50 disabled:text-text-mid'

  return <div className="mt-4">
    {!list.length && !locked && <p className="mb-3 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">No {label} price list has been added yet, so the tests are not filled in. Type the price for each test, or leave it off the invoice.</p>}
    {list.length > 0 && !locked && !saved && <p className="mb-3 text-xs leading-5 text-text-mid">{priced} of {tests.length} test{tests.length === 1 ? '' : 's'} priced from the price list.{unpriced.length ? ` ${unpriced.length} need${unpriced.length === 1 ? 's' : ''} you to choose.` : ''} Check each line and change any that should be different.</p>}

    <ul className="space-y-2">{rows.map(row => {
      const amount = amountOf(row)
      return <li key={row.id} className={`rounded-[14px] border p-3 ${row.removed ? 'border-green-deep/10 bg-gray-50' : amount ? 'border-green-deep/10 bg-white' : 'border-amber-300 bg-amber-50/60'}`}>
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <div className="min-w-[10rem] flex-1">
            {row.custom
              ? <input value={row.test} onChange={event => update(row.id, { test: event.target.value })} disabled={locked} maxLength={240} placeholder="What this line is for, e.g. Home visit fee" aria-label="Line description" className={`${input} w-full font-semibold`} />
              : <p className={`break-words text-sm font-bold ${row.removed ? 'text-text-mid line-through' : 'text-green-deep'}`}>{row.test}</p>}
            {row.removed ? <p className="mt-1 text-xs text-text-mid">Left off this invoice.</p>
              : row.item ? <p className="mt-1 flex items-start gap-1.5 text-xs text-text-mid"><CheckCircleIcon size={15} weight="fill" className="mt-px shrink-0 text-green-mid" /><span className="min-w-0 break-words">Price list: <span className="font-semibold text-green-deep">{row.item}</span>{adjusted(row, amount, list) ? ' · price adjusted' : ''}</span></p>
              : row.fee ? <p className="mt-1 text-xs text-text-mid">On every home collection invoice.</p>
              : amount ? <p className="mt-1 text-xs text-text-mid">Price typed in.</p>
              : <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800"><WarningCircleIcon size={15} weight="fill" className="shrink-0" />{list.length ? 'No clear match on the price list. Choose the closest, or type the price.' : 'Needs a price.'}</p>}
          </div>
          {!row.removed && <label className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-text-mid">₦<input value={row.amount} onChange={event => update(row.id, { amount: event.target.value.replace(/[^\d.,]/g, ''), auto: false })} disabled={locked || row.fee} inputMode="decimal" placeholder="0" aria-label={`Price for ${row.test || 'this line'}`} className={`${input} w-28 text-right font-bold`} /></label>}
        </div>
        {!locked && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold">
          {!row.removed && !row.fee && list.length > 0 && <button type="button" onClick={() => openPicker(row)} aria-expanded={row.picking} className="text-green-mid hover:text-green-deep hover:underline">{row.picking ? 'Hide price list' : row.item ? 'Change' : 'Choose from the price list'}</button>}
          {row.fee ? null : row.custom ? <button type="button" onClick={() => { touched.current = true; setRows(current => current.filter(item => item.id !== row.id)) }} className="text-text-mid hover:text-red-700">Remove line</button>
            : <button type="button" onClick={() => update(row.id, { removed: !row.removed, picking: false })} className="text-text-mid hover:text-red-700">{row.removed ? 'Put back on the invoice' : 'Leave off the invoice'}</button>}
        </div>}
        {row.picking && !row.removed && !locked && <PricePicker list={list} suggestions={row.suggestions} onPick={item => pick(row.id, item)} />}
      </li>
    })}</ul>

    {!locked && <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
      {extras.map(extra => <button key={extra.label} type="button" onClick={() => addExtra(extra)} className="inline-flex items-center gap-1.5 rounded-full border border-green-deep/15 bg-[#FCFFF0] px-3 py-1.5 text-xs font-bold text-green-deep hover:border-green-mid"><PlusIcon size={14} weight="bold" />Add {extra.label} · {formatInvoiceMoney(extra.amount)}</button>)}
      <button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 text-xs font-bold text-green-mid hover:text-green-deep hover:underline"><PlusIcon size={14} weight="bold" />Add a line</button>
    </div>}

    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-green-deep/10 pt-4">
      <p className="text-sm text-text-mid">{lines.length} line{lines.length === 1 ? '' : 's'} · <span className="text-lg font-bold text-green-deep">{formatInvoiceMoney(total)}</span></p>
      <div className="flex flex-wrap gap-2">
        {saved && <button type="button" onClick={download} disabled={busy !== null || changed} title={changed ? 'Save your changes first' : undefined} className="secondary disabled:opacity-50"><DownloadSimpleIcon size={18} weight="bold" />{busy === 'pdf' ? 'Preparing…' : 'Download invoice'}</button>}
        {!locked && <button type="button" onClick={save} disabled={busy !== null || needsMigration || (Boolean(saved) && !changed)} className="primary disabled:opacity-50">{busy === 'save' ? 'Saving…' : saved && !changed ? 'Saved' : saved ? 'Save changes' : 'Save invoice'}</button>}
      </div>
    </div>
    {error && <p role="alert" className="mt-3 rounded-[12px] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
    {needsMigration && <p className="mt-3 text-xs leading-5 text-text-mid">Saving invoices needs migrations 052 and 053 to be run first.</p>}

    {bill?.collection === collection ? <p className="mt-3 flex items-start gap-1.5 text-xs font-bold text-green-mid"><CheckCircleIcon size={16} weight="fill" className="shrink-0" />Added to the patient&rsquo;s bill on {formatInvoiceDate(bill.createdAt.slice(0, 10))} ({formatInvoiceMoney(bill.amount)}). To change it, delete that bill on the Financial tab.</p>
      : bill ? <p className="mt-3 text-xs leading-5 text-text-mid">The {collectionLabels[bill.collection].toLowerCase()} invoice is on the patient&rsquo;s bill, so this one can no longer be changed.</p>
      : saved && !changed && !needsMigration && (confirmBill
        ? <div className="mt-3 flex flex-wrap items-center justify-end gap-2 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <span className="w-full font-semibold">Add {formatInvoiceMoney(saved.total)} for {label} to {patient.fullName || 'the patient'}&rsquo;s bill?</span>
            <button type="button" onClick={() => setConfirmBill(false)} disabled={busy !== null} className="rounded-full px-3 py-1.5 font-bold hover:bg-amber-100">Not yet</button>
            <button type="button" onClick={addToBill} disabled={busy !== null} className="rounded-full bg-green-deep px-3 py-1.5 font-bold text-white hover:bg-green-mid disabled:opacity-50">{busy === 'bill' ? 'Adding…' : 'Add to bill'}</button>
          </div>
        : <p className="mt-3 text-xs leading-5 text-text-mid">This invoice is an option for the patient; nothing is on their bill yet. Patient approved {label}? <button type="button" onClick={() => { setError(''); setConfirmBill(true) }} className="font-bold text-green-mid underline underline-offset-2 hover:text-green-deep">Add to bill</button></p>)}
  </div>
}

/** The closest price list lines for a test, and a search of the whole list. */
function PricePicker({ list, suggestions, onPick }: { list: PriceItem[]; suggestions: PriceItem[]; onPick: (item: PriceItem) => void }) {
  const [query, setQuery] = useState('')
  const searching = query.trim().length >= 2
  const results = useMemo(() => searching ? searchPriceList(query, list, 8) : suggestions, [searching, query, list, suggestions])
  return <div className="mt-3 rounded-[12px] border border-green-deep/10 bg-[#FCFFF0] p-3">
    <label className="relative block">
      <MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-mid" />
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search the price list…" aria-label="Search the price list" className="w-full rounded-lg border border-green-deep/15 bg-white py-2 pl-9 pr-3 text-sm text-green-deep focus:border-green-deep focus:outline-none" />
    </label>
    <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-text-mid/70">{searching ? 'Search results' : 'Closest on the price list'}</p>
    {results.length ? <ul className="mt-1.5 space-y-1.5">{results.map(item => <li key={`${item.name}-${item.price}`}>
      <button type="button" onClick={() => onPick(item)} className="flex w-full items-start justify-between gap-3 rounded-lg border border-green-deep/10 bg-white px-3 py-2 text-left transition hover:border-green-mid">
        <span className="min-w-0"><span className="block break-words text-sm font-semibold text-green-deep">{item.name}</span><span className="block text-[11px] text-text-mid">{item.category}</span></span>
        <span className="shrink-0 text-sm font-bold text-green-deep">{formatInvoiceMoney(item.price)}</span>
      </button>
    </li>)}</ul> : <p className="mt-1.5 text-xs text-text-mid">{searching ? 'Nothing on the price list matches that. Try another name, or type the price.' : 'Nothing close on the price list. Search for it above, or type the price.'}</p>}
  </div>
}
