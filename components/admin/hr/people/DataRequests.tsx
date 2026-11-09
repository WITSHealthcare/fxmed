'use client'

import { useCallback, useEffect, useState } from 'react'
import { labelOf } from '@/lib/hr'
import { dataRequestDueDays, dataRequestStatuses, dataRequestTypes, type DataRequestStatus, type DataRequestType, type HrDataRequest, type HrRetentionLogEntry } from '@/lib/hr-people'
import { Alert, Badge, Card, Empty, Field, Modal, buttonPrimary, buttonSecondary, call, formatDay, peopleApi } from './ui'

// Admin: NDPA requests from staff and candidates, and the retention log.
const api = `${peopleApi}/data-requests`
type Data = { requests: HrDataRequest[]; log: HrRetentionLogEntry[]; employees: { id: string; legal_name: string; preferred_name: string | null }[]; candidates: Record<string, string> }
const statusTone: Record<DataRequestStatus, string> = { received: 'bg-blue-50 text-blue-700', in_progress: 'bg-amber-50 text-amber-700', completed: 'bg-green-50 text-green-700', refused_with_reason: 'bg-gray-100 text-gray-600' }
const toLocal = (value: string | null) => value ? new Date(value).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }) : ''

export default function DataRequests() {
  const [data, setData] = useState<Data | null>(null); const [error, setError] = useState(''); const [editing, setEditing] = useState<HrDataRequest | 'new' | null>(null); const [now, setNow] = useState(0)
  const load = useCallback(async () => { setError(''); try { setData(await call<Data>(api)); setNow(Date.now()) } catch (err) { setError((err as Error).message) } }, [])
  useEffect(() => { load() }, [load])
  async function review(entry: HrRetentionLogEntry) { try { await call(api, 'PATCH', { log_id: entry.id }); load() } catch (err) { setError((err as Error).message) } }
  const names = new Map((data?.employees || []).map((e) => [e.id, e.preferred_name || e.legal_name]))
  return <div className="space-y-6"><Alert>{error}</Alert>
    <Card title="NDPA data requests" description={`Copies of files, corrections, erasure, consent withdrawal, reference requests and breaches. Default deadline ${dataRequestDueDays} days until counsel confirms.`} action={<button onClick={() => setEditing('new')} className={buttonPrimary}>+ Log request</button>}>
      {!data ? <Empty>Loading…</Empty> : !data.requests.length ? <Empty>No requests logged.</Empty> : <div className="divide-y">{data.requests.map((r) => { const open = r.status === 'received' || r.status === 'in_progress'; const overdue = open && r.due_at && Date.parse(r.due_at) < now
        return <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-6"><div className="min-w-[240px] flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-green-deep">{r.subject_name}</p><Badge tone={statusTone[r.status]}>{labelOf(dataRequestStatuses, r.status)}</Badge>{overdue && <Badge tone="bg-red-50 text-red-700">Overdue</Badge>}</div>
          <p className="mt-1 text-sm text-text-mid">{labelOf(dataRequestTypes, r.request_type)} · {r.employee_id ? `Staff: ${names.get(r.employee_id) || 'employee'}` : r.candidate_id ? `Candidate: ${data.candidates[r.candidate_id] || ''}` : 'Not linked'}</p>
          <p className="mt-1 text-xs text-gray-500">Received {formatDay(r.received_at)} · due {formatDay(r.due_at)}{r.completed_at ? ` · closed ${formatDay(r.completed_at)}` : ''}{r.ndpc_notified_at ? ` · NDPC notified ${formatDay(r.ndpc_notified_at)}` : ''}</p>{r.outcome && <p className="mt-1 whitespace-pre-wrap text-xs text-text-mid">{r.outcome}</p>}</div>
          <button onClick={() => setEditing(r)} className={buttonSecondary}>Update</button></div> })}</div>}
    </Card>
    <Card title="Retention log" description="Evidence of every deletion and anonymisation (documents, bank details, candidate records). Review each entry.">
      {!data ? <Empty>Loading…</Empty> : !data.log.length ? <Empty>Nothing deleted or anonymised yet.</Empty> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#fbfaf6] text-xs uppercase tracking-wide text-green-mid"><tr><th className="px-6 py-3">When</th><th className="px-3 py-3">Record</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Rule</th><th className="px-6 py-3">Reviewed</th></tr></thead>
        <tbody className="divide-y">{data.log.map((entry) => <tr key={entry.id}><td className="px-6 py-3 text-xs">{formatDay(entry.run_at)}</td><td className="px-3 py-3 text-xs"><p className="font-bold text-green-deep">{entry.entity_type}</p><p className="font-mono text-gray-500">{entry.record_id}</p></td><td className="px-3 py-3 text-xs capitalize">{entry.action.replace(/_/g, ' ')}</td><td className="px-3 py-3 text-xs text-text-mid">{entry.retention_rule}</td><td className="px-6 py-3 text-xs">{entry.reviewed_at ? formatDay(entry.reviewed_at) : <button onClick={() => review(entry)} className={buttonSecondary}>Mark reviewed</button>}</td></tr>)}</tbody></table></div>}
    </Card>
    {editing && data && <RequestForm request={editing === 'new' ? null : editing} employees={data.employees} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
  </div>
}

function RequestForm({ request, employees, onClose, onSaved }: { request: HrDataRequest | null; employees: Data['employees']; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ request_type: (request?.request_type || 'access') as DataRequestType, subject: request?.candidate_id ? 'candidate' : 'employee', employee_id: request?.employee_id || '', candidate_email: '', subject_name: request?.subject_name || '', received_at: toLocal(request?.received_at || null), due_at: toLocal(request?.due_at || null), status: (request?.status || 'received') as DataRequestStatus, outcome: request?.outcome || '', notes: request?.notes || '', ndpc_notified_at: toLocal(request?.ndpc_notified_at || null) })
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })
  const day = (value: string) => value ? `${value}T12:00:00+01:00` : null
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (request) await call(api, 'PATCH', { id: request.id, status: form.status, outcome: form.outcome, notes: form.notes, due_at: day(form.due_at), ndpc_notified_at: day(form.ndpc_notified_at) })
      else await call(api, 'POST', { request_type: form.request_type, subject_name: form.subject_name, employee_id: form.subject === 'employee' ? form.employee_id : null, candidate_email: form.subject === 'candidate' ? form.candidate_email : null, received_at: day(form.received_at), due_at: day(form.due_at), notes: form.notes })
      onSaved()
    } catch (err) { setError((err as Error).message) }
    setSaving(false)
  }
  return <Modal title={request ? `Request from ${request.subject_name}` : 'Log an NDPA request'} eyebrow="Data protection" onClose={onClose}><form onSubmit={save} className="space-y-4"><Alert>{error}</Alert>
    {!request && <><div className="grid gap-4 sm:grid-cols-2"><Field label="Request"><select value={form.request_type} onChange={set('request_type')} className="input">{dataRequestTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
      <Field label="From"><select value={form.subject} onChange={set('subject')} className="input"><option value="employee">Staff member</option><option value="candidate">Candidate</option><option value="other">Someone else</option></select></Field>
      {form.subject === 'employee' && <Field label="Staff member"><select required value={form.employee_id} onChange={set('employee_id')} className="input"><option value="">Choose…</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.preferred_name || e.legal_name}</option>)}</select></Field>}
      {form.subject === 'candidate' && <Field label="Candidate email"><input required type="email" value={form.candidate_email} onChange={set('candidate_email')} className="input" /></Field>}
      <Field label="Name" hint={form.subject === 'other' ? undefined : 'optional'}><input required={form.subject === 'other'} maxLength={160} value={form.subject_name} onChange={set('subject_name')} className="input" /></Field>
      <Field label="Received"><input type="date" value={form.received_at} onChange={set('received_at')} className="input" /></Field></div></>}
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Due" hint={request ? undefined : `default ${dataRequestDueDays} days`}><input type="date" value={form.due_at} onChange={set('due_at')} className="input" /></Field>
      {request && <Field label="Status"><select value={form.status} onChange={set('status')} className="input">{dataRequestStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field>}
      {(request?.request_type || form.request_type) === 'breach' && request && <Field label="NDPC notified"><input type="date" value={form.ndpc_notified_at} onChange={set('ndpc_notified_at')} className="input" /></Field>}</div>
    {request && <Field label="Outcome" hint="required to close"><textarea rows={3} maxLength={5000} value={form.outcome} onChange={set('outcome')} className="input" placeholder="What was provided, corrected or deleted, or why it was refused" /></Field>}
    <Field label="Notes"><textarea rows={3} maxLength={5000} value={form.notes} onChange={set('notes')} className="input" /></Field>
    <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-full border px-5 py-3 text-sm font-bold">Cancel</button><button disabled={saving} className={buttonPrimary}>{saving ? 'Saving…' : 'Save'}</button></div>
  </form></Modal>
}
