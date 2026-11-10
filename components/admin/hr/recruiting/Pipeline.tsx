'use client'

import { useMemo, useState } from 'react'
import { applicationStages, candidateSources, labelOf, roleFamilies, type ApplicationStage } from '@/lib/hr'
import { candidateContactWorkingDays, isClosedStage, openPipelineStages, workingDaysBetween, type HrApplication } from '@/lib/hr-recruiting'
import { dueLabel, lagosDate } from '@/lib/follow-ups'
import ApplicationDetail, { staffName, type Staff } from './ApplicationDetail'
import { Badge, Empty, Field, Modal, Section, Stat, api, call, primary, showDate } from './ui'

export type PipelineRow = HrApplication & { candidate: { id: string; full_name: string; email: string; phone: string | null; location: string | null; source: string; talent_pool_consent: boolean; anonymised_at: string | null; retention_delete_after: string | null } | null; scorecards: { assigned: number; submitted: number; conflicts: number } }
export type Opening = { id: string; title: string; department: string; employment_type: string; location: string; status: string }

// Applications per career opening through the 14 stages, with working-day
// time limits and the 5-day candidate contact standard.
export default function Pipeline({ applications, openings, staff, today, reload }: { applications: PipelineRow[]; openings: Opening[]; staff: Staff[]; today: string; reload: () => void }) {
  const [opening, setOpening] = useState('all'); const [stage, setStage] = useState<'open' | 'all' | ApplicationStage>('open'); const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null); const [adding, setAdding] = useState(false)
  const [now] = useState(() => Date.now())
  const contactOverdue = (row: PipelineRow) => !isClosedStage(row.stage) && workingDaysBetween(lagosDate(row.last_candidate_contact_at || row.stage_entered_at), today) > candidateContactWorkingDays
  const rows = useMemo(() => applications.filter((row) => (opening === 'all' || row.career_opening_id === opening) && (stage === 'all' || (stage === 'open' ? !isClosedStage(row.stage) : row.stage === stage)) && (!query || `${row.candidate?.full_name} ${row.candidate?.email} ${row.opening_title}`.toLowerCase().includes(query.toLowerCase()))), [applications, opening, stage, query])
  const open = applications.filter((row) => !isClosedStage(row.stage))
  const counts = new Map<string, number>(); for (const row of applications.filter((item) => opening === 'all' || item.career_opening_id === opening)) counts.set(row.stage, (counts.get(row.stage) || 0) + 1)
  return <>
    <div className="grid gap-4 sm:grid-cols-4"><Stat label="Open applications" value={open.length} /><Stat label="Past time limit" value={open.filter((row) => row.stage_due_at && Date.parse(row.stage_due_at) < now).length} tone="warn" /><Stat label="Awaiting contact" value={open.filter(contactOverdue).length} tone="warn" /><Stat label="Scorecards outstanding" value={open.reduce((sum, row) => sum + row.scorecards.assigned - row.scorecards.submitted - row.scorecards.conflicts, 0)} /></div>
    <Section title="Pipeline" description="Every candidate is in exactly one stage. Move stages from the application; each move is recorded with its reason." action={<button onClick={() => setAdding(true)} className={primary}>+ Add application</button>}>
      <div className="flex flex-wrap gap-3 border-b p-4">
        <select aria-label="Opening" value={opening} onChange={(e) => setOpening(e.target.value)} className="input w-auto py-2"><option value="all">All openings</option>{openings.map((item) => <option key={item.id} value={item.id}>{item.title}{item.status !== 'published' ? ` (${item.status})` : ''}</option>)}</select>
        <select aria-label="Stage" value={stage} onChange={(e) => setStage(e.target.value as typeof stage)} className="input w-auto py-2"><option value="open">Open stages</option><option value="all">All stages</option>{applicationStages.map((item) => <option key={item.value} value={item.value}>{item.label} ({counts.get(item.value) || 0})</option>)}</select>
        <input aria-label="Search" placeholder="Search name, email or role" value={query} onChange={(e) => setQuery(e.target.value)} className="input w-64 py-2" />
      </div>
      {stage === 'open' && <div className="flex flex-wrap gap-2 border-b px-4 py-3 text-xs">{openPipelineStages.map((value) => <button key={value} onClick={() => setStage(value)} className="rounded-full bg-green-50 px-3 py-1 font-bold text-green-700">{labelOf(applicationStages, value)} · {counts.get(value) || 0}</button>)}</div>}
      {!rows.length ? <Empty>No applications match.</Empty> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Time limit</th><th className="px-4 py-3">Last contact</th><th className="px-4 py-3">Scorecards</th></tr></thead>
        <tbody className="divide-y">{rows.map((row) => { const overdue = !!row.stage_due_at && !isClosedStage(row.stage) && Date.parse(row.stage_due_at) < now; return <tr key={row.id} onClick={() => setSelected(row.id)} className="cursor-pointer hover:bg-green-50/40">
          <td className="px-4 py-3"><p className="font-bold text-green-deep">{row.candidate?.full_name || 'Candidate'}</p><p className="text-xs text-gray-500">{labelOf(candidateSources, row.candidate?.source as never)}{row.candidate?.talent_pool_consent ? ' · talent pool' : ''}</p></td>
          <td className="px-4 py-3"><p>{row.opening_title}</p><p className="text-xs text-gray-500">{row.role_family ? labelOf(roleFamilies, row.role_family) : 'Family not set'}{row.hiring_manager_id ? ` · ${staffName(staff, row.hiring_manager_id)}` : ''}</p></td>
          <td className="px-4 py-3"><Badge tone={row.stage === 'hired' ? 'green' : row.stage === 'rejected' || row.stage === 'withdrawn' ? 'gray' : 'blue'}>{labelOf(applicationStages, row.stage)}</Badge></td>
          <td className={`px-4 py-3 text-xs ${overdue ? 'font-bold text-red-600' : 'text-text-mid'}`}>{isClosedStage(row.stage) ? showDate(row.stage_entered_at) : row.stage_due_at ? dueLabel(row.stage_due_at, today) : '—'}</td>
          <td className={`px-4 py-3 text-xs ${contactOverdue(row) ? 'font-bold text-red-600' : 'text-text-mid'}`}>{row.last_candidate_contact_at ? showDate(row.last_candidate_contact_at) : 'None'}</td>
          <td className="px-4 py-3 text-xs text-text-mid">{row.scorecards.assigned ? `${row.scorecards.submitted}/${row.scorecards.assigned - row.scorecards.conflicts}` : '—'}{row.scorecards.conflicts ? ` · ${row.scorecards.conflicts} conflict` : ''}</td>
        </tr> })}</tbody></table></div>}
    </Section>
    {selected && <ApplicationDetail id={selected} onClose={() => setSelected(null)} onChanged={reload} />}
    {adding && <AddApplication openings={openings} onClose={() => setAdding(false)} onSaved={(id) => { setAdding(false); reload(); setSelected(id) }} />}
  </>
}

