'use client'

// Medical outreach worklist: attendees who registered on an outreach form wait
// here for a health worker to log vital signs and sign off, then for a
// follow-up booking, which makes them an EMR patient (lib/outreach.ts,
// app/api/admin/emr/outreach, migration 044).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowSquareOutIcon, CheckCircleIcon, MagnifyingGlassIcon, WarningIcon, XIcon } from '@phosphor-icons/react'
import { Alert, Empty, Field, Loading, Panel, Status } from '@/components/admin/emr/ui'
import { formatAnswerText, type FormDefinition } from '@/lib/forms'
import {
  followUpWishLabels, outreachAlerts, outreachConcerns, outreachStatuses, splitName, vitalFields,
  type OutreachAttendee, type OutreachStatus, type OutreachVitals,
} from '@/lib/outreach'

const api = '/api/admin/emr/outreach'
type Outreach = { id: string; title: string; slug: string; status: string; created_at: string; counts: Record<OutreachStatus, number> }
type Loaded = { outreach: { id: string; title: string; definition: FormDefinition }; attendees: OutreachAttendee[] }
const time = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' })
const today = () => new Date().toISOString().slice(0, 10)
function age(dob: string | null) {
  if (!dob) return null
  const birth = new Date(`${dob}T00:00:00`); const now = new Date()
  return now.getFullYear() - birth.getFullYear() - (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()) ? 1 : 0)
}
async function send(body: Record<string, unknown>) {
  const response = await fetch(api, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Could not save.')
  return result as { attendee: OutreachAttendee; patient_id?: string; created_patient?: boolean }
}

export default function Outreaches({ onPatient }: { onPatient: (id: string) => void }) {
  const [outreaches, setOutreaches] = useState<Outreach[] | null>(null); const [formId, setFormId] = useState('')
  const [loaded, setLoaded] = useState<Loaded | null>(null); const [error, setError] = useState('')
  const [tab, setTab] = useState<OutreachStatus>('awaiting_vitals'); const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    fetch(api).then(async (r) => { const result = await r.json().catch(() => ({})); if (!r.ok) return setError(result.error || 'Could not load outreaches.')
      setOutreaches(result.outreaches || []); setFormId((id) => id || result.outreaches?.[0]?.id || '') })
  }, [])
  const load = useCallback(async () => {
    if (!formId) return
    const r = await fetch(`${api}?formId=${formId}`); const result = await r.json().catch(() => ({}))
    if (r.ok) { setLoaded(result); setError('') } else setError(result.error || 'Could not load attendees.')
  }, [formId])
  useEffect(() => { setLoaded(null); load() }, [load])
  // Keep the list fresh while registrations come in during the outreach.
  useEffect(() => { if (!formId) return; const timer = setInterval(load, 30000); return () => clearInterval(timer) }, [formId, load])

  const attendees = loaded?.attendees || []
  const counts = Object.fromEntries(outreachStatuses.map((s) => [s.value, attendees.filter((a) => a.status === s.value).length])) as Record<OutreachStatus, number>
  const term = search.trim().toLowerCase()
  const shown = attendees.filter((a) => a.status === tab && (!term || a.full_name.toLowerCase().includes(term) || (a.phone || '').replace(/\s/g, '').includes(term.replace(/\s/g, ''))))
  const open = attendees.find((a) => a.id === openId) || null
  const replace = (updated: OutreachAttendee) => setLoaded((l) => l && { ...l, attendees: l.attendees.map((a) => a.id === updated.id ? { ...a, ...updated } : a) })

  if (!outreaches && !error) return <Panel title="Outreaches"><Loading /></Panel>
  return <Panel title="Outreaches" subtitle="People who registered at a medical outreach. Log their vital signs, sign off, then book a follow-up to add them to the patient registry."
    action={outreaches && outreaches.length > 0 && <select aria-label="Outreach" value={formId} onChange={(e) => { setFormId(e.target.value); setTab('awaiting_vitals') }} className="input w-auto min-w-[260px]">{outreaches.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</select>}>
    {error && <Alert tone="error">{error}</Alert>}
    {outreaches && !outreaches.length && <div className="mt-6"><Empty text="No outreach forms yet. In Forms, edit a customer form and tick “Outreach registration”." /></div>}
    {formId && <>
      <div className="mt-6 flex flex-wrap items-center gap-2">{outreachStatuses.map((s) => <button key={s.value} type="button" onClick={() => setTab(s.value)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === s.value ? 'bg-green-deep text-white' : 'bg-gray-100 text-green-deep'}`}>{s.label} <span className="opacity-70">{counts[s.value]}</span></button>)}
        <label className="relative ml-auto"><MagnifyingGlassIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-mid" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone" className="input w-64 pl-9" /></label></div>
      {!loaded ? <Loading /> : !shown.length ? <div className="mt-6"><Empty text={term ? 'No attendees match that search.' : `No attendees are ${outreachStatuses.find((s) => s.value === tab)!.label.toLowerCase()}.`} /></div>
        : <div className="mt-5 grid gap-3 lg:grid-cols-2">{shown.map((a) => { const alerts = a.signed_at || a.recorded_at ? outreachAlerts(a) : []
          return <button key={a.id} type="button" onClick={() => setOpenId(a.id)} className="rounded-[18px] border border-green-deep/10 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-green-mid hover:shadow-md">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-lg font-bold text-green-deep">{a.full_name || 'No name given'}</p>
              <p className="text-sm text-text-mid">{[age(a.date_of_birth) !== null && `${age(a.date_of_birth)} yrs`, a.sex && a.sex !== 'unknown' && a.sex, a.phone].filter(Boolean).join(' · ') || 'No details'}</p></div><Status value={a.status} /></div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <span className="text-text-mid">Registered {time.format(new Date(a.created_at))}</span>
              {a.follow_up_wish && a.follow_up_wish !== 'not_now' && <span className="rounded-full bg-gold/40 px-2.5 py-0.5 text-green-deep">{followUpWishLabels[a.follow_up_wish]}</span>}
              {alerts.length > 0 && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-red-700">⚠ Needs attention</span>}
              {!!a.duplicates?.length && <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-blue-700">Possible existing patient</span>}
              {a.patient_mrn && <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">{a.patient_mrn}</span>}
            </div>
          </button> })}</div>}
    </>}
    {open && loaded && <AttendeeModal attendee={open} definition={loaded.outreach.definition} onClose={() => setOpenId(null)} onChanged={replace} onPatient={onPatient} />}
  </Panel>
}

function AttendeeModal({ attendee, definition, onClose, onChanged, onPatient }: { attendee: OutreachAttendee; definition: FormDefinition; onClose: () => void; onChanged: (a: OutreachAttendee) => void; onPatient: (id: string) => void }) {
  const [error, setError] = useState(''); const [saving, setSaving] = useState(''); const [booking, setBooking] = useState(false)
  const booked = attendee.status === 'booked'
  async function act(name: string, body: Record<string, unknown>) {
    setSaving(name); setError('')
    try { const result = await send({ id: attendee.id, ...body }); onChanged(result.attendee); return result } catch (e) { setError((e as Error).message); return null } finally { setSaving('') }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <div role="dialog" aria-modal="true" aria-label={attendee.full_name} className="max-h-[96vh] w-full max-w-5xl overflow-y-auto rounded-[24px] bg-cream p-5 shadow-2xl sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-green-mid">Outreach attendee</p><h3 className="mt-1 text-2xl font-bold text-green-deep">{attendee.full_name || 'No name given'}</h3>
        <p className="mt-1 text-sm text-text-mid">{[attendee.phone, attendee.email, attendee.date_of_birth && `Born ${attendee.date_of_birth} (${age(attendee.date_of_birth)} yrs)`, attendee.sex].filter(Boolean).join(' · ')}</p></div>
        <div className="flex items-center gap-2"><Status value={attendee.status} /><button type="button" onClick={onClose} aria-label="Close" className="icon-button"><XIcon size={18} /></button></div></div>
      {error && <Alert tone="error">{error}</Alert>}
      {booked && attendee.patient_id && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold text-emerald-800"><CheckCircleIcon size={20} weight="fill" className="mr-2 inline" />Follow-up booked{attendee.patient_mrn ? ` · ${attendee.patient_mrn}` : ''}. Vitals and intake are in the patient chart.</p><button type="button" onClick={() => onPatient(attendee.patient_id!)} className="primary">Open chart <ArrowSquareOutIcon size={16} /></button></div>}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <VitalsCard key={attendee.recorded_at || 'new'} attendee={attendee} saving={saving} disabled={booked} onSave={(v) => act('vitals', { action: 'record_vitals', ...v })} onSignOff={() => act('sign', { action: 'sign_off' })} />
        <div className="space-y-5">
          {!booked && attendee.signed_at && (booking
            ? <BookingCard attendee={attendee} saving={saving === 'book'} onCancel={() => setBooking(false)} onBook={async (b) => { const r = await act('book', { action: 'book_follow_up', ...b }); if (r) setBooking(false) }} />
            : <section className="rounded-[20px] border border-green-deep/10 bg-white p-5"><h4 className="font-bold text-green-deep">Next step</h4>
              {attendee.follow_up_wish && <p className="mt-1 text-sm text-text-mid">On the form: <strong>{followUpWishLabels[attendee.follow_up_wish]}</strong></p>}
              {outreachConcerns(attendee).length > 0 && <p className="mt-1 text-sm text-amber-800">Worth offering a follow-up: {outreachConcerns(attendee).join(', ').toLowerCase()}.</p>}
              <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setBooking(true)} className="primary">Book follow-up</button>
                {attendee.status !== 'no_follow_up' && <button type="button" disabled={!!saving} onClick={() => act('status', { action: 'set_status', status: 'no_follow_up' })} className="secondary">No follow-up</button>}
                {attendee.status === 'no_follow_up' && <button type="button" disabled={!!saving} onClick={() => act('status', { action: 'set_status', status: 'signed_off' })} className="secondary">Back to signed off</button>}</div></section>)}
          {!booked && !attendee.signed_at && attendee.status !== 'left' && <button type="button" disabled={!!saving} onClick={() => act('status', { action: 'set_status', status: 'left' })} className="secondary w-full">Mark as left before vitals</button>}
          {attendee.status === 'left' && <button type="button" disabled={!!saving} onClick={() => act('status', { action: 'set_status', status: 'awaiting_vitals' })} className="secondary w-full">They came back: awaiting vitals</button>}
          {!booked && <DetailsCard attendee={attendee} saving={saving === 'details'} onSave={(d) => act('details', { action: 'update_details', ...d })} />}
          <AnswersCard attendee={attendee} definition={definition} />
        </div>
      </div>
    </div>
  </div>
}

type VitalsForm = Record<string, string>
const toForm = (a: OutreachAttendee): VitalsForm => ({ ...Object.fromEntries(vitalFields.map((f) => [f.name, a[f.name] == null ? '' : String(a[f.name])])), glucose_unit: a.glucose_unit || 'mg/dL', glucose_timing: a.glucose_timing || '', vitals_notes: a.vitals_notes || '' })
const fromForm = (form: VitalsForm): OutreachVitals => ({ ...Object.fromEntries(vitalFields.map((f) => [f.name, form[f.name] === '' ? null : Number(form[f.name])])), glucose_unit: form.glucose_unit as OutreachVitals['glucose_unit'], glucose_timing: (form.glucose_timing || null) as OutreachVitals['glucose_timing'] })

function VitalsCard({ attendee, saving, disabled, onSave, onSignOff }: { attendee: OutreachAttendee; saving: string; disabled: boolean; onSave: (v: VitalsForm) => Promise<unknown>; onSignOff: () => void }) {
  const [form, setForm] = useState<VitalsForm>(() => toForm(attendee))
  const saved = useMemo(() => JSON.stringify(toForm(attendee)), [attendee])
  const dirty = JSON.stringify(form) !== saved
  const live = fromForm(form); const bmi = live.weight_kg && live.height_cm ? Math.round(live.weight_kg / (live.height_cm / 100) ** 2 * 10) / 10 : null
  const alerts = outreachAlerts(live)
  return <section className="rounded-[20px] border border-green-deep/10 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-lg font-bold text-green-deep">Vital signs</h4>{attendee.recorded_at && <p className="text-xs text-text-mid">Last saved {time.format(new Date(attendee.recorded_at))}{attendee.recorder ? ` by ${attendee.recorder}` : ''}</p>}</div>
    {alerts.length > 0 && <div role="alert" className="mt-4 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-800"><p className="flex items-center gap-2 font-bold"><WarningIcon size={20} weight="fill" />Alert the outreach lead now</p><ul className="mt-2 list-disc space-y-1 pl-6 text-sm">{alerts.map((a) => <li key={a}>{a}</li>)}</ul><p className="mt-2 text-xs">Also escalate straight away for chest pain, breathlessness or confusion.</p></div>}
    <form onSubmit={async (e) => { e.preventDefault(); await onSave(form) }} className="mt-4">
      <fieldset disabled={disabled} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {vitalFields.map((f) => <label key={f.name} className={`text-xs font-bold text-green-deep ${f.name === 'blood_glucose' ? 'col-span-2 sm:col-span-1' : ''}`}>{f.label}{f.unit && <span className="font-normal text-text-mid"> ({f.unit})</span>}{['systolic_bp', 'diastolic_bp', 'heart_rate'].includes(f.name) && <span className="text-red-600"> *</span>}
          <input type="number" inputMode="decimal" step={'integer' in f ? 1 : 'any'} min={f.min} max={f.max} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className="input mt-1 py-3 text-lg" /></label>)}
        <div className="col-span-2 flex flex-wrap items-end gap-3 sm:col-span-3">
          <label className="text-xs font-bold text-green-deep">Glucose unit<select value={form.glucose_unit} onChange={(e) => setForm({ ...form, glucose_unit: e.target.value })} className="input mt-1 py-3"><option>mg/dL</option><option>mmol/L</option></select></label>
          <label className="text-xs font-bold text-green-deep">Glucose taken<select value={form.glucose_timing} onChange={(e) => setForm({ ...form, glucose_timing: e.target.value })} className="input mt-1 py-3"><option value="">Not taken / unknown</option><option value="random">Random (after eating)</option><option value="fasting">Fasting (8+ hours)</option></select></label>
          <p className="pb-3 text-sm text-text-mid">BMI <strong className="text-green-deep">{bmi ?? '—'}</strong></p></div>
        <label className="col-span-2 text-xs font-bold text-green-deep sm:col-span-3">Notes<textarea rows={2} maxLength={2000} value={form.vitals_notes} onChange={(e) => setForm({ ...form, vitals_notes: e.target.value })} placeholder="e.g. second BP reading after 5 minutes rest, arm used" className="input mt-1" /></label>
      </fieldset>
      {!disabled && <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        {attendee.signed_at && <p className="mr-auto text-sm font-bold text-emerald-700"><CheckCircleIcon size={18} weight="fill" className="mr-1 inline" />Signed off {time.format(new Date(attendee.signed_at))}{attendee.signer ? ` by ${attendee.signer}` : ''}</p>}
        <button disabled={!dirty || !!saving} className="secondary">{saving === 'vitals' ? 'Saving…' : 'Save vitals'}</button>
        {!attendee.signed_at && <button type="button" disabled={dirty || !!saving || attendee.systolic_bp == null || attendee.diastolic_bp == null || attendee.heart_rate == null} onClick={onSignOff} title={dirty ? 'Save the vitals first' : undefined} className="primary">{saving === 'sign' ? 'Signing off…' : 'Sign off'}</button>}
      </div>}
      {!disabled && attendee.signed_at && dirty && <p className="mt-2 text-right text-xs text-text-mid">Saving changes after sign-off keeps the earlier readings in the audit log.</p>}
    </form>
  </section>
}

function BookingCard({ attendee, saving, onCancel, onBook }: { attendee: OutreachAttendee; saving: boolean; onCancel: () => void; onBook: (b: Record<string, unknown>) => void }) {
  const name = splitName(attendee.full_name)
  const [form, setForm] = useState({ consultation_type: attendee.follow_up_wish === 'telemedicine' ? 'telemedicine' : 'home-visit', appointment_date: '', appointment_time: '10:00', first_name: name.first, last_name: name.last, date_of_birth: attendee.date_of_birth || '', sex: attendee.sex || 'unknown', link_patient_id: '' })
  const linking = !!form.link_patient_id
  return <form onSubmit={(e) => { e.preventDefault(); onBook(form) }} className="rounded-[20px] border-2 border-green-deep bg-white p-5">
    <h4 className="text-lg font-bold text-green-deep">Book a follow-up</h4>
    <p className="mt-1 text-sm text-text-mid">This adds them to the patient registry, copies today&apos;s vital signs and their intake answers into the chart, and books the appointment.</p>
    <div className="mt-4 grid grid-cols-2 gap-2">{([['home-visit', 'Home visit'], ['telemedicine', 'Telehealth']] as const).map(([value, text]) => <label key={value} className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-bold ${form.consultation_type === value ? 'border-green-deep bg-green-50 text-green-deep' : 'text-text-mid'}`}><input type="radio" name="type" className="sr-only" checked={form.consultation_type === value} onChange={() => setForm({ ...form, consultation_type: value })} />{text}</label>)}</div>
    <div className="mt-3 grid grid-cols-2 gap-3"><Field label="Date" required><input type="date" required min={today()} value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} className="input" /></Field><Field label="Time" required><input type="time" required value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} className="input" /></Field></div>
    {!!attendee.duplicates?.length && <fieldset className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm"><legend className="px-1 font-bold text-blue-800">Possible existing patient</legend>
      <label className="flex items-center gap-2 py-1"><input type="radio" name="link" checked={!linking} onChange={() => setForm({ ...form, link_patient_id: '' })} />Create a new patient</label>
      {attendee.duplicates.map((p) => <label key={p.id} className="flex items-center gap-2 py-1"><input type="radio" name="link" checked={form.link_patient_id === p.id} onChange={() => setForm({ ...form, link_patient_id: p.id })} />Same person: {p.first_name} {p.last_name} · {p.mrn}{p.date_of_birth ? ` · born ${p.date_of_birth}` : ''}{p.phone ? ` · ${p.phone}` : ''}</label>)}</fieldset>}
    {!linking && <div className="mt-4 grid grid-cols-2 gap-3">
      <Field label="First name" required><input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input" /></Field>
      <Field label="Last name" required><input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input" /></Field>
      <Field label="Date of birth" required><input type="date" required max={today()} value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="input" /></Field>
      <Field label="Sex" required><select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} className="input"><option value="female">Female</option><option value="male">Male</option><option value="intersex">Intersex</option><option value="unknown">Unknown</option></select></Field></div>}
    <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className="secondary">Cancel</button><button disabled={saving} className="primary">{saving ? 'Booking…' : linking ? 'Link and book' : 'Create patient and book'}</button></div>
  </form>
}

