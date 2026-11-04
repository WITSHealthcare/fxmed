'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BellIcon,
  ChatCircleDotsIcon,
  CheckCircleIcon,
  CircleIcon,
  FileArrowUpIcon,
  FileTextIcon,
  HeartbeatIcon,
  HouseIcon,
  PaperPlaneRightIcon,
  SignOutIcon,
  XIcon,
} from '@phosphor-icons/react'
import { signOut } from '@/lib/supabase-auth'

type PortalSection = 'overview' | 'care_plan' | 'documents' | 'messages'
type PortalData = {
  account: { status: string; activated_at: string | null }
  patient: Record<string, any>
  carePlans: any[]
  documents: any[]
  messages: any[]
  notifications: any[]
}

const date = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTime = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const nav: Array<{ id: PortalSection; label: string; Icon: typeof HouseIcon }> = [
  { id: 'overview', label: 'Overview', Icon: HouseIcon },
  { id: 'care_plan', label: 'Care plan', Icon: HeartbeatIcon },
  { id: 'documents', label: 'Documents', Icon: FileTextIcon },
  { id: 'messages', label: 'Messages', Icon: ChatCircleDotsIcon },
]

function label(value?: string) { return (value || '—').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) }

export default function PatientPortal() {
  const router = useRouter()
  const [data, setData] = useState<PortalData | null>(null)
  const [active, setActive] = useState<PortalSection>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    const response = await fetch('/api/patient-portal', { cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status === 403) router.replace('/patient-portal/login')
      else setError(result.error || 'Unable to load your portal.')
    } else setData(result)
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])
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

  async function logout() {
    await signOut()
    router.replace('/patient-portal/login')
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-cream"><div className="h-12 w-12 animate-spin rounded-full border-2 border-green-deep/15 border-t-green-deep" /></div>
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-cream p-8 font-dm-sans text-red-700">{error || 'Portal unavailable.'}</div>
  const patient = data.patient

  return (
    <div className="min-h-screen bg-cream font-dm-sans text-green-deep lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="relative z-30 flex h-auto flex-col overflow-hidden bg-green-deep px-5 py-5 text-white shadow-[12px_0_50px_rgba(26,61,46,0.08)] lg:sticky lg:top-0 lg:h-screen lg:px-7 lg:py-8">
        <div className="flex items-center justify-between lg:block">
          <Image src="/logo.png" alt="FXMed" width={280} height={158} priority className="relative h-24 w-auto brightness-0 invert lg:h-28" />
          <button type="button" onClick={logout} className="relative rounded-full border border-white/20 px-4 py-2 text-xs font-semibold transition hover:bg-white/10 lg:hidden">Sign out</button>
        </div>
        <div className="relative mt-5 rounded-[22px] border border-white/10 bg-white/[0.07] p-5 lg:mt-9">
          <span className="inline-flex rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-green-deep">Patient</span>
          <p className="mt-4 truncate text-lg font-bold">{patient.first_name} {patient.last_name}</p>
          <p className="mt-1 text-xs tracking-[0.08em] text-white/55">{patient.mrn}</p>
        </div>
        <nav className="relative mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:block lg:space-y-2 lg:overflow-visible">
          {nav.map(item => <button key={item.id} type="button" onClick={() => setActive(item.id)} className={`group flex shrink-0 items-center gap-3 rounded-[14px] px-4 py-3.5 text-left text-sm font-semibold transition-all lg:w-full ${active === item.id ? 'bg-gold text-green-deep shadow-[0_8px_24px_rgba(201,226,101,0.18)]' : 'text-white/65 hover:bg-white/[0.08] hover:text-white'}`}>
            <item.Icon size={22} weight={active === item.id ? 'fill' : 'duotone'} className={`shrink-0 ${active === item.id ? 'text-green-deep' : 'text-white/55 group-hover:text-gold'}`} />
            {item.label}
            {item.id === 'messages' && unreadMessages > 0 && <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-green-deep">{unreadMessages}</span>}
          </button>)}
        </nav>
        <div className="relative mt-auto hidden border-t border-white/10 pt-5 lg:block">
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-sm font-semibold text-white/65 transition hover:bg-white/[0.08] hover:text-white"><SignOutIcon size={22} weight="duotone" className="shrink-0" />Sign out</button>
        </div>
      </aside>

      <main className="min-w-0 px-4 pb-7 sm:px-7 lg:px-10 lg:pb-10 xl:px-14">
        <div className="mx-auto max-w-[1200px]">
          <header className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-5 border-b border-green-deep/10 bg-cream/95 px-4 py-6 backdrop-blur-xl sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10 lg:py-8 xl:-mx-14 xl:px-14">
            <div><SectionLabel>Patient Portal</SectionLabel><h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold leading-none tracking-[-0.035em]">{nav.find(item => item.id === active)?.label}</h1></div>
            <div className="relative flex items-center gap-3">
              <button type="button" onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 rounded-full bg-green-deep px-5 py-3 text-sm font-bold text-white transition hover:bg-green-mid"><FileArrowUpIcon size={19} weight="duotone" className="text-gold" />Upload a record</button>
              <button type="button" onClick={() => void openNotifications()} aria-label={unreadNotifications ? `${unreadNotifications} new notifications` : 'Notifications'} aria-expanded={showNotifications} className="relative flex h-11 w-11 items-center justify-center rounded-full border border-green-deep/10 bg-white shadow-sm">
                <BellIcon size={22} weight="duotone" />
                {unreadNotifications > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold ring-2 ring-cream">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
              </button>
              {showNotifications && <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-2xl">
                  <p className="bg-green-deep px-5 py-4 font-semibold text-white">Notifications</p>
                  <div className="max-h-80 overflow-y-auto">{data.notifications.length ? data.notifications.map(item => <button key={item.id} type="button" onClick={() => { setActive(item.section); setShowNotifications(false) }} className={`block w-full border-b border-gray-100 p-4 text-left hover:bg-gray-50 ${item.read_at ? '' : 'bg-gold/10'}`}>
                    <p className="text-sm font-semibold">{item.title}</p>
                    {item.detail && <p className="mt-0.5 line-clamp-2 text-xs text-text-mid">{item.detail}</p>}
                    <p className="mt-1 text-[11px] text-text-mid">{dateTime.format(new Date(item.created_at))}</p>
                  </button>) : <p className="p-8 text-center text-sm text-text-mid">You’re all caught up.</p>}</div>
                </div>
              </>}
            </div>
          </header>
          {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          {active === 'overview' && <Overview data={data} unreadMessages={unreadMessages} goTo={setActive} />}
          {active === 'care_plan' && <CarePlans plans={data.carePlans} onChanged={() => load(true)} onError={setError} />}
          {active === 'documents' && <Documents documents={data.documents} onUpload={() => setShowUpload(true)} onError={setError} />}
          {active === 'messages' && <Messages messages={data.messages} onSent={message => setData(current => current && { ...current, messages: [...current.messages, message] })} />}
        </div>
      </main>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={() => { setShowUpload(false); load(true); setActive('documents') }} />}
      {showWelcome && <WelcomeModal firstName={patient.first_name} onClose={() => setShowWelcome(false)} />}
    </div>
  )
}

function Overview({ data, unreadMessages, goTo }: { data: PortalData; unreadMessages: number; goTo: (section: PortalSection) => void }) {
  const steps = data.carePlans.flatMap(plan => plan.status === 'active' ? plan.items : [])
  const remaining = steps.filter(item => item.status !== 'completed')
  const next = [...remaining].sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999')).slice(0, 4)
  return <div className="mt-8 space-y-6">
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
  async function open(id: string) {
    const response = await fetch(`/api/patient-portal/documents?id=${id}`)
    const result = await response.json().catch(() => ({}))
    if (response.ok) window.open(result.url, '_blank', 'noopener,noreferrer')
    else onError(result.error || 'Could not open this document.')
  }
  const shared = documents.filter(item => item.source !== 'patient')
  const mine = documents.filter(item => item.source === 'patient')
  const row = (item: any) => <button key={item.id} type="button" onClick={() => open(item.id)} className="flex w-full items-center gap-4 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4 text-left transition hover:border-green-mid">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-green-mid/10 text-green-mid"><FileTextIcon size={22} weight="duotone" /></span>
    <span className="min-w-0 flex-1"><span className="block truncate font-bold">{item.title}</span><span className="mt-1 block text-xs text-text-mid">{label(item.category)} · {date.format(new Date(item.shared_at || item.created_at))}</span></span>
    {item.source === 'patient' && <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${item.portal_status === 'reviewed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.portal_status === 'reviewed' ? 'Reviewed' : 'Awaiting review'}</span>}
  </button>
  return <div className="mt-8 grid gap-6 xl:grid-cols-2">
    <Card label="From your care team" title="Shared with you">{shared.length ? <div className="mt-5 space-y-3">{shared.map(row)}</div> : <Empty text="No documents have been shared with you yet." />}</Card>
    <Card label="From you" title="Your uploads" action={<button type="button" onClick={onUpload} className="inline-flex items-center gap-2 rounded-full border border-green-deep/15 px-4 py-2 text-sm font-bold hover:bg-green-deep/5"><FileArrowUpIcon size={18} weight="duotone" />Upload</button>}>{mine.length ? <div className="mt-5 space-y-3">{mine.map(row)}</div> : <Empty text="Upload lab results, scans or records from other clinics so your care team can review them." />}</Card>
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
            <p className="whitespace-pre-wrap">{item.body}</p>
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
    <form onSubmit={submit} className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl sm:p-8">
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
    <div className="w-full max-w-md rounded-[24px] bg-white p-8 text-center shadow-2xl">
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
