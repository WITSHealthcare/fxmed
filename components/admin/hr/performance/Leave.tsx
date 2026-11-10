'use client'

import { useState } from 'react'
import { labelOf, leaveStatuses, leaveTypes, managerMaxLeaveDays, type HrEmployee, type LeaveType } from '@/lib/hr'
import { lagosDate } from '@/lib/follow-ups'
import { countWorkingDays, displayDate, leaveApprovalLevel, leaveNoticeWarning, type HrLeaveRequest, type HrPublicHoliday, type LeaveBalanceView, type PerformanceFile } from '@/lib/hr-performance'
import { Badge, Buttons, Card, Empty, Field, Modal, call, nameOf, primaryButton, smallButton, statusTone } from './ui'

type Props = { file: PerformanceFile; employees: HrEmployee[]; holidays: HrPublicHoliday[]; reload: () => Promise<void>; onError: (message: string) => void; onNotice: (message: string) => void }
type Editing = { mode: 'request' } | { mode: 'decide' | 'return' | 'employer'; request: HrLeaveRequest } | { mode: 'balance'; balance: LeaveBalanceView }

export default function Leave({ file, employees, holidays, reload, onError, onNotice }: Props) {
  const [editing, setEditing] = useState<Editing | null>(null); const { access } = file; const today = lagosDate()
  async function send(path: string, method: string, body: Record<string, unknown>, done: string) {
    const result = await call(path, method, body); if (!result.ok) { onError(result.data.error || 'Could not save.'); return false }
    onNotice([done, ...(result.data.warnings || [])].join(' ')); setEditing(null); await reload(); return true
  }
  const thisYear = file.leave.filter((item) => item.start_date.startsWith(String(file.year)))
  return <div className="space-y-5">
    <Card title={`Leave balance ${file.year}`} description="Remaining = entitlement + carried over + adjustments − taken − awaiting approval. Carried-over days must be used by 31 March."
      action={access.isSelf || access.isAdmin ? <button onClick={() => setEditing({ mode: 'request' })} className={primaryButton}>{access.isSelf ? 'Request leave' : 'Record leave'}</button> : undefined}>
      {!file.balances.length ? <Empty>No balances.</Empty> : <div className="grid gap-px bg-gray-100 sm:grid-cols-2 lg:grid-cols-4">{file.balances.map((balance) => <div key={balance.leave_type} className="bg-white p-5">
        <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-green-mid">{labelOf(leaveTypes, balance.leave_type)}</p>{access.isAdmin && <button onClick={() => setEditing({ mode: 'balance', balance })} className="text-xs font-bold text-green-mid">Adjust</button>}</div>
        <p className="mt-2 text-3xl font-bold text-green-deep">{balance.remaining}<span className="text-sm font-normal text-text-mid"> days left</span></p>
        <p className="mt-1 text-xs text-gray-500">{balance.entitled} entitled{balance.carried_over ? ` · ${balance.carried_usable}/${balance.carried_over} carried (to ${displayDate(balance.carry_over_expires_on)})` : ''}{balance.adjustment ? ` · ${balance.adjustment > 0 ? '+' : ''}${balance.adjustment} adjusted` : ''} · {balance.taken} taken{balance.pending ? ` · ${balance.pending} pending` : ''}{!balance.balance_id ? ' · default' : ''}</p>
      </div>)}</div>}
    </Card>
    <Card title="Leave requests" description={`Line managers decide annual, sick, compassionate, paternity and time off in lieu up to ${managerMaxLeaveDays} working days; the Managing Director decides the rest.`}>
      {!file.leave.length ? <Empty>No leave requests.</Empty> : <div className="divide-y">{file.leave.map((request) => {
        const canDecide = request.status === 'submitted' && (access.isAdmin || (access.isManager && request.approval_level === 'manager'))
        const canCancel = (access.isSelf || access.isAdmin) && (request.status === 'submitted' || (['approved', 'approved_with_changes'].includes(request.status) && request.start_date > today))
        return <div key={request.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div className="min-w-[220px] flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-green-deep">{labelOf(leaveTypes, request.leave_type)} · {request.working_days} day(s)</h4><Badge tone={statusTone(request.status)}>{labelOf(leaveStatuses, request.status)}</Badge>{request.status === 'submitted' && <Badge tone="gray">{request.approval_level === 'md' ? 'Managing Director' : 'Line manager'}</Badge>}{request.pay_treatment !== 'full' && <Badge tone="amber">{request.pay_treatment} pay</Badge>}</div>
            <p className="mt-1 text-sm text-text-mid">{displayDate(request.start_date)} – {displayDate(request.end_date)}{request.cover_employee_id ? ` · cover ${nameOf(employees, request.cover_employee_id)}` : ''}</p>
            {request.reason && <p className="mt-1 text-sm text-text-mid">Reason: {request.reason}</p>}
            {request.decision_reason && <p className="mt-1 text-sm text-text-mid">Decision note: {request.decision_reason}</p>}
            {request.returned_on && <p className="mt-1 text-xs text-gray-500">Returned {displayDate(request.returned_on)}{request.return_meeting_at ? ` · return meeting ${displayDate(request.return_meeting_at)}` : ''}</p>}</div>
          <div className="flex flex-wrap gap-2">
            {canDecide && <button onClick={() => setEditing({ mode: 'decide', request })} className={smallButton}>Decide</button>}
            {(access.isAdmin || access.isManager) && ['approved', 'approved_with_changes'].includes(request.status) && request.start_date <= today && <button onClick={() => setEditing({ mode: 'return', request })} className={smallButton}>Confirm return</button>}
            {access.isAdmin && ['approved', 'approved_with_changes'].includes(request.status) && request.start_date > today && <button onClick={() => setEditing({ mode: 'employer', request })} className="px-2 text-xs font-bold text-red-600">Cancel for business</button>}
            {canCancel && <button onClick={() => { if (confirm('Cancel this leave request?')) send('/leave', 'PATCH', { id: request.id, action: 'cancel' }, 'Leave cancelled.') }} className="px-2 text-xs font-bold text-red-600">Cancel</button>}
          </div>
        </div>
      })}</div>}
      {thisYear.length > 0 && <p className="border-t px-5 py-3 text-xs text-text-mid">{thisYear.filter((item) => item.status === 'submitted').length} awaiting decision this year.</p>}
    </Card>
    {editing?.mode === 'request' && <RequestForm file={file} employees={employees} holidays={holidays} onClose={() => setEditing(null)} onSave={(body) => send('/leave', 'POST', { ...body, employee_id: file.employee.id }, 'Leave request submitted.')} />}
    {editing && (editing.mode === 'decide' || editing.mode === 'return' || editing.mode === 'employer') && <DecideLeave mode={editing.mode} request={editing.request} isAdmin={access.isAdmin} employeeName={file.employee.legal_name} holidays={holidays} onClose={() => setEditing(null)} onSave={(body, done) => send('/leave', 'PATCH', { ...body, id: editing.request.id }, done)} />}
    {editing?.mode === 'balance' && <AdjustBalance balance={editing.balance} onClose={() => setEditing(null)} onSave={(body) => send('/leave/balances', 'PATCH', { ...body, employee_id: file.employee.id, leave_type: editing.balance.leave_type, leave_year: file.year }, 'Balance updated.')} />}
  </div>
}

function RequestForm({ file, employees, holidays, onClose, onSave }: { file: PerformanceFile; employees: HrEmployee[]; holidays: HrPublicHoliday[]; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [form, setForm] = useState({ leave_type: 'annual' as LeaveType, start_date: '', end_date: '', reason: '', cover_employee_id: '', handover_notes: '' }); const [saving, setSaving] = useState(false)
  const days = form.start_date && form.end_date && form.end_date >= form.start_date ? countWorkingDays(form.start_date, form.end_date, holidays.map((item) => item.holiday_date)) : 0
  const balance = file.balances.find((item) => item.leave_type === form.leave_type)
  const over = !!balance && form.leave_type !== 'unpaid' && days > balance.remaining
  const level = days ? leaveApprovalLevel(form.leave_type, days, ['probation', 'probation_extended'].includes(file.employee.status), over) : null
  const notice = days ? leaveNoticeWarning(form.leave_type, form.start_date, days, lagosDate()) : null
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }))
  return <Modal title={file.access.isSelf ? 'Request leave' : `Record leave for ${file.employee.legal_name}`} eyebrow="Leave" onClose={onClose}><form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave(form); setSaving(false) }} className="space-y-4">
    <Field label="Type"><select value={form.leave_type} onChange={(e) => set({ leave_type: e.target.value as LeaveType })} className="input">{leaveTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="First day"><input required type="date" value={form.start_date} onChange={(e) => set({ start_date: e.target.value, end_date: form.end_date && form.end_date >= e.target.value ? form.end_date : e.target.value })} className="input" /></Field><Field label="Last day"><input required type="date" min={form.start_date || undefined} value={form.end_date} onChange={(e) => set({ end_date: e.target.value })} className="input" /></Field></div>
    {days > 0 && <div className="rounded-xl bg-[#fbfaf6] p-4 text-sm text-text-mid"><strong className="text-green-deep">{days} working day(s)</strong> (weekends and public holidays excluded){balance ? ` · ${balance.remaining} left` : ''} · decided by the {level === 'md' ? 'Managing Director' : 'line manager'}{over ? '. This is more than your remaining balance.' : '.'}{notice ? ` ${notice}` : ''}</div>}
    {form.leave_type === 'sick' && <p className="text-xs text-text-mid">Phone your supervisor before your start time. Self-certify days 1–2; a medical certificate is needed from day 3 (upload it to your HR file). Only you and People Ops see sick-leave reasons.</p>}
    <Field label="Reason" hint={['compassionate', 'study', 'unpaid'].includes(form.leave_type) ? 'required' : 'optional'}><textarea rows={2} maxLength={2000} required={['compassionate', 'study', 'unpaid'].includes(form.leave_type)} value={form.reason} onChange={(e) => set({ reason: e.target.value })} className="input" /></Field>
    <Field label="Cover arranged with"><select value={form.cover_employee_id} onChange={(e) => set({ cover_employee_id: e.target.value })} className="input"><option value="">Not arranged yet</option>{employees.filter((item) => item.id !== file.employee.id && item.status !== 'exited').map((item) => <option key={item.id} value={item.id}>{item.preferred_name || item.legal_name} · {item.job_title}</option>)}</select></Field>
    <Field label="Handover" hint="open patients, follow-ups, leads"><textarea rows={3} maxLength={4000} value={form.handover_notes} onChange={(e) => set({ handover_notes: e.target.value })} className="input" /></Field>
    <Buttons onCancel={onClose} saving={saving} label="Submit request" /></form></Modal>
}

