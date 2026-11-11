'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormBuilder, FormFill, ResponseSummary, answerColumns, newForm } from '@/components/forms/FormKit'
import type { AdminRole } from '@/lib/admin-auth'
import type { FormAnswers, FormDefinition, FormResponseView } from '@/lib/forms'
import { audienceLabels, type FormAudience, type FormRecord, type FormStatus, type PublicFormRecord, type StoredFormResponse } from '@/lib/forms-types'

const api = '/api/admin/forms'
type ToFill = PublicFormRecord & { my_response: FormResponseView | null }
type Draft = {
  title: string; description: string; audience: FormAudience; status: FormStatus; definition: FormDefinition
  collect_contact: FormRecord['collect_contact']; one_response_per_person: boolean; outreach: boolean; audience_roles: string[]; assigned_emails: string; confirmation_message: string
}
const blank = (): Draft => ({ title: '', description: '', audience: 'customers', status: 'draft', definition: newForm(), collect_contact: 'optional', one_response_per_person: true, outreach: false, audience_roles: [], assigned_emails: '', confirmation_message: '' })
const draftOf = (form: FormRecord): Draft => ({ ...form, outreach: !!form.outreach, assigned_emails: form.assigned_emails.join('\n') })
const formLink = (slug: string) => `${typeof window === 'undefined' ? '' : window.location.origin}/forms/${slug}`
const audienceOrder: FormAudience[] = ['customers', 'staff', 'patients']

