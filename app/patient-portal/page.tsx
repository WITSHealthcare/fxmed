'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BellIcon,
  ChatCircleDotsIcon,
  CheckCircleIcon,
  CircleIcon,
  DownloadSimpleIcon,
  ClipboardTextIcon,
  FileArrowUpIcon,
  FileTextIcon,
  FlaskIcon,
  HeartbeatIcon,
  HouseIcon,
  PaperPlaneRightIcon,
  ReceiptIcon,
  SignOutIcon,
  XIcon,
} from '@phosphor-icons/react'
import { patientAuth } from '@/lib/patient-auth'
import { base64ToBlob, downloadBlob } from '@/lib/fileDownload'
import { INVOICE_PAYMENT, formatInvoiceDate, formatInvoiceMoney, hasBankDetails, paymentStatusLabels, type Invoice, type InvoicePaymentStatus } from '@/lib/invoices'
import { contact } from '@/lib/seo'
import PatientForms from '@/components/forms/PatientForms'

type PortalSection = 'overview' | 'care_plan' | 'lab_results' | 'documents' | 'billing' | 'messages' | 'forms'
/** A test the care team requested and is waiting for results of. */
type LabOrder = { id: string; title: string; tests: string[]; orderedAt: string }
type PortalData = {
  account: { status: string; activated_at: string | null; email_notifications?: boolean }
  patient: Record<string, any>
  carePlans: any[]
  documents: any[]
  messages: any[]
  notifications: any[]
  labOrders?: LabOrder[]
  invoices?: Invoice[]
}

const date = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTime = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const nav: Array<{ id: PortalSection; label: string; Icon: typeof HouseIcon }> = [
  { id: 'overview', label: 'Overview', Icon: HouseIcon },
  { id: 'care_plan', label: 'Care plan', Icon: HeartbeatIcon },
  { id: 'lab_results', label: 'Lab results', Icon: FlaskIcon },
  { id: 'documents', label: 'Documents', Icon: FileTextIcon },
  { id: 'billing', label: 'Billing', Icon: ReceiptIcon },
  { id: 'messages', label: 'Messages', Icon: ChatCircleDotsIcon },
  { id: 'forms', label: 'Forms', Icon: ClipboardTextIcon },
]

function label(value?: string) { return (value || '—').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) }

const LAB_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_BYTES = 15 * 1024 * 1024
const MAX_LAB_FILES = 10

/** The patient's lab result uploads, and the requested tests they have not sent results for yet. */
function labProgress(data: PortalData) {
  const orders = data.labOrders || []
  const uploads = data.documents.filter(item => item.source === 'patient' && item.category === 'laboratory')
  const waiting = orders.filter(order => !uploads.some(item => item.investigation_form_id === order.id))
  return { orders, uploads, waiting }
}

/** The investigation request form for a requested test, to take to the lab. */
async function downloadRequestForm(orderId: string) {
  const response = await fetch(`/api/patient-portal/lab-orders?id=${orderId}`)
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.documentBase64) throw new Error(result.error || 'The request form could not be downloaded. Please try again.')
  downloadBlob(base64ToBlob(result.documentBase64), result.downloadName)
}

async function openDocument(id: string, onError: (message: string) => void) {
  const response = await fetch(`/api/patient-portal/documents?id=${id}`)
  const result = await response.json().catch(() => ({}))
  if (response.ok) window.open(result.url, '_blank', 'noopener,noreferrer')
  else onError(result.error || 'Could not open this document.')
}