export function DecideLeave({ mode, request, isAdmin, employeeName, holidays, onClose, onSave }: { mode: 'decide' | 'return' | 'employer'; request: HrLeaveRequest; isAdmin: boolean; employeeName: string; holidays: HrPublicHoliday[]; onClose: () => void; onSave: (body: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const [form, setForm] = useState({ decision: 'approved', decision_reason: '', start_date: request.start_date, end_date: request.end_date, pay_treatment: request.pay_treatment, returned_on: lagosDate(), return_meeting_at: '' }); const [saving, setSaving] = useState(false)
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }))
  const days = form.end_date >= form.start_date ? countWorkingDays(form.start_date, form.end_date, holidays.map((item) => item.holiday_date)) : 0
  const submit = async (body: Record<string, unknown>, done: string) => { setSaving(true); await onSave(body, done); setSaving(false) }
  const summary = <p className="text-sm text-text-mid">{employeeName}: {labelOf(leaveTypes, request.leave_type)}, {displayDate(request.start_date)} – {displayDate(request.end_date)} ({request.working_days} working days).{request.reason ? ` Reason: ${request.reason}` : ''}{request.handover_notes ? ` Handover: ${request.handover_notes}` : ''}</p>
  if (mode === 'return') return <Modal title="Confirm return" eyebrow="Leave" onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); submit({ action: 'return', returned_on: form.returned_on, return_meeting_at: form.return_meeting_at ? `${form.return_meeting_at}T09:00:00+01:00` : null }, 'Return recorded.') }} className="space-y-4">{summary}
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Back at work on"><input type="date" value={form.returned_on} onChange={(e) => set({ returned_on: e.target.value })} className="input" /></Field><Field label="Return-to-work meeting" hint="after 5+ days sick or maternity"><input type="date" value={form.return_meeting_at} onChange={(e) => set({ return_meeting_at: e.target.value })} className="input" /></Field></div>
    <Buttons onCancel={onClose} saving={saving} label="Confirm return" /></form></Modal>
  if (mode === 'employer') return <Modal title="Cancel approved leave" eyebrow="Leave" onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); submit({ action: 'cancel_by_employer', decision_reason: form.decision_reason }, 'Leave cancelled. Reimburse any non-refundable costs on receipt.') }} className="space-y-4">{summary}
    <Field label="Business reason"><textarea required rows={3} maxLength={2000} value={form.decision_reason} onChange={(e) => set({ decision_reason: e.target.value })} className="input" /></Field>
    <Buttons onCancel={onClose} saving={saving} label="Cancel leave" /></form></Modal>
  return <Modal title="Decide leave" eyebrow="Leave" onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); submit({ action: 'decide', ...form }, form.decision === 'declined' ? 'Request declined.' : 'Leave approved.') }} className="space-y-4">{summary}
    <p className="text-xs text-text-mid">Check booked visits, consults and programme sessions for cover. Clashes: patient cover first, then first submitted. Do not refuse sick or maternity leave because of workload.</p>
    <Field label="Decision"><select value={form.decision} onChange={(e) => set({ decision: e.target.value })} className="input"><option value="approved">Approve</option><option value="approved_with_changes">Approve with changes</option><option value="declined">Decline</option></select></Field>
    {form.decision === 'approved_with_changes' && <div className="grid gap-4 sm:grid-cols-2"><Field label="First day"><input type="date" value={form.start_date} onChange={(e) => set({ start_date: e.target.value })} className="input" /></Field><Field label="Last day" hint={`${days} working day(s)`}><input type="date" min={form.start_date} value={form.end_date} onChange={(e) => set({ end_date: e.target.value })} className="input" /></Field></div>}
    {form.decision !== 'approved' && <Field label={form.decision === 'declined' ? 'Reason for declining' : 'What changed and why'}><textarea required rows={3} maxLength={2000} value={form.decision_reason} onChange={(e) => set({ decision_reason: e.target.value })} className="input" /></Field>}
    {isAdmin && form.decision !== 'declined' && <Field label="Pay" hint="sick leave past 12 days is at the MD's discretion"><select value={form.pay_treatment} onChange={(e) => set({ pay_treatment: e.target.value as typeof form.pay_treatment })} className="input"><option value="full">Full pay</option><option value="half">Half pay</option><option value="unpaid">Unpaid</option></select></Field>}
    <Buttons onCancel={onClose} saving={saving} label="Save decision" /></form></Modal>
}