function DetailsCard({ attendee, saving, onSave }: { attendee: OutreachAttendee; saving: boolean; onSave: (d: Record<string, unknown>) => Promise<unknown> }) {
  const initial = { full_name: attendee.full_name, phone: attendee.phone || '', email: attendee.email || '', date_of_birth: attendee.date_of_birth || '', sex: attendee.sex || 'unknown', address: attendee.address || '' }
  const [open, setOpen] = useState(false); const [form, setForm] = useState(initial)
  if (!open) return <button type="button" onClick={() => { setForm(initial); setOpen(true) }} className="text-sm font-bold text-green-mid underline">Correct their details</button>
  return <form onSubmit={async (e) => { e.preventDefault(); if (await onSave(form)) setOpen(false) }} className="rounded-[20px] border border-green-deep/10 bg-white p-5">
    <h4 className="font-bold text-green-deep">Their details</h4>
    <div className="mt-3 grid grid-cols-2 gap-3">
      <Field label="Full name" required wide><input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" /></Field>
      <Field label="Phone"><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></Field>
      <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></Field>
      <Field label="Date of birth"><input type="date" max={today()} value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="input" /></Field>
      <Field label="Sex"><select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} className="input"><option value="female">Female</option><option value="male">Male</option><option value="intersex">Intersex</option><option value="unknown">Unknown</option></select></Field>
      <Field label="Address" wide><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></Field></div>
    <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="secondary">Cancel</button><button disabled={saving} className="primary">{saving ? 'Saving…' : 'Save details'}</button></div>
  </form>
}