function AddApplication({ openings, onClose, onSaved }: { openings: Opening[]; onClose: () => void; onSaved: (id: string) => void }) {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', location: '', opening_id: '', source: 'referral', role_family: '', cover_note: '', privacy_notice_sent: false }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })
  return <Modal title="Add an application" eyebrow="Referral, agency or emailed CV" onClose={onClose}>
    <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); const { ok, data } = await call<{ application: { id: string } }>(api, 'POST', form); setBusy(false); ok ? onSaved(data.application.id) : setError(data.error || 'Could not add the application.') }} className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name"><input required maxLength={160} value={form.full_name} onChange={set('full_name')} className="input" /></Field>
        <Field label="Email"><input required type="email" maxLength={254} value={form.email} onChange={set('email')} className="input" /></Field>
        <Field label="Phone"><input maxLength={40} value={form.phone} onChange={set('phone')} className="input" /></Field>
        <Field label="Location"><input maxLength={160} value={form.location} onChange={set('location')} className="input" /></Field>
        <Field label="Opening"><select required value={form.opening_id} onChange={set('opening_id')} className="input"><option value="">Choose…</option>{openings.map((item) => <option key={item.id} value={item.id}>{item.title}{item.status !== 'published' ? ` (${item.status})` : ''}</option>)}</select></Field>
        <Field label="Source"><select value={form.source} onChange={set('source')} className="input">{candidateSources.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <Field label="Role family"><select value={form.role_family} onChange={set('role_family')} className="input"><option value="">From the requisition</option>{roleFamilies.map((item) => <option key={item.value} value={item.value}>{item.value} · {item.label}</option>)}</select></Field>
      </div>
      <Field label="Note" hint="optional"><textarea rows={3} maxLength={5000} value={form.cover_note} onChange={set('cover_note')} className="input" /></Field>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={form.privacy_notice_sent} onChange={(e) => setForm({ ...form, privacy_notice_sent: e.target.checked })} />I have sent the candidate the privacy notice (careers page). Upload the CV from the application, then delete it from any inbox.</label>
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-full border px-5 py-2.5 text-sm font-bold">Cancel</button><button disabled={busy} className={primary}>{busy ? 'Adding…' : 'Add application'}</button></div>
    </form>
  </Modal>
}
