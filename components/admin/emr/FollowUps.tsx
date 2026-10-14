'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { PhoneCallIcon, PlusIcon, WhatsappLogoIcon, XIcon } from '@phosphor-icons/react'
import { contactChannels, contactOutcomes, daysUntilDue, dueLabel, lagosDate, reminderMessage, whatsappNumber } from '@/lib/follow-ups'
import { Alert, Empty, Field, Loading, Panel, fullName, label } from '@/components/admin/emr/ui'

const api = '/api/admin/emr'
const day = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })

type FollowUp = Record<string, any>
type FollowUpData = { followUps: FollowUp[]; staff: Record<string, string>; currentUserId: string }

const isOpen = (item: FollowUp) => item.status === 'pending' || item.status === 'in_progress'
const channelLabel = (value: string) => contactChannels.find(item => item.value === value)?.label || label(value)
const outcomeLabel = (value: string) => contactOutcomes.find(item => item.value === value)?.label || label(value)

function addDays(days: number) {
  const target = new Date(`${lagosDate()}T00:00:00Z`)
  target.setUTCDate(target.getUTCDate() + days)
  return target.toISOString().slice(0, 10)
}

function ago(value: string) {
  const days = -daysUntilDue(value)
  if (days <= 0) return 'today'
  return days === 1 ? 'yesterday' : `${days} days ago`
}

function dueTone(item: FollowUp) {
  if (!isOpen(item) || !item.due_at) return 'bg-gray-100 text-text-mid'
  const days = daysUntilDue(item.due_at)
  return days < 0 ? 'bg-red-50 text-red-700' : days === 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'
}

const quickDates = [['Tomorrow', 1], ['In 3 days', 3], ['In 1 week', 7], ['In 2 weeks', 14]] as const

