'use client'

import { useCallback, useEffect, useState } from 'react'
import { checklistOwners, hrDepartments, hrEmploymentTypes, labelOf, onboardingCategories, onboardingStages, type ChecklistOwner, type OnboardingCategory, type OnboardingStage } from '@/lib/hr'
import { standardOnboardingItems, type ChecklistTemplateItem, type HrChecklistTemplate } from '@/lib/hr-people'
import { Alert, Card, Empty, Field, Modal, buttonPrimary, buttonSecondary, call, peopleApi } from './ui'

// Admin: onboarding checklist templates (kind = 'onboarding').
const api = `${peopleApi}/templates`
type Form = { title: string; departments: string[]; employment_types: string[]; active: boolean; items: ChecklistTemplateItem[] }

export default function Templates() {
  const [templates, setTemplates] = useState<HrChecklistTemplate[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [editing, setEditing] = useState<HrChecklistTemplate | 'new' | null>(null)
  const load = useCallback(async () => { setError(''); try { setTemplates((await call<{ templates: HrChecklistTemplate[] }>(api)).templates) } catch (err) { setError((err as Error).message) } setLoading(false) }, [])
  useEffect(() => { load() }, [load])
  async function remove(template: HrChecklistTemplate) { if (!confirm(`Delete the template "${template.title}"? Checklists already generated from it stay.`)) return; try { await call(`${api}?id=${template.id}`, 'DELETE'); load() } catch (err) { setError((err as Error).message) } }
  return <div className="space-y-4"><Alert>{error}</Alert>
    <Card title="Onboarding templates" description="Checklists from docs/hr/onboarding.md. Apply one to a new hire from their file; due dates count from the start date." action={<button onClick={() => setEditing('new')} className={buttonPrimary}>+ New template</button>}>
      {loading ? <Empty>Loading…</Empty> : !templates.length ? <Empty>No templates yet. Start from the standard FXMed checklist.</Empty> : <div className="divide-y">{templates.map((t) => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-6"><div><p className="font-bold text-green-deep">{t.title}{!t.active && <span className="ml-2 text-xs font-normal text-gray-400">(inactive)</span>}</p><p className="mt-1 text-xs text-gray-500">{t.items.length} items · {t.departments.join(', ') || 'All departments'} · {t.employment_types.join(', ') || 'All employment types'}</p></div><div className="flex gap-2"><button onClick={() => setEditing(t)} className={buttonSecondary}>Edit</button><button onClick={() => remove(t)} className="px-2 text-xs font-bold text-red-600">Delete</button></div></div>)}</div>}
    </Card>
    {editing && <Editor template={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
  </div>
}

function Editor({ template, onClose, onSaved }: { template: HrChecklistTemplate | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(template ? { title: template.title, departments: template.departments, employment_types: template.employment_types, active: template.active, items: template.items } : { title: 'Standard FXMed onboarding', departments: [], employment_types: [], active: true, items: standardOnboardingItems })
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const setItem = (index: number, patch: Partial<ChecklistTemplateItem>) => setForm({ ...form, items: form.items.map((item, i) => i === index ? { ...item, ...patch } : item) })
  const toggle = (key: 'departments' | 'employment_types', value: string) => setForm({ ...form, [key]: form[key].includes(value) ? form[key].filter((v) => v !== value) : [...form[key], value] })
  async function save(e: React.FormEvent) { e.preventDefault(); setSaving(true); setError(''); try { await call(api, template ? 'PATCH' : 'POST', { ...form, ...(template ? { id: template.id } : {}) }); onSaved() } catch (err) { setError((err as Error).message) } setSaving(false) }
  return <Modal wide title={template ? 'Edit template' : 'New onboarding template'} eyebrow="Onboarding" onClose={onClose}><form onSubmit={save} className="space-y-5"><Alert>{error}</Alert>
    <div className="grid gap-4 sm:grid-cols-[2fr_1fr]"><Field label="Title"><input required maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" /></Field><label className="flex items-center gap-2 pt-7 text-sm font-bold text-green-deep"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Active</label></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><p className="text-sm font-bold text-green-deep">Departments <span className="font-normal text-gray-400">— none means all</span></p><div className="mt-2 flex flex-wrap gap-3">{hrDepartments.map((d) => <label key={d} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.departments.includes(d)} onChange={() => toggle('departments', d)} />{d}</label>)}</div></div>
      <div><p className="text-sm font-bold text-green-deep">Employment types <span className="font-normal text-gray-400">— none means all</span></p><div className="mt-2 flex flex-wrap gap-3">{hrEmploymentTypes.map((d) => <label key={d} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.employment_types.includes(d)} onChange={() => toggle('employment_types', d)} />{d}</label>)}</div></div></div>
    <div className="rounded-2xl border bg-[#fbfaf6] p-4"><div className="flex items-center justify-between"><h4 className="font-bold text-green-deep">{form.items.length} items</h4>{!template && form.items !== standardOnboardingItems && <button type="button" onClick={() => setForm({ ...form, items: standardOnboardingItems })} className="text-xs font-bold text-green-mid">Reset to the standard checklist</button>}</div>
      <div className="mt-3 space-y-2">{form.items.map((item, i) => <div key={i} className="grid gap-2 rounded-xl bg-white p-3 sm:grid-cols-[3fr_1fr_1fr_1fr_80px_auto]">
        <input required aria-label="Item" maxLength={300} value={item.item} onChange={(e) => setItem(i, { item: e.target.value })} className="input mt-0" />
        <select aria-label="Stage" value={item.stage} onChange={(e) => setItem(i, { stage: e.target.value as OnboardingStage })} className="input mt-0">{onboardingStages.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        <select aria-label="Category" value={item.category} onChange={(e) => setItem(i, { category: e.target.value as OnboardingCategory })} className="input mt-0">{onboardingCategories.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        <select aria-label="Owner" value={item.owner} onChange={(e) => setItem(i, { owner: e.target.value as ChecklistOwner })} className="input mt-0">{checklistOwners.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        <input aria-label="Due (days from start)" title={`Days from start (${labelOf(onboardingStages, item.stage)})`} type="number" min={-90} max={365} value={item.due_offset_days} onChange={(e) => setItem(i, { due_offset_days: Number(e.target.value) })} className="input mt-0" />
        <button type="button" aria-label="Remove item" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })} className="px-2 text-red-600">×</button></div>)}</div>
      <p className="mt-2 text-xs text-text-mid">The number is days from the start date (negative = before day one).</p>
      <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { item: '', stage: 'pre_start', category: 'other', owner: 'hr', due_offset_days: 0 }] })} className="mt-3 text-xs font-bold text-green-mid">+ Add item</button></div>
    <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-full border px-5 py-3 text-sm font-bold">Cancel</button><button disabled={saving} className={buttonPrimary}>{saving ? 'Saving…' : 'Save template'}</button></div>
  </form></Modal>
}
