'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Modal, Stat, buttonPrimary, buttonSecondary, call, formatDay } from '@/components/admin/hr/people/ui'
import type { TrackingRow, TrackingStatus } from '@/lib/training'

const api = '/api/admin/training/tracking'
type Summary = { id: string; title: string; status: string; visibility: string; enrolled: number; not_started: number; in_progress: number; completed: number; overdue: number; average_score: number | null }

const statusLabel: Record<TrackingStatus, string> = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed', overdue: 'Overdue', revoked: 'Revoked' }
const statusTone: Record<TrackingStatus, string> = {
  not_started: 'bg-gray-100 text-text-mid', in_progress: 'bg-gold/30 text-green-deep', completed: 'bg-green-50 text-green-700', overdue: 'bg-red-50 text-red-700', revoked: 'bg-gray-200 text-gray-500',
}
const dateInput = (value: string | null) => value ? new Date(value).toISOString().slice(0, 10) : ''

// Who is enrolled in what, how far they are, what is overdue, and quiz results.
export default function Tracking() {
  const [summary, setSummary] = useState<Summary[] | null>(null); const [rows, setRows] = useState<TrackingRow[]>([]); const [error, setError] = useState('')
  const [programId, setProgramId] = useState(''); const [status, setStatus] = useState<TrackingStatus | ''>(''); const [type, setType] = useState<'' | 'staff' | 'external'>(''); const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<TrackingRow | null>(null); const [enrolling, setEnrolling] = useState(false)

  const load = useCallback(async () => {
    try { const result = await call<{ summary: Summary[]; rows: TrackingRow[] }>(api); setSummary(result.summary); setRows(result.rows) }
    catch (loadError) { setError((loadError as Error).message); setSummary([]) }
  }, [])
  useEffect(() => { load() }, [load])

  const titles = useMemo(() => new Map((summary || []).map((item) => [item.id, item.title])), [summary])
  const filtered = rows.filter((row) => (!programId || row.program_id === programId) && (!status || row.status === status) && (!type || row.learner_type === type)
    && (!query || `${row.name} ${row.email}`.toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => (a.status === 'overdue' ? -1 : 0) - (b.status === 'overdue' ? -1 : 0) || a.name.localeCompare(b.name))
  const scope = (summary || []).filter((item) => !programId || item.id === programId)
  const total = (key: keyof Pick<Summary, 'enrolled' | 'not_started' | 'in_progress' | 'completed' | 'overdue'>) => scope.reduce((sum, item) => sum + item[key], 0)

  async function act(row: TrackingRow, action: string, extra: Record<string, unknown> = {}) {
    setError('')
    try { await call(api, 'POST', { action, programId: row.program_id, userId: row.user_id, ...extra }); setEditing(null); await load() }
    catch (actError) { setError((actError as Error).message) }
  }

  function exportCsv() {
    const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const header = ['Course', 'Learner', 'Email', 'Type', 'Joined via', 'Status', 'Progress %', 'Enrolled', 'Due', 'Last activity', 'Completed', 'Quiz average %', 'Quiz attempts', 'Certificate']
    const body = filtered.map((row) => [titles.get(row.program_id), row.name, row.email, row.learner_type, row.source, statusLabel[row.status], row.progress_percent, row.enrolled_at?.slice(0, 10), row.due_at?.slice(0, 10), row.last_activity_at?.slice(0, 10), row.completed_at?.slice(0, 10), row.quiz_average ?? '', row.attempts, row.certificate_id])
    const url = URL.createObjectURL(new Blob([[header, ...body].map((line) => line.map(cell).join(',')).join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = `training-tracking-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  if (!summary) return <div className="rounded-2xl border bg-white p-16 text-center text-text-mid">Loading tracking…</div>
  return <div className="space-y-6">
    <Alert>{error}</Alert>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4"><Stat label="Learners" value={total('enrolled')} /><Stat label="Not started" value={total('not_started')} /><Stat label="In progress" value={total('in_progress')} /><Stat label="Completed" value={total('completed')} /><Stat label="Overdue" value={total('overdue')} tone={total('overdue') ? 'text-red-600' : ''} /></div>

    <section className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-sm">
      <div className="border-b p-5"><h3 className="text-xl font-bold text-green-deep">By course</h3></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-[#fbfaf6] text-left text-xs uppercase tracking-wide text-green-mid"><tr><th className="p-3">Course</th><th className="p-3">Learners</th><th className="p-3">Not started</th><th className="p-3">In progress</th><th className="p-3">Completed</th><th className="p-3">Overdue</th><th className="p-3">Avg quiz</th></tr></thead>
        <tbody className="divide-y">{summary.map((item) => <tr key={item.id} className={`cursor-pointer hover:bg-gray-50 ${programId === item.id ? 'bg-green-50/60' : ''}`} onClick={() => setProgramId(programId === item.id ? '' : item.id)}>
          <td className="p-3 font-bold text-green-deep">{item.title}{item.status === 'draft' && <span className="ml-2 text-xs font-normal text-gray-400">draft</span>}</td><td className="p-3">{item.enrolled}</td><td className="p-3">{item.not_started}</td><td className="p-3">{item.in_progress}</td>
          <td className="p-3">{item.completed}{item.enrolled > 0 && <span className="ml-1 text-xs text-gray-400">({Math.round(item.completed / item.enrolled * 100)}%)</span>}</td><td className={`p-3 ${item.overdue ? 'font-bold text-red-600' : ''}`}>{item.overdue}</td><td className="p-3">{item.average_score === null ? '—' : `${item.average_score}%`}</td>
        </tr>)}</tbody></table></div>
    </section>

    <section className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b p-5">
        <h3 className="mr-auto text-xl font-bold text-green-deep">Learners</h3>
        <input aria-label="Search learners" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className="input mt-0 w-48" />
        <select aria-label="Course" value={programId} onChange={(e) => setProgramId(e.target.value)} className="input mt-0 w-auto"><option value="">All courses</option>{summary.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as TrackingStatus | '')} className="input mt-0 w-auto"><option value="">Any status</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="Learner type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className="input mt-0 w-auto"><option value="">Staff + external</option><option value="staff">Staff</option><option value="external">External</option></select>
        <button onClick={exportCsv} disabled={!filtered.length} className={buttonSecondary}>Export CSV</button>
        <button onClick={() => setEnrolling(true)} className={buttonPrimary}>+ Enrol learner</button>
      </div>
      {!filtered.length ? <p className="p-10 text-center text-sm text-text-mid">No learners match these filters.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm">
        <thead className="bg-[#fbfaf6] text-left text-xs uppercase tracking-wide text-green-mid"><tr><th className="p-3">Learner</th>{!programId && <th className="p-3">Course</th>}<th className="p-3">Status</th><th className="p-3">Progress</th><th className="p-3">Due</th><th className="p-3">Last active</th><th className="p-3">Quiz</th><th className="p-3" /></tr></thead>
        <tbody className="divide-y">{filtered.map((row) => <tr key={`${row.program_id}:${row.user_id}`}>
          <td className="p-3"><p className="font-bold text-green-deep">{row.name}</p><p className="text-xs text-text-mid">{row.email}{row.learner_type === 'external' && <span className="ml-1 rounded bg-gold/30 px-1.5 text-[10px] font-bold uppercase text-green-deep">external</span>}</p></td>
          {!programId && <td className="p-3 text-text-mid">{titles.get(row.program_id)}</td>}
          <td className="p-3"><Badge tone={statusTone[row.status]}>{statusLabel[row.status]}</Badge></td>
          <td className="p-3"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-gold" style={{ width: `${row.progress_percent}%` }} /></div><span className="text-xs">{row.progress_percent}%</span></div></td>
          <td className={`p-3 ${row.status === 'overdue' ? 'font-bold text-red-600' : 'text-text-mid'}`}>{formatDay(row.due_at)}</td>
          <td className="p-3 text-text-mid">{formatDay(row.last_activity_at)}</td>
          <td className="p-3 text-text-mid">{row.quiz_average === null ? '—' : `${row.quiz_average}%`}{row.attempts > 0 && <span className="block text-xs text-gray-400">{row.attempts} attempt{row.attempts === 1 ? '' : 's'}</span>}</td>
          <td className="p-3 text-right"><button onClick={() => setEditing(row)} className={buttonSecondary}>Manage</button></td>
        </tr>)}</tbody></table></div>}
    </section>

    {editing && <ManageModal row={editing} course={titles.get(editing.program_id) || ''} onClose={() => setEditing(null)} onAct={(action, extra) => act(editing, action, extra)} />}
    {enrolling && <EnrolModal courses={summary} defaultCourse={programId} onClose={() => setEnrolling(false)} onDone={async () => { setEnrolling(false); await load() }} />}
  </div>
}

function ManageModal({ row, course, onClose, onAct }: { row: TrackingRow; course: string; onClose: () => void; onAct: (action: string, extra?: Record<string, unknown>) => Promise<void> }) {
  const [due, setDue] = useState(dateInput(row.due_at)); const [busy, setBusy] = useState(false)
  const run = async (action: string, extra?: Record<string, unknown>) => { setBusy(true); await onAct(action, extra); setBusy(false) }
  return <Modal title={row.name} eyebrow={course} onClose={onClose}>
    <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-text-mid">Status</dt><dd className="font-bold text-green-deep">{statusLabel[row.status]} · {row.progress_percent}%</dd></div><div><dt className="text-xs text-text-mid">Joined via</dt><dd className="font-bold capitalize text-green-deep">{row.source}</dd></div><div><dt className="text-xs text-text-mid">Enrolled</dt><dd>{formatDay(row.enrolled_at)}</dd></div><div><dt className="text-xs text-text-mid">Completed</dt><dd>{formatDay(row.completed_at)}</dd></div></dl>
    <div className="mt-6 space-y-5">
      <div><p className="text-sm font-bold text-green-deep">Due date</p><div className="mt-2 flex flex-wrap gap-2"><input type="date" aria-label="Due date" value={due} onChange={(e) => setDue(e.target.value)} className="input mt-0 w-auto" /><button disabled={busy} onClick={() => run('set_due', { due_at: due ? `${due}T23:59:00+01:00` : null })} className={buttonPrimary}>Save due date</button>{row.due_at && <button disabled={busy} onClick={() => run('set_due', { due_at: null })} className={buttonSecondary}>Clear</button>}</div></div>
      {row.status === 'completed' && <div><p className="text-sm font-bold text-green-deep">Certificate</p><div className="mt-2 flex flex-wrap items-center gap-2">{row.certificate_id ? <a href={`/api/training/certificates/${row.certificate_id}`} className={buttonSecondary}>Download {row.certificate_id}</a> : <span className="text-xs text-text-mid">None issued</span>}<button disabled={busy} onClick={() => { if (!row.certificate_id || confirm('Issue a new certificate number? The old number will stop verifying.')) run('issue_certificate') }} className={buttonSecondary}>{row.certificate_id ? 'Re-issue' : 'Issue certificate'}</button></div></div>}
      <div className="border-t pt-5">{row.status === 'revoked'
        ? <button disabled={busy} onClick={() => run('restore')} className={buttonPrimary}>Restore access</button>
        : <button disabled={busy} onClick={() => { if (confirm(`Remove ${row.name}'s access to this course? Their progress is kept.`)) run('revoke') }} className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-600 disabled:opacity-50">Revoke access</button>}</div>
    </div>
  </Modal>
}

function EnrolModal({ courses, defaultCourse, onClose, onDone }: { courses: Summary[]; defaultCourse: string; onClose: () => void; onDone: () => Promise<void> }) {
  const [programId, setProgramId] = useState(defaultCourse || courses[0]?.id || ''); const [email, setEmail] = useState(''); const [due, setDue] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  return <Modal title="Enrol a learner" eyebrow="Training" onClose={onClose}>
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError('')
      try { await call(api, 'POST', { action: 'enrol', programId, email, due_at: due ? `${due}T23:59:00+01:00` : null }); await onDone() }
      catch (enrolError) { setError((enrolError as Error).message) }
      setBusy(false)
    }}>
      <Alert>{error}</Alert>
      <label className="block text-sm font-bold text-green-deep">Course<select required value={programId} onChange={(e) => setProgramId(e.target.value)} className="input">{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label className="block text-sm font-bold text-green-deep">Learner email <span className="font-normal text-gray-400">— a staff member or a signed-up external learner</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></label>
      <label className="block text-sm font-bold text-green-deep">Due date <span className="font-normal text-gray-400">— optional</span><input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="input" /></label>
      <p className="text-xs text-text-mid">Manual enrolment skips payment for paid courses.</p>
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className={buttonSecondary}>Cancel</button><button disabled={busy} className={buttonPrimary}>{busy ? 'Enrolling…' : 'Enrol'}</button></div>
    </form>
  </Modal>
}
