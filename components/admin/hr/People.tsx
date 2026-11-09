'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdminRole } from '@/lib/admin-auth'
import { credentialStatuses, credentialTypes, displayName, employeeStatuses, hrDepartments, labelOf, type HrEmployee } from '@/lib/hr'
import { credentialStatusTone, type HrCredentialView } from '@/lib/hr-people'
import { expiryText } from './people/Credentials'
import DataRequests from './people/DataRequests'
import EmployeeFile from './people/EmployeeFile'
import { EmployeeForm } from './people/EmployeeForm'
import LicenceReport from './people/LicenceReport'
import Templates from './people/Templates'
import type { AdminList, Progress, StaffList } from './people/types'
import { Alert, Badge, Card, Empty, Stat, buttonPrimary, call, peopleApi } from './people/ui'

// People & Onboarding. Admin: staff files, licence report, onboarding
// templates and NDPA requests. Staff: their own file and, for line managers,
// a read-only view of direct reports. The API decides what each viewer gets.
type AdminView = 'staff' | 'licences' | 'templates' | 'requests'

export default function People({ role }: { role: AdminRole }) {
  return role === 'admin' ? <AdminPeople /> : <StaffPeople />
}

function AdminPeople() {
  const [data, setData] = useState<AdminList | null>(null); const [error, setError] = useState(''); const [view, setView] = useState<AdminView>('staff'); const [open, setOpen] = useState<string | null>(null); const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState(''); const [department, setDepartment] = useState(''); const [showExited, setShowExited] = useState(false)
  const load = useCallback(async () => { setError(''); try { setData(await call<AdminList>(peopleApi)) } catch (err) { setError((err as Error).message) } }, [])
  useEffect(() => { load() }, [load])
  const employees = useMemo(() => (data?.employees || []).filter((e) => (showExited || e.status !== 'exited') && (!department || e.department === department) && (!query || `${e.legal_name} ${e.preferred_name || ''} ${e.job_title} ${e.staff_number || ''}`.toLowerCase().includes(query.toLowerCase()))), [data, query, department, showExited])
  if (open) return <EmployeeFile id={open} employees={data?.employees || []} onBack={() => { setOpen(null); load() }} />
  const active = (data?.employees || []).filter((e) => e.status !== 'exited')
  const views: [AdminView, string][] = [['staff', 'Staff files'], ['licences', 'Licence report'], ['templates', 'Onboarding templates'], ['requests', `Data requests${data?.dataRequests.open ? ` (${data.dataRequests.open})` : ''}`]]
  return <div className="space-y-6">
    <nav aria-label="People sections" className="flex flex-wrap gap-2">{views.map(([id, label]) => <button key={id} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined} className={`rounded-full px-4 py-2 text-xs font-bold ${view === id ? 'bg-green-deep text-white' : 'border bg-white text-green-deep'}`}>{label}</button>)}</nav>
    <Alert>{error}</Alert>
    {view === 'licences' && <LicenceReport onOpen={setOpen} />}
    {view === 'templates' && <Templates />}
    {view === 'requests' && <DataRequests />}
    {view === 'staff' && (!data ? <div className="rounded-2xl border bg-white p-16 text-center text-text-mid">Loading staff…</div> : <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Staff on file" value={active.length} /><Stat label="On probation" value={active.filter((e) => e.status === 'probation' || e.status === 'probation_extended').length} /><Stat label="Licences needing action" value={data.alerts.filter((a) => a.status !== 'pending_verification').length} tone={data.alerts.some((a) => a.status === 'expired') ? 'text-red-600' : ''} /><Stat label="NDPA requests overdue" value={data.dataRequests.overdue} tone={data.dataRequests.overdue ? 'text-red-600' : ''} /></div>
      {data.alerts.length > 0 && <Alerts alerts={data.alerts} onOpen={setOpen} />}
      <Card title="Staff files" description="Employees, locums, contractors, interns and NYSC corps members. Opening a file is logged." action={<button onClick={() => setCreating(true)} className={buttonPrimary}>+ New staff file</button>}>
        <div className="flex flex-wrap items-center gap-3 border-b px-6 py-4"><input aria-label="Search staff" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, title or staff number" className="input mt-0 max-w-xs" /><select aria-label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} className="input mt-0 max-w-[180px]"><option value="">All departments</option>{hrDepartments.map((d) => <option key={d}>{d}</option>)}</select><label className="flex items-center gap-2 text-sm text-text-mid"><input type="checkbox" checked={showExited} onChange={(e) => setShowExited(e.target.checked)} />Show leavers</label></div>
        <StaffTable employees={employees} all={data.employees} progress={data.onboarding} onOpen={setOpen} />
      </Card></>)}
    {creating && <EmployeeForm employee={null} employees={data?.employees || []} onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); load(); setOpen(id) }} />}
  </div>
}

