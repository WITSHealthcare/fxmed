'use client'

import { useEffect, useState, type FormEvent } from 'react'

type Contact = { id: string; full_name: string; phone: string | null; email: string | null }
type Interaction = { id: string; kind: string; occurred_at: string; notes: string }
type Prospect = { id: string; contact_id?: string | null; kind: string; name: string; contact_person: string; phone: string; email: string; owner: string; status: string; next_follow_up: string | null; next_action: string; interactions: Interaction[] }
const blank = { kind: 'individual', name: '', contact_person: '', phone: '', email: '', owner: '', status: 'new', next_follow_up: '', next_action: '' }
const statuses = ['new', 'in_discussion', 'proposal_sent', 'won', 'lost']
const label = (s: string) => s.replace(/_/g, ' ')
const format = (s: string) => new Date(s).toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' })
// Inputs and reminders consistently use Lagos time, irrespective of the device timezone.
const inputDate = (s: string) => new Date(new Date(s).getTime() + 3600000).toISOString().slice(0, 16)
const iso = (s: string) => s ? new Date(`${s}:00+01:00`).toISOString() : null
const active = (p: Prospect) => !['won', 'lost'].includes(p.status)

export default function ProspectFollowUps() {
  const [contactPicker, setContactPicker] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactError, setContactError] = useState('')
  const [contactId, setContactId] = useState<string | null>(null)
  useEffect(() => {
    if (!contactPicker) return
    const controller = new AbortController()
    setContactsLoading(true); setContactError('')
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/crm/prospects?resource=contacts&search=${encodeURIComponent(contactSearch)}`, { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load contacts.')
        setContacts(data.contacts)
      } catch (e) {
        if (!controller.signal.aborted) setContactError(e instanceof Error ? e.message : 'Unable to load contacts.')
      } finally { if (!controller.signal.aborted) setContactsLoading(false) }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [contactPicker, contactSearch])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [kind, setKind] = useState('individual')
  const [search, setSearch] = useState('')
  const [dueOnly, setDueOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer) }, [])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(blank)
  const [interaction, setInteraction] = useState({ kind: 'call', occurred_at: inputDate(new Date().toISOString()), notes: '' })
  const prospect = prospects.find(p => p.id === selected)
  async function load() {
    const response = await fetch('/api/crm/prospects')
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    setProspects(data.prospects)
  }
  useEffect(() => { load().catch(e => setError(e.message)).finally(() => setLoading(false)) }, [])
  async function save(event: FormEvent, resource: 'prospect' | 'interaction') {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      const body = resource === 'interaction' ? { ...interaction, resource, prospect_id: selected, occurred_at: iso(interaction.occurred_at) } : { ...form, contact_id: contactId, id: selected, next_follow_up: iso(form.next_follow_up) }
      const response = await fetch('/api/crm/prospects', { method: resource === 'prospect' && selected ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      if (resource === 'prospect') { setSelected(data.prospect.id); setKind(data.prospect.kind); setEditing(false); setSearch(''); setDueOnly(false) }
      else setInteraction({ kind: 'call', occurred_at: inputDate(new Date().toISOString()), notes: '' })
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save.') }
    finally { setSaving(false) }
  }
  function edit(p?: Prospect) {
    setContactPicker(false)
    setContactId(p?.contact_id || null)
    setSelected(p?.id || null)
    setForm(p ? { ...p, next_follow_up: p.next_follow_up ? inputDate(p.next_follow_up) : '' } : { ...blank, kind })
    setEditing(true)
  }
  const due = (p: Prospect) => active(p) && !!p.next_follow_up && new Date(p.next_follow_up).getTime() <= now
  const visible = prospects.filter(p => p.kind === kind && (!dueOnly || due(p)) && `${p.name} ${p.contact_person} ${p.phone} ${p.email} ${p.owner}`.toLowerCase().includes(search.toLowerCase())).sort((a,b) => (active(a) && a.next_follow_up ? Date.parse(a.next_follow_up) : Infinity) - (active(b) && b.next_follow_up ? Date.parse(b.next_follow_up) : Infinity))
  const field = (name: keyof typeof blank, title: string, type = 'text') => <label className="block text-sm font-medium">{title}<input className="mt-1 w-full rounded-lg border p-3" type={type} required={name === 'name'} maxLength={name === 'next_action' ? 2000 : 200} value={form[name]} onChange={e => setForm({ ...form, [name]: e.target.value })} /></label>
  return <section className="space-y-5 rounded-2xl border bg-white p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold text-green-deep">Prospect follow-ups</h2><p className="mt-1 text-sm text-text-mid">Keep every conversation and the next step together. All times are Lagos time.</p></div><div className="flex flex-wrap gap-2"><button className="rounded-lg border border-green-deep px-4 py-3 text-green-deep" onClick={() => { setContactPicker(true); setEditing(false); setContactSearch('') }}>Add from contacts</button><button className="rounded-lg bg-green-deep px-4 py-3 text-white" onClick={() => edit()}>+ Add prospect</button></div></div>
    {contactPicker && <div className="space-y-3 rounded-xl border bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3"><h3 className="font-bold">Choose an existing contact</h3><button onClick={() => setContactPicker(false)} className="underline">Close</button></div>
      <input aria-label="Search existing contacts" placeholder="Search by name, phone or email…" className="w-full rounded-lg border p-3" value={contactSearch} onChange={e => setContactSearch(e.target.value)} />
      <p className="text-xs text-text-mid">Showing up to 50 contacts. Search to narrow the list.</p>
      {contactError ? <p role="alert" className="text-red-700">{contactError}</p> : contactsLoading ? <p role="status">Loading contacts…</p> : <div className="max-h-72 space-y-2 overflow-y-auto">{!contacts.length && <p>No contacts found.</p>}{contacts.map(contact => {
        const existing = prospects.find(p => p.contact_id === contact.id)
        return <button key={contact.id} className="w-full rounded-lg border bg-white p-3 text-left" onClick={() => {
          if (existing) { setSelected(existing.id); setKind(existing.kind); setSearch(''); setDueOnly(false); setEditing(false); setContactPicker(false); return }
          edit(); setContactId(contact.id); setForm({ ...blank, name: contact.full_name, phone: contact.phone || '', email: contact.email || '' })
        }}><span className="block font-semibold">{contact.full_name}</span><span className="block break-words text-sm text-text-mid">{[contact.phone, contact.email].filter(Boolean).join(' · ')}</span><span className="text-xs text-green-mid">{existing ? 'Already a prospect · View follow-ups' : 'Select contact'}</span></button>
      })}</div>}
    </div>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error} <button className="underline" onClick={() => { setError(''); load().catch(e => setError(e.message)) }}>Retry</button></p>}
    <div className="flex flex-wrap gap-3">{['individual','corporate'].map(k => <button key={k} className={`rounded-lg px-4 py-2 capitalize ${kind === k ? 'bg-green-deep text-white' : 'bg-gray-100'}`} onClick={() => { setKind(k); setSelected(null); setEditing(false) }}>{k === 'individual' ? 'Individuals' : 'Corporate'} ({prospects.filter(p => p.kind === k).length})</button>)}<button className={`rounded-lg border px-4 py-2 ${dueOnly ? 'bg-amber-100' : ''}`} onClick={() => setDueOnly(!dueOnly)}>Due follow-ups ({prospects.filter(p => p.kind === kind && due(p)).length}){dueOnly ? ' · Show all' : ''}</button><input aria-label="Search prospects" placeholder="Search name, contact or owner…" className="min-w-0 rounded-lg border p-2" value={search} onChange={e => setSearch(e.target.value)} /></div>
    <div className="grid gap-6 lg:grid-cols-[minmax(240px,1fr)_2fr]"><div className="space-y-3">{loading ? <p>Loading prospects…</p> : !visible.length ? <p className="p-4 text-text-mid">No prospects match this view. Add a prospect to begin.</p> : visible.map(p => {
      const last = p.interactions.filter(i => Date.parse(i.occurred_at) <= now).sort((a,b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))[0]
      return <button key={p.id} className={`w-full rounded-xl border p-4 text-left ${selected === p.id ? 'border-green-deep bg-green-50' : ''}`} onClick={() => { setSelected(p.id); setEditing(false); setInteraction({ kind: 'call', occurred_at: inputDate(new Date().toISOString()), notes: '' }) }}><p className="font-bold">{p.name}</p><p className="text-xs capitalize text-text-mid">{label(p.status)}{p.owner && ` · ${p.owner}`}</p><p className="mt-2 text-sm">Last contact: {last ? format(last.occurred_at) : 'Not recorded'}</p><p className={`mt-1 text-sm ${due(p) ? 'font-semibold text-amber-800' : 'text-text-mid'}`}>{p.next_follow_up ? `${due(p) ? 'Due' : 'Follow-up'}: ${format(p.next_follow_up)}` : 'No follow-up scheduled'}</p></button>
    })}</div><div className="min-w-0">
    {editing ? <form onSubmit={e => save(e, 'prospect')} className="space-y-4"><h3 className="text-lg font-bold">{selected ? 'Edit prospect & next follow-up' : 'New prospect'}</h3><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Type<select className="mt-1 w-full rounded-lg border p-3" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}><option value="individual">Individual</option><option value="corporate">Corporate</option></select></label>{field('name', form.kind === 'corporate' ? 'Company name' : 'Full name')}{field('contact_person', 'Contact person')}{field('phone', 'Phone')}{field('email', 'Email', 'email')}{field('owner', 'Responsible team member')}<label className="text-sm">Deal status<select className="mt-1 w-full rounded-lg border p-3 capitalize" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>{field('next_follow_up', 'Next follow-up (Lagos time)', 'datetime-local')}</div>{field('next_action', 'Next action / what they asked us to do')}<div className="flex gap-3"><button disabled={saving} className="rounded-lg bg-green-deep px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save prospect'}</button><button type="button" disabled={saving} onClick={() => setEditing(false)}>Cancel</button></div></form> : prospect ? <div className="space-y-6"><div><div className="flex justify-between gap-3"><h3 className="text-xl font-bold">{prospect.name}</h3><button className="font-semibold text-green-mid underline" onClick={() => edit(prospect)}>Edit / schedule follow-up</button></div><p className="mt-2 text-sm text-text-mid">{[prospect.contact_person, prospect.phone, prospect.email].filter(Boolean).join(' · ')}</p><p className="mt-2 text-sm capitalize">{label(prospect.status)} · Owner: {prospect.owner || 'Unassigned'}</p><div className="mt-4 rounded-xl bg-amber-50 p-4"><p className="font-semibold">Next follow-up: {prospect.next_follow_up ? format(prospect.next_follow_up) : 'Not scheduled'}</p><p className="mt-1 whitespace-pre-wrap text-sm">{prospect.next_action || 'Add the agreed next step.'}</p></div></div>
      <form onSubmit={e => save(e, 'interaction')} className="space-y-3 rounded-xl border p-4"><h4 className="font-bold">Record an interaction or upcoming meeting</h4><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Type<select className="mt-1 w-full rounded-lg border p-2 capitalize" value={interaction.kind} onChange={e => setInteraction({ ...interaction, kind: e.target.value })}>{['call','meeting','email','whatsapp','note'].map(k => <option key={k}>{k}</option>)}</select></label><label className="text-sm">Date and time (Lagos)<input required type="datetime-local" className="mt-1 w-full rounded-lg border p-2" value={interaction.occurred_at} onChange={e => setInteraction({ ...interaction, occurred_at: e.target.value })} /></label></div><label className="block text-sm">Discussion, outcome or meeting agenda<textarea required maxLength={10000} className="mt-1 min-h-24 w-full rounded-lg border p-3" value={interaction.notes} onChange={e => setInteraction({ ...interaction, notes: e.target.value })} /></label><button disabled={saving} className="rounded-lg bg-green-deep px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save interaction'}</button></form>
      <div className="space-y-3"><h4 className="font-bold">Interaction & meeting history</h4>{!prospect.interactions.length && <p className="text-sm text-text-mid">No interactions recorded yet.</p>}{[...prospect.interactions].sort((a,b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at)).map(i => <article key={i.id} className="rounded-xl border p-4"><p className="text-sm font-semibold capitalize">{i.kind} · {format(i.occurred_at)}{Date.parse(i.occurred_at) > now && ' · Upcoming'}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{i.notes}</p></article>)}</div></div> : <p className="rounded-xl bg-gray-50 p-6 text-text-mid">Select a prospect to view their conversations, meetings and next follow-up.</p>}
    </div></div>
  </section>
}