function AdjustBalance({ balance, onClose, onSave }: { balance: LeaveBalanceView; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<boolean> }) {
  const [form, setForm] = useState({ entitled_days: String(balance.entitled), carried_over_days: String(balance.carried_over), adjustment_days: String(balance.adjustment), adjustment_reason: '' }); const [saving, setSaving] = useState(false)
  return <Modal title={`${labelOf(leaveTypes, balance.leave_type)} leave ${balance.leave_year}`} eyebrow="Adjust balance" onClose={onClose}><form onSubmit={async (e) => { e.preventDefault(); setSaving(true); await onSave({ ...form, pro_rata_factor: 1 }); setSaving(false) }} className="space-y-4">
    <p className="text-sm text-text-mid">Saving stores the entitlement after pro-rata. Taken and pending days always come from the requests.</p>
    <div className="grid gap-4 sm:grid-cols-3"><Field label="Entitled days"><input type="number" step="0.5" min="0" value={form.entitled_days} onChange={(e) => setForm({ ...form, entitled_days: e.target.value })} className="input" /></Field><Field label="Carried over"><input type="number" step="0.5" min="0" value={form.carried_over_days} onChange={(e) => setForm({ ...form, carried_over_days: e.target.value })} className="input" /></Field><Field label="Adjustment"><input type="number" step="0.5" value={form.adjustment_days} onChange={(e) => setForm({ ...form, adjustment_days: e.target.value })} className="input" /></Field></div>
    <Field label="Reason for the adjustment"><input maxLength={1000} required={Number(form.adjustment_days) !== 0} value={form.adjustment_reason} onChange={(e) => setForm({ ...form, adjustment_reason: e.target.value })} placeholder="e.g. time off in lieu for the Eid on-call rota" className="input" /></Field>
    <Buttons onCancel={onClose} saving={saving} label="Save balance" /></form></Modal>
}
