'use client'

import { useMemo, useState } from 'react'
import { goalStatuses, labelOf, type GoalStatus } from '@/lib/hr'
import { displayDate, forbiddenGoalTerm, goalTermError, type HrGoal, type PerformanceFile } from '@/lib/hr-performance'
import { Badge, Buttons, Card, Empty, Field, Modal, RatingSelect, call, primaryButton, smallButton, statusTone } from './ui'

type Props = { file: PerformanceFile; reload: () => Promise<void>; onError: (message: string) => void; onNotice: (message: string) => void }
const blank = { title: '', measure: '', target: '', data_source: '', is_development_goal: false, due_date: '', progress_notes: '', status: 'draft' as GoalStatus, rating: null as number | null }

// 3–5 personal goals plus role KPIs per year, at least one development goal.
export default function Goals({ file, reload, onError, onNotice }: Props) {
  const thisYear = file.year
  const years = useMemo(() => Array.from(new Set([thisYear, thisYear + 1, ...file.goals.map((goal) => goal.review_year)])).sort((a, b) => b - a), [file.goals, thisYear])
  const [year, setYear] = useState(thisYear); const [editing, setEditing] = useState<HrGoal | 'new' | null>(null)
  const goals = file.goals.filter((goal) => goal.review_year === year); const manages = file.access.isAdmin || file.access.isManager
  const live = goals.filter((goal) => goal.status !== 'dropped'); const development = live.some((goal) => goal.is_development_goal)
  async function save(form: typeof blank, goal: HrGoal | null) {
    const result = await call('/goals', goal ? 'PATCH' : 'POST', { ...form, ...(goal ? { id: goal.id } : { employee_id: file.employee.id, review_year: year }) })
    if (!result.ok) { onError(result.data.error || 'Could not save the goal.'); return false }
    onNotice('Goal saved.'); await reload(); return true
  }
  async function remove(goal: HrGoal) { if (!confirm(`Delete “${goal.title}”?`)) return; const result = await call(`/goals?id=${goal.id}`, 'DELETE'); if (!result.ok) onError(result.data.error || 'Could not delete the goal.'); else await reload() }
  return <Card title="Goals and KPIs" description="Write goals so someone else could tell whether they were met. Never targets for tests, supplements, diagnoses, upgrades or programme enrolments."
    action={<div className="flex items-center gap-2"><select aria-label="Goal year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="input w-28 py-2">{years.map((item) => <option key={item} value={item}>{item}</option>)}</select><button onClick={() => setEditing('new')} className={primaryButton}>+ Goal</button></div>}>
    {(live.length > 0 && (live.length < 3 || live.length > 5 || !development)) && <p className="border-b bg-amber-50 px-5 py-2 text-xs text-amber-800">{live.length < 3 || live.length > 5 ? `${live.length} goal(s): aim for 3–5 personal goals. ` : ''}{!development ? 'Include at least one development goal (a skill, course or CPD hours).' : ''}</p>}
    {!goals.length ? <Empty>No goals for {year} yet. Goals are agreed by 31 January.</Empty> : <div className="divide-y">{goals.map((goal) => <div key={goal.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
      <div className="min-w-[220px] flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-green-deep">{goal.title}</h4><Badge tone={statusTone(goal.status)}>{labelOf(goalStatuses, goal.status)}</Badge>{goal.is_development_goal && <Badge tone="blue">Development</Badge>}{goal.rating && <Badge tone="gray">Rated {goal.rating}</Badge>}</div>
        <p className="mt-1 text-sm text-text-mid">{[goal.measure && `Measure: ${goal.measure}`, goal.target && `Target: ${goal.target}`, goal.data_source && `Source: ${goal.data_source}`].filter(Boolean).join(' · ') || 'No measure yet'}</p>
        <p className="mt-1 text-xs text-gray-500">{goal.due_date ? `Due ${displayDate(goal.due_date)}` : 'No due date'}{goal.agreed_at ? ` · agreed ${displayDate(goal.agreed_at)}` : ''}</p>
        {goal.progress_notes && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-[#fbfaf6] p-3 text-sm text-text-mid">{goal.progress_notes}</p>}</div>
      <div className="flex gap-2"><button onClick={() => setEditing(goal)} className={smallButton}>{manages || goal.status === 'draft' ? 'Edit' : 'Update progress'}</button>{(manages || goal.status === 'draft') && <button onClick={() => remove(goal)} className="px-2 text-xs font-bold text-red-600">Delete</button>}</div>
    </div>)}</div>}
    {editing && <GoalEditor goal={editing === 'new' ? null : editing} manages={manages} onClose={() => setEditing(null)} onSave={async (form) => { const ok = await save(form, editing === 'new' ? null : editing); if (ok) setEditing(null) }} />}
  </Card>
}

function GoalEditor({ goal, manages, onClose, onSave }: { goal: HrGoal | null; manages: boolean; onClose: () => void; onSave: (form: typeof blank) => Promise<void> }) {
  const [form, setForm] = useState(goal ? { title: goal.title, measure: goal.measure, target: goal.target, data_source: goal.data_source, is_development_goal: goal.is_development_goal, due_date: goal.due_date || '', progress_notes: goal.progress_notes, status: goal.status, rating: goal.rating } : blank)
  const [saving, setSaving] = useState(false); const editable = manages || !goal || goal.status === 'draft'
  const term = forbiddenGoalTerm(form.title, form.measure, form.target)
  const set = (patch: Partial<typeof blank>) => setForm((current) => ({ ...current, ...patch }))
  return <Modal title={goal ? 'Edit goal' : 'New goal'} eyebrow="Goals and KPIs" onClose={onClose}><form onSubmit={async (e) => { e.preventDefault(); if (term) return; setSaving(true); await onSave(form); setSaving(false) }} className="space-y-4">
    <Field label="Goal" hint="what, by when"><input required disabled={!editable} maxLength={300} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Run 5 supervised Hormone Balance follow-ups by 30 June with no documentation gaps" className="input" /></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="How we will know"><input disabled={!editable} maxLength={2000} value={form.measure} onChange={(e) => set({ measure: e.target.value })} className="input" /></Field><Field label="Target"><input disabled={!editable} maxLength={1000} value={form.target} onChange={(e) => set({ target: e.target.value })} className="input" /></Field></div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Data source"><input disabled={!editable} maxLength={500} value={form.data_source} onChange={(e) => set({ data_source: e.target.value })} placeholder="Follow-ups, case review, Training tab…" className="input" /></Field><Field label="Due"><input disabled={!editable} type="date" value={form.due_date} onChange={(e) => set({ due_date: e.target.value })} className="input" /></Field></div>
    <label className="flex items-center gap-2 text-sm font-bold text-green-deep"><input type="checkbox" disabled={!editable} checked={form.is_development_goal} onChange={(e) => set({ is_development_goal: e.target.checked })} />Development goal (skill, course or CPD)</label>
    {term && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{goalTermError(term)}</p>}
    {goal && <Field label="Progress notes"><textarea rows={4} maxLength={4000} value={form.progress_notes} onChange={(e) => set({ progress_notes: e.target.value })} className="input" /></Field>}
    {manages && <div className="grid gap-4 sm:grid-cols-2"><Field label="Status"><select value={form.status} onChange={(e) => set({ status: e.target.value as GoalStatus })} className="input">{goalStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field><Field label="Rating"><RatingSelect value={form.rating} onChange={(rating) => set({ rating })} /></Field></div>}
    <Buttons onCancel={onClose} saving={saving} label="Save goal" /></form></Modal>
}