export default function PatientPortal() {
  const router = useRouter()
  const [data, setData] = useState<PortalData | null>(null)
  // An emailed notification links straight to its section, as /patient-portal?section=messages.
  const [active, setActive] = useState<PortalSection>(() => {
    const requested = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('section')
    return nav.some(item => item.id === requested) ? requested as PortalSection : 'overview'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  // The lab results window, open for one requested test or (null) for other results.
  const [labUpload, setLabUpload] = useState<{ orderId: string | null } | null>(null)
  const [notice, setNotice] = useState('')
  const menu = useRef<HTMLElement>(null)
  const [showWelcome, setShowWelcome] = useState(false)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    const response = await fetch('/api/patient-portal', { cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status === 403) {
        // Come back to the same section after signing in.
        const section = new URLSearchParams(window.location.search).get('section')
        router.replace(`/patient-portal/login${section ? `?section=${encodeURIComponent(section)}` : ''}`)
      }
      else setError(result.error || 'Unable to load your portal.')
    } else setData(result)
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])
  // On phones the menu is a sideways strip: bring the open section into view
  // without moving the page up or down.
  useEffect(() => {
    const strip = menu.current
    const item = strip?.querySelector<HTMLElement>(`[data-section="${active}"]`)
    if (!strip || !item || strip.scrollWidth <= strip.clientWidth) return
    strip.scrollTo({ left: item.offsetLeft - (strip.clientWidth - item.offsetWidth) / 2, behavior: 'smooth' })
  }, [active, data])
  // Pick up replies and newly shared items while the portal stays open.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void load(true) }
    const interval = window.setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refresh) }
  }, [load])
  useEffect(() => {
    if (window.sessionStorage.getItem('fxmed-patient-welcome') === 'true') {
      window.sessionStorage.removeItem('fxmed-patient-welcome')
      setShowWelcome(true)
    }
  }, [])

  const unreadMessages = useMemo(() => (data?.messages || []).filter(item => item.sender === 'clinic' && item.status === 'unread').length, [data])
  const unreadNotifications = useMemo(() => (data?.notifications || []).filter(item => !item.read_at).length, [data])
  const labsWaiting = useMemo(() => data ? labProgress(data).waiting.length : 0, [data])
  const invoicesDue = useMemo(() => (data?.invoices || []).filter(invoice => invoice.status === 'sent' && invoice.balance > 0).length, [data])

  // Opening the conversation marks the care team's messages read.
  useEffect(() => {
    if (active !== 'messages' || !unreadMessages) return
    void fetch('/api/patient-portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read_messages' }) })
      .then(() => setData(current => current && { ...current, messages: current.messages.map(item => item.sender === 'clinic' ? { ...item, status: 'read' } : item) }))
  }, [active, unreadMessages])

  async function openNotifications() {
    setShowNotifications(open => !open)
    if (!unreadNotifications) return
    await fetch('/api/patient-portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'read_notifications' }) })
    const now = new Date().toISOString()
    // Keep them highlighted while the list is open; they read as seen next time.
    window.setTimeout(() => setData(current => current && { ...current, notifications: current.notifications.map(item => item.read_at ? item : { ...item, read_at: now }) }), 4000)
  }

  async function setEmailNotifications(enabled: boolean) {
    setData(current => current && { ...current, account: { ...current.account, email_notifications: enabled } })
    const response = await fetch('/api/patient-portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'email_notifications', enabled }) })
    if (!response.ok) {
      setData(current => current && { ...current, account: { ...current.account, email_notifications: !enabled } })
      setError((await response.json().catch(() => ({}))).error || 'Your email setting could not be saved. Please try again.')
    }
  }

  async function logout() {
    await patientAuth().signOut()
    router.replace('/patient-portal/login')
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-cream"><div className="h-12 w-12 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" /></div>
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-cream p-8 font-dm-sans text-red-700">{error || 'Portal unavailable.'}</div>
  const patient = data.patient

  return (
    <div className="min-h-screen bg-cream font-dm-sans text-green-deep lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="relative z-30 flex h-auto flex-col overflow-hidden bg-green-deep px-5 py-5 text-white shadow-[12px_0_50px_rgba(26,61,46,0.08)] lg:sticky lg:top-0 lg:h-screen lg:px-7 lg:py-8">
        <div className="flex items-center justify-between lg:block">
          <Image src="/logo.png" alt="FXMed" width={280} height={158} priority className="relative h-14 w-auto brightness-0 invert sm:h-20 lg:h-28" />
          <button type="button" onClick={logout} className="relative rounded-full border border-white/20 px-4 py-2 text-xs font-semibold transition hover:bg-white/10 lg:hidden">Sign out</button>
        </div>
        <div className="relative mt-4 rounded-[18px] border border-white/10 bg-white/[0.07] px-4 py-3 lg:mt-9 lg:rounded-[22px] lg:p-5">
          <span className="hidden rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-green-deep lg:inline-flex">Patient</span>
          <p className="truncate text-base font-bold lg:mt-4 lg:text-lg">{patient.first_name} {patient.last_name}</p>
          <p className="mt-1 text-xs tracking-[0.08em] text-white/55">{patient.mrn}</p>
        </div>
        <nav ref={menu} className="relative -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:mt-8 lg:block lg:space-y-2 lg:overflow-visible lg:px-0">
          {nav.map(item => <button key={item.id} type="button" data-section={item.id} onClick={() => setActive(item.id)} className={`group flex shrink-0 items-center gap-3 rounded-[14px] px-4 py-3 text-left text-sm font-semibold lg:py-3.5 transition-all lg:w-full ${active === item.id ? 'bg-gold text-green-deep shadow-[0_8px_24px_rgba(201,226,101,0.18)]' : 'text-white/65 hover:bg-white/[0.08] hover:text-white'}`}>
            <item.Icon size={22} weight={active === item.id ? 'fill' : 'duotone'} className={`shrink-0 ${active === item.id ? 'text-green-deep' : 'text-white/55 group-hover:text-gold'}`} />
            {item.label}
            {item.id === 'messages' && unreadMessages > 0 && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-green-deep">{unreadMessages}</span>}
            {item.id === 'lab_results' && labsWaiting > 0 && <span title={`${labsWaiting} test${labsWaiting === 1 ? '' : 's'} waiting for your results`} className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-green-deep">{labsWaiting}</span>}
            {item.id === 'billing' && invoicesDue > 0 && <span title={`${invoicesDue} invoice${invoicesDue === 1 ? '' : 's'} to pay`} className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-green-deep">{invoicesDue}</span>}
          </button>)}
        </nav>
        <div className="relative mt-auto hidden border-t border-white/10 pt-5 lg:block">
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-sm font-semibold text-white/65 transition hover:bg-white/[0.08] hover:text-white"><SignOutIcon size={22} weight="duotone" className="shrink-0" />Sign out</button>
        </div>
      </aside>

      <main className="min-w-0 px-4 pb-7 sm:px-7 lg:px-10 lg:pb-10 xl:px-14">
        <div className="mx-auto max-w-[1200px]">
          <header className="relative z-20 -mx-4 flex flex-wrap items-center justify-between gap-4 border-b border-green-deep/10 bg-cream/95 px-4 py-5 backdrop-blur-xl lg:sticky lg:top-0 lg:gap-5 sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10 lg:py-8 xl:-mx-14 xl:px-14">
            <div><SectionLabel>Patient Portal</SectionLabel><h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold leading-none tracking-[-0.035em]">{nav.find(item => item.id === active)?.label}</h1></div>
            <div className="relative flex items-center gap-3">
              <button type="button" onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 rounded-full bg-green-deep px-5 py-3 text-sm font-bold text-white transition hover:bg-green-mid"><FileArrowUpIcon size={19} weight="duotone" className="text-gold" />Upload a record</button>
              <button type="button" onClick={() => void openNotifications()} aria-label={unreadNotifications ? `${unreadNotifications} new notifications` : 'Notifications'} aria-expanded={showNotifications} className="relative flex h-11 w-11 items-center justify-center rounded-full border border-green-deep/10 bg-white shadow-sm">
                <BellIcon size={22} weight="duotone" />
                {unreadNotifications > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold ring-2 ring-cream">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
              </button>
              {showNotifications && <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute left-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden sm:left-auto sm:right-0 rounded-[20px] border border-green-deep/10 bg-white shadow-2xl">
                  <p className="bg-green-deep px-5 py-4 font-semibold text-white">Notifications</p>
                  <div className="max-h-80 overflow-y-auto">{data.notifications.length ? data.notifications.map(item => <button key={item.id} type="button" onClick={() => { setActive(item.section); setShowNotifications(false) }} className={`block w-full border-b border-gray-100 p-4 text-left hover:bg-gray-50 ${item.read_at ? '' : 'bg-gold/10'}`}>
                    <p className="text-sm font-semibold [overflow-wrap:anywhere]">{item.title}</p>
                    {item.detail && <p className="mt-0.5 line-clamp-2 text-xs text-text-mid">{item.detail}</p>}
                    <p className="mt-1 text-[11px] text-text-mid">{dateTime.format(new Date(item.created_at))}</p>
                  </button>) : <p className="p-8 text-center text-sm text-text-mid">You’re all caught up.</p>}</div>
                  <label className="flex cursor-pointer items-center justify-between gap-4 border-t border-gray-100 px-5 py-4">
                    <span>
                      <span className="block text-sm font-semibold">Email me about updates</span>
                      <span className="mt-0.5 block text-xs leading-5 text-text-mid">We email you when something changes here, never with health details.</span>
                    </span>
                    <input type="checkbox" role="switch" checked={data.account.email_notifications !== false} onChange={event => setEmailNotifications(event.target.checked)} className="h-5 w-5 shrink-0 accent-green-deep" />
                  </label>
                </div>
              </>}
            </div>
          </header>
          {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {notice && <div role="status" className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><span className="flex items-start gap-2"><CheckCircleIcon size={20} weight="fill" className="shrink-0" />{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="shrink-0 rounded-full p-1 hover:bg-emerald-100"><XIcon size={16} /></button></div>}

          {active === 'overview' && <Overview data={data} unreadMessages={unreadMessages} goTo={setActive} />}
          {active === 'care_plan' && <CarePlans plans={data.carePlans} onChanged={() => load(true)} onError={setError} />}
          {active === 'lab_results' && <LabResults data={data} onUpload={orderId => { setNotice(''); setLabUpload({ orderId }) }} onError={setError} />}
          {active === 'documents' && <Documents documents={data.documents} onUpload={() => setShowUpload(true)} onError={setError} />}
          {active === 'billing' && <Billing invoices={data.invoices || []} patient={patient} goTo={setActive} onError={setError} />}
          {active === 'forms' && <PatientForms />}
          {active === 'messages' && <Messages messages={data.messages} onSent={message => setData(current => current && { ...current, messages: [...current.messages, message] })} />}
        </div>
      </main>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={() => { setShowUpload(false); load(true); setActive('documents') }} />}
      {labUpload && <LabUploadModal orders={data.labOrders || []} orderId={labUpload.orderId}
        onClose={sent => { setLabUpload(null); if (sent) load(true) }}
        onUploaded={() => {
          setLabUpload(null)
          setNotice('Thank you. Your results have gone to your care team, and we will let you know once they have reviewed them.')
          load(true)
          setActive('lab_results')
        }} />}
      {showWelcome && <WelcomeModal firstName={patient.first_name} onClose={() => setShowWelcome(false)} />}
    </div>
  )
}

function Overview({ data, unreadMessages, goTo }: { data: PortalData; unreadMessages: number; goTo: (section: PortalSection) => void }) {
  const steps = data.carePlans.flatMap(plan => plan.status === 'active' ? plan.items : [])
  const remaining = steps.filter(item => item.status !== 'completed')
  const next = [...remaining].sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999')).slice(0, 4)
  const { waiting } = labProgress(data)
  return <div className="mt-8 space-y-6">
    {waiting.length > 0 && <button type="button" onClick={() => goTo('lab_results')} className="flex w-full flex-wrap items-center gap-4 rounded-[22px] border border-gold bg-gold/15 p-4 text-left shadow-[0_8px_30px_rgba(26,61,46,0.06)] transition hover:-translate-y-0.5 sm:p-6">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-green-deep text-gold"><FlaskIcon size={24} weight="duotone" /></span>
      <span className="min-w-[11rem] flex-1">
        <span className="block font-bold">Your care team is waiting for your lab results</span>
        <span className="mt-1 block text-sm leading-6 text-text-mid">{waiting.length === 1 ? waiting[0].title : `${waiting.length} requested tests`}. Download the request form to take to the lab, then upload your results here when they are ready.</span>
      </span>
      <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white sm:w-auto"><FlaskIcon size={18} weight="duotone" className="text-gold" />View tests</span>
    </button>}
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat title="Care plan steps to do" value={remaining.length} onClick={() => goTo('care_plan')} />
      <Stat title="Shared documents" value={data.documents.filter(item => item.source !== 'patient').length} onClick={() => goTo('documents')} />
      <Stat title="Unread messages" value={unreadMessages} onClick={() => goTo('messages')} />
    </div>
    <Card label="Up next" title="Your next care plan steps">
      {next.length ? <div className="mt-5 space-y-3">{next.map(item => <div key={item.id} className="flex items-start gap-3 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4"><CircleIcon size={20} className="mt-0.5 shrink-0 text-green-mid" /><div><p className="font-bold">{item.title}</p>{item.instructions && <p className="mt-1 text-sm leading-6 text-text-mid">{item.instructions}</p>}{item.due_date && <p className="mt-1 text-xs font-bold text-green-mid">Due {date.format(new Date(`${item.due_date}T00:00:00`))}</p>}</div></div>)}</div>
        : <Empty text={data.carePlans.length ? 'Every step in your active care plan is done. Well done.' : 'Your care team has not shared a care plan yet.'} />}
    </Card>
    <Card label="Your details" title="Contact information on file">
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <ReadOnly label="Full name" value={[data.patient.first_name, data.patient.middle_name, data.patient.last_name].filter(Boolean).join(' ')} />
        <ReadOnly label="Patient number" value={data.patient.mrn} />
        <ReadOnly label="Date of birth" value={data.patient.date_of_birth ? date.format(new Date(`${data.patient.date_of_birth}T00:00:00`)) : '—'} />
        <ReadOnly label="Phone" value={data.patient.phone || '—'} />
        <ReadOnly label="Email" value={data.patient.email || '—'} />
        <ReadOnly label="Address" value={[data.patient.address, data.patient.city, data.patient.state].filter(Boolean).join(', ') || '—'} />
      </div>
      <p className="mt-4 text-xs text-text-mid">Something out of date? Send your care team a message and they will update your record.</p>
    </Card>
  </div>
}

function CarePlans({ plans, onChanged, onError }: { plans: any[]; onChanged: () => void; onError: (message: string) => void }) {
  const [saving, setSaving] = useState<string | null>(null)
  async function toggle(item: any) {
    setSaving(item.id)
    const response = await fetch('/api/patient-portal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'care_item', id: item.id, done: item.status !== 'completed' }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) onError(result.error || 'Could not update this step.')
    else onChanged()
    setSaving(null)
  }
  if (!plans.length) return <div className="mt-8"><Empty text="Your care team has not shared a care plan yet. When they do, it will appear here." /></div>
  return <div className="mt-8 space-y-6">{plans.map(plan => {
    const done = plan.items.filter((item: any) => item.status === 'completed').length
    const percent = plan.items.length ? Math.round((done / plan.items.length) * 100) : 0
    return <Card key={plan.id} label={label(plan.status)} title={plan.title}>
      {plan.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-mid">{plan.description}</p>}
      {plan.goals && <div className="mt-4 rounded-[16px] bg-[#FCFFF0] p-4"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-green-mid">Goals</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{plan.goals}</p></div>}
      <div className="mt-5 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-green-deep/10"><div className="h-full rounded-full bg-green-mid transition-all" style={{ width: `${percent}%` }} /></div><span className="text-xs font-bold">{done}/{plan.items.length} done</span></div>
      <div className="mt-5 space-y-3">{plan.items.length ? plan.items.map((item: any) => {
        const complete = item.status === 'completed'
        return <button key={item.id} type="button" disabled={saving === item.id || plan.status !== 'active'} onClick={() => toggle(item)} className="flex w-full items-start gap-3 rounded-[16px] border border-green-deep/10 bg-white p-4 text-left transition hover:border-green-mid disabled:cursor-default disabled:hover:border-green-deep/10">
          {complete ? <CheckCircleIcon size={24} weight="fill" className="shrink-0 text-green-mid" /> : <CircleIcon size={24} className="shrink-0 text-green-deep/30" />}
          <span className="min-w-0 flex-1">
            <span className={`block font-bold ${complete ? 'text-text-mid line-through' : ''}`}>{item.title}</span>
            {item.instructions && <span className="mt-1 block whitespace-pre-wrap text-sm leading-6 text-text-mid">{item.instructions}</span>}
            <span className="mt-1 block text-xs font-bold text-green-mid">{complete ? `Done${item.completed_at ? ` ${date.format(new Date(item.completed_at))}` : ''}` : item.due_date ? `Due ${date.format(new Date(`${item.due_date}T00:00:00`))}` : 'Tap when done'}</span>
          </span>
        </button>
      }) : <Empty text="Your care team is still adding steps to this plan." />}</div>
    </Card>
  })}</div>
}

function Documents({ documents, onUpload, onError }: { documents: any[]; onUpload: () => void; onError: (message: string) => void }) {
  const open = (id: string) => openDocument(id, onError)
  const shared = documents.filter(item => item.source !== 'patient')
  const mine = documents.filter(item => item.source === 'patient')
  // On narrow phones the status badge drops below rather than squeezing the title.
  const row = (item: any) => <button key={item.id} type="button" onClick={() => open(item.id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4 text-left transition hover:border-green-mid">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-green-mid/10 text-green-mid"><FileTextIcon size={22} weight="duotone" /></span>
    <span className="min-w-[8rem] flex-1"><span className="line-clamp-2 break-words font-bold">{item.title}</span><span className="mt-1 block text-xs text-text-mid">{label(item.category)} · {date.format(new Date(item.shared_at || item.created_at))}</span></span>
    {item.source === 'patient' && <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${item.portal_status === 'reviewed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.portal_status === 'reviewed' ? 'Reviewed' : 'Awaiting review'}</span>}
  </button>
  // grid-cols-1 lets long titles truncate instead of widening the cards past a phone screen.
  return <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
    <Card label="From your care team" title="Shared with you">{shared.length ? <div className="mt-5 space-y-3">{shared.map(row)}</div> : <Empty text="No documents have been shared with you yet." />}</Card>
    <Card label="From you" title="Your uploads" action={<button type="button" onClick={onUpload} className="inline-flex items-center gap-2 rounded-full border border-green-deep/15 px-4 py-2 text-sm font-bold hover:bg-green-deep/5"><FileArrowUpIcon size={18} weight="duotone" />Upload</button>}>{mine.length ? <div className="mt-5 space-y-3">{mine.map(row)}</div> : <Empty text="Upload lab results, scans or records from other clinics so your care team can review them." />}</Card>
  </div>
}

const invoiceTone: Record<InvoicePaymentStatus, string> = {
  unpaid: 'bg-amber-50 text-amber-700',
  part_paid: 'bg-sky-50 text-sky-800',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-red-50 text-red-700',
  void: 'bg-gray-100 text-text-mid',
}

function Billing({ invoices, patient, goTo, onError }: { invoices: Invoice[]; patient: Record<string, any>; goTo: (section: PortalSection) => void; onError: (message: string) => void }) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const due = invoices.filter(invoice => invoice.status === 'sent' && invoice.balance > 0)

  async function download(invoice: Invoice) {
    setDownloading(invoice.id)
    try {
      // Made in the browser, like the copy staff download.
      const { generateInvoicePdf, invoiceFileName } = await import('@/lib/invoicePdf')
      const name = [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ')
      downloadBlob(await generateInvoicePdf(invoice, { fullName: name, mrn: patient.mrn, phone: patient.phone, email: patient.email, address: [patient.address, patient.city, patient.state].filter(Boolean).join(', ') }), invoiceFileName(invoice))
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The invoice could not be downloaded. Please try again.')
    }
    setDownloading(null)
  }

  if (!invoices.length) return <div className="mt-8"><Empty text="You have no invoices. When your care team sends you one, it will appear here." /></div>
  return <div className="mt-8 space-y-6">
    {due.length > 0 && <Card label="How to pay" title={hasBankDetails() ? 'Pay by bank transfer' : 'Arrange payment'}>
      {hasBankDetails() ? <>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {INVOICE_PAYMENT.bankName && <ReadOnly label="Bank" value={INVOICE_PAYMENT.bankName} />}
          {INVOICE_PAYMENT.accountName && <ReadOnly label="Account name" value={INVOICE_PAYMENT.accountName} />}
          <ReadOnly label="Account number" value={INVOICE_PAYMENT.accountNumber} />
        </div>
        <p className="mt-4 text-sm leading-6 text-text-mid">Use the invoice number (for example {due[0].number}) as your payment reference.</p>
      </> : <p className="mt-3 text-sm leading-6 text-text-mid">Please contact FXMed on {contact.phoneNigeria} or {contact.email} to arrange payment, quoting your invoice number.</p>}
      <button type="button" onClick={() => goTo('messages')} className="mt-4 text-sm font-bold text-green-mid underline underline-offset-4 hover:text-green-deep">Paid already? Send us your receipt in Messages</button>
    </Card>}
    <Card label="From your care team" title="Your invoices">
      <div className="mt-5 space-y-3">{invoices.map(invoice => <div key={invoice.id} className="rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="font-bold">{invoice.number}</p><p className="mt-1 text-xs text-text-mid">Issued {formatInvoiceDate(invoice.issueDate)}{invoice.status !== 'void' ? ` · ${invoice.dueDate ? `due ${formatInvoiceDate(invoice.dueDate)}` : 'due on receipt'}` : ''}</p></div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${invoiceTone[invoice.paymentStatus]}`}>{paymentStatusLabels[invoice.paymentStatus]}</span>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">{invoice.items.map(item => <li key={item.id} className="flex justify-between gap-3"><span className="min-w-0 break-words text-text-mid">{item.description}</span><span className="shrink-0 font-semibold">{formatInvoiceMoney(item.amount, invoice.currency)}</span></li>)}</ul>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-green-deep/10 pt-3 text-sm">
          <span>Total <strong>{formatInvoiceMoney(invoice.total, invoice.currency)}</strong></span>
          {invoice.status !== 'void' && <><span>Paid <strong>{formatInvoiceMoney(invoice.paid, invoice.currency)}</strong></span><span>Balance <strong>{formatInvoiceMoney(invoice.balance, invoice.currency)}</strong></span></>}
        </div>
        {invoice.status === 'void' && <p className="mt-2 text-xs text-text-mid">Your care team cancelled this invoice. Nothing is owed on it.</p>}
        <button type="button" onClick={() => download(invoice)} disabled={downloading === invoice.id} className="mt-4 inline-flex items-center gap-2 rounded-full border border-green-deep/15 bg-white px-5 py-2.5 text-sm font-bold transition hover:bg-green-deep/5 disabled:opacity-50"><DownloadSimpleIcon size={18} weight="bold" />{downloading === invoice.id ? 'Preparing…' : 'Download invoice'}</button>
      </div>)}</div>
    </Card>
  </div>
}

function Messages({ messages, onSent }: { messages: any[]; onSent: (message: any) => void }) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [messages.length])

  async function send(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.trim()) return
    setSending(true)
    setError('')
    const response = await fetch('/api/patient-portal/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: draft }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) setError(result.error || 'Your message could not be sent.')
    else { setDraft(''); onSent(result.message) }
    setSending(false)
  }

  return <div className="mt-8">
    <Card label="Secure messaging" title="Your care team">
      <p className="mt-2 text-sm text-text-mid">For anything urgent, call the clinic or go to the nearest emergency department. Messages are answered during clinic hours.</p>
      <div className="mt-5 max-h-[32rem] min-h-[12rem] space-y-3 overflow-y-auto rounded-[16px] bg-[#FCFFF0] p-4">
        {messages.length ? messages.map(item => <div key={item.id} className={`flex ${item.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[85%] rounded-[16px] px-4 py-3 text-sm leading-6 ${item.sender === 'patient' ? 'bg-green-deep text-white' : 'border border-green-deep/10 bg-white'}`}>
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{item.body}</p>
            <p className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${item.sender === 'patient' ? 'text-white/55' : 'text-green-mid/70'}`}>{item.sender === 'patient' ? 'You' : item.sender_name || 'Care team'} · {dateTime.format(new Date(item.created_at))}</p>
          </div>
        </div>) : <p className="py-10 text-center text-sm text-text-mid">No messages yet. Send your care team a question below.</p>}
        <div ref={end} />
      </div>
      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={send} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <textarea value={draft} onChange={event => setDraft(event.target.value)} rows={3} maxLength={4000} placeholder="Write a message…" className="min-h-[3.5rem] flex-1 rounded-[14px] border border-green-deep/15 bg-white px-4 py-3 text-sm outline-none focus:border-green-mid focus:ring-2 focus:ring-green-mid/15" />
        <button type="submit" disabled={sending || !draft.trim()} className="inline-flex items-center justify-center gap-2 rounded-full bg-green-deep px-6 py-3.5 text-sm font-bold text-white transition hover:bg-green-mid disabled:opacity-50"><PaperPlaneRightIcon size={18} weight="fill" />{sending ? 'Sending…' : 'Send'}</button>
      </form>
    </Card>
  </div>
}

function LabResults({ data, onUpload, onError }: { data: PortalData; onUpload: (orderId: string | null) => void; onError: (message: string) => void }) {
  const { orders, uploads } = labProgress(data)
  const sentFor = (orderId: string) => uploads.filter(item => item.investigation_form_id === orderId)
  const [downloading, setDownloading] = useState<string | null>(null)
  async function download(orderId: string) {
    setDownloading(orderId)
    try { await downloadRequestForm(orderId) } catch (error) { onError(error instanceof Error ? error.message : 'The request form could not be downloaded.') }
    setDownloading(null)
  }
  const uploadButton = (text: string, onClick: () => void, quiet = false) => <button type="button" onClick={onClick} className={quiet
    ? 'inline-flex items-center gap-2 rounded-full border border-green-deep/15 px-4 py-2 text-sm font-bold hover:bg-green-deep/5'
    : 'inline-flex items-center gap-2 rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white transition hover:bg-green-mid'}><FileArrowUpIcon size={18} weight="duotone" className={quiet ? '' : 'text-gold'} />{text}</button>

  return <div className="mt-8 space-y-6">
    <Card label="Requested by your care team" title="Tests waiting for your results" action={uploadButton('Upload other results', () => onUpload(null), true)}>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-mid">Download the request form for each test and take it to the lab. When the lab gives you your results, upload them here and they go straight to your care team. The PDF from the lab, or a clear photo of every page, both work.</p>
      {orders.length ? <div className="mt-5 space-y-3">{orders.map(order => {
        const sent = sentFor(order.id)
        const reviewed = sent.length > 0 && sent.every(item => item.portal_status === 'reviewed')
        const status = !sent.length ? { text: 'Waiting for your results', tone: 'bg-amber-50 text-amber-700' }
          : reviewed ? { text: 'Reviewed by your care team', tone: 'bg-emerald-50 text-emerald-700' }
          : { text: 'Sent · awaiting review', tone: 'bg-gold/30 text-green-deep' }
        return <div key={order.id} className="rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><p className="font-bold">{order.title}</p><p className="mt-1 text-xs text-text-mid">Requested {date.format(new Date(order.orderedAt))}{sent.length ? ` · ${sent.length} file${sent.length === 1 ? '' : 's'} sent` : ''}</p></div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${status.tone}`}>{status.text}</span>
          </div>
          {order.tests.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">
            {order.tests.slice(0, 10).map(test => <span key={test} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold ring-1 ring-green-deep/10">{test}</span>)}
            {order.tests.length > 10 && <span className="px-2 py-1 text-[11px] font-semibold text-text-mid">+{order.tests.length - 10} more</span>}
          </div>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => download(order.id)} disabled={downloading === order.id} className="inline-flex items-center gap-2 rounded-full border border-green-deep/15 bg-white px-5 py-2.5 text-sm font-bold transition hover:bg-green-deep/5 disabled:opacity-50"><DownloadSimpleIcon size={18} weight="bold" />{downloading === order.id ? 'Downloading…' : 'Download request form'}</button>
            {uploadButton(sent.length ? 'Upload more pages' : 'Upload results', () => onUpload(order.id))}
          </div>
        </div>
      })}</div> : <Empty text="Your care team is not waiting for any lab results right now. If you have results from another lab, you can still upload them." />}
    </Card>
    <Card label="From you" title="Lab results you have sent">
      {uploads.length ? <div className="mt-5 space-y-3">{uploads.map(item => <button key={item.id} type="button" onClick={() => openDocument(item.id, onError)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4 text-left transition hover:border-green-mid">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-green-mid/10 text-green-mid"><FileTextIcon size={22} weight="duotone" /></span>
        <span className="min-w-[8rem] flex-1"><span className="line-clamp-2 break-words font-bold">{item.title}</span><span className="mt-1 block text-xs text-text-mid">Sent {date.format(new Date(item.created_at))}</span></span>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${item.portal_status === 'reviewed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.portal_status === 'reviewed' ? 'Reviewed' : 'Awaiting review'}</span>
      </button>)}</div> : <Empty text="Nothing yet. Results you upload appear here, with whether your care team has reviewed them." />}
    </Card>
  </div>
}

function LabUploadModal({ orders, orderId: chosenOrder, onClose, onUploaded }: { orders: LabOrder[]; orderId: string | null; onClose: (sent: boolean) => void; onUploaded: () => void }) {
  // '' is results for a test not listed here.
  const [orderId, setOrderId] = useState(chosenOrder && orders.some(order => order.id === chosenOrder) ? chosenOrder : '')
  const [files, setFiles] = useState<File[]>([])
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  // Files already sent when an upload stopped part way, so a retry numbers the rest after them.
  const [sentBefore, setSentBefore] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const saving = Boolean(progress)

  function addFiles(chosen: File[]) {
    const problems: string[] = []
    const accepted = chosen.filter(file => LAB_FILE_TYPES.includes(file.type))
    if (accepted.length < chosen.length) problems.push('Only PDFs and photos (JPG, PNG or WebP) can be uploaded, so some files were left out.')
    const tooLarge = accepted.filter(file => file.size > MAX_FILE_BYTES)
    if (tooLarge.length) problems.push(`${tooLarge.map(file => file.name).join(', ')} ${tooLarge.length === 1 ? 'is' : 'are'} larger than 15 MB.`)
    const next = [...files, ...accepted.filter(file => file.size <= MAX_FILE_BYTES)]
    if (next.length > MAX_LAB_FILES) problems.push(`You can send up to ${MAX_LAB_FILES} files at a time.`)
    setFiles(next.slice(0, MAX_LAB_FILES))
    setError(problems.join(' '))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!files.length) return setError('Choose the results to upload.')
    setError('')
    const order = orders.find(item => item.id === orderId)
    const name = order ? `Lab results — ${order.title}` : title.trim() || 'Lab results'
    const total = sentBefore + files.length
    for (let index = 0; index < files.length; index++) {
      setProgress(files.length > 1 ? `Uploading ${index + 1} of ${files.length}…` : 'Uploading…')
      const form = new FormData()
      form.set('file', files[index])
      form.set('title', total > 1 ? `${name} (${sentBefore + index + 1} of ${total})` : name)
      form.set('category', 'laboratory')
      if (order) form.set('order_id', order.id)
      if (index === 0) form.set('notes', notes)
      let problem = ''
      try {
        const response = await fetch('/api/patient-portal/documents', { method: 'POST', body: form })
        if (!response.ok) problem = (await response.json().catch(() => ({}))).error || 'The upload failed.'
      } catch {
        problem = 'The upload failed. Check your connection.'
      }
      if (problem) {
        // Keep what has not gone yet, ready to try again. The note went with the first file.
        setFiles(files.slice(index))
        if (index > 0) { setSentBefore(sentBefore + index); setNotes('') }
        setProgress('')
        setError(`${index ? `${index} of ${files.length} files were sent. ` : ''}${problem} Try again to send the rest.`)
        return
      }
    }
    onUploaded()
  }

  const field = 'mt-2 w-full rounded-[14px] border border-green-deep/15 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-green-mid focus:ring-2 focus:ring-green-mid/15'
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-deep/50 p-4" role="dialog" aria-modal="true" aria-labelledby="lab-upload-title">
    <form onSubmit={submit} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div><SectionLabel>Send to your care team</SectionLabel><h2 id="lab-upload-title" className="mt-2 text-2xl font-bold">Upload lab results</h2></div>
        <button type="button" onClick={() => onClose(sentBefore > 0)} disabled={saving} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-green-deep/5 disabled:opacity-40"><XIcon size={20} /></button>
      </div>
      {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="mt-6 space-y-4">
        {orders.length > 0 && <label className="block text-sm font-bold">Which test are these results for?
          <select value={orderId} onChange={event => setOrderId(event.target.value)} disabled={saving} className={field}>
            {orders.map(order => <option key={order.id} value={order.id}>{order.title} (requested {date.format(new Date(order.orderedAt))})</option>)}
            <option value="">Another test, not listed here</option>
          </select>
        </label>}
        {!orderId && <label className="block text-sm font-bold">What test was it? (optional)<input value={title} onChange={event => setTitle(event.target.value)} maxLength={200} disabled={saving} className={field} placeholder="e.g. Full blood count from Synlab" /></label>}
        <div>
          <p className="text-sm font-bold">Results</p>
          <button type="button" onClick={() => input.current?.click()} disabled={saving} className="mt-2 flex w-full flex-col items-center gap-1 rounded-[16px] border-2 border-dashed border-green-deep/20 bg-cream/50 px-4 py-6 text-center transition hover:border-green-mid disabled:opacity-50">
            <FileArrowUpIcon size={28} weight="duotone" className="text-green-mid" />
            <span className="text-sm font-bold">{files.length ? 'Add more files' : 'Choose files or take photos'}</span>
            <span className="text-xs text-text-mid">The lab’s PDF, or a clear photo of every page. Up to 15 MB each.</span>
          </button>
          <input ref={input} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={event => {
            const chosen = Array.from(event.target.files || [])
            event.target.value = ''
            if (chosen.length) addFiles(chosen)
          }} />
          {files.length > 0 && <ul className="mt-3 space-y-2">{files.map((file, index) => <li key={`${file.name}-${file.size}-${index}`} className="flex items-center gap-3 rounded-[12px] border border-green-deep/10 bg-[#FCFFF0] px-3 py-2 text-sm">
            <FileTextIcon size={18} weight="duotone" className="shrink-0 text-green-mid" />
            <span className="min-w-0 flex-1 truncate font-semibold">{file.name}</span>
            <span className="shrink-0 text-xs text-text-mid">{file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`}</span>
            <button type="button" onClick={() => setFiles(current => current.filter((_, position) => position !== index))} disabled={saving} aria-label={`Remove ${file.name}`} className="shrink-0 rounded-full p-1 text-text-mid hover:bg-red-50 hover:text-red-700 disabled:opacity-40"><XIcon size={14} weight="bold" /></button>
          </li>)}</ul>}
        </div>
        <label className="block text-sm font-bold">Note for your care team (optional)<textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={2000} rows={3} disabled={saving} className={field} placeholder="e.g. Taken on 3 November, fasting" /></label>
      </div>
      <div className="mt-6 flex items-center justify-end gap-3">
        {progress && <p role="status" className="mr-auto text-sm font-semibold text-green-mid">{progress}</p>}
        <button type="button" onClick={() => onClose(sentBefore > 0)} disabled={saving} className="rounded-full px-5 py-3 text-sm font-bold hover:bg-green-deep/5 disabled:opacity-40">Cancel</button>
        <button type="submit" disabled={saving || !files.length} className="rounded-full bg-green-deep px-6 py-3 text-sm font-bold text-white hover:bg-green-mid disabled:opacity-50">{saving ? 'Sending…' : files.length > 1 ? `Send ${files.length} files` : 'Send results'}</button>
      </div>
    </form>
  </div>
}

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('external_record')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!file) return setError('Choose a file to upload.')
    setSaving(true)
    setError('')
    const form = new FormData()
    form.set('file', file)
    form.set('title', title)
    form.set('category', category)
    form.set('notes', notes)
    const response = await fetch('/api/patient-portal/documents', { method: 'POST', body: form })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'The upload failed.'); setSaving(false); return }
    onUploaded()
  }

  const field = 'mt-2 w-full rounded-[14px] border border-green-deep/15 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-green-mid focus:ring-2 focus:ring-green-mid/15'
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-deep/50 p-4" role="dialog" aria-modal="true" aria-labelledby="upload-title">
    <form onSubmit={submit} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><SectionLabel>Share with your care team</SectionLabel><h2 id="upload-title" className="mt-2 text-2xl font-bold">Upload a record</h2></div><button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-green-deep/5"><XIcon size={20} /></button></div>
      {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="mt-6 space-y-4">
        <label className="block text-sm font-bold">File<input type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={event => { const chosen = event.target.files?.[0] || null; setFile(chosen); if (chosen && !title) setTitle(chosen.name.replace(/\.[^.]+$/, '')) }} className={field} /><span className="mt-1 block text-xs font-normal text-text-mid">PDF, image or Word document, up to 15 MB.</span></label>
        <label className="block text-sm font-bold">Title<input value={title} onChange={event => setTitle(event.target.value)} maxLength={240} className={field} placeholder="e.g. Blood test from Lagoon Hospital" /></label>
        <label className="block text-sm font-bold">Type<select value={category} onChange={event => setCategory(event.target.value)} className={field}><option value="external_record">Record from another clinic</option><option value="laboratory">Lab result</option><option value="imaging">Scan or imaging report</option></select></label>
        <label className="block text-sm font-bold">Note for your care team (optional)<textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={2000} rows={3} className={field} /></label>
      </div>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-bold hover:bg-green-deep/5">Cancel</button><button type="submit" disabled={saving} className="rounded-full bg-green-deep px-6 py-3 text-sm font-bold text-white hover:bg-green-mid disabled:opacity-50">{saving ? 'Uploading…' : 'Upload'}</button></div>
    </form>
  </div>
}

function WelcomeModal({ firstName, onClose }: { firstName?: string; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-deep/50 p-4" role="dialog" aria-modal="true">
    <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[24px] bg-white p-6 text-center shadow-2xl sm:p-8">
      <CheckCircleIcon size={52} weight="fill" className="mx-auto text-green-mid" />
      <h2 className="mt-4 text-2xl font-bold">Welcome{firstName ? `, ${firstName}` : ''}</h2>
      <p className="mt-3 text-sm leading-6 text-text-mid">This is where you’ll find the care plan and documents your doctor shares, and where you can message your care team.</p>
      <button type="button" onClick={onClose} className="mt-6 w-full rounded-full bg-green-deep px-6 py-3.5 text-sm font-bold text-white hover:bg-green-mid">Get started</button>
    </div>
  </div>
}

function Card({ label: eyebrow, title, action, children }: { label: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-[24px] border border-green-deep/10 bg-white p-6 shadow-[0_8px_30px_rgba(26,61,46,0.06)] sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><SectionLabel>{eyebrow}</SectionLabel><h2 className="mt-3 text-2xl font-bold">{title}</h2></div>{action}</div>{children}</section>
}
function Stat({ title, value, onClick }: { title: string; value: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-[22px] border border-green-deep/10 bg-white p-6 text-left shadow-[0_8px_30px_rgba(26,61,46,0.06)] transition hover:-translate-y-0.5"><p className="text-xs font-bold uppercase tracking-[0.08em] text-text-mid/75">{title}</p><p className="mt-2 text-3xl font-bold tracking-[-0.03em]">{value}</p></button>
}
function ReadOnly({ label: name, value }: { label: string; value: string }) { return <div><p className="text-sm font-bold">{name}</p><p className="mt-2 rounded-[14px] border border-green-deep/[0.06] bg-cream/55 px-4 py-3.5 text-sm text-text-mid">{value}</p></div> }
function Empty({ text }: { text: string }) { return <div className="mt-6 rounded-[16px] border border-dashed border-green-deep/20 bg-cream/50 p-8 text-center text-sm leading-6 text-text-mid">{text}</div> }
function SectionLabel({ children }: { children: React.ReactNode }) { return <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-mid">{children}</p> }
