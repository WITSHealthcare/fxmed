'use client'

import { useEffect, useState } from 'react'
import { checklistItemStatuses, checklistOwners, labelOf, onboardingCategories, onboardingStages, type ChecklistItemStatus, type ChecklistOwner, type OnboardingCategory, type OnboardingStage } from '@/lib/hr'
import type { HrChecklistTemplate, HrOnboardingItem } from '@/lib/hr-people'
import type { FileDetail } from './types'
import { Badge, Empty, Field, buttonPrimary, buttonSecondary, call, formatDay, peopleApi } from './ui'

const api = `${peopleApi}/onboarding`
const statusTone: Record<ChecklistItemStatus, string> = { pending: 'bg-gray-100 text-gray-600', done: 'bg-green-50 text-green-700', exception_approved: 'bg-amber-50 text-amber-700', not_applicable: 'bg-gray-100 text-gray-500' }

export default function Onboarding({ employee, items, tick, onChange, onError }: { employee: FileDetail['employee']; items: HrOnboardingItem[]; tick: FileDetail['can']['tickOnboarding']; onChange: () => void; onError: (message: string) => void }) {
  const admin = tick === 'all'; const [busy, setBusy] = useState(false); const [templates, setTemplates] = useState<HrChecklistTemplate[]>([]); const [templateId, setTemplateId] = useState('')
  const [draft, setDraft] = useState({ item: '', stage: 'pre_start' as OnboardingStage, category: 'documents' as OnboardingCategory, owner: 'hr' as ChecklistOwner, due_date: '' })
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' })
  useEffect(() => { if (admin) call<{ templates: HrChecklistTemplate[] }>(`${peopleApi}/templates`).then(({ templates }) => { setTemplates(templates); const match = templates.find((t) => t.active && (!t.departments.length || t.departments.includes(employee.department)) && (!t.employment_types.length || t.employment_types.includes(employee.employment_type))); setTemplateId(match?.id || templates[0]?.id || '') }).catch((error) => onError(error.message)) }, [admin, employee.department, employee.employment_type, onError])
  async function run(method: string, body?: unknown, url = api) { setBusy(true); onError(''); try { await call(url, method, body); onChange() } catch (error) { onError((error as Error).message) } setBusy(false) }
  function setStatus(item: HrOnboardingItem, status: ChecklistItemStatus) {
    if (status === 'exception_approved') { const reason = prompt('Written reason for the exception (approved by the MD / Medical Director):'); if (!reason) return; return run('PATCH', { id: item.id, status, exception_reason: reason }) }
    return run('PATCH', { id: item.id, status })
  }
  const closed = items.filter((i) => i.status !== 'pending').length
  return <div>
    <div className="border-b px-6 py-4"><div className="flex items-center justify-between text-sm"><span className="font-bold text-green-deep">{closed} of {items.length} items closed</span>{employee.start_date && <span className="text-xs text-text-mid">Start date {formatDay(employee.start_date)}</span>}</div><div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gold" style={{ width: `${items.length ? Math.round(closed / items.length * 100) : 0}%` }} /></div>
      {!admin && tick && <p className="mt-2 text-xs text-text-mid">You can tick items owned by {tick === 'employee' ? 'the new starter' : 'the line manager'}. People Ops closes the rest.</p>}</div>
    {!items.length ? <Empty>{admin ? 'No checklist yet. Apply a template below.' : 'No onboarding checklist on file.'}</Empty> : onboardingStages.map((stage) => {
      const rows = items.filter((i) => i.stage === stage.value); if (!rows.length) return null
      const done = rows.filter((i) => i.status !== 'pending').length
      return <div key={stage.value} className="border-b last:border-b-0"><div className="flex items-center justify-between bg-[#fbfaf6] px-6 py-3"><h4 className="font-bold text-green-deep">{stage.label}</h4><span className="text-xs font-bold text-green-mid">{done}/{rows.length}</span></div>
        <ul className="divide-y">{rows.map((item) => { const mine = admin || tick === item.owner; const open = item.status === 'pending' || item.status === 'done'; const overdue = item.status === 'pending' && item.due_date && item.due_date < today
          return <li key={item.id} className="flex flex-wrap items-start gap-3 px-6 py-3">
            <input type="checkbox" aria-label={`Mark "${item.item}" done`} checked={item.status !== 'pending'} disabled={busy || !mine || !open} onChange={(e) => setStatus(item, e.target.checked ? 'done' : 'pending')} className="mt-1 h-4 w-4 accent-green-deep" />
            <div className="min-w-[220px] flex-1"><p className={`text-sm ${item.status === 'pending' ? 'text-green-deep' : 'text-gray-500'}`}>{item.item}</p>
              <p className="mt-1 text-xs text-gray-500">{labelOf(checklistOwners, item.owner)} · {labelOf(onboardingCategories, item.category)}{item.due_date ? ` · due ${formatDay(item.due_date)}` : ''}{overdue ? ' · ' : ''}{overdue && <span className="font-bold text-red-600">overdue</span>}{item.completed_at && item.status === 'done' ? ` · done ${formatDay(item.completed_at)}` : ''}</p>
              {item.status === 'exception_approved' && <p className="mt-1 text-xs text-amber-700">Exception: {item.exception_reason} ({formatDay(item.exception_approved_at)})</p>}</div>
            {admin ? <div className="flex items-center gap-2"><select aria-label="Status" disabled={busy} value={item.status} onChange={(e) => setStatus(item, e.target.value as ChecklistItemStatus)} className="rounded-full border px-3 py-1.5 text-xs font-bold text-green-deep">{checklistItemStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select><button disabled={busy} onClick={() => confirm('Remove this item from the checklist?') && run('DELETE', undefined, `${api}?id=${item.id}`)} className="px-1 text-xs font-bold text-red-600">×</button></div> : <Badge tone={statusTone[item.status]}>{labelOf(checklistItemStatuses, item.status)}</Badge>}
          </li> })}</ul></div>
    })}
    {admin && <div className="space-y-4 border-t bg-[#fbfaf6] p-6">
      <div className="flex flex-wrap items-end gap-3"><Field label="Apply a template" hint="items already on the list are skipped" className="min-w-[240px] flex-1"><select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="input">{!templates.length && <option value="">No templates yet: create one under Onboarding templates</option>}{templates.map((t) => <option key={t.id} value={t.id}>{t.title}{t.active ? '' : ' (inactive)'}</option>)}</select></Field><button disabled={busy || !templateId} onClick={() => run('POST', { employee_id: employee.id, template_id: templateId })} className={buttonPrimary}>Generate items</button></div>
      {!employee.start_date && <p className="text-xs text-amber-700">Set a start date on the file first so due dates can be worked out.</p>}
      <form onSubmit={(e) => { e.preventDefault(); if (draft.item.trim()) run('POST', { employee_id: employee.id, ...draft }).then(() => setDraft({ ...draft, item: '', due_date: '' })) }} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] sm:items-end">
        <Field label="Add an item"><input maxLength={300} value={draft.item} onChange={(e) => setDraft({ ...draft, item: e.target.value })} className="input" /></Field>
        <Field label="Stage"><select value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value as OnboardingStage })} className="input">{onboardingStages.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
        <Field label="Category"><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as OnboardingCategory })} className="input">{onboardingCategories.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
        <Field label="Owner"><select value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value as ChecklistOwner })} className="input">{checklistOwners.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>
        <Field label="Due"><input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} className="input" /></Field>
        <button disabled={busy || !draft.item.trim()} className={buttonSecondary}>Add</button></form>
    </div>}
  </div>
}