function AnswersCard({ attendee, definition }: { attendee: OutreachAttendee; definition: FormDefinition }) {
  const answers = attendee.answers || {}
  const groups = definition.questions.reduce<{ heading: string; rows: [string, string][] }[]>((all, q) => {
    if (q.type === 'section') return [...all, { heading: q.label, rows: [] }]
    if (answers[q.id] !== undefined && !q.patientField) all[all.length - 1].rows.push([q.label, formatAnswerText(answers[q.id], q)])
    return all
  }, [{ heading: 'Registration', rows: [] }]).filter((g) => g.rows.length)
  return <section className="rounded-[20px] border border-green-deep/10 bg-white p-5"><h4 className="font-bold text-green-deep">What they told us</h4>
    {!groups.length ? <p className="mt-2 text-sm text-text-mid">No answers recorded.</p> : groups.map((g) => <details key={g.heading} open className="mt-3 border-t pt-3 first-of-type:border-t-0"><summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-green-mid">{g.heading}</summary>
      <dl className="mt-2 space-y-2 text-sm">{g.rows.map(([q, a]) => <div key={q}><dt className="font-bold text-green-deep">{q}</dt><dd className="whitespace-pre-wrap text-text-mid">{a}</dd></div>)}</dl></details>)}
  </section>
}