function StaffPeople() {
  const [data, setData] = useState<StaffList | null>(null); const [error, setError] = useState(''); const [open, setOpen] = useState<string>('self')
  useEffect(() => { call<StaffList>(peopleApi).then(setData).catch((err) => setError(err.message)) }, [])
  const reports = data?.reports || []
  return <div className="space-y-6"><Alert>{error}</Alert>
    {reports.length > 0 && <nav aria-label="People sections" className="flex flex-wrap gap-2"><button onClick={() => setOpen('self')} aria-current={open === 'self' ? 'page' : undefined} className={`rounded-full px-4 py-2 text-xs font-bold ${open === 'self' ? 'bg-green-deep text-white' : 'border bg-white text-green-deep'}`}>My file</button><button onClick={() => setOpen('team')} aria-current={open !== 'self' ? 'page' : undefined} className={`rounded-full px-4 py-2 text-xs font-bold ${open !== 'self' ? 'bg-green-deep text-white' : 'border bg-white text-green-deep'}`}>My team ({reports.length})</button></nav>}
    {data && data.alerts.length > 0 && <Alerts alerts={data.alerts} onOpen={(id) => setOpen(id === data.self?.id ? 'self' : id)} self={data.self?.id} />}
    {open === 'self' ? <EmployeeFile key="self" id="self" /> : open === 'team' ? <Card title="My team" description="Your direct reports: work details, onboarding, licences, reviews and leave. Personal details and pay stay with People Ops."><StaffTable employees={reports} all={reports} progress={data?.onboarding || {}} onOpen={setOpen} /></Card>
      : <EmployeeFile key={open} id={open} onBack={() => setOpen('team')} />}
  </div>
}

function StaffTable({ employees, all, progress, onOpen }: { employees: HrEmployee[]; all: HrEmployee[]; progress: Progress; onOpen: (id: string) => void }) {
  const names = new Map(all.map((e) => [e.id, displayName(e)]))
  if (!employees.length) return <Empty>No staff files match.</Empty>
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#fbfaf6] text-xs uppercase tracking-wide text-green-mid"><tr><th className="px-6 py-3">Name</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Line manager</th><th className="px-3 py-3">Onboarding</th><th className="px-6 py-3">Portal</th></tr></thead>
    <tbody className="divide-y">{employees.map((e) => { const p = progress[e.id]; return <tr key={e.id} onClick={() => onOpen(e.id)} className="cursor-pointer hover:bg-green-50/50"><td className="px-6 py-3"><button className="text-left font-bold text-green-deep hover:underline">{displayName(e)}</button>{e.staff_number && <p className="text-xs text-gray-500">{e.staff_number}</p>}</td><td className="px-3 py-3"><p>{e.job_title}</p><p className="text-xs text-gray-500">{e.department} · {e.employment_type}</p></td><td className="px-3 py-3"><Badge tone={e.status === 'exited' ? 'bg-gray-100 text-gray-500' : e.status.startsWith('probation') ? 'bg-amber-50 text-amber-700' : undefined}>{labelOf(employeeStatuses, e.status)}</Badge></td><td className="px-3 py-3 text-xs">{e.line_manager_id ? names.get(e.line_manager_id) || '—' : '—'}</td>
      <td className="px-3 py-3">{p ? <div className="w-28"><div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gold" style={{ width: `${Math.round(p.done / p.total * 100)}%` }} /></div><p className="mt-1 text-xs text-gray-500">{p.done}/{p.total}</p></div> : <span className="text-xs text-gray-400">—</span>}</td><td className="px-6 py-3 text-xs">{e.auth_user_id ? e.portal_role : <span className="text-gray-400">Not linked</span>}</td></tr> })}</tbody></table></div>
}

function Alerts({ alerts, onOpen, self }: { alerts: HrCredentialView[]; onOpen: (id: string) => void; self?: string }) {
  const urgent = alerts.filter((a) => a.status === 'expired' || a.status === 'suspended' || (a.days_to_expiry !== null && a.days_to_expiry <= 30)); const later = alerts.length - urgent.length
  return <Card title="Licences and checks needing attention" description={`Expiring within 90 days, expired, suspended or awaiting verification. ${urgent.length} urgent${later ? `, ${later} more` : ''}.`}>
    <div className="divide-y">{alerts.slice(0, 12).map((a) => <button key={a.id} onClick={() => onOpen(a.employee_id!)} className="flex w-full flex-wrap items-center justify-between gap-3 px-6 py-3 text-left hover:bg-green-50/50"><div><p className="font-bold text-green-deep">{a.employee_id === self ? 'You' : a.employee_name} · {labelOf(credentialTypes, a.credential_type)}</p><p className="text-xs text-gray-500">{expiryText(a)}{a.renewal_pending ? ' · renewal submitted' : ''}</p></div><Badge tone={credentialStatusTone[a.status]}>{labelOf(credentialStatuses, a.status)}</Badge></button>)}</div>
    {alerts.length > 12 && <p className="border-t px-6 py-3 text-xs text-text-mid">{alerts.length - 12} more in the licence report.</p>}
  </Card>
}