export function FollowUpDateInput({ value, onChange, required }: { value: string; onChange: (value: string) => void; required?: boolean }) {
  const current = typeof value === 'string' ? value.slice(0, 10) : ''
  return <>
    <input type="date" className="input" value={current} onChange={event => onChange(event.target.value)} required={required} />
    <span className="mt-2 flex flex-wrap gap-1.5">{quickDates.map(([text, days]) => {
      const target = addDays(days)
      return <button key={text} type="button" onClick={() => onChange(target)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${current === target ? 'border-green-deep bg-green-deep text-white' : 'border-green-deep/15 text-green-deep hover:bg-green-deep/5'}`}>{text}</button>
    })}</span>
  </>
}

function useFollowUps(scope: 'open' | 'completed', patientId?: string) {
  const [data, setData] = useState<FollowUpData | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const params = new URLSearchParams({ resource: 'follow_ups', scope })
    if (patientId) params.set('patientId', patientId)
    const response = await fetch(`${api}?${params}`)
    const result = await response.json().catch(() => ({}))
    if (response.ok) { setData(result); setError('') } else setError(result.error || 'Follow-ups could not be loaded.')
  }, [scope, patientId])
  useEffect(() => { load() }, [load])
  return { data, error, reload: load }
}

function Toggle<T extends string>({ value, options, onChange }: { value: T; options: Array<[T, string]>; onChange: (value: T) => void }) {
  return <div className="flex gap-1 rounded-[14px] border border-green-deep/10 bg-white p-1">{options.map(([option, text]) => <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-[10px] px-3 py-2 text-sm font-bold ${value === option ? 'bg-green-deep text-white' : 'text-text-mid hover:bg-green-deep/5'}`}>{text}</button>)}</div>
}

// The team-wide worklist: everyone the team needs to reach, soonest first.
export default function FollowUps({ onPatient }: { onPatient: (id: string) => void }) {
  const [scope, setScope] = useState<'open' | 'completed'>('open')
  const [whose, setWhose] = useState<'everyone' | 'mine'>('everyone')
  const { data, error, reload } = useFollowUps(scope)
  const items = useMemo(() => (data?.followUps || []).filter(item => whose === 'everyone' || item.assigned_to === data?.currentUserId), [data, whose])
  const groups = useMemo(() => {
    const today = lagosDate()
    const result: Record<'overdue' | 'today' | 'upcoming' | 'undated', FollowUp[]> = { overdue: [], today: [], upcoming: [], undated: [] }
    for (const item of items) {
      if (!item.due_at) { result.undated.push(item); continue }
      const days = daysUntilDue(item.due_at, today)
      result[days < 0 ? 'overdue' : days === 0 ? 'today' : 'upcoming'].push(item)
    }
    return result
  }, [items])
  const sections: Array<[keyof typeof groups, string]> = [['overdue', 'Overdue'], ['today', 'Due today'], ['upcoming', 'Upcoming'], ['undated', 'No due date']]

  return <Panel title="Follow-ups" subtitle="Patients the team needs to reach, and what has already been tried." action={<div className="flex flex-wrap gap-2"><Toggle value={whose} onChange={setWhose} options={[['everyone', 'Everyone'], ['mine', 'Assigned to me']]} /><Toggle value={scope} onChange={setScope} options={[['open', 'Open'], ['completed', 'Closed']]} /></div>}>
    {error && <Alert tone="error">{error}</Alert>}
    {!data ? <Loading /> : scope === 'open' ? <>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {([['Overdue', groups.overdue.length, 'text-red-700'], ['Due today', groups.today.length, 'text-amber-700'], ['Upcoming', groups.upcoming.length, 'text-green-deep']] as const).map(([text, count, tone]) => <div key={text} className="rounded-[14px] bg-[#FCFFF0] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-text-mid/60">{text}</p><p className={`mt-2 text-2xl font-bold ${tone}`}>{count}</p></div>)}
      </div>
      {sections.filter(([key]) => groups[key].length).map(([key, title]) => <section key={key} className="mt-7">
        <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-green-mid">{title} · {groups[key].length}</h4>
        <div className="mt-3 space-y-3">{groups[key].map(item => <FollowUpCard key={item.id} item={item} data={data} showPatient onPatient={onPatient} onChanged={reload} />)}</div>
      </section>)}
      {!items.length && <Empty text={whose === 'mine' ? 'Nothing assigned to you needs following up.' : 'No open follow-ups. Add one from a clinical note or a patient record.'} />}
    </> : <div className="mt-6 space-y-3">
      {items.map(item => <FollowUpCard key={item.id} item={item} data={data} showPatient onPatient={onPatient} onChanged={reload} />)}
      {!items.length && <Empty text="No follow-ups closed in the last 30 days." />}
    </div>}
  </Panel>
}

// One patient's follow-ups, for the patient record.
export function FollowUpList({ patientId, onChanged, onCreate }: { patientId: string; onChanged: () => void; onCreate: () => void }) {
  const open = useFollowUps('open', patientId)
  const closed = useFollowUps('completed', patientId)
  const refresh = () => { open.reload(); closed.reload(); onChanged() }
  return <Panel title="Follow-ups" subtitle="What the team needs to chase this patient about." action={<button onClick={onCreate} className="primary"><PlusIcon size={18} weight="bold" />Add follow-up</button>}>
    {(open.error || closed.error) && <Alert tone="error">{open.error || closed.error}</Alert>}
    {!open.data || !closed.data ? <Loading /> : <>
      <div className="mt-5 space-y-3">{open.data.followUps.map(item => <FollowUpCard key={item.id} item={item} data={open.data!} onChanged={refresh} />)}{!open.data.followUps.length && <Empty text="No open follow-ups for this patient." />}</div>
      {closed.data.followUps.length > 0 && <section className="mt-7"><h4 className="text-xs font-bold uppercase tracking-[0.12em] text-green-mid">Closed in the last 30 days</h4><div className="mt-3 space-y-3">{closed.data.followUps.map(item => <FollowUpCard key={item.id} item={item} data={closed.data!} onChanged={refresh} />)}</div></section>}
    </>}
  </Panel>
}

// The follow-ups raised from a note, shown under it.
export function NoteFollowUp({ tasks }: { tasks: FollowUp[] }) {
  if (!tasks.length) return null
  return <div className="mt-3 flex flex-wrap gap-2">{tasks.map(task => <span key={task.id} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${dueTone(task)}`}><PhoneCallIcon size={14} weight="fill" />Follow-up: {isOpen(task) ? dueLabel(task.due_at) : label(task.status)}</span>)}</div>
}

function FollowUpCard({ item, data, showPatient, onPatient, onChanged }: { item: FollowUp; data: FollowUpData; showPatient?: boolean; onPatient?: (id: string) => void; onChanged: () => void }) {
  const [modal, setModal] = useState<{ kind: 'contact'; channel?: string } | { kind: 'done' | 'cancel' } | null>(null)
  const [history, setHistory] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const open = isOpen(item)
  const patient = item.patient || {}
  const contacts = [...(item.contacts || [])].sort((a, b) => String(b.contacted_at).localeCompare(String(a.contacted_at)))
  const last = contacts[0]
  const whatsapp = whatsappNumber(patient.phone)
  const assigned = !item.assigned_to ? 'Unassigned' : item.assigned_to === data.currentUserId ? 'Assigned to you' : `Assigned to ${data.staff[item.assigned_to] || 'a colleague'}`

  async function update(changes: Record<string, unknown>) {
    setBusy(true); setError('')
    const response = await fetch(api, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'tasks', id: item.id, ...changes }) })
    const result = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) { setError(result.error || 'The follow-up could not be updated.'); return false }
    onChanged()
    return true
  }

  return <article className="rounded-[16px] border border-green-deep/10 bg-[#FCFFF0] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {showPatient && <button type="button" onClick={() => onPatient?.(patient.id)} className="text-left"><span className="text-xs font-bold text-green-mid">{patient.mrn}</span> <span className="font-bold hover:underline">{fullName(patient)}</span></button>}
        <p className={showPatient ? 'mt-1 text-sm font-semibold text-text-dark' : 'font-bold'}>{item.title}</p>
        <p className="mt-1 text-xs text-text-mid">{[label(item.task_type), item.priority !== 'routine' && label(item.priority), open && assigned].filter(Boolean).join(' · ')}</p>
      </div>
      <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${dueTone(item)}`}>{open ? dueLabel(item.due_at) : `${label(item.status)}${item.completed_at ? ` ${day.format(new Date(item.completed_at))}` : ''}`}</span>
    </div>
    {item.note && <p className="mt-3 line-clamp-2 rounded-[12px] bg-white p-3 text-sm leading-6 text-text-mid"><span className="font-bold text-green-deep">From the {label(item.note.note_type).toLowerCase().replace("follow up", "follow-up")} note of {day.format(new Date(item.note.created_at))}:</span> {item.note.content}</p>}
    <p className="mt-3 text-sm text-text-mid">{last ? `Last contact ${ago(last.contacted_at)}: ${channelLabel(last.channel)}, ${outcomeLabel(last.outcome).toLowerCase()}${last.contacted_by ? `, by ${data.staff[last.contacted_by] || 'a colleague'}` : ''}${contacts.length > 1 ? ` · ${contacts.length} attempts` : ''}` : open ? 'Not contacted yet' : 'No contact was logged'}{showPatient && open && patient.phone ? ` · ${patient.phone}` : ''}</p>
    {!open && item.outcome && <p className="mt-2 text-sm"><span className="font-bold">Outcome:</span> {item.outcome}</p>}
    {error && <Alert tone="error">{error}</Alert>}
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {open && patient.phone && <a href={`tel:${patient.phone}`} onClick={() => setModal({ kind: 'contact', channel: 'call' })} className="secondary"><PhoneCallIcon size={16} weight="duotone" />Call</a>}
      {open && whatsapp && <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(reminderMessage(patient.first_name, item.task_type))}`} target="_blank" rel="noopener noreferrer" onClick={() => setModal({ kind: 'contact', channel: 'whatsapp' })} className="secondary"><WhatsappLogoIcon size={16} weight="duotone" />WhatsApp</a>}
      {open && <button type="button" onClick={() => setModal({ kind: 'contact' })} className="secondary">Log contact</button>}
      {open && <button type="button" onClick={() => setModal({ kind: 'done' })} className="primary">Mark done</button>}
      {open && item.assigned_to !== data.currentUserId && <button type="button" disabled={busy} onClick={() => update({ assigned_to: data.currentUserId })} className="secondary disabled:opacity-50">Assign to me</button>}
      {open && <button type="button" onClick={() => setModal({ kind: 'cancel' })} className="secondary text-red-700">Cancel</button>}
      {!open && <button type="button" disabled={busy} onClick={() => update({ status: 'pending' })} className="secondary disabled:opacity-50">Reopen</button>}
      {contacts.length > 0 && <button type="button" onClick={() => setHistory(value => !value)} aria-expanded={history} className="px-2 text-xs font-bold text-green-mid hover:underline">{history ? 'Hide contact history' : 'Contact history'}</button>}
    </div>
    {history && <ol className="mt-3 space-y-2 border-t border-green-deep/10 pt-3">{contacts.map(contact => <li key={contact.id} className="rounded-[12px] bg-white p-3 text-sm">
      <p className="font-semibold">{channelLabel(contact.channel)} · {outcomeLabel(contact.outcome)}</p>
      <p className="mt-0.5 text-xs text-text-mid">{day.format(new Date(contact.contacted_at))}{contact.contacted_by ? ` · ${data.staff[contact.contacted_by] || 'A colleague'}` : ''}{contact.rescheduled_to ? ` · moved to ${day.format(new Date(contact.rescheduled_to))}` : ''}</p>
      {contact.notes && <p className="mt-1 whitespace-pre-wrap text-text-mid">{contact.notes}</p>}
    </li>)}</ol>}
    {modal?.kind === 'contact' && <LogContactModal item={item} channel={modal.channel} onClose={() => setModal(null)} onSaved={() => { setModal(null); onChanged() }} />}
    {(modal?.kind === 'done' || modal?.kind === 'cancel') && <CloseModal kind={modal.kind} item={item} onClose={() => setModal(null)} onConfirm={async outcome => { if (await update({ status: modal.kind === 'done' ? 'completed' : 'cancelled', outcome })) setModal(null) }} />}
  </article>
}

function Modal({ title, item, onClose, children }: { title: string; item: FollowUp; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[26px] bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-green-deep/10 bg-white px-6 py-5">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-green-mid">Follow-up</p><h3 className="mt-1 text-2xl font-bold">{title}</h3><p className="mt-1 text-sm text-text-mid">{[item.patient && fullName(item.patient), item.title].filter(Boolean).join(' · ')}</p></div>
        <button type="button" onClick={onClose} aria-label="Close" className="icon-button shrink-0"><XIcon /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
}

function LogContactModal({ item, channel, onClose, onSaved }: { item: FollowUp; channel?: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ channel: channel || '', outcome: '', notes: '', rescheduled_to: '', done: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setError('')
    const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'task_contacts', task_id: item.id, channel: form.channel, outcome: form.outcome, notes: form.notes, rescheduled_to: form.done ? '' : form.rescheduled_to }) })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'The contact could not be logged.'); setSaving(false); return }
    if (form.done) {
      const closing = await fetch(api, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'tasks', id: item.id, status: 'completed', outcome: form.notes || outcomeLabel(form.outcome) }) })
      if (!closing.ok) window.alert('The contact was logged, but the follow-up could not be closed. Use "Mark done" to close it.')
    }
    onSaved()
  }

  return <Modal title="Log contact" item={item} onClose={onClose}>
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <Field label="How" required><select className="input" required value={form.channel} onChange={event => setForm({ ...form, channel: event.target.value })}><option value="">Select…</option>{contactChannels.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
      <Field label="What happened" required><select className="input" required value={form.outcome} onChange={event => setForm({ ...form, outcome: event.target.value })}><option value="">Select…</option>{contactOutcomes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
      <Field label="Notes" wide><textarea className="input min-h-24" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="For example: will do the test on Friday" /></Field>
      <label className="flex items-start gap-3 rounded-[14px] border border-green-deep/10 bg-[#FCFFF0] p-4 text-sm font-semibold sm:col-span-2"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-green-deep" checked={form.done} onChange={event => setForm({ ...form, done: event.target.checked })} /><span>This follow-up is done<span className="block text-xs font-normal text-text-mid">For example, the patient has now done the investigation.</span></span></label>
      {!form.done && <Field label="Follow up again on" wide><FollowUpDateInput value={form.rescheduled_to} onChange={value => setForm({ ...form, rescheduled_to: value })} /><span className="mt-2 block text-xs font-normal text-text-mid">Leave empty to keep the current date ({dueLabel(item.due_at).toLowerCase()}).</span></Field>}
      {error && <div className="sm:col-span-2"><Alert tone="error">{error}</Alert></div>}
      <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={onClose} className="secondary">Cancel</button><button disabled={saving} className="primary disabled:opacity-50">{saving ? 'Saving…' : 'Save contact'}</button></div>
    </form>
  </Modal>
}

function CloseModal({ kind, item, onClose, onConfirm }: { kind: 'done' | 'cancel'; item: FollowUp; onClose: () => void; onConfirm: (outcome: string) => Promise<void> }) {
  const [outcome, setOutcome] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    await onConfirm(outcome)
    setSaving(false)
  }
  return <Modal title={kind === 'done' ? 'Mark follow-up done' : 'Cancel follow-up'} item={item} onClose={onClose}>
    <form onSubmit={submit}>
      <Field label={kind === 'done' ? 'Outcome' : 'Why is it being cancelled?'} required={kind === 'cancel'}><textarea className="input min-h-24" required={kind === 'cancel'} value={outcome} onChange={event => setOutcome(event.target.value)} placeholder={kind === 'done' ? 'For example: results received and reviewed (optional)' : 'For example: patient chose not to do the test'} /></Field>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="secondary">Back</button><button disabled={saving} className={kind === 'done' ? 'primary disabled:opacity-50' : 'secondary text-red-700 disabled:opacity-50'}>{saving ? 'Saving…' : kind === 'done' ? 'Mark done' : 'Cancel follow-up'}</button></div>
    </form>
  </Modal>
}