export default function Forms({ role }: { role: AdminRole }) {
  const [forms, setForms] = useState<FormRecord[]>([]); const [toFill, setToFill] = useState<ToFill[]>([])
  const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const [editing, setEditing] = useState<FormRecord | Draft | 'new' | null>(null); const [reviewing, setReviewing] = useState<FormRecord | null>(null)
  const load = useCallback(async () => {
    setError(''); const response = await fetch(api); const result = await response.json().catch(() => ({}))
    if (response.ok) { setForms(result.forms || []); setToFill(result.toFill || []) } else setError(result.error || 'Could not load forms.')
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function send(method: 'POST' | 'PATCH', body: Record<string, unknown>) {
    const response = await fetch(api, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'Could not save the form.'); return null }
    setError(''); await load(); return result.form as FormRecord
  }
  async function remove(form: FormRecord) {
    if (!confirm(`Permanently delete “${form.title}” and its ${form.response_count || 0} response(s)? This cannot be undone.`)) return
    const response = await fetch(`${api}?id=${form.id}`, { method: 'DELETE' }); if (response.ok) await load(); else setError((await response.json().catch(() => ({}))).error || 'Could not delete the form.')
  }

  if (loading) return <div className="rounded-2xl border bg-white p-16 text-center text-text-mid">Loading forms…</div>
  return <div className="space-y-6">
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {role === 'admin' && <AdminForms forms={forms} onNew={() => setEditing('new')} onEdit={setEditing} onResponses={setReviewing} onDelete={remove}
      onDuplicate={(form) => setEditing({ ...draftOf(form), title: `${form.title} (copy)`, status: 'draft' })} onStatus={(form, status) => send('PATCH', { id: form.id, status })} />}
    <FormsToFill forms={toFill} admin={role === 'admin'} onSubmitted={load} />
    {editing && <Editor initial={editing === 'new' ? blank() : 'id' in editing ? draftOf(editing) : editing} existing={editing !== 'new' && 'id' in editing ? editing : null} onClose={() => setEditing(null)}
      onSave={async (draft) => { const id = editing !== 'new' && 'id' in editing ? editing.id : undefined; const saved = await send(id ? 'PATCH' : 'POST', { ...draft, assigned_emails: draft.assigned_emails.split(/[\n,]+/).map((e) => e.trim()).filter(Boolean), ...(id ? { id } : {}) }); if (saved) setEditing(saved); return !!saved }} />}
    {reviewing && <ResponsesModal form={reviewing} onClose={() => setReviewing(null)} />}
  </div>
}

function AdminForms({ forms, onNew, onEdit, onResponses, onDelete, onDuplicate, onStatus }: { forms: FormRecord[]; onNew: () => void; onEdit: (form: FormRecord) => void; onResponses: (form: FormRecord) => void; onDelete: (form: FormRecord) => void; onDuplicate: (form: FormRecord) => void; onStatus: (form: FormRecord, status: FormStatus) => void }) {
  const [filter, setFilter] = useState<FormAudience | 'all'>('all'); const [copied, setCopied] = useState('')
  const shown = forms.filter((form) => filter === 'all' || form.audience === filter)
  const copy = async (form: FormRecord) => { await navigator.clipboard.writeText(formLink(form.slug)).catch(() => {}); setCopied(form.id); setTimeout(() => setCopied(''), 1500) }
  return <>
    <div className="grid gap-4 sm:grid-cols-3"><Stat label="Forms" value={forms.length} /><Stat label="Published" value={forms.filter((f) => f.status === 'published').length} /><Stat label="Responses" value={forms.reduce((n, f) => n + (f.response_count || 0), 0)} /></div>
    <section className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-6"><div><h3 className="text-2xl font-bold text-green-deep">Forms and surveys</h3><p className="mt-1 text-sm text-text-mid">Build surveys and quizzes for customers, employees or patients, share them, and review the responses.</p></div><button onClick={onNew} className="rounded-full bg-green-deep px-5 py-2.5 text-sm font-bold text-white">+ New form</button></div>
      <div className="flex flex-wrap gap-2 border-b px-6 py-3">{(['all', ...audienceOrder] as const).map((key) => <button key={key} onClick={() => setFilter(key)} className={`rounded-full px-3 py-1 text-xs font-bold ${filter === key ? 'bg-green-deep text-white' : 'bg-gray-100 text-green-deep'}`}>{key === 'all' ? 'All' : audienceLabels[key].label} <span className="opacity-60">{key === 'all' ? forms.length : forms.filter((f) => f.audience === key).length}</span></button>)}</div>
      {!shown.length ? <p className="p-16 text-center text-text-mid">{forms.length ? 'No forms for this audience yet.' : 'No forms yet. Create a survey or quiz for customers, employees or patients.'}</p> : <div className="divide-y">{shown.map((form) => <div key={form.id} className="flex flex-wrap items-start justify-between gap-4 p-6">
        <div className="min-w-[240px] flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-bold text-green-deep">{form.title}</h4><Badge tone="audience">{audienceLabels[form.audience].label}</Badge><Badge tone={form.status}>{form.status}</Badge>{form.definition.kind === 'quiz' && <Badge tone="audience">quiz</Badge>}</div>
          {form.description && <p className="mt-1 line-clamp-2 text-sm text-text-mid">{form.description}</p>}
          <p className="mt-2 text-xs text-gray-500">{form.definition.questions.filter((q) => q.type !== 'section').length} question(s) · {form.response_count || 0} response(s) · updated {new Date(form.updated_at).toLocaleDateString()}{shareSummary(form)}</p>
          {form.status !== 'draft' && <div className="mt-3 flex max-w-xl items-center gap-2 rounded-full bg-gray-50 py-1 pl-4 pr-1 text-xs"><span className="min-w-0 flex-1 truncate text-text-mid">{formLink(form.slug)}</span><button onClick={() => copy(form)} className="rounded-full bg-white px-3 py-1 font-bold text-green-deep shadow-sm">{copied === form.id ? 'Copied' : 'Copy link'}</button><a href={`/forms/${form.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-full px-2 py-1 font-bold text-green-mid">Open ↗</a></div>}
        </div>
        <div className="flex flex-wrap gap-2"><button onClick={() => onResponses(form)} className="rounded-full border px-4 py-2 text-xs font-bold text-green-deep">Responses</button><button onClick={() => onEdit(form)} className="rounded-full border px-4 py-2 text-xs font-bold text-green-deep">Edit</button>
          {form.status === 'published' ? <button onClick={() => onStatus(form, 'closed')} className="rounded-full border px-4 py-2 text-xs font-bold text-green-deep">Close</button> : <button onClick={() => onStatus(form, 'published')} className="rounded-full bg-green-deep px-4 py-2 text-xs font-bold text-white">{form.status === 'closed' ? 'Reopen' : 'Publish'}</button>}
          <button onClick={() => onDuplicate(form)} className="rounded-full px-3 py-2 text-xs font-bold text-green-deep">Duplicate</button><button onClick={() => onDelete(form)} className="rounded-full px-3 py-2 text-xs font-bold text-red-600">Delete</button></div>
      </div>)}</div>}
    </section>
  </>
}

function shareSummary(form: FormRecord) {
  if (form.audience === 'customers') return form.collect_contact === 'none' ? ' · anonymous' : ` · contact details ${form.collect_contact}`
  const people = form.assigned_emails.length ? `${form.assigned_emails.length} email(s)` : ''
  if (form.audience === 'staff') return ` · ${[form.audience_roles.join(', '), people].filter(Boolean).join(' + ') || 'all staff'}`
  return ` · ${people || 'all portal patients'}`
}

function FormsToFill({ forms, admin, onSubmitted }: { forms: ToFill[]; admin: boolean; onSubmitted: () => void }) {
  const [open, setOpen] = useState<string | null>(null); const [error, setError] = useState('')
  if (!forms.length) return admin ? null : <div className="rounded-[20px] border bg-white p-16 text-center"><h3 className="text-xl font-bold text-green-deep">No forms for you right now</h3><p className="mt-2 text-text-mid">Surveys and forms shared with your role will appear here.</p></div>
  async function submit(form: ToFill, answers: FormAnswers) {
    const response = await fetch(`/api/forms/${form.slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) }); const result = await response.json().catch(() => ({}))
    if (!response.ok) { setError(result.error || 'Could not submit the form.'); return false }
    setError(''); if (!form.one_response_per_person) setOpen(null); onSubmitted(); return true
  }
  return <section className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-sm">
    <div className="border-b p-6"><h3 className="text-xl font-bold text-green-deep">Forms for you</h3><p className="mt-1 text-sm text-text-mid">Staff surveys shared with you.</p></div>
    {error && <div role="alert" className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="divide-y">{forms.map((form) => <div key={form.id} className="p-6">
      <button onClick={() => setOpen(open === form.id ? null : form.id)} className="flex w-full items-start justify-between gap-4 text-left"><div><h4 className="font-bold text-green-deep">{form.title}</h4>{form.description && <p className="mt-1 text-sm text-text-mid">{form.description}</p>}<p className="mt-1 text-xs font-bold text-green-mid">{form.my_response ? `Submitted ${new Date(form.my_response.submitted_at).toLocaleDateString()}` : 'Not answered yet'}</p></div><span className="text-2xl text-green-deep">{open === form.id ? '−' : '+'}</span></button>
      {open === form.id && <div className="mt-4 rounded-xl bg-[#fbfaf6] p-4"><FormFill form={form.definition} response={form.one_response_per_person ? form.my_response : null} onSubmit={(answers) => submit(form, answers)} /></div>}
    </div>)}</div>
  </section>
}

function Editor({ initial, existing, onClose, onSave }: { initial: Draft; existing: FormRecord | null; onClose: () => void; onSave: (draft: Draft) => Promise<boolean> }) {
  const [draft, setDraft] = useState<Draft>(initial); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false)
  const set = (patch: Partial<Draft>) => { setDraft((d) => ({ ...d, ...patch })); setSaved(false) }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><div role="dialog" aria-modal="true" className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
    <div className="flex justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-green-mid">Form builder</p><h3 className="mt-1 text-2xl font-bold text-green-deep">{existing ? 'Edit form' : 'New form'}</h3></div><button onClick={onClose} className="h-9 w-9 rounded-full bg-gray-100 text-xl">×</button></div>
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); const ok = await onSave(draft); setSaving(false); setSaved(ok) }} className="mt-6 space-y-5">
      <Field label="Title"><input required maxLength={160} value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Patient satisfaction survey" className="input" /></Field>
      <Field label="Description" hint="shown above the questions"><textarea rows={3} maxLength={3000} value={draft.description} onChange={(e) => set({ description: e.target.value })} className="input" /></Field>
      <div><p className="text-sm font-bold text-green-deep">Who is it for?</p><div className="mt-2 grid gap-3 sm:grid-cols-3">{audienceOrder.map((audience) => <label key={audience} className={`cursor-pointer rounded-xl border p-4 ${draft.audience === audience ? 'border-green-deep bg-green-50/60 ring-1 ring-green-deep' : ''}`}><input type="radio" name="audience" className="sr-only" checked={draft.audience === audience} onChange={() => set({ audience })} /><span className="font-bold text-green-deep">{audienceLabels[audience].label}</span><span className="mt-1 block text-xs leading-5 text-text-mid">{audienceLabels[audience].detail}</span></label>)}</div>
        {existing && existing.audience !== draft.audience && existing.response_count ? <p className="mt-2 text-xs text-red-600">This form already has responses from {audienceLabels[existing.audience].label.toLowerCase()}. They are kept, but new responses will come from {audienceLabels[draft.audience].label.toLowerCase()}.</p> : null}</div>
      <div className="grid gap-5 rounded-2xl border bg-[#fbfaf6] p-5 sm:grid-cols-2">
        {draft.audience === 'customers' && <Field label="Ask for contact details"><select value={draft.collect_contact} onChange={(e) => set({ collect_contact: e.target.value as Draft['collect_contact'] })} className="input"><option value="optional">Optional: name, email, phone</option><option value="required">Required: name and phone (email optional)</option><option value="none">Don't ask (anonymous)</option></select><span className="mt-1 block text-xs font-normal text-text-mid">Anyone who leaves an email or phone is added to Contacts.</span></Field>}
        {draft.audience === 'customers' && <label className="flex items-start gap-3 rounded-xl border bg-white p-3 text-sm font-bold text-green-deep sm:col-span-2"><input type="checkbox" checked={draft.outreach} onChange={(e) => set({ outreach: e.target.checked })} className="mt-1 accent-green-deep" /><span>Outreach registration<span className="mt-0.5 block text-xs font-normal leading-5 text-text-mid">Each response joins the Outreaches list in the EMR, where a health worker logs vital signs and signs off. Use “Save to patient record as” on the date of birth, sex and address questions so a booked follow-up can create the patient.</span></span></label>}
        {draft.audience === 'staff' && <Field label="Staff roles" hint="leave all unticked and add no emails to share with everyone"><div className="mt-2 flex flex-wrap gap-4">{(['admin', 'clinical', 'sales'] as const).map((role) => <label key={role} className="flex items-center gap-2 font-normal capitalize"><input type="checkbox" checked={draft.audience_roles.includes(role)} onChange={(e) => set({ audience_roles: e.target.checked ? [...draft.audience_roles, role] : draft.audience_roles.filter((r) => r !== role) })} />{role}</label>)}</div></Field>}
        {draft.audience !== 'customers' && <Field label={draft.audience === 'staff' ? 'Specific staff emails' : 'Specific patient emails'} hint={draft.audience === 'patients' ? 'leave empty for every portal patient' : 'optional'}><textarea rows={3} value={draft.assigned_emails} onChange={(e) => set({ assigned_emails: e.target.value })} placeholder="one per line or comma-separated" className="input" /></Field>}
        {draft.audience !== 'customers' && <Field label="Responses per person"><select value={draft.one_response_per_person ? 'one' : 'many'} onChange={(e) => set({ one_response_per_person: e.target.value === 'one' })} className="input"><option value="one">One response each (they can edit it)</option><option value="many">A new response every time (e.g. weekly check-ins)</option></select></Field>}
        <Field label="Status"><select value={draft.status} onChange={(e) => set({ status: e.target.value as FormStatus })} className="input"><option value="draft">Draft: only admins can open it</option><option value="published">Published: accepting responses</option><option value="closed">Closed: no new responses</option></select></Field>
        <Field label="Thank-you message" hint="optional"><input maxLength={1000} value={draft.confirmation_message} onChange={(e) => set({ confirmation_message: e.target.value })} placeholder="Thank you, your response has been recorded." className="input" /></Field>
        <div className="sm:col-span-2"><p className="text-sm font-bold text-green-deep">Button on the thank-you screen <span className="font-normal text-gray-400">(optional, e.g. a Google review link)</span></p>
          <div className="mt-1 grid gap-3 sm:grid-cols-[220px_1fr]"><input aria-label="Button label" maxLength={80} value={draft.definition.thankYouLink?.label || ''} onChange={(e) => set({ definition: { ...draft.definition, thankYouLink: { url: draft.definition.thankYouLink?.url || '', label: e.target.value } } })} placeholder="Leave us a review" className="input mt-0" />
            <input aria-label="Button link" type="url" value={draft.definition.thankYouLink?.url || ''} onChange={(e) => set({ definition: { ...draft.definition, thankYouLink: e.target.value || draft.definition.thankYouLink?.label ? { label: draft.definition.thankYouLink?.label || '', url: e.target.value } : undefined } })} placeholder="https://…" className="input mt-0" /></div></div>
      </div>
      <FormBuilder form={draft.definition} onChange={(definition) => set({ definition })} heading="Questions" showDetails={false} patientMapping={draft.audience === 'customers' && draft.outreach} />
      {existing && existing.status !== 'draft' && <p className="text-xs text-text-mid">Changing questions on a published form keeps earlier answers; renamed or removed questions show only in the CSV export.</p>}
      <div className="flex flex-wrap items-center justify-end gap-3">{existing && <a href={`/forms/${existing.slug}`} target="_blank" rel="noopener noreferrer" className="mr-auto text-sm font-bold text-green-mid underline">Open form ↗</a>}{saved && <span className="text-sm font-bold text-green-700">Saved</span>}<button type="button" onClick={onClose} className="rounded-full border px-5 py-3 text-sm font-bold">Close</button><button disabled={saving} className="rounded-full bg-green-deep px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : existing ? 'Save changes' : 'Create form'}</button></div>
    </form>
  </div></div>
}

function ResponsesModal({ form, onClose }: { form: FormRecord; onClose: () => void }) {
  const [responses, setResponses] = useState<StoredFormResponse[] | null>(null); const [error, setError] = useState('')
  useEffect(() => { fetch(`${api}/responses?formId=${form.id}`).then(async (r) => { const result = await r.json().catch(() => ({})); r.ok ? setResponses(result.responses || []) : setError(result.error || 'Could not load responses.') }) }, [form.id])
  const rows = useMemo(() => (responses || []).map((r) => ({ ...r, key: r.id })), [responses])
  const customers = form.audience === 'customers' && form.collect_contact !== 'none'; const quiz = form.definition.kind === 'quiz'
  function exportCsv() {
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const columns = answerColumns(form.definition.questions)
    const header = ['Respondent', ...(customers ? ['Email', 'Phone'] : []), 'Submitted', ...(quiz ? ['Score %', 'Passed'] : []), ...columns.map((c) => c.header)]
    const body = rows.map((r) => [r.respondent, ...(customers ? [r.contact_email, r.contact_phone] : []), new Date(r.submitted_at).toISOString(), ...(quiz ? [r.score ?? '', r.passed === null ? '' : r.passed ? 'Yes' : 'No'] : []), ...columns.map((c) => c.value(r.answers))])
    const url = URL.createObjectURL(new Blob([[header, ...body].map((line) => line.map(cell).join(',')).join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = `${form.title}-responses.csv`.replace(/[^\w.-]+/g, '-'); a.click(); URL.revokeObjectURL(url)
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><div role="dialog" aria-modal="true" className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl">
    <div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-green-mid">Responses · {audienceLabels[form.audience].label}</p><h3 className="mt-1 text-2xl font-bold text-green-deep">{form.title}</h3></div><div className="flex items-start gap-2"><button type="button" disabled={!rows.length} onClick={exportCsv} className="rounded-full border px-4 py-2 text-xs font-bold text-green-deep disabled:opacity-40">Export CSV</button><button onClick={onClose} className="h-9 w-9 shrink-0 rounded-full bg-gray-100 text-xl">×</button></div></div>
    {error ? <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : !responses ? <p className="py-16 text-center text-text-mid">Loading responses…</p> : <>
      <ResponseSummary form={form.definition} rows={rows} />
      {customers && rows.some((r) => r.contact_email || r.contact_phone) && <section className="mt-5 overflow-x-auto rounded-xl border"><p className="border-b bg-gray-50 px-4 py-2 text-xs font-bold uppercase text-gray-500">Contact details (also in Contacts)</p><table className="w-full text-left text-sm"><tbody className="divide-y">{rows.filter((r) => r.contact_email || r.contact_phone).map((r) => <tr key={r.id}><td className="px-4 py-2 font-bold text-green-deep">{r.contact_name || '—'}</td><td className="px-4 py-2 text-text-mid">{r.contact_email || '—'}</td><td className="px-4 py-2 text-text-mid">{r.contact_phone || '—'}</td></tr>)}</tbody></table></section>}
    </>}
  </div></div>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <label className="block text-sm font-bold text-green-deep">{label} {hint && <span className="font-normal text-gray-400">({hint})</span>}{children}</label> }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-[18px] border bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-green-mid">{label}</p><p className="mt-2 text-3xl font-bold text-green-deep">{value}</p></div> }
function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  const colors: Record<string, string> = { published: 'bg-green-50 text-green-700', draft: 'bg-gray-100 text-gray-600', closed: 'bg-amber-50 text-amber-700', audience: 'bg-[#eef3ff] text-[#30508f]' }
  return <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${colors[tone] || colors.audience}`}>{children}</span>
}
