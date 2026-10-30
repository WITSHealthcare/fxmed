'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CheckCircleIcon, EnvelopeSimpleIcon, EyeIcon, EyeSlashIcon, FileTextIcon,
  PaperPlaneRightIcon, ProhibitIcon, SealCheckIcon, UserCircleCheckIcon,
} from '@phosphor-icons/react'
import { Alert, Empty, Loading, Panel, Status, label } from '@/components/admin/emr/ui'

type Chart = Record<string, any>
type PortalState = { account: any | null; messages: any[] }

const api = '/api/admin/patient-portal'
const date = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTime = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

// The clinic side of a patient's portal: who has access, the secure message
// thread, and which care plans and documents the patient can see.
export default function PatientPortalPanel({ chart, onChanged }: { chart: Chart; onChanged: () => void }) {
  const patient = chart.patient
  const [state, setState] = useState<PortalState | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const threadEnd = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const response = await fetch(`${api}?patientId=${patient.id}`, { cache: 'no-store' })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) return setError(result.error || 'Could not load the patient portal.')
    setState(result)
    // Opening the thread is reading it, which clears the bell.
    if (result.messages?.some((item: any) => item.sender === 'patient' && item.status === 'unread')) {
      void post({ action: 'read_messages', patient_id: patient.id }, { quiet: true })
    }
  }, [patient.id])

  useEffect(() => { load() }, [load])
  useEffect(() => { threadEnd.current?.scrollIntoView({ block: 'nearest' }) }, [state?.messages.length])

  async function post(payload: Record<string, unknown>, options: { quiet?: boolean; key?: string } = {}) {
    if (!options.quiet) { setBusy(options.key || String(payload.action)); setError(''); setNotice('') }
    try {
      const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) { if (!options.quiet) setError(result.error || 'The change could not be saved.'); return null }
      if (result.message && typeof result.message === 'string') setNotice(result.message)
      return result
    } finally {
      if (!options.quiet) setBusy(null)
    }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.trim()) return
    const result = await post({ action: 'message', patient_id: patient.id, body: draft })
    if (result) { setDraft(''); setState(current => current && { ...current, messages: [...current.messages, result.message] }) }
  }

  async function changeAccess(action: 'invite' | 'suspend' | 'restore') {
    const result = action === 'invite'
      ? await post({ action: 'invite', patient_id: patient.id }, { key: 'access' })
      : await post({ action: 'set_status', patient_id: patient.id, status: action === 'suspend' ? 'suspended' : 'active' }, { key: 'access' })
    if (result) load()
  }

  async function share(kind: 'document' | 'care_plan', id: string, shared: boolean) {
    const result = await post({ action: kind === 'document' ? 'share_document' : 'share_care_plan', id, shared }, { key: id })
    if (result) onChanged()
  }

  async function review(id: string) {
    const result = await post({ action: 'review_upload', id }, { key: id })
    if (result) onChanged()
  }

  async function openDocument(id: string) {
    const response = await fetch(`/api/admin/emr?resource=document_url&id=${id}`)
    const result = await response.json()
    if (response.ok) window.open(result.url, '_blank', 'noopener,noreferrer')
  }

  if (!state) return error ? <Alert tone="error">{error}</Alert> : <Loading />
  const account = state.account
  const clinicDocuments = (chart.documents || []).filter((item: any) => item.source !== 'patient')
  const patientUploads = (chart.documents || []).filter((item: any) => item.source === 'patient')

  return <div className="space-y-6">
    {error && <Alert tone="error">{error}</Alert>}
    {notice && <Alert tone="info">{notice}</Alert>}

    <Panel title="Portal access" subtitle="Patients sign in at /patient-portal to see what you share, message the care team and upload records." action={account
      ? <div className="flex flex-wrap gap-2">
          <button disabled={busy === 'access'} onClick={() => changeAccess('invite')} className="secondary disabled:opacity-40"><EnvelopeSimpleIcon size={18} weight="duotone" />Resend sign-in link</button>
          {account.status === 'suspended'
            ? <button disabled={busy === 'access'} onClick={() => changeAccess('restore')} className="primary disabled:opacity-40"><UserCircleCheckIcon size={18} weight="duotone" />Restore access</button>
            : <button disabled={busy === 'access'} onClick={() => changeAccess('suspend')} className="secondary disabled:opacity-40"><ProhibitIcon size={18} weight="duotone" />Suspend access</button>}
        </div>
      : <button disabled={busy === 'access' || !patient.email} title={patient.email ? undefined : 'Add an email address to the patient record first'} onClick={() => changeAccess('invite')} className="primary disabled:opacity-40"><EnvelopeSimpleIcon size={18} weight="duotone" />{busy === 'access' ? 'Sending invitation…' : 'Invite to patient portal'}</button>}>
      {account
        ? <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <Fact title="Status" value={<Status value={account.status} />} note={account.status === 'invited' ? 'Has not set a password yet' : account.activated_at ? `Activated ${date.format(new Date(account.activated_at))}` : undefined} />
            <Fact title="Sign-in email" value={account.email || '—'} />
            <Fact title="Invited" value={date.format(new Date(account.invited_at))} />
            <Fact title="Last seen" value={account.last_seen_at ? dateTime.format(new Date(account.last_seen_at)) : 'Not yet'} />
          </div>
        : <p className="mt-5 rounded-[14px] bg-[#FCFFF0] px-4 py-3 text-sm text-text-mid">{patient.email
            ? <>An invitation will be emailed to <strong className="text-green-deep">{patient.email}</strong>. The patient creates a password from it.</>
            : 'This patient has no email address on record. Add one with Edit details on the Overview tab, then invite them.'}</p>}
    </Panel>

    <Panel title="Messages" subtitle={`Secure conversation with ${patient.first_name}. Replies appear in their portal and notify them.`}>
      <div className="mt-5 max-h-[26rem] space-y-3 overflow-y-auto rounded-[16px] bg-[#FCFFF0] p-4">
        {state.messages.length ? state.messages.map(item => <div key={item.id} className={`flex ${item.sender === 'clinic' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] rounded-[16px] px-4 py-3 text-sm leading-6 ${item.sender === 'clinic' ? 'bg-green-deep text-white' : 'border border-green-deep/10 bg-white'}`}>
            <p className="whitespace-pre-wrap">{item.body}</p>
            <p className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${item.sender === 'clinic' ? 'text-white/55' : 'text-green-mid/70'}`}>{item.sender_name || (item.sender === 'clinic' ? 'Care team' : 'Patient')} · {dateTime.format(new Date(item.created_at))}{item.sender === 'clinic' && item.status === 'read' ? ' · Read' : ''}</p>
          </div>
        </div>) : <Empty text="No messages yet." />}
        <div ref={threadEnd} />
      </div>
      <form onSubmit={send} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <textarea value={draft} onChange={event => setDraft(event.target.value)} rows={2} maxLength={4000} placeholder={account ? 'Write to the patient…' : 'Invite the patient to the portal so they can read this.'} className="input min-h-[3.25rem] flex-1" />
        <button type="submit" disabled={busy === 'message' || !draft.trim()} className="primary justify-center disabled:opacity-40"><PaperPlaneRightIcon size={18} weight="fill" />Send</button>
      </form>
    </Panel>

    <Panel title="Shared care plans" subtitle="Shared plans appear in the patient’s portal, where they can tick off steps as they complete them.">
      <div className="mt-5 space-y-3">{chart.carePlans.length ? chart.carePlans.map((plan: any) => {
        const items = plan.items || []
        const done = items.filter((item: any) => item.status === 'completed').length
        const byPatient = items.filter((item: any) => item.completed_by_patient).length
        return <div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4">
          <div className="min-w-0">
            <p className="font-bold">{plan.title}</p>
            <p className="mt-1 text-xs text-text-mid">{done}/{items.length} steps complete{byPatient ? ` · ${byPatient} ticked off by the patient` : ''}{plan.shared_at ? ` · shared ${date.format(new Date(plan.shared_at))}` : ''}</p>
          </div>
          <div className="flex items-center gap-2"><Status value={plan.status} /><ShareButton shared={plan.shared_with_patient} disabled={busy === plan.id || (plan.status === 'draft' && !plan.shared_with_patient)} title={plan.status === 'draft' ? 'Activate a draft plan before sharing it' : undefined} onClick={() => share('care_plan', plan.id, !plan.shared_with_patient)} /></div>
        </div>
      }) : <Empty text="No care plans yet. Create one on the Care Plans tab, then share it here." />}</div>
    </Panel>

    <Panel title="Uploads from the patient" subtitle={`${patientUploads.filter((item: any) => item.portal_status === 'new').length} awaiting review`}>
      <div className="mt-5 space-y-3">{patientUploads.length ? patientUploads.map((item: any) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4">
        <button onClick={() => openDocument(item.id)} className="flex min-w-0 items-center gap-3 text-left"><FileTextIcon size={24} weight="duotone" className="shrink-0 text-green-mid" /><span className="min-w-0"><span className="block font-bold hover:underline">{item.title}</span><span className="mt-1 block text-xs text-text-mid">{label(item.category)} · {date.format(new Date(item.created_at))}{item.notes ? ` · ${item.notes}` : ''}</span></span></button>
        {item.portal_status === 'new'
          ? <button disabled={busy === item.id} onClick={() => review(item.id)} className="secondary disabled:opacity-40"><SealCheckIcon size={18} weight="duotone" />Mark reviewed</button>
          : <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-mid"><CheckCircleIcon size={16} weight="fill" />Reviewed</span>}
      </div>) : <Empty text="The patient has not uploaded anything." />}</div>
    </Panel>

    <Panel title="Shared documents" subtitle="Choose which clinical documents the patient can open from their portal.">
      <div className="mt-5 space-y-3">{clinicDocuments.length ? clinicDocuments.map((item: any) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4">
        <button onClick={() => openDocument(item.id)} className="flex min-w-0 items-center gap-3 text-left"><FileTextIcon size={24} weight="duotone" className="shrink-0 text-green-mid" /><span className="min-w-0"><span className="block font-bold hover:underline">{item.title}</span><span className="mt-1 block text-xs text-text-mid">{label(item.category)} · {date.format(new Date(item.created_at))}</span></span></button>
        <ShareButton shared={item.shared_with_patient} disabled={busy === item.id} onClick={() => share('document', item.id, !item.shared_with_patient)} />
      </div>) : <Empty text="No clinical documents uploaded yet." />}</div>
    </Panel>
  </div>
}

function ShareButton({ shared, disabled, title, onClick }: { shared: boolean; disabled?: boolean; title?: string; onClick: () => void }) {
  return <button disabled={disabled} title={title} onClick={onClick} className={`${shared ? 'secondary' : 'primary'} disabled:opacity-40`}>{shared ? <><EyeSlashIcon size={18} weight="duotone" />Stop sharing</> : <><EyeIcon size={18} weight="duotone" />Share with patient</>}</button>
}

function Fact({ title, value, note }: { title: string; value: React.ReactNode; note?: string }) {
  return <div className="rounded-[14px] bg-[#FCFFF0] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-mid">{title}</p><div className="mt-2 break-words text-sm font-bold">{value}</div>{note && <p className="mt-1 text-xs text-text-mid">{note}</p>}</div>
}
