'use client'

import { useState } from 'react'
import { hrDepartments, hrEmploymentTypes, labelOf, roleFamilies } from '@/lib/hr'
import { hiringPlanRoles, missingApprovals, offerApprovalRoles, requiredRequisitionApprovals, requisitionStatuses, type HrRequisition } from '@/lib/hr-recruiting'
import { staffName, type Staff } from './ApplicationDetail'
import type { Opening } from './Pipeline'
import { Alert, Badge, Empty, Field, Modal, Section, api, call, danger, outline, primary, showDate } from './ui'

// Stage 0: requisitions with trigger evidence, band, panel and role family,
// approved by the MD (and Medical Director for clinical roles) before the
// opening is published on the Careers page.
export default function Requisitions({ requisitions, ready, openings, staff, reload }: { requisitions: HrRequisition[]; ready: boolean; openings: Opening[]; staff: Staff[]; reload: () => void }) {
  const [editing, setEditing] = useState<HrRequisition | 'new' | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  async function act(body: Record<string, unknown>, method = 'PATCH') { setBusy(true); setError(''); const { ok, data } = await call(method === 'DELETE' ? `${api}/requisitions?id=${body.id}` : `${api}/requisitions`, method, method === 'DELETE' ? undefined : body); setBusy(false); if (!ok) setError(data.error || 'Could not update the requisition.'); else reload() }
  if (!ready) return <Section title="Requisitions"><Empty>Apply migration 042 to raise requisitions.</Empty></Section>
  return <><Alert>{error}</Alert>
    <Section title="Requisitions" description="Raise one per role in the hiring plan before publishing the opening. Applications to the linked opening take its role family and hiring manager." action={<button onClick={() => setEditing('new')} className={primary}>+ Requisition</button>}>
      {!requisitions.length ? <Empty>No requisitions yet.</Empty> : <div className="divide-y">{requisitions.map((item) => { const missing = missingApprovals(requiredRequisitionApprovals(item), item.approvals); const opening = openings.find((row) => row.id === item.career_opening_id); return <div key={item.id} className="flex flex-wrap items-start justify-between gap-4 p-6">
        <div className="min-w-[240px] flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-bold text-green-deep">{item.role_code && `${item.role_code} · `}{item.title}</h4><Badge tone={item.status === 'approved' ? 'green' : item.status === 'cancelled' ? 'gray' : 'amber'}>{labelOf(requisitionStatuses, item.status)}</Badge></div>
          <p className="mt-1 text-sm text-text-mid">{item.department} · {item.employment_type} · {labelOf(roleFamilies, item.role_family)}{item.band_code ? ` · band ${item.band_code}` : ''} · {item.headcount} post{item.headcount === 1 ? '' : 's'}{item.target_start_date ? ` · start ${showDate(item.target_start_date)}` : ''}</p>
          <p className="mt-1 text-xs text-gray-500">Hiring manager: {staffName(staff, item.hiring_manager_id)} · Panel: {item.panel_user_ids.map((id) => staffName(staff, id)).join(', ') || '—'} · Opening: {opening ? `${opening.title} (${opening.status})` : 'not linked'}</p>
          {item.approvals.length > 0 && <p className="mt-1 text-xs text-gray-500">{item.approvals.map((approval) => `${offerApprovalRoles.find((role) => role.value === approval.role)?.label} ✓ ${showDate(approval.approved_at)}`).join(' · ')}</p>}
          {item.status === 'approved' && opening && opening.status !== 'published' && <p className="mt-1 text-xs font-bold text-amber-700">Approved: publish the opening on the Careers tab.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {item.status === 'draft' && <button disabled={busy} onClick={() => act({ id: item.id, action: 'submit' })} className={outline}>Send for approval</button>}
          {item.status === 'pending_approval' && missing.map((role) => <button key={role} disabled={busy} onClick={() => confirm(`Approve as ${offerApprovalRoles.find((r) => r.value === role)?.label}? Only approve in a capacity you hold.`) && act({ id: item.id, action: 'approve', role })} className={primary}>Approve as {offerApprovalRoles.find((r) => r.value === role)?.label}</button>)}
          {item.status === 'approved' && <button disabled={busy} onClick={() => act({ id: item.id, action: 'status', status: 'on_hold' })} className={outline}>Pause</button>}
          {item.status === 'on_hold' && <button disabled={busy} onClick={() => act({ id: item.id, action: 'status', status: 'approved' })} className={outline}>Resume</button>}
          {!['filled', 'cancelled'].includes(item.status) && <button onClick={() => setEditing(item)} className={outline}>Edit</button>}
          {item.status === 'draft' ? <button disabled={busy} onClick={() => confirm('Delete this draft?') && act({ id: item.id }, 'DELETE')} className={danger}>Delete</button> : !['filled', 'cancelled'].includes(item.status) && <button disabled={busy} onClick={() => confirm('Cancel this requisition?') && act({ id: item.id, action: 'status', status: 'cancelled' })} className={danger}>Cancel</button>}
        </div>
      </div> })}</div>}
    </Section>
    {editing && <Editor requisition={editing === 'new' ? null : editing} openings={openings} staff={staff} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
  </>
}

function Editor({ requisition, openings, staff, onClose, onSaved }: { requisition: HrRequisition | null; openings: Opening[]; staff: Staff[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ role_code: requisition?.role_code || '', title: requisition?.title || '', department: requisition?.department || 'Clinical', employment_type: requisition?.employment_type || 'Full-time', role_family: requisition?.role_family || '', band_code: requisition?.band_code || '', headcount: String(requisition?.headcount || 1), plan_year: String(requisition?.plan_year || new Date().getFullYear() + 1), career_opening_id: requisition?.career_opening_id || '', hiring_manager_id: requisition?.hiring_manager_id || '', panel_user_ids: requisition?.panel_user_ids || [], trigger_evidence: requisition?.trigger_evidence || '', pause_condition: requisition?.pause_condition || '', budget_note: requisition?.budget_note || '', target_start_date: requisition?.target_start_date || '' })
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })
  const pickRole = (code: string) => { const role = hiringPlanRoles.find((item) => item.code === code); setForm({ ...form, role_code: code, ...(role ? { title: role.title, department: role.department, employment_type: role.employment_type, role_family: role.family } : {}) }) }
  return <Modal title={requisition ? 'Edit requisition' : 'New requisition'} eyebrow="Stage 0 · requisition approved" onClose={onClose}>
    <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); const { ok, data } = await call(`${api}/requisitions`, requisition ? 'PATCH' : 'POST', { ...form, ...(requisition ? { id: requisition.id } : {}), career_opening_id: form.career_opening_id || null, hiring_manager_id: form.hiring_manager_id || null }); setBusy(false); ok ? onSaved() : setError(data.error || 'Could not save.') }} className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {requisition && requisition.status !== 'draft' && <p className="text-xs text-amber-700">Changing the title, department, type, family, band or headcount sends it back to draft for approval.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Hiring-plan role"><select value={form.role_code} onChange={(e) => pickRole(e.target.value)} className="input"><option value="">Outside the plan</option>{hiringPlanRoles.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.title}</option>)}</select></Field>
        <Field label="Title"><input required maxLength={160} value={form.title} onChange={set('title')} className="input" /></Field>
        <Field label="Department"><select value={form.department} onChange={set('department')} className="input">{hrDepartments.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Employment type"><select value={form.employment_type} onChange={set('employment_type')} className="input">{hrEmploymentTypes.map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Role family (interview loop)"><select required value={form.role_family} onChange={set('role_family')} className="input"><option value="">Choose…</option>{roleFamilies.map((item) => <option key={item.value} value={item.value}>{item.value} · {item.label}</option>)}</select></Field>
        <Field label="Band code"><input maxLength={20} value={form.band_code} onChange={set('band_code')} className="input" /></Field>
        <Field label="Headcount"><input type="number" min="1" max="20" value={form.headcount} onChange={set('headcount')} className="input" /></Field>
        <Field label="Target start"><input type="date" value={form.target_start_date} onChange={set('target_start_date')} className="input" /></Field>
        <Field label="Hiring manager"><select value={form.hiring_manager_id} onChange={set('hiring_manager_id')} className="input"><option value="">Choose…</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name || member.email}</option>)}</select></Field>
        <Field label="Career opening"><select value={form.career_opening_id} onChange={set('career_opening_id')} className="input"><option value="">Not linked yet</option>{openings.map((item) => <option key={item.id} value={item.id}>{item.title} ({item.status})</option>)}</select></Field>
      </div>
      <Field label="Trigger evidence" hint="why now, from the hiring plan"><textarea rows={3} maxLength={3000} value={form.trigger_evidence} onChange={set('trigger_evidence')} className="input" /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Pause condition"><input maxLength={1000} value={form.pause_condition} onChange={set('pause_condition')} className="input" /></Field><Field label="Budget note"><input maxLength={1000} value={form.budget_note} onChange={set('budget_note')} className="input" /></Field></div>
      <Field label="Interview panel"><div className="mt-1 grid gap-1 sm:grid-cols-2">{staff.map((member) => <label key={member.id} className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" checked={form.panel_user_ids.includes(member.id)} onChange={(e) => setForm({ ...form, panel_user_ids: e.target.checked ? [...form.panel_user_ids, member.id] : form.panel_user_ids.filter((id) => id !== member.id) })} />{member.name || member.email}</label>)}</div></Field>
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-full border px-5 py-2.5 text-sm font-bold">Cancel</button><button disabled={busy} className={primary}>{busy ? 'Saving…' : 'Save'}</button></div>
    </form>
  </Modal>
}
