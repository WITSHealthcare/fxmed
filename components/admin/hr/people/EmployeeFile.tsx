'use client'

import { useCallback, useEffect, useState } from 'react'
import { displayName, employeeStatuses, labelOf, type HrEmployee } from '@/lib/hr'
import { workPatterns } from '@/lib/hr-people'
import Credentials from './Credentials'
import Documents from './Documents'
import { EmployeeForm, PayrollForm } from './EmployeeForm'
import Onboarding from './Onboarding'
import type { FileDetail } from './types'
import { Alert, Badge, buttonSecondary, call, formatDay, peopleApi } from './ui'

type Section = 'details' | 'onboarding' | 'credentials' | 'documents'

// One employee's file. What appears depends on what the API returned for the
// viewer's relation (admin, self or line manager); nothing is hidden only here.
export default function EmployeeFile({ id, employees = [], onBack, onChanged }: { id: string | 'self'; employees?: HrEmployee[]; onBack?: () => void; onChanged?: () => void }) {
  const [file, setFile] = useState<FileDetail | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [section, setSection] = useState<Section>('details')
  const [editing, setEditing] = useState<'file' | 'payroll' | null>(null)
  const load = useCallback(async () => {
    setError('')
    try { const result = await call<FileDetail | { employee: null }>(id === 'self' ? `${peopleApi}?self=1` : `${peopleApi}?id=${id}`); setFile(result.employee ? result as FileDetail : null) } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }, [id])
  useEffect(() => { load() }, [load])
  const changed = useCallback(() => { load(); onChanged?.() }, [load, onChanged])
  if (loading) return <div className="rounded-2xl border bg-white p-16 text-center text-text-mid">Loading file…</div>
  if (!file) return <div className="space-y-4"><Alert>{error}</Alert><div className="rounded-[20px] border bg-white p-16 text-center"><h3 className="text-xl font-bold text-green-deep">No staff file linked to your account yet</h3><p className="mt-2 text-text-mid">People Ops links your portal account to your employee file. Ask them if you expected to see it here.</p></div></div>
  const { employee, can } = file; const admin = can.editFile; const self = file.relation === 'self'
  const sections: { id: Section; label: string; count?: number }[] = [{ id: 'details', label: 'Details' }, ...(file.onboarding ? [{ id: 'onboarding' as const, label: 'Onboarding', count: file.onboarding.filter((i) => i.status === 'pending').length }] : []), ...(file.credentials ? [{ id: 'credentials' as const, label: 'Licences & checks', count: file.credentials.filter((c) => ['expiring_soon', 'expired', 'pending_verification'].includes(c.status)).length }] : []), ...(file.documents ? [{ id: 'documents' as const, label: 'Documents', count: file.documents.length }] : [])]
  const name = (personId: string | null) => personId ? file.people[personId] || '—' : '—'
  return <div className="space-y-5">
    {onBack && <button onClick={onBack} className="text-sm font-bold text-green-mid">← Back to staff</button>}
    <Alert>{error}</Alert>
    <section className="rounded-[20px] border border-green-deep/10 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-2xl font-bold text-green-deep">{displayName(employee)}</h3><Badge>{labelOf(employeeStatuses, employee.status)}</Badge>{employee.legal_hold && <Badge tone="bg-red-50 text-red-700">Legal hold</Badge>}</div>
      <p className="mt-1 text-sm text-text-mid">{employee.job_title} · {employee.department} · {employee.employment_type}{employee.level ? ` · ${employee.level}` : ''}</p>
      <p className="mt-1 text-xs text-gray-500">{self ? 'Your file' : file.relation === 'report' ? 'Your direct report: work details only' : 'Admin view'} · viewing is logged</p></div>
      {admin && <div className="flex gap-2"><button onClick={() => setEditing('file')} className={buttonSecondary}>Edit file</button><button onClick={() => setEditing('payroll')} className={buttonSecondary}>Pay details</button></div>}</div>
      <nav aria-label="File sections" className="mt-5 flex flex-wrap gap-2">{sections.map((s) => <button key={s.id} onClick={() => setSection(s.id)} aria-current={section === s.id ? 'page' : undefined} className={`rounded-full px-4 py-2 text-xs font-bold ${section === s.id ? 'bg-green-deep text-white' : 'bg-green-50 text-green-deep'}`}>{s.label}{s.count ? ` (${s.count})` : ''}</button>)}</nav>
    </section>
    {section === 'details' && <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Job"><Rows rows={[['Staff number', employee.staff_number], ['Start date', formatDay(employee.start_date)], ['Probation ends', formatDay(employee.probation_end_date)], ['Confirmed', employee.confirmed_at ? formatDay(employee.confirmed_at) : null], ['Location', employee.location], ['Work pattern', labelOf(workPatterns, employee.work_pattern || null)], ['Line manager', name(employee.line_manager_id)], ['Buddy', name(employee.buddy_id)], ['Clinical supervisor', name(employee.clinical_supervisor_id)], ['Portal account', employee.auth_user_id ? `Linked (${employee.portal_role})` : 'Not linked'], ['Work email', employee.work_email], ['Phone', employee.phone]]} /></Panel>
      {'nin' in employee && <Panel title="Personal" note={self ? 'Only you and People Ops see this. Ask People Ops to correct anything wrong.' : 'Employee and People Ops only.'}><Rows rows={[['Date of birth', formatDay(employee.date_of_birth)], ['Gender', employee.gender], ['NIN', employee.nin], ['Address', employee.address], ['Personal email', employee.personal_email]]} />
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-green-mid">Emergency contacts</p>{employee.emergency_contacts?.length ? employee.emergency_contacts.map((c, i) => <p key={i} className="mt-1 text-sm text-green-deep">{c.name} <span className="text-text-mid">({c.relationship || 'contact'}) · {c.phone}</span></p>) : <p className="mt-1 text-sm text-text-mid">None recorded.</p>}</Panel>}
      {(admin || self) && <Panel title="Pay and statutory" note={self ? 'Your bank and statutory identifiers. Salary history is under Performance & leave.' : undefined}>{file.payroll ? <Rows rows={[['Bank', file.payroll.bank_name], ['Account', file.payroll.account_number ? `${file.payroll.account_name || ''} · ****${file.payroll.account_number.slice(-4)}` : null], ['BVN', file.payroll.bvn ? `*******${file.payroll.bvn.slice(-4)}` : null], ['TIN', file.payroll.tin], ['PAYE state', file.payroll.paye_state], ['PFA', file.payroll.pfa_name], ['RSA PIN', file.payroll.rsa_pin], ['NHF number', file.payroll.nhf_number], ['Pension', `${file.payroll.pension_employee_rate}% employee / ${file.payroll.pension_employer_rate}% employer`], ['Group life', formatDay(file.payroll.group_life_enrolled_at)], ['HMO', formatDay(file.payroll.hmo_enrolled_at)]]} /> : <p className="text-sm text-text-mid">No pay details recorded yet.</p>}</Panel>}
      {admin && <Panel title="Records"><Rows rows={[['Keep until', formatDay(employee.retention_until)], ['Legal hold', employee.legal_hold ? 'Yes' : 'No'], ['Created', formatDay(employee.created_at)]]} />{employee.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-text-mid">{employee.notes}</p>}</Panel>}
    </div>}
    {section !== 'details' && <section className="overflow-hidden rounded-[20px] border border-green-deep/10 bg-white shadow-sm">
      {section === 'onboarding' && file.onboarding && <Onboarding employee={employee} items={file.onboarding} tick={can.tickOnboarding} onChange={changed} onError={setError} />}
      {section === 'credentials' && file.credentials && <Credentials employeeId={employee.id} credentials={file.credentials} admin={admin} canSubmit={can.submitCredential} onChange={changed} onError={setError} />}
      {section === 'documents' && file.documents && <Documents employeeId={employee.id} documents={file.documents} admin={admin} canUpload={can.uploadDocument} onChange={changed} onError={setError} />}
    </section>}
    {editing === 'file' && <EmployeeForm employee={employee} employees={employees} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); changed() }} />}
    {editing === 'payroll' && <PayrollForm employeeId={employee.id} payroll={file.payroll} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); changed() }} />}
  </div>
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) { return <section className="rounded-[20px] border border-green-deep/10 bg-white p-6 shadow-sm"><h4 className="text-lg font-bold text-green-deep">{title}</h4>{note && <p className="mt-1 text-xs text-text-mid">{note}</p>}<div className="mt-4">{children}</div></section> }
function Rows({ rows }: { rows: [string, string | null | undefined][] }) { return <dl className="grid grid-cols-[minmax(120px,40%)_1fr] gap-x-4 gap-y-2 text-sm">{rows.map(([label, value]) => <div key={label} className="contents"><dt className="text-text-mid">{label}</dt><dd className="font-medium text-green-deep">{value || '—'}</dd></div>)}</dl> }
