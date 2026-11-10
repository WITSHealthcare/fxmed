'use client'

import { useState } from 'react'
import { lagosDate } from '@/lib/follow-ups'
import { improvementPlanStatuses, labelOf, type ImprovementPlanStatus } from '@/lib/hr'
import { addDays, displayDate, type HrImprovementPlan, type PerformanceFile, type PlanGap } from '@/lib/hr-performance'
import { Badge, Buttons, Card, Empty, Field, Modal, call, primaryButton, smallButton, statusTone } from './ui'

type Props = { file: PerformanceFile; reload: () => Promise<void>; onError: (message: string) => void; onNotice: (message: string) => void }
type Editing = { mode: 'new' | 'check_in' | 'outcome'; plan: HrImprovementPlan | null }
const blankGap: PlanGap = { area: '', standard: '', measure: '', support: '' }

// Capability only; misconduct goes through the disciplinary process.
export default function Plans({ file, reload, onError, onNotice }: Props) {
  const [editing, setEditing] = useState<Editing | null>(null); const manages = (file.access.isAdmin || file.access.isManager) && !(file.access.isSelf && !file.access.isAdmin)
  async function save(path: string, method: string, body: Record<string, unknown>, done: string) {
    const result = await call(path, method, body); if (!result.ok) { onError(result.data.error || 'Could not save the plan.'); return false }
    onNotice(done); await reload(); setEditing(null); return true
  }
  if (!file.plans.length && !manages) return null
  return <Card title="Improvement plans" description="Informal support for at least 4 weeks first; a formal plan runs 60 days with weekly written check-ins shared with the employee."
    action={manages ? <button onClick={() => setEditing({ mode: 'new', plan: null })} className={primaryButton}>+ Plan</button> : undefined}>
    {!file.plans.length ? <Empty>No improvement plans.</Empty> : <div className="divide-y">{file.plans.map((plan) => {
      const open = ['informal_support', 'active', 'extended'].includes(plan.status); const end = plan.extended_to || plan.end_date
      return <div key={plan.id} className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-green-deep">{displayDate(plan.start_date)} – {displayDate(end)}</h4><Badge tone={statusTone(plan.status)}>{labelOf(improvementPlanStatuses, plan.status)}</Badge></div>
          <p className="mt-1 text-xs text-gray-500">Midpoint review {displayDate(addDays(plan.start_date, Math.round((Date.parse(plan.end_date) - Date.parse(plan.start_date)) / 172_800_000)))} · {plan.check_ins.length} check-in(s)</p></div>
          {manages && open && <div className="flex gap-2"><button onClick={() => setEditing({ mode: 'check_in', plan })} className={smallButton}>+ Check-in</button>{file.access.isAdmin && <button onClick={() => setEditing({ mode: 'outcome', plan })} className={smallButton}>Outcome</button>}</div>}</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{plan.gaps.map((gap, index) => <div key={index} className="rounded-xl bg-[#fbfaf6] p-3 text-sm"><p className="font-bold text-green-deep">{gap.area}</p>{gap.standard && <p className="mt-1 text-text-mid">Good looks like: {gap.standard}</p>}{gap.measure && <p className="text-text-mid">Measured by: {gap.measure}</p>}{gap.support && <p className="text-text-mid">Support: {gap.support}</p>}</div>)}</div>
        {plan.check_ins.length > 0 && <ol className="mt-3 space-y-2 border-l-2 border-green-deep/10 pl-4">{plan.check_ins.map((item, index) => <li key={index} className="text-sm"><span className="font-bold text-green-deep">{displayDate(item.date)}</span>{item.on_track !== null && item.on_track !== undefined && <span className={`ml-2 text-xs font-bold ${item.on_track ? 'text-green-700' : 'text-red-600'}`}>{item.on_track ? 'On track' : 'Not on track'}</span>}<p className="whitespace-pre-wrap text-text-mid">{item.note}</p><p className="text-xs text-gray-400">{item.by}</p></li>)}</ol>}
        {plan.outcome_notes && <p className="mt-3 whitespace-pre-wrap text-sm text-text-mid"><strong>Outcome:</strong> {plan.outcome_notes}</p>}
      </div>
    })}</div>}
    {editing?.mode === 'new' && <NewPlan onClose={() => setEditing(null)} onSave={(body) => save('/plans', 'POST', { ...body, employee_id: file.employee.id }, 'Plan started. Give the employee a copy.')} />}
    {editing?.mode === 'check_in' && editing.plan && <CheckIn onClose={() => setEditing(null)} onSave={(body) => save('/plans', 'PATCH', { ...body, id: editing.plan!.id, action: 'check_in' }, 'Check-in recorded.')} />}
    {editing?.mode === 'outcome' && editing.plan && <Outcome plan={editing.plan} onClose={() => setEditing(null)} onSave={(body) => save('/plans', 'PATCH', { ...body, id: editing.plan!.id, action: 'outcome' }, 'Plan updated.')} />}
  </Card>
}

function NewPlan({ onClose, onSave }: { onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<boolean> }) {
  const today = lagosDate()
  const [form, setForm] = useState({ status: 'informal_support' as 'informal_support' | 'active', start_date: today, end_date: addDays(today, 60), gaps: [{ ...blankGap }, { ...blankGap }] }); const [saving, setSaving] = useState(false)
  const setGap = (index: number, patch: Partial<PlanGap>) => setForm((current) => ({ ...current, gaps: current.gaps.map((gap, i) => i === index ? { ...gap, ...patch } : gap) }))
  return <Modal title="Improvement plan" eyebrow="Capability" onClose={onClose} wide><form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave({ ...form, gaps: form.gaps.filter((gap) => gap.area.trim()) }); setSaving(false) }} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-3"><Field label="Type"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })} className="input"><option value="informal_support">Informal support</option><option value="active">Formal plan (PIP)</option></select></Field><Field label="Start"><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value, end_date: addDays(e.target.value, 60) })} className="input" /></Field><Field label="End" hint="30–90 days"><input type="date" min={addDays(form.start_date, 30)} max={addDays(form.start_date, 90)} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="input" /></Field></div>
    <div className="space-y-3">{form.gaps.map((gap, index) => <div key={index} className="rounded-xl border bg-[#fbfaf6] p-4"><div className="flex gap-2"><input required={index === 0} value={gap.area} onChange={(e) => setGap(index, { area: e.target.value })} placeholder={`Gap ${index + 1}: what is not meeting the role`} className="input" /><button type="button" onClick={() => setForm({ ...form, gaps: form.gaps.filter((_, i) => i !== index) })} className="px-2 text-red-600" aria-label="Remove gap">×</button></div><div className="mt-2 grid gap-2 sm:grid-cols-3"><input value={gap.standard} onChange={(e) => setGap(index, { standard: e.target.value })} placeholder="What good looks like" className="input" /><input value={gap.measure} onChange={(e) => setGap(index, { measure: e.target.value })} placeholder="How it is measured" className="input" /><input value={gap.support} onChange={(e) => setGap(index, { support: e.target.value })} placeholder="Support offered" className="input" /></div></div>)}</div>
    {form.gaps.length < 4 && <button type="button" onClick={() => setForm({ ...form, gaps: [...form.gaps, { ...blankGap }] })} className="text-xs font-bold text-green-mid">+ Add gap</button>}
    <Buttons onCancel={onClose} saving={saving} label="Start plan" /></form></Modal>
}

function CheckIn({ onClose, onSave }: { onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [form, setForm] = useState({ date: lagosDate(), note: '', on_track: '' }); const [saving, setSaving] = useState(false)
  return <Modal title="Weekly check-in" eyebrow="Improvement plan" onClose={onClose}><form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave({ date: form.date, note: form.note, on_track: form.on_track === '' ? null : form.on_track === 'yes' }); setSaving(false) }} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" /></Field><Field label="On track?"><select value={form.on_track} onChange={(e) => setForm({ ...form, on_track: e.target.value })} className="input"><option value="">Not assessed</option><option value="yes">On track</option><option value="no">Not on track</option></select></Field></div>
    <Field label="Note" hint="shared with the employee"><textarea required rows={5} maxLength={4000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input" /></Field>
    <Buttons onCancel={onClose} saving={saving} label="Save check-in" /></form></Modal>
}

function Outcome({ plan, onClose, onSave }: { plan: HrImprovementPlan; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [form, setForm] = useState({ status: plan.status as ImprovementPlanStatus, outcome_notes: plan.outcome_notes, extended_to: plan.extended_to || '' }); const [saving, setSaving] = useState(false)
  return <Modal title="Plan outcome" eyebrow="Improvement plan" onClose={onClose}><form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(form); setSaving(false) }} className="space-y-4">
    <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ImprovementPlanStatus })} className="input">{improvementPlanStatuses.map((item) => <option key={item.value} value={item.value} disabled={item.value === 'extended' && !!plan.extended_to}>{item.label}</option>)}</select></Field>
    {form.status === 'extended' && <Field label="Extend to" hint="once, up to 30 days"><input required type="date" min={addDays(plan.end_date, 1)} max={addDays(plan.end_date, 30)} value={form.extended_to} onChange={(e) => setForm({ ...form, extended_to: e.target.value })} className="input" /></Field>}
    <Field label="Outcome and reasons"><textarea rows={5} maxLength={4000} value={form.outcome_notes} onChange={(e) => setForm({ ...form, outcome_notes: e.target.value })} className="input" /></Field>
    {form.status === 'not_passed' && <p className="text-xs text-amber-700">Not passed moves to the formal capability process: a hearing where the employee can respond and bring a colleague. Confirm with counsel before any termination.</p>}
    <Buttons onCancel={onClose} saving={saving} label="Save outcome" /></form></Modal>
}
